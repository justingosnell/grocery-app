/*
  Express + Socket.IO server with MongoDB (Mongoose) and a dev-friendly in-memory fallback
  - Loads env from .env
  - If MongoDB is available, uses it; otherwise can run entirely in-memory
  - Auth: JWT + bcryptjs
  - Lists CRUD protected by JWT
*/

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/grocery_app';
let USE_MEMORY = (process.env.USE_IN_MEMORY || '').toLowerCase() === 'true';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// In-memory stores (used when USE_MEMORY === true)
const memory = {
  users: [], // { id, username, passwordHash }
  lists: []  // { userId, name, items: [{ name, quantity, emoji, completed }] }
};

// Mongo models (only used when USE_MEMORY === false)
const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  emoji: { type: String, default: '' },
  completed: { type: Boolean, default: false }
}, { _id: false });

const listSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  name: { type: String, required: true },
  items: { type: [itemSchema], default: [] },
}, { timestamps: true });
listSchema.index({ userId: 1, name: 1 }, { unique: true });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const List = mongoose.model('List', listSchema);

// Express + HTTP + Socket.IO
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Serve frontend static files from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = __dirname; // project root contains index.html
app.use(express.static(PUBLIC_DIR));

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok', mode: USE_MEMORY ? 'memory' : 'mongo' }));

// --- Auth Middleware ---
function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.id, username: payload.username };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// --- In-memory helpers ---
async function memFindUserByUsername(username) {
  return memory.users.find(u => u.username === username) || null;
}
async function memCreateUser(username, password) {
  const existing = await memFindUserByUsername(username);
  if (existing) return { error: 'Username already exists', status: 409 };
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: randomUUID(), username, passwordHash };
  memory.users.push(user);
  return { user };
}
async function memVerifyUser(username, password) {
  const user = await memFindUserByUsername(username);
  if (!user) return { error: 'Invalid credentials', status: 401 };
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: 'Invalid credentials', status: 401 };
  return { user };
}
function memGetLists(userId) {
  return memory.lists.filter(l => l.userId === userId).sort((a, b) => 0); // no timestamps in memory
}
function memGetList(userId, name) {
  return memory.lists.find(l => l.userId === userId && l.name === name) || null;
}
function memCreateList(userId, name, items = []) {
  if (memGetList(userId, name)) return { error: 'List already exists', status: 409 };
  const list = { userId, name, items };
  memory.lists.push(list);
  return { list };
}
function memUpdateList(userId, name, items = []) {
  const list = memGetList(userId, name);
  if (!list) return { error: 'List not found', status: 404 };
  list.items = items;
  return { list };
}
function memDeleteList(userId, name) {
  const idx = memory.lists.findIndex(l => l.userId === userId && l.name === name);
  if (idx === -1) return { error: 'List not found', status: 404 };
  const [deleted] = memory.lists.splice(idx, 1);
  return { deleted };
}

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ message: 'username and password required' });

    if (USE_MEMORY) {
      const { user, error, status } = await memCreateUser(username, password);
      if (error) return res.status(status).json({ message: error });
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({ token, username: user.username });
    }

    const existing = await User.findOne({ username });
    if (existing) return res.status(409).json({ message: 'Username already exists' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash });
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, username: user.username });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Register failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: 'username and password required' });

  if (USE_MEMORY) {
    const { user, error, status } = await memVerifyUser(username, password);
    if (error) return res.status(status).json({ message: error });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, username: user.username });
  }

  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username });
});

// --- Lists API (Authenticated) ---
app.get('/api/lists', auth, async (req, res) => {
  if (USE_MEMORY) {
    return res.json(memGetLists(req.user.id));
  }
  const lists = await List.find({ userId: req.user.id }).sort({ updatedAt: -1 });
  res.json(lists);
});

app.get('/api/lists/:name', auth, async (req, res) => {
  const { name } = req.params;
  if (USE_MEMORY) {
    const list = memGetList(req.user.id, name);
    if (!list) return res.status(404).json({ message: 'List not found' });
    return res.json(list);
  }
  const list = await List.findOne({ userId: req.user.id, name });
  if (!list) return res.status(404).json({ message: 'List not found' });
  res.json(list);
});

app.post('/api/lists', auth, async (req, res) => {
  try {
    const { name, items = [] } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name required' });
    if (USE_MEMORY) {
      const { list, error, status } = memCreateList(req.user.id, name, items);
      if (error) return res.status(status).json({ message: error });
      io.emit('list:created', { userId: req.user.id, name: list.name });
      return res.status(201).json(list);
    }
    const created = await List.create({ userId: req.user.id, name, items });
    io.emit('list:created', { userId: req.user.id, name: created.name });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Create failed' });
  }
});

app.put('/api/lists/:name', auth, async (req, res) => {
  try {
    const { items = [] } = req.body || {};
    const { name } = req.params;
    if (USE_MEMORY) {
      const { list, error, status } = memUpdateList(req.user.id, name, items);
      if (error) return res.status(status).json({ message: error });
      io.emit('list:updated', { userId: req.user.id, name: list.name });
      return res.json(list);
    }
    const updated = await List.findOneAndUpdate(
      { userId: req.user.id, name },
      { $set: { items } },
      { new: true, upsert: false }
    );
    if (!updated) return res.status(404).json({ message: 'List not found' });
    io.emit('list:updated', { userId: req.user.id, name: updated.name });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Update failed' });
  }
});

app.delete('/api/lists/:name', auth, async (req, res) => {
  const { name } = req.params;
  if (USE_MEMORY) {
    const { deleted, error, status } = memDeleteList(req.user.id, name);
    if (error) return res.status(status).json({ message: error });
    io.emit('list:deleted', { userId: req.user.id, name: name });
    return res.json({ ok: true });
  }
  const deleted = await List.findOneAndDelete({ userId: req.user.id, name });
  if (!deleted) return res.status(404).json({ message: 'List not found' });
  io.emit('list:deleted', { userId: req.user.id, name: deleted.name });
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
async function start() {
  if (!USE_MEMORY) {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('Connected to MongoDB');
    } catch (err) {
      console.warn('MongoDB connection failed. Falling back to in-memory mode. Reason:', err.message);
      USE_MEMORY = true;
    }
  }
  server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT} (mode: ${USE_MEMORY ? 'memory' : 'mongo'})`));
}

start();