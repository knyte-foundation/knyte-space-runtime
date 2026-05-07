const { ipcRenderer } = require('electron/renderer')
const { contextBridge } = require('electron')
let space_number = 0, space_id, knytes = {}, contents = {}
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
let autosizer = null
function init_autosizer() {
	const autosizers = document.getElementsByClassName('autosizer')
	autosizer = autosizers[autosizers.length - 1]
}
function get_html_block_size(html) {
	autosizer.innerHTML = html
	const { width, height } = autosizer.getBoundingClientRect()
	autosizer.innerHTML = ''
	return { width, height }
}
function create_shape_rect(desc) {
	const {width, height, stroke_width, stroke_color, fill_color} = desc
	const shape = document.createElementNS(
		'http://www.w3.org/2000/svg', 'rect'
	);
	shape.setAttribute('width', width)
	shape.setAttribute('height', height)
	shape.setAttribute('stroke-width', stroke_width)
	shape.setAttribute('stroke', stroke_color)
	shape.setAttribute('fill', fill_color)
	return shape
}
function create_shape_circle(desc) {
	const {width, height, stroke_width, stroke_color, fill_color} = desc
	const shape = document.createElementNS(
		'http://www.w3.org/2000/svg', 'circle'
	);
	shape.setAttribute('cx', 0)
	shape.setAttribute('cy', 0)
	shape.setAttribute('r', 0.5*width)
	shape.setAttribute('stroke-width', stroke_width)
	shape.setAttribute('stroke', stroke_color)
	shape.setAttribute('fill', fill_color)
	return shape
}
function render_knoxel_body(knoxel, create_shape, centering, content_text) {
	const {knoxel_id, knyte_id, x, y, viewer} = knoxel
	const body = document.createElementNS(
		'http://www.w3.org/2000/svg', 'g'
	)
	body.id = knoxel_id
	body.dataset.knyte_id = knyte_id
	body.classList.add('space-knoxel')
	body.setAttribute('transform', `translate(${x}, ${y})`)
	const is_invalid_content = content_text === null
	const default_size = 32, stroke_width = 4
	const default_margin = 6
	let width = default_size, height = default_size
	const content_div = document.createElement(
		'div'
	)
	let is_invalid_viewer = false
	if (content_text) {
		const viewer_name = viewer || 'plain text'
		if (viewer_name === 'plain text') {
			content_div.style.color = '#F5F9FC'
			content_div.style.whiteSpace = 'pre'
			content_div.style.tabSize = 4
			content_div.style.textAlign = 'left'
			content_div.style.margin = `${default_margin}px`
			content_div.textContent = content_text
		} else if (viewer_name === '2048px text') {
			content_div.style.color = '#F5F9FC'
			content_div.style.whiteSpace = 'pre-wrap'
			content_div.style.tabSize = 4
			content_div.style.maxWidth = '2048px'
			content_div.style.wordWrap = 'break-word'
			content_div.style.textAlign = 'left'
			content_div.style.margin = `${default_margin}px`
			content_div.textContent = content_text
		} else {
			is_invalid_viewer = true
		}
		if (!is_invalid_viewer) {
			const size = get_html_block_size(content_div.outerHTML)
			width = size.width
			height = size.height
		}
	}
	if (is_invalid_content || is_invalid_viewer) {
		content_div.style.color = '#E47D80'
		content_div.style.margin = `${default_margin}px`
		content_div.textContent = `invalid ${
			is_invalid_content ? 'content' : 'viewer'
		}`
		width = 70 + 2*default_margin
		height = 40 + 2*default_margin
	}
	const stroke_color = is_invalid_content || is_invalid_viewer ? '#E47D80' : '#9DA2A6',
		fill_color = '#1C2333'
	const center = document.createElementNS(
		'http://www.w3.org/2000/svg', 'g'
	)
	center.setAttribute('transform', centering
		? `translate(${-0.5*width}, ${-0.5*height})`
		: `translate(0, 0)`
	)
	const shape = create_shape({
		width, height, stroke_width, stroke_color, fill_color
	})
	const foreign_object = document.createElementNS(
		'http://www.w3.org/2000/svg', 'foreignObject'
	)
	foreign_object.style.width = `${width}px`
	foreign_object.style.height = `${height}px`
	foreign_object.append(content_div)
	center.append(shape)
	center.append(foreign_object)
	body.append(center)
	return body
}
function render_knoxel_body_solid(knoxel, content_text) {
	return render_knoxel_body(knoxel, create_shape_rect, true, content_text)
}
function render_knoxel_body_broken(knoxel) {
	return render_knoxel_body(knoxel, create_shape_circle, false)
}
function render_space(root_space_id, knytes, contents, space_desc) {
	const svg = document.getElementById('svg-space')
	svg.dataset.knyte_id = root_space_id
	const knoxel_bodies = svg.getElementsByClassName('knoxel-bodies')[0]
	knoxel_bodies.innerHTML = ''
	for (let i = 0; i < space_desc.length; ++i) {
		const knoxel = space_desc[i]
		const knyte = knytes[knoxel.knyte_id]
		let content_text = null
		if (knyte) {
			if (!knyte.content) {
				content_text = ''
			} else if (contents[knyte.content]) {
				content_text = contents[knyte.content]
			}
		}
		const body = knyte
			? render_knoxel_body_solid(knoxel, content_text)
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
				contents = desc.contents
				if (desc.space_id in knytes) {
					const space_knyte = knytes[desc.space_id]
					const {content} = space_knyte
					if (!content) {
						error_report.style.color = '#E47D80'
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
											error_report.style.color = '#E47D80'
											error_report.textContent = `content is not array\n\n${
												reply.content
											}`
										}
									} catch (error) {
										error_report.style.color = '#E47D80'
										error_report.textContent = `content is not valid JSON\n\n${
											reply.content
										}`
									}
								} else {
									error_report.style.color = '#E47D80'
									error_report.textContent = reply.not_found
										? 'content text not found'
										: `ERROR: ${reply.error ? reply.error.message : 'unknown'}`
								}
								if (need_render) {
									document.body.style.margin = 0
									error_report.style.display = 'none'
									render_result.style.display = ''
									render_space(space_id, knytes, contents, space_desc)
								}
							})
					}
				} else {
					error_report.style.color = '#E47D80'
					error_report.textContent = `space ${desc.space_id} not found in knytes`
				}
			} else if (error) {
				error_report.style.color = '#E47D80'
				error_report.textContent = JSON.stringify(error, null, '\t')
			}
		})
}
contextBridge.exposeInMainWorld('core_api', {
	create_knoxel_for_knyte: (desc) => {
		desc.root_space_id = space_id
		return ipcRenderer.invoke('invoke-handle-message', 'event-create-knoxel-for-knyte', desc)
	},
	create_knyte_and_knoxel: (desc) => {
		desc.root_space_id = space_id
		return ipcRenderer.invoke('invoke-handle-message', 'event-create-knyte-and-knoxel', desc)
	},
	move_knoxels_in_space: (desc) => {
		desc.root_space_id = space_id
		return ipcRenderer.invoke('invoke-handle-message', 'event-move-knoxels-in-space', desc)
	},
	clone_knoxels_in_space: (desc) => {
		desc.root_space_id = space_id
		return ipcRenderer.invoke('invoke-handle-message', 'event-clone-knoxels-in-space', desc)
	},
	export_files: (desc) => {
		return ipcRenderer.invoke('invoke-handle-message', 'event-export-files', desc)
	},
})
window.addEventListener('DOMContentLoaded', () => {
	init_autosizer()
	show_space()
	ipcRenderer.on('asynchronous-reply', (event, arg, arg2) => {
		if (
			arg === 'event-change-operation-in-focus' ||
			arg === 'event-add-operation'
		) {
			show_space()
			console.log(`complete redraw space by ${arg}`)
		}
	})
	ipcRenderer.send('asynchronous-message', 'event-register-ipc-space', window_id)
})
console.log(`preload_space.js ${space_number} ${space_id} ready`)