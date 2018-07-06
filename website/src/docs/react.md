---
title: "Introduction"
type: docs
permalink: docs/react/
order: 80
---

Uppy provides [React][] components for the included UI plugins.

## Installation

All React components are provided through the `@uppy/react` package.

```shell
npm install @uppy/react
```

## Usage

The components can be used with [React][] or API-compatible alternatives such as [Preact][].

Instead of adding a UI plugin to an Uppy instance with `.use()`, the Uppy instance can be passed into components as an `uppy` prop.
All other props are passed as options to the plugin.

```js
const Uppy = require('@uppy/core')
const Tus = require('@uppy/tus')
const DragDrop = require('@uppy/drag-drop')

const uppy = Uppy({
  meta: { type: 'avatar' },
  restrictions: { maxNumberOfFiles: 1 },
  autoProceed: true
})

uppy.use(Tus, { endpoint: '/upload' })

uppy.on('complete', (result) => {
  const url = result.successful[0].uploadURL
  store.dispatch({
    type: SET_USER_AVATAR_URL,
    payload: { url: url }
  })
})

const AvatarPicker = ({ currentAvatar }) => {
  return (
    <div>
      <img src={currentAvatar} alt="Current Avatar" />
      <DragDrop
        uppy={uppy}
        locale={{
          strings: {
            chooseFile: 'Pick a new avatar'
          }
        }}
      />
    </div>
  )
}
```

The plugins that are available as React component wrappers are:

 - [&lt;Dashboard />][] - renders an inline [`@uppy/dashboard`][]
 - [&lt;DashboardModal />][] - renders a [`@uppy/dashboard`][] modal
 - [&lt;DragDrop />][] - renders a [`@uppy/drag-drop`][] area
 - [&lt;ProgressBar />][] - renders a [`@uppy/progress-bar`][]
 - [&lt;StatusBar />][] - renders a [`@uppy/status-bar`][]

[React]: https://facebook.github.io/react
[Preact]: https://preactjs.com/
[&lt;Dashboard />]: /docs/react/dashboard
[&lt;DragDrop />]: /docs/react/dragdrop
[&lt;ProgressBar />]: /docs/react/progress-bar
[&lt;StatusBar />]: /docs/react/status-bar
[&lt;DashboardModal />]: /docs/react/dashboard-modal
[`@uppy/dashboard`]: /docs/dashboard
[`@uppy/drag-drop`]: /docs/drag-drop
[`@uppy/progress-bar`]: /docs/progress-bar
[`@uppy/status-bar`]: /docs/status-bar
