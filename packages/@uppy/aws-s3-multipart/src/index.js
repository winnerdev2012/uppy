import BasePlugin from '@uppy/core/lib/BasePlugin.js'
import { Socket, Provider, RequestClient } from '@uppy/companion-client'
import EventTracker from '@uppy/utils/lib/EventTracker'
import emitSocketProgress from '@uppy/utils/lib/emitSocketProgress'
import getSocketHost from '@uppy/utils/lib/getSocketHost'
import { RateLimitedQueue } from '@uppy/utils/lib/RateLimitedQueue'

import { createAbortError } from '@uppy/utils/lib/AbortController'
import packageJson from '../package.json'
import MultipartUploader from './MultipartUploader.js'

function assertServerError (res) {
  if (res && res.error) {
    const error = new Error(res.message)
    Object.assign(error, res.error)
    throw error
  }
  return res
}

function throwIfAborted (signal) {
  if (signal?.aborted) { throw createAbortError('The operation was aborted', { cause: signal.reason }) }
}

class HTTPCommunicationQueue {
  #abortMultipartUpload

  #cache = new WeakMap()

  #createMultipartUpload

  #fetchSignature

  #listParts

  #previousRetryDelay

  #requests

  #retryDelayIterator

  #sendCompletionRequest

  #setS3MultipartState

  #uploadPartBytes

  constructor (requests, options, setS3MultipartState) {
    this.#requests = requests
    this.#setS3MultipartState = setS3MultipartState
    this.setOptions(options)
  }

  setOptions (options) {
    const requests = this.#requests

    if ('abortMultipartUpload' in options) {
      this.#abortMultipartUpload = requests.wrapPromiseFunction(options.abortMultipartUpload)
    }
    if ('createMultipartUpload' in options) {
      this.#createMultipartUpload = requests.wrapPromiseFunction(options.createMultipartUpload, { priority:-1 })
    }
    if ('signPart' in options) {
      this.#fetchSignature = requests.wrapPromiseFunction(options.signPart)
    }
    if ('listParts' in options) {
      this.#listParts = requests.wrapPromiseFunction(options.listParts)
    }
    if ('completeMultipartUpload' in options) {
      this.#sendCompletionRequest = requests.wrapPromiseFunction(options.completeMultipartUpload)
    }
    if ('retryDelays' in options) {
      this.#retryDelayIterator = options.retryDelays?.values()
    }
    if ('uploadPartBytes' in options) {
      this.#uploadPartBytes = requests.wrapPromiseFunction(options.uploadPartBytes, { priority:Infinity })
    }
  }

  async #shouldRetry (err) {
    const requests = this.#requests
    const status = err?.source?.status

    // TODO: this retry logic is taken out of Tus. We should have a centralized place for retrying,
    // perhaps the rate limited queue, and dedupe all plugins with that.
    if (status == null) {
      return false
    }
    if (status === 403 && err.message === 'Request has expired') {
      if (!requests.isPaused) {
        // We don't want to exhaust the retryDelayIterator as long as there are
        // more than one request in parallel, to give slower connection a chance
        // to catch up with the expiry set in Companion.
        if (requests.limit === 1 || this.#previousRetryDelay == null) {
          const next = this.#retryDelayIterator?.next()
          if (next == null || next.done) {
            return false
          }
          // If there are more than 1 request done in parallel, the RLQ limit is
          // decreased and the failed request is requeued after waiting for a bit.
          // If there is only one request in parallel, the limit can't be
          // decreased, so we iterate over `retryDelayIterator` as we do for
          // other failures.
          // `#previousRetryDelay` caches the value so we can re-use it next time.
          this.#previousRetryDelay = next.value
        }
        // No need to stop the other requests, we just want to lower the limit.
        requests.rateLimit(0)
        await new Promise(resolve => setTimeout(resolve, this.#previousRetryDelay))
      }
    } else if (status === 429) {
      // HTTP 429 Too Many Requests => to avoid the whole download to fail, pause all requests.
      if (!requests.isPaused) {
        const next = this.#retryDelayIterator?.next()
        if (next == null || next.done) {
          return false
        }
        requests.rateLimit(next.value)
      }
    } else if (status > 400 && status < 500 && status !== 409) {
      // HTTP 4xx, the server won't send anything, it's doesn't make sense to retry
      return false
    } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      // The navigator is offline, let's wait for it to come back online.
      if (!requests.isPaused) {
        requests.pause()
        window.addEventListener('online', () => {
          requests.resume()
        }, { once: true })
      }
    } else {
      // Other error code means the request can be retried later.
      const next = this.#retryDelayIterator?.next()
      if (next == null || next.done) {
        return false
      }
      await new Promise(resolve => setTimeout(resolve, next.value))
    }
    return true
  }

