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
    focused_element && focused_element.id && alert(focused_element.id)
  }
})

console.log('renderer_history.js ready')