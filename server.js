// Minimal Express server with strict CORS, secure cookies, and SQLite (better-sqlite3)
// - Local dev can use in-memory DB; Render free plan uses /tmp/db.sqlite

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const db = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const isProd = process.env.NODE_ENV === 'production';

// Allow Render/Heroku-style proxies so req.secure works and secure cookies are honored
app.set('trust proxy', 1);

// Parse JSON and cookies
app.use(express.json());
app.use(cookieParser());

// Strict CORS allowlist from env (comma-separated)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow server-to-server / curl / health checks with no Origin
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.includes(origin);
    return allowed ? callback(null, true) : callback(new Error('CORS blocked: ' + origin));
  },
  credentials: true,
};

app.use(cors(corsOptions));
// Handle preflight for all routes
app.options('*', cors(corsOptions));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

// Demo auth endpoints using an httpOnly cookie (for real apps, validate credentials and sign JWT)
app.post('/auth/mock-login', (req, res) => {
  const token = 'mock.' + Buffer.from('user').toString('base64');
  const cookieOptions = isProd
    ? { httpOnly: true, sameSite: 'none', secure: true, path: '/' }
    : { httpOnly: true, sameSite: 'lax', secure: false, path: '/' };
  res.cookie('token', token, cookieOptions);
  res.json({ loggedIn: true });
});

app.post('/auth/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ loggedIn: false });
});

app.get('/auth/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true });
});

// Simple items API backed by SQLite
app.get('/items', (req, res) => {
  const items = db.getItems();
  res.json({ items });
});

app.post('/items', (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }
  const item = db.addItem(name);
  res.status(201).json({ item });
});

app.listen(PORT, () => {
  /* eslint-disable no-console */
  console.log(`API listening on port ${PORT} (prod=${isProd})`);
  console.log('Allowed origins:', allowedOrigins);
});