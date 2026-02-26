// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron/main')
const path = require('node:path')
const app_root_path = __dirname
const db_path = path.join(app.getPath('userData'), 'db.sqlite')
let db

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 960,
    height: 540,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  mainWindow.webContents.openDevTools()
}

function connect_db() {
  const sqlite3 = require('sqlite3').verbose()

  // 1. Connect to or create a database file
  db = new sqlite3.Database(db_path, (err) => {
    if (err) return console.error(err.message);
    console.log('Connected to the SQLite database.');
  })

  // 2. Execute the CREATE TABLE statement
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    );
  `

  db.run(createTableSql, (err) => {
    if (err) return console.error('Error creating table:', err.message);
    console.log('Table created successfully.');
  });
}

async function check_max_memory(is_buffer) {
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  let size = 10 * 1024 * 1024; // Начнём с 10 мегабайт

  while(true) {
    try {
      if (is_buffer)
        new ArrayBuffer(size);
      else
        new Array(size);
      console.log(`Выделено ${size / (1024*1024)} MB`);
      // небольшая задержка для предотвращения блокировки интерфейса
      await sleep(1);
    } catch(e) {
      // Обрабатываем ошибку выделения памяти
      break;
    }
    // Увеличиваем размер буфера на 10 мегабайт
    size += 10 * 1024 * 1024;
  }
  // Возвращаем последний успешно выделенный объём памяти в мб
  return Math.round((size - 10 * 1024 * 1024) / (1024*1024));
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()
  connect_db()

  ipcMain.handle('invoke-handle-message', async (event, arg) => {
    if (!db) {
      console.log('db not ready')
      return
    }
    console.log(arg)
    if (arg === 'select all') {
      function getAllRows(sql) {
          return new Promise((resolve, reject) => {
              db.all(sql, (err, rows) => {
                  if (err) {
                      reject(err)
                  } else {
                      resolve(rows)
                  }
              });
          });
      }
      const result = await getAllRows("SELECT id, username, email FROM users")
      return JSON.stringify(result, null, '\t')

    } else if (arg === "insert random row") {
      const stmt = db.prepare("INSERT INTO users (username, email) VALUES (?, ?)")
      for (let i = 0; i < 1; i++) {
          const randomName = 'User_' + Math.floor(Math.random() * 1000)
          const randomEmail = Math.floor(Math.random() * 100) + '@mail.com'
          stmt.run(randomName, randomEmail)
          console.log(`Inserted: ${randomName}, Value: ${randomEmail}`)
      }
      stmt.finalize()
      return 'insert done'
    } else if (arg === 'db path') {
      return {app_root_path, db_path}
    } else if (arg === 'memtest') {
      const max_engine_size = await check_max_memory(false)
      const max_buffer_size = await check_max_memory(true)
      return JSON.stringify({max_engine_size, max_buffer_size})
    }
    return 'uknowon command'
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0)
      createWindow()
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
  db && db.close();
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.