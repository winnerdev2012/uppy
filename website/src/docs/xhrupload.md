---
type: docs
order: 1
title: "XHR Upload"
menu: "XHR"
module: "@uppy/xhr-upload"
permalink: docs/xhr-upload/
alias: docs/xhrupload/
category: 'Destinations'
tagline: classic multipart form uploads or binary uploads using XMLHTTPRequest
---

The `@uppy/xhr-upload` plugin handles classic HTML multipart form uploads, as well as uploads using the HTTP `PUT` method.

```js
const XHRUpload = require('@uppy/xhr-upload')

uppy.use(XHRUpload, {
  endpoint: 'http://my-website.org/upload'
})
```

<a class="TryButton" href="/examples/xhrupload/">Try it live</a>

## Installation

This plugin is published as the `@uppy/xhr-upload` package.

Install from NPM:

```shell
npm install @uppy/xhr-upload
```

In the [CDN package](/docs/#With-a-script-tag), it is available on the `Uppy` global object:

```js
const XHRUpload = Uppy.XHRUpload
```

## Options

The `@uppy/xhr-upload` plugin has the following configurable options:

### `id: 'XHRUpload'`

A unique identifier for this plugin. It defaults to `'XHRUpload'`.

### `endpoint: ''`

The destination URL for your uploads.

### `method: 'post'`

Configures which HTTP method to use for the upload.

### `formData: true`

Configures whether or not to use a multipart form upload, using [FormData][].
This works similarly to using a `<form>` element with an `<input type="file">` for uploads.
When set to `true`, file metadata is also sent to the endpoint as separate form fields.
When set to `false`, only the file contents are sent.

### `fieldName: 'files[]'`

When `formData` is set to true, this is used as the form field name for the file to be uploaded.

### `metaFields: null`

Pass an array of field names to limit the metadata fields that will be sent to the endpoint as form fields.

* Set this to `['name']` to only send the `name` field.
* Set this to `null` (the default) to send *all* metadata fields.
* Set this to an empty array `[]` to not send any fields.

If the `formData` option is set to false, `metaFields` has no effect.

### `headers: {}`

An object containing HTTP headers to use for the upload request.
Keys are header names, values are header values.

```js
headers: {
  'authorization': `Bearer ${window.getCurrentUserToken()}`
}
```

### `bundle: false`

Send all files in a single multipart request. When `bundle` is set to `true`, `formData` must also be set to `true`.

⚠️ Only use `bundle: true` with local uploads (drag-drop, browse, webcam), Uppy won’t be able to bundle remote files (from Google Drive or Instagram), and will throw an error in this case.

> Note: When `bundle` is set to `true`, [global uppy metadata](https://uppy.io/docs/uppy/#meta), the one set via `meta` options property, is sent to the endpoint. Individual per-file metadata is ignored.

All files will be appended to the provided `fieldName` field in the request. To upload files on different fields, use [`uppy.setFileState()`](/docs/uppy#uppy-setFileState-fileID-state) to set the `xhrUpload.fieldName` property on the file:

```js
uppy.setFileState(fileID, {
  xhrUpload: { fieldName: 'pic0' }
})
uppy.setFileState(otherFileID, {
  xhrUpload: { fieldName: 'pic1' }
})
```

### `getResponseData(responseText, response)`

When an upload has completed, Uppy will extract response data from the upload endpoint. This response data will be available on the file's `.response` property, and be emitted in the `upload-success` event:

```js
uppy.getFile(fileID).response
// { status: HTTP status code,
//   body: extracted response data }

uppy.on('upload-success', (file, response) => {
  response.status // HTTP status code
  response.body   // extracted response data

  // do something with file and response
})
```

By default, Uppy assumes the endpoint will return JSON. So, if `POST /upload` responds with:

```json
{
  "url": "https://public.url/to/file",
  "whatever": "beep boop"
}
```

That object will be the value of `response.body`. Not all endpoints respond with JSON. Providing a `getResponseData` function overrides this behavior. The `response` parameter is the `XMLHttpRequest` instance used to upload the file.

For example, an endpoint that responds with an XML document:

```js
getResponseData (responseText, response) {
  return {
    url: responseText.match(/<Location>(.*?)<\/Location>/)[1]
  }
}
```

The `responseText` is the XHR endpoint response as a string. For uploads from the user's device, `response` is the [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) object.

When uploading files from remote providers such as Dropbox or Instagram, Companion sends upload response data to the client. This is made available in the `getResponseData()` function as well. The `response` object from Companion contains some properties named after their [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) counterparts:

 - `response.responseText` - the XHR endpoint response as a string;
 - `response.status` - the HTTP status code;
 - `response.statusText` - the HTTP status text;
 - `response.headers` - an object mapping lowercase header names to their values.

### `getResponseError(responseText, response)`

If the upload endpoint responds with a non-2xx status code, the upload is assumed to have failed. The endpoint might have responded with some information about the error, though.

Pass in a `getResponseError` function to extract error data from the `XMLHttpRequest` instance used for the upload.

For example, if the endpoint responds with a JSON object containing a `{ message }` property, this would show that message to the user:

```js
getResponseError (responseText, xhr) {
  return new Error(JSON.parse(responseText).message)
}
```

### `responseUrlFieldName: 'url'`

The field name containing a publically accessible location of the uploaded file in the response data returned by `getResponseData(xhr.responseText, xhr)`.

### `timeout: 30 * 1000`

When no upload progress events have been received for this amount of milliseconds, assume the connection has an issue and abort the upload.
Note that unlike the [`XMLHttpRequest.timeout`][XHR.timeout] property, this is a timer between progress events: the total upload can take longer than this value.
Set to `0` to disable this check.

The default for the timeout is 30 seconds.

### `limit: 0`

Limit the amount of uploads going on at the same time. Setting this to `0` means there is no limit on concurrent uploads.

### `responseType: ''`

The response type expected from the server, determining how the `xhr.response` property should be filled. The `xhr.response` property can be accessed in a custom [`getResponseData()`](#getResponseData-responseText-response) callback. This option sets the [`XMLHttpRequest.responseType][XHR.responseType] property. Only '', 'text', 'arraybuffer', 'blob' and 'document' are widely supported by browsers, so it's recommended to use one of those. The default is the empty string, which is equivalent to 'text' for the `xhr.response` property.

### `withCredentials: false`

Indicates whether or not cross-site Access-Control requests should be made using credentials.

### `locale: {}`

Localize text that is shown to the user.

The default English strings are:

```js
strings: {
  // Shown in the Informer if an upload is being canceled because it stalled for too long.
  timedOut: 'Upload stalled for %{seconds} seconds, aborting.'
}
```

## POST Parameters / Form Fields

When using XHRUpload with `formData: true`, file metadata is sent along with each upload request. You can set metadata for a file using [`uppy.setFileMeta(fileID, data)`](/docs/uppy#uppy-setFileMeta-fileID-data), or for all files simultaneously using [`uppy.setMeta(data)`](/docs/uppy#uppy-setMeta-data).

It may be useful to set metadata depending on some file properties, such as the size. You can use the [`file-added`](/docs/uppy/#file-added) event and  the [`uppy.setFileMeta(fileID, data)`](/docs/uppy#uppy-setFileMeta-fileID-data) method to do this:

```js
uppy.on('file-added', (file) => {
  uppy.setFileMeta(file.id, {
    size: file.size
  })
})
```

Now, a form field named `size` will be sent along to the [`endpoint`](#endpoint-39-39) once the upload starts.

By default, all metadata is sent, including Uppy's default `name` and `type` metadata. If you do not want the `name` and `type` metadata properties to be sent to your upload endpoint, you can use the [`metaFields`](#metaFields-null) option to restrict the field names that should be sent.

```js
uppy.use(XHRUpload, {
  // Only send our own `size` metadata field.
  metaFields: ['size']
})
```

## Uploading to a PHP Server

The XHRUpload plugin works similarly to a `<form>` upload. You can use the `$_FILES` variable on the server to work with uploaded files. See the PHP documentation on [Handling file uploads][PHP.file-upload].

The default form field for file uploads is `files[]`, which means you have to access the `$_FILES` array as described in [Uploading multiple files][PHP.multiple]:

```php
<?php
// upload.php
$files = $_FILES['files'];
$file_path = $files['tmp_name'][0]; // temporary upload path of the first file
$file_name = $_POST['name']; // desired name of the file
move_uploaded_file($file_path, './img/' . basename($file_name)); // save the file in `img/`
```

Note how we are using `$_POST['name']` instead of `$my_file['name']`. `$my_file['name']` contains the original name of the file on the user's device. `$_POST['name']` contains the `name` metadata value for the uploaded file, which can be edited by the user using the [Dashboard](/docs/dashboard).

Set a custom `fieldName` to make working with the `$_FILES` array a bit less convoluted:

```js
// app.js
uppy.use(XHRUpload, {
  endpoint: '/upload.php',
  fieldName: 'my_file'
})
```

```php
<?php
// upload.php
$my_file = $_FILES['my_file'];
$file_path = $my_file['tmp_name']; // temporary upload path of the file
$file_name = $_POST['name']; // desired name of the file
move_uploaded_file($file_path, './img/' . basename($file_name)); // save the file at `img/FILE_NAME`
```

[FormData]: https://developer.mozilla.org/en-US/docs/Web/API/FormData
[XHR.timeout]: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/timeout
[XHR.responseType]: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType
[PHP.file-upload]: https://secure.php.net/manual/en/features.file-upload.php
[PHP.multiple]: https://secure.php.net/manual/en/features.file-upload.multiple.php
