const fs = require('fs');
const path = require('path');

function sanitizeAllowWriteAccess(raw) {
  const writeCfg = raw && typeof raw === 'object' ? raw : {};
  return {
    enabled: writeCfg.enabled === true,
    // Mounts a WebDAV server at /webdav, honoring the same per-path rules.
    // Off by default even when write access is enabled, so operators opt in
    // to the extra protocol surface deliberately.
    webdav: writeCfg.webdav === true,
    defaultMode: writeCfg.defaultMode === 'read-write' ? 'read-write' : 'read-only',
    rules: Array.isArray(writeCfg.rules)
      ? writeCfg.rules
          .filter((r) => r && typeof r.path === 'string')
          .map((r) => ({ path: r.path, mode: r.mode === 'read-write' ? 'read-write' : 'read-only' }))
      : []
  };
}

function resolveConfigPath() {
  return process.env.CONFIG_PATH
    ? path.resolve(process.env.CONFIG_PATH)
    : path.join(__dirname, '..', 'config.json');
}

function readRawConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Config file not found at ${configPath}. Copy config.example.json to config.json and set "root" to the directory you want to share.`
    );
  }
  const raw = fs.readFileSync(configPath, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Could not parse ${configPath}: ${err.message}`);
  }
}

function loadConfig() {
  const configPath = resolveConfigPath();
  const parsed = readRawConfig(configPath);

  if (!parsed.root || typeof parsed.root !== 'string') {
    throw new Error(`Config at ${configPath} must include a "root" string pointing at the directory to share.`);
  }

  const rootDir = path.resolve(path.dirname(configPath), parsed.root);

  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    throw new Error(`Configured root "${rootDir}" does not exist or is not a directory.`);
  }

  const configDir = path.dirname(configPath);

  return {
    configPath,
    title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title : 'StorageBox',
    rootDir,
    host: typeof parsed.host === 'string' && parsed.host.trim() ? parsed.host : '0.0.0.0',
    port: Number.isInteger(parsed.port) ? parsed.port : 3000,
    // true (default) = today's anonymous OpenDirectory behavior, no login at
    // all. false = "storage server" mode: every route requires a session,
    // and the first visit forces creating an admin account. See server/auth.js.
    openDirectoryMode: parsed.openDirectoryMode !== false,
    allowAnonymousUpload: parsed.allowAnonymousUpload === true,
    // Kept outside rootDir so the upload log (which contains uploader IPs) is
    // never itself listed/served by the read-only browsing routes.
    anonymousLogPath: path.join(configDir, 'log_anonymous.log'),
    allowWriteAccess: sanitizeAllowWriteAccess(parsed.allowWriteAccess),
    usersPath: path.join(configDir, 'users.json'),
    sessionSecretPath: path.join(configDir, 'session-secret.txt')
  };
}

// Applied from the admin settings GUI (server/routes/admin.js). Only the
// fields that are safe to change without restarting the process are
// editable — root/host/port stay file-only, since they're read once at
// process start (see server/index.js).
const EDITABLE_KEYS = ['title', 'openDirectoryMode', 'allowAnonymousUpload', 'allowWriteAccess'];

function saveConfigPatch(configPath, patch) {
  const current = readRawConfig(configPath);
  const next = { ...current };

  if (typeof patch.title === 'string' && patch.title.trim()) next.title = patch.title.trim();
  if (typeof patch.openDirectoryMode === 'boolean') next.openDirectoryMode = patch.openDirectoryMode;
  if (typeof patch.allowAnonymousUpload === 'boolean') next.allowAnonymousUpload = patch.allowAnonymousUpload;
  if (patch.allowWriteAccess && typeof patch.allowWriteAccess === 'object') {
    next.allowWriteAccess = sanitizeAllowWriteAccess(patch.allowWriteAccess);
  }

  fs.writeFileSync(configPath, JSON.stringify(next, null, 2) + '\n', 'utf-8');

  return {
    title: next.title,
    openDirectoryMode: next.openDirectoryMode !== false,
    allowAnonymousUpload: next.allowAnonymousUpload === true,
    allowWriteAccess: sanitizeAllowWriteAccess(next.allowWriteAccess)
  };
}

module.exports = { loadConfig, saveConfigPatch, EDITABLE_KEYS };
