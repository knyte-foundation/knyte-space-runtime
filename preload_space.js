let space_number = 0
for (let i = 0; i < process.argv.length; ++i) {
	const a = process.argv[i]
	if (a.indexOf('--window-caption-number=') < 0)
		continue;
	space_number = parseInt(a.split('--window-caption-number=')[1])
	break;
}
console.log('space_number', space_number)
window.addEventListener('DOMContentLoaded', () => {
	document.title = `${document.title} ${space_number}`
	const e = document.getElementById('placeholder')
	e.textContent = `${e.textContent} ${space_number}`
})
console.log("preload_space.js ready") 