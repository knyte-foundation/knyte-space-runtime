const { ipcRenderer } = require('electron/renderer')
const { contextBridge } = require('electron')
let space_number = 0, space_id, knytes = {}
const arg1 = `--window-caption-number=`
const arg2 = `--space_knyte-id=`
for (let i = 0; i < process.argv.length; ++i) {
	const arg = process.argv[i]
	if (arg.indexOf(arg1) > -1)
		space_number = parseInt(arg.split(arg1)[1])
	else if (arg.indexOf(arg2) > -1)
		space_id = arg.split(arg2)[1]
}
const window_id = `space ${space_number}`
function convert_client_to_local(currentTarget, clientX, clientY) {
	const rect = currentTarget.getBoundingClientRect()
	return {
		localX: clientX - rect.left,
		localY: clientY - rect.top,
	}
}
function create_shape_rect(desc) {
	const {default_size, stroke_width, stroke_color, fill_color} = desc
	const shape = document.createElementNS(
		'http://www.w3.org/2000/svg', 'rect'
	);
	shape.setAttribute('width', default_size)
	shape.setAttribute('height', default_size)
	shape.setAttribute('stroke-width', stroke_width)
	shape.setAttribute('stroke', stroke_color)
	shape.setAttribute('fill', fill_color)
	return shape
}
function create_shape_circle(desc) {
	const {default_size, stroke_width, stroke_color, fill_color} = desc
	const shape = document.createElementNS(
		'http://www.w3.org/2000/svg', 'circle'
	);
	shape.setAttribute('cx', 0)
	shape.setAttribute('cy', 0)
	shape.setAttribute('r', 0.5*default_size)
	shape.setAttribute('stroke-width', stroke_width)
	shape.setAttribute('stroke', stroke_color)
	shape.setAttribute('fill', fill_color)
	return shape
}
function render_knoxel_body(knoxel, create_shape) {
	const {knoxel_id, knyte_id, x, y} = knoxel
	const body = document.createElementNS(
		'http://www.w3.org/2000/svg', 'g'
	);
	body.id = knoxel_id
	body.dataset.knyte_id = knyte_id
	body.classList.add('space_knoxel')
	body.setAttribute('transform', `translate(${x}, ${y})`)
	const default_size = 32, stroke_width = 4,
		stroke_color = '#9DA2A6', fill_color = '#1C2333'
	const center = document.createElementNS(
		'http://www.w3.org/2000/svg', 'g'
	);
	center.setAttribute('transform', `translate(${-0.5*default_size}, ${-0.5*default_size})`)
	const shape = create_shape({
		default_size, stroke_width, stroke_color, fill_color
	})
	center.append(shape)
	body.append(center)
	return body	
}
function render_knoxel_body_solid(knoxel) {
	return render_knoxel_body(knoxel, create_shape_rect)
}
function render_knoxel_body_broken(knoxel) {
	return render_knoxel_body(knoxel, create_shape_circle)
}
function render_space(root_space_id, knytes, space_desc) {
	const svg = document.getElementById('svg-space')
	svg.dataset.knyte_id = root_space_id
	const knoxel_bodies = svg.getElementsByClassName('knoxel-bodies')[0]
	knoxel_bodies.innerHTML = ''
	for (let i = 0; i < space_desc.length; ++i) {
		const knoxel = space_desc[i]
		const body = knoxel.knyte_id in knytes
			? render_knoxel_body_solid(knoxel)
			: render_knoxel_body_broken(knoxel)
		knoxel_bodies.append(body)
	}
}
function show_space() {
	document.title = `${window_id} ${space_id}`
	ipcRenderer
		.invoke('invoke-handle-message', 'event-get-space-desc', space_id)
		.then((reply) => {
			document.body.style.margin = ''
			const error_report = document.getElementById('pre-space-error-report')
			error_report.style.color = ''
			error_report.style.display = ''
			error_report.textContent = ''
			const render_result = document.getElementById('div-space-result')
			render_result.style.display = 'none'
			const {desc, error} = reply
			if (desc) {
				if (!desc.history_focus.is_present)
					document.title = `${document.title} [read-only]`
				knytes = desc.knytes
				if (desc.space_id in knytes) {
					const space_knyte = knytes[desc.space_id]
					const {content} = space_knyte
					if (!content) {
						error_report.style.color = 'red'
						error_report.textContent = 'content not defined'
					} else {
						ipcRenderer
							.invoke('invoke-handle-message', 'event-db-find-content-by-id', content)
							.then((reply) => {
								let space_desc, need_render
								if (reply.content) {
									try {
										space_desc = JSON.parse(reply.content)
										const is_array = Array.isArray(space_desc)
										if (is_array) {
											need_render = true
										}
										else {
											error_report.style.color = 'red'
											error_report.textContent = `content is not array\n\n${
												reply.content
											}`
										}
									} catch (error) {
										error_report.style.color = 'red'
										error_report.textContent = `content is not valid JSON\n\n${
											reply.content
										}`
									}
								} else {
									error_report.style.color = 'red'
									error_report.textContent = reply.not_found
										? 'content text not found'
										: `ERROR: ${reply.error ? reply.error.message : 'unknown'}`
								}
								if (need_render) {
									document.body.style.margin = 0
									error_report.style.display = 'none'
									render_result.style.display = ''
									render_space(space_id, knytes, space_desc)
								}
							})
					}
				} else {
					error_report.style.color = 'red'
					error_report.textContent = `space ${desc.space_id} not found in knytes`
				}
			} else if (error) {
				error_report.style.color = 'red'
				error_report.textContent = JSON.stringify(error, null, '\t')
			}
		})
}
contextBridge.exposeInMainWorld('core_api', {
	create_knoxel_for_knyte: (desc) => {
		desc.root_space_id = space_id
		desc.root_space_content_id = knytes[space_id].content
		return ipcRenderer.invoke('invoke-handle-message', 'event-create-knoxel-for-knyte', desc)
	},
	create_knyte_and_knoxel: (desc) => {
		desc.root_space_id = space_id
		desc.root_space_content_id = knytes[space_id].content
		return ipcRenderer.invoke('invoke-handle-message', 'event-create-knyte-and-knoxel', desc)
	}
})
window.addEventListener('DOMContentLoaded', () => {
	show_space()
	ipcRenderer.on('asynchronous-reply', (event, arg) => {
		if (arg === 'event-set-operation-in-focus') {
			show_space()
		} else if (arg === 'event-add-operation') {
			show_space()
		}
	})
	ipcRenderer.send('asynchronous-message', 'event-register-ipc-space', window_id)
})
console.log(`preload_space.js ${space_number} ${space_id} ready`)