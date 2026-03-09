const { ipcRenderer } = require('electron/renderer')
const uuid_nil = ipcRenderer.sendSync('synchronous-message', 'uuid_nil')

function optree_id_to_name(id) {
	return `optree_${id}`
}
function optree_name_to_id(name) {
	return name.split('optree_')[1]
}
window.addEventListener('DOMContentLoaded', () => {
	function highlight_focus(new_focus_branch_id, new_last_operation_id, new_is_focus_on_present) {
		const svg = document.getElementById('svg-history');
		const hixel_focus_node = document.getElementById(new_last_operation_id)
		if (hixel_focus_node) {
			const prior_id = svg.dataset.operation_id
			const hixel_prior_node = prior_id ? document.getElementById(prior_id) : null
			hixel_prior_node && hixel_prior_node.setAttribute('fill', '#1C2333')
			svg.dataset.branch_id = new_focus_branch_id
			svg.dataset.operation_id = new_last_operation_id
			const selection_color = new_is_focus_on_present ? '#FFB266' : '#F2AAEC'
			hixel_focus_node.setAttribute('fill', selection_color)
		}
	}
	function handle_show_history(render_sequence) {
		const svg = document.getElementById('svg-history');
		const hixel_bodies = svg.getElementsByClassName('hixel-bodies')[0]
		const hixel_links = svg.getElementsByClassName('hixel-links')[0]
		function set_operation_in_focus(node) {
			const history_branch_in_focus = node.dataset.history_branch_id
			const operation_in_focus = node.id
			ipcRenderer
				.invoke(
					'invoke-handle-message', 'event-set-operation-in-focus',
					history_branch_in_focus, operation_in_focus
				)
				.then((reply) => {
					const { history_focus, error } = reply
					if (history_focus) {
						const {branch_id, operation_id, is_present} = history_focus
						highlight_focus(branch_id, operation_id, is_present)
					} else if (error) {
						alert(JSON.stringify(error))
					}
				})
		}
		hixel_bodies.innerHTML = ''
		hixel_links.innerHTML = ''
		let cx = 32, cy = 32, r = 16, stroke_width = 4, cy_prior, node
		for (let i = 0; i < render_sequence.length; ++i) {
			const { root_operation, branch, branch_id } = render_sequence[i]
			const root_hixel = root_operation === uuid_nil ? undefined : document.getElementById(root_operation)
			const node_stroke_color = root_hixel !== null ? '#9DA2A6' : 'red'
			// in 2 lines of code above
				// root_hixel = null means it's not found, but required, warning situation, use red color
				// and root_hixel = undefined means it's not required, use normal color
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
					link.setAttribute('y2', cy - r - 5 * stroke_width)
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
					link.setAttribute('y2', root_y + 80 - r - 5 * stroke_width)
					link.setAttribute('stroke-width', stroke_width)
					link.setAttribute('stroke', '#9DA2A6')
					link.setAttribute('marker-end', 'url(#marker_trace_end)')
					hixel_links.append(link)
				}
			}
			cx += 80
		}
	}
	document.getElementById('button-add-history-branch').addEventListener('click', () => {
		const svg = document.getElementById('svg-history')
		const result = document.getElementById('result-add-history-branch')
		const root_branch_id = svg.dataset.branch_id
		const root_operation_id = svg.dataset.operation_id
		ipcRenderer
			.invoke(
				'invoke-handle-message', 'event-db-add-history-branch',
				root_branch_id, root_operation_id
			)
			.then((reply) => {
				if (reply.id) {
					result.textContent = optree_id_to_name(reply.id)
					ipcRenderer.send(
						'asynchronous-message', 'event-add-history-branch'
					)
				} else {
					result.textContent = `ERROR: ${reply.error ? reply.error.message : 'unknown'}`
				}
			})
	})
	ipcRenderer.on('asynchronous-reply', (event, arg, arg2, arg3, arg4) => {
		if (arg === 'event-add-operation') {
			const patch_desc = arg2
			console.log('patch_desc', patch_desc)
			// TODO: optimize history view update
			const render_sequence = arg3
			const history_focus = arg4
			const {branch_id, operation_id, is_present} = history_focus
			handle_show_history(render_sequence)
			highlight_focus(branch_id, operation_id, is_present)
		} else if (arg === 'event-add-history-branch') {
			const render_sequence = arg2
			const history_focus = arg3
			const {branch_id, operation_id, is_present} = history_focus
			handle_show_history(render_sequence)
			highlight_focus(branch_id, operation_id, is_present)
		} else if (arg === 'event-show-history-on-start') {
			const render_sequence = arg2
			console.log('render_sequence', render_sequence)
			handle_show_history(render_sequence)
		} else if (arg === 'event-set-operation-in-focus') {
			const new_focused_branch_id = arg2
			const new_last_operation_id = arg3
			const new_is_focus_on_present = arg4
			highlight_focus(new_focused_branch_id, new_last_operation_id, new_is_focus_on_present)
		}
	})
	ipcRenderer.send(
		'asynchronous-message', 'event-register-ipc-render', 'history'
	)
})

console.log('preload_history.js ready')