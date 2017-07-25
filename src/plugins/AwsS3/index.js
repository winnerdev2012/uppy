const Plugin = require('../Plugin')

module.exports = class AwsS3 extends Plugin {
  constructor (core, opts) {
    super(core, opts)
    this.type = 'uploader'
    this.id = 'AwsS3'
    this.title = 'AWS S3'

    const defaultOptions = {
      getUploadParameters: this.getUploadParameters.bind(this)
    }

    this.opts = Object.assign({}, defaultOptions, opts)

    this.prepareUpload = this.prepareUpload.bind(this)
  }

  getUploadParameters (file) {
    if (!this.opts.host) {
      throw new Error('Expected a `host` option containing an uppy-server address.')
    }

    const filename = encodeURIComponent(file.name)
    const type = encodeURIComponent(`${file.type.general}/${file.type.specific}`)
    return fetch(`${this.opts.host}/s3/params?filename=${filename}&type=${type}`, {
      method: 'get',
      headers: { accept: 'application/json' }
    }).then((response) => response.json())
  }

  prepareUpload (fileIDs) {
    fileIDs.forEach((id) => {
      this.core.emit('core:preprocess-progress', id, {
        mode: 'determinate',
        message: 'Preparing upload...',
        value: 0
      })
    })

    this.core.setState({
      xhrUpload: Object.assign({}, this.core.state.xhrUpload, {
        responseUrlFieldName: 'location',
        getResponseData (xhr) {
          // If no response, we've hopefully done a PUT request to the file
          // in the bucket on its full URL.
          if (!xhr.responseXML) {
            return { location: xhr.responseURL }
          }
          function getValue (key) {
            const el = xhr.responseXML.querySelector(key)
            return el ? el.textContent : ''
          }
          return {
            location: getValue('Location'),
            bucket: getValue('Bucket'),
            key: getValue('Key'),
            etag: getValue('ETag')
          }
        }
      })
    })

    return Promise.all(
      fileIDs.map((id) => {
        const file = this.core.getFile(id)
        return this.opts.getUploadParameters(file).then((params) => {
          this.core.emit('core:preprocess-progress', file.id, {
            mode: 'determinate',
            message: 'Preparing upload...',
            value: 1
          })
          return params
        })
      })
    ).then((responses) => {
      const updatedFiles = {}
      fileIDs.forEach((id, index) => {
        const file = this.core.getFile(id)
        const {
          method = 'post',
          url,
          fields
        } = responses[index]
        const updatedFile = Object.assign({}, file, {
          meta: Object.assign({}, file.meta, fields),
          xhrUpload: {
            method,
            formData: method.toLowerCase() === 'post',
            endpoint: url,
            fieldName: 'file',
            metaFields: Object.keys(fields)
          }
        })

        updatedFiles[id] = updatedFile
      })

      this.core.setState({
        files: Object.assign({}, this.core.getState().files, updatedFiles)
      })

      fileIDs.forEach((id) => {
        this.core.emit('core:preprocess-complete', id)
      })
    })
  }

  install () {
    this.core.addPreProcessor(this.prepareUpload)
  }

  uninstall () {
    this.core.removePreProcessor(this.prepareUpload)
  }
}
