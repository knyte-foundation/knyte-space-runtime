// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron/main')
const {
	v7: uuidv7, NIL: uuid_nil, validate: uuid_validate, version: uuid_version
} = require('uuid')
const first_history_branch_id = uuid_nil
const path = require('node:path')
const app_root_path = __dirname
const db_path = path.join(app.getPath('userData'), 'db.sqlite')
let db, space_window_number = 0, registered_ipc_renders = {}, registered_ipc_spaces = {}
let present_operation_ids = {} // operation_id -> true
let present_operations_in_branches = {} // history_branch_id -> operation_id
let history_render_sequence = [] // [{root_branch, root_operation, branch, branch_id}]
const history_focus = {branch_id: null, operation_id: null, is_present: false}

function create_space_window(space_id) {
	const space_number = ++space_window_number
	const y_offset = space_number * 30
	const space_window = new BrowserWindow({
		width: 1792,
		height: 1020 - y_offset,
		x: 0,
		y: 25 + y_offset,
		webPreferences: {
			preload: path.join(app_root_path, 'preload_space.js'),
			additionalArguments: [
				`--window-caption-number=${space_number}`,
				`--space_knyte-id=${space_id}`,
			]
		}
	})
	space_window.loadFile('index_space.html')
	const window_id = `space ${space_number}`
	space_window.on('closed', () => {
		delete registered_ipc_spaces[window_id]
		console.log(`${window_id} window closed`)
	})
}

