// eslint-disable-next-line max-classes-per-file
const tus = require('tus-js-client')
const { randomUUID } = require('node:crypto')
const isObject = require('isobject')
const validator = require('validator')
const request = require('request')
const { pipeline: pipelineCb } = require('stream')
const { join } = require('path')
const fs = require('fs')
const { promisify } = require('util')

// TODO move to `require('streams/promises').pipeline` when dropping support for Node.js 14.x.
const pipeline = promisify(pipelineCb)

const { createReadStream, createWriteStream, ReadStream } = fs
const { stat, unlink } = fs.promises

/** @type {any} */
// @ts-ignore - typescript resolves this this to a hoisted version of
// serialize-error that ships with a declaration file, we are using a version
// here that does not have a declaration file
const serializeError = require('serialize-error')
const emitter = require('./emitter')
const { jsonStringify, hasMatch } = require('./helpers/utils')
const logger = require('./logger')
const headerSanitize = require('./header-blacklist')
const redis = require('./redis')

// Need to limit length or we can get
// "MetadataTooLarge: Your metadata headers exceed the maximum allowed metadata size" in tus / S3
const MAX_FILENAME_LENGTH = 500
const DEFAULT_FIELD_NAME = 'files[]'
const PROTOCOLS = Object.freeze({
  multipart: 'multipart',
  s3Multipart: 's3-multipart',
  tus: 'tus',
})

function exceedsMaxFileSize (maxFileSize, size) {
  return maxFileSize && size && size > maxFileSize
}

// TODO remove once we migrate away from form-data
function sanitizeMetadata (inputMetadata) {
  if (inputMetadata == null) return {}

  const outputMetadata = {}
  Object.keys(inputMetadata).forEach((key) => {
    outputMetadata[key] = String(inputMetadata[key])
  })
  return outputMetadata
}

class AbortError extends Error {}

class ValidationError extends Error {}

/**
 * Validate the options passed down to the uplaoder
 *
 * @param {UploaderOptions} options
 */
function validateOptions (options) {
  // validate HTTP Method
  if (options.httpMethod) {
    if (typeof options.httpMethod !== 'string') {
      throw new ValidationError('unsupported HTTP METHOD specified')
    }

    const method = options.httpMethod.toLowerCase()
    if (method !== 'put' && method !== 'post') {
      throw new ValidationError('unsupported HTTP METHOD specified')
    }
  }

  if (exceedsMaxFileSize(options.companionOptions.maxFileSize, options.size)) {
    throw new ValidationError('maxFileSize exceeded')
  }

  // validate fieldname
  if (options.fieldname && typeof options.fieldname !== 'string') {
    throw new ValidationError('fieldname must be a string')
  }

  // validate metadata
  if (options.metadata != null) {
    if (!isObject(options.metadata)) throw new ValidationError('metadata must be an object')
  }

  // validate headers
  if (options.headers && !isObject(options.headers)) {
    throw new ValidationError('headers must be an object')
  }

  // validate protocol
  if (options.protocol == null || !Object.keys(PROTOCOLS).some((key) => PROTOCOLS[key] === options.protocol)) {
    throw new ValidationError('please specify a valid protocol')
  }

  // s3 uploads don't require upload destination
  // validation, because the destination is determined
  // by the server's s3 config
  if (options.protocol !== PROTOCOLS.s3Multipart) {
    if (!options.endpoint && !options.uploadUrl) {
      throw new ValidationError('no destination specified')
    }

    const validateUrl = (url) => {
      const validatorOpts = { require_protocol: true, require_tld: false }
      if (url && !validator.isURL(url, validatorOpts)) {
        throw new ValidationError('invalid destination url')
      }

      const allowedUrls = options.companionOptions.uploadUrls
      if (allowedUrls && url && !hasMatch(url, allowedUrls)) {
        throw new ValidationError('upload destination does not match any allowed destinations')
      }
    }

    [options.endpoint, options.uploadUrl].forEach(validateUrl)
  }

  if (options.chunkSize != null && typeof options.chunkSize !== 'number') {
    throw new ValidationError('incorrect chunkSize')
  }
}

