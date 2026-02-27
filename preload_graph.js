const { ipcRenderer } = require('electron/renderer')

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('button-show-db').addEventListener('click', () => {
    ipcRenderer
      .invoke('invoke-handle-message', 'select all')
      .then((reply) => {
        document.getElementById('db-listing').textContent = reply
      })
  })
  document.getElementById('button-insert-row').addEventListener('click', () => {
    ipcRenderer
      .invoke('invoke-handle-message', 'insert random row')
      .then((reply) => alert(reply))
  })
})
console.log('preload_graph.js ready')