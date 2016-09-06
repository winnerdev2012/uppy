import Core from './core/index.js'

// Parent
import Plugin from './plugins/Plugin'

const locales = {}

// Orchestrators
import Dashboard from './plugins/Dashboard/index.js'

// Acquirers
import Dummy from './plugins/Dummy'
import DragDrop from './plugins/DragDrop/index.js'
import Formtag from './plugins/Formtag'
import GoogleDrive from './plugins/GoogleDrive/index.js'
import Webcam from './plugins/Webcam/index.js'

// Progressindicators
import ProgressBar from './plugins/ProgressBar.js'
import Informer from './plugins/Informer.js'

// Modifiers
import MetaData from './plugins/MetaData.js'

// Uploaders
import Tus10 from './plugins/Tus10'
import Multipart from './plugins/Multipart'

export default {
  Core,
  Plugin,
  locales,
  Dummy,
  ProgressBar,
  Informer,
  DragDrop,
  GoogleDrive,
  Formtag,
  Tus10,
  Multipart,
  Dashboard,
  MetaData,
  Webcam
}

export {
  Core,
  Plugin,
  locales,
  Dummy,
  ProgressBar,
  Informer,
  DragDrop,
  GoogleDrive,
  Formtag,
  Tus10,
  Multipart,
  Dashboard,
  MetaData,
  Webcam
}

// import Core from './core/index.js'
// import plugins from './plugins/index.js'
//
// const locales = {}
//
// export {
//   Core,
//   plugins,
//   locales
// }