  async getUploadId (file, signal) {
    const cachedResult = this.#cache.get(file.data)
    if (cachedResult != null) {
      return cachedResult
    }

    const promise = this.#createMultipartUpload(file, signal)

    const abortPromise = () => {
      promise.abort(signal.reason)
      this.#cache.delete(file.data)
    }
    signal.addEventListener('abort', abortPromise, { once: true })
    this.#cache.set(file.data, promise)
    promise.then(async (result) => {
      signal.removeEventListener('abort', abortPromise)
      this.#setS3MultipartState(file, result)
      this.#cache.set(file.data, result)
    }, () => { signal.removeEventListener('abort', abortPromise) })

    return promise
  }

  async abortFileUpload (file) {
    const result = this.#cache.get(file.data)
    if (result != null) {
      // If the createMultipartUpload request never was made, we don't
      // need to send the abortMultipartUpload request.
      await this.#abortMultipartUpload(file, await result)
    }
  }

  async uploadFile (file, chunks, signal) {
    throwIfAborted(signal)
    const { uploadId, key } = await this.getUploadId(file, signal)
    throwIfAborted(signal)
    const parts = await Promise.all(chunks.map((chunk, i) => this.uploadChunk(file, i + 1, chunk, signal)))
    throwIfAborted(signal)
    return this.#sendCompletionRequest(file, { key, uploadId, parts, signal }).abortOn(signal)
  }

  async resumeUploadFile (file, chunks, signal) {
    throwIfAborted(signal)
    const { uploadId, key } = await this.getUploadId(file, signal)
    throwIfAborted(signal)
    const alreadyUploadedParts = await this.#listParts(file, { uploadId, key, signal }).abortOn(signal)
    throwIfAborted(signal)
    const parts = await Promise.all(
      chunks
        .map((chunk, i) => {
          const partNumber = i + 1
          const alreadyUploadedInfo = alreadyUploadedParts.find(({ PartNumber }) => PartNumber === partNumber)
          return alreadyUploadedInfo == null
            ? this.uploadChunk(file, partNumber, chunk, signal)
            : { PartNumber: partNumber, ETag: alreadyUploadedInfo.ETag }
        }),
    )
    throwIfAborted(signal)
    return this.#sendCompletionRequest(file, { key, uploadId, parts, signal }).abortOn(signal)
  }

  async uploadChunk (file, partNumber, body, signal) {
    throwIfAborted(signal)
    const { uploadId, key } = await this.getUploadId(file, signal)
    throwIfAborted(signal)
    for (;;) {
      const signature = await this.#fetchSignature(file, { uploadId, key, partNumber, body, signal }).abortOn(signal)
      throwIfAborted(signal)
      try {
        return {
          PartNumber: partNumber,
          ...await this.#uploadPartBytes(signature, body, signal).abortOn(signal),
        }
      } catch (err) {
        if (!await this.#shouldRetry(err)) throw err
      }
    }
  }
}

export default class AwsS3Multipart extends BasePlugin {
  static VERSION = packageJson.version

  #queueRequestSocketToken

  #companionCommunicationQueue

  #client

