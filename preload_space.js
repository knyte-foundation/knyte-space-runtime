let space_number = 0
const argt = `--window-caption-number=`
for (let i = 0; i < process.argv.length; ++i) {
  const arg = process.argv[i]
  if (arg.indexOf(argt) < 0)
    continue
  space_number = parseInt(arg.split(argt)[1])
  break
}
window.addEventListener('DOMContentLoaded', () => {
  document.title = `${document.title} ${space_number}`
  const e = document.getElementById('placeholder')
  e.textContent = `${e.textContent} ${space_number}`
})
console.log(`preload_space.js ${space_number} ready`)