const { ipcRenderer } = require('electron/renderer')

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('button-render-history').addEventListener('click', () => {
    const svg = document.getElementById('svg-history')
    ipcRenderer
      .invoke('invoke-handle-message', 'event-db-show-history')
      .then((reply) => {
        svg.innerHTML = ''
        let cy = 32
        for (let i = 0; i < reply.length; ++i) {
          const element = document.createElementNS(
            'http://www.w3.org/2000/svg', 'circle'
          );
          element.setAttribute('cx', 32)
          element.setAttribute('cy', cy)
          element.setAttribute('r', 16)
          element.setAttribute('stroke-width', 4)
          element.setAttribute('stroke', '#9DA2A6')
          element.setAttribute('fill', '#1C2333')
          svg.append(element)
          cy += 64
        }
      })
  })
})

console.log('preload_history.js ready')