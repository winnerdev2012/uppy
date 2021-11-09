const { h } = require('preact')
const SearchInput = require('./InputView')
const Browser = require('../Browser')
const LoaderView = require('../Loader')
const Header = require('./Header')
const CloseWrapper = require('../CloseWrapper')
const View = require('../View')

/**
 * Class to easily generate generic views for Provider plugins
 */
module.exports = class SearchProviderView extends View {
  static VERSION = require('../../package.json').version

  #searchTerm

  /**
   * @param {object} plugin instance of the plugin
   * @param {object} opts
   */
  constructor (plugin, opts) {
    super(plugin, opts)

    // set default options
    const defaultOptions = {
      viewType: 'grid',
      showTitles: false,
      showFilter: false,
      showBreadcrumbs: false,
    }

    // merge default options with the ones set by user
    this.opts = { ...defaultOptions, ...opts }

    // Logic
    this.search = this.search.bind(this)
    this.triggerSearchInput = this.triggerSearchInput.bind(this)
    this.addFile = this.addFile.bind(this)
    this.handleScroll = this.handleScroll.bind(this)
    this.donePicking = this.donePicking.bind(this)

    // Visual
    this.render = this.render.bind(this)

    // Set default state for the plugin
    this.plugin.setPluginState({
      isInputMode: true,
      files: [],
      folders: [],
      directories: [],
      filterInput: '',
      isSearchVisible: false,
      currentSelection: [],
    })
  }

  tearDown () {
    // Nothing.
  }

  #updateFilesAndInputMode (res, files) {
    this.nextPageQuery = res.nextPageQuery
    this.#searchTerm = res.searchedFor
    res.items.forEach((item) => { files.push(item) })
    this.plugin.setPluginState({ isInputMode: false, files })
  }

  search (query) {
    if (query && query === this.#searchTerm) {
      // no need to search again as this is the same as the previous search
      this.plugin.setPluginState({ isInputMode: false })
      return
    }

    return this.sharedHandler.loaderWrapper(
      this.provider.search(query),
      (res) => {
        this.#updateFilesAndInputMode(res, [])
      },
      this.handleError,
    )
  }

  triggerSearchInput () {
    this.plugin.setPluginState({ isInputMode: true })
  }

  async handleScroll (event) {
    const query = this.nextPageQuery || null

    if (this.shouldHandleScroll(event) && query) {
      this.isHandlingScroll = true

      try {
        const response = await this.provider.search(this.#searchTerm, query)
        const { files } = this.plugin.getPluginState()

        this.#updateFilesAndInputMode(response, files)
      } catch (error) {
        this.handleError(error)
      } finally {
        this.isHandlingScroll = false
      }
    }
  }

  donePicking () {
    const { currentSelection } = this.plugin.getPluginState()
    const promises = currentSelection.map((file) => this.addFile(file))

    this.sharedHandler.loaderWrapper(Promise.all(promises), () => {
      this.clearSelection()
    }, () => {})
  }

  render (state, viewOptions = {}) {
    const { didFirstRender, isInputMode } = this.plugin.getPluginState()

    if (!didFirstRender) {
      this.preFirstRender()
    }

    const targetViewOptions = { ...this.opts, ...viewOptions }
    const { files, folders, filterInput, loading, currentSelection } = this.plugin.getPluginState()
    const { isChecked, toggleCheckbox, filterItems } = this.sharedHandler
    const hasInput = filterInput !== ''

    const browserProps = {
      isChecked,
      toggleCheckbox,
      currentSelection,
      files: hasInput ? filterItems(files) : files,
      folders: hasInput ? filterItems(folders) : folders,
      handleScroll: this.handleScroll,
      done: this.donePicking,
      cancel: this.cancelPicking,
      headerComponent: Header({
        triggerSearchInput: this.triggerSearchInput,
        i18n: this.plugin.uppy.i18n,
      }),
      title: this.plugin.title,
      viewType: targetViewOptions.viewType,
      showTitles: targetViewOptions.showTitles,
      showFilter: targetViewOptions.showFilter,
      showBreadcrumbs: targetViewOptions.showBreadcrumbs,
      pluginIcon: this.plugin.icon,
      i18n: this.plugin.uppy.i18n,
      uppyFiles: this.plugin.uppy.getFiles(),
      validateRestrictions: (...args) => this.plugin.uppy.validateRestrictions(...args),
    }

    if (loading) {
      return (
        <CloseWrapper onUnmount={this.clearSelection}>
          <LoaderView i18n={this.plugin.uppy.i18n} />
        </CloseWrapper>
      )
    }

    if (isInputMode) {
      return (
        <CloseWrapper onUnmount={this.clearSelection}>
          <SearchInput
            search={this.search}
            i18n={this.plugin.uppy.i18n}
          />
        </CloseWrapper>
      )
    }

    return (
      <CloseWrapper onUnmount={this.clearSelection}>
        <Browser {...browserProps} />
      </CloseWrapper>
    )
  }
}
