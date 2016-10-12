import html from '../../../../core/html'
import { iconText, iconFile, iconAudio, checkIcon } from './icons'

function getIconByMime (fileTypeGeneral) {
  switch (fileTypeGeneral) {
    case 'text':
      return iconText()
    case 'audio':
      return iconAudio()
    default:
      return iconFile()
  }
}

export default function fileCard (props) {
  const {
    done,
    fileCardFor,
    files,
    metaFields
  } = props

  // const { bus } = props

  // Notes:
  // what is this? can a filecard be generated with no file in files?
  // why not just pass down the individual file?
  const file = fileCardFor ? files[fileCardFor] : false
  const meta = {}

  function tempStoreMeta (ev) {
    const value = ev.target.value
    const name = ev.target.attributes.name.value
    meta[name] = value
  }

  function renderMetaFields (file) {
    // not sure if this is going to break shit
    if (!metaFields || !metaFields.map) {
      return []
    }

    return metaFields.map((field) => {
      return html`
        <fieldset class="UppyDashboardFileCard-fieldset">
          <label class="UppyDashboardFileCard-label">
            ${field.name}
          </label>
          <input
            class="UppyDashboardFileCard-input"
            name="${field.id}"
            type="text"
            value="${file.meta[field.id]}"
            placeholder="${field.placeholder || ''}"
            onkeyup=${tempStoreMeta}/>
        </fieldset>
      `
    })
  }

  return html`
    <div class="UppyDashboardFileCard" aria-hidden="${fileCardFor ? 'false' : 'true'}">
      <div class="UppyDashboardContent-bar">
        <h2 class="UppyDashboardContent-title">
          Editing
          <span class="UppyDashboardContent-titleFile">
            ${file.meta ? file.meta.name : file.name}
          </span>
        </h2>
        <button
          class="UppyDashboardContent-back"
          title="Finish editing file"
          onclick=${() => done(meta, file.id)}>
          Done
        </button>
      </div>

      ${fileCardFor
        ? html`
          <div class="UppyDashboardFileCard-inner">
            <div class="UppyDashboardFileCard-preview">
              ${file.preview
                ? html`<img alt="${file.name}" src="${file.preview}">`
                : html`<div class="UppyDashboardItem-previewIcon">${getIconByMime(file.type.general)}</div>`
              }
            </div>
            <div class="UppyDashboardFileCard-info">
              <fieldset class="UppyDashboardFileCard-fieldset">
                <label class="UppyDashboardFileCard-label">Name</label>
                <input
                  class="UppyDashboardFileCard-input"
                  name="name"
                  type="text"
                  value="${file.meta.name}"
                  onkeyup=${tempStoreMeta}/>
              </fieldset>
              ${renderMetaFields(file)}
            </div>
          </div>
        `
        : null
      }
      <button
        class="UppyButton--circular UppyButton--blue UppyButton--sizeM UppyDashboardFileCard-done"
        type="button"
        title="Finish editing file"
        onclick=${() => done(meta, file.id)}>
        ${checkIcon()}
      </button>
    </div>
  `
}
