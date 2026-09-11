const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');

const MAX_FILE_BYTES = 500 * 1024 * 1024; // 500MB per file
const MAX_FILES_PER_REQUEST = 20;

function sanitizeFilename(originalName) {
  const base = path.basename(originalName).replace(/[\\/]/g, '_').trim();
  return base || 'upload';
}

function uniqueDestName(dir, filename) {
  const ext = path.extname(filename);
  const stem = path.basename(filename, ext);
  let candidate = filename;
  let n = 1;
  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${stem} (${n})${ext}`;
    n += 1;
  }
  return candidate;
}

function appendAnonymousLog(logPath, ip, filename) {
  const line = `${new Date().toISOString()}\t${ip}\t${filename}\n`;
  fs.appendFile(logPath, line, () => {});
}

// Anonymous drop-box upload endpoint. Only mounted when the operator has set
// "allowAnonymousUpload": true in config.json — see server/index.js, where
// write HTTP methods are rejected at the server level unless this route is
// explicitly enabled.
function buildUploadRouter(uploadsDir, logPath) {
  const router = express.Router();

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      cb(null, uniqueDestName(uploadsDir, sanitizeFilename(file.originalname)));
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES_PER_REQUEST }
  });

  router.post('/', upload.array('files', MAX_FILES_PER_REQUEST), (req, res) => {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'No files were received.' });
    }

    for (const file of files) {
      appendAnonymousLog(logPath, req.ip, file.filename);
    }

    res.json({ ok: true, files: files.map((f) => ({ name: f.filename, size: f.size })) });
  });

  router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  });

  return router;
}

module.exports = { buildUploadRouter };
