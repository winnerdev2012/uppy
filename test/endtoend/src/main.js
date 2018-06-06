const Uppy = require('uppy/lib/core')
const DragDrop = require('uppy/lib/plugins/DragDrop')
const Dashboard = require('uppy/lib/plugins/Dashboard')
const Tus = require('uppy/lib/plugins/Tus')
const XHRUpload = require('uppy/lib/plugins/XHRUpload')
const ProgressBar = require('uppy/lib/plugins/ProgressBar')

// Initialise Uppy with Drag & Drop
const uppyDragDrop = Uppy({
  id: 'uppyDragDrop',
  debug: true
})
  .use(DragDrop, {
    target: '#uppyDragDrop'
  })
  .use(ProgressBar, { target: '#uppyDragDrop-progress' })
  .use(Tus, { endpoint: 'https://master.tus.io/files/' })

const uppyi18n = Uppy({
  id: 'uppyi18n',
  debug: true
})
  .use(DragDrop, {
    target: '#uppyi18n',
    locale: {
      strings: {
        dropHereOr: 'Перенесите файлы сюда или %{browse}',
        browse: 'выберите'
      }
    }
  })
  .use(ProgressBar, { target: '#uppyi18n-progress' })
  .use(XHRUpload, { endpoint: 'https://api2.transloadit.com' })

const uppyDashboard = Uppy({
  id: 'uppyDashboard',
  debug: true
})
  .use(Dashboard, {
    target: '#uppyDashboard',
    inline: true
  })
  .use(Tus, { endpoint: 'https://master.tus.io/files/' })

function startXHRLimitTest (endpoint) {
  const uppy = Uppy({
    id: 'uppyXhrLimit',
    debug: true,
    autoProceed: false
  })
    .use(DragDrop, { target: '#uppyXhrLimit' })
    .use(XHRUpload, { endpoint, limit: 2 })

  uppy.uploadsStarted = 0
  uppy.uploadsComplete = 0

  uppy.on('upload-started', () => {
    uppy.uploadsStarted++
  })
  uppy.on('upload-success', () => {
    uppy.uploadsComplete++
  })
}

window.startXHRLimitTest = startXHRLimitTest

console.log(uppyDragDrop, uppyi18n, uppyDashboard)
