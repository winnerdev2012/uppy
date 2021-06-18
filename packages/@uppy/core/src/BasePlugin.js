/**
 * Core plugin logic that all plugins share.
 *
 * BasePlugin does not contain DOM rendering so it can be used for plugins
 * without a user interface.
 *
 * See `Plugin` for the extended version with Preact rendering for interfaces.
 */
module.exports = class BasePlugin {
  constructor (uppy, opts) {
    this.uppy = uppy
    this.opts = opts || {}

    this.getPluginState = this.getPluginState.bind(this)
    this.setPluginState = this.setPluginState.bind(this)
    this.setOptions = this.setOptions.bind(this)
    this.install = this.install.bind(this)
    this.uninstall = this.uninstall.bind(this)
  }

  getPluginState () {
    const { plugins } = this.uppy.getState()
    return plugins[this.id] || {}
  }

  setPluginState (update) {
    const { plugins } = this.uppy.getState()

    this.uppy.setState({
      plugins: {
        ...plugins,
        [this.id]: {
          ...plugins[this.id],
          ...update,
        },
      },
    })
  }

  setOptions (newOpts) {
    this.opts = { ...this.opts, ...newOpts }
    this.setPluginState() // so that UI re-renders with new options
  }

  /**
   * Extendable methods
   * ==================
   * These methods are here to serve as an overview of the extendable methods as well as
   * making them not conditional in use, such as `if (this.afterUpdate)`.
   */

  // eslint-disable-next-line class-methods-use-this
  addTarget () {
    throw new Error('Extend the addTarget method to add your plugin to another plugin\'s target')
  }

  // eslint-disable-next-line class-methods-use-this
  install () {}

  // eslint-disable-next-line class-methods-use-this
  uninstall () {}

  /**
   * Called when plugin is mounted, whether in DOM or into another plugin.
   * Needed because sometimes plugins are mounted separately/after `install`,
   * so this.el and this.parent might not be available in `install`.
   * This is the case with @uppy/react plugins, for example.
   */
  render () {
    throw new Error('Extend the render method to add your plugin to a DOM element')
  }

  // eslint-disable-next-line class-methods-use-this
  onMount () {}

  // eslint-disable-next-line class-methods-use-this
  update () {}

  // Called after every state update, after everything's mounted. Debounced.
  // eslint-disable-next-line class-methods-use-this
  afterUpdate () {}
}
