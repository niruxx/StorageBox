const express = require('express');
const fs = require('fs');
const path = require('path');
const { categoryFor } = require('../fileTypes');
const { safeResolve } = require('./list');

function buildInfoRouter(rootDir, rootTitle, isWritable = () => false) {
  const router = express.Router();

  router.get(/^\/(.*)$/, (req, res) => {
    const relPath = decodeURIComponent(req.params[0] || '');
    const cleanRelPath = relPath.replace(/^\/+|\/+$/g, '');
    const target = safeResolve(rootDir, relPath);

    if (!target) {
      return res.status(400).json({ error: 'Invalid path.' });
    }

    fs.stat(target, (err, stat) => {
      if (err) {
        return res.status(404).json({ error: 'Not found.' });
      }

      const isDir = stat.isDirectory();
      const name = cleanRelPath ? path.basename(target) : rootTitle;

      const respond = (itemCount) => {
        res.json({
          name,
          path: cleanRelPath,
          type: isDir ? 'directory' : 'file',
          category: isDir ? 'directory' : categoryFor(name),
          size: isDir ? null : stat.size,
          itemCount: isDir ? itemCount : null,
          created: stat.birthtime.toISOString(),
          modified: stat.mtime.toISOString(),
          writable: isWritable(cleanRelPath)
        });
      };

      if (isDir) {
        fs.readdir(target, (readErr, files) => {
          respond(readErr ? null : files.filter((f) => !f.startsWith('.')).length);
        });
      } else {
        respond(null);
      }
    });
  });

  return router;
}

module.exports = { buildInfoRouter };
