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
  document.getElementById('button-content-append').addEventListener('click', () => {
    const input = document.getElementById('text-content-append').value
    const result = document.getElementById('content-append-result')
    result.textContent = 'loading...'
    setTimeout(() => {
      ipcRenderer
        .invoke('invoke-handle-message', 'db content append', input)
        .then((reply) => {
          result.textContent = reply
        })
    }, 100)
  })
})
console.log('preload_graph.js ready')