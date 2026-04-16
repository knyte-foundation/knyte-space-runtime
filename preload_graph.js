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
					result.textContent = reply.id ||
						`ERROR: ${reply.error ? reply.error.message : 'unknown'}`
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
						reply.not_found ? 'not found' :
							`ERROR: ${reply.error ? reply.error.message : 'unknown'}`
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
			command: document.getElementById('select-operation-command').value || null,
			target: document.getElementById('input-operation-target').value || null,
			parameter: document.getElementById('input-operation-parameter').value || null,
		}
		setTimeout(() => {
			ipcRenderer
				.invoke('invoke-handle-message', 'event-db-add-operation', desc)
				.then((reply) => {
					if (reply.id) {
						result.textContent = reply.id
					} else {
						result.textContent = `ERROR: ${
							reply.error ? reply.error.message : 'unknown'
						}`
					}
				})
		}, 100)
	})
	function render_knytes(result, knytes) {
		result.innerHTML = ''
		for (let id in knytes) {
			const knyte = document.createElement('div')
			knyte.id = id
			knyte.textContent = `${id} ${JSON.stringify(knytes[id], null, '\t')}`
			result.appendChild(knyte)
		}
	}
	function patch_knytes(result, knytes_patch) {
		for (let id in knytes_patch) {
			let knyte = document.getElementById(id)
			if (!knyte) {
				knyte = document.createElement('div')
				knyte.id = id
				result.appendChild(knyte)
			}
			knyte.textContent = `${id} ${JSON.stringify(knytes_patch[id], null, '\t')}`
		}
	}
	function handle_click_show_knytes() {
		const result = document.getElementById('result-show-knytes')
		const focused_branch_id = document.getElementById('input-focused-branch-id').value
		const last_operation_id = document.getElementById('input-last-operation-id').value
		result.textContent = 'loading...'
		setTimeout(() => {
			ipcRenderer
				.invoke(
					'invoke-handle-message', 'event-get-knytes',
					focused_branch_id, last_operation_id
				)
				.then((reply) => {
					if (!reply.knytes) {
						result.textContent = `ERROR: ${
							reply.error ? reply.error.message : 'unknown'
						}`
						return
					}
					render_knytes(result, reply.knytes)
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
		const input = document.getElementById('input-edit-target')
		const result = document.getElementById('input-edit-content')
		result.style.color = ''
		result.value = 'loading...'
		const knyte_id = input.value
		setTimeout(() => {
			ipcRenderer
				.invoke(
					'invoke-handle-message', 'event-get-knyte-content',
					knyte_id
				)
				.then((reply) => {
					if (reply.content === undefined) {
						result.style.color = 'red'
						result.value = `ERROR: ${
							reply.error ? reply.error.message : 'unknown'
						}`
						return
					}
					result.value = reply.content
				})
		}, 100)
	})
	document.getElementById('button-edit-submit').addEventListener('click', () => {
		const input1 = document.getElementById('input-edit-target')
		const input2 = document.getElementById('input-edit-content')
		const result = document.getElementById('result-edit')
		result.textContent = 'loading...'
		const knyte_id = input1.value
		const content = input2.value
		setTimeout(() => {
			ipcRenderer
				.invoke(
					'invoke-handle-message', 'event-submit-knyte-content',
					knyte_id, content
				)
				.then((reply) => {
					if (reply.id === undefined) {
						result.textContent = `ERROR: ${
							reply.error ? reply.error.message : 'unknown'
						}`
						return
					}
					result.textContent = reply.id
				})
		}, 100)
	})
	ipcRenderer.on('asynchronous-reply', (event, arg, arg2, arg3, arg4) => {
		function render_history_focus(history_focus) {
			const {branch_id, operation_id, is_present} = history_focus
			document.getElementById('input-focused-branch-id').value = branch_id
			document.getElementById('input-last-operation-id').value = operation_id
			document.getElementById('caption-focused-branch-id').textContent = branch_id
			document.getElementById('result-is-present').textContent = is_present
				? 'present' : 'past'
		}
		if (arg === 'event-change-operation-in-focus') {
			const history_focus = arg2
			render_history_focus(history_focus)
			handle_click_show_knytes()
			console.log(`complete redraw knytes by ${arg}`)
		} else if (arg === 'event-add-operation') {
			const knytes_patch = arg2
			const history_focus = arg3
			render_history_focus(history_focus)
			const result = document.getElementById('result-show-knytes')
			patch_knytes(result, knytes_patch)
			console.log(`patch knytes by ${arg}`, knytes_patch)
		}
	})
	ipcRenderer.send('asynchronous-message', 'event-register-ipc-render', 'graph')
})

console.log('preload_graph.js ready')