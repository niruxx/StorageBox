const webdav = require('webdav-server').v2;

const READ_PRIVILEGES = new Set([
  'canRead',
  'canReadLocks',
  'canReadContent',
  'canReadContentTranslated',
  'canReadContentSource',
  'canReadProperties'
]);

// Every privilege check funnels through here. Reads are always allowed (the
// mount exists to browse/preview); writes are allowed only when the request
// path falls under a read-write rule in the same "allowWriteAccess" config
// consulted by the REST write API (server/access.js) and server/routes/fs.js.
class PathScopedPrivilegeManager extends webdav.PrivilegeManager {
  constructor(isWritable) {
    super();
    this.isWritable = isWritable;
  }

  _can(fullPath, user, resource, privilege, callback) {
    if (READ_PRIVILEGES.has(privilege)) return callback(null, true);
    const relPath = fullPath.toString().replace(/^\/+/, '');
    callback(null, this.isWritable(relPath));
  }
}

// Mounted at app-root (not via app.use('/webdav', ...)) because the extension
// itself matches the full request URL against the root path it's given.
function buildWebdavMiddleware(rootDir, accessResolver) {
  const server = new webdav.WebDAVServer({
    rootFileSystem: new webdav.PhysicalFileSystem(rootDir),
    privilegeManager: new PathScopedPrivilegeManager(accessResolver.isWritable)
  });
  return webdav.extensions.express('/webdav', server);
}

module.exports = { buildWebdavMiddleware };
