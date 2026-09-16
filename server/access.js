const { findUser } = require('./users');

// Resolves whether a given path inside the shared root is read-only or
// read-write, based on the "allowWriteAccess" config block. This is the
// single source of truth consulted by the write REST API (server/routes/fs.js),
// the WebDAV mount (server/webdav.js), and the read routes (which annotate
// listings with a "writable" flag purely for the UI to decide what to show).
//
// Callers should build this from the *effective* write-access config (see
// writeAccessEnabled below), not the raw config.allowWriteAccess, so that
// "enabled" here already accounts for adminEnabled being off.
function normalizeRulePath(p) {
  return String(p || '').replace(/^\/+|\/+$/g, '');
}

function buildAccessResolver(writeConfig) {
  const enabled = !!(writeConfig && writeConfig.enabled);
  const defaultMode = writeConfig && writeConfig.defaultMode === 'read-write' ? 'read-write' : 'read-only';

  const rules = (writeConfig && Array.isArray(writeConfig.rules) ? writeConfig.rules : [])
    .map((r) => ({
      path: normalizeRulePath(r.path),
      mode: r.mode === 'read-write' ? 'read-write' : 'read-only'
    }))
    // Longest (most specific) path prefix wins.
    .sort((a, b) => b.path.length - a.path.length);

  function resolveMode(relPath) {
    if (!enabled) return 'read-only';
    const norm = normalizeRulePath(relPath);
    for (const rule of rules) {
      if (!rule.path) continue;
      if (norm === rule.path || norm.startsWith(rule.path + '/')) return rule.mode;
    }
    return defaultMode;
  }

  function isWritable(relPath) {
    return resolveMode(relPath) === 'read-write';
  }

  return { enabled, resolveMode, isWritable };
}

// ---------- Effective feature flags ----------
// "adminEnabled: false" (the default) means a plain, anonymous, always-
// read-only OpenDirectory — allowAnonymousUpload/allowWriteAccess are
// ignored no matter what they're set to in config.json. They only take
// effect once adminEnabled is true, so every write-capable route checks
// one of these instead of the raw config fields directly.
function uploadsEnabled(config) {
  return !!(config.adminEnabled && config.allowAnonymousUpload);
}

function writeAccessEnabled(config) {
  return !!(config.adminEnabled && config.allowWriteAccess && config.allowWriteAccess.enabled);
}

function webdavEnabled(config) {
  return !!(writeAccessEnabled(config) && config.allowWriteAccess.webdav);
}

// ---------- Role: what a logged-in account can write ----------
// With adminEnabled off there's no login/role concept at all, so a path's
// own read-only/read-write rule is the only thing that matters — unchanged
// from before accounts existed. With it on, a "viewer" account must never
// be treated as able to write regardless of what a path's rule says; only
// "admin" can. Used both to enforce writes (server/routes/fs.js,
// server/index.js's WebDAV gate) and to annotate listings so the UI doesn't
// offer Edit/Rename/Delete to an account that would just get a 403
// (server/routes/list.js, info.js).
function canUserWrite(req, config) {
  if (!config.adminEnabled) return true;
  return !!(req.session && req.session.user && req.session.user.role === 'admin');
}

// ---------- Role: what a logged-in account can even see ----------
// An admin always sees everything. A viewer sees everything too *unless*
// the admin gave them an `allowedPaths` allowlist (server/users.js) — set
// via the admin GUI's "Visible folders" field. Re-read from disk on every
// check (not from the session) so an admin's edit takes effect on that
// user's very next request instead of waiting for them to log in again.
function pathAllowed(allowedPaths, relPath) {
  if (!allowedPaths || allowedPaths.length === 0) return true;
  const norm = normalizeRulePath(relPath);
  return allowedPaths.some((p) => norm === p || norm.startsWith(p + '/'));
}

// Like pathAllowed, but also true for a directory that merely sits on the
// way to an allowed path (so a restricted viewer can still navigate down
// into it from the root instead of only being able to deep-link to it).
function pathReachable(allowedPaths, relPath) {
  if (!allowedPaths || allowedPaths.length === 0) return true;
  const norm = normalizeRulePath(relPath);
  if (norm === '') return true;
  if (pathAllowed(allowedPaths, norm)) return true;
  return allowedPaths.some((p) => p === norm || p.startsWith(norm + '/'));
}

function currentViewerAllowedPaths(req, config) {
  const user = req.session && req.session.user;
  if (!user || user.role === 'admin') return null; // null = unrestricted
  const fresh = findUser(config.usersPath, user.username);
  return fresh ? fresh.allowedPaths : [];
}

// Full access to a file or directory's contents (used for /files, /download,
// /api/info, and to decide whether an entry appears at all inside its own
// parent listing).
function canUserSee(req, config, relPath) {
  if (!config.adminEnabled) return true;
  if (!(req.session && req.session.user)) return false;
  const allowedPaths = currentViewerAllowedPaths(req, config);
  return allowedPaths === null || pathAllowed(allowedPaths, relPath);
}

// Can list/navigate into this directory, even if not everything under it is
// visible (used to gate /api/list's target directory).
function canUserReach(req, config, relPath) {
  if (!config.adminEnabled) return true;
  if (!(req.session && req.session.user)) return false;
  const allowedPaths = currentViewerAllowedPaths(req, config);
  return allowedPaths === null || pathReachable(allowedPaths, relPath);
}

module.exports = {
  buildAccessResolver,
  uploadsEnabled,
  writeAccessEnabled,
  webdavEnabled,
  canUserWrite,
  canUserSee,
  canUserReach
};
