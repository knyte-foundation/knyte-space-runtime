const { ipcRenderer } = require('electron/renderer')

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('button-content-append').addEventListener('click', () => {
    const input = document.getElementById('text-content-append').value
    const result = document.getElementById('content-append-result')
    result.textContent = 'loading...'
    setTimeout(() => {
      ipcRenderer
        .invoke('invoke-handle-message', 'db content append', input)
        .then((reply) => {
          result.textContent = reply.id || `ERROR: ${reply.error ? reply.error.message : 'unknown'}`
        })
    }, 100)
  })
  document.getElementById('button-content-find').addEventListener('click', () => {
    const input = document.getElementById('text-content-find').value
    const result = document.getElementById('content-find-result')
    result.textContent = 'loading...'
    setTimeout(() => {
      ipcRenderer
        .invoke('invoke-handle-message', 'db get id by content', input)
        .then((reply) => {
          result.textContent = reply
        })
    }, 100)
  })
  document.getElementById('button-content-id-find').addEventListener('click', () => {
    const input = document.getElementById('input-content-id-find').value
    const result = document.getElementById('content-id-find-result')
    result.textContent = 'loading...'
    setTimeout(() => {
      ipcRenderer
        .invoke('invoke-handle-message', 'db get content by id', input)
        .then((reply) => {
          result.value = reply
        })
    }, 100)
  })
  document.getElementById('button-show-db-contents').addEventListener('click', () => {
    const result = document.getElementById('db-contents-listing')
    result.textContent = 'loading...'
    setTimeout(() => {
      ipcRenderer
        .invoke('invoke-handle-message', 'db get all contents')
        .then((reply) => {
          result.textContent = reply
        })
    }, 100)
  })
})
console.log('preload_graph.js ready')