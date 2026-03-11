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
const window_id = `space ${space_number}`
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
function convert_client_to_local(currentTarget, clientX, clientY) {
	const rect = currentTarget.getBoundingClientRect();
	return {
		localX: clientX - rect.left,
		localY: clientY - rect.top,
	};
}
function handle_click_space(event) {
    const {
        currentTarget,
        clientX,
        clientY,
        altKey,
        ctrlKey,
        shiftKey,
        metaKey,
    } = event

    if (!altKey && (shiftKey ^ (metaKey || ctrlKey))) {
	    event.stopPropagation()
    	event.preventDefault()
		const { localX, localY } = convert_client_to_local(
			currentTarget,
			clientX,
			clientY,
		)
		/*
		// TODO: uncomment when navifation will be ready
		const { x, y } = steering_gear.screen_to_space_position(space_root, {
			x: localX,
			y: localY,
		})
		*/
		const desc = { root_space_id: space_id, x: localX, y: localY }
	    if (shiftKey)
			alert('not implemented yet')
		else
			ipcRenderer.send('asynchronous-message', 'event-create-knyte-and-knoxel', desc)
	}
}
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
	document.getElementById('svg-space').addEventListener(
		'click', handle_click_space, { passive: false }
	)
})
console.log(`preload_space.js ${space_number} ${space_id} ready`)