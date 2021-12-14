// The @uppy/ dependencies are resolved from source
/* eslint-disable import/no-extraneous-dependencies */
import Uppy from '@uppy/core'
import Dashboard from '@uppy/dashboard'
import Instagram from '@uppy/instagram'
import Facebook from '@uppy/facebook'
import OneDrive from '@uppy/onedrive'
import Dropbox from '@uppy/dropbox'
import Box from '@uppy/box'
import GoogleDrive from '@uppy/google-drive'
import Unsplash from '@uppy/unsplash'
import Zoom from '@uppy/zoom'
import Url from '@uppy/url'
import Webcam from '@uppy/webcam'
import ScreenCapture from '@uppy/screen-capture'
import GoldenRetriever from '@uppy/golden-retriever'
import Tus from '@uppy/tus'
import AwsS3 from '@uppy/aws-s3'
import AwsS3Multipart from '@uppy/aws-s3-multipart'
import XHRUpload from '@uppy/xhr-upload'
import Transloadit from '@uppy/transloadit'
import Form from '@uppy/form'
import ImageEditor from '@uppy/image-editor'
import DropTarget from '@uppy/drop-target'
import Audio from '@uppy/audio'
/* eslint-enable import/no-extraneous-dependencies */

// DEV CONFIG: pick an uploader

const UPLOADER = 'tus'
// const UPLOADER = 's3'
// const UPLOADER = 's3-multipart'
// xhr will use protocol 'multipart' in companion, if used with a remote service, e.g. google drive.
// If local upload will use browser XHR
// const UPLOADER = 'xhr'
// const UPLOADER = 'transloadit'
// const UPLOADER = 'transloadit-s3'
// const UPLOADER = 'transloadit-xhr'

// DEV CONFIG: Endpoint URLs

const COMPANION_URL = 'http://localhost:3020'
const TUS_ENDPOINT = 'https://tusd.tusdemo.net/files/'
const XHR_ENDPOINT = 'https://xhr-server.herokuapp.com/upload'

// DEV CONFIG: Transloadit keys

const TRANSLOADIT_KEY = '...'
const TRANSLOADIT_TEMPLATE = '...'
const TRANSLOADIT_SERVICE_URL = 'https://api2.transloadit.com'

// DEV CONFIG: enable or disable Golden Retriever

const RESTORE = false

// Rest is implementation! Obviously edit as necessary...

export default () => {
  const uppyDashboard = new Uppy({
    logger: Uppy.debugLogger,
    meta: {
      username: 'John',
      license: 'Creative Commons',
    },
    allowMultipleUploadBatches: false,
    // restrictions: { requiredMetaFields: ['caption'] },
  })
    .use(Dashboard, {
      trigger: '#pick-files',
      // inline: true,
      target: '.foo',
      metaFields: [
        { id: 'license', name: 'License', placeholder: 'specify license' },
        { id: 'caption', name: 'Caption', placeholder: 'add caption' },
      ],
      showProgressDetails: true,
      proudlyDisplayPoweredByUppy: true,
      note: '2 files, images and video only',
    })
    .use(GoogleDrive, { target: Dashboard, companionUrl: COMPANION_URL })
    .use(Instagram, { target: Dashboard, companionUrl: COMPANION_URL })
    .use(Dropbox, { target: Dashboard, companionUrl: COMPANION_URL })
    .use(Box, { target: Dashboard, companionUrl: COMPANION_URL })
    .use(Facebook, { target: Dashboard, companionUrl: COMPANION_URL })
    .use(OneDrive, { target: Dashboard, companionUrl: COMPANION_URL })
    .use(Zoom, { target: Dashboard, companionUrl: COMPANION_URL })
    .use(Url, { target: Dashboard, companionUrl: COMPANION_URL })
    .use(Unsplash, { target: Dashboard, companionUrl: COMPANION_URL })
    .use(Webcam, {
      target: Dashboard,
      showVideoSourceDropdown: true,
      showRecordingLength: true,
    })
    .use(Audio, {
      target: Dashboard,
      showRecordingLength: true,
    })
    .use(ScreenCapture, { target: Dashboard })
    .use(Form, { target: '#upload-form' })
    .use(ImageEditor, { target: Dashboard })
    .use(DropTarget, {
      target: document.body,
    })

  switch (UPLOADER) {
    case 'tus':
      uppyDashboard.use(Tus, { endpoint: TUS_ENDPOINT, limit: 6 })
      break
    case 's3':
      uppyDashboard.use(AwsS3, { companionUrl: COMPANION_URL, limit: 6 })
      break
    case 's3-multipart':
      uppyDashboard.use(AwsS3Multipart, { companionUrl: COMPANION_URL, limit: 6 })
      break
    case 'xhr':
      uppyDashboard.use(XHRUpload, { endpoint: XHR_ENDPOINT, limit: 6, bundle: true })
      break
    case 'transloadit':
      uppyDashboard.use(Transloadit, {
        service: TRANSLOADIT_SERVICE_URL,
        waitForEncoding: true,
        params: {
          auth: { key: TRANSLOADIT_KEY },
          template_id: TRANSLOADIT_TEMPLATE,
        },
      })
      break
    case 'transloadit-s3':
      uppyDashboard.use(AwsS3, { companionUrl: COMPANION_URL })
      uppyDashboard.use(Transloadit, {
        waitForEncoding: true,
        importFromUploadURLs: true,
        params: {
          auth: { key: TRANSLOADIT_KEY },
          template_id: TRANSLOADIT_TEMPLATE,
        },
      })
      break
    case 'transloadit-xhr':
      uppyDashboard.setMeta({
        params: JSON.stringify({
          auth: { key: TRANSLOADIT_KEY },
          template_id: TRANSLOADIT_TEMPLATE,
        }),
      })
      uppyDashboard.use(XHRUpload, {
        method: 'POST',
        endpoint: 'https://api2.transloadit.com/assemblies',
        metaFields: ['params'],
        bundle: true,
      })
      break
    default:
  }

  if (RESTORE) {
    uppyDashboard.use(GoldenRetriever, { serviceWorker: true })
  }

  window.uppy = uppyDashboard

  uppyDashboard.on('complete', (result) => {
    if (result.failed.length === 0) {
      console.log('Upload successful 😀')
    } else {
      console.warn('Upload failed 😞')
    }
    console.log('successful files:', result.successful)
    console.log('failed files:', result.failed)
    if (UPLOADER === 'transloadit') {
      console.log('Transloadit result:', result.transloadit)
    }
  })

  const modalTrigger = document.querySelector('#pick-files')
  if (modalTrigger) modalTrigger.click()
}
