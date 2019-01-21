const React = require('react')
const PropTypes = require('prop-types')
const ProgressBarPlugin = require('@uppy/progress-bar')
const uppyPropType = require('./propTypes').uppy

const h = React.createElement

/**
 * React component that renders a progress bar at the top of the page.
 */

class ProgressBar extends React.Component {
  componentDidMount () {
    this.installPlugin()
  }

  componentDidUpdate (prevProps) {
    if (prevProps.uppy !== this.props.uppy) {
      this.uninstallPlugin(prevProps)
      this.installPlugin()
    }
  }

  componentWillUnmount () {
    this.uninstallPlugin()
  }

  installPlugin () {
    const uppy = this.props.uppy
    const options = Object.assign(
      { id: 'react:ProgressBar' },
      this.props,
      { target: this.container }
    )
    delete options.uppy

    uppy.use(ProgressBarPlugin, options)

    this.plugin = uppy.getPlugin(options.id)
  }

  uninstallPlugin (props = this.props) {
    const uppy = props.uppy

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

ProgressBar.propTypes = {
  uppy: uppyPropType,
  fixed: PropTypes.bool,
  hideAfterFinish: PropTypes.bool
}
ProgressBar.defaultProps = {
}

module.exports = ProgressBar