function createAllWindows() {
	// system
	// Create the browser window.
	const system_window = new BrowserWindow({
		width: 600,
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
	system_window.on('closed', () => {
		console.log('system window closed')
	})

	// history
	const history_window = new BrowserWindow({
		width: 796,
		height: 1000,
		x: 100,
		y: 0,
		webPreferences: {
			preload: path.join(app_root_path, 'preload_history.js')
		}
	})
	history_window.loadFile('index_history.html')
	history_window.on('closed', () => {
		delete registered_ipc_renders['history']
		console.log('history window closed')
	})

	// graph
	const graph_window = new BrowserWindow({
		width: 896,
		height: 1000,
		x: 896,
		y: 0,
		webPreferences: {
			preload: path.join(app_root_path, 'preload_graph.js')
		}
	})
	graph_window.loadFile('index_graph.html')
	graph_window.on('closed', () => {
		delete registered_ipc_renders['graph']
		console.log('graph window closed')
	})
}

function optree_id_to_name(id) {
	return `optree_${id}`
}
function optree_name_to_id(name) {
	return name.split('optree_')[1]
}
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
		const uuid_length = uuid_nil.length;
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
		return {
			exists: result && result.length > 0
				? result[0].name === name
				: false
		}
	} catch (error) {
		const { code, message, stack } = error
		return { exists: false, error: { code, message, stack } }
	}
}
function is_row_exist(name, id) {
	try {
		const result = db.prepare(`
			SELECT id FROM '${name}' WHERE id='${id}';
		`).all()
		return { exists: result && result.length > 0 }
	} catch (error) {
		const { code, message, stack } = error
		return { exists: false, error: { code, message, stack } }
	}
}
function get_history_branch(name) {
	return db.prepare(
		`SELECT * FROM '${name}'`
	).all()
}
function get_history_branches() {
	let branch_names
	try {
		branch_names = db.prepare(`
			SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'optree_%';
		`).all()
		if (branch_names.length === 0)
			return {
				error: {
					code: `history have no branches`,
					message: `can't get history because it has no branches`,
					stack: 'not available',
				}
			}
	} catch (error) {
		const { code, message, stack } = error
		return { error: { code, message, stack } }
	}
	const branches = {}
	for (let i = 0; i < branch_names.length; ++i) {
		const { name } = branch_names[i]
		const id = optree_name_to_id(name)
		branches[id] = get_history_branch(name)
	}
	return { branches }
}
function build_history() {
	const {branches, error} = get_history_branches();
	if (branches) {
		present_operation_ids = {}
		present_operations_in_branches = {}
		history_render_sequence = []
		if (first_history_branch_id in branches) {
			const branch_id = first_history_branch_id
			const branch = branches[branch_id]
			const last_operation_id = branch.length ? branch[branch.length - 1] : null
			if (last_operation_id) {
				present_operation_ids[last_operation_id] = true
				present_operations_in_branches[branch_id] = last_operation_id
				history_render_sequence.push({
					root_branch: uuid_nil, root_operation: uuid_nil, branch, branch_id
				})
			}
		}
		const sorted_branches = {}; // {root_branch: [root_operations]}
		sorted_branches[first_history_branch_id] = []
		for (let branch_id in branches) {
			if (branch_id === first_history_branch_id)
				continue
			const branch = branches[branch_id]
			const first_operation = branch[0]
			const root_branch = first_operation.target
			const root_operation = first_operation.parameter
			!(root_branch in sorted_branches) && (sorted_branches[root_branch] = [])
			sorted_branches[root_branch].push({
				root_branch, root_operation, branch, branch_id
			})
		}
		for (let root_branch in sorted_branches)
			sorted_branches[root_branch].sort((a, b) => {
				if (a.root_operation < b.root_operation) return 1
				if (a.root_operation > b.root_operation) return -1
				return 0
			})
		function fill_render_sequence(root_branch) {
			const sequence = sorted_branches[root_branch]
			for (let i = 0; i < sequence.length; ++i) {
				const element = sequence[i]
				history_render_sequence.push(element)
				if (element.branch_id in sorted_branches)
					fill_render_sequence(element.branch_id)
			}
		}
		fill_render_sequence(first_history_branch_id)
		for (let i = 0; i < history_render_sequence.length; ++i) {
			const { branch, branch_id } = history_render_sequence[i]
			const last_operation_id = branch.length ? branch[branch.length - 1] : null
			present_operation_ids[last_operation_id] = true
			present_operations_in_branches[branch_id] = last_operation_id
		}
	} else if (error) {
		console.log(error)
	}
}
function init_history_focus() {
	// TODO: handle here restoring of saved history_focus
	if (first_history_branch_id in present_operations_in_branches) {
		history_focus.branch_id = first_history_branch_id
		history_focus.operation_id = present_operations_in_branches[first_history_branch_id].id
		history_focus.is_present = true
	}
}
function get_history_line(top_branch, top_operation) {
	let root_branch = top_branch
	let root_operation = top_operation
	const line = []
	const branch_sequence = []
	while (true) {
		try {
			const operations = db.prepare(
				`SELECT * FROM '${optree_id_to_name(root_branch)}'`
			).all()
			const first = operations[0]
			if (first.command !== '019cb3d8-82be-7c3f-b40f-a2534c42314a') { // create branch
				return {
					error: {
						code: 'first operation command in history branch must be "create branch"',
						message: 'can\'t get history line because first operation command is not "create branch"',
						stack: 'not available'
					}
				}
			}
			branch_sequence.push({ root_branch, root_operation, operations })
			root_branch = first.target
			root_operation = first.parameter
			if (root_branch === uuid_nil && root_operation === uuid_nil)
				break
		} catch (error) {
			const { code, message, stack } = error
			return { error: { code, message, stack } }
		}
	}
	branch_sequence.reverse()
	for (let i = 0; i < branch_sequence.length; ++i) {
		const { root_operation, operations } = branch_sequence[i]
		for (let j = 0; j < operations.length; ++j) {
			const operation = operations[j]
			line.push(operation)
			if (operation.id === root_operation)
				break
		}
	}
	return { line }	
}
function add_operation(history_branch_id, desc) {
	const table_name = optree_id_to_name(history_branch_id)
	const { id, command, target, parameter } = desc
	try {
		db.prepare(`
			INSERT INTO '${
				table_name
			}' (id, command, target, parameter) VALUES (?, ?, ?, ?)
		`).run(id, command, target, parameter)
		return { id, command, target, parameter }
	} catch (error) {
		const { code, message, stack } = error
		return { error: { code, message, stack } }
	}
}
function create_history_branch(
	history_branch_id, root_branch_id, root_operation_id
) {
	const history_branch_name = optree_id_to_name(history_branch_id)
	const uuid_length = uuid_nil.length;
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
			id, command: '019cb3d8-82be-7c3f-b40f-a2534c42314a', // create branch
			target: root_branch_id, parameter: root_operation_id
		})
		console.log(`Table "${history_branch_name}" created successfully.`)
		return { id: history_branch_id }
	} catch (error) {
		console.error(`Error creating table "${history_branch_name}"`, error)
		const { code, message, stack } = error
		return { error: { code, message, stack } }
	}
}

