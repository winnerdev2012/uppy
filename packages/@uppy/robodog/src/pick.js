const createUppy = require('./createUppy')
const addDashboardPlugin = require('./addDashboardPlugin')
const addTransloaditPlugin = require('./addTransloaditPlugin')
const addProviders = require('./addProviders')

const CANCEL = {}

function pick (opts = {}) {
  const target = opts.target || document.body

  const pluginId = 'pick'
  const uppy = createUppy(opts, {
    allowMultipleUploads: false
  })
  addTransloaditPlugin(uppy, opts)
  addDashboardPlugin(uppy, opts, {
    id: pluginId,
    target,
    closeAfterFinish: true
  })

  if (Array.isArray(opts.providers)) {
    addProviders(uppy, opts.providers, {
      ...opts,
      // Install providers into the Dashboard.
      target: uppy.getPlugin(pluginId)
    })
  }

  return new Promise((resolve, reject) => {
    uppy.on('complete', (result) => {
      if (result.failed.length === 0) {
        resolve(result)
      }
    })
    uppy.on('error', reject)
    uppy.on('cancel-all', () => reject(CANCEL))
    uppy.getPlugin(pluginId)
      .openModal()
  }).then((result) => {
    return result
  }, (err) => {
    if (err === CANCEL) {
      uppy.getPlugin(pluginId)
        .requestCloseModal()
      return null
    }
    throw err
  })
}

module.exports = pick
