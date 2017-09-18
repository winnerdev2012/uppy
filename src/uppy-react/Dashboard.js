const React = require('react')
const UppyCore = require('../core/Core').Uppy
const DashboardPlugin = require('../plugins/Dashboard')
const StatusBarPlugin = require('../plugins/StatusBar')
const InformerPlugin = require('../plugins/Informer')

const h = React.createElement

/**
 * React Component that renders a Dashboard for an Uppy instance. This component
 * renders the Dashboard inline, so you can put it anywhere you want.
 */

class Dashboard extends React.Component {
  componentDidMount () {
    const uppy = this.props.uppy
    uppy.use(DashboardPlugin, {
      target: this.container,
      disableInformer: true,
      disableStatusBar: true,
      locale: this.props.locale,
      maxWidth: this.props.maxWidth,
      maxHeight: this.props.maxHeight,
      semiTransparent: this.props.semiTransparent,
      showProgressDetails: this.props.showProgressDetails,
      // TODO Accept a React node here and render it so we can pass a DOM
      // element to this option.
      // defaultTabIcon: this.props.defaultTabIcon,
      inline: true
    })
    uppy.use(StatusBarPlugin, { target: DashboardPlugin })
    uppy.use(InformerPlugin, { target: DashboardPlugin })

    this.plugin = uppy.getPlugin('DashboardUI')
    this.statusBar = uppy.getPlugin('StatusBarUI')
    this.informer = uppy.getPlugin('Informer')
  }

  componentWillUnmount () {
    const uppy = this.props.uppy

    uppy.removePlugin(this.informer)
    uppy.removePlugin(this.statusBar)
    uppy.removePlugin(this.plugin)
  }

  render () {
    return h('div', {
      ref: (container) => {
        this.container = container
      }
    })
  }
}

Dashboard.propTypes = {
  uppy: React.PropTypes.instanceOf(UppyCore).isRequired,
  maxWidth: React.PropTypes.number,
  maxHeight: React.PropTypes.number,
  semiTransparent: React.PropTypes.bool,
  defaultTabIcon: React.PropTypes.node,
  showProgressDetails: React.PropTypes.bool,
  locale: React.PropTypes.object
}

Dashboard.defaultProps = {
  locale: {}
}

module.exports = Dashboard
