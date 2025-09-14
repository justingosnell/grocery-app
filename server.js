/*
  Basic Express + Mongoose + Socket.IO server
  - Loads env from .env
  - Connects to MongoDB (MONGODB_URI)
  - Exposes REST API for lists
  - Emits real-time events on changes via Socket.IO
*/

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/grocery_app';

// Mongo models
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
const io = new SocketIOServer(server, {
  cors: { origin: '*'}
});

app.use(cors());
app.use(express.json());

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// --- Auth Middleware & Routes ---
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

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

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'username and password required' });
    const existing = await User.findOne({ username });
    if (existing) return res.status(409).json({ message: 'Username already exists' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash });
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, username: user.username });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username });
});

// --- Authenticated Lists API ---
app.get('/api/lists', auth, async (req, res) => {
  const lists = await List.find({ userId: req.user.id }).sort({ updatedAt: -1 });
  res.json(lists);
});

app.get('/api/lists/:name', auth, async (req, res) => {
  const list = await List.findOne({ userId: req.user.id, name: req.params.name });
  if (!list) return res.status(404).json({ message: 'List not found' });
  res.json(list);
});

app.post('/api/lists', auth, async (req, res) => {
  try {
    const { name, items = [] } = req.body;
    const created = await List.create({ userId: req.user.id, name, items });
    io.emit('list:created', { userId: req.user.id, name: created.name });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/lists/:name', auth, async (req, res) => {
  try {
    const { items } = req.body;
    const updated = await List.findOneAndUpdate(
      { userId: req.user.id, name: req.params.name },
      { $set: { items } },
      { new: true, upsert: false }
    );
    if (!updated) return res.status(404).json({ message: 'List not found' });
    io.emit('list:updated', { userId: req.user.id, name: updated.name });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/lists/:name', auth, async (req, res) => {
  const deleted = await List.findOneAndDelete({ userId: req.user.id, name: req.params.name });
  if (!deleted) return res.status(404).json({ message: 'List not found' });
  io.emit('list:deleted', { userId: req.user.id, name: deleted.name });
  res.json({ ok: true });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected', socket.id));
});

// Start
async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();