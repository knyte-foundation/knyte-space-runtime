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
	const e = document.getElementById('placeholder')
	e.textContent = `${e.textContent} ${space_number} ${space_id}`
})
console.log(`preload_space.js ${space_number} ${space_id} ready`)