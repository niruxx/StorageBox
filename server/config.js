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

  return {
    title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title : 'StorageBox',
    rootDir,
    host: typeof parsed.host === 'string' && parsed.host.trim() ? parsed.host : '0.0.0.0',
    port: Number.isInteger(parsed.port) ? parsed.port : 3000
  };
}

module.exports = { loadConfig };