  constructor (uppy, opts) {
    super(uppy, opts)
    this.type = 'uploader'
    this.id = this.opts.id || 'AwsS3Multipart'
    this.title = 'AWS S3 Multipart'
    this.#client = new RequestClient(uppy, opts)

    const defaultOptions = {
      // TODO: this is currently opt-in for backward compat, switch to opt-out in the next major
      allowedMetaFields: null,
      limit: 6,
      retryDelays: [0, 1000, 3000, 5000],
      createMultipartUpload: this.createMultipartUpload.bind(this),
      listParts: this.listParts.bind(this),
      abortMultipartUpload: this.abortMultipartUpload.bind(this),
      completeMultipartUpload: this.completeMultipartUpload.bind(this),
      signPart: this.signPart.bind(this),
      uploadPartBytes: AwsS3Multipart.uploadPartBytes,
      companionHeaders: {},
    }

    this.opts = { ...defaultOptions, ...opts }
    if (opts?.prepareUploadParts != null && opts.signPart == null) {
      this.opts.signPart = async (file, { uploadId, key, partNumber, body, signal }) => {
        const { presignedUrls, headers } = await opts
          .prepareUploadParts(file, { uploadId, key, parts: [{ number: partNumber, chunk: body }], signal })
        return { url: presignedUrls?.[partNumber], headers: headers?.[partNumber] }
      }
    }

    this.upload = this.upload.bind(this)

    /**
     * Simultaneous upload limiting is shared across all uploads with this plugin.
     *
     * @type {RateLimitedQueue}
     */
    this.requests = this.opts.rateLimitedQueue ?? new RateLimitedQueue(this.opts.limit)
    this.#companionCommunicationQueue = new HTTPCommunicationQueue(this.requests, this.opts, this.#setS3MultipartState)

    this.uploaders = Object.create(null)
    this.uploaderEvents = Object.create(null)
    this.uploaderSockets = Object.create(null)

    this.#queueRequestSocketToken = this.requests.wrapPromiseFunction(this.#requestSocketToken, { priority: -1 })
  }

