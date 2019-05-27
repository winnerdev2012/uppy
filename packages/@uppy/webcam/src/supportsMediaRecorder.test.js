const supportsMediaRecorder = require('./supportsMediaRecorder')

describe('supportsMediaRecorder', () => {
  it('should return true if MediaRecorder is supported', () => {
    global.MediaRecorder = class MediaRecorder {
      start () {}
    }
    expect(supportsMediaRecorder()).toEqual(true)
  })

  it('should return false if MediaRecorder is not supported', () => {
    global.MediaRecorder = undefined
    expect(supportsMediaRecorder()).toEqual(false)

    global.MediaRecorder = class MediaRecorder {}
    expect(supportsMediaRecorder()).toEqual(false)

    global.MediaRecorder = class MediaRecorder {
      foo () {}
    }
    expect(supportsMediaRecorder()).toEqual(false)
  })
})
