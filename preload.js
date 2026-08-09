/**
 * The preload script runs before `index.html` is loaded
 * in the renderer. It has access to web APIs as well as
 * Electron's renderer process modules and some polyfilled
 * Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
const { ipcRenderer } = require('electron/renderer')

window.addEventListener('DOMContentLoaded', () => {
	const versions = [
		'node-version',
		'chrome-version',
		'electron-version',
	]
	for (const version of versions) {
		const type = version.split('-')[0]
		document.getElementById(version).innerText = process.versions[type]
	}
	ipcRenderer
		.invoke('invoke-handle-message', 'event-system-info')
		.then((reply) => {
			const { app_instance_id, app_root_path, db_path, app_version } = reply
			document.getElementById('app-instance-id').textContent = app_instance_id
			document.getElementById('root-path').textContent = app_root_path
			document.getElementById('db-path').textContent = db_path
			document.getElementById('app-version').innerHTML = `<ul>
				<li>app "${app_version.app}"</li>
				<li>branch ${app_version.branch}</li>
				<li>operation ${app_version.operation}</li>
			</ul>`
		})
	document.getElementById('button-memtest-node').addEventListener('click', () => {
		ipcRenderer
			.invoke('invoke-handle-message', 'event-system-memtest')
			.then((reply) => {
				document.getElementById('result-memtest-node').textContent =
					JSON.stringify(reply)
			})
	})
	const space_dialog = document.getElementById('dialog-open-space')
	space_dialog.addEventListener('close', () => {
		if (!space_dialog.returnValue)
			return
		ipcRenderer
			.invoke(
				'invoke-handle-message', 'event-windows-add-space',
				space_dialog.returnValue
			)
			.then((reply) => console.log(reply.result))
	})
	document.getElementById('input-space-id').addEventListener('keypress', (event) => {
		if (event.key === 'Enter') {
			event.preventDefault()
			document.getElementById('button-open-space').click()
		}
	})
	document.getElementById('button-open-space').addEventListener('click', () => {
		const result = document.getElementById('input-space-id').value
		space_dialog.close(result)
	})
	document.getElementById('button-add-space').addEventListener('click', () => {
		space_dialog.showModal()
	})
	document.getElementById('button-multicast-discovery').addEventListener('click', () => {
		const tbody = document.getElementById('result-discovery')
		tbody.innerHTML = ''
		const tr = document.createElement('tr')
		const td = document.createElement('td')
		td.textContent = 'loading...'
		tr.appendChild(td)
		tbody.appendChild(tr)
		ipcRenderer.send(
			'asynchronous-message', 'event-multicast-discovery-request'
		)
	})
	ipcRenderer.on('asynchronous-reply', (event, arg, arg2) => {
		if (arg === 'event-recieve-discovery-result') {
			const discovery_result = JSON.parse(arg2)
			const tbody = document.getElementById('result-discovery')
			tbody.innerHTML = ''
			for (let app_id in discovery_result) {
				const tr = document.createElement('tr')
				const td1 = document.createElement('td')
				const td2 = document.createElement('td')
				td1.textContent = app_id
				td2.textContent = discovery_result[app_id]
				td2.style = 'padding-left: 2em;'
				tr.appendChild(td1)
				tr.appendChild(td2)
				tbody.appendChild(tr)
			}
		}
	})
	ipcRenderer.send(
		'asynchronous-message', 'event-register-ipc-render', 'system'
	)
})