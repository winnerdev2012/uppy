const Uppy = require('uppy/lib/core')
const Dashboard = require('uppy/lib/plugins/Dashboard')
const StatusBar = require('uppy/lib/plugins/StatusBar')
const GoogleDrive = require('uppy/lib/plugins/GoogleDrive')
const Dropbox = require('uppy/lib/plugins/Dropbox')
const Webcam = require('uppy/lib/plugins/Webcam')
const Tus10 = require('uppy/lib/plugins/Tus10')
const MetaData = require('uppy/lib/plugins/MetaData')
const Informer = require('uppy/lib/plugins/Informer')

const UPPY_SERVER = require('../env')

const PROTOCOL = location.protocol === 'https:' ? 'https' : 'http'
const TUS_ENDPOINT = PROTOCOL + '://master.tus.io/files/'

function uppyInit () {
  const opts = window.uppyOptions
  const dashboardEl = document.querySelector('.UppyDashboard')
  if (dashboardEl) {
    const dashboardElParent = dashboardEl.parentNode
    dashboardElParent.removeChild(dashboardEl)
  }

  const uppy = Uppy({debug: true, autoProceed: opts.autoProceed})
  uppy.use(Dashboard, {
    trigger: '.UppyModalOpenerBtn',
    inline: opts.DashboardInline,
    target: opts.DashboardInline ? '.DashboardContainer' : 'body'
  })
  uppy.use(StatusBar, {target: Dashboard})

  if (opts.GoogleDrive) {
    uppy.use(GoogleDrive, {target: Dashboard, host: UPPY_SERVER})
  }

  if (opts.Dropbox) {
    uppy.use(Dropbox, {target: Dashboard, host: UPPY_SERVER})
  }

  if (opts.Webcam) {
    uppy.use(Webcam, {target: Dashboard})
  }

  uppy.use(Tus10, {endpoint: TUS_ENDPOINT, resume: true})
  uppy.use(Informer, {target: Dashboard})
  uppy.use(MetaData, {
    fields: [
      { id: 'resizeTo', name: 'Resize to', value: 1200, placeholder: 'specify future image size' },
      { id: 'description', name: 'Description', value: 'none', placeholder: 'describe what the file is for' }
    ]
  })
  uppy.run()

  uppy.on('core:success', (fileCount) => {
    console.log('Yo, uploaded: ' + fileCount)
  })
}

uppyInit()
window.uppyInit = uppyInit
