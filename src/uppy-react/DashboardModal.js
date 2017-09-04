const React = require('react')
const PropTypes = require('prop-types')
const UppyCore = require('../core/Core')
const DashboardPlugin = require('../plugins/Dashboard')
const StatusBarPlugin = require('../plugins/StatusBar')
const InformerPlugin = require('../plugins/Informer')

const h = React.createElement

/**
 * React Component that renders a Dashboard for an Uppy instance in a Modal
 * dialog. Visibility of the Modal is toggled using the `open` prop.
 */

class DashboardModal extends React.Component {
  componentDidMount () {
    const uppy = this.props.uppy
    const options = Object.assign({}, this.props, {
      target: this.container,
      disableInformer: true,
      disableStatusBar: true,
      onRequestHideModal: this.props.onRequestClose
    })
    delete options.uppy
    uppy.use(DashboardPlugin, options)
    uppy.use(StatusBarPlugin, { target: DashboardPlugin })
    uppy.use(InformerPlugin, { target: DashboardPlugin })

    this.plugin = uppy.getPlugin('DashboardUI')
    this.statusBar = uppy.getPlugin('StatusBarUI')
    this.informer = uppy.getPlugin('Informer')
    if (this.props.open) {
      this.plugin.showModal()
    }
  }

  componentWillReceiveProps (nextProps) {
    if (this.props.open && !nextProps.open) {
      this.plugin.hideModal()
    } else if (!this.props.open && nextProps.open) {
      this.plugin.showModal()
    }
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

DashboardModal.propTypes = {
  uppy: PropTypes.instanceOf(UppyCore).isRequired,
  maxWidth: PropTypes.number,
  maxHeight: PropTypes.number,
  semiTransparent: PropTypes.bool,
  defaultTabIcon: PropTypes.node,
  showProgressDetails: PropTypes.bool,
  onRequestClose: PropTypes.func,
  locale: PropTypes.object
}

DashboardModal.defaultProps = {
  locale: {}
}

module.exports = DashboardModal