class Uploader {
  /**
   * Uploads file to destination based on the supplied protocol (tus, s3-multipart, multipart)
   * For tus uploads, the deferredLength option is enabled, because file size value can be unreliable
   * for some providers (Instagram particularly)
   *
   * @typedef {object} UploaderOptions
   * @property {string} endpoint
   * @property {string} [uploadUrl]
   * @property {string} protocol
   * @property {number} [size]
   * @property {string} [fieldname]
   * @property {string} pathPrefix
   * @property {any} [s3]
   * @property {any} metadata
   * @property {any} companionOptions
   * @property {any} [storage]
   * @property {any} [headers]
   * @property {string} [httpMethod]
   * @property {boolean} [useFormData]
   * @property {number} [chunkSize]
   *
   * @param {UploaderOptions} options
   */
  constructor (options) {
    validateOptions(options)

    this.options = options
    this.token = randomUUID()
    this.fileName = `${Uploader.FILE_NAME_PREFIX}-${this.token}`
    this.options.metadata = sanitizeMetadata(this.options.metadata)
    this.options.fieldname = this.options.fieldname || DEFAULT_FIELD_NAME
    this.size = options.size
    this.uploadFileName = this.options.metadata.name
      ? this.options.metadata.name.substring(0, MAX_FILENAME_LENGTH)
      : this.fileName

    this.uploadStopped = false

    this.emittedProgress = {}
    this.storage = options.storage
    this._paused = false

    this.downloadedBytes = 0

    this.readStream = null

    if (this.options.protocol === PROTOCOLS.tus) {
      emitter().on(`pause:${this.token}`, () => {
        logger.debug('Received from client: pause', 'uploader', this.shortToken)
        this._paused = true
        if (this.tus) {
          this.tus.abort()
        }
      })

      emitter().on(`resume:${this.token}`, () => {
        logger.debug('Received from client: resume', 'uploader', this.shortToken)
        this._paused = false
        if (this.tus) {
          this.tus.start()
        }
      })
    }

    emitter().on(`cancel:${this.token}`, () => {
      logger.debug('Received from client: cancel', 'uploader', this.shortToken)
      this._paused = true
      if (this.tus) {
        const shouldTerminate = !!this.tus.url
        this.tus.abort(shouldTerminate).catch(() => {})
      }
      this.abortReadStream(new AbortError())
    })
  }

  abortReadStream (err) {
    this.uploadStopped = true
    if (this.readStream) this.readStream.destroy(err)
  }

  async _uploadByProtocol () {
    const { protocol } = this.options

    switch (protocol) {
      case PROTOCOLS.multipart:
        return this._uploadMultipart(this.readStream)
      case PROTOCOLS.s3Multipart:
        return this._uploadS3Multipart(this.readStream)
      case PROTOCOLS.tus:
        return this._uploadTus(this.readStream)
      default:
        throw new Error('Invalid protocol')
    }
  }

  async _downloadStreamAsFile (stream) {
    this.tmpPath = join(this.options.pathPrefix, this.fileName)

    logger.debug('fully downloading file', 'uploader.download', this.shortToken)
    const writeStream = createWriteStream(this.tmpPath)

    const onData = (chunk) => {
      this.downloadedBytes += chunk.length
      if (exceedsMaxFileSize(this.options.companionOptions.maxFileSize, this.downloadedBytes)) this.abortReadStream(new Error('maxFileSize exceeded'))
      this.onProgress(0, undefined)
    }

    stream.on('data', onData)

    await pipeline(stream, writeStream)
    logger.debug('finished fully downloading file', 'uploader.download', this.shortToken)

    const { size } = await stat(this.tmpPath)

    this.size = size

    const fileStream = createReadStream(this.tmpPath)
    this.readStream = fileStream
  }

  _needDownloadFirst () {
    return !this.options.size || !this.options.companionOptions.streamingUpload
  }

