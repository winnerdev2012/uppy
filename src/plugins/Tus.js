const Plugin = require('./Plugin')
const tus = require('tus-js-client')
const UppySocket = require('../core/UppySocket')
const {
  emitSocketProgress,
  getSocketHost,
  settle
} = require('../core/Utils')
require('whatwg-fetch')

// Extracted from https://github.com/tus/tus-js-client/blob/master/lib/upload.js#L13
// excepted we removed 'fingerprint' key to avoid adding more dependencies
const tusDefaultOptions = {
  endpoint: '',
  resume: true,
  onProgress: null,
  onChunkComplete: null,
  onSuccess: null,
  onError: null,
  headers: {},
  chunkSize: Infinity,
  withCredentials: false,
  uploadUrl: null,
  uploadSize: null,
  overridePatchMethod: false,
  retryDelays: null
}

/**
 * Create a wrapper around an event emitter with a `remove` method to remove
 * all events that were added using the wrapped emitter.
 */
function createEventTracker (emitter) {
  const events = []
  return {
    on (event, fn) {
      events.push([ event, fn ])
      return emitter.on(event, fn)
    },
    remove () {
      events.forEach(([ event, fn ]) => {
        emitter.off(event, fn)
      })
    }
  }
}

/**
 * Tus resumable file uploader
 *
 */
