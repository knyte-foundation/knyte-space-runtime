const { ipcRenderer } = require('electron/renderer')
let present_operation_id;

window.addEventListener('DOMContentLoaded', () => {
  function handle_click_show_history() {
    const svg = document.getElementById('svg-history');
    const hixel_bodies = svg.getElementsByClassName('hixel-bodies')[0]
    const hixel_links = svg.getElementsByClassName('hixel-links')[0]
    ipcRenderer
      .invoke('invoke-handle-message', 'event-db-show-history')
      .then((reply) => {
        function set_operation_in_focus(node) {
          const prior_id = svg.dataset.operation_in_focus
          if (prior_id) {
            const prior_node = document.getElementById(prior_id)
            prior_node.setAttribute('fill', '#1C2333')
          }
          const is_present = node.id === present_operation_id
          const selection_color = is_present ? '#FFB266' : '#F2AAEC'
          node.setAttribute('fill', selection_color)
          svg.dataset.operation_in_focus = node.id
          ipcRenderer.send(
            'asynchronous-message', 'event-set-operation-in-focus',
            node.id, is_present
          )
        }
        hixel_bodies.innerHTML = ''
        hixel_links.innerHTML = ''
        if (reply.error) {
          present_operation_id = ''
          alert(`ERROR: ${reply.error.message}`)
          return
        }
        let cx = 32, cy = 32, r = 16, stroke_width = 4, cy_prior, node
        for (let i = 0; i < reply.length; ++i) {
          const operation = reply[i]
          node = document.createElementNS(
            'http://www.w3.org/2000/svg', 'circle'
          );
          node.id = operation.id
          node.classList.add('hixel-selectable')
          node.setAttribute('cx', cx)
          node.setAttribute('cy', cy)
          node.setAttribute('r', r)
          node.setAttribute('stroke-width', stroke_width)
          node.setAttribute('stroke', '#9DA2A6')
          node.setAttribute('fill', '#1C2333')
          node.addEventListener('click', (event) => {
            set_operation_in_focus(event.target)
          })
          hixel_bodies.append(node)
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
            hixel_links.append(link)
          }
          cy_prior = cy
          cy += 80
        }
        present_operation_id = node.id
        set_operation_in_focus(node)
      })
  }
  document.getElementById('button-render-history').addEventListener('click',
    handle_click_show_history
  )
  document.getElementById('button-add-history-branch').addEventListener('click', () => {
    ipcRenderer
      .invoke('invoke-handle-message', 'event-db-add-history-branch')
      .then((reply) => {
        if (!reply.id) {
          alert(`ERROR: ${reply.error ? reply.error.message : 'unknown'}`)
          return
        }
        alert(`History branch ${reply.id} added`)
      })
  })
  ipcRenderer.on('asynchronous-reply', (event, arg, arg2) => {
    if (arg === 'event-add-operation') {
      handle_click_show_history()
    }
  })  
  ipcRenderer.send(
    'asynchronous-message', 'event-register-ipc-render', 'history'
  )
})

console.log('preload_history.js ready')