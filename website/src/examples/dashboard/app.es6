import Uppy from '../../../../src/core'
import Dashboard from '../../../../src/plugins/Dashboard'
import GoogleDrive from '../../../../src/plugins/GoogleDrive'
import Webcam from '../../../../src/plugins/Webcam'
import Tus10 from '../../../../src/plugins/Tus10'
import MetaData from '../../../../src/plugins/MetaData'
import Informer from '../../../../src/plugins/Informer'

import { UPPY_SERVER } from '../env'

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

  if (opts.GoogleDrive) {
    uppy.use(GoogleDrive, {target: Dashboard, host: UPPY_SERVER})
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
