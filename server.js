/*
  Express + Socket.IO server using SQLite (better-sqlite3)
  - Loads env from .env
  - Auth: JWT + bcryptjs
  - Lists CRUD protected by JWT
  - Serves static frontend from project root
*/

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

dotenv.config();

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// Express + HTTP + Socket.IO
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, cb) => cb(null, true),
    credentials: true
  }
});

// CORS for API
app.use(cors({
  origin: (origin, cb) => cb(null, true), // reflect any origin in dev; lock this down in prod
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// Serve frontend static files from project root
const __filename = fileURLToPath(import.meta.url);
typeof __filename; // silence unused var in some tools
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = __dirname; // project root contains index.html
app.use(express.static(PUBLIC_DIR));

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok', mode: 'sqlite' }));

// --- Auth Middleware (cookie-based) ---
function auth(req, res, next) {
  const token = req.cookies?.auth || null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.id, username: payload.username };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// --- SQLite helpers ---
const stmtFindUserByUsername = db.prepare('SELECT * FROM users WHERE username = ?');
const stmtInsertUser = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');

const stmtListAll = db.prepare('SELECT id, name, items_json, updated_at FROM lists WHERE user_id = ? ORDER BY datetime(updated_at) DESC, id DESC');
const stmtListOne = db.prepare('SELECT id, name, items_json, updated_at FROM lists WHERE user_id = ? AND name = ?');
const stmtInsertList = db.prepare('INSERT INTO lists (user_id, name, items_json, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const stmtUpdateList = db.prepare('UPDATE lists SET items_json = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND name = ?');
const stmtDeleteList = db.prepare('DELETE FROM lists WHERE user_id = ? AND name = ?');

// --- Auth Routes ---
const cookieOptions = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ message: 'username and password required' });

    const existing = stmtFindUserByUsername.get(username);
    if (existing) return res.status(409).json({ message: 'Username already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const info = stmtInsertUser.run(username, passwordHash);

    const token = jwt.sign({ id: info.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('auth', token, cookieOptions);
    res.status(201).json({ username });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Register failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: 'username and password required' });

  const user = stmtFindUserByUsername.get(username);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('auth', token, cookieOptions);
  res.json({ username: user.username });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth', { httpOnly: true, sameSite: 'lax', secure: cookieOptions.secure });
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  try {
    const token = req.cookies?.auth;
    if (!token) return res.status(200).json({ user: null });
    const payload = jwt.verify(token, JWT_SECRET);
    return res.json({ user: { id: payload.id, username: payload.username } });
  } catch {
    return res.status(200).json({ user: null });
  }
});

// --- Lists API (Authenticated) ---
app.get('/api/lists', auth, (req, res) => {
  const rows = stmtListAll.all(req.user.id);
  const lists = rows.map(r => ({ name: r.name, items: JSON.parse(r.items_json), updatedAt: r.updated_at }));
  res.json(lists);
});

app.get('/api/lists/:name', auth, (req, res) => {
  const { name } = req.params;
  const row = stmtListOne.get(req.user.id, name);
  if (!row) return res.status(404).json({ message: 'List not found' });
  res.json({ name: row.name, items: JSON.parse(row.items_json), updatedAt: row.updated_at });
});

app.post('/api/lists', auth, (req, res) => {
  try {
    const { name, items = [] } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name required' });
    // Ensure not duplicate
    const exists = stmtListOne.get(req.user.id, name);
    if (exists) return res.status(409).json({ message: 'List already exists' });

    stmtInsertList.run(req.user.id, name, JSON.stringify(items));
    io.emit('list:created', { userId: req.user.id, name });
    res.status(201).json({ name, items });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Create failed' });
  }
});

app.put('/api/lists/:name', auth, (req, res) => {
  try {
    const { items = [] } = req.body || {};
    const { name } = req.params;
    const result = stmtUpdateList.run(JSON.stringify(items), req.user.id, name);
    if (result.changes === 0) return res.status(404).json({ message: 'List not found' });
    io.emit('list:updated', { userId: req.user.id, name });
    res.json({ name, items });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Update failed' });
  }
});

app.delete('/api/lists/:name', auth, (req, res) => {
  const { name } = req.params;
  const result = stmtDeleteList.run(req.user.id, name);
  if (result.changes === 0) return res.status(404).json({ message: 'List not found' });
  io.emit('list:deleted', { userId: req.user.id, name });
  res.json({ ok: true });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected', socket.id));
});

// Fallback to index.html for SPA routes
app.get('*', (req, res, next) => {
  // Only handle GET requests that accept HTML
  if (req.method !== 'GET') return next();
  const accept = req.headers.accept || '';
  if (!accept.includes('text/html')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Start server
server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT} (mode: sqlite)`));