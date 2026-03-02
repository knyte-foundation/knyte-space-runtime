const steering_gear = {
	init: (target_element, x, y, zoom) => {
		const steering_element =
			target_element.getElementsByClassName("steering")[0];
		const ghosts_element =
			target_element.getElementsByClassName("ghosts")[0];
		steering_element.setAttribute(
			"transform",
			`matrix(${zoom}, 0, 0, ${zoom}, ${x}, ${y})`,
		);
		ghosts_element.setAttribute("transform", `scale(${zoom})`);
	},
	set_ctm: (steering_element, ghosts_element, matrix) => {
		const { a, b, c, d, e, f } = matrix;
		const zoom = a;
		const s = `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;
		steering_element.setAttribute("transform", s);
		ghosts_element.setAttribute("transform", `scale(${zoom})`);
	},
	screen_to_space_position: (target_element, screen_position) => {
		const steering_element =
			target_element.getElementsByClassName("steering")[0];
		const p = target_element.createSVGPoint();
		p.x = screen_position.x;
		p.y = screen_position.y;
		const { x, y } = p.matrixTransform(steering_element.getCTM().inverse());
		return { x, y };
	},
	space_to_screen_position: (target_element, space_position) => {
		const steering_element =
			target_element.getElementsByClassName("steering")[0];
		const p = target_element.createSVGPoint();
		p.x = space_position.x;
		p.y = space_position.y;
		const { x, y } = p.matrixTransform(steering_element.getCTM());
		return { x, y };
	},
	pan: (target_element, delta) => {
		const steering_element =
			target_element.getElementsByClassName("steering")[0];
		const ghosts_element =
			target_element.getElementsByClassName("ghosts")[0];
		const ctm = steering_element.getCTM().inverse();
		const offset = { x: delta.x * ctm.a, y: delta.y * ctm.a };
		const new_ctm = ctm.inverse().translate(offset.x, offset.y);
		steering_gear.set_ctm(steering_element, ghosts_element, new_ctm);
	},
	set_offset: (target_element, offset) => {
		const steering_element =
			target_element.getElementsByClassName("steering")[0];
		const ghosts_element =
			target_element.getElementsByClassName("ghosts")[0];
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
			target_element.getElementsByClassName("steering")[0];
		const ghosts_element =
			target_element.getElementsByClassName("ghosts")[0];
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
			target_element.getElementsByClassName("steering")[0];
		const ghosts_element =
			target_element.getElementsByClassName("ghosts")[0];
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
			target_element.getElementsByClassName("steering")[0];
		const matrix = steering_element.getCTM();
		return { x: matrix.e, y: matrix.f, zoom: matrix.a };
	}
};

document.getElementById('button-1').addEventListener('click', () => {
  steering_gear.init(document.getElementById('svg-history'), 0, 0, 1)
})
document.getElementById('button-2').addEventListener('click', () => {
  steering_gear.init(document.getElementById('svg-history'), 50, 50, 2)
})

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
    if (focused_element && focused_element.id) {
      const result = document.getElementById('result-operation-id-text')
      result.value = focused_element.id
      document.getElementById('result-operation-id-dialog').showModal()      
      result.focus()
      result.select()
    }
  }
})

console.log('renderer_history.js ready')