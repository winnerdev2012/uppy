import 'es6-shim' // Polyfill Map and Set for React
import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

const errors = []
window.onerror = (err) => {
  errors.push(err)
}
window.errors = errors

ReactDOM.render(<App />, document.getElementById('root'))
