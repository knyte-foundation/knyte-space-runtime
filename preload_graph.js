const { ipcRenderer } = require('electron/renderer')

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('button-append-content').addEventListener('click', () => {
    const input = document.getElementById('input-append-content').value
    const result = document.getElementById('result-append-content')
    result.textContent = 'loading...'
    setTimeout(() => {
      ipcRenderer
        .invoke('invoke-handle-message', 'event-db-append-content', input)
        .then((reply) => {
          result.textContent = reply.id || `ERROR: ${reply.error ? reply.error.message : 'unknown'}`
        })
    }, 100)
  })
  document.getElementById('button-find-content-by-text').addEventListener('click', () => {
    const input = document.getElementById('input-find-content-by-text').value
    const result = document.getElementById('result-find-content-by-text')
    result.textContent = 'loading...'
    setTimeout(() => {
      ipcRenderer
        .invoke('invoke-handle-message', 'event-db-find-content-by-text', input)
        .then((reply) => {
          result.textContent = reply.id || (
            reply.not_found ? 'not found' : `ERROR: ${reply.error ? reply.error.message : 'unknown'}`
          )
        })
    }, 100)
  })
  document.getElementById('button-find-content-by-id').addEventListener('click', () => {
    const input = document.getElementById('input-find-content-by-id').value
    const result = document.getElementById('result-find-content-by-id')
    result.style.color = 'black'
    result.textContent = 'loading...'
    setTimeout(() => {
      ipcRenderer
        .invoke('invoke-handle-message', 'event-db-find-content-by-id', input)
        .then((reply) => {
          if (reply.content) {
            result.value = reply.content
          } else {
            result.style.color = 'red'
            result.value = reply.not_found ? 'not found'
              : `ERROR: ${reply.error ? reply.error.message : 'unknown'}`
          }
        })
    }, 100)
  })
  document.getElementById('button-show-contents').addEventListener('click', () => {
    const result = document.getElementById('result-show-contents')
    result.textContent = 'loading...'
    setTimeout(() => {
      ipcRenderer
        .invoke('invoke-handle-message', 'event-db-show-contents')
        .then((reply) => {
          result.textContent = JSON.stringify(reply, null, '\t')
        })
    }, 100)
  })
  document.getElementById('button-add-operation').addEventListener('click', () => {
    const result = document.getElementById('result-add-operation')
    result.textContent = 'loading...'
    const desc = {
      command: document.getElementById('select-operation-command').value,
      target: document.getElementById('input-operation-target').value,
      parameter: document.getElementById('input-operation-parameter').value
    }
    setTimeout(() => {
      ipcRenderer
        .invoke('invoke-handle-message', 'event-db-append-operation', desc)
        .then((reply) => {
          result.textContent = reply.id ||
            `ERROR: ${reply.error ? reply.error.message : 'unknown'}`
        })
    }, 100)
  })
})
console.log('preload_graph.js ready')