const Plugin = require('../core/Plugin')
const { findDOMElement } = require('../core/Utils')
const getFormData = require('get-form-data')

/**
 * Form
 */
module.exports = class Form extends Plugin {
  constructor (uppy, opts) {
    super(uppy, opts)
    this.type = 'acquirer'
    this.id = 'Form'
    this.title = 'Form'

    // set default options
    const defaultOptions = {
      target: null,
      resultName: 'uppyResult',
      getMetaFromForm: true,
      addResultToForm: true,
      // triggerUploadOnFileSelection: false,
      submitOnSuccess: false,
      triggerUploadOnSubmit: false
    }

    // merge default options with the ones set by user
    this.opts = Object.assign({}, defaultOptions, opts)

    this.handleFormSubmit = this.handleFormSubmit.bind(this)
    this.handleUploadStart = this.handleUploadStart.bind(this)
    this.handleSuccess = this.handleSuccess.bind(this)
    this.addResultToForm = this.addResultToForm.bind(this)
  }

  handleFormSubmit (ev) {
    if (!this.opts.triggerUploadOnSubmit) return
    console.log('PREVENT DEFAULT')
    ev.preventDefault()
    this.uppy.upload()
  }

  handleSuccess (data) {
    const result = {}

    data.forEach(fileID => {
      result[fileID] = {
        url: this.uppy.state.files[fileID].uploadURL
        // transcoding/postprocessing result here too?
      }
    })

    this.addResultToForm(result)

    if (this.opts.submitOnSuccess) {
      this.form.submit()
    }
  }

  addResultToForm (result) {
    if (!this.opts.addResultToForm) return

    this.uppy.log('[Form] Adding result to the original form:')
    this.uppy.log(result)

    let resultInput = this.form.querySelector(`[name="${this.opts.resultName}"]`)
    if (resultInput) {
      resultInput.value = JSON.stringify(result)
      return
    }

    resultInput = document.createElement('input')
    resultInput.name = this.opts.resultName
    resultInput.type = 'hidden'
    resultInput.value = JSON.stringify(result)
    this.form.appendChild(resultInput)
  }

  handleUploadStart () {
    if (!this.opts.getMetaFromForm) return
    const formMeta = getFormData(this.form)
    this.uppy.setMeta(formMeta)
  }

  install () {
    this.form = findDOMElement(this.opts.target)
    if (!this.form || !this.form.nodeName === 'FORM') {
      console.error('Form plugin requires a <form> target element passed in options to operate, none was found', 'error')
      return
    }

    this.form.addEventListener('submit', this.handleFormSubmit)
    this.uppy.on('upload', this.handleUploadStart)
    this.uppy.on('success', this.handleSuccess)
  }

  uninstall () {
    this.form.removeEventListener('submit', this.handleFormSubmit)
    this.uppy.off('upload', this.handleUploadStart)
    this.uppy.off('success', this.handleSuccess)
  }
}