  /**
   *
   * @param {import('stream').Readable} stream
   */
  async uploadStream (stream) {
    try {
      if (this.uploadStopped) throw new Error('Cannot upload stream after upload stopped')
      if (this.readStream) throw new Error('Already uploading')

      this.readStream = stream
      if (this._needDownloadFirst()) {
        logger.debug('need to download the whole file first', 'controller.get.provider.size', this.shortToken)
        // Some streams need to be downloaded entirely first, because we don't know their size from the provider
        // This is true for zoom and drive (exported files) or some URL downloads.
        // The stream will then typically come from a "Transfer-Encoding: chunked" response
        await this._downloadStreamAsFile(this.readStream)
      }
      if (this.uploadStopped) return undefined

      const { url, extraData } = await Promise.race([
        this._uploadByProtocol(),
        // If we don't handle stream errors, we get unhandled error in node.
        new Promise((resolve, reject) => this.readStream.on('error', reject)),
      ])
      return { url, extraData }
    } finally {
      logger.debug('cleanup', this.shortToken)
      if (this.readStream && !this.readStream.destroyed) this.readStream.destroy()
      if (this.tmpPath) unlink(this.tmpPath).catch(() => {})
    }
  }

  /**
   *
   * @param {import('stream').Readable} stream
   */
  async tryUploadStream (stream) {
    try {
      emitter().emit('upload-start', { token: this.token })

      const ret = await this.uploadStream(stream)
      if (!ret) return
      const { url, extraData } = ret
      this.#emitSuccess(url, extraData)
    } catch (err) {
      if (err instanceof AbortError) {
        logger.error('Aborted upload', 'uploader.aborted', this.shortToken)
        return
      }
      // console.log(err)
      logger.error(err, 'uploader.error', this.shortToken)
      this.#emitError(err)
    } finally {
      emitter().removeAllListeners(`pause:${this.token}`)
      emitter().removeAllListeners(`resume:${this.token}`)
      emitter().removeAllListeners(`cancel:${this.token}`)
    }
  }

  /**
   * returns a substring of the token. Used as traceId for logging
   * we avoid using the entire token because this is meant to be a short term
   * access token between uppy client and companion websocket
   *
   * @param {string} token the token to Shorten
   * @returns {string}
   */
  static shortenToken (token) {
    return token.substring(0, 8)
  }

  static reqToOptions (req, size) {
    const useFormDataIsSet = Object.prototype.hasOwnProperty.call(req.body, 'useFormData')
    const useFormData = useFormDataIsSet ? req.body.useFormData : true

    return {
      // Client provided info (must be validated and not blindly trusted):
      headers: req.body.headers,
      httpMethod: req.body.httpMethod,
      protocol: req.body.protocol,
      endpoint: req.body.endpoint,
      uploadUrl: req.body.uploadUrl,
      metadata: req.body.metadata,
      fieldname: req.body.fieldname,
      useFormData,

      // Info coming from companion server configuration:
      size,
      companionOptions: req.companion.options,
      pathPrefix: `${req.companion.options.filePath}`,
      storage: redis.client(),
      s3: req.companion.s3Client ? {
        client: req.companion.s3Client,
        options: req.companion.options.s3,
      } : null,
      chunkSize: req.companion.options.chunkSize,
    }
  }

  /**
   * returns a substring of the token. Used as traceId for logging
   * we avoid using the entire token because this is meant to be a short term
   * access token between uppy client and companion websocket
   */
  get shortToken () {
    return Uploader.shortenToken(this.token)
  }

  async awaitReady (timeout) {
    logger.debug('waiting for socket connection', 'uploader.socket.wait', this.shortToken)

    // TODO: replace the Promise constructor call when dropping support for Node.js <16 with
    // await once(emitter, eventName, timeout && { signal: AbortSignal.timeout(timeout) })
    await new Promise((resolve, reject) => {
      const eventName = `connection:${this.token}`
      let timer
      let onEvent

      function cleanup () {
        emitter().removeListener(eventName, onEvent)
        clearTimeout(timer)
      }

      if (timeout) {
        // Need to timeout after a while, or we could leak emitters
        timer = setTimeout(() => {
          cleanup()
          reject(new Error('Timed out waiting for socket connection'))
        }, timeout)
      }

      onEvent = () => {
        cleanup()
        resolve()
      }

      emitter().once(eventName, onEvent)
    })

    logger.debug('socket connection received', 'uploader.socket.wait', this.shortToken)
  }

