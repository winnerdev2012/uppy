---
type: docs
title: "Robodog: File Picker API"
menu: "Robodog File Picker"
permalink: docs/robodog/picker/
order: 1
category: "File Processing"
---

Show a modal UI that allows users to pick files from their device and from the web. It uploads files to Transloadit for processing.

```js
const resultPromise = Robodog.pick({
  params: {
    auth: { key: '' },
    template_id: ''
  }
})
```

`resultPromise` is a [Promise][promise] that resolves with an object:

 - `successful` - An array containing data about files that were uploaded successfully
 - `failed` - An array containing data about files that failed to upload
 - `transloadit` - An array of Assembly statuses
 - `results` - An array of results produced by the assembly, if `waitForEncoding` was used

## `options.target`

DOM element or CSS selector to place the modal element in. `document.body` is usually fine in this case because the modal is absolutely positioned on top of everything anyway.

## Transloadit

All the options to the [Transloadit][transloadit] plugin are supported.

The Promise resolution value has a `transloadit` and `results` key.

`result.transloadit` contains an array of Assembly statuses. Assembly statuses are objects as described in the [Transloadit documentation][assembly-status]. There may be multiple Assembly statuses if the `getAssemblyOptions` option was used, because different files may be processed by different Assemblies.

`result.results` contains an array of results produced by the Assemblies. Each result has an `assemblyId` property containing the string ID of the Assembly that produced it, and a `stepName` property containing the string name of the Assembly step that produced it.

## Restrictions

Set rules and conditions to limit the type and/or number of files that can be selected. Restrictions are configured by the `restrictions` option.

### `restrictions.maxFileSize`

Maximum file size in bytes for each individual file.

### `restrictions.minFileSize`

Minimum file size in bytes for each individual file.

### `restrictions.maxTotalFileSize`

Maximum file size in bytes for all the files together.

### `restrictions.maxNumberOfFiles`

The total number of files that can be selected. If this is equal to 1, users can only select a single file in system dialogs; else they can select multiple.

### `restrictions.minNumberOfFiles`

The minimum number of files that must be selected before the upload.

### `restrictions.allowedFileTypes`

Array of mime type wildcards `image/*`, exact mime types `image/jpeg`, or file extensions `.jpg`: `['image/*', '.jpg', '.jpeg', '.png', '.gif']`.

If provided, the [`<input accept>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#Limiting_accepted_file_types) attribute will be used for the internal file input field, so only acceptable files can be selected in the system file dialog.

## Providers

Providers import files from third party services using [Uppy Companion][companion] or from local sources like the device camera.

By default, the Picker will use Transloadit's [Uppy Companion][companion] servers for imports from third party service. You can self-host your own instances as well.

### `providers: []`

Array of providers to use. Each entry is the name of a provider. The available ones are:

- `'dropbox'` – Import files from Dropbox using [Uppy Companion][companion].
- `'google-drive'` – Import files from Google Drive using [Uppy Companion][companion].
- `'instagram'` – Import files from Instagram using [Uppy Companion][companion].
- `'url'` – Import files from public Web URLs using [Uppy Companion][companion].
- `'webcam'` – Take photos and record videos using thee user's device camera.

### `companionUrl: Transloadit.COMPANION`

The URL to a [Uppy Companion][companion] server to use.

### `companionAllowedHosts: Transloadit.COMPANION_PATTERN`

The valid and authorised URL(s) from which OAuth responses should be accepted.

This value can be a `String`, a `Regex` pattern, or an `Array` of both.

This is useful when you have your [Uppy Companion][companion] running on multiple hosts. Otherwise, the default value should do just fine.

### `companionHeaders: {}`

Custom headers to send to [Uppy Companion][companion].

### `dropbox: {}`

Specific options for the [Dropbox](/docs/dropbox) provider.

### `googleDrive: {}`

Specific options for the [Google Drive](/docs/google-drive) provider.

### `instagram: {}`

Specific options for the [Instagram](/docs/instagram) provider.

### `url: {}`

Specific options for the [URL](/docs/url) provider.

### `webcam: {}`

Specific options for the [Webcam](/docs/webcam) provider.

[companion]: /docs/companion
[transloadit]: /docs/transloadit#options
[assembly-status]: https://transloadit.com/docs/api/#assembly-status-response
[promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
