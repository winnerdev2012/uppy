const Plugin = require('./Plugin')

/**
 * Add Redux DevTools support to Uppy
 *
 * See https://medium.com/@zalmoxis/redux-devtools-without-redux-or-how-to-have-a-predictable-state-with-any-architecture-61c5f5a7716f
 * and https://github.com/zalmoxisus/mobx-remotedev/blob/master/src/monitorActions.js
 */
module.exports = class ReduxDevTools extends Plugin {
  constructor (core, opts) {
    super(core, opts)
    this.type = 'debugger'
    this.id = 'ReduxDevTools'
    this.title = 'Redux DevTools'

    // set default options
    const defaultOptions = {}

    // merge default options with the ones set by user
    this.opts = Object.assign({}, defaultOptions, opts)

    this.handleStateChange = this.handleStateChange.bind(this)
    this.initDevTools = this.initDevTools.bind(this)
  }

  handleStateChange (prevState, nextState, patch) {
    this.devTools.send('UPPY_STATE_UPDATE', nextState)
  }

  initDevTools () {
    this.devTools = window.devToolsExtension.connect()
    this.devToolsUnsubscribe = this.devTools.subscribe((message) => {
      if (message.type === 'DISPATCH') {
        console.log(message.payload.type)

        // Implement monitors actions
        switch (message.payload.type) {
          case 'RESET':
            this.core.reset()
            return
          case 'IMPORT_STATE':
            const computedStates = message.payload.nextLiftedState.computedStates
            this.core.state = Object.assign({}, this.core.state, computedStates[computedStates.length - 1].state)
            this.core.updateAll(this.core.state)
            return
          case 'JUMP_TO_STATE':
          case 'JUMP_TO_ACTION':
            // this.setState(state)
            this.core.state = Object.assign({}, this.core.state, JSON.parse(message.state))
            this.core.updateAll(this.core.state)
        }
      }
    })
  }

  install () {
    this.withDevTools = typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__
    if (this.withDevTools) {
      this.initDevTools()
      this.core.on('core:state-update', this.handleStateChange)
    }
  }

  uninstall () {
    if (this.withDevTools) {
      this.devToolsUnsubscribe()
      this.core.emitter.off('core:state-update', this.handleStateUpdate)
    }
  }
}