  [Symbol.for('uppy test: getClient')] () { return this.#client }

  setOptions (newOptions) {
    this.#companionCommunicationQueue.setOptions(newOptions)
    return super.setOptions(newOptions)
  }

  /**
   * Clean up all references for a file's upload: the MultipartUploader instance,
   * any events related to the file, and the Companion WebSocket connection.
   *
   * Set `opts.abort` to tell S3 that the multipart upload is cancelled and must be removed.
   * This should be done when the user cancels the upload, not when the upload is completed or errored.
   */
  resetUploaderReferences (fileID, opts = {}) {
    if (this.uploaders[fileID]) {
      this.uploaders[fileID].abort({ really: opts.abort || false })
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

  // TODO: make this a private method in the next major
  assertHost (method) {
    if (!this.opts.companionUrl) {
      throw new Error(`Expected a \`companionUrl\` option containing a Companion address, or if you are not using Companion, a custom \`${method}\` implementation.`)
    }
  }

  createMultipartUpload (file, signal) {
    this.assertHost('createMultipartUpload')
    throwIfAborted(signal)

    const metadata = file.meta ? Object.fromEntries(
      (this.opts.allowedMetaFields ?? Object.keys(file.meta))
        .filter(key => file.meta[key] != null)
        .map(key => [`metadata[${key}]`, String(file.meta[key])]),
    ) : {}

    return this.#client.post('s3/multipart', {
      filename: file.name,
      type: file.type,
      metadata,
    }, { signal }).then(assertServerError)
  }

  listParts (file, { key, uploadId }, signal) {
    this.assertHost('listParts')
    throwIfAborted(signal)

    const filename = encodeURIComponent(key)
    return this.#client.get(`s3/multipart/${uploadId}?key=${filename}`, { signal })
      .then(assertServerError)
  }

  completeMultipartUpload (file, { key, uploadId, parts }, signal) {
    this.assertHost('completeMultipartUpload')
    throwIfAborted(signal)

    const filename = encodeURIComponent(key)
    const uploadIdEnc = encodeURIComponent(uploadId)
    return this.#client.post(`s3/multipart/${uploadIdEnc}/complete?key=${filename}`, { parts }, { signal })
      .then(assertServerError)
  }

  signPart (file, { uploadId, key, partNumber, signal }) {
    this.assertHost('signPart')
    throwIfAborted(signal)

    if (uploadId == null || key == null || partNumber == null) {
      throw new Error('Cannot sign without a key, an uploadId, and a partNumber')
    }

    const filename = encodeURIComponent(key)
    return this.#client.get(`s3/multipart/${uploadId}/${partNumber}?key=${filename}`, { signal })
      .then(assertServerError)
  }

  abortMultipartUpload (file, { key, uploadId }, signal) {
    this.assertHost('abortMultipartUpload')

    const filename = encodeURIComponent(key)
    const uploadIdEnc = encodeURIComponent(uploadId)
    return this.#client.delete(`s3/multipart/${uploadIdEnc}?key=${filename}`, undefined, { signal })
      .then(assertServerError)
  }

  static async uploadPartBytes ({ url, expires, headers }, body, signal) {
    throwIfAborted(signal)

    if (url == null) {
      throw new Error('Cannot upload to an undefined URL')
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', url, true)
      if (headers) {
        Object.keys(headers).forEach((key) => {
          xhr.setRequestHeader(key, headers[key])
        })
      }
      xhr.responseType = 'text'
      if (typeof expires === 'number') {
        xhr.timeout = expires * 1000
      }

      function onabort () {
        xhr.abort()
      }
      function cleanup () {
        signal.removeEventListener('abort', onabort)
      }
      signal.addEventListener('abort', onabort)

      xhr.upload.addEventListener('progress', body.onProgress)

      xhr.addEventListener('abort', () => {
        cleanup()

        reject(createAbortError())
      })

      xhr.addEventListener('timeout', () => {
        cleanup()

        const error = new Error('Request has expired')
        error.source = { status: 403 }
        reject(error)
      })
      xhr.addEventListener('load', (ev) => {
        cleanup()

        if (ev.target.status === 403 && ev.target.responseText.includes('<Message>Request has expired</Message>')) {
          const error = new Error('Request has expired')
          error.source = ev.target
          reject(error)
          return
        } if (ev.target.status < 200 || ev.target.status >= 300) {
          const error = new Error('Non 2xx')
          error.source = ev.target
          reject(error)
          return
        }

        body.onProgress?.(body.size)

        // NOTE This must be allowed by CORS.
        const etag = ev.target.getResponseHeader('ETag')

        if (etag === null) {
          reject(new Error('AwsS3/Multipart: Could not read the ETag header. This likely means CORS is not configured correctly on the S3 Bucket. See https://uppy.io/docs/aws-s3-multipart#S3-Bucket-Configuration for instructions.'))
          return
        }

        body.onComplete?.(etag)
        resolve({
          ETag: etag,
        })
      })

      xhr.addEventListener('error', (ev) => {
        cleanup()

        const error = new Error('Unknown error')
        error.source = ev.target
        reject(error)
      })

      xhr.send(body)
    })
  }

  #setS3MultipartState = (file, { key, uploadId }) => {
    const cFile = this.uppy.getFile(file.id)
    this.uppy.setFileState(file.id, {
      s3Multipart: {
        ...cFile.s3Multipart,
        key,
        uploadId,
      },
    })
  }

