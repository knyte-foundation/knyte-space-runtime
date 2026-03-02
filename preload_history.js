const { ipcRenderer } = require('electron/renderer')

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('button-render-history').addEventListener('click', () => {
    const hixels = document.getElementById('hixels')
    ipcRenderer
      .invoke('invoke-handle-message', 'event-db-show-history')
      .then((reply) => {
        hixels.innerHTML = ''
        let cx = 32, cy = 32, r = 16, stroke_width = 4, cy_prior
        for (let i = 0; i < reply.length; ++i) {
          const operation = reply[i]
          const node = document.createElementNS(
            'http://www.w3.org/2000/svg', 'circle'
          );
          node.id = operation.id
          node.setAttribute('cx', cx)
          node.setAttribute('cy', cy)
          node.setAttribute('r', r)
          node.setAttribute('stroke-width', stroke_width)
          node.setAttribute('stroke', '#9DA2A6')
          node.setAttribute('fill', '#1C2333')
          hixels.append(node)
          if (i > 0) {
            const link = document.createElementNS(
              'http://www.w3.org/2000/svg', 'line'
            );
            link.setAttribute('x1', cx)
            link.setAttribute('y1', cy_prior + r + stroke_width + 1)
            link.setAttribute('x2', cx)
            link.setAttribute('y2', cy - r - 5*stroke_width)
            link.setAttribute('stroke-width', stroke_width)
            link.setAttribute('stroke', '#9DA2A6')
            link.setAttribute('marker-start', 'url(#marker_trace_start)')
            link.setAttribute('marker-end', 'url(#marker_trace_end)')
            hixels.append(link)
          }
          cy_prior = cy
          cy += 80
        }
      })
  })
})

console.log('preload_history.js ready')