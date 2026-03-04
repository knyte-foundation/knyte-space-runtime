const { ipcRenderer } = require('electron/renderer')
const uuid_nil = '00000000-0000-0000-0000-000000000000'
// TODO: figure out how to use proper module instead
// for now I can't include uuid to preload process, have no idea why
  // const { NIL: uuid_nil } = require('uuid')
let present_operation_ids = {};

window.addEventListener('DOMContentLoaded', () => {
  function handle_click_show_history() {
    const svg = document.getElementById('svg-history');
    const hixel_bodies = svg.getElementsByClassName('hixel-bodies')[0]
    const hixel_links = svg.getElementsByClassName('hixel-links')[0]
    ipcRenderer
      //.invoke('invoke-handle-message', 'event-db-show-history')
      .invoke('invoke-handle-message', 'event-db-get-history-branches')
      .then((reply) => {
        function set_operation_in_focus(node) {
          const prior_id = svg.dataset.operation_in_focus
          if (prior_id) {
            const prior_node = document.getElementById(prior_id)
            prior_node.setAttribute('fill', '#1C2333')
          }
          const is_present = node.id in present_operation_ids
          const selection_color = is_present ? '#FFB266' : '#F2AAEC'
          node.setAttribute('fill', selection_color)
          svg.dataset.operation_in_focus = node.id
          svg.dataset.history_branch_in_focus = node.dataset.history_branch_id
          ipcRenderer.send(
            'asynchronous-message', 'event-set-operation-in-focus',
            node.id, is_present, node.dataset.history_branch_id
          )
        }
        hixel_bodies.innerHTML = ''
        hixel_links.innerHTML = ''
        let default_operation_in_focus
        if (reply.error) {
          present_operation_ids = {}
          alert(`ERROR: ${reply.error.message}`)
          return
        }
        if (!(uuid_nil in reply.branches)) {
          present_operation_ids = {}
          alert(`ERROR: first history branch ${uuid_nil} not found`)
          return
        }
        {
          const branch_id = uuid_nil // first branch id
          const branch = reply.branches[branch_id]
          let cx = 32, cy = 32, r = 16, stroke_width = 4, cy_prior, node
          for (let i = 0; i < branch.length; ++i) {
            const operation = branch[i]
            node = document.createElementNS(
              'http://www.w3.org/2000/svg', 'circle'
            );
            node.id = operation.id
            node.dataset.history_branch_id = branch_id
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
          present_operation_ids[node.id] = true
          default_operation_in_focus = node
        }
        const sorted_branches = [];
        for (let branch_id in reply.branches) {
          if (branch_id === uuid_nil)
            continue
          const branch = reply.branches[branch_id]
          const first_operation = branch[0]
          const root_operation = first_operation.parameter
          sorted_branches.push({root_operation, branch, branch_id})
        }
        sorted_branches.sort((a, b) => b.root_operation.localeCompare(a.root_operation))
        console.log('sorted_branches', sorted_branches)
        let cx = 32 + 80
        for (let i = 0; i < sorted_branches.length; ++i) {
          const {root_operation, branch, branch_id} = sorted_branches[i]
          const root_hixel = document.getElementById(root_operation)
          const node_stroke_color = root_hixel ? '#9DA2A6' : 'red'
          const root_x = root_hixel ? parseFloat(root_hixel.getAttribute('cx')) : 0
          const root_y = root_hixel ? parseFloat(root_hixel.getAttribute('cy')) : 0
          let cy = root_hixel ? root_y + 80 : 32,
            r = 16, stroke_width = 4, cy_prior, node
          for (let i = 0; i < branch.length; ++i) {
            const operation = branch[i]
            node = document.createElementNS(
              'http://www.w3.org/2000/svg', 'circle'
            );
            node.id = operation.id
            node.dataset.history_branch_id = branch_id
            node.classList.add('hixel-selectable')
            node.setAttribute('cx', cx)
            node.setAttribute('cy', cy)
            node.setAttribute('r', r)
            node.setAttribute('stroke-width', stroke_width)
            node.setAttribute('stroke', node_stroke_color)
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
          present_operation_ids[node.id] = true
          if (root_hixel) {
            {
              const link = document.createElementNS(
                'http://www.w3.org/2000/svg', 'line'
              );
              link.setAttribute('x1', root_x + r + stroke_width + 1)
              link.setAttribute('y1', root_y)
              link.setAttribute('x2', cx)
              link.setAttribute('y2', root_y)
              link.setAttribute('stroke-width', stroke_width)
              link.setAttribute('stroke', '#9DA2A6')
              link.setAttribute('marker-start', 'url(#marker_trace_start)')
              hixel_links.append(link)
            }
            {
              const link = document.createElementNS(
                'http://www.w3.org/2000/svg', 'line'
              );
              link.setAttribute('x1', cx)
              link.setAttribute('y1', root_y)
              link.setAttribute('x2', cx)
              link.setAttribute('y2', root_y + 80 - r - 5*stroke_width)
              link.setAttribute('stroke-width', stroke_width)
              link.setAttribute('stroke', '#9DA2A6')
              link.setAttribute('marker-end', 'url(#marker_trace_end)')
              hixel_links.append(link)
            }
          }
          cx += 80
        }
        default_operation_in_focus && set_operation_in_focus(default_operation_in_focus)
      })
  }
  document.getElementById('button-render-history').addEventListener('click',
    handle_click_show_history
  )
  document.getElementById('button-add-history-branch').addEventListener('click', () => {
    const svg = document.getElementById('svg-history');
    const root_operation_id = svg.dataset.operation_in_focus
    const root_branch_id = svg.dataset.history_branch_in_focus
    ipcRenderer
      .invoke(
        'invoke-handle-message', 'event-db-add-history-branch',
        root_branch_id, root_operation_id
      )
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