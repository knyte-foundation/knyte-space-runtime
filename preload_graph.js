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

		const focused_branch_id = document.getElementById('input-focused-branch-id').value
		const last_operation_id = document.getElementById('input-last-operation-id').value
		result.textContent = 'loading...'
		const desc = {
			command: document.getElementById('select-operation-command').value,
			target: document.getElementById('input-operation-target').value,
			parameter: document.getElementById('input-operation-parameter').value,
			history_branch_in_focus: focused_branch_id || null,
			operation_in_focus: last_operation_id || null,
		}
		setTimeout(() => {
			ipcRenderer
				.invoke('invoke-handle-message', 'event-db-add-operation', desc)
				.then((reply) => {
					if (reply.id) {
						result.textContent = reply.id
						const patch_desc = {
							parent_branch_id: focused_branch_id, parent_operation_id: last_operation_id,
							new_operation: reply
						}
						ipcRenderer.send(
							'asynchronous-message', 'event-add-operation', patch_desc
						)
					} else {
						result.textContent = `ERROR: ${reply.error ? reply.error.message : 'unknown'}`
					}
				})
		}, 100)
	})
	function handle_click_show_knytes() {
		const result = document.getElementById('result-show-knytes')
		const focused_branch_id = document.getElementById('input-focused-branch-id').value
		const last_operation_id = document.getElementById('input-last-operation-id').value
		result.textContent = 'loading...'
		setTimeout(() => {
			ipcRenderer
				.invoke(
					'invoke-handle-message', 'event-db-get-history-line',
					focused_branch_id, last_operation_id
				)
				.then((reply) => {
					if (!reply.line) {
						result.textContent = `ERROR: ${reply.error ? reply.error.message : 'unknown'}`
						return
					}
					const knytes = {};
					for (let i = 0; i < reply.line.length; ++i) {
						const { id, command, target, parameter } = reply.line[i]
						if (command === '0188dd27-0a2a-746a-976b-b705e8b16a1d') {
							// create knyte
							!knytes[target] && (knytes[target] = {})
						} else if (command === '0188dd27-0d1f-7d9f-8d58-b928173ace6f') {
							// remove knyte
							knytes[target] && (delete knytes[target])
						} else if (command === '0188dd27-0f25-7763-8a72-fcdb42a3432f') {
							// set knyte initial
							knytes[target] && (knytes[target].initial = parameter)
						} else if (command === '0188dd27-1114-777d-879a-d1b8bd08f08d') {
							// set knyte terminal
							knytes[target] && (knytes[target].terminal = parameter)
						} else if (command === '0188dd27-12f5-732d-b53d-6e9519f5ac29') {
							// set knyte content
							knytes[target] && (knytes[target].content = parameter)
						}
					}
					result.textContent = JSON.stringify(knytes, null, '\t')
				})
		}, 100)
	}
	document.getElementById('button-show-knytes').addEventListener('click',
		handle_click_show_knytes
	)
	document.getElementById('button-generate-knit').addEventListener('click', () => {
		document.getElementById('result-generate-knit').value =
			ipcRenderer.sendSync('synchronous-message', 'uuidv7')
	})
	document.getElementById('button-get-operation').addEventListener('click', () => {
		document.getElementById('result-get-operation').textContent = 'not implemented yet'
	})
	document.getElementById('button-link').addEventListener('click', () => {
		document.getElementById('result-link').textContent = 'not implemented yet'
	})
	document.getElementById('button-edit-start').addEventListener('click', () => {
		document.getElementById('input-edit-content').textContent = 'not implemented yet'
	})
	document.getElementById('button-edit-submit').addEventListener('click', () => {
		document.getElementById('result-edit').textContent = 'not implemented yet'
	})
	ipcRenderer.on('asynchronous-reply', (event, arg, arg2, arg3, arg4) => {
		if (arg === 'event-set-operation-in-focus') {
			const new_focused_branch_id = arg2
			const new_last_operation_id = arg3
			const new_is_focus_on_present = arg4
			document.getElementById('input-focused-branch-id').value = new_focused_branch_id
			document.getElementById('input-last-operation-id').value = new_last_operation_id
			document.getElementById('caption-focused-branch-id').textContent = new_focused_branch_id
			document.getElementById('result-is-present').textContent = new_is_focus_on_present
				? 'present' : 'past'
			handle_click_show_knytes()
		}
	})
	ipcRenderer.send('asynchronous-message', 'event-register-ipc-render', 'graph')
})

console.log('preload_graph.js ready')