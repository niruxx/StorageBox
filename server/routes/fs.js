const fs = require('fs');
const path = require('path');
const express = require('express');
const { safeResolve } = require('./list');
const { canUserWrite } = require('../access');

const MAX_WRITE_BYTES = 5 * 1024 * 1024; // 5MB — this endpoint is for quick text/code edits, not bulk file transfer.

function isSafeBasename(name) {
  return (
    typeof name === 'string' &&
    name.length > 0 &&
    name.length <= 255 &&
    name === path.basename(name) &&
    name !== '.' &&
    name !== '..' &&
    !name.includes('/') &&
    !name.includes('\\') &&
    !name.startsWith('.')
  );
}

// Dotfiles/dot-directories (.env, .git, ...) are hidden from listings and
// blocked from /files — keep the write API consistent with that instead of
// letting a client write/delete/rename something it can never see or list.
function hasDotSegment(relPath) {
  return relPath.split('/').some((seg) => seg.startsWith('.'));
}

// Write REST API: PUT (create/overwrite file content), DELETE (remove file or
// folder), PATCH (rename within the same folder). Every route re-checks
// isWritable (and the caller's role) itself — the caller (server/index.js)
// only decides whether this router is mounted at all; per-path enforcement
// always happens here.
function buildFsRouter(config, isWritable) {
  const rootDir = config.rootDir;
  const router = express.Router();

  router.put(/^\/(.*)$/, express.text({ type: '*/*', limit: MAX_WRITE_BYTES }), (req, res) => {
    const relPath = decodeURIComponent(req.params[0] || '');
    const cleanRelPath = relPath.replace(/^\/+|\/+$/g, '');
    if (!cleanRelPath) {
      return res.status(400).json({ error: 'No file path given.' });
    }
    if (hasDotSegment(cleanRelPath)) {
      return res.status(403).json({ error: 'Dotfiles are not accessible through this API.' });
    }
    if (!isWritable(cleanRelPath) || !canUserWrite(req, config)) {
      return res.status(403).json({ error: 'This path is read-only.' });
    }
    const target = safeResolve(rootDir, relPath);
    if (!target) {
      return res.status(400).json({ error: 'Invalid path.' });
    }

    fs.stat(target, (statErr, stat) => {
      if (!statErr && stat.isDirectory()) {
        return res.status(400).json({ error: 'Cannot write content to a directory.' });
      }
      fs.mkdir(path.dirname(target), { recursive: true }, (mkdirErr) => {
        if (mkdirErr) {
          return res.status(500).json({ error: 'Could not prepare destination folder.' });
        }
        fs.writeFile(target, typeof req.body === 'string' ? req.body : '', 'utf-8', (writeErr) => {
          if (writeErr) {
            return res.status(500).json({ error: 'Could not write file.' });
          }
          res.json({ ok: true, path: cleanRelPath });
        });
      });
    });
  });

  router.delete(/^\/(.*)$/, (req, res) => {
    const relPath = decodeURIComponent(req.params[0] || '');
    const cleanRelPath = relPath.replace(/^\/+|\/+$/g, '');
    if (!cleanRelPath) {
      return res.status(400).json({ error: 'Refusing to delete the shared root.' });
    }
    if (hasDotSegment(cleanRelPath)) {
      return res.status(403).json({ error: 'Dotfiles are not accessible through this API.' });
    }
    if (!isWritable(cleanRelPath) || !canUserWrite(req, config)) {
      return res.status(403).json({ error: 'This path is read-only.' });
    }
    const target = safeResolve(rootDir, relPath);
    if (!target) {
      return res.status(400).json({ error: 'Invalid path.' });
    }

    fs.stat(target, (statErr, stat) => {
      if (statErr) {
        return res.status(404).json({ error: 'Not found.' });
      }
      fs.rm(target, { recursive: stat.isDirectory(), force: false }, (rmErr) => {
        if (rmErr) {
          return res.status(500).json({ error: 'Could not delete.' });
        }
        res.json({ ok: true });
      });
    });
  });

  router.patch(/^\/(.*)$/, express.json(), (req, res) => {
    const relPath = decodeURIComponent(req.params[0] || '');
    const cleanRelPath = relPath.replace(/^\/+|\/+$/g, '');
    const newName = req.body && req.body.newName;

    if (!cleanRelPath) {
      return res.status(400).json({ error: 'Refusing to rename the shared root.' });
    }
    if (hasDotSegment(cleanRelPath)) {
      return res.status(403).json({ error: 'Dotfiles are not accessible through this API.' });
    }
    if (!isSafeBasename(newName)) {
      return res.status(400).json({ error: 'Invalid new name.' });
    }
    if (!isWritable(cleanRelPath) || !canUserWrite(req, config)) {
      return res.status(403).json({ error: 'This path is read-only.' });
    }
    const source = safeResolve(rootDir, relPath);
    if (!source) {
      return res.status(400).json({ error: 'Invalid path.' });
    }

    const destination = path.join(path.dirname(source), newName);
    const destRelPath = path
      .relative(rootDir, destination)
      .split(path.sep)
      .join('/');

    if (!isWritable(destRelPath)) {
      return res.status(403).json({ error: 'Destination path is read-only.' });
    }

    fs.access(destination, (accessErr) => {
      if (!accessErr) {
        return res.status(409).json({ error: 'An item with that name already exists.' });
      }
      fs.rename(source, destination, (renameErr) => {
        if (renameErr) {
          return res.status(500).json({ error: 'Could not rename.' });
        }
        res.json({ ok: true, path: destRelPath });
      });
    });
  });

  return router;
}

module.exports = { buildFsRouter };