  /**
   * @typedef {{action: string, payload: object}} State
   * @param {State} state
   */
  saveState (state) {
    if (!this.storage) return
    // make sure the keys get cleaned up.
    // https://github.com/transloadit/uppy/issues/3748
    const keyExpirySec = 60 * 60 * 24
    const redisKey = `${Uploader.STORAGE_PREFIX}:${this.token}`
    this.storage.set(redisKey, jsonStringify(state), 'EX', keyExpirySec)
  }

  /**
   *
   * @param {number} [bytesUploaded]
   * @param {number | null} [bytesTotalIn]
   */
  onProgress (bytesUploaded = 0, bytesTotalIn = 0) {
    const bytesTotal = bytesTotalIn || this.size || 0

    // If fully downloading before uploading, combine downloaded and uploaded bytes
    // This will make sure that the user sees half of the progress before upload starts (while downloading)
    let combinedBytes = bytesUploaded
    if (this._needDownloadFirst()) {
      combinedBytes = Math.floor((combinedBytes + (this.downloadedBytes || 0)) / 2)
    }

    // Prevent divide by zero
    let percentage = 0
    if (bytesTotal > 0) percentage = Math.min(Math.max(0, ((combinedBytes / bytesTotal) * 100)), 100)

    const formattedPercentage = percentage.toFixed(2)
    logger.debug(
      `${combinedBytes} ${bytesTotal} ${formattedPercentage}%`,
      'uploader.total.progress',
      this.shortToken,
    )

    if (this._paused || this.uploadStopped) {
      return
    }

    const payload = { progress: formattedPercentage, bytesUploaded: combinedBytes, bytesTotal }
    const dataToEmit = {
      action: 'progress',
      payload,
    }
    this.saveState(dataToEmit)

    const isEqual = (p1, p2) => (p1.progress === p2.progress
      && p1.bytesUploaded === p2.bytesUploaded
      && p1.bytesTotal === p2.bytesTotal)

    // avoid flooding the client with progress events.
    if (!isEqual(this.emittedProgress, payload)) {
      this.emittedProgress = payload
      emitter().emit(this.token, dataToEmit)
    }
  }

