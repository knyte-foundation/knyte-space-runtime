/**
 * The preload script runs before `index.html` is loaded
 * in the renderer. It has access to web APIs as well as
 * Electron's renderer process modules and some polyfilled
 * Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
const { ipcRenderer } = require('electron/renderer')

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
  document.getElementById('button-memtest-node').addEventListener('click', () => {
    ipcRenderer
      .invoke('invoke-handle-message', 'memtest')
      .then((reply) => {
        document.getElementById('result-memtest-node').textContent = reply
      })
  })
  document.getElementById('button-add-space').addEventListener('click', () => {
    ipcRenderer
      .invoke('invoke-handle-message', 'add space')
      .then((reply) => alert(reply))
  })
})