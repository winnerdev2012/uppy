# @uppy/transloadit

## 2.3.6

Released: 2022-08-02
Included in: Uppy v2.13.2

- @uppy/transloadit: send `assembly-cancelled` only once (Antoine du Hamel / #3937)

## 2.3.5

Released: 2022-07-27
Included in: Uppy v2.13.1

- @uppy/transloadit: cancel assemblies when all its files have been removed (Antoine du Hamel / #3893)

## 2.3.4

Released: 2022-07-18
Included in: Uppy v2.13.0

- @uppy/transloadit: fix outdated file ids and incorrect usage of files (Merlijn Vos / #3886)

## 2.3.3

Released: 2022-07-11
Included in: Uppy v2.12.3

- @uppy/transloadit: fix TypeError when file is cancelled asynchronously (Antoine du Hamel / #3872)
- @uppy/robodog,@uppy/transloadit: use modern syntax to simplify code (Antoine du Hamel / #3873)

## 2.3.2

Released: 2022-07-06
Included in: Uppy v2.12.2

- @uppy/locales,@uppy/transloadit: Fix undefined error in in onTusError (Merlijn Vos / #3848)

## 2.3.1

Released: 2022-06-09
Included in: Uppy v2.12.1

- @uppy/transloadit: fix `COMPANION_PATTERN` export (Antoine du Hamel / #3820)

## 2.3.0

Released: 2022-05-30
Included in: Uppy v2.11.0

- @uppy/angular,@uppy/audio,@uppy/aws-s3-multipart,@uppy/aws-s3,@uppy/box,@uppy/core,@uppy/dashboard,@uppy/drag-drop,@uppy/dropbox,@uppy/facebook,@uppy/file-input,@uppy/form,@uppy/golden-retriever,@uppy/google-drive,@uppy/image-editor,@uppy/informer,@uppy/instagram,@uppy/onedrive,@uppy/progress-bar,@uppy/react,@uppy/redux-dev-tools,@uppy/robodog,@uppy/screen-capture,@uppy/status-bar,@uppy/store-default,@uppy/store-redux,@uppy/thumbnail-generator,@uppy/transloadit,@uppy/tus,@uppy/unsplash,@uppy/url,@uppy/vue,@uppy/webcam,@uppy/xhr-upload,@uppy/zoom: doc: update bundler recommendation (Antoine du Hamel / #3763)
- @uppy/transloadit: refactor to ESM (Antoine du Hamel / #3725)
- @uppy/transloadit: transloadit: propagate error details when creating Assembly fails (Renée Kooi / #3794)

## 2.2.0

Released: 2022-05-14
Included in: Uppy v2.10.0

- @uppy/aws-s3-multipart,@uppy/aws-s3,@uppy/core,@uppy/react,@uppy/transloadit,@uppy/tus,@uppy/xhr-upload: proposal: Cancel assemblies optional (Mikael Finstad / #3575)
- @uppy/transloadit: add rate limiting for assembly creation and status polling (Antoine du Hamel / #3718)

## 2.1.5

Released: 2022-04-27
Included in: Uppy v2.9.4

- @uppy/transloadit: improve fetch error handling (Antoine du Hamel / #3637)

## 2.1.4

Released: 2022-04-07
Included in: Uppy v2.9.2

- @uppy/aws-s3,@uppy/companion-client,@uppy/transloadit,@uppy/utils: Propagate `isNetworkError` through error wrappers (Renée Kooi / #3620)

## 2.1.2

Released: 2022-03-24
Included in: Uppy v2.9.0

- @uppy/transloadit: close assembly if upload is cancelled (Antoine du Hamel / #3591)

## 2.1.1

Released: 2022-01-12
Included in: Uppy v2.4.1

- @uppy/transloadit: fix handling of Tus errors and rate limiting (Antoine du Hamel / #3429)
- @uppy/transloadit: simplify `#onTusError` (Antoine du Hamel / #3419)

## 2.1.0

Released: 2022-01-10
Included in: Uppy v2.4.0

- @uppy/transloadit: ignore rate limiting errors when polling (Antoine du Hamel / #3418)
- @uppy/transloadit: better defaults for rate limiting (Antoine du Hamel / #3414)

## 2.0.5

Released: 2021-12-07
Included in: Uppy v2.3.0

- @uppy/aws-s3,@uppy/box,@uppy/core,@uppy/dashboard,@uppy/drag-drop,@uppy/dropbox,@uppy/facebook,@uppy/file-input,@uppy/google-drive,@uppy/image-editor,@uppy/instagram,@uppy/locales,@uppy/onedrive,@uppy/screen-capture,@uppy/status-bar,@uppy/thumbnail-generator,@uppy/transloadit,@uppy/url,@uppy/webcam,@uppy/xhr-upload,@uppy/zoom: Refactor locale scripts & generate types and docs (Merlijn Vos / #3276)
