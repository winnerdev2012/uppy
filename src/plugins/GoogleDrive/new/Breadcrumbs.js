const html = require('yo-yo')
const Breadcrumb = require('./Breadcrumb')

module.exports = (props) => {
  return html`
    <ul class="UppyGoogleDrive-breadcrumbs">
      ${
        props.directories.map((directory) => {
          return Breadcrumb({
            getNextFolder: () => props.getNextFolder(directory.id, directory.title),
            title: directory.title
          })
        })
      }
    </ul>
  `
}