  uploadFile (file) {
    return new Promise((resolve, reject) => {
      const onProgress = (bytesUploaded, bytesTotal) => {
        this.uppy.emit('upload-progress', file, {
          uploader: this,
          bytesUploaded,
          bytesTotal,
        })
      }

      const onError = (err) => {
        this.uppy.log(err)
        this.uppy.emit('upload-error', file, err)

        this.resetUploaderReferences(file.id)
        reject(err)
      }

      const onSuccess = (result) => {
        const uploadObject = upload // eslint-disable-line no-use-before-define
        const uploadResp = {
          body: {
            ...result,
          },
          uploadURL: result.location,
        }

        this.resetUploaderReferences(file.id)

        const cFile = this.uppy.getFile(file.id)
        this.uppy.emit('upload-success', cFile || file, uploadResp)

        if (result.location) {
          this.uppy.log(`Download ${file.name} from ${result.location}`)
        }

        resolve(uploadObject)
      }

      const onPartComplete = (part) => {
        const cFile = this.uppy.getFile(file.id)
        if (!cFile) {
          return
        }

        this.uppy.emit('s3-multipart:part-uploaded', cFile, part)
      }

      const upload = new MultipartUploader(file.data, {
        // .bind to pass the file object to each handler.
        companionComm: this.#companionCommunicationQueue,

        log: (...args) => this.uppy.log(...args),
        getChunkSize: this.opts.getChunkSize ? this.opts.getChunkSize.bind(this) : null,

        onProgress,
        onError,
        onSuccess,
        onPartComplete,

        file,

        ...file.s3Multipart,
      })

      this.uploaders[file.id] = upload
      this.uploaderEvents[file.id] = new EventTracker(this.uppy)

      this.onFileRemove(file.id, (removed) => {
        upload.abort()
        this.resetUploaderReferences(file.id, { abort: true })
        resolve(`upload ${removed.id} was removed`)
      })

      this.onCancelAll(file.id, ({ reason } = {}) => {
        if (reason === 'user') {
          upload.abort()
          this.resetUploaderReferences(file.id, { abort: true })
        }
        resolve(`upload ${file.id} was canceled`)
      })

      this.onFilePause(file.id, (isPaused) => {
        if (isPaused) {
          upload.pause()
        } else {
          upload.start()
        }
      })

      this.onPauseAll(file.id, () => {
        upload.pause()
      })

      this.onResumeAll(file.id, () => {
        upload.start()
      })

      // Don't double-emit upload-started for Golden Retriever-restored files that were already started
      if (!file.progress.uploadStarted || !file.isRestored) {
        upload.start()
        this.uppy.emit('upload-started', file)
      }
    })
  }

  #requestSocketToken = async (file) => {
    const Client = file.remote.providerOptions.provider ? Provider : RequestClient
    const client = new Client(this.uppy, file.remote.providerOptions)
    const opts = { ...this.opts }

    if (file.tus) {
      // Install file-specific upload overrides.
      Object.assign(opts, file.tus)
    }

    if (file.remote.url == null) {
      throw new Error('Cannot connect to an undefined URL')
    }

