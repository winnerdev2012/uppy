import { expectError, expectType } from 'tsd'
import Uppy from '@uppy/core'
import type { UppyFile } from '@uppy/core'
import Transloadit from '..'

expectType<string>(Transloadit.COMPANION)
expectType<RegExp>(Transloadit.COMPANION_PATTERN)

const validParams = {
  auth: { key: 'not so secret key' },
}

{
  const uppy = new Uppy()
  uppy.use(Transloadit, {
    getAssemblyOptions (file) {
      expectType<UppyFile>(file)
      return { params: validParams }
    },
    waitForEncoding: false,
    waitForMetadata: true,
    importFromUploadURLs: false,
    params: {
      auth: { key: 'abc' },
      steps: {},
    },
  })
  // Access to both transloadit events and core events
  uppy.on('transloadit:assembly-created', (assembly) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const status = assembly.ok
  })

  uppy.on('complete', (result) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const success = result.successful
  })
}

{
  const uppy = new Uppy()
  // must be bools
  expectError(
    uppy.use(Transloadit, { waitForEncoding: null, params: validParams }),
  )
  expectError(
    uppy.use(Transloadit, { waitForMetadata: null, params: validParams }),
  )
}

{
  const uppy = new Uppy()
  // params.auth.key must be string
  expectError(uppy.use(Transloadit, { params: {} }))
  expectError(uppy.use(Transloadit, { params: { auth: {} } }))
  expectError(
    uppy.use(Transloadit, {
      params: {
        auth: { key: null },
      },
    }),
  )
  expectError(
    uppy.use(Transloadit, {
      params: {
        auth: { key: 'abc' },
        steps: 'test',
      },
    }),
  )
  uppy.use(Transloadit, {
    params: {
      auth: { key: 'abc' },
      steps: { name: {} },
    },
  })
}
