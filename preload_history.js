const { ipcRenderer } = require('electron/renderer')
// TODO: figure out how to use proper module instead
// for now I can't include uuid to preload process, have no idea why
  // const { NIL: uuid_nil } = require('uuid')
const uuid_nil = '00000000-0000-0000-0000-000000000000'
const first_history_branch_id = uuid_nil
let present_operation_ids = {};

function optree_id_to_name(id) {
  return `optree_${id}`
}
function optree_name_to_id(name) {
  return name.split('optree_')[1]
}
window.addEventListener('DOMContentLoaded', () => {
  function handle_click_show_history() {
    const svg = document.getElementById('svg-history');
    const hixel_bodies = svg.getElementsByClassName('hixel-bodies')[0]
    const hixel_links = svg.getElementsByClassName('hixel-links')[0]
    ipcRenderer
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
          const history_branch_in_focus = node.dataset.history_branch_id
          const operation_in_focus = node.id
          svg.dataset.history_branch_in_focus = history_branch_in_focus
          svg.dataset.operation_is_present = is_present
          svg.dataset.operation_in_focus = operation_in_focus
          ipcRenderer.send(
            'asynchronous-message', 'event-set-operation-in-focus',
            history_branch_in_focus, operation_in_focus, is_present
          )
        }
        hixel_bodies.innerHTML = ''
        hixel_links.innerHTML = ''
        present_operation_ids = {}
        let default_operation_in_focus_id
        const present_operations_in_branches = {}
        if (reply.error) {
          alert(`ERROR: ${reply.error.message}`)
          return
        }
        if (first_history_branch_id in reply.branches) {
          const branch_id = first_history_branch_id
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
          present_operations_in_branches[branch_id] = node.id
          default_operation_in_focus_id = node.id
        }
        const sorted_branches = {}; // {root_branch: [root_operations]}
        sorted_branches[first_history_branch_id] = []
        for (let branch_id in reply.branches) {
          if (branch_id === first_history_branch_id)
            continue
          const branch = reply.branches[branch_id]
          const first_operation = branch[0]
          const root_branch = first_operation.target
          const root_operation = first_operation.parameter
          !(root_branch in sorted_branches) && (sorted_branches[root_branch] = [])
          sorted_branches[root_branch].push({
            root_branch, root_operation, branch, branch_id
          })
        }
        for (let root_branch in sorted_branches)
          sorted_branches[root_branch].sort((a, b) => {
            if (a.root_operation < b.root_operation) return 1
            if (a.root_operation > b.root_operation) return -1
            return 0
          })
        const render_sequence = []
        function fill_render_sequence(root_branch) {
          console.log('fill_render_sequence', root_branch)
          const sequence = sorted_branches[root_branch]
          for (let i = 0; i < sequence.length; ++i) {
            const element = sequence[i]
            render_sequence.push(element)
            if (element.branch_id in sorted_branches)
              fill_render_sequence(element.branch_id)
          }
        }
        fill_render_sequence(first_history_branch_id)
        let cx = 32 + 80
        for (let i = 0; i < render_sequence.length; ++i) {
          const {root_operation, branch, branch_id} = render_sequence[i]
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
          present_operation_ids[node.id] = true
          present_operations_in_branches[branch_id] = node.id
          cx += 80
        }
        const prior_operation_in_focus = svg.dataset.operation_in_focus || null
        const prior_branch_in_focus = svg.dataset.history_branch_in_focus
        const prior_is_present = svg.dataset.operation_is_present
        let initial_operation_in_focus
        if (!prior_operation_in_focus)
          initial_operation_in_focus = default_operation_in_focus_id
        else if (prior_is_present !== 'true')
          initial_operation_in_focus = prior_operation_in_focus
        else
          initial_operation_in_focus = present_operations_in_branches[prior_branch_in_focus]
        if (initial_operation_in_focus) {
          const node = document.getElementById(initial_operation_in_focus)
          node && set_operation_in_focus(node)
        }
      })
  }
  document.getElementById('button-render-history').addEventListener('click',
    handle_click_show_history
  )
  document.getElementById('button-add-history-branch').addEventListener('click', () => {
    const svg = document.getElementById('svg-history')
    const result = document.getElementById('result-add-history-branch')
    const root_operation_id = svg.dataset.operation_in_focus
    const root_branch_id = svg.dataset.history_branch_in_focus
    ipcRenderer
      .invoke(
        'invoke-handle-message', 'event-db-add-history-branch',
        root_branch_id, root_operation_id
      )
      .then((reply) => {
        if (reply.id) {
          ipcRenderer.send(
            'asynchronous-message', 'event-add-history-branch'
          )
          result.textContent = optree_id_to_name(reply.id)
        } else {
          result.textContent = `ERROR: ${reply.error ? reply.error.message : 'unknown'}`
        }
      })
  })
  ipcRenderer.on('asynchronous-reply', (event, arg, arg2) => {
    if (arg === 'event-add-operation') {
      handle_click_show_history()
    }
    else if (arg === 'event-add-history-branch') {
      handle_click_show_history()
    }
  })
  ipcRenderer.send(
    'asynchronous-message', 'event-register-ipc-render', 'history'
  )
})

console.log('preload_history.js ready')