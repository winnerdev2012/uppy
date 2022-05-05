const { nanoid } = require('nanoid/non-secure')
const { Provider, RequestClient, Socket } = require('@uppy/companion-client')
const emitSocketProgress = require('@uppy/utils/lib/emitSocketProgress')
const getSocketHost = require('@uppy/utils/lib/getSocketHost')
const EventTracker = require('@uppy/utils/lib/EventTracker')
const ProgressTimeout = require('@uppy/utils/lib/ProgressTimeout')
const ErrorWithCause = require('@uppy/utils/lib/ErrorWithCause')
const NetworkError = require('@uppy/utils/lib/NetworkError')
const isNetworkError = require('@uppy/utils/lib/isNetworkError')
const { internalRateLimitedQueue } = require('@uppy/utils/lib/RateLimitedQueue')

// See XHRUpload
function buildResponseError (xhr, error) {
  if (isNetworkError(xhr)) return new NetworkError(error, xhr)

  const err = new ErrorWithCause('Upload error', { cause: error })
  err.request = xhr
  return err
}

// See XHRUpload
function setTypeInBlob (file) {
  const dataWithUpdatedType = file.data.slice(0, file.data.size, file.meta.type)
  return dataWithUpdatedType
}

function addMetadata (formData, meta, opts) {
  const metaFields = Array.isArray(opts.metaFields)
    ? opts.metaFields
    // Send along all fields by default.
    : Object.keys(meta)
  metaFields.forEach((item) => {
    formData.append(item, meta[item])
  })
}

function createFormDataUpload (file, opts) {
  const formPost = new FormData()

  addMetadata(formPost, file.meta, opts)

  const dataWithUpdatedType = setTypeInBlob(file)

  if (file.name) {
    formPost.append(opts.fieldName, dataWithUpdatedType, file.meta.name)
  } else {
    formPost.append(opts.fieldName, dataWithUpdatedType)
  }

  return formPost
}

const createBareUpload = file => file.data

