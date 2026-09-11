const express = require('express');
const fs = require('fs');
const path = require('path');
const { categoryFor } = require('../fileTypes');

/**
 * Resolves a URL-supplied relative path against rootDir, refusing to leave it.
 * Returns the absolute path, or null if the request tries to escape rootDir.
 */
function safeResolve(rootDir, relPath) {
  const normalized = path.normalize(path.join('/', relPath || '')).replace(/^(\.\.[/\\])+/, '');
  const absolute = path.join(rootDir, normalized);
  const relativeToRoot = path.relative(rootDir, absolute);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    return null;
  }
  return absolute;
}

function buildListRouter(rootDir, isWritable = () => false) {
  const router = express.Router();

  router.get(/^\/(.*)$/, (req, res) => {
    const relPath = decodeURIComponent(req.params[0] || '');
    const targetDir = safeResolve(rootDir, relPath);

    if (!targetDir) {
      return res.status(400).json({ error: 'Invalid path.' });
    }

    fs.stat(targetDir, (statErr, stat) => {
      if (statErr || !stat.isDirectory()) {
        return res.status(404).json({ error: 'Directory not found.' });
      }

      fs.readdir(targetDir, { withFileTypes: true }, (readErr, dirents) => {
        if (readErr) {
          return res.status(500).json({ error: 'Could not read directory.' });
        }

        const entries = dirents
          .filter((d) => !d.name.startsWith('.'))
          .map((dirent) => {
            const entryAbsPath = path.join(targetDir, dirent.name);
            const entryRelPath = path
              .relative(rootDir, entryAbsPath)
              .split(path.sep)
              .join('/');

            let size = null;
            let modified = null;
            try {
              const entryStat = fs.statSync(entryAbsPath);
              size = dirent.isDirectory() ? null : entryStat.size;
              modified = entryStat.mtime.toISOString();
            } catch {
              // Skip entries that error (broken symlinks, permission issues, etc.)
              return null;
            }

            return {
              name: dirent.name,
              type: dirent.isDirectory() ? 'directory' : 'file',
              category: dirent.isDirectory() ? 'directory' : categoryFor(dirent.name),
              size,
              modified,
              path: entryRelPath,
              writable: isWritable(entryRelPath)
            };
          })
          .filter(Boolean)
          .sort((a, b) => {
            if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
          });

        const cleanRelPath = relPath.replace(/^\/+|\/+$/g, '');
        const segments = cleanRelPath ? cleanRelPath.split('/') : [];
        const breadcrumbs = segments.map((seg, i) => ({
          name: seg,
          path: segments.slice(0, i + 1).join('/')
        }));

        res.json({
          path: cleanRelPath,
          breadcrumbs,
          entries,
          writable: isWritable(cleanRelPath)
        });
      });
    });
  });

  return router;
}

module.exports = { buildListRouter, safeResolve };
