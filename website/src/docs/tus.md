---
type: docs
order: 30
title: "Tus"
permalink: docs/tus/
---

The Tus plugin brings [tus.io](http://tus.io) resumable file uploading to Uppy by wrapping the [tus-js-client][].

```js
const Tus = require('@uppy/tus')

uppy.use(Tus, {
  endpoint: 'https://master.tus.io/files/', // use your tus endpoint here
  resume: true,
  autoRetry: true,
  retryDelays: [0, 1000, 3000, 5000]
})
```

## Installation

This plugin is published as the `@uppy/tus` package.

```shell
npm install @uppy/tus
```

## Options

The Tus plugin supports all of [tus-js-client][]’s options. Additionally:

### `id: 'Tus'`

A unique identifier for this plugin. Defaults to `'Tus'`.

### `resume: true`

A boolean indicating whether tus should attempt to resume the upload if the upload has been started in the past. This includes storing the file’s upload url. Use false to force an entire reupload.

Note that this option is about resuming when you start an upload again with the same file, or when using [GoldenRetriever](/docs/golden-retriever/), which will attempt to restore upload state to what it was before page refresh / browser crash. Even if you set `resume: false` when using Tus uploader, users will still be able to pause/resume an ongoing upload.

In most cases you should leave this option as is, relax, and enjoy resumable uploads.

### `endpoint: ''`

URL to upload to, where your tus.io server is running.

### `autoRetry: true`

Whether to auto-retry the upload when the user's internet connection is back online after an outage.

### `limit: 0`

Limit the amount of uploads going on at the same time. Passing `0` means no limit.

[tus-js-client]: https://github.com/tus/tus-js-client
