---
title: "&lt;StatusBar />"
type: docs
permalink: docs/react/status-bar/
alias: docs/react/statusbar/
order: 81
---

The `<StatusBar />` component wraps the [StatusBar][] plugin.

## Installation

```shell
npm install @uppy/react
```

```js
import StatusBar from '@uppy/react/lib/StatusBar'
import { StatusBar } from '@uppy/react'
```

## Props

The `<StatusBar />` component supports all [StatusBar][] options as props.

```js
<StatusBar
  hideUploadButton
  hideAfterFinish={false}
  showProgressDetails
/>
```

[StatusBar]: /docs/statusbar/
