# StorageBox-OpenDirectory

A self-hosted directory browser — like a friendlier `fileserver` or Caddy's `file_server browse`. Point it at a folder via `config.json` and get a modern, animated web UI for browsing it: a two-pane explorer with a directory tree, grid/list views, right-click actions, and full inline preview/playback for images, video, audio, and documents.

**Read-only by default.** Out of the box there is no upload, rename, delete, or write functionality of any kind — it only reads and serves whatever is already in the configured directory. Two opt-in config flags turn on more: an anonymous upload drop-box, and a full read-write mode with per-folder permissions, in-browser editing, and WebDAV. Both are off unless you explicitly enable them — see [Uploads, write access & WebDAV](#uploads-write-access--webdav).

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
- *(optional)* **Anonymous upload drop-box** — a public "Upload" button that drops files into `/uploads`, with every upload logged (filename + uploader IP)
- *(optional)* **Read-write mode** — per-folder read-only/read-write rules, an in-browser text/code editor, rename, delete, and a WebDAV mount for using it as a real network drive

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

## Uploads, write access & WebDAV

Everything in this section is **off by default**. The server rejects every `POST`/`PUT`/`DELETE`/`PATCH` request at the engine level (`server/index.js`) unless one of the two flags below explicitly opens a specific route — so a stock `config.json` is exactly as read-only as before, even if someone crafts a request by hand.

### Anonymous upload drop-box

```json
{
  "allowAnonymousUpload": true
}
```

When enabled:
- A public **Upload** button appears in the top bar. It's hidden entirely when this is off.
- Uploaded files always land in a fixed `uploads/` folder inside `root` (created automatically) — never wherever the visitor happens to be browsing.
- Every upload is appended to `log_anonymous.log` (next to `config.json`, not inside `root`, so it's never itself browsable) as `<timestamp>  <IP>  <filename>`.
- Files are capped at 500MB each, 20 per request, and given a safe on-disk name (no path traversal via filename).

### Read-write mode

```json
{
  "allowWriteAccess": {
    "enabled": true,
    "webdav": false,
    "defaultMode": "read-only",
    "rules": [
      { "path": "incoming", "mode": "read-write" }
    ]
  }
}
```

- `enabled` — the master switch. Off (default) = pure read-only server, identical to before this feature existed.
- `defaultMode` — `"read-only"` or `"read-write"`, applied to any path not matched by `rules`.
- `rules` — per-folder overrides, most-specific path wins. In the example above, everything is read-only *except* `incoming/` (and its subfolders), which allows edits, renames, and deletes. Flip `defaultMode` to `"read-write"` and add a `read-only` rule instead if you'd rather share-with-a-few-locked-folders than lock-with-a-few-open-folders.
- Every write request is re-checked against these rules server-side (`server/access.js`, `server/routes/fs.js`) — the UI only uses them to decide what buttons to show.

What unlocks in a writable folder:
- **Edit** — a right-click/info-panel action that opens a built-in [CodeMirror](https://codemirror.net/) editor for plain text, Markdown, and common code/config files (`.txt`, `.md`, `.json`, `.js`, `.css`, `.py`, `.yml`, `.env`, ...), with syntax highlighting and a Save button.
- **Rename** and **Delete** — also from the right-click menu or info panel. Delete removes folders recursively, so it always asks for confirmation first.

`webdav: true` additionally mounts a [WebDAV](http://www.webdav.org/specs/rfc4918.html) server at `/webdav`, honoring the exact same per-path rules — so a read-only path via the web UI is also read-only over WebDAV, and vice versa. This lets you mount the share as a real network drive:
- **Windows**: File Explorer → *This PC* → *Map network drive* → `http://<host>:<port>/webdav/`
- **macOS**: Finder → *Go* → *Connect to Server* → `http://<host>:<port>/webdav/`
- **Linux**: `davfs2`, or your file manager's "Connect to Server" (GVfs supports `dav://`)

WebDAV is opt-in on top of `enabled` because it exposes the whole mounted folder (including dotfiles, which the browser UI hides) to any WebDAV client — enable it only if you actually want disk-style mounting.

## Run

```bash
npm start        # production
npm run dev       # auto-restarts on server code changes (node --watch)
```

Then open `http://localhost:3000` (or whatever `host`/`port` you set).

## How it works

- `server/` — Express app:
  - `/api/list/*` walks the configured root (with path-traversal protection) and returns JSON directory listings, each entry annotated with `writable: true/false`.
  - `/api/info/*` returns metadata for a single file or folder (size/item count, created/modified dates, `writable`) for the info panel.
  - `/files/*` serves file bytes read-only via `express.static` (range requests included, which is what makes audio/video scrubbing work).
  - `/download/*` serves the same bytes with `Content-Disposition: attachment` so the context menu's "Download" always saves instead of opening inline.
  - `/api/upload` *(only mounted when `allowAnonymousUpload` is on)* — accepts multipart uploads into `uploads/` and logs them.
  - `/api/fs/*` *(only mounted when `allowWriteAccess.enabled` is on)* — `PUT` writes/creates a file, `DELETE` removes a file or folder, `PATCH` renames within its own folder; every call re-checks `server/access.js` before touching disk.
  - `/webdav` *(only mounted when `allowWriteAccess.webdav` is on)* — a [`webdav-server`](https://www.npmjs.com/package/webdav-server)-backed mount over the same root, gated by a privilege manager that consults the same per-path rules.
  - A single engine-level middleware rejects every write HTTP method (`POST`/`PUT`/`DELETE`/`PATCH`) by default, before any router runs — see the comment block at the top of `server/index.js`.
- `public/` — a vanilla JS single-page app: a lazy-loaded directory tree in the sidebar, a grid/list file view, a right-click context menu, a sliding info panel, the lightbox/video/audio/doc preview UIs, and (when writable) an Edit/Rename/Delete flow with a lazily-loaded CodeMirror editor — all wired to the API above, with browser back/forward handled via `history.pushState`.

## Security notes

- All listing and file routes resolve paths against the configured root and reject any request that would escape it (`../` traversal, absolute paths, symlink tricks via normal path resolution).
- Dotfiles (`.env`, `.git`, etc.) are excluded from directory listings, file serving, and the write API — though a WebDAV mount, if enabled, does expose them (see above).
- **Read-only by default.** Write HTTP methods are refused at the server level unless `allowAnonymousUpload` or `allowWriteAccess` is explicitly turned on in `config.json`, and even then every write is re-checked against per-path rules server-side — the UI hiding a button is a convenience, not the actual guard.
- If you enable uploads or write access on a server reachable by untrusted users, treat it like any other write-capable fileserver: put it behind a reverse proxy (Caddy, nginx) with authentication, restrict it to a trusted network, and keep an eye on `log_anonymous.log`.