    const res = await client.post(file.remote.url, {
      ...file.remote.body,
      protocol: 's3-multipart',
      size: file.data.size,
      metadata: file.meta,
    })
    return res.token
  }

  async uploadRemote (file) {
    this.resetUploaderReferences(file.id)

    // Don't double-emit upload-started for Golden Retriever-restored files that were already started
    if (!file.progress.uploadStarted || !file.isRestored) {
      this.uppy.emit('upload-started', file)
    }

    try {
      if (file.serverToken) {
        return this.connectToServerSocket(file)
      }
      const serverToken = await this.#queueRequestSocketToken(file)

      this.uppy.setFileState(file.id, { serverToken })
      return this.connectToServerSocket(this.uppy.getFile(file.id))
    } catch (err) {
      this.uppy.emit('upload-error', file, err)
      throw err
    }
  }

  async connectToServerSocket (file) {
    return new Promise((resolve, reject) => {
      let queuedRequest

      const token = file.serverToken
      const host = getSocketHost(file.remote.companionUrl)
      const socket = new Socket({ target: `${host}/api/${token}` })
      this.uploaderSockets[file.id] = socket
      this.uploaderEvents[file.id] = new EventTracker(this.uppy)

      this.onFileRemove(file.id, () => {
        queuedRequest.abort()
        socket.send('cancel', {})
        this.resetUploaderReferences(file.id, { abort: true })
        resolve(`upload ${file.id} was removed`)
      })

      this.onFilePause(file.id, (isPaused) => {
        if (isPaused) {
          // Remove this file from the queue so another file can start in its place.
          queuedRequest.abort()
          socket.send('pause', {})
        } else {
          // Resuming an upload should be queued, else you could pause and then
          // resume a queued upload to make it skip the queue.
          queuedRequest.abort()
          queuedRequest = this.requests.run(() => {
            socket.send('resume', {})
            return () => {}
          })
        }
      })

      this.onPauseAll(file.id, () => {
        queuedRequest.abort()
        socket.send('pause', {})
      })

      this.onCancelAll(file.id, ({ reason } = {}) => {
        if (reason === 'user') {
          queuedRequest.abort()
          socket.send('cancel', {})
          this.resetUploaderReferences(file.id)
        }
        resolve(`upload ${file.id} was canceled`)
      })

      this.onResumeAll(file.id, () => {
        queuedRequest.abort()
        if (file.error) {
          socket.send('pause', {})
        }
        queuedRequest = this.requests.run(() => {
          socket.send('resume', {})
        })
      })

      this.onRetry(file.id, () => {
        // Only do the retry if the upload is actually in progress;
        // else we could try to send these messages when the upload is still queued.
        // We may need a better check for this since the socket may also be closed
        // for other reasons, like network failures.
        if (socket.isOpen) {
          socket.send('pause', {})
          socket.send('resume', {})
        }
      })

      this.onRetryAll(file.id, () => {
        if (socket.isOpen) {
          socket.send('pause', {})
          socket.send('resume', {})
        }
      })

      socket.on('progress', (progressData) => emitSocketProgress(this, progressData, file))

      socket.on('error', (errData) => {
        this.uppy.emit('upload-error', file, new Error(errData.error))
        this.resetUploaderReferences(file.id)
        queuedRequest.done()
        reject(new Error(errData.error))
      })

      socket.on('success', (data) => {
        const uploadResp = {
          uploadURL: data.url,
        }

        this.uppy.emit('upload-success', file, uploadResp)
        this.resetUploaderReferences(file.id)
        queuedRequest.done()
        resolve()
      })

      queuedRequest = this.requests.run(() => {
        if (file.isPaused) {
          socket.send('pause', {})
        }

        return () => {}
      })
    })
  }

  async upload (fileIDs) {
    if (fileIDs.length === 0) return undefined

    const promises = fileIDs.map((id) => {
      const file = this.uppy.getFile(id)
      if (file.isRemote) {
        return this.uploadRemote(file)
      }
      return this.uploadFile(file)
    })

    return Promise.all(promises)
  }

  #setCompanionHeaders = () => {
    this.#client.setCompanionHeaders(this.opts.companionHeaders)
  }

  onFileRemove (fileID, cb) {
    this.uploaderEvents[fileID].on('file-removed', (file) => {
      if (fileID === file.id) cb(file.id)
    })
  }

  onFilePause (fileID, cb) {
    this.uploaderEvents[fileID].on('upload-pause', (targetFileID, isPaused) => {
      if (fileID === targetFileID) {
        cb(isPaused)
      }
    })
  }

  onRetry (fileID, cb) {
    this.uploaderEvents[fileID].on('upload-retry', (targetFileID) => {
      if (fileID === targetFileID) {
        cb()
      }
    })
  }

  onRetryAll (fileID, cb) {
    this.uploaderEvents[fileID].on('retry-all', () => {
      if (!this.uppy.getFile(fileID)) return
      cb()
    })
  }

  onPauseAll (fileID, cb) {
    this.uploaderEvents[fileID].on('pause-all', () => {
      if (!this.uppy.getFile(fileID)) return
      cb()
    })
  }

  onCancelAll (fileID, eventHandler) {
    this.uploaderEvents[fileID].on('cancel-all', (...args) => {
      if (!this.uppy.getFile(fileID)) return
      eventHandler(...args)
    })
  }

  onResumeAll (fileID, cb) {
    this.uploaderEvents[fileID].on('resume-all', () => {
      if (!this.uppy.getFile(fileID)) return
      cb()
    })
  }

  install () {
    const { capabilities } = this.uppy.getState()
    this.uppy.setState({
      capabilities: {
        ...capabilities,
        resumableUploads: true,
      },
    })
    this.uppy.addPreProcessor(this.#setCompanionHeaders)
    this.uppy.addUploader(this.upload)
  }

  uninstall () {
    const { capabilities } = this.uppy.getState()
    this.uppy.setState({
      capabilities: {
        ...capabilities,
        resumableUploads: false,
      },
    })
    this.uppy.removePreProcessor(this.#setCompanionHeaders)
    this.uppy.removeUploader(this.upload)
  }
}
