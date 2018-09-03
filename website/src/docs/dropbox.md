---
type: docs
order: 31
title: "Dropbox"
module: "@uppy/dropbox"
permalink: docs/dropbox/
---

The `@uppy/dropbox` plugin lets users import files from their Dropbox account.

A Companion instance is required for the Dropbox plugin to work. Companion handles authentication with Dropbox, downloads the files, and uploads them to the destination. This saves the user bandwidth, especially helpful if they are on a mobile connection.

```js
const Dropbox = require('@uppy/dropbox')

uppy.use(Dropbox, {
  // Options
})
```

[Try live!](/examples/dashboard/)

## Installation

This plugin is published as the `@uppy/dropbox` package.

Install from NPM:

```shell
npm install @uppy/dropbox
```

In the [CDN package](/docs/#With-a-script-tag), it is available on the `Uppy` global object:

```js
const Dropbox = Uppy.Dropbox
```

## Options

The `@uppy/dropbox` plugin has the following configurable options:

```js
uppy.use(Dropbox, {
  target: Dashboard,
  serverUrl: 'https://companion.uppy.io/',
})
```

### `id: 'Dropbox'`

A unique identifier for this plugin. It defaults to `'Dropbox'`.

### `title: 'Dropbox'`

Title / name shown in the UI, such as Dashboard tabs. It defaults to `'Dropbox'`.

### `target: null`

DOM element, CSS selector, or plugin to mount the Dropbox provider into. This should normally be the Dashboard.

### `serverUrl: null`

URL to a [Companion](/docs/companion) instance.

### `serverHeaders: {}`

Custom headers that should be sent along to [Companion](/docs/companion) on every request.

### `serverPattern: serverUrl`

The valid and authorised URL(s) from which OAuth responses should be accepted.

This value can be a `String`, a `Regex` pattern, or an `Array` of both.

This is useful when you have your [Companion](/docs/companion) running on multiple hosts. Otherwise, the default value should do just fine.

### `locale: {}`

Localize text that is shown to the user.

The default English strings are:

```js
strings: {
  // TODO
}
```
