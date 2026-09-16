const express = require('express');
const { saveConfigPatch } = require('../config');
const { buildAccessResolver } = require('../access');
const { listUsers, createUser, deleteUser, setPassword } = require('../users');

// All routes here are mounted behind requireAdmin (see server/index.js) —
// only a logged-in admin session can reach this router.
function buildAdminRouter(config, accessState) {
  const router = express.Router();

  router.get('/settings', (req, res) => {
    res.json({
      title: config.title,
      openDirectoryMode: config.openDirectoryMode,
      allowAnonymousUpload: config.allowAnonymousUpload,
      allowWriteAccess: config.allowWriteAccess,
      // Shown for reference only — changing these requires editing
      // config.json directly and restarting the process.
      root: config.rootDir,
      host: config.host,
      port: config.port
    });
  });

  router.put('/settings', express.json(), (req, res) => {
    let saved;
    try {
      saved = saveConfigPatch(config.configPath, req.body || {});
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Could not save settings.' });
    }
    Object.assign(config, saved);
    // Rebuild the shared resolver in place so every already-constructed
    // router (list/info/fs/webdav) picks up the new rules on their next
    // request — see the accessState indirection in server/index.js.
    accessState.resolver = buildAccessResolver(config.allowWriteAccess);
    res.json({ ok: true, settings: saved });
  });

  router.get('/users', (req, res) => {
    res.json({ users: listUsers(config.usersPath) });
  });

  router.post('/users', express.json(), (req, res) => {
    try {
      const { username, password, role } = req.body || {};
      const user = createUser(config.usersPath, { username, password, role });
      res.json({ ok: true, user });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.patch('/users/:username', express.json(), (req, res) => {
    try {
      if (req.body && typeof req.body.password === 'string' && req.body.password) {
        setPassword(config.usersPath, req.params.username, req.body.password);
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete('/users/:username', (req, res) => {
    if (
      req.session &&
      req.session.user &&
      req.session.user.username.toLowerCase() === req.params.username.toLowerCase()
    ) {
      return res.status(400).json({ error: 'You cannot delete your own account while logged in.' });
    }
    try {
      deleteUser(config.usersPath, req.params.username);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}

module.exports = { buildAdminRouter };
