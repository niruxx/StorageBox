const express = require('express');
const fs = require('fs');
const { safeResolve } = require('./list');
const { canUserSee } = require('../access');

function buildDownloadRouter(config) {
  const rootDir = config.rootDir;
  const router = express.Router();

  router.get(/^\/(.*)$/, (req, res) => {
    const relPath = decodeURIComponent(req.params[0] || '');
    const cleanRelPath = relPath.replace(/^\/+|\/+$/g, '');
    const target = safeResolve(rootDir, relPath);

    if (!target) {
      return res.status(400).json({ error: 'Invalid path.' });
    }
    if (!canUserSee(req, config, cleanRelPath)) {
      return res.status(404).json({ error: 'File not found.' });
    }

    fs.stat(target, (err, stat) => {
      if (err || !stat.isFile()) {
        return res.status(404).json({ error: 'File not found.' });
      }
      res.download(target);
    });
  });

  return router;
}

module.exports = { buildDownloadRouter };
