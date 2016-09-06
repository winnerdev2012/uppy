import Plugin from './Plugin'
import csjs from 'csjs'
import insertCss from 'insert-css'
import html from '../core/html'

const styles = csjs`
  .title {
    font-size: 30px;
    color: blue;
  }
`

/**
 * Dummy
 *
 */
export default class Dummy extends Plugin {
  constructor (core, opts, props) {
    super(core, opts)
    this.type = 'acquirer'
    this.id = 'Dummy'
    this.title = 'Mr. Plugin'
    this.props = props

    // set default options
    const defaultOptions = {}

    // merge default options with the ones set by user
    this.opts = Object.assign({}, defaultOptions, opts)

    this.strange = html`<h1 class="${styles.title}">this is strange 1</h1>`
    this.render = this.render.bind(this)
    this.install = this.install.bind(this)
  }

  addFakeFileJustToTest () {
    const blob = new Blob(
      ['data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+CiAgPGNpcmNsZSBjeD0iNjAiIGN5PSI2MCIgcj0iNTAiLz4KPC9zdmc+Cg=='],
      {type: 'image/svg+xml'}
    )
    const file = {
      source: 'acceptance-test',
      name: 'test-file',
      type: 'image/svg+xml',
      data: blob
    }
    this.props.log('Adding fake file blob')
    this.props.addFile(file)
  }

  render () {
    const bla = html`<h2>this is strange 2</h2>`
    return html`
      <div class="wow-this-works">
        <input class="UppyDummy-firstInput" type="text" value="hello">
        ${this.strange}
        ${bla}
      </div>
    `
  }

  focus () {
    const firstInput = document.querySelector(`${this.target} .UppyDummy-firstInput`)

    // only works for the first time if wrapped in setTimeout for some reason
    // firstInput.focus()
    setTimeout(function () {
      firstInput.focus()
    }, 10)

    setTimeout(() => {
      this.core.emit('informer', 'Hello! I’m a test Informer message', 'info', 4500)
      this.addFakeFileJustToTest()
    }, 1000)
  }

  install () {
    // const bus = this.core.emitter

    // setTimeout(() => {
    //   bus.emit('informer', 'hello', 'info', 5000)
    // }, 1000)

    insertCss(csjs.getCss(styles))

    const target = this.opts.target
    const plugin = this
    this.target = this.mount(target, plugin)
  }
}
