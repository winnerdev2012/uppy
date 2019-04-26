# [Uppy](https://uppy.io)

<img src="https://uppy.io/images/logos/uppy-dog-head-arrow.svg" width="120" alt="Uppy logo: a superman puppy in a pink suit" align="right">

<a href="https://www.npmjs.com/package/uppy"><img src="https://img.shields.io/npm/v/uppy.svg?style=flat-square"></a>
<a href="https://travis-ci.org/transloadit/uppy"><img src="https://img.shields.io/travis/transloadit/uppy/master.svg?style=flat-square" alt="Build Status"></a>

Uppy is a sleek, modular JavaScript file uploader that integrates seamlessly with any application. It’s fast, easy to use and lets you worry about more important problems than building a file uploader.

- **Fetch** files from local disk, remote urls, Google Drive, Dropbox, Instagram, or snap and record selfies with a camera;
- **Preview** and edit metadata with a nice interface;
- **Upload** to the final destination, optionally process/encode

<img src="https://github.com/transloadit/uppy/raw/master/assets/uppy-demo-oct-2018.gif">

**[Read the docs](https://uppy.io/docs)** | **[Try Uppy](https://uppy.io/examples/dashboard/)**

<a href="https://transloadit.com" target="_blank"><img width="185" src="https://github.com/transloadit/uppy/raw/master/assets/developed-by-transloadit.png"></a>

Uppy is being developed by the folks at [Transloadit](https://transloadit.com), a versatile file encoding service.

## Example

Code used in the above example:

```js
const Uppy = require('@uppy/core')
const Dashboard = require('@uppy/dashboard')
const GoogleDrive = require('@uppy/google-drive')
const Instagram = require('@uppy/instagram')
const Webcam = require('@uppy/webcam')
const Tus = require('@uppy/tus')

const uppy = Uppy({ autoProceed: false })
  .use(Dashboard, { trigger: '#select-files' })
  .use(GoogleDrive, { target: Dashboard, companionUrl: 'https://companion.uppy.io' })
  .use(Instagram, { target: Dashboard, companionUrl: 'https://companion.uppy.io' })
  .use(Webcam, { target: Dashboard })
  .use(Tus, { endpoint: 'https://master.tus.io/files/' })
  .on('complete', (result) => {
    console.log('Upload result:', result)
  })
```

**[Try it online](https://uppy.io/examples/dashboard/)** or **[read the docs](https://uppy.io/docs)** for more details on how to use Uppy and its plugins.

## Features

- Lightweight, modular plugin-based architecture, easy on dependencies :zap:
- Resumable file uploads via the open [tus](https://tus.io/) standard, so large uploads survive network hiccups
- Supports picking files from: Webcam, Dropbox, Google Drive, Instagram, bypassing the user’s device where possible, syncing between servers directly via [@uppy/companion](https://uppy.io/docs/companion)
- Works great with file encoding and processing backends, such as [Transloadit](https://transloadit.com), works great without (just roll your own Apache/Nginx/Node/FFmpeg/etc backend)
- Sleek user interface :sparkles:
- Optional file recovery (after a browser crash) with [Golden Retriever](https://uppy.io/docs/golden-retriever/)
- Speaks multiple languages (i18n) :earth_africa:
- Built with accessibility in mind
- Free for the world, forever (as in beer 🍺, pizza 🍕, and liberty 🗽)
- Cute as a puppy, also accepts cat pictures :dog:

## Installation

``` bash
$ npm install @uppy/core @uppy/dashboard @uppy/tus
```

We recommend installing from npm and then using a module bundler such as [Webpack](https://webpack.js.org/), [Browserify](http://browserify.org/) or [Rollup.js](http://rollupjs.org/).

Add CSS [uppy.min.css](https://transloadit.edgly.net/releases/uppy/v1.0.0/uppy.min.css), either to `<head>` of your HTML page or include in JS, if your bundler of choice supports it — transforms and plugins are available for Browserify and Webpack.

Alternatively, you can also use a pre-built bundle from Transloadit's CDN: Edgly. In that case `Uppy` will attach itself to the global `window.Uppy` object.

> ⚠️ The bundle currently consists of most Uppy plugins, so this method is not recommended for production, as your users will have to download all plugins when you are likely using just a few.

```html
<!-- 1. Add CSS to `<head>` -->
<link href="https://transloadit.edgly.net/releases/uppy/v1.0.0/uppy.min.css" rel="stylesheet">

<!-- 2. Add JS before the closing `</body>` -->
<script src="https://transloadit.edgly.net/releases/uppy/v1.0.0/uppy.min.js"></script>

<!-- 3. Initialize -->
<div class="UppyDragDrop"></div>
<script>
  var uppy = Uppy.Core()
  uppy.use(Uppy.DragDrop, { target: '.UppyDragDrop' })
  uppy.use(Uppy.Tus, { endpoint: '//master.tus.io/files/' })
</script>
```

## Documentation

- [Uppy](https://uppy.io/docs/uppy/) — full list of options, methods, and events.
- [Plugins](https://uppy.io/docs/plugins/) — list of Uppy plugins and their options.
- [Companion](https://uppy.io/docs/companion/) — setting up and running an Companion instance, which adds support for Instagram, Dropbox, Google Drive and remote urls.
- [React](https://uppy.io/docs/react/) — components to integrate Uppy UI plugins with React apps.
- [Architecture & Writing a Plugin](https://uppy.io/docs/writing-plugins/) — how to write a plugin for Uppy.

## Plugins

[List of plugins and their common options](https://uppy.io/docs/plugins/).

### Local Sources

- [`Dashboard`](https://uppy.io/docs/dashboard/) — universal UI with previews, progress bars, metadata editor and all the cool stuff
- [`Drag & Drop`](https://uppy.io/docs/drag-drop/) — plain and simple drag and drop area
- [`File Input`](https://uppy.io/docs/file-input/) — even plainer “select files” button
- [`Webcam`](https://uppy.io/docs/webcam/) — snap and record those selfies 📷

### Remote Providers

- [`Google Drive`](https://uppy.io/docs/google-drive/), [`Dropbox`](https://uppy.io/docs/dropbox/), [`Instagram`](https://uppy.io/docs/instagram/), [`Import From URL`](https://uppy.io/docs/url/) — support picking files from remote providers or direct URLs from anywhere on the web. Note that [`@uppy/companion`](https://uppy.io/docs/companion) is needed for these.

### Uploaders

- [`Tus`](https://uppy.io/docs/tus/) — resumable uploads via the open [tus](http://tus.io) standard
- [`XHR Upload`](https://uppy.io/docs/xhr-upload/) — regular uploads for any backend out there (like Apache, Nginx)
- [`AWS S3`](https://uppy.io/docs/aws-s3/) and [`AWS S3 Multipart`](https://uppy.io/docs/aws-s3-multipart/) — upload to AWS S3.

### UI Elements

- [`Progress Bar`](https://uppy.io/docs/progress-bar/) — minimal progress bar that fills itself when upload progresses
- [`Status Bar`](https://uppy.io/docs/status-bar/) — more detailed progress, pause/resume/cancel buttons, percentage, speed, uploaded/total sizes (included by default with `Dashboard`)
- [`Informer`](https://uppy.io/docs/informer/) — send notifications like “smile” before taking a selfie or “upload failed” when all is lost (also included by default with `Dashboard`)

### File Processing

- [`Transloadit`](https://uppy.io/docs/transloadit/) — support for [Transloadit](http://transloadit.com)’s robust file uploading and encoding backend

### Miscellaneous

- [`Golden Retriever`](https://uppy.io/docs/golden-retriever/) — restores files after a browser crash, like it’s nothing
- `Thumbnail Generator` — generates image previews (included by default with `Dashboard`)
- [`Form`](https://uppy.io/docs/form/) — collects metadata from `<form>` right before an Uppy upload, then optionally appends results back to the form
- [`Redux`](https://uppy.io/docs/redux/) — for your emerging [time traveling](https://github.com/gaearon/redux-devtools) needs

## Browser Support

<a href="https://saucelabs.com/u/transloadit-uppy">
  <img src="https://saucelabs.com/browser-matrix/transloadit-uppy.svg" alt="Sauce Test Status"/>
</a>

We aim to support IE10+ and recent versions of Safari, Edge, Chrome, Firefox, and Opera.

### Polyfills

Uppy heavily uses Promises. If your target environment [does not support Promises](https://caniuse.com/#feat=promises), use a polyfill like `es6-promise` before initialising Uppy.

When using remote providers like Google Drive or Dropbox, the Fetch API is used. If your target environment does not support the [Fetch API](https://caniuse.com/#feat=fetch), use a polyfill like `whatwg-fetch` before initialising Uppy. The Fetch API polyfill must be loaded _after_ the Promises polyfill, because Fetch uses Promises.

With a module bundler, you can use the required polyfills like so:

```shell
npm install es6-promise whatwg-fetch
```
```js
require('es6-promise/auto')
require('whatwg-fetch')
const Uppy = require('@uppy/core')
```

If you're using Uppy via a script tag, you can load the polyfills from [JSDelivr](https://www.jsdelivr.com/) like so:

```html
<script src="https://cdn.jsdelivr.net/npm/es6-promise@4.2.5/dist/es6-promise.auto.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/whatwg-fetch@3.0.0/dist/fetch.umd.min.js"></script>
<script src="https://transloadit.edgly.net/releases/uppy/v1.0.0/uppy.min.js"></script>
```

## FAQ

### Why not just use `<input type="file">`?

Having no JavaScript beats having a lot of it, so that’s a fair question! Running an uploading & encoding business for ten years though we found that in cases, the file input leaves some to be desired:

- We received complaints about broken uploads and found that resumable uploads are important, especially for big files and to be inclusive towards people on poorer connections (we also launched [tus.io](https://tus.io) to attack that problem). Uppy uploads can survive network outages and browser crashes or accidental navigate-aways.
- Uppy supports editing meta information before uploading (and e.g. cropping is planned).
- There’s the situation where people are using their mobile devices and want to upload on the go, but they have their picture on Instagram, files in Dropbox, or just a plain file url from anywhere on the open web. Uppy allows to pick files from those and push it to the destination without downloading it to your mobile device first.
- Accurate upload progress reporting is an issue on many platforms.
- Some file validation — size, type, number of files — can be done on the client with Uppy.
- Uppy integrates webcam support, in case your users want to upload a picture/video/audio that does not exist yet :)
- A larger drag & drop surface can be pleasant to work with. Some people also like that you can control the styling, language, etc.
- Uppy is aware of encoding backends. Often after an upload, the server needs to rotate, detect faces, optimize for iPad, or what have you. Uppy can track progress of this and report back to the user in different ways.
- Sometimes you might want your uploads to happen while you continue to interact on the same single page.

Not all apps need all of these features. A `<input type="file">` is fine in many situations. But these were a few things that our customers hit / asked about enough to spark us to develop Uppy.

### Why is all this goodness free?

Transloadit’s team is small and we have a shared ambition to make a living from open source. By giving away projects like [tus.io](https://tus.io) and [Uppy](https://uppy.io), we’re hoping to advance the state of the art, make life a tiny little bit better for everyone, and in doing so have rewarding jobs and get some eyes on our commercial service: [a content ingestion & processing platform](https://transloadit.com).

Our thinking is that if just a fraction of our open source userbase can see the appeal of hosted versions straight from the source, that could already be enough to sustain our work. So far this is working out! We’re able to dedicate 80% of our time to open source and haven’t gone bankrupt just yet :D

### Does Uppy support React?

Yep, we have Uppy React components, please see [Uppy React docs](https://uppy.io/docs/react/).

### Does Uppy support S3 uploads?

Yes, there is an S3 plugin, please check out the [docs](https://uppy.io/docs/aws-s3/) for more.

### Do I need to install special service/server for Uppy? Can I use it with Rails/Node/Go/PHP?

Yes, whatever you want on the backend will work with `@uppy/xhr-upload` plugin, since it just does a `POST` or `PUT` request. Here’s a [PHP backend example](https://uppy.io/docs/xhr-upload/#Uploading-to-a-PHP-Server).

If you want resumability with the Tus plugin, use [one of the tus server implementations](https://tus.io/implementations.html) 👌🏼

And you’ll need [`@uppy/companion`](https://uppy.io/docs/companion) if you’d like your users to be able to pick files from Instagram, Google Drive, Dropbox or via direct urls (with more services coming).

## Contributions are welcome

 - Contributor’s guide in [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md)
 - Changelog to track our release progress (we aim to roll out a release every month): [`CHANGELOG.md`](CHANGELOG.md)

## Used by

Uppy is used by: [Photobox](http://photobox.com), [Issuu](https://issuu.com/), [Law Insider](https://lawinsider.com), [Cool Tabs](https://cool-tabs.com), [Soundoff](https://soundoff.io), [Scrumi](https://www.scrumi.io/), [Crive](https://crive.co/) and others.

Use Uppy in your project? [Let us know](https://github.com/transloadit/uppy/issues/769)!

<!--contributors-->
## Contributors


<!--/contributors-->

## Software

We use Browserstack for manual testing
<a href="https://www.browserstack.com" target="_blank">
  <img align="left" width="117" alt="BrowserStack logo" src="https://i.ibb.co/HDRDHmx/Browserstack-logo-2x.png">
</a>

## License

[The MIT License](LICENSE).
