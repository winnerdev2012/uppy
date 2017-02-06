const html = require('yo-yo')
const FileList = require('./FileList')
const Tabs = require('./Tabs')
const FileCard = require('./FileCard')
const UploadBtn = require('./UploadBtn')
const StatusBar = require('./StatusBar')
const { isTouchDevice, toArray } = require('../../core/Utils')
const { closeIcon } = require('./icons')

// http://dev.edenspiekermann.com/2016/02/11/introducing-accessible-modal-dialog

module.exports = function Dashboard (props) {
  function handleInputChange (ev) {
    ev.preventDefault()
    const files = toArray(ev.target.files)

    files.forEach((file) => {
      props.addFile({
        source: props.id,
        name: file.name,
        type: file.type,
        data: file
      })
    })
  }

  // @TODO Exprimental, work in progress
  // no names, weird API, Chrome-only http://stackoverflow.com/a/22940020
  function handlePaste (ev) {
    ev.preventDefault()

    const files = toArray(ev.clipboardData.items)
    files.forEach((file) => {
      if (file.kind !== 'file') return

      const blob = file.getAsFile()
      props.log('File pasted')
      props.addFile({
        source: props.id,
        name: file.name,
        type: file.type,
        data: blob
      })
    })
  }

  return html`
    <div class="Uppy UppyTheme--default UppyDashboard
                          ${isTouchDevice() ? 'Uppy--isTouchDevice' : ''}
                          ${props.semiTransparent ? 'UppyDashboard--semiTransparent' : ''}
                          ${!props.inline ? 'UppyDashboard--modal' : ''}
                          ${props.isWide ? 'UppyDashboard--wide' : ''}"
          aria-hidden="${props.inline ? 'false' : props.modal.isHidden}"
          aria-label="${!props.inline
                       ? props.i18n('dashboardWindowTitle')
                       : props.i18n('dashboardTitle')}"
          role="dialog"
          onpaste=${handlePaste}
          onload=${() => props.updateDashboardElWidth()}>

    <button class="UppyDashboard-close"
            aria-label="${props.i18n('closeModal')}"
            title="${props.i18n('closeModal')}"
            onclick=${props.hideModal}>${closeIcon()}</button>

    <div class="UppyDashboard-overlay" onclick=${props.hideModal}></div>

    <div class="UppyDashboard-inner"
         tabindex="0"
         style="
          ${props.inline && props.maxWidth ? `max-width: ${props.maxWidth}px;` : ''}
          ${props.inline && props.maxHeight ? `max-height: ${props.maxHeight}px;` : ''}
         ">
      <div class="UppyDashboard-innerWrap">

        ${Tabs({
          files: props.files,
          handleInputChange: handleInputChange,
          acquirers: props.acquirers,
          container: props.container,
          panelSelectorPrefix: props.panelSelectorPrefix,
          showPanel: props.showPanel,
          i18n: props.i18n
        })}

        ${FileCard({
          files: props.files,
          fileCardFor: props.fileCardFor,
          done: props.fileCardDone,
          metaFields: props.metaFields,
          log: props.log,
          i18n: props.i18n
        })}

        <div class="UppyDashboard-filesContainer">

          ${FileList({
            acquirers: props.acquirers,
            files: props.files,
            handleInputChange: handleInputChange,
            container: props.container,
            showFileCard: props.showFileCard,
            showProgressDetails: props.showProgressDetails,
            totalProgress: props.totalProgress,
            totalFileCount: props.totalFileCount,
            info: props.info,
            i18n: props.i18n,
            log: props.log,
            removeFile: props.removeFile,
            pauseAll: props.pauseAll,
            resumeAll: props.resumeAll,
            pauseUpload: props.pauseUpload,
            startUpload: props.startUpload,
            cancelUpload: props.cancelUpload,
            resumableUploads: props.resumableUploads,
            isWide: props.isWide
          })}

          <div class="UppyDashboard-actions">
            ${!props.autoProceed && props.newFiles.length > 0
              ? UploadBtn({
                i18n: props.i18n,
                startUpload: props.startUpload,
                newFileCount: props.newFiles.length
              })
              : null
            }
          </div>

        </div>

        <div class="UppyDashboardContent-panel"
             role="tabpanel"
             aria-hidden="${props.activePanel ? 'false' : 'true'}">
          <div class="UppyDashboardContent-bar">
            <h2 class="UppyDashboardContent-title">
              ${props.i18n('importFrom')} ${props.activePanel ? props.activePanel.name : null}
            </h2>
            <button class="UppyDashboardContent-back"
                    onclick=${props.hideAllPanels}>${props.i18n('done')}</button>
          </div>
          ${props.activePanel ? props.activePanel.render(props.state) : ''}
        </div>

        <div class="UppyDashboard-progressindicators">
          ${StatusBar({
            totalProgress: props.totalProgress,
            totalFileCount: props.totalFileCount,
            totalSize: props.totalSize,
            totalUploadedSize: props.totalUploadedSize,
            uploadStartedFiles: props.uploadStartedFiles,
            isAllComplete: props.isAllComplete,
            isAllPaused: props.isAllPaused,
            isUploadStarted: props.isUploadStarted,
            pauseAll: props.pauseAll,
            resumeAll: props.resumeAll,
            cancelAll: props.cancelAll,
            complete: props.completeFiles.length,
            inProgress: props.inProgress,
            totalSpeed: props.totalSpeed,
            totalETA: props.totalETA,
            startUpload: props.startUpload,
            newFileCount: props.newFiles.length,
            i18n: props.i18n,
            resumableUploads: props.resumableUploads
          })}

          ${props.progressindicators.map((target) => {
            return target.render(props.state)
          })}
        </div>

      </div>
    </div>
  </div>
  `
}
