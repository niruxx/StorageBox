// Resolves whether a given path inside the shared root is read-only or
// read-write, based on the "allowWriteAccess" config block. This is the
// single source of truth consulted by the write REST API (server/routes/fs.js),
// the WebDAV mount (server/webdav.js), and the read routes (which annotate
// listings with a "writable" flag purely for the UI to decide what to show).
function normalizeRulePath(p) {
  return String(p || '').replace(/^\/+|\/+$/g, '');
}

function buildAccessResolver(writeConfig) {
  const enabled = !!(writeConfig && writeConfig.enabled);
  const defaultMode = writeConfig && writeConfig.defaultMode === 'read-write' ? 'read-write' : 'read-only';

  const rules = (writeConfig && Array.isArray(writeConfig.rules) ? writeConfig.rules : [])
    .map((r) => ({
      path: normalizeRulePath(r.path),
      mode: r.mode === 'read-write' ? 'read-write' : 'read-only'
    }))
    // Longest (most specific) path prefix wins.
    .sort((a, b) => b.path.length - a.path.length);

  function resolveMode(relPath) {
    if (!enabled) return 'read-only';
    const norm = normalizeRulePath(relPath);
    for (const rule of rules) {
      if (!rule.path) continue;
      if (norm === rule.path || norm.startsWith(rule.path + '/')) return rule.mode;
    }
    return defaultMode;
  }

  function isWritable(relPath) {
    return resolveMode(relPath) === 'read-write';
  }

  return { enabled, resolveMode, isWritable };
}

// In open-directory mode there's no login/role concept at all, so a path's
// own read-only/read-write rule is the only thing that matters — unchanged
// from before accounts existed. In storage-server mode, a "viewer" account
// must never be treated as able to write regardless of what a path's rule
// says; only "admin" can. Used both to enforce writes (server/routes/fs.js,
// server/webdav.js) and to annotate listings so the UI doesn't offer
// Edit/Rename/Delete to an account that would just get a 403 (server/routes/list.js, info.js).
function canUserWrite(req, config) {
  if (config.openDirectoryMode) return true;
  return !!(req.session && req.session.user && req.session.user.role === 'admin');
}

module.exports = { buildAccessResolver, canUserWrite };
