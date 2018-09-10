/* global window, capabilities */
const path = require('path')
const { spawn } = require('child_process')

function selectFakeFile (uppyID) {
  var blob = new Blob(
    ['data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+CiAgPGNpcmNsZSBjeD0iNjAiIGN5PSI2MCIgcj0iNTAiLz4KPC9zdmc+Cg=='],
    { type: 'image/svg+xml' }
  )
  window[uppyID].addFile({
    source: 'test',
    name: 'test-file',
    type: blob.type,
    data: blob
  })
}

function supportsChooseFile () {
  // Webdriver for Safari and Edge doesn’t support .chooseFile
  return capabilities.browserName !== 'safari' &&
         capabilities.browserName !== 'MicrosoftEdge' &&
         capabilities.platformName !== 'Android'
}

function prematureExit () {
  throw new Error('Companion exited early')
}

class CompanionService {
  onPrepare () {
    this.companion = spawn('node', [
      path.join(__dirname, '../../packages/@uppy/companion/lib/standalone/start-server')
    ], {
      stdio: 'pipe',
      env: Object.assign({}, process.env, {
        COMPANION_DATADIR: path.join(__dirname, '../../output'),
        COMPANION_DOMAIN: 'localhost:3020',
        COMPANION_PROTOCOL: 'http',
        COMPANION_PORT: 3020,
        COMPANION_SECRET: 'test'
      })
    })
    return new Promise((resolve, reject) => {
      this.companion.on('error', reject)
      this.companion.stdout.on('data', (chunk) => {
        if (`${chunk}`.includes('Listening on')) {
          resolve()
        }
      })

      this.companion.on('error', console.error)
      this.companion.stderr.pipe(process.stderr)
      this.companion.on('exit', prematureExit)
    })
  }

  onComplete () {
    return new Promise((resolve) => {
      this.companion.removeListener('exit', prematureExit)
      this.companion.on('exit', () => resolve())
      this.companion.kill('SIGINT')
    })
  }
}

module.exports = {
  selectFakeFile,
  supportsChooseFile,
  CompanionService
}
