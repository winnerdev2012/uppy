# @uppy/zoom

<img src="https://uppy.io/images/logos/uppy-dog-head-arrow.svg" width="120" alt="Uppy logo: a superman puppy in a pink suit" align="right">

<a href="https://www.npmjs.com/package/@uppy/zoom"><img src="https://img.shields.io/npm/v/@uppy/zoom.svg?style=flat-square"></a>
<a href="https://travis-ci.org/transloadit/uppy"><img src="https://img.shields.io/travis/transloadit/uppy/master.svg?style=flat-square" alt="Build Status"></a>

The Zoom plugin for Uppy lets users import recordings and related files from their Zoom account.

A Companion instance and zoom account with cloud recordings is required for the Zoom plugin to work. Companion handles authentication with Zoom, downloads files from Zoom and uploads them to the destination. This saves the user bandwidth, especially helpful if they are on a mobile connection.

Uppy is being developed by the folks at [Transloadit](https://transloadit.com), a versatile file encoding service.

## Example

```js
const Uppy = require('@uppy/core')
const Zoom = require('@uppy/zoom')

const uppy = Uppy()
uppy.use(Zoom, {
  // Options
})
```

## Installation

```bash
$ npm install @uppy/zoom
```

We recommend installing from npm and then using a module bundler such as [Webpack](https://webpack.js.org/), [Browserify](http://browserify.org/) or [Rollup.js](http://rollupjs.org/).

Alternatively, you can also use this plugin in a pre-built bundle from Transloadit's CDN: Edgly. In that case `Uppy` will attach itself to the global `window.Uppy` object. See the [main Uppy documentation](https://uppy.io/docs/#Installation) for instructions.

## Documentation

Documentation for this plugin can be found on the [Uppy website](https://uppy.io/docs/zoom).

## License

[The MIT License](./LICENSE).
