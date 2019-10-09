---
type: docs
order: 12
title: "Google Drive"
menu_prefix: "<span title='Requires Companion'>ⓒ </span>"
module: "@uppy/google-drive"
permalink: docs/google-drive/
category: "Sources"
tagline: "import files from Google Drive"
---

The `@uppy/google-drive` plugin lets users import files from their Google Drive account.

A Companion instance is required for the `@uppy/google-drive` plugin to work. Companion handles authentication with Google, downloads files from the Drive and uploads them to the destination. This saves the user bandwidth, especially helpful if they are on a mobile connection.

```js
const GoogleDrive = require('@uppy/google-drive')

uppy.use(GoogleDrive, {
  // Options
})
```

<a class="TryButton" href="/examples/dashboard/">Try it live</a>

## Installation

This plugin is published as the `@uppy/google-drive` package.

Install from NPM:

```shell
npm install @uppy/google-drive
```

In the [CDN package](/docs/#With-a-script-tag), it is available on the `Uppy` global object:

```js
const GoogleDrive = Uppy.GoogleDrive
```

## CSS

Dashboard plugin is recommended as a container to all Provider plugins, including Google Drive. If you are using Dashboard, it [comes with all the nessesary styles](/docs/dashboard/#CSS) for Dropbox as well.

⚠️ If you are feeling adventurous, and want to use Google Drive plugin separately, without Dashboard, make sure to include `@uppy/provider-views/dist/style.css` (or `style.min.css`) CSS file. This is experimental, not officialy supported and not recommended.

## Options

The `@uppy/google-drive` plugin has the following configurable options:

```js
uppy.use(GoogleDrive, {
  target: Dashboard,
  companionUrl: 'https://companion.uppy.io/',
})
```

### `id: 'GoogleDrive'`

A unique identifier for this plugin. It defaults to `'GoogleDrive'`.

### `title: 'Google Drive'`

Configures the title / name shown in the UI, for instance, on Dashboard tabs. It defaults to `'Google Drive'`.

### `target: null`

DOM element, CSS selector, or plugin to mount the Google Drive provider into. This should normally be the the [`@uppy/dashboard`](/docs/dashboard) plugin.

### `companionUrl: null`

URL to a [Companion](/docs/companion) instance.

### `companionHeaders: {}`

Custom headers that should be sent along to [Companion](/docs/companion) on every request.

### `companionAllowedHosts: companionUrl`

The valid and authorised URL(s) from which OAuth responses should be accepted.

This value can be a `String`, a `Regex` pattern, or an `Array` of both.

This is useful when you have your [Companion](/docs/companion) running on multiple hosts. Otherwise, the default value should be good enough.

### `locale: {}`

Localize text that is shown to the user.

The default English strings are:

```js
strings: {
  // TODO
}
```
