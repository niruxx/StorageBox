# StorageBox-OpenDirectory

A self-hosted, **read-only** directory browser — like a friendlier `fileserver` or Caddy's `file_server browse`. Point it at a folder via `config.json` and get a modern, animated web UI for browsing it: a two-pane explorer with a directory tree, grid/list views, right-click actions, and full inline preview/playback for images, video, audio, and documents.

There is **no upload, rename, delete, or write functionality of any kind** — it only reads and serves whatever is already in the configured directory.

![StorageBox walkthrough](docs/media/demo.gif)

## Features

- **Two-pane explorer** — a collapsible, lazy-loaded directory tree on the left that stays in sync with the file view on the right
- **Grid or list view** — toggle between a card grid and a table-style list; your choice is remembered
- **Right-click context menu** (or the "⋮" button, for touch) — Open, Open in new tab, Download, Copy link, and Info on every entry
- **Info panel** — a slide-in drawer with kind, location, size, item count, and modified/created dates
- **Images** — lightbox viewer with next/prev navigation
- **Video** — inline player, streamed with HTTP range support so seeking works
- **Audio** (mp3, wav, and more) — persistent bottom player with a full playlist of the current folder: play/pause/seek/volume/next/prev
- **Documents** — PDFs open in an inline viewer; text-like files (`.txt`, `.md`, `.json`, `.csv`, `.log`, ...) preview inline; other office docs get a direct open/download link
- Fully responsive, with an off-canvas directory drawer on mobile

## Screenshots

<table>
<tr>
<td width="50%">

**Grid view**
![Grid view](docs/media/hero-grid.png)

</td>
<td width="50%">

**List view**
![List view](docs/media/list-view.png)

</td>
</tr>
<tr>
<td width="50%">

**Right-click context menu**
![Context menu](docs/media/context-menu.png)

</td>
<td width="50%">

**Info panel**
![Info panel](docs/media/info-panel.png)

</td>
</tr>
<tr>
<td width="50%">

**Image lightbox**
![Image lightbox](docs/media/lightbox.png)

</td>
<td width="50%">

**Audio player with playlist**
![Audio player](docs/media/audio-player.png)

</td>
</tr>
<tr>
<td width="50%">

**Inline video playback**
![Video player](docs/media/video-player.png)

</td>
<td width="50%">

**Responsive mobile drawer**
![Mobile drawer](docs/media/mobile-drawer.png)

</td>
</tr>
</table>

## Setup

```bash
npm install
cp config.example.json config.json
```

Edit `config.json`:

```json
{
  "title": "StorageBox",
  "root": "./shared",
  "host": "0.0.0.0",
  "port": 3000
}
```

- `root` — the directory to share. Relative paths resolve against `config.json`'s location; absolute paths (e.g. `"D:/Media"` or `"/mnt/media"`) work too. On Windows, use forward slashes (`"C:/Users/you/Downloads"`) or doubled backslashes (`"C:\\Users\\you\\Downloads"`) — JSON doesn't allow single backslashes in strings.
- `title` — shown in the header and browser tab.
- `host` / `port` — where the server listens.

`config.json` is gitignored since it's machine-specific (usually pointing outside the repo) — keep `config.example.json` as the template.

## Run

```bash
npm start        # production
npm run dev       # auto-restarts on server code changes (node --watch)
```

Then open `http://localhost:3000` (or whatever `host`/`port` you set).

## How it works

- `server/` — Express app:
  - `/api/list/*` walks the configured root (with path-traversal protection) and returns JSON directory listings.
  - `/api/info/*` returns metadata for a single file or folder (size/item count, created/modified dates) for the info panel.
  - `/files/*` serves file bytes read-only via `express.static` (range requests included, which is what makes audio/video scrubbing work).
  - `/download/*` serves the same bytes with `Content-Disposition: attachment` so the context menu's "Download" always saves instead of opening inline.
- `public/` — a vanilla JS single-page app: a lazy-loaded directory tree in the sidebar, a grid/list file view, a right-click context menu, a sliding info panel, and the lightbox/video/audio/doc preview UIs — all wired to the API above, with browser back/forward handled via `history.pushState`.

## Security notes

- All listing and file routes resolve paths against the configured root and reject any request that would escape it (`../` traversal, absolute paths, symlink tricks via normal path resolution).
- Dotfiles (`.env`, `.git`, etc.) are excluded from directory listings and file serving.
- This is a **read-only** viewer. If you need access control (e.g. only certain users can browse), put it behind a reverse proxy (Caddy, nginx) with auth, or add your own middleware in `server/index.js`.
