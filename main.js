// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron/main')
const { v7: uuidv7, NIL: uuid_nil } = require('uuid')
const path = require('node:path')
const app_root_path = __dirname
const db_path = path.join(app.getPath('userData'), 'db.sqlite')
let db, space_window_number = 0

function create_space_window() {
  const space_window = new BrowserWindow({
    width: 1792,
    height: 1000,
    x: 0,
    y: 50,
    webPreferences: {
      preload: path.join(app_root_path, 'preload_space.js'),
      additionalArguments: [
        `--window-caption-number=${++space_window_number}`
      ]
    }
  })
  space_window.loadFile('index_space.html')
}

function createAllWindows() {
  // system
  // Create the browser window.
  const system_window = new BrowserWindow({
    width: 300,
    height: 1000,
    x: 0,
    y: 0,
    webPreferences: {
      preload: path.join(app_root_path, 'preload.js')
    }
  })
  // and load the index.html of the app.
  system_window.loadFile('index.html')
  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // history
  const history_window = new BrowserWindow({
    width: 600,
    height: 1000,
    x: 300,
    y: 0,
    webPreferences: {
      preload: path.join(app_root_path, 'preload_history.js')
    }
  })
  history_window.loadFile('index_history.html')

  // graph
  const graph_window = new BrowserWindow({
    width: 892,
    height: 1000,
    x: 900,
    y: 0,
    webPreferences: {
      preload: path.join(app_root_path, 'preload_graph.js')
    }
  })
  graph_window.loadFile('index_graph.html')

  // space
  create_space_window()
}

function connect_db() {
  db = require("better-sqlite3")(db_path, {
    verbose: console.log,
  });
  // NORMAL is a balance between speed (OFF) and safety (FULL)
  db.pragma(`synchronous=NORMAL`);
  db.pragma(`journal_mode=WAL`);
  console.log('Connected to the SQLite database.')

  const uuid_length = uuid_nil.length;
  {
    const table_name = 'contents'
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS ${table_name} (
          id TEXT (${uuid_length}) NOT NULL PRIMARY KEY,
          content TEXT UNIQUE NOT NULL CHECK(length(content) > 0)
        );
      `).run()
      console.log(`Table "${table_name}" created successfully.`)
    } catch (error) {
      console.error(`Error creating table "${table_name}"`, error)
    }
  }
  {
    const table_name = `optree_${uuid_nil}_0`
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS '${table_name}' (
          id TEXT (${uuid_length}) NOT NULL PRIMARY KEY,
          command TEXT (${uuid_length}) NOT NULL,
          target TEXT (${uuid_length}) NOT NULL,
          parameter TEXT (${uuid_length})
        );
      `).run()
      console.log(`Table "${table_name}" created successfully.`)
    } catch (error) {
      console.error(`Error creating table "${table_name}"`, error)
    }
  }  
}

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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createAllWindows()
  connect_db()

  ipcMain.handle('invoke-handle-message', async (event, arg, arg2) => {
    if (!db) {
      console.log('db not ready')
      return
    }
    if (arg === 'event-system-db-path') {
      return {app_root_path, db_path}
    } else if (arg === 'event-system-memtest') {
      const max_engine_size = await check_max_memory(false)
      const max_buffer_size = await check_max_memory(true)
      return {max_engine_size, max_buffer_size}
    } else if (arg === 'event-windows-add-space') {
      create_space_window()
      return {result: 'space added'}
    } else if (arg === 'event-db-append-content') {
      function append_content(sql, id, content) {
        try {
          db.prepare(sql).run(id, content)
          return {id}
        } catch (error) {
          const {code, message, stack} = error
          return {error: {code, message, stack}}
        }
      }
      const id = uuidv7()
      const content = arg2
      return append_content(
        'INSERT INTO contents (id, content) VALUES (?, ?)',
        id, content
      )
    } else if (arg === 'event-db-find-content-by-text') {
      const content = arg2
      try {
        const result = db.prepare(
          'SELECT id FROM contents WHERE content = ?'
        ).get(content)
        return result ? {id: result.id} : {not_found: true}
      } catch (error) {
        const {code, message, stack} = error
        return {error: {code, message, stack}}
      }
    } else if (arg === 'event-db-find-content-by-id') {
      const id = arg2
      try {
        const result = db.prepare(
          'SELECT content FROM contents WHERE id = ?'
        ).get(id)
        return result ? {content: result.content} : {not_found: true}
      } catch (error) {
        const {code, message, stack} = error
        return {error: {code, message, stack}}
      }
    } else if (arg === 'event-db-show-contents') {
      return db.prepare('SELECT * FROM contents').all()
    }
    return {uknown_command: true}
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0)
      createAllWindows()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin')
    app.quit()
})

app.on('will-quit', () => {
  // Close the connection
  db && db.close()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.