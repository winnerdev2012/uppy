import Plugin from './Plugin'
import tus from 'tus-js-client'
import UppySocket from '../core/UppySocket'

/**
 * Tus resumable file uploader
 *
 */
export default class Tus10 extends Plugin {
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
      const upload = new tus.Upload(file.data, {

        // TODO merge this.opts or this.opts.tus here
        metadata: file.meta,
        resume: this.opts.resume,
        endpoint: this.opts.endpoint,

        onError: (err) => {
          this.core.log(err)
          this.core.emitter.emit('core:upload-error', file.id)
          reject('Failed because: ' + err)
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          // Dispatch progress event
          this.core.emitter.emit('core:upload-progress', {
            uploader: this,
            id: file.id,
            bytesUploaded: bytesUploaded,
            bytesTotal: bytesTotal
          })
        },
        onSuccess: () => {
          this.core.emitter.emit('core:upload-success', file.id, upload.url)

          this.core.log(`Download ${upload.file.name} from ${upload.url}`)
          resolve(upload)
        }
      })

      this.core.emitter.on('core:file-remove', (fileID) => {
        if (fileID === file.id) {
          console.log('removing file: ', fileID)
          upload.abort()
          resolve(`upload ${fileID} was removed`)
        }
      })

      this.core.emitter.on('core:upload-pause', (fileID) => {
        if (fileID === file.id) {
          const isPaused = this.pauseResume('toggle', fileID)
          isPaused ? upload.abort() : upload.start()
        }
      })

      this.core.emitter.on('core:pause-all', () => {
        const files = this.core.getState().files
        if (!files[file.id]) return
        upload.abort()
      })

      this.core.emitter.on('core:resume-all', () => {
        const files = this.core.getState().files
        if (!files[file.id]) return
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
          protocol: 'tus'
        }))
      })
      .then((res) => {
        if (res.status < 200 && res.status > 300) {
          return reject(res.statusText)
        }

        res.json()
        .then((data) => {
          // get the host domain
          var regex = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/\n]+)/
          var host = regex.exec(file.remote.host)[1]

          var token = data.token
          var socket = new UppySocket({
            target: `ws://${host}:3020/api/${token}`
          })

          socket.on('progress', (progressData) => {
            const {progress, bytesUploaded, bytesTotal} = progressData

            if (progress) {
              this.core.log(`Upload progress: ${progress}`)

              // Dispatch progress event
              this.core.emitter.emit('core:upload-progress', {
                uploader: this,
                id: file.id,
                bytesUploaded: bytesUploaded,
                bytesTotal: bytesTotal
              })

              if (progress === '100.00') {
                this.core.emitter.emit('core:upload-success', file.id)
                socket.close()
                return resolve()
              }
            }
          })
        })
      })
    })
  }

  uploadFiles (files) {
    if (Object.keys(files).length === 0) {
      this.core.log('no files to upload!')
      return
    }

    const uploaders = []
    files.forEach((file, index) => {
      const current = parseInt(index, 10) + 1
      const total = files.length

      if (!file.isRemote) {
        uploaders.push(this.upload(file, current, total))
      } else {
        uploaders.push(this.uploadRemote(file, current, total))
      }
    })

    return Promise.all(uploaders)
      .then(() => {
        this.core.log('All files uploaded')
        return { uploadedCount: files.length }
      })
      .catch((err) => {
        this.core.log('Upload error: ' + err)
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

  actions () {
    this.core.emitter.on('core:pause-all', () => {
      this.pauseResume('pauseAll')
    })

    this.core.emitter.on('core:resume-all', () => {
      this.pauseResume('resumeAll')
    })

    this.core.emitter.on('core:upload', () => {
      this.core.log('Tus is uploading...')
      const files = this.core.getState().files
      this.selectForUpload(files)
    })
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
    this.actions()
  }
}
