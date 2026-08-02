const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'todos.json');

function ensureDbFile() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ todos: [], nextId: 1 }, null, 2));
  }
}

function readDb() {
  ensureDbFile();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    const fresh = { todos: [], nextId: 1 };
    fs.writeFileSync(DB_PATH, JSON.stringify(fresh, null, 2));
    return fresh;
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getAll() {
  const db = readDb();
  return db.todos;
}

function getById(id) {
  const db = readDb();
  return db.todos.find((t) => t.id === id);
}

function create({ title, description = '', completed = false }) {
  const db = readDb();
  const now = new Date().toISOString();
  const todo = {
    id: db.nextId,
    title,
    description,
    completed: Boolean(completed),
    createdAt: now,
    updatedAt: now,
  };
  db.todos.push(todo);
  db.nextId += 1;
  writeDb(db);
  return todo;
}

function update(id, updates) {
  const db = readDb();
  const idx = db.todos.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  const existing = db.todos[idx];
  const updated = {
    ...existing,
    ...('title' in updates ? { title: updates.title } : {}),
    ...('description' in updates ? { description: updates.description } : {}),
    ...('completed' in updates ? { completed: Boolean(updates.completed) } : {}),
    updatedAt: new Date().toISOString(),
  };

  db.todos[idx] = updated;
  writeDb(db);
  return updated;
}

function remove(id) {
  const db = readDb();
  const idx = db.todos.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  db.todos.splice(idx, 1);
  writeDb(db);
  return true;
}

module.exports = { getAll, getById, create, update, remove };