module.exports = class MiniXHRUpload {
  constructor (uppy, opts) {
    this.uppy = uppy
    this.opts = {
      validateStatus (status) {
        return status >= 200 && status < 300
      },
      ...opts,
    }

    this.requests = opts[internalRateLimitedQueue]
    this.uploaderEvents = Object.create(null)
    this.i18n = opts.i18n
  }

  #getOptions (file) {
    const { uppy } = this

    const overrides = uppy.getState().xhrUpload
    const opts = {
      ...this.opts,
      ...(overrides || {}),
      ...(file.xhrUpload || {}),
      headers: {
        ...this.opts.headers,
        ...overrides?.headers,
        ...file.xhrUpload?.headers,
      },
    }

    return opts
  }

  uploadFile (id, current, total) {
    const file = this.uppy.getFile(id)
    if (file.error) {
      throw new Error(file.error)
    } else if (file.isRemote) {
      return this.#uploadRemoteFile(file, current, total)
    }
    return this.#uploadLocalFile(file, current, total)
  }

  #addEventHandlerForFile (eventName, fileID, eventHandler) {
    this.uploaderEvents[fileID].on(eventName, (targetFileID) => {
      if (fileID === targetFileID) eventHandler()
    })
  }

  #addEventHandlerIfFileStillExists (eventName, fileID, eventHandler) {
    this.uploaderEvents[fileID].on(eventName, (...args) => {
      if (this.uppy.getFile(fileID)) eventHandler(...args)
    })
  }

  #uploadLocalFile (file, current, total) {
    const opts = this.#getOptions(file)

    this.uppy.log(`uploading ${current} of ${total}`)
    return new Promise((resolve, reject) => {
      // This is done in index.js in the S3 plugin.
      // this.uppy.emit('upload-started', file)

      const data = opts.formData
        ? createFormDataUpload(file, opts)
        : createBareUpload(file, opts)

      const xhr = new XMLHttpRequest()
      this.uploaderEvents[file.id] = new EventTracker(this.uppy)

      const timer = new ProgressTimeout(opts.timeout, () => {
        xhr.abort()
        // eslint-disable-next-line no-use-before-define
        queuedRequest.done()
        const error = new Error(this.i18n('timedOut', { seconds: Math.ceil(opts.timeout / 1000) }))
        this.uppy.emit('upload-error', file, error)
        reject(error)
      })

      const id = nanoid()

      xhr.upload.addEventListener('loadstart', () => {
        this.uppy.log(`[AwsS3/XHRUpload] ${id} started`)
      })

      xhr.upload.addEventListener('progress', (ev) => {
        this.uppy.log(`[AwsS3/XHRUpload] ${id} progress: ${ev.loaded} / ${ev.total}`)
        // Begin checking for timeouts when progress starts, instead of loading,
        // to avoid timing out requests on browser concurrency queue
        timer.progress()

        if (ev.lengthComputable) {
          this.uppy.emit('upload-progress', file, {
            uploader: this,
            bytesUploaded: ev.loaded,
            bytesTotal: ev.total,
          })
        }
      })

      xhr.addEventListener('load', (ev) => {
        this.uppy.log(`[AwsS3/XHRUpload] ${id} finished`)
        timer.done()
        // eslint-disable-next-line no-use-before-define
        queuedRequest.done()
        if (this.uploaderEvents[file.id]) {
          this.uploaderEvents[file.id].remove()
          this.uploaderEvents[file.id] = null
        }

        if (opts.validateStatus(ev.target.status, xhr.responseText, xhr)) {
          const body = opts.getResponseData(xhr.responseText, xhr)
          const uploadURL = body[opts.responseUrlFieldName]

          const uploadResp = {
            status: ev.target.status,
            body,
            uploadURL,
          }

          this.uppy.emit('upload-success', file, uploadResp)

          if (uploadURL) {
            this.uppy.log(`Download ${file.name} from ${uploadURL}`)
          }

          return resolve(file)
        }
        const body = opts.getResponseData(xhr.responseText, xhr)
        const error = buildResponseError(xhr, opts.getResponseError(xhr.responseText, xhr))

        const response = {
          status: ev.target.status,
          body,
        }

        this.uppy.emit('upload-error', file, error, response)
        return reject(error)
      })

      xhr.addEventListener('error', () => {
        this.uppy.log(`[AwsS3/XHRUpload] ${id} errored`)
        timer.done()
        // eslint-disable-next-line no-use-before-define
        queuedRequest.done()
        if (this.uploaderEvents[file.id]) {
          this.uploaderEvents[file.id].remove()
          this.uploaderEvents[file.id] = null
        }

        const error = buildResponseError(xhr, opts.getResponseError(xhr.responseText, xhr))
        this.uppy.emit('upload-error', file, error)
        return reject(error)
      })

      xhr.open(opts.method.toUpperCase(), opts.endpoint, true)
      // IE10 does not allow setting `withCredentials` and `responseType`
      // before `open()` is called. It’s important to set withCredentials
      // to a boolean, otherwise React Native crashes
      xhr.withCredentials = Boolean(opts.withCredentials)
      if (opts.responseType !== '') {
        xhr.responseType = opts.responseType
      }

      Object.keys(opts.headers).forEach((header) => {
        xhr.setRequestHeader(header, opts.headers[header])
      })

      const queuedRequest = this.requests.run(() => {
        xhr.send(data)
        return () => {
          // eslint-disable-next-line no-use-before-define
          timer.done()
          xhr.abort()
        }
      }, { priority: 1 })

      this.#addEventHandlerForFile('file-removed', file.id, () => {
        queuedRequest.abort()
        reject(new Error('File removed'))
      })

      this.#addEventHandlerIfFileStillExists('cancel-all', file.id, ({ reason } = {}) => {
        if (reason === 'user') {
          queuedRequest.abort()
        }
        reject(new Error('Upload cancelled'))
      })
    })
  }

  #uploadRemoteFile (file) {
    const opts = this.#getOptions(file)
    // This is done in index.js in the S3 plugin.
    // this.uppy.emit('upload-started', file)

    const metaFields = Array.isArray(opts.metaFields)
      ? opts.metaFields
    // Send along all fields by default.
      : Object.keys(file.meta)

    const Client = file.remote.providerOptions.provider ? Provider : RequestClient
    const client = new Client(this.uppy, file.remote.providerOptions)
    return client.post(file.remote.url, {
      ...file.remote.body,
      endpoint: opts.endpoint,
      size: file.data.size,
      fieldname: opts.fieldName,
      metadata: Object.fromEntries(metaFields.map(name => [name, file.meta[name]])),
      httpMethod: opts.method,
      useFormData: opts.formData,
      headers: opts.headers,
    }).then(res => new Promise((resolve, reject) => {
      const { token } = res
      const host = getSocketHost(file.remote.companionUrl)
      const socket = new Socket({ target: `${host}/api/${token}`, autoOpen: false })
      this.uploaderEvents[file.id] = new EventTracker(this.uppy)

      const queuedRequest = this.requests.run(() => {
        socket.open()
        if (file.isPaused) {
          socket.send('pause', {})
        }

        return () => socket.close()
      })

      this.#addEventHandlerForFile('file-removed', file.id, () => {
        socket.send('cancel', {})
        queuedRequest.abort()
        resolve(`upload ${file.id} was removed`)
      })

      this.#addEventHandlerIfFileStillExists('cancel-all', file.id, ({ reason } = {}) => {
        if (reason === 'user') {
          socket.send('cancel', {})
          queuedRequest.abort()
        }
        resolve(`upload ${file.id} was canceled`)
      })

      this.#addEventHandlerForFile('upload-retry', file.id, () => {
        socket.send('pause', {})
        socket.send('resume', {})
      })

      this.#addEventHandlerIfFileStillExists('retry-all', file.id, () => {
        socket.send('pause', {})
        socket.send('resume', {})
      })

      socket.on('progress', (progressData) => emitSocketProgress(this, progressData, file))

      socket.on('success', (data) => {
        const body = opts.getResponseData(data.response.responseText, data.response)
        const uploadURL = body[opts.responseUrlFieldName]

        const uploadResp = {
          status: data.response.status,
          body,
          uploadURL,
          bytesUploaded: data.bytesUploaded,
        }

        this.uppy.emit('upload-success', file, uploadResp)
        queuedRequest.done()
        if (this.uploaderEvents[file.id]) {
          this.uploaderEvents[file.id].remove()
          this.uploaderEvents[file.id] = null
        }
        return resolve()
      })

      socket.on('error', (errData) => {
        const resp = errData.response
        const error = resp
          ? opts.getResponseError(resp.responseText, resp)
          : new ErrorWithCause(errData.error.message, { cause: errData.error })
        this.uppy.emit('upload-error', file, error)
        queuedRequest.done()
        if (this.uploaderEvents[file.id]) {
          this.uploaderEvents[file.id].remove()
          this.uploaderEvents[file.id] = null
        }
        reject(error)
      })
    }).catch((err) => {
      this.uppy.emit('upload-error', file, err)
      return Promise.reject(err)
    }))
  }
}
