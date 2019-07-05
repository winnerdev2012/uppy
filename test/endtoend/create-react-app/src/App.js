import React, { Component } from 'react'
import Uppy from '@uppy/core'
import Tus from '@uppy/tus'
import GoogleDrive from '@uppy/google-drive'
import { Dashboard, DashboardModal } from '@uppy/react'
// import { Dashboard, DashboardModal, DragDrop, ProgressBar } from '@uppy/react'
import '@uppy/core/dist/style.css'
import '@uppy/dashboard/dist/style.css'
// import '@uppy/drag-drop/dist/style.css'
// import '@uppy/progress-bar/dist/style.css'

const isOnTravis = process.env.REACT_APP_ON_TRAVIS
const endpoint = isOnTravis ? 'http://companion.test:1080' : 'http://localhost:1080'

class App extends Component {
  constructor (props) {
    super(props)

    this.uppy = new Uppy({ id: 'uppy1', autoProceed: true, debug: true })
      .use(Tus, { endpoint: `${endpoint}/files/` })
      .use(GoogleDrive, { companionUrl: 'https://companion.uppy.io' })

    this.uppy2 = new Uppy({ id: 'uppy2', autoProceed: false, debug: true })
      .use(Tus, { endpoint: `${endpoint}/files/` })

    this.state = {
      showInlineDashboard: true,
      open: false
    }

    this.handleModalClick = this.handleModalClick.bind(this)
  }

  componentWillUnmount () {
    this.uppy.close()
    this.uppy2.close()
  }

  handleModalClick () {
    this.setState({
      open: !this.state.open
    })
  }

  render () {
    const { showInlineDashboard } = this.state
    return (
      <div>
        <h1>React Examples</h1>

        <h2>Inline Dashboard</h2>
        <div id="inline-dashboard">
          <label>
            <input
              id="inline-dashboard-toggle"
              type="checkbox"
              checked={showInlineDashboard}
              onChange={(event) => {
                this.setState({
                  showInlineDashboard: event.target.checked
                })
              }}
            />
            Show Dashboard
          </label>
          {showInlineDashboard && (
            <Dashboard
              uppy={this.uppy}
              plugins={['GoogleDrive']}
              metaFields={[
                { id: 'name', name: 'Name', placeholder: 'File name' }
              ]}
            />
          )}
        </div>

        <h2>Modal Dashboard</h2>
        <div id="modal-dashboard">
          <button onClick={this.handleModalClick} id="modal-dashboard-toggle">
            {this.state.open ? 'Close dashboard' : 'Open dashboard'}
          </button>
          <DashboardModal
            uppy={this.uppy2}
            open={this.state.open}
            target="#modal-dashboard"
            onRequestClose={() => this.setState({ open: false })}
          />
        </div>

        {/* <h2>Drag Drop Area</h2>
        <div id="drag-drop">
          <DragDrop
            uppy={this.uppy}
            locale={{
              strings: {
                chooseFile: 'Boop a file',
                orDragDrop: 'or yoink it here'
              }
            }}
          />
        </div>

        <h2>Progress Bar</h2>
        <div id="progress-bar">
          <ProgressBar
            uppy={this.uppy}
            hideAfterFinish={false}
          />
        </div> */}
      </div>
    )
  }
}

export default App
