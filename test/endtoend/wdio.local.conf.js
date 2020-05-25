const base = require('./wdio.base.conf')
const args = require('minimist')(process.argv.slice(2))

// Use "npm run test:endtoend:local -- -b chrome" to test in chrome
// "npm run test:endtoend:local -- -b firefox -b chrome" to test in FF and chrome
const capabilities = []
if (args.b) {
  if (!Array.isArray(args.b)) args.b = [args.b]
  args.b.forEach((browserName) => {
    capabilities.push({ browserName })
  })
}

// default to testing in firefox
if (capabilities.length === 0) {
  capabilities.push({ browserName: 'firefox' })
}

const testingInternetExplorer = capabilities.find((capability) => capability.browserName === 'internet explorer') !== null

exports.config = {
  ...base.config,

  capabilities,

  // If you only want to run your tests until a specific amount of tests have failed use
  // bail (default is 0 - don't bail, run all tests).
  bail: 0,

  // For internet explorer, the IEDriverServer only supports 1 instance at a time.
  maxInstances: testingInternetExplorer ? 1 : 5,

  // Set a base URL in order to shorten url command calls. If your url parameter starts
  // with "/", then the base url gets prepended.
  baseUrl: 'http://localhost',

  // Options to be passed to Mocha.
  // See the full list at http://mochajs.org/
  mochaOpts: {
    ui: 'bdd',
    reporter: 'dot',
    timeout: 120000
  }
}
