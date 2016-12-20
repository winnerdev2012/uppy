const html = require('yo-yo')
const Row = require('./TableRow')

module.exports = (props) => {
  const headers = props.columns.map((column) => {
    return html`
      <th class="BrowserTable-headerColumn BrowserTable-column" onclick=${props.sortByTitle}>
        ${column.name}
      </th>
    `
  })

  return html`
    <table class="BrowserTable">
      <thead class="BrowserTable-header">
        <tr>
          ${headers}
        </tr>
      </thead>
      <tbody>
        ${props.folders.map((folder) => {
          return Row({
            title: folder.title,
            active: props.activeRow === folder.id,
            iconLink: folder.iconLink,
            modifiedByMeDate: folder.modifiedByMeDate,
            handleClick: () => props.handleRowClick(folder.id),
            handleDoubleClick: () => props.handleFolderDoubleClick(folder.id, folder.title),
            columns: props.columns
          })
        })}
        ${props.files.map((file) => {
          return Row({
            title: file.title,
            active: props.activeRow === file.id,
            iconLink: file.iconLink,
            modifiedByMeDate: file.modifiedByMeDate,
            handleClick: () => props.handleRowClick(file.id),
            handleDoubleClick: () => props.handleFileDoubleClick(file),
            columns: props.columns,
            owner: 'Joe Mama'
          })
        })}
      </tbody>
    </table>
  `
}
