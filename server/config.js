const fs = require('fs');
const path = require('path');

function loadConfig() {
  const configPath = process.env.CONFIG_PATH
    ? path.resolve(process.env.CONFIG_PATH)
    : path.join(__dirname, '..', 'config.json');

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Config file not found at ${configPath}. Copy config.example.json to config.json and set "root" to the directory you want to share.`
    );
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Could not parse ${configPath}: ${err.message}`);
  }

  if (!parsed.root || typeof parsed.root !== 'string') {
    throw new Error(`Config at ${configPath} must include a "root" string pointing at the directory to share.`);
  }

  const rootDir = path.resolve(path.dirname(configPath), parsed.root);

  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    throw new Error(`Configured root "${rootDir}" does not exist or is not a directory.`);
  }

  const writeCfg = parsed.allowWriteAccess && typeof parsed.allowWriteAccess === 'object' ? parsed.allowWriteAccess : {};
  const allowWriteAccess = {
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

  return {
    title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title : 'StorageBox',
    rootDir,
    host: typeof parsed.host === 'string' && parsed.host.trim() ? parsed.host : '0.0.0.0',
    port: Number.isInteger(parsed.port) ? parsed.port : 3000,
    allowAnonymousUpload: parsed.allowAnonymousUpload === true,
    // Kept outside rootDir so the upload log (which contains uploader IPs) is
    // never itself listed/served by the read-only browsing routes.
    anonymousLogPath: path.join(path.dirname(configPath), 'log_anonymous.log'),
    allowWriteAccess
  };
}

module.exports = { loadConfig };