async function check_max_memory(is_buffer) {
	function sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms))
	}

	let size = 10 * 1024 * 1024 // Начнём с 10 мегабайт

	while (true) {
		try {
			if (is_buffer)
				new ArrayBuffer(size)
			else
				new Array(size)
			console.log(`Выделено ${size / (1024 * 1024)} MB`)
			// небольшая задержка для предотвращения блокировки интерфейса
			await sleep(1)
		} catch (e) {
			// Обрабатываем ошибку выделения памяти
			break
		}
		// Увеличиваем размер буфера на 10 мегабайт
		size += 10 * 1024 * 1024
	}
	// Возвращаем последний успешно выделенный объём памяти в мб
	return Math.round((size - 10 * 1024 * 1024) / (1024 * 1024))
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	connect_db()
	build_history()
	init_history_focus()
	createAllWindows()

	ipcMain.handle('invoke-handle-message', async (event, arg, arg2, arg3) => {
		if (!db) {
			console.log('db not ready')
			return
		}
		if (arg === 'event-system-db-path') {
			return { app_root_path, db_path }
		} else if (arg === 'event-system-memtest') {
			const max_engine_size = await check_max_memory(false)
			const max_buffer_size = await check_max_memory(true)
			return { max_engine_size, max_buffer_size }
		} else if (arg === 'event-windows-add-space') {
			const space_id = arg2
			// space
			create_space_window(space_id)
			return { result: `space ${space_id} added` }
		} else if (arg === 'event-db-append-content') {
			function append_content(sql, id, content) {
				try {
					db.prepare(sql).run(id, content)
					return { id }
				} catch (error) {
					const { code, message, stack } = error
					return { error: { code, message, stack } }
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
				return result ? { id: result.id } : { not_found: true }
			} catch (error) {
				const { code, message, stack } = error
				return { error: { code, message, stack } }
			}
		} else if (arg === 'event-db-find-content-by-id') {
			const id = arg2
			try {
				const result = db.prepare(
					'SELECT content FROM contents WHERE id = ?'
				).get(id)
				return result ? { content: result.content } : { not_found: true }
			} catch (error) {
				const { code, message, stack } = error
				return { error: { code, message, stack } }
			}
		} else if (arg === 'event-db-show-contents') {
			return db.prepare('SELECT * FROM contents').all()
		} else if (arg === 'event-db-add-operation') {
			const {
				command, target, parameter,
				history_branch_in_focus, operation_in_focus
			} = arg2
			if (!history_branch_in_focus)
				return {
					error: {
						code: 'history branch not specified',
						message: `can't add new operation to history because branch not specified`,
						stack: 'not available',
					}
				}
			if (!operation_in_focus)
				return {
					error: {
						code: 'operation in focus not specified',
						message: `can't add new operation to history because operation in focus not specified`,
						stack: 'not available',
					}
				}
			let operation_in_present;
			try {
				const result = db.prepare(
					`SELECT id FROM '${optree_id_to_name(history_branch_in_focus)}' ORDER BY id DESC LIMIT 1;`
				).get()
				console.log('operation_in_present', result)
				operation_in_present = result.id
			} catch (error) {
				const { code, message, stack } = error
				return { error: { code, message, stack } }
			}
			if (operation_in_focus !== operation_in_present)
				return {
					error: {
						code: 'db is in read-only mode',
						message: `can't add new operation to history because operation in focus ${operation_in_focus
							} !== operation in present ${operation_in_present
							}`,
						stack: 'not available',
					}
				}
			const id = uuidv7()
			const result = add_operation(history_branch_in_focus, { id, command, target, parameter })
			if (!result.error) {
				// patch history
				const operation = {id, command, target, parameter}
				delete present_operation_ids[history_focus.operation_id]
				present_operation_ids[id] = true
				present_operations_in_branches[history_branch_in_focus] = operation
				let branch_to_append
				for (let i = 0; i < history_render_sequence.length; ++i)
					if (history_render_sequence[i].branch_id === history_branch_in_focus) {
						branch_to_append = history_render_sequence[i].branch
						break
					}
				branch_to_append && branch_to_append.push(operation)

				// update actual focus
				history_focus.operation_id = id
				history_focus.is_present = true;

				// update graph focus
				const {branch_id, operation_id, is_present} = history_focus
				const ipc_graph = registered_ipc_renders['graph']
				ipc_graph && ipc_graph.send(
					'asynchronous-reply', 'event-set-operation-in-focus',
					branch_id, operation_id, is_present
				)
			}
			return result
		} else if (arg === 'event-db-get-history-line') {
			const top_branch = arg2
			const top_operation = arg3
			return get_history_line(top_branch, top_operation)
		} else if (arg === 'event-db-get-history-branches') {
			return get_history_branches()
		} else if (arg === 'event-db-add-history-branch') {
			const root_branch_id = arg2 || uuid_nil
			const root_operation_id = arg3 || uuid_nil
			const new_branch_id = (root_operation_id !== uuid_nil)
				? uuidv7()
				: first_history_branch_id
			if (new_branch_id === first_history_branch_id) {
				if (root_branch_id !== uuid_nil || root_operation_id !== uuid_nil)
					return {
						error: {
							code: `root branch and root operation must be ${uuid_nil}`,
							message: `can't add branch because root branch or root operation is not ${uuid_nil}`,
							stack: 'not available'
						}
					}
			} else {
				const { exists, error } = is_row_exist(
					optree_id_to_name(root_branch_id), root_operation_id
				)
				if (error)
					return { error }
				if (!exists)
					return {
						error: {
							code: `root operation ${root_operation_id
								} not found in branch ${root_branch_id
								}`,
							message: `can't add branch for not existing operation ${root_operation_id
								} from branch ${root_branch_id
								}`,
							stack: 'not available'
						}
					}
			}
			const result = create_history_branch(new_branch_id, root_branch_id, root_operation_id)
			if (result.id) {
				build_history()
				return { id: result.id }
			}
			else return {
				error: {
					code: result.error?.code,
					message: result.error?.message,
					stack: result.error?.stack
				}
			}
		} else if (arg === 'event-get-space-desc') {
			const space_id = arg2
			if (uuid_validate(space_id) && uuid_version(space_id)) {
				const {branch_id, operation_id} = history_focus
				const history_line = get_history_line(branch_id, operation_id)
				if (history_line.line)
					return { desc: { space_id, history_focus, history_line: history_line.line } }
				else
					return { error: history_line.error }
			}
			else
				return {error: {message: 'space_id is not valid uuid v7'}}
		} else if (arg === 'event-set-operation-in-focus') {
			const branch_id = arg2
			const operation_id = arg3
			if (!(branch_id in present_operations_in_branches))
				return {error: {message: `branch ${branch_id} not found`}}

			const { exists, error } = is_row_exist(
				optree_id_to_name(branch_id), operation_id
			)
			if (error)
				return { error }
			if (!exists)
				return {
					error: {
						code: `root operation ${
								operation_id
							} not found in branch ${
								branch_id
							}`,
						message: `can't add branch for not existing operation ${
								operation_id
							} from branch ${
								branch_id
							}`,
						stack: 'not available'
					}
				}
			const is_present = present_operations_in_branches[branch_id].id === operation_id
			history_focus.branch_id = branch_id
			history_focus.operation_id = operation_id
			history_focus.is_present = is_present
			const ipc_graph = registered_ipc_renders['graph']
			ipc_graph && ipc_graph.send(
				'asynchronous-reply', 'event-set-operation-in-focus',
				branch_id, operation_id, is_present
			)
			for (let space_window_id in registered_ipc_spaces) {
				registered_ipc_spaces[space_window_id].send(
					'asynchronous-reply', 'event-set-operation-in-focus'
				)
			}
			return {history_focus}
		}
		return { uknown_command: true }
	})

	function handle_all_windows_registered() {
		const ipc_history = registered_ipc_renders['history']
		const ipc_graph = registered_ipc_renders['graph']
		if (ipc_history && ipc_graph) {
			ipc_history.send(
				'asynchronous-reply', 'event-show-history-on-start', history_render_sequence
			)
			const {branch_id, operation_id, is_present} = history_focus
			ipc_history.send(
				'asynchronous-reply', 'event-set-operation-in-focus',
				branch_id, operation_id, is_present
			)
			ipc_graph.send(
				'asynchronous-reply', 'event-set-operation-in-focus',
				branch_id, operation_id, is_present
			)
		}
	}

	ipcMain.on('asynchronous-message', (event, arg, arg2, arg3, arg4) => {
		if (arg === 'event-register-ipc-render') {
			const render_name = arg2
			registered_ipc_renders[render_name] = event.sender
			handle_all_windows_registered()
		} else if (arg === 'event-register-ipc-space') {
			const window_id = arg2
			registered_ipc_spaces[window_id] = event.sender
		} else if (arg === 'event-add-operation') {
			const patch_desc = arg2
			const ipc_history = registered_ipc_renders['history']
			ipc_history && ipc_history.send(
				'asynchronous-reply', 'event-add-operation',
				patch_desc, history_focus
			)
			for (let space_window_id in registered_ipc_spaces) {
				registered_ipc_spaces[space_window_id].send(
					'asynchronous-reply', 'event-add-operation'
				)
			}
		} else if (arg === 'event-add-history-branch') {
			const ipc_history = registered_ipc_renders['history']
			ipc_history && ipc_history.send(
				'asynchronous-reply', 'event-add-history-branch',
				history_render_sequence, history_focus
			)
		}
	})

	ipcMain.on('synchronous-message', (event, arg) => {
		let result = 'unknown command'
		if (arg === 'uuid_nil')
			result = uuid_nil
		else if (arg === 'uuidv7')
			result = uuidv7()
		event.returnValue = result
	})

	app.on('activate', () => {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) {
			space_window_number = 0
			registered_ipc_renders = {}
			registered_ipc_spaces = {}
			createAllWindows()
		}
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