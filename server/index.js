const fs = require('fs');
const path = require('path');
const express = require('express');
const { loadConfig } = require('./config');
const { buildAccessResolver } = require('./access');
const { buildListRouter } = require('./routes/list');
const { buildInfoRouter } = require('./routes/info');
const { buildDownloadRouter } = require('./routes/download');
const { buildUploadRouter } = require('./routes/upload');
const { buildFsRouter } = require('./routes/fs');
const { buildWebdavMiddleware } = require('./webdav');

const config = loadConfig();
const accessResolver = buildAccessResolver(config.allowWriteAccess);
const app = express();

const publicDir = path.join(__dirname, '..', 'public');
const UPLOAD_ROUTE = '/api/upload';
const FS_ROUTE_PREFIX = '/api/fs/';
const WEBDAV_PREFIX = '/webdav';

// Read-only by default at the server engine level: every write method is
// rejected here, before any router sees the request. Only two things can
// let a write method through:
//   1. POST /api/upload, and only when "allowAnonymousUpload" is enabled.
//   2. PUT/DELETE/PATCH under /api/fs/, and only when "allowWriteAccess" is
//      enabled — the fs router then re-checks per-path read-only/read-write
//      rules itself (server/access.js) before touching the filesystem.
// /webdav is exempt from this gate because it owns a wider set of HTTP verbs
// (MKCOL, MOVE, LOCK, ...) and enforces the same per-path rules through its
// own privilege manager (server/webdav.js) — it is only mounted at all when
// both allowWriteAccess.enabled and allowWriteAccess.webdav are set.
const WRITE_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);
app.use((req, res, next) => {
  if (req.path.startsWith(WEBDAV_PREFIX)) return next();
  if (!WRITE_METHODS.has(req.method)) return next();
  if (config.allowAnonymousUpload && req.path === UPLOAD_ROUTE) return next();
  if (config.allowWriteAccess.enabled && req.path.startsWith(FS_ROUTE_PREFIX)) return next();
  return res.status(405).json({ error: 'Write operations are disabled on this server.' });
});

// /api and /files are registered before the app-shell static mount below so
// that a crafted path (e.g. containing "..") can never be intercepted by the
// publicDir static handler before reaching our own path-traversal guards.
app.get('/api/config', (req, res) => {
  res.json({
    title: config.title,
    uploadEnabled: config.allowAnonymousUpload,
    writeAccessEnabled: config.allowWriteAccess.enabled
  });
});

app.use('/api/list', buildListRouter(config.rootDir, accessResolver.isWritable));
app.use('/api/info', buildInfoRouter(config.rootDir, config.title, accessResolver.isWritable));

if (config.allowAnonymousUpload) {
  const uploadsDir = path.join(config.rootDir, 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use(UPLOAD_ROUTE, buildUploadRouter(uploadsDir, config.anonymousLogPath));
}

if (config.allowWriteAccess.enabled) {
  app.use('/api/fs', buildFsRouter(config.rootDir, accessResolver.isWritable));

  // Static assets for the in-browser text/code editor (CodeMirror), only
  // needed when edits are actually possible.
  app.use('/vendor/codemirror', express.static(path.join(__dirname, '..', 'node_modules', 'codemirror')));

  if (config.allowWriteAccess.webdav) {
    app.use(buildWebdavMiddleware(config.rootDir, accessResolver));
  }
}

// Read-only file access with HTTP range support (streaming for audio/video).
// index:false so folders can't be listed/served as directory indexes here.
app.use(
  '/files',
  express.static(config.rootDir, {
    index: false,
    redirect: false,
    dotfiles: 'ignore',
    fallthrough: false
  })
);

// Forces a Content-Disposition: attachment download instead of inline viewing.
app.use('/download', buildDownloadRouter(config.rootDir));

// App shell assets (index.html, styles.css, app.js)
app.use(express.static(publicDir, { redirect: false }));

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
});
