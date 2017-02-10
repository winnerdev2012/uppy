// import Uppy from '../src/core'
// import Dummy from '../src/plugins/Dummy.js'
const Dashboard = require('../src/plugins/Dashboard')
const GoogleDrive = require('../src/plugins/GoogleDrive')
const Dropbox = require('../src/plugins/Dropbox')
const Webcam = require('../src/plugins/Webcam')
const Tus10 = require('../src/plugins/Tus10')
const MetaData = require('../src/plugins/MetaData')
const Informer = require('../src/plugins/Informer')
// import Dummy from '../src/plugins/Dummy'
// import ProgressBar from '../src/plugins/ProgressBar'
// import DragDrop from '../src/plugins/DragDrop'
// import FileInput from '../src/plugins/FileInput'

const Uppy = require('../src/core/Core.js')
// const Dashboard = require('../src/plugins/Dashboard')

const PROTOCOL = location.protocol === 'https:' ? 'https' : 'http'
const TUS_ENDPOINT = PROTOCOL + '://master.tus.io/files/'

// import ru_RU from '../src/locales/ru_RU.js'
// import MagicLog from '../src/plugins/MagicLog'
// import PersistentState from '../src/plugins/PersistentState'

const uppy = Uppy({debug: true, autoProceed: false})
  .use(Dashboard, {
    trigger: '#uppyModalOpener',
    // maxWidth: 350,
    // maxHeight: 400,
    // inline: false,
    target: 'body',
    locale: {
      strings: {browse: 'wow'}
    }
  })
  .use(GoogleDrive, {target: Dashboard, host: 'http://localhost:3020'})
  .use(Dropbox, {target: Dashboard, host: 'http://localhost:3020'})
  // .use(FileInput, {target: '.Uppy', locale: {
  //   strings: {selectToUpload: 'хуй'}
  // }})
  // .use(DragDrop, {target: 'body', locale: {
  //   strings: {chooseFile: 'hmm'}
  // }})
  // .use(ProgressBar, {target: 'body'})
  // .use(dummy)
  .use(Webcam, {target: Dashboard})
  // .use(Multipart, {endpoint: '//api2.transloadit.com'})
  .use(Tus10, {endpoint: TUS_ENDPOINT, resume: true})
  // .use(Multipart)
  .use(Informer, {target: Dashboard})
  .use(MetaData, {
    fields: [
      { id: 'resizeTo', name: 'Resize to', value: 1200, placeholder: 'specify future image size' },
      { id: 'description', name: 'Description', value: 'none', placeholder: 'describe what the file is for' }
    ]
  })
uppy.run()

uppy.on('core:success', (fileCount) => {
  console.log(fileCount)
})

// uppy.emit('informer', 'Smile!', 'info', 2000)

var modalTrigger = document.querySelector('#uppyModalOpener')
if (modalTrigger) modalTrigger.click()
