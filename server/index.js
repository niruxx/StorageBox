const path = require('path');
const express = require('express');
const { loadConfig } = require('./config');
const { buildListRouter } = require('./routes/list');
const { buildInfoRouter } = require('./routes/info');
const { buildDownloadRouter } = require('./routes/download');

const config = loadConfig();
const app = express();

const publicDir = path.join(__dirname, '..', 'public');

// /api and /files are registered before the app-shell static mount below so
// that a crafted path (e.g. containing "..") can never be intercepted by the
// publicDir static handler before reaching our own path-traversal guards.
app.get('/api/config', (req, res) => {
  res.json({ title: config.title });
});

app.use('/api/list', buildListRouter(config.rootDir));
app.use('/api/info', buildInfoRouter(config.rootDir, config.title));

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
