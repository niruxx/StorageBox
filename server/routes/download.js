const express = require('express');
const fs = require('fs');
const { safeResolve } = require('./list');

function buildDownloadRouter(rootDir) {
  const router = express.Router();

  router.get(/^\/(.*)$/, (req, res) => {
    const relPath = decodeURIComponent(req.params[0] || '');
    const target = safeResolve(rootDir, relPath);

    if (!target) {
      return res.status(400).json({ error: 'Invalid path.' });
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
