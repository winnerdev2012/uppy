/* global browser, expect  */
const path = require('path')
const { spawn } = require('child_process')
const testURL = 'http://localhost:4567/providers'

describe('File upload with Providers', () => {
  let companion
  function prematureExit () {
    throw new Error('Companion exited early')
  }
  before(() => {
    companion = spawn('node', [
      path.join(__dirname, '../../../packages/@uppy/companion/lib/standalone/start-server')
    ], {
      stdio: 'pipe',
      env: Object.assign({}, process.env, {
        COMPANION_DATADIR: path.join(__dirname, '../../../output'),
        COMPANION_DOMAIN: 'localhost:3020',
        COMPANION_PROTOCOL: 'http',
        COMPANION_PORT: 3020,
        COMPANION_SECRET: process.env.TEST_COMPANION_SECRET,
        COMPANION_DROPBOX_KEY: process.env.TEST_COMPANION_DROPBOX_KEY,
        COMPANION_DROPBOX_SECRET: process.env.TEST_COMPANION_DROPBOX_SECRET,
        COMPANION_GOOGLE_KEY: process.env.TEST_COMPANION_GOOGLE_KEY,
        COMPANION_GOOGLE_SECRET: process.env.TEST_COMPANION_GOOGLE_SECRET
      })
    })
    return new Promise((resolve, reject) => {
      companion.on('error', reject)
      companion.stdout.on('data', (chunk) => {
        if (`${chunk}`.includes('Listening on')) {
          resolve()
        }
      })

      companion.on('error', console.error)
      companion.stderr.pipe(process.stderr)
      companion.on('exit', prematureExit)
    })
  })
  after(() => {
    return new Promise((resolve) => {
      companion.removeListener('exit', prematureExit)
      companion.on('exit', () => resolve())
      companion.kill('SIGINT')
    })
  })

  beforeEach(() => {
    browser.url(testURL)
  })

  afterEach(() => {
    browser.reload()
  })

  // not using arrow functions as cb so to keep mocha in the 'this' context
  it('should upload a file completely with Google Drive', function () {
    if (process.env.UPPY_GOOGLE_EMAIL === undefined) {
      console.log('skipping Google Drive integration test')
      return this.skip()
    }

    startUploadTest(browser, 'GoogleDrive')
    signIntoGoogle(browser)
    finishUploadTest(browser)
  })

  // not using arrow functions as cb so to keep mocha in the 'this' context
  it('should upload a file completely with Instagram', function () {
    if (process.env.UPPY_INSTAGRAM_USERNAME === undefined) {
      console.log('skipping Instagram integration test')
      return this.skip()
    }

    startUploadTest(browser, 'Instagram')
    // do oauth authentication
    browser.waitForExist('input[name=username]')
    browser.setValue('input[name=username]', process.env.UPPY_INSTAGRAM_USERNAME)
    browser.setValue('input[name=password]', process.env.UPPY_INSTAGRAM_PASSWORD)
    browser.click('form button')

    finishUploadTest(browser)
  })

  // not using arrow functions as cb so to keep mocha in the 'this' context
  it('should upload a file completely with Dropbox', function () {
    if (process.env.UPPY_GOOGLE_EMAIL === undefined) {
      console.log('skipping Dropbox integration test')
      return this.skip()
    }

    startUploadTest(browser, 'Dropbox')
    // do oauth authentication
    browser.waitForVisible('button.auth-google')
    browser.click('button.auth-google')
    // we login with google to avoid captcha
    signIntoGoogle(browser)
    // finish oauth
    browser.waitForVisible('button[name=allow_access]')
    browser.click('button[name=allow_access]')

    finishUploadTest(browser)
  })
})

const startUploadTest = (browser, providerName) => {
  browser.click(`.uppy-DashboardTab-btn[aria-controls=uppy-DashboardContent-panel--${providerName}]`)
  browser.waitForVisible('.uppy-Provider-authBtn', 3000)
  browser.click('.uppy-Provider-authBtn')
  // move control to instagram auth tab
  browser.switchTab(browser.getTabIds()[1])
}

const finishUploadTest = (browser) => {
  // switch back to uppy tab
  browser.switchTab(browser.getTabIds()[0])
  browser.waitForVisible('.uppy-ProviderBrowser-list li.uppy-ProviderBrowserItem')
  browser.click('.uppy-ProviderBrowser-list li.uppy-ProviderBrowserItem:last-child button')

  browser.waitForVisible('.uppy-ProviderBrowser-footer .uppy-u-reset.uppy-c-btn.uppy-c-btn-primary')
  browser.click('.uppy-ProviderBrowser-footer .uppy-u-reset.uppy-c-btn.uppy-c-btn-primary')
  browser.waitForVisible('.uppy-StatusBar-content[title="Complete"]', 20000)
}

const signIntoGoogle = (browser) => {
  browser.waitForExist('#identifierId')
  browser.setValue('#identifierId', process.env.UPPY_GOOGLE_EMAIL)
  browser.click('#identifierNext')
  browser.waitForVisible('input[name=password]')
  browser.setValue('input[name=password]', process.env.UPPY_GOOGLE_PASSWORD)
  browser.click('#passwordNext')
  // if suspicious login was detected, the window will remain unclosed
  // so we have to confirm the recovery email or phone no
  if (browser.getTabIds().length > 1) {
    // confirm recovery email option
    if (browser.isExisting('li div[data-challengetype="12"]')) {
      browser.click('li div[data-challengetype="12"]')
      browser.waitForVisible('input[name=knowledgePreregisteredEmailResponse]')
      browser.setValue('input[name=knowledgePreregisteredEmailResponse]', process.env.UPPY_GOOGLE_RECOVERY_EMAIL)
      // confirm recovery phone number
    } else if (browser.isExisting('#countryList')) {
      browser.click('div#countryList')
      browser.click('div[data-value=nl]')
      browser.setValue('input#phoneNumberId', process.env.UPPY_GOOGLE_PHONE_NO)
    }
    browser.click('#next[role=button]')
  }
}
