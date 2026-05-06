const graph_editor = {
	state: 'view',
	ghosts: [],
	central_knoxel_id: undefined,
}
const steering_gear = {
	init: (target_element, x, y, zoom) => {
		const steering_element =
			target_element.getElementsByClassName('steering')[0];
		const ghosts_element =
			target_element.getElementsByClassName('ghosts')[0];
		steering_element.setAttribute(
			'transform',
			`matrix(${zoom}, 0, 0, ${zoom}, ${x}, ${y})`,
		);
		ghosts_element.setAttribute('transform', `scale(${zoom})`);
	},
	set_ctm: (steering_element, ghosts_element, matrix) => {
		const { a, b, c, d, e, f } = matrix;
		const zoom = a;
		const s = `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;
		steering_element.setAttribute('transform', s);
		ghosts_element.setAttribute('transform', `scale(${zoom})`);
	},
	screen_to_space_position: (target_element, screen_position) => {
		const steering_element =
			target_element.getElementsByClassName('steering')[0];
		const p = target_element.createSVGPoint();
		p.x = screen_position.x;
		p.y = screen_position.y;
		const { x, y } = p.matrixTransform(steering_element.getCTM().inverse());
		return { x, y };
	},
	space_to_screen_position: (target_element, space_position) => {
		const steering_element =
			target_element.getElementsByClassName('steering')[0];
		const p = target_element.createSVGPoint();
		p.x = space_position.x;
		p.y = space_position.y;
		const { x, y } = p.matrixTransform(steering_element.getCTM());
		return { x, y };
	},
	pan: (target_element, delta) => {
		const steering_element =
			target_element.getElementsByClassName('steering')[0];
		const ghosts_element =
			target_element.getElementsByClassName('ghosts')[0];
		const ctm = steering_element.getCTM().inverse();
		const offset = { x: delta.x * ctm.a, y: delta.y * ctm.a };
		const new_ctm = ctm.inverse().translate(offset.x, offset.y);
		steering_gear.set_ctm(steering_element, ghosts_element, new_ctm);
	},
	set_offset: (target_element, offset) => {
		const steering_element =
			target_element.getElementsByClassName('steering')[0];
		const ghosts_element =
			target_element.getElementsByClassName('ghosts')[0];
		const ctm = steering_element.getCTM();
		ctm.e = offset.x;
		ctm.f = offset.y;
		steering_gear.set_ctm(steering_element, ghosts_element, ctm);
	},
	compute_scale_matrix_in_screen_position: (
		target_element,
		steering_element,
		screen_position,
		z,
	) => {
		const p = steering_gear.screen_to_space_position(
			target_element,
			screen_position,
		);
		const k = target_element
			.createSVGMatrix()
			.translate(p.x, p.y)
			.scale(z)
			.translate(-p.x, -p.y);
		return steering_element.getCTM().multiply(k);
	},
	zoom: (target_element, position, delta) => {
		const zoom_scale = 0.5;
		const steering_element =
			target_element.getElementsByClassName('steering')[0];
		const ghosts_element =
			target_element.getElementsByClassName('ghosts')[0];
		const z = Math.pow(1.0 + zoom_scale, delta);
		const ctm = steering_gear.compute_scale_matrix_in_screen_position(
			target_element,
			steering_element,
			position,
			z,
		);
		steering_gear.set_ctm(steering_element, ghosts_element, ctm);
	},
	reset_zoom: (target_element, position) => {
		const steering_element =
			target_element.getElementsByClassName('steering')[0];
		const ghosts_element =
			target_element.getElementsByClassName('ghosts')[0];
		const inverse_z = 1.0 / steering_element.getCTM().a;
		const ctm = steering_gear.compute_scale_matrix_in_screen_position(
			target_element,
			steering_element,
			position,
			inverse_z,
		);
		steering_gear.set_ctm(steering_element, ghosts_element, ctm);
	},
	get_transform: (target_element) => {
		const steering_element =
			target_element.getElementsByClassName('steering')[0];
		const matrix = steering_element.getCTM();
		return { x: matrix.e, y: matrix.f, zoom: matrix.a };
	}
};
function convert_client_to_local(currentTarget, clientX, clientY) {
	const rect = currentTarget.getBoundingClientRect()
	return {
		localX: clientX - rect.left,
		localY: clientY - rect.top,
	}
}
function get_data_thru_parents(element, data_name) {
	if (!element)
		return { data: null, element: null }
	const data = element.dataset[data_name]
	if (!data)
		return get_data_thru_parents(element.parentElement, data_name)
	return { data, element }
}
function create_frame(desc) {
	const { x, y, stroke_color } = desc
	const frame = root.getElementsByClassName('frame')[0]
	const fill_color = stroke_color + '40'
	const stroke_width = 4
	const rect = document.createElementNS(
		'http://www.w3.org/2000/svg', 'rect'
	)
	rect.setAttribute('x', x)
	rect.setAttribute('y', y)
	rect.setAttribute('width', stroke_width)
	rect.setAttribute('height', stroke_width)
	rect.setAttribute('fill', fill_color)
	rect.setAttribute('stroke', stroke_color)
	rect.setAttribute('stroke-width', stroke_width)
	rect.style.pointerEvents = 'none'
	rect.dataset.start_x = x
	rect.dataset.start_y = y
	frame.appendChild(rect)
}
function update_frame(desc) {
	const { x, y } = desc
	const frame_element = root.getElementsByClassName('frame')[0].firstElementChild
	const current_position = steering_gear.screen_to_space_position(
		root, { x, y }
	)
	const p1 = {
		x: parseFloat(frame_element.dataset.start_x),
		y: parseFloat(frame_element.dataset.start_y),
	}
	const p2 = current_position
	const xx = Math.min(p1.x, p2.x)
	const width = Math.abs(p1.x - p2.x)
	const yy = Math.min(p1.y, p2.y)
	const height = Math.abs(p1.y - p2.y)
	frame_element.setAttribute('x', xx)
	frame_element.setAttribute('y', yy)
	frame_element.setAttribute('width', width)
	frame_element.setAttribute('height', height)
}
function remove_frame() {
	const frame = root.getElementsByClassName('frame')[0]
	frame.innerHTML = ''
}
function move_positioning(desc) {
	const { x, y } = desc
	root.getElementsByClassName('positioning')[0].setAttribute(
		'transform', `translate(${x} ${y})`
	)
}
function get_knoxel_position(knoxel) {
	const transform = knoxel.getAttribute('transform')
	if (!transform)
		return { x: 0, y: 0 }
	const coordinates = transform.split('translate(')[1].split(' ')
	return { x: parseFloat(coordinates[0]), y: parseFloat(coordinates[1]) }
}
function set_knoxel_position(knoxel, x, y) {
	knoxel.setAttribute("transform", `translate(${x}, ${y})`)
}
function create_ghost_knoxel(desc) {
	const { x, y, original } = desc
	const ghost_body = original.cloneNode(true)
	ghost_body.id = undefined
	ghost_body.dataset.knyte_id = undefined
	ghost_body.style.pointerEvents = 'none'

	// TODO: try to use opacity in ghosts instead
	ghost_body.setAttribute('opacity', '0.5')
	
	set_knoxel_position(ghost_body, x, y)
	return ghost_body
}
function create_ghosts_in_position(pointer_on_screen, knoxels) {
	const ghosts = root.getElementsByClassName('ghosts')[0]
	move_positioning(pointer_on_screen)
	const {x: x_pointer, y: y_pointer} = steering_gear.screen_to_space_position(
		root, pointer_on_screen
	)
	graph_editor.ghosts = []
	for (let i = 0; i < knoxels.length; ++i) {
		const element = knoxels[i]
		const { x: x_knoxel, y: y_knoxel } = get_knoxel_position(element)
		const x = x_knoxel - x_pointer
		const y = y_knoxel - y_pointer
		const knyte_id = element.dataset.knyte_id
		graph_editor.ghosts.push({knyte_id, knoxel_id: element.id, offset: {x, y}})
		const ghost = create_ghost_knoxel({ x, y, original: element })
		ghosts.appendChild(ghost)
	}
}
const root = document.getElementById('svg-space')
function space_on_wheel(event) {
	// ctrlKey + wheel means touch pad scale gesture
	// mouse wheel means deltaY, shift + mouse wheel means deltaX
	const { currentTarget, deltaX, deltaY, deltaMode, altKey, ctrlKey, metaKey } =
		event
	const speeds = {}
	// main mode
	speeds[WheelEvent.DOM_DELTA_PIXEL] = 0.8
	// can't reproduce this mode, thus disable it
	speeds[WheelEvent.DOM_DELTA_LINE] = 0.0
	// can't reproduce this mode, thus disable it
	speeds[WheelEvent.DOM_DELTA_PAGE] = 0.0
	const speed = speeds[deltaMode]
	//const zoom_wheel_normalization = -1.0 / 360.0
	const zoom_pinch_normalization = -1.0 / 72.0
	const mousemove_position = { x: previous.localX, y: previous.localY }
	if (!altKey && ctrlKey && !metaKey) {
		const text_scale = window.outerWidth / window.innerWidth
		const pitch_scale = window.visualViewport.scale
		const total_scale = text_scale * pitch_scale
		steering_gear.zoom(
			currentTarget,
			mousemove_position,
			zoom_pinch_normalization * total_scale * deltaY,
		)
	} else if (!altKey && !ctrlKey && !metaKey)
		steering_gear.pan(currentTarget, {
			x: -speed * deltaX,
			y: -speed * deltaY,
		})
	if (
		graph_editor.state === 'frame define' ||
		graph_editor.state === 'frame add' ||
		graph_editor.state === 'frame remove'
	) {
		update_frame({ x: previous.localX, y: previous.localY })
	}
	event.stopPropagation()
	event.preventDefault()
}
let previous = {}
function space_on_mousemove(event) {
	const { currentTarget, buttons, clientX, clientY } = event
	const { localX, localY } = convert_client_to_local(
		currentTarget,
		clientX,
		clientY,
	)
	if (previous.currentTarget === currentTarget) {
		if (buttons === 4) {
			// middle mouse button/wheel pressed
			steering_gear.pan(currentTarget, {
				x: localX - previous.localX,
				y: localY - previous.localY,
			})
			event.stopPropagation()
			event.preventDefault()
		}
	}
	if (
		graph_editor.state === 'frame define' ||
		graph_editor.state === 'frame add' ||
		graph_editor.state === 'frame remove'
	) {
		update_frame({ x: clientX, y: clientY })
	}
	if (
		graph_editor.state === 'move' ||
		graph_editor.state === 'clone'
	) {
		move_positioning({ x: clientX, y: clientY })
	}
	previous.currentTarget = currentTarget
	previous.localX = localX
	previous.localY = localY
	previous.clientX = clientX
	previous.clientY = clientY
}

root.addEventListener("wheel", space_on_wheel, { passive: false })
root.addEventListener("mousemove", space_on_mousemove, { passive: false })
const document_mousemove_cache = {};
document.addEventListener('mousemove', (event) => {
	const { clientX, clientY } = event
	document_mousemove_cache.clientX = clientX
	document_mousemove_cache.clientY = clientY
})
function get_client_xy() {
	const { clientX, clientY } = document_mousemove_cache
	if (isNaN(clientX) || isNaN(clientY))
		return null
	return { clientX, clientY }
}
document.addEventListener('keydown', (event) => {
	const { target, code, altKey, ctrlKey, shiftKey, metaKey } = event
	if (target.tagName in { INPUT: true, TEXTAREA: true })
		return
	const client_xy = get_client_xy()
	if (!client_xy)
		return
	const { clientX, clientY } = client_xy
	const focused_element = document.elementFromPoint(clientX, clientY)
	if (code === 'KeyI' && !altKey && !ctrlKey && !shiftKey && !metaKey) {
		event.preventDefault()
		if (focused_element) {
			const { data: id } = get_data_thru_parents(focused_element, "knyte_id")
			if (id) {
				const result = document.getElementById('result-knyte-id-text')
				result.value = id
				document.getElementById('result-knyte-id-dialog').showModal()
				result.focus()
				result.select()
			}
		}
	} else if (code === 'KeyO' && !altKey && !ctrlKey && !shiftKey && !metaKey) {
		steering_gear.init(root, 0, 0, 1)
	} else if (code === 'Digit1' && !altKey && !ctrlKey && !shiftKey && !metaKey) {
		const mousemove_position = { x: previous.localX, y: previous.localY }
		steering_gear.reset_zoom(root, mousemove_position)
	} else if (code === 'KeyF' && !ctrlKey && !metaKey) {
		if (graph_editor.state === 'view') {
			let stroke_color = null
			if (!altKey && !shiftKey) {
				event.preventDefault()
				graph_editor.state = 'frame define'
				stroke_color = '#0000FF'
			} else if (!altKey && shiftKey) {
				event.preventDefault()
				graph_editor.state = 'frame add'
				stroke_color = '#00FF00'
			} else if (altKey && !shiftKey) {
				event.preventDefault()
				graph_editor.state = 'frame remove'
				stroke_color = '#FF0000'
			}
			if (stroke_color) {
				const { x, y } = steering_gear.screen_to_space_position(root, {
					x: clientX,
					y: clientY,
				})
				create_frame({x, y, stroke_color})
			}
		} else if (
			graph_editor.state === 'frame define' ||
			graph_editor.state === 'frame add' ||
			graph_editor.state === 'frame remove'
		) {
			function is_contains(rect1, rect2) {
				return rect1.left < rect2.left && rect1.top < rect2.top &&
					rect1.right > rect2.right && rect1.bottom > rect2.bottom
			}

			if (graph_editor.state === 'frame define') {
				const selected = root.getElementsByClassName('knoxel-bodies')[0].
					getElementsByClassName('selected-knoxel')
				const to_remove = []
				for (let i = 0; i < selected.length; ++i)
					to_remove.push(selected[i])
				for (let i = 0; i < to_remove.length; ++i)
					to_remove[i].classList.remove('selected-knoxel')
			}
			const frame_element = root.getElementsByClassName('frame')[0].
				firstElementChild
			const frame_rect = frame_element.getBoundingClientRect()
			const knoxels = root.getElementsByClassName('knoxel-bodies')[0].children
			for (let i = 0; i < knoxels.length; ++i) {
				const knoxel = knoxels[i]
				const rect = knoxel.getBoundingClientRect()
				if (!is_contains(frame_rect, rect))
					continue
				if (graph_editor.state === 'frame remove')
					knoxel.classList.remove('selected-knoxel')
				else
					knoxel.classList.add('selected-knoxel')
			}			
			
			event.preventDefault()
			graph_editor.state = 'view'
			remove_frame()
		}
	} else if (code === 'Space' && !altKey && !ctrlKey && !metaKey) {
		event.preventDefault()
		if (focused_element) {
			const { element } = get_data_thru_parents(focused_element, 'knyte_id')
			const knoxels = []
			if (
				graph_editor.state === 'view' && element &&
				!element.classList.contains('space-root')
			) {
				graph_editor.state = shiftKey ? 'clone' : 'move'
				if (element.classList.contains('selected-knoxel')) {
					const selection = root.getElementsByClassName('selected-knoxel')
					for (let i = 0; i < selection.length; ++i) {
						knoxels.push(selection[i])
					}
				} else {
					knoxels.push(element)
				}
				create_ghosts_in_position({ x: clientX, y: clientY }, knoxels)
				if (graph_editor.state === 'move') {
					for (let i = 0; i < knoxels.length; ++i) {
						knoxels[i].style.filter = 'brightness(0.6)'
					}
				}
			}
		}
	} else if (code === 'Escape' && !altKey && !ctrlKey && !shiftKey && !metaKey) {
		if (
			graph_editor.state === 'frame define' ||
			graph_editor.state === 'frame add' ||
			graph_editor.state === 'frame remove'
		) {
			event.preventDefault()
			graph_editor.state = 'view'
			remove_frame()
		}
	}
})
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
		const { x, y } = steering_gear.screen_to_space_position(root, {
			x: localX,
			y: localY,
		})
	    if (shiftKey) {
			const dialog = document.getElementById('prompt-knyte-id-dialog')
			const input = document.getElementById('prompt-knyte-id-input')
			const button_ok = document.getElementById('prompt-knyte-id-ok')
			const button_cancel = document.getElementById('prompt-knyte-id-cancel')
			dialog.showModal()
			input.focus()
			dialog.onclose = () => {
				input.value = ''
    			if (!dialog.returnValue)
					return
				window.core_api.create_knoxel_for_knyte({
					knyte_id: dialog.returnValue, x, y
				}).then((reply) => reply.error && alert(reply.error.message))
			}
			button_ok.onclick = () => {
				dialog.close(input.value)
			}
			button_cancel.onclick = () => {
				dialog.close('')
			}
			input.onkeydown = (event) => {
				if (event.code === 'Enter') {
					event.preventDefault()
					dialog.close(input.value)
				} else if (event.code === 'Escape') {
					event.preventDefault()
					dialog.close('')
				}
			}
		} else {
			window.core_api.create_knyte_and_knoxel({
				x, y
			}).then((reply) => reply.error && alert(reply.error.message))
		}
	}
}
document.getElementById('svg-space').addEventListener(
	'click', handle_click_space, { passive: false }
)
console.log('render_space.js ready')