  /**
   *
   * @param {string} url
   * @param {object} extraData
   */
  #emitSuccess (url, extraData) {
    const emitData = {
      action: 'success',
      payload: { ...extraData, complete: true, url },
    }
    this.saveState(emitData)
    emitter().emit(this.token, emitData)
  }

  /**
   *
   * @param {Error} err
   */
  #emitError (err) {
    // delete stack to avoid sending server info to client
    // todo remove also extraData from serializedErr in next major,
    // see PR discussion https://github.com/transloadit/uppy/pull/3832
    const { stack, ...serializedErr } = serializeError(err)
    const dataToEmit = {
      action: 'error',
      // @ts-ignore
      payload: { ...err.extraData, error: serializedErr },
    }
    this.saveState(dataToEmit)
    emitter().emit(this.token, dataToEmit)
  }

  /**
   * start the tus upload
   *
   * @param {any} stream
   */
  async _uploadTus (stream) {
    const uploader = this

    const isFileStream = stream instanceof ReadStream
    // chunkSize needs to be a finite value if the stream is not a file stream (fs.createReadStream)
    // https://github.com/tus/tus-js-client/blob/4479b78032937ac14da9b0542e489ac6fe7e0bc7/lib/node/fileReader.js#L50
    const chunkSize = this.options.chunkSize || (isFileStream ? Infinity : 50e6)

    return new Promise((resolve, reject) => {
      this.tus = new tus.Upload(stream, {
        endpoint: this.options.endpoint,
        uploadUrl: this.options.uploadUrl,
        uploadLengthDeferred: false,
        retryDelays: [0, 1000, 3000, 5000],
        uploadSize: this.size,
        chunkSize,
        headers: headerSanitize(this.options.headers),
        addRequestId: true,
        metadata: {
          // file name and type as required by the tusd tus server
          // https://github.com/tus/tusd/blob/5b376141903c1fd64480c06dde3dfe61d191e53d/unrouted_handler.go#L614-L646
          filename: this.uploadFileName,
          filetype: this.options.metadata.type,
          ...this.options.metadata,
        },
        /**
         *
         * @param {Error} error
         */
        onError (error) {
          logger.error(error, 'uploader.tus.error')
          // deleting tus originalRequest field because it uses the same http-agent
          // as companion, and this agent may contain sensitive request details (e.g headers)
          // previously made to providers. Deleting the field would prevent it from getting leaked
          // to the frontend etc.
          // @ts-ignore
          delete error.originalRequest
          // @ts-ignore
          delete error.originalResponse
          reject(error)
        },
        /**
         *
         * @param {number} [bytesUploaded]
         * @param {number} [bytesTotal]
         */
        onProgress (bytesUploaded, bytesTotal) {
          uploader.onProgress(bytesUploaded, bytesTotal)
        },
        onSuccess () {
          resolve({ url: uploader.tus.url })
        },
      })

      if (!this._paused) {
        this.tus.start()
      }
    })
  }

  async _uploadMultipart (stream) {
    if (!this.options.endpoint) {
      throw new Error('No multipart endpoint set')
    }

    // upload progress
    let bytesUploaded = 0
    stream.on('data', (data) => {
      bytesUploaded += data.length
      this.onProgress(bytesUploaded, undefined)
    })

    const httpMethod = (this.options.httpMethod || '').toLowerCase() === 'put' ? 'put' : 'post'
    const headers = headerSanitize(this.options.headers)
    const reqOptions = { url: this.options.endpoint, headers, encoding: null }
    const runRequest = request[httpMethod]

    if (this.options.useFormData) {
      reqOptions.formData = {
        ...this.options.metadata,
        [this.options.fieldname]: {
          value: stream,
          options: {
            filename: this.uploadFileName,
            contentType: this.options.metadata.type,
            knownLength: this.size,
          },
        },
      }
    } else {
      reqOptions.headers['content-length'] = this.size
      reqOptions.body = stream
    }

    const { response, body } = await new Promise((resolve, reject) => {
      runRequest(reqOptions, (error, response2, body2) => {
        if (error) {
          logger.error(error, 'upload.multipart.error')
          reject(error)
          return
        }

        resolve({ response: response2, body: body2 })
      })
    })

    // remove browser forbidden headers
    delete response.headers['set-cookie']
    delete response.headers['set-cookie2']

    const respObj = {
      responseText: body.toString(),
      status: response.statusCode,
      statusText: response.statusMessage,
      headers: response.headers,
    }

    if (response.statusCode >= 400) {
      logger.error(`upload failed with status: ${response.statusCode}`, 'upload.multipart.error')
      const err = new Error(response.statusMessage)
      // @ts-ignore
      err.extraData = respObj
      throw err
    }

    if (bytesUploaded !== this.size) {
      const errMsg = `uploaded only ${bytesUploaded} of ${this.size} with status: ${response.statusCode}`
      logger.error(errMsg, 'upload.multipart.mismatch.error')
      throw new Error(errMsg)
    }

    return { url: null, extraData: { response: respObj, bytesUploaded } }
  }

  /**
   * Upload the file to S3 using a Multipart upload.
   */
  async _uploadS3Multipart (stream) {
    if (!this.options.s3) {
      throw new Error('The S3 client is not configured on this companion instance.')
    }

    const filename = this.uploadFileName
    const { client, options } = this.options.s3

    const params = {
      Bucket: options.bucket,
      Key: options.getKey(null, filename, this.options.metadata),
      ContentType: this.options.metadata.type,
      Metadata: this.options.metadata,
      Body: stream,
    }

    if (options.acl != null) params.ACL = options.acl

    const upload = client.upload(params, {
      // using chunkSize as partSize too, see https://github.com/transloadit/uppy/pull/3511
      partSize: this.options.chunkSize,
    })

    upload.on('httpUploadProgress', ({ loaded, total }) => {
      this.onProgress(loaded, total)
    })

    return new Promise((resolve, reject) => {
      upload.send((error, data) => {
        if (error) {
          reject(error)
          return
        }

        resolve({
          url: data && data.Location ? data.Location : null,
          extraData: {
            response: {
              responseText: JSON.stringify(data),
              headers: {
                'content-type': 'application/json',
              },
            },
          },
        })
      })
    })
  }
}

Uploader.FILE_NAME_PREFIX = 'uppy-file'
Uploader.STORAGE_PREFIX = 'companion'

module.exports = Uploader
module.exports.ValidationError = ValidationError
