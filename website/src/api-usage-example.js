import Uppy from 'uppy/lib/core'
import Dashboard from 'uppy/lib/plugins/Dashboard'
import Tus from 'uppy/lib/plugins/Tus'

Uppy({ autoProceed: false })
  .use(Dashboard, { trigger: '#select-files' })
  .use(Tus, { endpoint: 'https://master.tus.io/files/' })
  .on('complete', (result) => {
    console.log('Upload result:', result)
  })
