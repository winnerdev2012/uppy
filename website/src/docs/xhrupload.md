---
type: docs
order: 31
title: "XHRUpload"
permalink: docs/xhrupload/
---

The XHRUpload plugin handles classic HTML multipart form uploads, as well as uploads using the HTTP `PUT` method.

[Try it live](/examples/xhrupload/)

```js
uppy.use(XHRUpload, {
  endpoint: 'http://my-website.org/upload'
})
```

## Options

### `endpoint: ''`

URL to upload to.

### `method: 'post'`

HTTP method to use for the upload.

### `formData: true`

Whether to use a multipart form upload, using [FormData][].
This works similarly to using a `<form>` element with an `<input type="file">` for uploads.
When `true`, file metadata is also sent to the endpoint as separate form fields.
When `false`, only the file contents are sent.

### `fieldName: 'files[]'`

When `formData` is true, this is used as the form field name for the file to be uploaded.

### `metaFields: null`

Pass an array of field names to limit the metadata fields that will be sent to the endpoint as form fields.
For example, `metaFields: ['name']` will only send the `name` field.
Passing `null` (the default) will send *all* metadata fields.

If the `formData` option is false, `metaFields` has no effect.

### `headers: {}`

An object containing HTTP headers to use for the upload request.
Keys are header names, values are header values.

```js
headers: {
  'authorization': `Bearer ${window.getCurrentUserToken()}`
}
```

### `bundle: false`

Send all files in a single multipart request. When `bundle` is `true`, `formData` must also be set to `true`.

> Note: When `bundle` is `true`, file metadata is **not** sent to the endpoint. This is because it's not obvious how metadata should be sent when there are multiple files in a single request. If you need this, please open an issue and we'll try to figure it out together.

All files will be appended to the provided `fieldName` field in the request. To upload files on different fields, use [`uppy.setFileState()`](/docs/uppy#uppy-setFileState-fileID-state) to set the `xhrUpload.fieldName` property on the file:

```js
uppy.setFileState(fileID, {
  xhrUpload: { fieldName: 'pic0' }
})
uppy.setFileState(otherFileID, {
  xhrUpload: { fieldName: 'pic1' }
})
```

### `getResponseData(xhr)`

When an upload has completed, Uppy will extract response data from the upload endpoint. This response data will be available on the file's `.response` property, and be emitted in the `upload-success` event:

```js
uppy.getFile(fileID).response
// { status: HTTP status code,
//   body: extracted response data }

uppy.on('upload-success', (fileID, body) => {
  // do something with extracted response data
  // (`body` is equivalent to `uppy.getFile(fileID).response.body`)
})
```

By default, Uppy assumes the endpoint will return JSON. So, if `POST /upload` responds with:

```json
{
  "url": "https://public.url/to/file",
  "whatever": "beep boop"
}
```

That object will be emitted in the `upload-success` event. Not all endpoints respond with JSON. Providing a `getResponseData` function overrides this behavior. The `xhr` parameter is the `XMLHttpRequest` instance used to upload the file.

For example, an endpoint that responds with an XML document:

```js
getResponseData (xhr) {
  return {
    url: xhr.responseXML.querySelector('Location').textContent
  }
}
```

### `getResponseError(xhr.responseText, xhr)`

If the upload endpoint responds with a non-2xx status code, the upload is assumed to have failed.
The endpoint might have responded with some information about the error, though.
Pass in a `getResponseError` function to extract error data from the `XMLHttpRequest` instance used for the upload.

For example, if the endpoint responds with a JSON object containing a `{ message }` property, this would show that message to the user:

```js
getResponseError (responseText, xhr) {
  return new Error(JSON.parse(xhr.response).message)
}
```

### `responseUrlFieldName: 'url'`

The field name containing a publically accessible location of the uploaded file in the response data returned by `getResponseData(xhr)`.

### `timeout: 30 * 1000`

When no upload progress events have been received for this amount of milliseconds, assume the connection has an issue and abort the upload.
Note that unlike the [`XMLHttpRequest.timeout`][XHR.timeout] property, this is a timer between progress events: the total upload can take longer than this value.
Set to `0` to disable this check.

The default is 30 seconds.

### `limit: 0`

Limit the amount of uploads going on at the same time. Passing `0` means no limit.

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
move_uploaded_file($file_path, './img/img.png'); // save the file at `img/img.png`
```

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
$file_name = $my_file['name']; // original name of the file
move_uploaded_file($file_path, './img/' . basename($file_name)); // save the file at `img/FILE_NAME`
```

[FormData]: https://developer.mozilla.org/en-US/docs/Web/API/FormData
[XHR.timeout]: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/timeout
[PHP.file-upload]: https://secure.php.net/manual/en/features.file-upload.php
[PHP.multiple]: https://secure.php.net/manual/en/features.file-upload.multiple.php
