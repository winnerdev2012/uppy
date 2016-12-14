import Plugin from '../Plugin'
import 'whatwg-fetch'
import html from '../../core/html'

import Provider from '../../uppy-base/src/plugins/Provider'

import View from '../../generic-provider-views/index'

export default class Google extends Plugin {
  constructor (core, opts) {
    super(core, opts)
    this.type = 'acquirer'
    this.id = 'GoogleDrive'
    this.title = 'Google Drive'
    this.stateId = 'googleDrive'
    this.icon = html`
      <svg class="UppyIcon UppyModalTab-icon" width="28" height="28" viewBox="0 0 16 16">
        <path d="M2.955 14.93l2.667-4.62H16l-2.667 4.62H2.955zm2.378-4.62l-2.666 4.62L0 10.31l5.19-8.99 2.666 4.62-2.523 4.37zm10.523-.25h-5.333l-5.19-8.99h5.334l5.19 8.99z"/>
      </svg>
    `

    this[this.id] = new Provider({
      host: this.opts.host,
      provider: 'google',
      id: 'drive'
    })

    this.files = []

    // Visual
    this.render = this.render.bind(this)

    // set default options
    const defaultOptions = {}

    // merge default options with the ones set by user
    this.opts = Object.assign({}, defaultOptions, opts)
  }

  install () {
    this.view = new View(this)
    // Set default state for Google Drive
    this.core.setState({
      googleDrive: {
        authenticated: false,
        files: [],
        folders: [],
        directories: [],
        activeRow: -1,
        filterInput: ''
      }
    })

    const target = this.opts.target
    const plugin = this
    this.target = this.mount(target, plugin)

    this.GoogleDrive.auth()
      .then((authenticated) => {
        this.view.updateState({authenticated})
        if (authenticated) {
          this.view.getFolder('root')
        }
      })

    return
  }

  isFolder (item) {
    return item.mimeType === 'application/vnd.google-apps.folder'
  }

  getItemData (item) {
    return item
  }

  getItemIcon (item) {
    return html`<img src=${item.iconLink}/>`
  }

  getItemSubList (item) {
    return item.items
  }

  getItemName (item) {
    return item.title
  }

  getMimeType (item) {
    return item.mimeType
  }

  getItemId (item) {
    return item.id
  }

  getItemRequestPath (item) {
    return this.getItemId(item)
  }

  getItemModifiedDate (item) {
    return item.modifiedByMeDate
  }

  render (state) {
    return this.view.render(state)
  }
}
