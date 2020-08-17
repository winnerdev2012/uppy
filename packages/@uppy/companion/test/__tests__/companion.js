/* global jest:false, test:false, expect:false, describe:false */

jest.mock('tus-js-client')
jest.mock('purest')
jest.mock('../../src/server/helpers/oauth-state', () => {
  return {
    generateState: () => 'some-cool-nice-encrytpion',
    addToState: () => 'some-cool-nice-encrytpion',
    getFromState: (state, key) => {
      if (state === 'state-with-invalid-instance-url') {
        return 'http://localhost:3452'
      }

      if (state === 'state-with-older-version' && key === 'clientVersion') {
        return '@uppy/companion-client=1.0.1'
      }

      if (state === 'state-with-newer-version' && key === 'clientVersion') {
        return '@uppy/companion-client=1.0.3'
      }

      if (state === 'state-with-newer-version-old-style' && key === 'clientVersion') {
        return 'companion-client:1.0.2'
      }

      return 'http://localhost:3020'
    }
  }
})

const request = require('supertest')
const tokenService = require('../../src/server/helpers/jwt')
const { getServer } = require('../mockserver')
const authServer = getServer()
const authData = {
  dropbox: 'token value',
  drive: 'token value'
}
const token = tokenService.generateToken(authData, process.env.COMPANION_SECRET)
const OAUTH_STATE = 'some-cool-nice-encrytpion'

describe('set i-am header', () => {
  test('set i-am header in response', () => {
    return request(authServer)
      .get('/dropbox/list/')
      .set('uppy-auth-token', token)
      .expect(200)
      .then((res) => expect(res.header['i-am']).toBe('http://localhost:3020'))
  })
})

describe('list provider files', () => {
  test('list files for dropbox', () => {
    return request(authServer)
      .get('/dropbox/list/')
      .set('uppy-auth-token', token)
      .expect(200)
      .then((res) => expect(res.body.username).toBe('foo@bar.com'))
  })

  test('list files for google drive', () => {
    return request(authServer)
      .get('/drive/list/')
      .set('uppy-auth-token', token)
      .expect(200)
      .then((res) => expect(res.body.username).toBe('ife@bala.com'))
  })
})

describe('validate upload data', () => {
  test('invalid upload protocol gets rejected', () => {
    return request(authServer)
      .post('/drive/get/README.md')
      .set('uppy-auth-token', token)
      .set('Content-Type', 'application/json')
      .send({
        endpoint: 'http://url.myendpoint.com/files',
        protocol: 'tusInvalid'
      })
      .expect(400)
      .then((res) => expect(res.body.message).toBe('unsupported protocol specified'))
  })

  test('invalid upload fieldname gets rejected', () => {
    return request(authServer)
      .post('/drive/get/README.md')
      .set('uppy-auth-token', token)
      .set('Content-Type', 'application/json')
      .send({
        endpoint: 'http://url.myendpoint.com/files',
        protocol: 'tus',
        fieldname: 390
      })
      .expect(400)
      .then((res) => expect(res.body.message).toBe('fieldname must be a string'))
  })

  test('invalid upload metadata gets rejected', () => {
    return request(authServer)
      .post('/drive/get/README.md')
      .set('uppy-auth-token', token)
      .set('Content-Type', 'application/json')
      .send({
        endpoint: 'http://url.myendpoint.com/files',
        protocol: 'tus',
        metadata: 'I am a string instead of object'
      })
      .expect(400)
      .then((res) => expect(res.body.message).toBe('metadata must be an object'))
  })

  test('invalid upload headers get rejected', () => {
    return request(authServer)
      .post('/drive/get/README.md')
      .set('uppy-auth-token', token)
      .set('Content-Type', 'application/json')
      .send({
        endpoint: 'http://url.myendpoint.com/files',
        protocol: 'tus',
        headers: 'I am a string instead of object'
      })
      .expect(400)
      .then((res) => expect(res.body.message).toBe('headers must be an object'))
  })

  test('invalid upload HTTP Method gets rejected', () => {
    return request(authServer)
      .post('/drive/get/README.md')
      .set('uppy-auth-token', token)
      .set('Content-Type', 'application/json')
      .send({
        endpoint: 'http://url.myendpoint.com/files',
        protocol: 'tus',
        httpMethod: 'DELETE'
      })
      .expect(400)
      .then((res) => expect(res.body.message).toBe('unsupported HTTP METHOD specified'))
  })

  test('valid upload data is allowed - tus', () => {
    return request(authServer)
      .post('/drive/get/README.md')
      .set('uppy-auth-token', token)
      .set('Content-Type', 'application/json')
      .send({
        endpoint: 'http://url.myendpoint.com/files',
        protocol: 'tus',
        httpMethod: 'POST',
        headers: {
          customheader: 'header value'
        },
        metadata: {
          mymetadata: 'matadata value'
        },
        fieldname: 'uploadField'
      })
      .expect(200)
  })

  test('valid upload data is allowed - s3-multipart', () => {
    return request(authServer)
      .post('/drive/get/README.md')
      .set('uppy-auth-token', token)
      .set('Content-Type', 'application/json')
      .send({
        endpoint: 'http://url.myendpoint.com/files',
        protocol: 's3-multipart',
        httpMethod: 'PUT',
        headers: {
          customheader: 'header value'
        },
        metadata: {
          mymetadata: 'matadata value'
        },
        fieldname: 'uploadField'
      })
      .expect(200)
  })
})

