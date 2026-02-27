/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

async function check_max_memory(is_buffer) {
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  let size = 10 * 1024 * 1024 // Начнём с 10 мегабайт

  while(true) {
    try {
      if (is_buffer)
        new ArrayBuffer(size)
      else
        new Array(size)
      console.log(`Выделено ${size / (1024*1024)} MB`)
      // небольшая задержка для предотвращения блокировки интерфейса
      await sleep(1)
    } catch(e) {
      // Обрабатываем ошибку выделения памяти
      break
    }
    // Увеличиваем размер буфера на 10 мегабайт
    size += 10 * 1024 * 1024
  }
  // Возвращаем последний успешно выделенный объём памяти в мб
  return Math.round((size - 10 * 1024 * 1024) / (1024*1024))
}

document.getElementById('button-memtest-chromium').addEventListener('click', async () => {
  const max_engine_size = await check_max_memory(false)
  const max_buffer_size = await check_max_memory(true)
  document.getElementById('result-memtest-chromium').
    textContent = JSON.stringify({max_engine_size, max_buffer_size})
})