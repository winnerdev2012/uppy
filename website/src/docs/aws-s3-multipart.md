---
type: docs
order: 3
title: "AWS S3 Multipart"
module: "@uppy/aws-s3-multipart"
permalink: docs/aws-s3-multipart/
category: "Destinations"
tagline: "uploader for AWS S3 using its resumable Multipart protocol"
---

The `@uppy/aws-s3-multipart` plugin can be used to upload files directly to an S3 bucket using S3’s Multipart upload strategy. With this strategy, files are chopped up in parts of 5MB+ each, so they can be uploaded concurrently. It’s also quite reliable: if a single part fails to upload, only that 5MB chunk has to be retried.

```js
import AwsS3Multipart from '@uppy/aws-s3-multipart'

uppy.use(AwsS3Multipart, {
  limit: 4,
  companionUrl: 'https://uppy-companion.myapp.net/',
})
```

## Installation

This plugin is published as the `@uppy/aws-s3-multipart` package.

Install from NPM:

```shell
npm install @uppy/aws-s3-multipart
```

In the [CDN package](/docs/#With-a-script-tag), the plugin class is available on the `Uppy` global object:

```js
const { AwsS3Multipart } = Uppy
```

## Options

The `@uppy/aws-s3-multipart` plugin has the following configurable options:

### `limit: 6`

The maximum amount of chunks to upload simultaneously. You should set the limit carefully. Setting it to a value too high could cause issues where the presigned URLs begin to expire before the chunks they are for start uploading. Too low and you will end up with a lot of extra round trips to your server (or Companion) than necessary to presign URLs. If the default chunk size of 5MB is used, a `limit` between 5 and 6 is recommended.

Because HTTP/1.1 limits the number of concurrent requests to one origin to 6, it’s recommended to always set a limit of 6 or smaller for all your uploads, or to not override the default.

### `retryDelays: [0, 1000, 3000, 5000]`

`retryDelays` are the intervals in milliseconds used to retry a failed chunk.

By default, we first retry instantly; if that fails, we retry after 1 second; if that fails, we retry after 3 seconds, etc.

Set to `null` to disable automatic retries, and fail instantly if any chunk fails to upload.

### `companionUrl: null`

URL of the [Companion](/docs/companion) instance to use for proxying calls to the S3 Multipart API.

This will be used by the default implementations of the upload-related functions below. If you provide your own implementations, a `companionUrl` is unnecessary.

### `companionHeaders: {}`

Custom headers that should be sent along to [Companion](/docs/companion) on every request.

This will be used by the default implementations of the upload-related functions below. If you provide your own implementations, these headers are not sent automatically.

### `companionCookiesRule: 'same-origin'`

This option correlates to the [RequestCredentials value](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials), which tells the plugin whether to send cookies to [Companion](/docs/companion).

### `allowedMetaFields: null`

Pass an array of field names to limit the metadata fields that will be added to upload as query parameters.

* Set this to `['name']` to only send the `name` field.
* Set this to `null` (the default) to send _all_ metadata fields.
* Set this to an empty array `[]` to not send any fields.

### `getChunkSize(file)`

A function that returns the minimum chunk size to use when uploading the given file.

The S3 Multipart plugin uploads files in chunks. Chunks are sent one by one to have presigned URLs generated via [`signPart()`][]. To reduce the amount of requests for large files, you can choose a larger chunk size, at the cost of having to re-upload more data if one chunk fails to upload.

S3 requires a minimum chunk size of 5MB, and supports at most 10,000 chunks per multipart upload. If `getChunkSize()` returns a size that’s too small, Uppy will increase it to S3’s minimum requirements.

### `createMultipartUpload(file)`

A function that calls the S3 Multipart API to create a new upload. `file` is the file object from Uppy’s state. The most relevant keys are `file.name` and `file.type`.

Return a Promise for an object with keys:

* `uploadId` - The UploadID returned by S3.
* `key` - The object key for the file. This needs to be returned to allow it to be different from the `file.name`.

The default implementation calls out to Companion’s S3 signing endpoints.

### `listParts(file, { uploadId, key })`

A function that calls the S3 Multipart API to list the parts of a file that have already been uploaded. Receives the `file` object from Uppy’s state, and an object with keys:

* `uploadId` - The UploadID of this Multipart upload.
* `key` - The object key of this Multipart upload.

Return a Promise for an array of S3 Part objects, as returned by the S3 Multipart API. Each object has keys:

* `PartNumber` - The index in the file of the uploaded part.
* `Size` - The size of the part in bytes.
* `ETag` - The ETag of the part, used to identify it when completing the multipart upload and combining all parts into a single file.

The default implementation calls out to Companion’s S3 signing endpoints.

### `prepareUploadParts(file, partData)`

> This option is deprecated. Use [`signPart()`][] instead.

A function that generates a batch of signed URLs for the specified part numbers. Receives the `file` object from Uppy’s state. The `partData` argument is an object with keys:

* `uploadId` - The UploadID of this Multipart upload.
* `key` - The object key in the S3 bucket.
* `parts` - An array containing a single object with the part number and chunk (`Array<{ number: number, chunk: blob }>`). `number` can’t be zero.
* `signal` – An `AbortSignal` that may be used to abort an ongoing request.

`prepareUploadParts` should return a `Promise` with an `Object` with keys:

* `presignedUrls` - A JavaScript object with the part numbers as keys and the presigned URL for each part as the value.
* `headers` - **(Optional)** Custom headers to send along with every request per part (`{ 1: { 'Content-MD5': 'hash' }}`). These are (1-based) indexed by part number too so you can for instance send the MD5 hash validation for each part to S3.

An example of what the return value should look like:

```json
{
  "presignedUrls": {
    "1": "https://bucket.region.amazonaws.com/path/to/file.jpg?partNumber=1&...",
  },
  "headers": { 
    "1": { "Content-MD5": "foo" },
  }
}
```

### `signPart(file, partData)`

A function that generates a signed URL for the specified part number. The `partData` argument is an object with the keys:

* `uploadId` - The UploadID of this Multipart upload.
* `key` - The object key in the S3 bucket.
* `partNumber` - can’t be zero.
* `body` – The data that will be signed.
* `signal` – An `AbortSignal` that may be used to abort an ongoing request.

This function should return a object, or a promise that resolves to an object, with the following keys:

* `url` – the presigned URL, as a `string`.
* `headers` – **(Optional)** Custom headers to send along with the request to S3 endpoint.

An example of what the return value should look like:

```json
{
  "url": "https://bucket.region.amazonaws.com/path/to/file.jpg?partNumber=1&...",
  "headers": { "Content-MD5": "foo" }
}
```

### `abortMultipartUpload(file, { uploadId, key })`

A function that calls the S3 Multipart API to abort a Multipart upload, and removes all parts that have been uploaded so far. Receives the `file` object from Uppy’s state, and an object with keys:

* `uploadId` - The UploadID of this Multipart upload.
* `key` - The object key of this Multipart upload.

This is typically called when the user cancels an upload. Cancellation cannot fail in Uppy, so the result of this function is ignored.

The default implementation calls out to Companion’s S3 signing endpoints.

### `completeMultipartUpload(file, { uploadId, key, parts })`

A function that calls the S3 Multipart API to complete a Multipart upload, combining all parts into a single object in the S3 bucket. Receives the `file` object from Uppy’s state, and an object with keys:

* `uploadId` - The UploadID of this Multipart upload.
* `key` - The object key of this Multipart upload.
* `parts` - S3-style list of parts, an array of objects with `ETag` and `PartNumber` properties. This can be passed straight to S3’s Multipart API.

Return a Promise for an object with properties:

* `location` - **(Optional)** A publically accessible URL to the object in the S3 bucket.

The default implementation calls out to Companion’s S3 signing endpoints.

## S3 Bucket Configuration

This process is the same as the one described in the [AWS S3 plugin’s documentation](/docs/aws-s3/#S3-Bucket-configuration), except for a few differences.

While the AWS S3 plugin uses `POST` requests when uploading files to an S3 bucket, the AWS S3 Multipart plugin uses `PUT` requests when uploading file parts. Additionally, the `ETag` header must also be exposed (in the response). So the CORS policy needs to look like this:

```json
[
  {
    "AllowedOrigins": ["https://my-app.com"],
    "AllowedMethods": ["GET", "PUT"],
    "MaxAgeSeconds": 3000,
    "AllowedHeaders": [
      "Authorization",
      "x-amz-date",
      "x-amz-content-sha256",
      "content-type"
    ],
    "ExposeHeaders": ["ETag"]
  },
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET"],
    "MaxAgeSeconds": 3000
  }
]
```

[`signPart()`]: #signPart-file-partData
