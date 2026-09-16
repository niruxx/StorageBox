const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const { loadConfig } = require('./config');
const { buildAccessResolver, uploadsEnabled, writeAccessEnabled, webdavEnabled, canUserSee, isAdmin } = require('./access');
const { buildListRouter } = require('./routes/list');
const { buildInfoRouter } = require('./routes/info');
const { buildDownloadRouter } = require('./routes/download');
const { buildUploadRouter } = require('./routes/upload');
const { buildFsRouter } = require('./routes/fs');
const { buildWebdavMiddleware } = require('./webdav');
const { buildAuthRouter, requireAuth, requireAdmin } = require('./routes/auth');
const { buildAdminRouter } = require('./routes/admin');

// `config` is a single mutable object, kept for the life of the process and
// updated in place (never reassigned) whenever the admin settings GUI saves
// a change — see server/routes/admin.js. Every closure below that reads
// config.* fields therefore always sees the live value. root/host/port are
// the exception: they're only read once, here, at process start.
const config = loadConfig();

// `accessState.resolver` is rebuilt whenever allowWriteAccess (or
// adminEnabled) changes; the `isWritable` function below is a stable
// reference that always reads through the current resolver, so every
// router built with it (list, info, fs, webdav) picks up new rules live
// without needing to be reconstructed. Built from the *effective* enabled
// flag so "adminEnabled: false" forces read-only everywhere no matter what
// allowWriteAccess itself says.
const accessState = {
  resolver: buildAccessResolver({ ...config.allowWriteAccess, enabled: writeAccessEnabled(config) })
};
const isWritable = (relPath) => accessState.resolver.isWritable(relPath);

const app = express();

const publicDir = path.join(__dirname, '..', 'public');
const UPLOAD_ROUTE = '/api/upload';
const FS_ROUTE_PREFIX = '/api/fs/';
const WEBDAV_PREFIX = '/webdav';

function loadOrCreateSessionSecret(secretPath) {
  const existing = fs.existsSync(secretPath) ? fs.readFileSync(secretPath, 'utf-8').trim() : '';
  if (existing) return existing;
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(secretPath, secret, 'utf-8');
  return secret;
}

// Sessions back the optional login system (server/routes/auth.js). This is
// mounted unconditionally so "adminEnabled" can be toggled on/off later from
// the admin GUI without restarting the process — when it's false (the
// default), nothing here ever gets exercised: no login route works, so no
// session is ever created for a visitor.
app.use(
  session({
    secret: loadOrCreateSessionSecret(config.sessionSecretPath),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    }
  })
);

// Read-only by default at the server engine level: every write method is
// rejected here, before any router sees the request. Only two things can
// let a write method through:
//   1. POST /api/upload, and only when uploadsEnabled(config) is true.
//   2. PUT/DELETE/PATCH under /api/fs/, and only when writeAccessEnabled(config)
//      is true — the fs router then re-checks per-path read-only/read-write
//      rules itself (server/access.js) before touching the filesystem.
// Both of those already fold in "adminEnabled" (server/access.js), so with
// adminEnabled off — the default — this gate blocks every write, full stop,
// regardless of what allowAnonymousUpload/allowWriteAccess say in config.json.
// /webdav is exempt from this gate because it owns a wider set of HTTP verbs
// (MKCOL, MOVE, LOCK, ...) and enforces the same per-path rules through its
// own privilege manager (server/webdav.js).
const WRITE_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);
app.use((req, res, next) => {
  if (req.path.startsWith(WEBDAV_PREFIX)) return next();
  if (!WRITE_METHODS.has(req.method)) return next();
  if (uploadsEnabled(config) && req.path === UPLOAD_ROUTE) return next();
  if (writeAccessEnabled(config) && req.path.startsWith(FS_ROUTE_PREFIX)) return next();
  // The admin API legitimately uses PUT/POST/PATCH/DELETE too — let those
  // through here; requireAdmin (applied below where it's mounted) is what
  // actually protects them.
  if (req.path.startsWith('/api/admin/') || req.path.startsWith('/api/auth/')) return next();
  return res.status(405).json({ error: 'Write operations are disabled on this server.' });
});

