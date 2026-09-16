const express = require('express');
const { hasAdmin, createUser, verifyUser } = require('../users');

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map();

function attemptKey(req, username) {
  return `${req.ip}:${String(username || '').toLowerCase()}`;
}

function tooManyAttempts(key) {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(key) {
  const entry = attempts.get(key);
  if (!entry || Date.now() > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: Date.now() + ATTEMPT_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function clearAttempts(key) {
  attempts.delete(key);
}

// Gate applied to every data-bearing route (see server/index.js). `config`
// is the single mutable config object created at boot — reading
// config.openDirectoryMode here always reflects the live value, including
// after an admin flips it from the settings GUI.
function requireAuth(config) {
  return (req, res, next) => {
    if (config.openDirectoryMode) return next();
    if (req.session && req.session.user) return next();
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Login required.' });
    }
    return res.redirect('/login');
  };
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Admin access required.' });
}

function buildAuthRouter(config) {
  const router = express.Router();

  router.get('/status', (req, res) => {
    if (config.openDirectoryMode) return res.json({ mode: 'open' });
    if (!hasAdmin(config.usersPath)) return res.json({ mode: 'setup' });
    if (req.session && req.session.user) return res.json({ mode: 'authenticated', user: req.session.user });
    return res.json({ mode: 'login' });
  });

  router.post('/setup', express.json(), (req, res) => {
    if (config.openDirectoryMode) {
      return res.status(400).json({ error: 'Open directory mode is enabled; no login is required.' });
    }
    if (hasAdmin(config.usersPath)) {
      return res.status(400).json({ error: 'Setup has already been completed. Please log in instead.' });
    }
    const { username, password } = req.body || {};
    let user;
    try {
      user = createUser(config.usersPath, { username, password, role: 'admin' });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Could not start a session.' });
      req.session.user = user;
      res.json({ ok: true, user });
    });
  });

  router.post('/login', express.json(), (req, res) => {
    if (config.openDirectoryMode) {
      return res.status(400).json({ error: 'Open directory mode is enabled; no login is required.' });
    }
    const { username, password } = req.body || {};
    const key = attemptKey(req, username);
    if (tooManyAttempts(key)) {
      return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    }
    const user = verifyUser(config.usersPath, username, password);
    if (!user) {
      recordFailedAttempt(key);
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    clearAttempts(key);
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Could not start a session.' });
      req.session.user = user;
      res.json({ ok: true, user });
    });
  });

  router.post('/logout', (req, res) => {
    if (!req.session) return res.json({ ok: true });
    req.session.destroy(() => res.json({ ok: true }));
  });

  return router;
}

module.exports = { buildAuthRouter, requireAuth, requireAdmin };
