const Uppy = require('@uppy/core')
const Dashboard = require('@uppy/dashboard')
const XHRUpload = require('@uppy/xhr-upload')

const uppy = Uppy({
  debug: true
})

uppy.use(Dashboard, {
  target: '#app',
  inline: true,
  hideRetryButton: true,
  hideCancelButton: true
})

uppy.use(XHRUpload, {
  bundle: true,
  endpoint: 'http://localhost:9967/upload',
  fieldName: 'files'
})