describe('download provdier file', () => {
  test('specified file gets downloaded from provider', () => {
    return request(authServer)
      .post('/drive/get/README.md')
      .set('uppy-auth-token', token)
      .set('Content-Type', 'application/json')
      .send({
        endpoint: 'http://master.tus.io/files',
        protocol: 'tus'
      })
      .expect(200)
      .then((res) => expect(res.body.token).toBeTruthy())
  })
})

describe('test authentication', () => {
  test('authentication callback redirects to send-token url', () => {
    return request(authServer)
      .get('/drive/callback')
      .expect(302)
      .expect((res) => {
        expect(res.header.location).toContain('http://localhost:3020/drive/send-token?uppyAuthToken=')
      })
  })

  test('the token gets sent via cookie and html', () => {
    // see mock ../../src/server/helpers/oauth-state above for state values
    return request(authServer)
      .get(`/dropbox/send-token?uppyAuthToken=${token}&state=state-with-newer-version`)
      .expect(200)
      .expect((res) => {
        const authToken = res.header['set-cookie'][0].split(';')[0].split('uppyAuthToken--dropbox=')[1]
        expect(authToken).toEqual(token)
        const body = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <script>
          window.opener.postMessage(JSON.stringify({token: "${token}"}), "http://localhost:3020")
          window.close()
        </script>
    </head>
    <body></body>
    </html>`
        expect(res.text).toBe(body)
      })
  })

  test('the token gets to older clients without stringify', () => {
    // see mock ../../src/server/helpers/oauth-state above for state values
    return request(authServer)
      .get(`/drive/send-token?uppyAuthToken=${token}&state=state-with-older-version`)
      .expect(200)
      .expect((res) => {
        const body = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <script>
          window.opener.postMessage({token: "${token}"}, "http://localhost:3020")
          window.close()
        </script>
    </head>
    <body></body>
    </html>`
        expect(res.text).toBe(body)
      })
  })

  test('the token gets sent to newer clients with old version style', () => {
    // see mock ../../src/server/helpers/oauth-state above for state values
    return request(authServer)
      .get(`/drive/send-token?uppyAuthToken=${token}&state=state-with-newer-version-old-style`)
      .expect(200)
      .expect((res) => {
        const body = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <script>
          window.opener.postMessage(JSON.stringify({token: "${token}"}), "http://localhost:3020")
          window.close()
        </script>
    </head>
    <body></body>
    </html>`
        expect(res.text).toBe(body)
      })
  })

  test('logout provider', () => {
    return request(authServer)
      .get('/drive/logout/')
      .set('uppy-auth-token', token)
      .expect(200)
      .then((res) => expect(res.body.ok).toBe(true))
  })
})

describe('connect to provider', () => {
  test('connect to dropbox via grant.js endpoint', () => {
    return request(authServer)
      .get('/dropbox/connect?foo=bar')
      .set('uppy-auth-token', token)
      .expect(302)
      .expect('Location', `http://localhost:3020/connect/dropbox?state=${OAUTH_STATE}`)
  })

  test('connect to drive via grant.js endpoint', () => {
    return request(authServer)
      .get('/drive/connect?foo=bar')
      .set('uppy-auth-token', token)
      .expect(302)
      .expect('Location', `http://localhost:3020/connect/google?state=${OAUTH_STATE}`)
  })
})

describe('handle master oauth redirect', () => {
  const serverWithMasterOauth = getServer({
    COMPANION_OAUTH_DOMAIN: 'localhost:3040'
  })
  test('redirect to a valid uppy instance', () => {
    return request(serverWithMasterOauth)
      .get(`/dropbox/redirect?state=${OAUTH_STATE}`)
      .set('uppy-auth-token', token)
      .expect(302)
      .expect('Location', `http://localhost:3020/connect/dropbox/callback?state=${OAUTH_STATE}`)
  })

  test('do not redirect to invalid uppy instances', () => {
    const state = 'state-with-invalid-instance-url' // see mock ../../src/server/helpers/oauth-state above
    return request(serverWithMasterOauth)
      .get(`/dropbox/redirect?state=${state}`)
      .set('uppy-auth-token', token)
      .expect(400)
  })
})

// @todo consider moving this to a separate test file (zoom.js maybe)
// in general, we should consider testing all providers endpoints separately
describe('handle deauthorization callback', () => {
  test('providers without support for callback endpoint', () => {
    return request(authServer)
      .post('/dropbox/deauthorization/callback')
      .set('Content-Type', 'application/json')
      .send({
        foo: 'bar'
      })
    // @todo consider receiving 501 instead
      .expect(500)
  })

  test('validate that request credentials match', () => {
    return request(authServer)
      .post('/zoom/deauthorization/callback')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'wrong-verfication-token')
      .send({
        event: 'app_deauthorized',
        payload: {
          user_data_retention: 'false',
          account_id: 'EabCDEFghiLHMA',
          user_id: 'z9jkdsfsdfjhdkfjQ',
          signature: '827edc3452044f0bc86bdd5684afb7d1e6becfa1a767f24df1b287853cf73000',
          deauthorization_time: '2019-06-17T13:52:28.632Z',
          client_id: 'ADZ9k9bTWmGUoUbECUKU_a'
        }
      })
      .expect(400)
  })

  test('validate request credentials is present', () => {
    // Authorization header is absent
    return request(authServer)
      .post('/zoom/deauthorization/callback')
      .set('Content-Type', 'application/json')
      .send({
        event: 'app_deauthorized',
        payload: {
          user_data_retention: 'false',
          account_id: 'EabCDEFghiLHMA',
          user_id: 'z9jkdsfsdfjhdkfjQ',
          signature: '827edc3452044f0bc86bdd5684afb7d1e6becfa1a767f24df1b287853cf73000',
          deauthorization_time: '2019-06-17T13:52:28.632Z',
          client_id: 'ADZ9k9bTWmGUoUbECUKU_a'
        }
      })
      .expect(400)
  })

  test('validate request content', () => {
    return request(authServer)
      .post('/zoom/deauthorization/callback')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'zoom_verfication_token')
      .send({
        invalid: 'content'
      })
      .expect(400)
  })

  test('validate request content (event name)', () => {
    return request(authServer)
      .post('/zoom/deauthorization/callback')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'zoom_verfication_token')
      .send({
        event: 'wrong_event_name',
        payload: {
          user_data_retention: 'false',
          account_id: 'EabCDEFghiLHMA',
          user_id: 'z9jkdsfsdfjhdkfjQ',
          signature: '827edc3452044f0bc86bdd5684afb7d1e6becfa1a767f24df1b287853cf73000',
          deauthorization_time: '2019-06-17T13:52:28.632Z',
          client_id: 'ADZ9k9bTWmGUoUbECUKU_a'
        }
      })
      .expect(400)
  })

  test('allow valid request', () => {
    return request(authServer)
      .post('/zoom/deauthorization/callback')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'zoom_verfication_token')
      .send({
        event: 'app_deauthorized',
        payload: {
          user_data_retention: 'false',
          account_id: 'EabCDEFghiLHMA',
          user_id: 'z9jkdsfsdfjhdkfjQ',
          signature: '827edc3452044f0bc86bdd5684afb7d1e6becfa1a767f24df1b287853cf73000',
          deauthorization_time: '2019-06-17T13:52:28.632Z',
          client_id: 'ADZ9k9bTWmGUoUbECUKU_a'
        }
      })
      .expect(200)
  })
})
