const EXTENSION_CATEGORIES = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif', 'ico'],
  video: ['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mkv', 'avi'],
  audio: ['mp3', 'wav', 'ogg', 'oga', 'flac', 'm4a', 'aac', 'weba'],
  pdf: ['pdf'],
  text: [
    'txt', 'md', 'markdown', 'csv', 'json', 'log', 'xml', 'yml', 'yaml', 'ini', 'conf', 'env', 'toml',
    'properties', 'js', 'mjs', 'cjs', 'ts', 'css', 'scss', 'py', 'sh', 'bash', 'sql', 'html', 'htm',
    'bat', 'ps1'
  ],
  document: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf']
};

const EXTENSION_TO_CATEGORY = new Map();
for (const [category, extensions] of Object.entries(EXTENSION_CATEGORIES)) {
  for (const ext of extensions) {
    EXTENSION_TO_CATEGORY.set(ext, category);
  }
}

function categoryFor(fileName) {
  const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
  return EXTENSION_TO_CATEGORY.get(ext) || 'other';
}

module.exports = { categoryFor };
