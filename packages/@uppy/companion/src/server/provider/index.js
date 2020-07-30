/**
 * @module provider
 */
// @ts-ignore
const config = require('@purest/providers')
const dropbox = require('./dropbox')
const drive = require('./drive')
const instagram = require('./instagram')
const instagramGraph = require('./instagram/graph')
const facebook = require('./facebook')
const onedrive = require('./onedrive')
const zoom = require('./zoom')
const { getURLBuilder } = require('../helpers/utils')
const logger = require('../logger')
// eslint-disable-next-line
const Provider = require('./Provider')

// leave here for now until Purest Providers gets updated with Zoom provider
config.zoom = {
  'https://zoom.us/': {
    __domain: {
      auth: {
        auth: { bearer: '[0]' }
      }
    },
    '[version]/{endpoint}': {
      __path: {
        alias: '__default',
        version: 'v2'
      }
    },
    'oauth/revoke': {
      __path: {
        alias: 'logout',
        auth: {
          auth: { basic: '[0]' }
        }
      }
    }
  }
}

/**
 * adds the desired provider module to the request object,
 * based on the providerName parameter specified
 *
 * @param {Object.<string, typeof Provider>} providers
 */
module.exports.getProviderMiddleware = (providers) => {
  /**
   *
   * @param {object} req
   * @param {object} res
   * @param {function} next
   * @param {string} providerName
   */
  const middleware = (req, res, next, providerName) => {
    if (providers[providerName] && validOptions(req.companion.options)) {
      req.companion.provider = new providers[providerName]({ providerName, config })
    } else {
      logger.warn('invalid provider options detected. Provider will not be loaded', 'provider.middleware.invalid', req.id)
    }
    next()
  }

  return middleware
}

/**
 * @param {{server: object, providerOptions: object}} companionOptions
 * @return {Object.<string, typeof Provider>}
 */
module.exports.getDefaultProviders = (companionOptions) => {
  const { providerOptions } = companionOptions || { providerOptions: null }
  // @todo: we should rename drive to googledrive or google-drive or google
  const providers = { dropbox, drive, facebook, onedrive, zoom }
  // Instagram's Graph API key is just numbers, while the old API key is hex
  const usesGraphAPI = () => /^\d+$/.test(providerOptions.instagram.key)
  if (providerOptions && providerOptions.instagram && usesGraphAPI()) {
    providers.instagram = instagramGraph
  } else {
    providers.instagram = instagram
  }

  return providers
}

/**
 *
 * @typedef {{module: typeof Provider, config: object}} CustomProvider
 *
 * @param {Object.<string, CustomProvider>} customProviders
 * @param {Object.<string, typeof Provider>} providers
 * @param {object} grantConfig
 */
module.exports.addCustomProviders = (customProviders, providers, grantConfig) => {
  Object.keys(customProviders).forEach((providerName) => {
    providers[providerName] = customProviders[providerName].module
    const providerConfig = Object.assign({}, customProviders[providerName].config)
    // todo: consider setting these options from a universal point also used
    // by official providers. It'll prevent these from getting left out if the
    // requirement changes.
    providerConfig.callback = `/${providerName}/callback`
    providerConfig.transport = 'session'
    grantConfig[providerName] = providerConfig
  })
}

/**
 *
 * @param {{server: object, providerOptions: object}} companionOptions
 * @param {object} grantConfig
 */
module.exports.addProviderOptions = (companionOptions, grantConfig) => {
  const { server, providerOptions } = companionOptions
  if (!validOptions({ server })) {
    logger.warn('invalid provider options detected. Providers will not be loaded', 'provider.options.invalid')
    return
  }

  grantConfig.defaults = {
    host: server.host,
    protocol: server.protocol,
    path: server.path
  }

  const { oauthDomain } = server
  const keys = Object.keys(providerOptions).filter((key) => key !== 'server')
  keys.forEach((providerName) => {
    const authProvider = providerNameToAuthName(providerName, companionOptions)
    if (authProvider && grantConfig[authProvider]) {
      // explicitly add providerOptions so users don't override other providerOptions.
      grantConfig[authProvider].key = providerOptions[providerName].key
      grantConfig[authProvider].secret = providerOptions[providerName].secret
      const provider = exports.getDefaultProviders(companionOptions)[providerName]
      Object.assign(grantConfig[authProvider], provider.getExtraConfig())

      // override grant.js redirect uri with companion's custom redirect url
      const isExternal = !!server.implicitPath
      const redirectPath = `/${providerName}/redirect`
      grantConfig[authProvider].redirect_uri = getURLBuilder(companionOptions)(redirectPath, isExternal)
      if (oauthDomain) {
        const fullRedirectPath = getURLBuilder(companionOptions)(redirectPath, isExternal, true)
        grantConfig[authProvider].redirect_uri = `${server.protocol}://${oauthDomain}${fullRedirectPath}`
      }

      if (server.implicitPath) {
        // no url builder is used for this because grant internally adds the path
        grantConfig[authProvider].callback = `${server.implicitPath}${grantConfig[authProvider].callback}`
      } else if (server.path) {
        grantConfig[authProvider].callback = `${server.path}${grantConfig[authProvider].callback}`
      }
    } else if (authProvider !== 's3') {
      logger.warn(`skipping one found unsupported provider "${authProvider}".`, 'provider.options.skip')
    }
  })
}

/**
 *
 * @param {string} name of the provider
 * @param {{server: object, providerOptions: object}} options
 * @return {string} the authProvider for this provider
 */
const providerNameToAuthName = (name, options) => {
  const providers = exports.getDefaultProviders(options)
  return (providers[name] || {}).authProvider
}

/**
 *
 * @param {{server: object}} options
 */
const validOptions = (options) => {
  return options.server.host && options.server.protocol
}
