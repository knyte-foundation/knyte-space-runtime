// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron/main')
const { v7: uuidv7 } = require('uuid')
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
  const sqlite3 = require('sqlite3').verbose()

  // 1. Connect to or create a database file
  db = new sqlite3.Database(db_path, (err) => {
    if (err) return console.error(err.message)
    console.log('Connected to the SQLite database.')
  })

  // 2. Execute the CREATE TABLE statement for users
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    );
  `
  db.run(createTableSql, (err) => {
    if (err) return console.error('Error creating table:', err.message)
    console.log('Table "users" created successfully.')
  })

  // 3. Execute the CREATE TABLE statement for contents
  const createTableSql2 = `
    CREATE TABLE IF NOT EXISTS contents (
      id TEXT NOT NULL PRIMARY KEY,
      content TEXT UNIQUE NOT NULL CHECK(length(content) > 0)
    );
  `
  db.run(createTableSql2, (err) => {
    if (err) return console.error('Error creating table:', err.message)
    console.log('Table "contents" created successfully.')
  })
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
    function db_get(sql, value) {
      return new Promise((resolve, reject) => {
        db.get(sql, value, (error, row) => {
          if (error) {
            reject(error)
          } else {
            resolve(row)
          }
        })
      })
    }
    function db_all(sql) {
      return new Promise((resolve, reject) => {
        db.all(sql, (err, rows) => {
          if (err) {
            reject(err)
          } else {
            resolve(rows)
          }
        })
      })
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
        return new Promise((resolve, reject) => {
          db.run(sql, id, content, (error) => {
            if (error) {
              reject(error)
            } else {
              resolve(id)
            }
          })
        })
      }
      const id = uuidv7()
      const content = arg2
      try {
        return {id: await append_content(
          'INSERT INTO contents (id, content) VALUES (?, ?)', id, content
        )}
      } catch (error) {
        return {error}
      }
    } else if (arg === 'event-db-find-content-by-text') {
      const content = arg2
      try {
        const result = await db_get(
          'SELECT id FROM contents WHERE content = ?', content
        )
        return result ? {id: result.id} : {not_found: true}
      } catch (error) {
        return {error}
      }
    } else if (arg === 'event-db-find-content-by-id') {
      const id = arg2
      try {
        const result = await db_get(
          'SELECT content FROM contents WHERE id = ?', id
        )
        return result ? {content: result.content} : {not_found: true}
      } catch (error) {
        return {error}
      }
    } else if (arg === 'event-db-show-contents') {
      return await db_all(
        'SELECT * FROM contents'
      )
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