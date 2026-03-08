const { ipcRenderer } = require('electron/renderer')

function optree_id_to_name(id) {
	return `optree_${id}`
}
function optree_name_to_id(name) {
	return name.split('optree_')[1]
}
window.addEventListener('DOMContentLoaded', () => {
	function handle_click_show_history() {
		alert('handle_click_show_history not implemented yet')
	}
	document.getElementById('button-render-history').addEventListener('click',
		handle_click_show_history
	)
	document.getElementById('button-add-history-branch').addEventListener('click', () => {
		alert('add-history-branch not implemented yet')
	})
	ipcRenderer.on('asynchronous-reply', (event, arg, arg2) => {
		if (
			arg === 'event-add-operation' ||
			arg === 'event-add-history-branch' ||
			arg === 'event-show-history-on-start'
		) {
			handle_click_show_history()
		}
	})
	ipcRenderer.send(
		'asynchronous-message', 'event-register-ipc-render', 'history'
	)
})

console.log('preload_history.js ready')