module.exports = class Tus extends Plugin {
  constructor (core, opts) {
    super(core, opts)
    this.type = 'uploader'
    this.id = 'Tus'
    this.title = 'Tus'

    // set default options
    const defaultOptions = {
      resume: true,
      autoRetry: true,
      retryDelays: [0, 1000, 3000, 5000]
    }

    // merge default options with the ones set by user
    this.opts = Object.assign({}, defaultOptions, opts)

    this.uploaders = Object.create(null)
    this.uploaderEvents = Object.create(null)
    this.uploaderSockets = Object.create(null)

    this.handleResetProgress = this.handleResetProgress.bind(this)
    this.handleUpload = this.handleUpload.bind(this)
  }

  handleResetProgress () {
    const files = Object.assign({}, this.core.state.files)
    Object.keys(files).forEach((fileID) => {
      // Only clone the file object if it has a Tus `uploadUrl` attached.
      if (files[fileID].tus && files[fileID].tus.uploadUrl) {
        const tusState = Object.assign({}, files[fileID].tus)
        delete tusState.uploadUrl
        files[fileID] = Object.assign({}, files[fileID], { tus: tusState })
      }
    })

    this.core.setState({ files })
  }

  /**
   * Clean up all references for a file's upload: the tus.Upload instance,
   * any events related to the file, and the uppy-server WebSocket connection.
   */
  resetUploaderReferences (fileID) {
    if (this.uploaders[fileID]) {
      this.uploaders[fileID].abort()
      this.uploaders[fileID] = null
    }
    if (this.uploaderEvents[fileID]) {
      this.uploaderEvents[fileID].remove()
      this.uploaderEvents[fileID] = null
    }
    if (this.uploaderSockets[fileID]) {
      this.uploaderSockets[fileID].close()
      this.uploaderSockets[fileID] = null
    }
  }

  /**
   * Create a new Tus upload
   *
   * @param {object} file for use with upload
   * @param {integer} current file in a queue
   * @param {integer} total number of files in a queue
   * @returns {Promise}
   */
  upload (file, current, total) {
    this.core.log(`uploading ${current} of ${total}`)

    this.resetUploaderReferences(file.id)

    // Create a new tus upload
    return new Promise((resolve, reject) => {
      const optsTus = Object.assign(
        {},
        tusDefaultOptions,
        this.opts,
        // Install file-specific upload overrides.
        file.tus || {}
      )

      optsTus.onError = (err) => {
        this.core.log(err)
        this.core.emit('core:upload-error', file.id, err)
        err.message = `Failed because: ${err.message}`

        this.resetUploaderReferences(file.id)
        reject(err)
      }

      optsTus.onProgress = (bytesUploaded, bytesTotal) => {
        this.onReceiveUploadUrl(file, upload.url)
        this.core.emit('core:upload-progress', {
          uploader: this,
          id: file.id,
          bytesUploaded: bytesUploaded,
          bytesTotal: bytesTotal
        })
      }

      optsTus.onSuccess = () => {
        this.core.emit('core:upload-success', file.id, upload, upload.url)

        if (upload.url) {
          this.core.log('Download ' + upload.file.name + ' from ' + upload.url)
        }

        this.resetUploaderReferences(file.id)
        resolve(upload)
      }
      optsTus.metadata = file.meta

      const upload = new tus.Upload(file.data, optsTus)
      this.uploaders[file.id] = upload
      this.uploaderEvents[file.id] = createEventTracker(this.core)

      this.onFileRemove(file.id, (targetFileID) => {
        this.resetUploaderReferences(file.id)
        resolve(`upload ${targetFileID} was removed`)
      })

      this.onPause(file.id, (isPaused) => {
        isPaused ? upload.abort() : upload.start()
      })

      this.onPauseAll(file.id, () => {
        upload.abort()
      })

      this.onCancelAll(file.id, () => {
        this.resetUploaderReferences(file.id)
      })

      this.onResumeAll(file.id, () => {
        if (file.error) {
          upload.abort()
        }
        upload.start()
      })

      upload.start()
      this.core.emit('core:upload-started', file.id, upload)
    })
  }

  uploadRemote (file, current, total) {
    this.resetUploaderReferences(file.id)

    return new Promise((resolve, reject) => {
      this.core.log(file.remote.url)
      if (file.serverToken) {
        this.connectToServerSocket(file)
      } else {
        let endpoint = this.opts.endpoint
        if (file.tus && file.tus.endpoint) {
          endpoint = file.tus.endpoint
        }

        this.core.emitter.emit('core:upload-started', file.id)

        fetch(file.remote.url, {
          method: 'post',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(Object.assign({}, file.remote.body, {
            endpoint,
            protocol: 'tus',
            size: file.data.size,
            metadata: file.meta
          }))
        })
        .then((res) => {
          if (res.status < 200 && res.status > 300) {
            return reject(res.statusText)
          }

          res.json().then((data) => {
            const token = data.token
            file = this.getFile(file.id)
            file.serverToken = token
            this.updateFile(file)
            this.connectToServerSocket(file)
            resolve()
          })
        })
      }
    })
  }

  connectToServerSocket (file) {
    const token = file.serverToken
    const host = getSocketHost(file.remote.host)
    const socket = new UppySocket({ target: `${host}/api/${token}` })
    this.uploaderSockets[file.id] = socket
    this.uploaderEvents[file.id] = createEventTracker(this.core)

    this.onFileRemove(file.id, () => socket.send('pause', {}))

    this.onPause(file.id, (isPaused) => {
      isPaused ? socket.send('pause', {}) : socket.send('resume', {})
    })

    this.onPauseAll(file.id, () => socket.send('pause', {}))

    this.onCancelAll(file.id, () => socket.send('pause', {}))

    this.onResumeAll(file.id, () => {
      if (file.error) {
        socket.send('pause', {})
      }
      socket.send('resume', {})
    })

    this.onRetry(file.id, () => {
      socket.send('pause', {})
      socket.send('resume', {})
    })

    this.onRetryAll(file.id, () => {
      socket.send('pause', {})
      socket.send('resume', {})
    })

    socket.on('progress', (progressData) => emitSocketProgress(this, progressData, file))

    socket.on('success', (data) => {
      this.core.emitter.emit('core:upload-success', file.id, data, data.url)
      this.resetUploaderReferences(file.id)
    })
  }

  getFile (fileID) {
    return this.core.state.files[fileID]
  }

  updateFile (file) {
    const files = Object.assign({}, this.core.state.files, {
      [file.id]: file
    })
    this.core.setState({ files })
  }

  onReceiveUploadUrl (file, uploadURL) {
    const currentFile = this.getFile(file.id)
    if (!currentFile) return
    // Only do the update if we didn't have an upload URL yet.
    if (!currentFile.tus || currentFile.tus.uploadUrl !== uploadURL) {
      const newFile = Object.assign({}, currentFile, {
        tus: Object.assign({}, currentFile.tus, {
          uploadUrl: uploadURL
        })
      })
      this.updateFile(newFile)
    }
  }

  onFileRemove (fileID, cb) {
    this.uploaderEvents[fileID].on('core:file-removed', (targetFileID) => {
      if (fileID === targetFileID) cb(targetFileID)
    })
  }

  onPause (fileID, cb) {
    this.uploaderEvents[fileID].on('core:upload-pause', (targetFileID, isPaused) => {
      if (fileID === targetFileID) {
        // const isPaused = this.core.pauseResume(fileID)
        cb(isPaused)
      }
    })
  }

  onRetry (fileID, cb) {
    this.uploaderEvents[fileID].on('core:upload-retry', (targetFileID) => {
      if (fileID === targetFileID) {
        cb()
      }
    })
  }

  onRetryAll (fileID, cb) {
    this.uploaderEvents[fileID].on('core:retry-all', (filesToRetry) => {
      if (!this.core.getFile(fileID)) return
      cb()
    })
  }

  onPauseAll (fileID, cb) {
    this.uploaderEvents[fileID].on('core:pause-all', () => {
      if (!this.core.getFile(fileID)) return
      cb()
    })
  }

  onCancelAll (fileID, cb) {
    this.uploaderEvents[fileID].on('core:cancel-all', () => {
      if (!this.core.getFile(fileID)) return
      cb()
    })
  }

  onResumeAll (fileID, cb) {
    this.uploaderEvents[fileID].on('core:resume-all', () => {
      if (!this.core.getFile(fileID)) return
      cb()
    })
  }

  uploadFiles (files) {
    const promises = files.map((file, index) => {
      const current = parseInt(index, 10) + 1
      const total = files.length

      if (file.error) {
        return Promise.reject(new Error(file.error))
      } else if (!file.isRemote) {
        return this.upload(file, current, total)
      } else {
        return this.uploadRemote(file, current, total)
      }
    })

    return settle(promises)
  }

  handleUpload (fileIDs) {
    if (fileIDs.length === 0) {
      this.core.log('Tus: no files to upload!')
      return Promise.resolve()
    }

    this.core.log('Tus is uploading...')
    const filesToUpload = fileIDs.map((fileID) => this.core.getFile(fileID))

    return this.uploadFiles(filesToUpload)
  }

  addResumableUploadsCapabilityFlag () {
    const newCapabilities = Object.assign({}, this.core.getState().capabilities)
    newCapabilities.resumableUploads = true
    this.core.setState({
      capabilities: newCapabilities
    })
  }

  install () {
    this.addResumableUploadsCapabilityFlag()
    this.core.addUploader(this.handleUpload)

    this.core.on('core:reset-progress', this.handleResetProgress)

    if (this.opts.autoRetry) {
      this.core.on('back-online', this.core.retryAll)
    }
  }

  uninstall () {
    this.core.removeUploader(this.handleUpload)

    if (this.opts.autoRetry) {
      this.core.off('back-online', this.core.retryAll)
    }
  }
}
