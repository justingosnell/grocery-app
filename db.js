// db.js (ESM) - SQLite setup with better-sqlite3
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const defaultDbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'db.sqlite');
fs.mkdirSync(path.dirname(defaultDbPath), { recursive: true });

// Open DB
const db = new Database(defaultDbPath);

// Pragmas for durability and integrity
// - WAL allows concurrent reads and reduces write-lock contention
// - foreign_keys enforces FK constraints
try {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
} catch {}

// Idempotent schema
// - users: username unique, password_hash
// - lists: unique per (user_id, name), items_json stores array of items
// - updated_at is maintained by application logic on updates
const schema = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  items_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);
`;

db.exec(schema);

export default db;