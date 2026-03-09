const { ipcRenderer } = require('electron/renderer')
let space_number = 0, space_id
const arg1 = `--window-caption-number=`
const arg2 = `--space_knyte-id=`
for (let i = 0; i < process.argv.length; ++i) {
	const arg = process.argv[i]
	if (arg.indexOf(arg1) > -1)
		space_number = parseInt(arg.split(arg1)[1])
	else if (arg.indexOf(arg2) > -1)
		space_id = arg.split(arg2)[1]
}
window.addEventListener('DOMContentLoaded', () => {
	document.title = `${document.title} ${space_number} ${space_id}`
	ipcRenderer
		.invoke('invoke-handle-message', 'event-get-space-desc', space_id)
		.then((reply) => {
			const placeholder = document.getElementById('placeholder')
			placeholder.style.color = ''
			const {desc, error} = reply
			if (desc) {
				if (!desc.history_focus.is_present)
					document.title = `${document.title} [read-only]`
				const line = desc.history_line
				const knytes = {};
				for (let i = 0; i < line.length; ++i) {
					const { id, command, target, parameter } = line[i]
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
				if (desc.space_id in knytes) {
					const space_knyte = knytes[desc.space_id]
					const {content} = space_knyte
					if (!content) {
						placeholder.textContent = ''
					} else {
						ipcRenderer
							.invoke('invoke-handle-message', 'event-db-find-content-by-id', content)
							.then((reply) => {
								if (reply.content) {
									placeholder.textContent = reply.content
								} else {
									placeholder.style.color = 'red'
									placeholder.value = reply.not_found ? 'not found'
										: `ERROR: ${reply.error ? reply.error.message : 'unknown'}`
								}
							})
					}
				} else {
					placeholder.style.color = 'red'
					placeholder.textContent = `space ${desc.space_id} not found in knytes`
				}
			} else if (error) {
				placeholder.style.color = 'red'
				placeholder.textContent = JSON.stringify(error, null, '\t')
			}
		})
})
console.log(`preload_space.js ${space_number} ${space_id} ready`)