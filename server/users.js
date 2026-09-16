const fs = require('fs');
const bcrypt = require('bcryptjs');

// Flat JSON user store, mirroring how config.json/log_anonymous.log already
// work in this project — no database dependency for a single-folder
// self-hosted app. Only relevant when adminEnabled is true; the file is
// created on first admin setup, not before.
const SALT_ROUNDS = 10;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

// A "viewer" with an empty allowedPaths list can see everything (the
// default — matches the old flat admin/viewer split). A non-empty list
// restricts them to just those folders (and their subfolders) — see
// canUserSee/canUserReach in server/access.js. Meaningless for admins, who
// always see everything regardless of this field.
function sanitizeAllowedPaths(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  for (const entry of raw) {
    const norm = String(entry || '').replace(/^\/+|\/+$/g, '').trim();
    if (norm) seen.add(norm);
  }
  return Array.from(seen);
}

function loadUsers(usersPath) {
  if (!fs.existsSync(usersPath)) return [];
  try {
    const raw = fs.readFileSync(usersPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.users) ? parsed.users : [];
  } catch {
    return [];
  }
}

function saveUsers(usersPath, users) {
  fs.writeFileSync(usersPath, JSON.stringify({ users }, null, 2), 'utf-8');
}

function isValidUsername(username) {
  return typeof username === 'string' && USERNAME_RE.test(username);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 200;
}

function hasAdmin(usersPath) {
  return loadUsers(usersPath).some((u) => u.role === 'admin');
}

function findUser(usersPath, username) {
  const lower = String(username || '').toLowerCase();
  return loadUsers(usersPath).find((u) => u.username.toLowerCase() === lower) || null;
}

function publicUser(user) {
  return {
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    allowedPaths: Array.isArray(user.allowedPaths) ? user.allowedPaths : []
  };
}

function createUser(usersPath, { username, password, role, allowedPaths }) {
  if (!isValidUsername(username)) {
    throw new Error('Username must be 3-32 characters: letters, numbers, underscore, dot, or hyphen.');
  }
  if (!isValidPassword(password)) {
    throw new Error('Password must be at least 8 characters.');
  }
  const users = loadUsers(usersPath);
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('That username is already taken.');
  }
  const user = {
    username,
    passwordHash: bcrypt.hashSync(password, SALT_ROUNDS),
    role: role === 'admin' ? 'admin' : 'viewer',
    allowedPaths: sanitizeAllowedPaths(allowedPaths),
    createdAt: new Date().toISOString()
  };
  users.push(user);
  saveUsers(usersPath, users);
  return publicUser(user);
}

function verifyUser(usersPath, username, password) {
  const user = findUser(usersPath, username);
  if (!user) return null;
  if (!bcrypt.compareSync(String(password || ''), user.passwordHash)) return null;
  return publicUser(user);
}

function setPassword(usersPath, username, newPassword) {
  if (!isValidPassword(newPassword)) {
    throw new Error('Password must be at least 8 characters.');
  }
  const users = loadUsers(usersPath);
  const user = users.find((u) => u.username.toLowerCase() === String(username).toLowerCase());
  if (!user) throw new Error('User not found.');
  user.passwordHash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
  saveUsers(usersPath, users);
}

function setAllowedPaths(usersPath, username, allowedPaths) {
  const users = loadUsers(usersPath);
  const user = users.find((u) => u.username.toLowerCase() === String(username).toLowerCase());
  if (!user) throw new Error('User not found.');
  user.allowedPaths = sanitizeAllowedPaths(allowedPaths);
  saveUsers(usersPath, users);
}

function deleteUser(usersPath, username) {
  const users = loadUsers(usersPath);
  const target = users.find((u) => u.username.toLowerCase() === String(username).toLowerCase());
  if (!target) throw new Error('User not found.');
  if (target.role === 'admin' && users.filter((u) => u.role === 'admin').length <= 1) {
    throw new Error('Cannot delete the last admin account.');
  }
  saveUsers(usersPath, users.filter((u) => u !== target));
}

function listUsers(usersPath) {
  return loadUsers(usersPath).map(publicUser);
}

module.exports = {
  hasAdmin,
  findUser,
  createUser,
  verifyUser,
  setPassword,
  setAllowedPaths,
  deleteUser,
  listUsers,
  publicUser
};
