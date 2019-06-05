const createUppy = require('./createUppy')
const addDashboardPlugin = require('./addDashboardPlugin')
const addTransloaditPlugin = require('./addTransloaditPlugin')
const addProviders = require('./addProviders')

function dashboard (target, opts = {}) {
  const inline = opts.inline == null ? true : opts.inline

  const pluginId = 'Dashboard'
  const uppy = createUppy(opts)
  addTransloaditPlugin(uppy, opts)
  addDashboardPlugin(uppy, opts, {
    id: pluginId,
    inline,
    target,
    closeAfterFinish: false
  })

  if (Array.isArray(opts.providers)) {
    addProviders(uppy, opts.providers, {
      ...opts,
      // Install providers into the Dashboard.
      target: uppy.getPlugin(pluginId)
    })
  }

  return uppy
}

module.exports = dashboard
