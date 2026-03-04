// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron/main')
const { v7: uuidv7, NIL: uuid_nil } = require('uuid')
const path = require('node:path')
const app_root_path = __dirname
const db_path = path.join(app.getPath('userData'), 'db.sqlite')
let db, space_window_number = 0, registered_ipc_renders = {}

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

const uuid_length = uuid_nil.length;
const first_optree_table_id = uuid_nil
function get_optree_name(id) {
  return `optree_${id}`
}
const first_optree_table_name = get_optree_name(first_optree_table_id)
function connect_db() {
  db = require("better-sqlite3")(db_path, {
    verbose: console.log,
  });
  // NORMAL is a balance between speed (OFF) and safety (FULL)
  db.pragma(`synchronous=NORMAL`);
  db.pragma(`journal_mode=WAL`);
  console.log('Connected to the SQLite database.')

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
}
function is_table_exist(name) {
  try {
    const result = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='${name}';
    `).all()
    return {exists: result && result.length > 0
      ? result[0].name === name
      : false
    }
  } catch (error) {
    const {code, message, stack} = error
    return {exists: false, error: {code, message, stack}}
  }
}
function add_operation(history_branch_id, desc) {
  const table_name = get_optree_name(history_branch_id)
  const {id, command, target, parameter} = desc
  try {
    db.prepare(
      `INSERT INTO '${
        table_name
      }' (id, command, target, parameter) VALUES (?, ?, ?, ?)`
    ).run(id, command, target, parameter)
    return {id}
  } catch (error) {
    const {code, message, stack} = error
    return {error: {code, message, stack}}
  }
}
function create_history_branch(
  history_branch_id, root_branch_id, root_operation_id
) {
  const history_branch_name = get_optree_name(history_branch_id)
  try {
    db.prepare(`
      CREATE TABLE '${history_branch_name}' (
        id TEXT (${uuid_length}) NOT NULL PRIMARY KEY,
        command TEXT (${uuid_length}) NOT NULL,
        target TEXT (${uuid_length}) NOT NULL,
        parameter TEXT (${uuid_length})
      );
    `).run()
    const id = uuidv7()
    add_operation(history_branch_id, {
      id, command: 'create branch',
      target: root_branch_id, parameter: root_operation_id
    })
    console.log(`Table "${history_branch_name}" created successfully.`)
    return {id: history_branch_name}
  } catch (error) {
    console.error(`Error creating table "${history_branch_name}"`, error)
    const {code, message, stack} = error
    return {error: {code, message, stack}}
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

  ipcMain.handle('invoke-handle-message', async (event, arg, arg2, arg3) => {
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
    } else if (arg === 'event-db-add-operation') {
      if (!is_table_exist(first_optree_table_name).exists)
        return {error: {
          code: `history branch ${first_optree_table_name} not found`,
          message: `can't add new operation to history because branch ${
            first_optree_table_name
          } not found`,
          stack: 'not available',
        }}
      const {command, target, parameter, operation_in_focus} = arg2
      if (operation_in_focus)
        return {error: {
          code: 'db is in read-only mode',
          message: `can't add new operation to history because operation in focus = ${
            operation_in_focus
          }`,
          stack: 'not available',
        }}
      const id = uuidv7()
      return add_operation(first_optree_table_id, {id, command, target, parameter})
    } else if (arg === 'event-db-show-history') {
      if (!is_table_exist(first_optree_table_name).exists)
        return {error: {
          code: `history branch ${first_optree_table_name} not found`,
          message: `can't get history because branch ${
            first_optree_table_name
          } not found`,
          stack: 'not available',
        }}
      return db.prepare(
        `SELECT * FROM '${first_optree_table_name}'`
      ).all()
    } else if (arg === 'event-db-get-history-branches') {
      let branch_names
      try {
        branch_names = db.prepare(`
          SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'optree_%';
        `).all()
        if (branch_names.length === 0)
          return {error: {
            code: `history branch ${first_optree_table_name} not found`,
            message: `can't get history because branch ${
              first_optree_table_name
            } not found`,
            stack: 'not available',
          }}
      } catch (error) {
        const {code, message, stack} = error
        return {error: {code, message, stack}}
      }
      const branches = {}
      for (let i = 0; i < branch_names.length; ++i) {
        const {name} = branch_names[i]
        const id = name.split('optree_')[1]
        branches[id] = db.prepare(
          `SELECT * FROM '${name}'`
        ).all()
      }
      return {branches}
    } else if (arg === 'event-db-add-history-branch') {
      const root_branch_id = arg2 || uuid_nil
      const root_operation_id = arg3 || uuid_nil
      const new_branch_id = (root_operation_id !== uuid_nil)
        ? uuidv7()
        : uuid_nil
      const result = create_history_branch(new_branch_id, root_branch_id, root_operation_id)
      if (result.id)
        return {id: result.id}
      else return {error: {
        code: result.error?.code,
        message: result.error?.message,
        stack: result.error?.stack
      }}
    }
    return {uknown_command: true}
  })

  ipcMain.on('asynchronous-message', (event, arg, arg2, arg3, arg4) => {
    if (arg === 'event-register-ipc-render') {
      const render_name = arg2
      registered_ipc_renders[render_name] = event.sender
    } else if (arg === 'event-set-operation-in-focus') {
      const operation_in_focus = arg2
      const is_focus_on_present = arg3
      const history_branch_in_focus = arg4
      // TODO: determine is_focus_on_present based on main and actual db
      const ipc_graph = registered_ipc_renders['graph']
      ipc_graph && ipc_graph.send(
        'asynchronous-reply', 'event-set-operation-in-focus',
        is_focus_on_present ? '' : operation_in_focus, history_branch_in_focus
      )
    } else if (arg === 'event-add-operation') {
      const ipc_history = registered_ipc_renders['history']
      ipc_history && ipc_history.send(
        'asynchronous-reply', 'event-add-operation'
      )
    }
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