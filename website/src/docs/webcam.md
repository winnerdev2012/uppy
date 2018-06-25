---
type: docs
order: 26
title: "Webcam"
permalink: docs/webcam/
---

The Webcam plugin lets you take photos and record videos with a built-in camera on desktop and mobile devices.

> To use the Webcam plugin in Chrome, [your site should be served over https](https://developers.google.com/web/updates/2015/10/chrome-47-webrtc#public_service_announcements). This restriction does not apply on `localhost`, so you don't have to jump through many hoops during development.

```js
const Webcam = require('@uppy/webcam')

uppy.use(Webcam, {
  // Options
})
```

[Try live!](/examples/dashboard/)

## Installation

This plugin is published as the `@uppy/webcam` package.

```shell
npm install @uppy/webcam
```

## Options

```js
uppy.use(Webcam, {
  onBeforeSnapshot: () => Promise.resolve(),
  countdown: false,
  modes: [
    'video-audio',
    'video-only',
    'audio-only',
    'picture'
  ],
  mirror: true,
  facingMode: 'user',
  locale: {}
})
```

### `id: 'Webcam'`

A unique identifier for this plugin. Defaults to `'Webcam'`.

### `target: null`

DOM element, CSS selector, or plugin to mount Webcam into.

### `countdown: false`

When taking a picture: the amount of seconds to wait before actually taking a snapshot. If `false` or 0, the timeout is disabled entirely. This also shows a `Smile!` message with the [Informer](/docs/informer) before the picture is taken.

### `onBeforeSnapshot: () => Promise.resolve()`

A hook function to call before a snapshot is taken. The Webcam plugin will wait for the returned Promise to resolve before taking the snapshot. This can be used to implement variations on the `countdown` option for example.

### `modes: []`

The types of recording modes to allow.

 - `video-audio` - Record a video file, capturing both audio and video.
 - `video-only` - Record a video file with the webcam, but don't record audio.
 - `audio-only` - Record an audio file with the user's microphone.
 - `picture` - Take a picture with the webcam.

By default, all modes are allowed, and the Webcam plugin will show controls for recording video as well as taking pictures.

### `mirror: true`

Whether to mirror preview image from the camera. This option is useful when taking a selfie with a front camera: when you wave your right hand, you will see your hand on the right on the preview screen, like in the mirror. But when you actually take a picture, it will not be mirrored. This is how smartphone selfie cameras behave.

### `facingMode: 'user'`

Devices sometimes have multiple cameras, front and back, for example. There’s a browser API to set which camera will be used, [facingMode](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/facingMode):

- `user`: The video source is facing toward the user; this includes, for example, the front-facing camera on a smartphone.
- `environment`:  The video source is facing away from the user, thereby viewing their environment. This is the back camera on a smartphone.
- `left`: The video source is facing toward the user but to their left, such as a camera aimed toward the user but over their left shoulder.
- `right`: The video source is facing toward the user but to their right, such as a camera aimed toward the user but over their right shoulder.


### `locale: {}`

Localize text that is shown to the user.

The default English strings are:

```js
strings: {
  // Shown before a picture is taken when the `countdown` option is set.
  smile: 'Smile!',
  // Used as the label for the button that takes a picture.
  // This is not visibly rendered but is picked up by screen readers.
  takePicture: 'Take a picture',
  // Used as the label for the button that starts a video recording.
  // This is not visibly rendered but is picked up by screen readers.
  startRecording: 'Begin video recording',
  // Used as the label for the button that stops a video recording.
  // This is not visibly rendered but is picked up by screen readers.
  stopRecording: 'Stop video recording',
}
```