// /api and /files are registered before the app-shell static mount below so
// that a crafted path (e.g. containing "..") can never be intercepted by the
// publicDir static handler before reaching our own path-traversal guards.
app.get('/api/config', (req, res) => {
  res.json({
    title: config.title,
    uploadEnabled: uploadsEnabled(config),
    writeAccessEnabled: writeAccessEnabled(config),
    adminEnabled: config.adminEnabled
  });
});

// Auth endpoints (status/setup/login/logout) are always reachable — they're
// the only way to ever reach an authenticated state in the first place.
app.use('/api/auth', buildAuthRouter(config));

// Everything below this point serves directory contents or lets an admin
// change server state, so it all sits behind requireAuth: a no-op whenever
// adminEnabled is false, otherwise it demands a logged-in session.
const authGate = requireAuth(config);

app.use('/api/list', authGate, buildListRouter(config, isWritable));
app.use('/api/info', authGate, buildInfoRouter(config, isWritable));
app.use(UPLOAD_ROUTE, authGate, buildUploadRouter(config));
app.use('/api/fs', authGate, buildFsRouter(config, isWritable));
app.use('/api/admin', requireAdmin(config), buildAdminRouter(config, accessState));

// Static assets for the in-browser text/code editor (CodeMirror) — harmless
// to always serve; the editor is simply never opened unless a file is
// writable.
app.use('/vendor/codemirror', express.static(path.join(__dirname, '..', 'node_modules', 'codemirror')));

// WebDAV is built once at boot (it owns its own long-lived server instance)
// but gated live on every request via webdavEnabled(config), which can
// change later from the admin GUI. It's also admin-only: per-user
// visibility scoping (server/access.js canUserSee/canUserReach) isn't
// applied to it — filtering that deep inside PROPFIND responses isn't worth
// the complexity — so rather than let a restricted viewer browse the whole
// tree over DAV, it's simply unavailable to non-admin accounts.
const webdavHandler = buildWebdavMiddleware(config.rootDir, isWritable);
app.use((req, res, next) => {
  if (!req.path.startsWith(WEBDAV_PREFIX)) return next();
  if (!webdavEnabled(config)) return res.status(404).end();
  authGate(req, res, (err) => {
    if (err) return next(err);
    if (!isAdmin(req, config)) {
      return res.status(403).end();
    }
    webdavHandler(req, res, next);
  });
});

// Read-only file access with HTTP range support (streaming for audio/video).
// index:false so folders can't be listed/served as directory indexes here.
app.use(
  '/files',
  authGate,
  (req, res, next) => {
    const relPath = decodeURIComponent(req.path.replace(/^\/+/, ''));
    if (!canUserSee(req, config, relPath)) return res.status(404).end();
    next();
  },
  express.static(config.rootDir, {
    index: false,
    redirect: false,
    dotfiles: 'ignore',
    fallthrough: false
  })
);

// Forces a Content-Disposition: attachment download instead of inline viewing.
app.use('/download', authGate, buildDownloadRouter(config));

// App shell assets (index.html, styles.css, app.js, login/admin pages) are
// intentionally NOT gated: they're static UI code with no data in them. The
// data they fetch through the routes above is what's actually protected.
app.use(express.static(publicDir, { redirect: false }));

app.get('/login', (req, res) => res.sendFile(path.join(publicDir, 'login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(publicDir, 'admin.html')));

// Client-side routed browse pages all serve the same app shell.
app.get('/browse/*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error.' });
});

app.listen(config.port, config.host, () => {
  const displayHost = config.host === '0.0.0.0' ? 'localhost' : config.host;
  console.log(`${config.title} serving "${config.rootDir}"`);
  console.log(`-> http://${displayHost}:${config.port}`);
  if (config.adminEnabled) {
    console.log('-> adminEnabled is on: login is required (visit /login).');
  }
});
