/**
 * The preload script runs before `index.html` is loaded
 * in the renderer. It has access to web APIs as well as
 * Electron's renderer process modules and some polyfilled
 * Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
const { ipcRenderer } = require('electron/renderer')

function handle_show_db() {
  ipcRenderer
    .invoke('invoke-handle-message', 'select all')
    .then((reply) => {
      document.getElementById('db-listing').textContent = reply
    })
}
function handle_append_row() {
  ipcRenderer
    .invoke('invoke-handle-message', 'insert random row')
    .then((reply) => alert(reply))
}
function handle_metest_main() {
  ipcRenderer
    .invoke('invoke-handle-message', 'memtest')
    .then((reply) => {
      document.getElementById('result-memtest-node').textContent = reply
    })
}

window.addEventListener('DOMContentLoaded', () => {
  const versions = [
    'node-version',
    'chrome-version',
    'electron-version',
  ]
  for (const version of versions) {
    const type = version.split('-')[0]
    document.getElementById(version).innerText = process.versions[type]
  }

  ipcRenderer
    .invoke('invoke-handle-message', 'db path')
    .then((reply) => {
      const {app_root_path, db_path} = reply
      document.getElementById('root-path').textContent = app_root_path
      document.getElementById('db-path').textContent = db_path
    })

  document.getElementById('button-show-db').addEventListener('click', 
    handle_show_db
  )
  document.getElementById('button-insert-row').addEventListener('click',
    handle_append_row
  )
  document.getElementById('button-memtest-node').addEventListener('click',
    handle_metest_main
  )
  document.getElementById('button-add-space').addEventListener('click', () => {
    ipcRenderer
      .invoke('invoke-handle-message', 'add space')
      .then((reply) => alert(reply))
  })
})