// better-sqlite3 database setup with in-memory (local) or /tmp on Render free tier
const Database = require('better-sqlite3');

const useInMemory = String(process.env.USE_IN_MEMORY).toLowerCase() === 'true';
const dbPath = useInMemory ? ':memory:' : (process.env.SQLITE_PATH || '/tmp/db.sqlite');

const db = new Database(dbPath);
// Pragmas to improve concurrency and reliability
try {
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 2000');
} catch {}

// Initialize schema
const initSQL = `
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
db.exec(initSQL);

function getItems() {
  const stmt = db.prepare('SELECT id, name, created_at FROM items ORDER BY id DESC');
  return stmt.all();
}

function addItem(name) {
  const insert = db.prepare('INSERT INTO items (name) VALUES (?)');
  const info = insert.run(name);
  const get = db.prepare('SELECT id, name, created_at FROM items WHERE id = ?');
  return get.get(info.lastInsertRowid);
}

module.exports = { db, getItems, addItem };