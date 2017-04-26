const Plugin = require('./Plugin')
const tus = require('tus-js-client')
const UppySocket = require('../core/UppySocket')
const throttle = require('lodash.throttle')
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
 * Tus resumable file uploader
 *
 */
module.exports = class Tus10 extends Plugin {
  constructor (core, opts) {
    super(core, opts)
    this.type = 'uploader'
    this.id = 'Tus'
    this.title = 'Tus'

    // set default options
    const defaultOptions = {
      resume: true,
      allowPause: true
    }

    // merge default options with the ones set by user
    this.opts = Object.assign({}, defaultOptions, opts)

    this.handlePauseAll = this.handlePauseAll.bind(this)
    this.handleResumeAll = this.handleResumeAll.bind(this)
    this.handleUpload = this.handleUpload.bind(this)
  }

  pauseResume (action, fileID) {
    const updatedFiles = Object.assign({}, this.core.getState().files)
    const inProgressUpdatedFiles = Object.keys(updatedFiles).filter((file) => {
      return !updatedFiles[file].progress.uploadComplete &&
             updatedFiles[file].progress.uploadStarted
    })

    switch (action) {
      case 'toggle':
        if (updatedFiles[fileID].uploadComplete) return

        const wasPaused = updatedFiles[fileID].isPaused || false
        const isPaused = !wasPaused
        let updatedFile
        if (wasPaused) {
          updatedFile = Object.assign({}, updatedFiles[fileID], {
            isPaused: false
          })
        } else {
          updatedFile = Object.assign({}, updatedFiles[fileID], {
            isPaused: true
          })
        }
        updatedFiles[fileID] = updatedFile
        this.core.setState({files: updatedFiles})
        return isPaused
      case 'pauseAll':
        inProgressUpdatedFiles.forEach((file) => {
          const updatedFile = Object.assign({}, updatedFiles[file], {
            isPaused: true
          })
          updatedFiles[file] = updatedFile
        })
        this.core.setState({files: updatedFiles})
        return
      case 'resumeAll':
        inProgressUpdatedFiles.forEach((file) => {
          const updatedFile = Object.assign({}, updatedFiles[file], {
            isPaused: false
          })
          updatedFiles[file] = updatedFile
        })
        this.core.setState({files: updatedFiles})
        return
    }
  }

  handlePauseAll () {
    this.pauseResume('pauseAll')
  }

  handleResumeAll () {
    this.pauseResume('resumeAll')
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
        this.core.emitter.emit('core:upload-error', file.id, err)
        reject('Failed because: ' + err)
      }

      optsTus.onProgress = (bytesUploaded, bytesTotal) => {
        this.core.emitter.emit('core:upload-progress', {
          uploader: this,
          id: file.id,
          bytesUploaded: bytesUploaded,
          bytesTotal: bytesTotal
        })
      }

      optsTus.onSuccess = () => {
        this.core.emitter.emit('core:upload-success', file.id, upload, upload.url)

        if (upload.url) {
          this.core.log('Download ' + upload.file.name + ' from ' + upload.url)
        }

        resolve(upload)
      }
      optsTus.metadata = file.meta

      const upload = new tus.Upload(file.data, optsTus)

      this.onFileRemove(file.id, () => {
        this.core.log('removing file:', file.id)
        upload.abort()
        resolve(`upload ${file.id} was removed`)
      })

      this.onPause(file.id, (isPaused) => {
        isPaused ? upload.abort() : upload.start()
      })

      this.onPauseAll(file.id, () => {
        upload.abort()
      })

      this.onResumeAll(file.id, () => {
        upload.start()
      })

      upload.start()
      this.core.emitter.emit('core:upload-started', file.id, upload)
    })
  }

  uploadRemote (file, current, total) {
    return new Promise((resolve, reject) => {
      this.core.log(file.remote.url)
      fetch(file.remote.url, {
        method: 'post',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(Object.assign({}, file.remote.body, {
          endpoint: this.opts.endpoint,
          protocol: 'tus',
          size: file.data.size
        }))
      })
      .then((res) => {
        if (res.status < 200 && res.status > 300) {
          return reject(res.statusText)
        }

        this.core.emitter.emit('core:upload-started', file.id)

        res.json().then((data) => {
          // get the host domain
          // var regex = /^(?:https?:\/\/|\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^\/\n]+)/
          var regex = /^(?:https?:\/\/|\/\/)?(?:[^@\n]+@)?(?:www\.)?([^\n]+)/
          var host = regex.exec(file.remote.host)[1]
          var socketProtocol = location.protocol === 'https:' ? 'wss' : 'ws'

          var token = data.token
          var socket = new UppySocket({
            target: socketProtocol + `://${host}/api/${token}`
          })

          this.onFileRemove(file.id, () => {
            socket.send('pause', {})
            resolve(`upload ${file.id} was removed`)
          })

          this.onPause(file.id, (isPaused) => {
            isPaused ? socket.send('pause', {}) : socket.send('resume', {})
          })

          this.onPauseAll(file.id, () => {
            socket.send('pause', {})
          })

          this.onResumeAll(file.id, () => {
            socket.send('resume', {})
          })

          const emitProgress = (progressData) => {
            const {progress, bytesUploaded, bytesTotal} = progressData

            if (progress) {
              this.core.log(`Upload progress: ${progress}`)
              console.log(file.id)

              this.core.emitter.emit('core:upload-progress', {
                uploader: this,
                id: file.id,
                bytesUploaded: bytesUploaded,
                bytesTotal: bytesTotal
              })
            }
          }

          const throttledEmitProgress = throttle(emitProgress, 300, {leading: true, trailing: true})
          socket.on('progress', throttledEmitProgress)

          socket.on('success', (data) => {
            this.core.emitter.emit('core:upload-success', file.id, data, data.url)
            socket.close()
            return resolve()
          })
        })
      })
    })
  }

  onFileRemove (fileID, cb) {
    this.core.emitter.on('core:file-remove', (targetFileID) => {
      if (fileID === targetFileID) cb()
    })
  }

  onPause (fileID, cb) {
    this.core.emitter.on('core:upload-pause', (targetFileID) => {
      if (fileID === targetFileID) {
        const isPaused = this.pauseResume('toggle', fileID)
        cb(isPaused)
      }
    })
  }

  onPauseAll (fileID, cb) {
    this.core.emitter.on('core:pause-all', () => {
      const files = this.core.getState().files
      if (!files[fileID]) return
      cb()
    })
  }

  onResumeAll (fileID, cb) {
    this.core.emitter.on('core:resume-all', () => {
      const files = this.core.getState().files
      if (!files[fileID]) return
      cb()
    })
  }

  uploadFiles (files) {
    if (Object.keys(files).length === 0) {
      this.core.log('no files to upload!')
      return
    }

    files.forEach((file, index) => {
      const current = parseInt(index, 10) + 1
      const total = files.length

      if (!file.isRemote) {
        this.upload(file, current, total)
      } else {
        this.uploadRemote(file, current, total)
      }
    })
  }

  selectForUpload (files) {
    // TODO: replace files[file].isRemote with some logic
    //
    // filter files that are now yet being uploaded / haven’t been uploaded
    // and remote too
    const filesForUpload = Object.keys(files).filter((file) => {
      if (!files[file].progress.uploadStarted || files[file].isRemote) {
        return true
      }
      return false
    }).map((file) => {
      return files[file]
    })

    this.uploadFiles(filesForUpload)
  }

  handleUpload () {
    this.core.log('Tus is uploading...')
    const files = this.core.getState().files

    this.selectForUpload(files)

    return new Promise((resolve) => {
      this.core.bus.once('core:upload-complete', resolve)
    })
  }

  actions () {
    this.core.emitter.on('core:pause-all', this.handlePauseAll)
    this.core.emitter.on('core:resume-all', this.handleResumeAll)
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
    this.actions()
  }

  uninstall () {
    this.core.removeUploader(this.handleUpload)
    this.core.emitter.off('core:pause-all', this.handlePauseAll)
    this.core.emitter.off('core:resume-all', this.handleResumeAll)
  }
}
