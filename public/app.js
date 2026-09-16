(() => {
  'use strict';

  const BROWSE_PREFIX = '/browse';

  const ICONS = {
    directory:
      '<path d="M3 7l2-3h5l2 3h9v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7z" stroke-linejoin="round"/>',
    image:
      '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M21 16l-5.5-5.5a1 1 0 0 0-1.4 0L5 19" stroke-linecap="round" stroke-linejoin="round"/>',
    video:
      '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 9.5l4-2.5v10l-4-2.5" stroke-linejoin="round"/>',
    audio:
      '<path d="M9 18V5l12-2v13" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    pdf: '<path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke-linejoin="round"/><path d="M15 2v5h5" stroke-linejoin="round"/>',
    text: '<path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke-linejoin="round"/><path d="M15 2v5h5M8 13h8M8 17h8M8 9h3" stroke-linejoin="round"/>',
    document:
      '<path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke-linejoin="round"/><path d="M15 2v5h5" stroke-linejoin="round"/>',
    other:
      '<path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke-linejoin="round"/><path d="M15 2v5h5" stroke-linejoin="round"/>'
  };

  const MENU_ICONS = {
    open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    newTab:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 3h7v7M21 3l-9 9M5 5h6v0H5v14h14v-6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    download:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12M7 10l5 5 5-5M4 19h16" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 15l6-6M10 6l1-1a4 4 0 0 1 6 6l-1 1M14 18l-1 1a4 4 0 0 1-6-6l1-1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01" stroke-linecap="round"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 4L2 12l6 8M16 4l6 8-6 8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    rename:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    trash:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6M14 11v6" stroke-linecap="round"/></svg>'
  };

  const KEBAB_ICON =
    '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>';

  const CHEVRON_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l8 7-8 7z"/></svg>';

  const KIND_LABELS = {
    directory: 'Folder',
    image: 'Image',
    video: 'Video',
    audio: 'Audio',
    pdf: 'PDF document',
    text: 'Text file',
    document: 'Document',
    other: 'File'
  };

  const el = (id) => document.getElementById(id);
  const els = {
    breadcrumbs: el('breadcrumbs'),
    grid: el('entry-grid'),
    skeleton: el('skeleton'),
    stateMsg: el('state-msg'),
    sidebarToggle: el('sidebar-toggle'),
    sidebarBackdrop: el('sidebar-backdrop'),
    tree: el('tree'),
    viewToggle: el('view-toggle'),
    uploadBtn: el('upload-btn'),
    uploadInput: el('upload-input'),
    userMenu: el('user-menu'),
    userMenuBtn: el('user-menu-btn'),
    userAvatar: el('user-avatar'),
    userMenuUsername: el('user-menu-username'),
    userMenuDropdown: el('user-menu-dropdown'),
    userMenuRole: el('user-menu-role'),
    userMenuAdminLink: el('user-menu-admin-link'),
    userMenuLogout: el('user-menu-logout'),

    contextMenu: el('context-menu'),

    infoBackdrop: el('info-backdrop'),
    infoPanel: el('info-panel'),
    infoClose: el('info-close'),
    infoVisual: el('info-visual'),
    infoName: el('info-name'),
    infoRows: el('info-rows'),
    infoActions: el('info-actions'),

    lightbox: el('lightbox'),
    lightboxImg: el('lightbox-img'),
    lightboxCaption: el('lightbox-caption'),
    lightboxPrev: el('lightbox-prev'),
    lightboxNext: el('lightbox-next'),
    lightboxClose: el('lightbox-close'),
    videoModal: el('video-modal'),
    videoPlayer: el('video-player'),
    videoCaption: el('video-caption'),
    videoClose: el('video-close'),
    docModal: el('doc-modal'),
    docTitle: el('doc-title'),
    docFrame: el('doc-frame'),
    docText: el('doc-text'),
    docClose: el('doc-close'),
    docEditBtn: el('doc-edit-btn'),
    editorModal: el('editor-modal'),
    editorClose: el('editor-close'),
    editorTitle: el('editor-title'),
    editorStatus: el('editor-status'),
    editorSaveBtn: el('editor-save-btn'),
    editorTextarea: el('editor-textarea'),
    audioBar: el('audio-bar'),
    audioEl: el('audio-element'),
    audioTrackName: el('audio-track-name'),
    audioPlayPause: el('audio-playpause'),
    audioPrev: el('audio-prev'),
    audioNext: el('audio-next'),
    audioSeekBar: el('audio-seek-bar'),
    audioCurrentTime: el('audio-current-time'),
    audioDuration: el('audio-duration'),
    audioVolume: el('audio-volume'),
    audioClose: el('audio-close')
  };

  const state = {
    entries: [],
    images: [],
    lightboxIndex: -1,
    playlist: [],
    playlistIndex: -1,
    view: localStorage.getItem('sb_view') === 'list' ? 'list' : 'grid',
    treeIndex: new Map(),
    activeTreeRow: null,
    contextEntry: null,
    contextCardEl: null
  };

  // ---------- Helpers ----------
  function encodeApiPath(relPath) {
    return relPath
      .split('/')
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/');
  }

  function fileUrl(relPath) {
    return '/files/' + encodeApiPath(relPath);
  }

  function downloadUrl(relPath) {
    return '/download/' + encodeApiPath(relPath);
  }

  function humanSize(bytes) {
    if (bytes == null) return '';
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / Math.pow(1024, i);
    return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function iconSvg(category, extraClass) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6');
    if (extraClass) svg.classList.add(extraClass);
    svg.innerHTML = ICONS[category] || ICONS.other;
    return svg;
  }

  function pathFromLocation() {
    let p = window.location.pathname;
    if (p.startsWith(BROWSE_PREFIX)) p = p.slice(BROWSE_PREFIX.length);
    p = p.replace(/^\/+|\/+$/g, '');
    return p ? decodeURIComponent(p) : '';
  }

  // ---------- Generic open/close animation helpers ----------
  function openEl(elm) {
    elm.hidden = false;
    // Force reflow so the transition fires from the initial state.
    void elm.offsetWidth;
    requestAnimationFrame(() => elm.classList.add('open'));
  }

  function closeEl(elm, duration = 220) {
    elm.classList.remove('open');
    window.setTimeout(() => {
      elm.hidden = true;
    }, duration);
  }

  let toastTimer = null;
  function showToast(message) {
    let toastEl = document.querySelector('.toast');
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.style.bottom = els.audioBar.hidden ? '26px' : '96px';
    toastEl.hidden = false;
    void toastEl.offsetWidth;
    toastEl.classList.add('open');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastEl.classList.remove('open');
    }, 1800);
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  }

  function triggerDownload(entry) {
    const a = document.createElement('a');
    a.href = downloadUrl(entry.path);
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ---------- Navigation ----------
  async function navigate(relPath, { push = true } = {}) {
    closeAllModals();
    closeContextMenu();

    els.stateMsg.hidden = true;
    els.skeleton.hidden = false;
    els.grid.hidden = true;

    try {
      const res = await fetch(`/api/list/${encodeApiPath(relPath)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      render(data);

      const url = `${BROWSE_PREFIX}/${encodeApiPath(data.path)}`;
      if (push) {
        window.history.pushState({ path: data.path }, '', url || BROWSE_PREFIX + '/');
      }

      syncTreeToPath(data.path);
    } catch (err) {
      els.stateMsg.hidden = false;
      els.stateMsg.textContent = err.message || 'Could not load this directory.';
    } finally {
      els.skeleton.hidden = true;
      els.grid.hidden = false;
    }
  }

  function render(data) {
    renderBreadcrumbs(data.breadcrumbs);
    state.entries = data.entries;
    state.images = data.entries.filter((e) => e.category === 'image');

    if (data.entries.length === 0) {
      els.stateMsg.hidden = false;
      els.stateMsg.textContent = 'This directory is empty.';
    }

    els.grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (const entry of data.entries) {
      frag.appendChild(buildCard(entry));
    }
    els.grid.appendChild(frag);
  }

  function renderBreadcrumbs(breadcrumbs) {
    els.breadcrumbs.innerHTML = '';
    const homeLink = document.createElement('a');
    homeLink.href = `${BROWSE_PREFIX}/`;
    homeLink.textContent = 'Home';
    homeLink.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('');
    });
    els.breadcrumbs.appendChild(homeLink);

    breadcrumbs.forEach((crumb, i) => {
      const sep = document.createElement('span');
      sep.className = 'sep';
      sep.textContent = '/';
      els.breadcrumbs.appendChild(sep);

      if (i === breadcrumbs.length - 1) {
        const span = document.createElement('span');
        span.className = 'current';
        span.textContent = crumb.name;
        els.breadcrumbs.appendChild(span);
      } else {
        const a = document.createElement('a');
        a.href = `${BROWSE_PREFIX}/${encodeApiPath(crumb.path)}`;
        a.textContent = crumb.name;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          navigate(crumb.path);
        });
        els.breadcrumbs.appendChild(a);
      }
    });
  }

  // ---------- Entry cards (grid + list share the same DOM; CSS restyles) ----------
  function buildCard(entry) {
    const card = document.createElement('div');
    card.className = 'entry-card';
    card.tabIndex = 0;
    card.dataset.category = entry.category;
    card.dataset.path = entry.path;

    const visual = document.createElement('div');
    visual.className = 'entry-visual';
    if (entry.category === 'image') {
      const img = document.createElement('img');
      img.className = 'entry-thumb';
      img.loading = 'lazy';
      img.src = fileUrl(entry.path);
      img.alt = '';
      visual.appendChild(img);
    } else {
      visual.appendChild(iconSvg(entry.category, 'entry-icon'));
    }
    card.appendChild(visual);

    const main = document.createElement('div');
    main.className = 'entry-main';

    const name = document.createElement('div');
    name.className = 'entry-name';
    name.textContent = entry.name;
    main.appendChild(name);

    const meta = document.createElement('div');
    meta.className = 'entry-meta';

    const kind = document.createElement('span');
    kind.className = 'entry-kind';
    kind.textContent = KIND_LABELS[entry.category] || 'File';
    meta.appendChild(kind);

    const size = document.createElement('span');
    size.className = 'entry-size';
    size.textContent = entry.type === 'directory' ? '' : humanSize(entry.size);
    meta.appendChild(size);

    const modified = document.createElement('span');
    modified.className = 'entry-modified';
    modified.textContent = formatDate(entry.modified);
    meta.appendChild(modified);

    main.appendChild(meta);
    card.appendChild(main);

    const menuBtn = document.createElement('button');
    menuBtn.className = 'entry-menu-btn';
    menuBtn.type = 'button';
    menuBtn.title = 'More options';
    menuBtn.setAttribute('aria-label', 'More options');
    menuBtn.innerHTML = KEBAB_ICON;
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = menuBtn.getBoundingClientRect();
      showContextMenu(rect.left, rect.bottom + 6, entry, card);
    });
    card.appendChild(menuBtn);

    const activate = () => handleEntryActivate(entry);
    card.addEventListener('click', activate);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, entry, card);
    });

    return card;
  }

  function handleEntryActivate(entry) {
    if (entry.type === 'directory') {
      navigate(entry.path);
      return;
    }

    switch (entry.category) {
      case 'image':
        openLightbox(state.images.findIndex((i) => i.path === entry.path));
        break;
      case 'video':
        openVideo(entry);
        break;
      case 'audio':
        openAudioPlaylist(entry);
        break;
      case 'pdf':
        openDocFrame(entry);
        break;
      case 'text':
        openDocText(entry);
        break;
      default:
        window.open(fileUrl(entry.path), '_blank', 'noopener');
    }
  }

  // ---------- View toggle (grid / list) ----------
  function applyView() {
    els.grid.classList.toggle('view-grid', state.view === 'grid');
    els.grid.classList.toggle('view-list', state.view === 'list');
    els.viewToggle.querySelectorAll('.view-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === state.view);
    });
  }

  els.viewToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('.view-btn');
    if (!btn) return;
    state.view = btn.dataset.view;
    localStorage.setItem('sb_view', state.view);
    applyView();
  });

  // ---------- Sidebar directory tree ----------
  function createTreeNode(nodePath, name, isRoot) {
    const nodeEl = document.createElement('div');
    nodeEl.className = 'tree-node';

    const row = document.createElement('div');
    row.className = 'tree-row';
    row.tabIndex = 0;

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'tree-toggle';
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-label', 'Expand folder');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.innerHTML = CHEVRON_ICON;

    const folderIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    folderIcon.setAttribute('viewBox', '0 0 24 24');
    folderIcon.setAttribute('fill', 'none');
    folderIcon.setAttribute('stroke', 'currentColor');
    folderIcon.setAttribute('stroke-width', '1.8');
    folderIcon.classList.add('tree-folder-icon');
    folderIcon.innerHTML = ICONS.directory;

    const label = document.createElement('span');
    label.className = 'tree-label';
    label.textContent = name;

    row.appendChild(toggleBtn);
    row.appendChild(folderIcon);
    row.appendChild(label);

    const childrenWrap = document.createElement('div');
    childrenWrap.className = 'tree-children-wrap';
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children';
    childrenWrap.appendChild(childrenContainer);

    nodeEl.appendChild(row);
    nodeEl.appendChild(childrenWrap);

    const node = {
      path: nodePath,
      el: nodeEl,
      row,
      toggleBtn,
      label,
      childrenWrap,
      childrenContainer,
      loaded: false,
      expanded: false,
      isRoot: !!isRoot
    };

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleNode(nodePath);
    });
    row.addEventListener('click', () => {
      navigate(nodePath);
      closeMobileSidebar();
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate(nodePath);
        closeMobileSidebar();
      }
    });

    state.treeIndex.set(nodePath, node);
    return node;
  }

  async function loadNodeChildren(node) {
    if (node.loaded) return;
    try {
      const res = await fetch(`/api/list/${encodeApiPath(node.path)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const dirs = data.entries.filter((e) => e.type === 'directory');
      if (dirs.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'tree-empty';
        empty.textContent = 'No subfolders';
        node.childrenContainer.appendChild(empty);
      } else {
        for (const dir of dirs) {
          const child = createTreeNode(dir.path, dir.name, false);
          node.childrenContainer.appendChild(child.el);
        }
      }
      node.loaded = true;
    } catch {
      // Leave unloaded; user can retry by toggling again.
    }
  }

  async function expandNode(nodePath) {
    const node = state.treeIndex.get(nodePath);
    if (!node) return;
    if (!node.loaded) await loadNodeChildren(node);
    node.expanded = true;
    node.childrenWrap.classList.add('expanded');
    node.toggleBtn.classList.add('expanded');
    node.toggleBtn.setAttribute('aria-expanded', 'true');
  }

  function collapseNode(nodePath) {
    const node = state.treeIndex.get(nodePath);
    if (!node) return;
    node.expanded = false;
    node.childrenWrap.classList.remove('expanded');
    node.toggleBtn.classList.remove('expanded');
    node.toggleBtn.setAttribute('aria-expanded', 'false');
  }

  async function toggleNode(nodePath) {
    const node = state.treeIndex.get(nodePath);
    if (!node) return;
    if (node.expanded) collapseNode(nodePath);
    else await expandNode(nodePath);
  }

  async function syncTreeToPath(fullPath) {
    const segments = fullPath ? fullPath.split('/') : [];
    await expandNode('');

    let cumulative = '';
    for (const seg of segments) {
      cumulative = cumulative ? `${cumulative}/${seg}` : seg;
      if (!state.treeIndex.has(cumulative)) break;
      await expandNode(cumulative);
    }

    if (state.activeTreeRow) state.activeTreeRow.classList.remove('active');
    const activeNode = state.treeIndex.get(fullPath);
    if (activeNode) {
      activeNode.row.classList.add('active');
      state.activeTreeRow = activeNode.row;
      activeNode.row.scrollIntoView({ block: 'nearest' });
    } else {
      state.activeTreeRow = null;
    }
  }

  function initTree() {
    const root = createTreeNode('', 'Home', true);
    els.tree.appendChild(root.el);
  }

  const MOBILE_QUERY = '(max-width: 900px)';
  const appShellEl = document.querySelector('.app-shell');

  function closeMobileSidebar() {
    if (!window.matchMedia(MOBILE_QUERY).matches) return;
    appShellEl.classList.remove('sidebar-mobile-open');
    els.sidebarBackdrop.classList.remove('open');
  }

  els.sidebarToggle.addEventListener('click', () => {
    if (window.matchMedia(MOBILE_QUERY).matches) {
      const open = appShellEl.classList.toggle('sidebar-mobile-open');
      els.sidebarBackdrop.classList.toggle('open', open);
    } else {
      const collapsed = appShellEl.classList.toggle('sidebar-collapsed');
      localStorage.setItem('sb_sidebar_collapsed', collapsed ? '1' : '0');
    }
  });

  els.sidebarBackdrop.addEventListener('click', closeMobileSidebar);

  window.addEventListener('resize', () => {
    if (!window.matchMedia(MOBILE_QUERY).matches) closeMobileSidebar();
  });

  // ---------- Context menu ----------
  function menuItem(label, icon, onClick, danger) {
    const btn = document.createElement('button');
    btn.className = 'context-menu-item' + (danger ? ' danger' : '');
    btn.type = 'button';
    btn.setAttribute('role', 'menuitem');
    btn.innerHTML = `${icon}<span>${label}</span>`;
    btn.addEventListener('click', () => {
      closeContextMenu();
      onClick();
    });
    return btn;
  }

  function menuSep() {
    const sep = document.createElement('div');
    sep.className = 'context-menu-sep';
    return sep;
  }

  function showContextMenu(x, y, entry, cardEl) {
    closeContextMenu();
    state.contextEntry = entry;
    state.contextCardEl = cardEl;
    if (cardEl) cardEl.classList.add('context-active');

    const menu = els.contextMenu;
    menu.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'context-menu-title';
    title.textContent = entry.name;
    menu.appendChild(title);
    menu.appendChild(menuSep());

    const hasPreview = ['image', 'video', 'audio', 'pdf', 'text'].includes(entry.category);

    if (entry.type === 'directory') {
      menu.appendChild(menuItem('Open folder', MENU_ICONS.open, () => navigate(entry.path)));
    } else if (hasPreview) {
      menu.appendChild(menuItem('Preview', MENU_ICONS.open, () => handleEntryActivate(entry)));
    }

    if (entry.type === 'file') {
      menu.appendChild(
        menuItem('Open in new tab', MENU_ICONS.newTab, () => window.open(fileUrl(entry.path), '_blank', 'noopener'))
      );
      menu.appendChild(menuItem('Download', MENU_ICONS.download, () => triggerDownload(entry)));
    }

    menu.appendChild(
      menuItem('Copy link', MENU_ICONS.link, async () => {
        const url = window.location.origin + fileUrl(entry.path);
        const ok = await copyToClipboard(url);
        showToast(ok ? 'Link copied to clipboard' : 'Could not copy link');
      })
    );

    menu.appendChild(menuSep());
    menu.appendChild(menuItem('Info', MENU_ICONS.info, () => openInfoPanel(entry)));

    if (entry.writable) {
      menu.appendChild(menuSep());
      if (entry.type === 'file' && entry.category === 'text') {
        menu.appendChild(menuItem('Edit', MENU_ICONS.edit, () => openEditor(entry)));
      }
      menu.appendChild(menuItem('Rename', MENU_ICONS.rename, () => renameEntry(entry)));
      menu.appendChild(menuItem('Delete', MENU_ICONS.trash, () => deleteEntry(entry), true));
    }

    menu.style.left = '0px';
    menu.style.top = '0px';
    openEl(menu);

    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      const clampedX = Math.min(x, window.innerWidth - rect.width - 10);
      const clampedY = Math.min(y, window.innerHeight - rect.height - 10);
      menu.style.left = `${Math.max(8, clampedX)}px`;
      menu.style.top = `${Math.max(8, clampedY)}px`;
    });
  }

  function closeContextMenu() {
    if (els.contextMenu.hidden) return;
    closeEl(els.contextMenu, 150);
    if (state.contextCardEl) state.contextCardEl.classList.remove('context-active');
    state.contextEntry = null;
    state.contextCardEl = null;
  }

  document.addEventListener('click', (e) => {
    if (!els.contextMenu.hidden && !els.contextMenu.contains(e.target)) closeContextMenu();
  });
  document.addEventListener(
    'scroll',
    () => {
      if (!els.contextMenu.hidden) closeContextMenu();
    },
    true
  );
  window.addEventListener('resize', () => closeContextMenu());
  window.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('.entry-card')) closeContextMenu();
  });

  // ---------- Info panel ----------
  async function openInfoPanel(entry) {
    els.infoVisual.dataset.category = entry.category;
    els.infoVisual.innerHTML = '';
    if (entry.category === 'image') {
      const img = document.createElement('img');
      img.src = fileUrl(entry.path);
      img.alt = '';
      els.infoVisual.appendChild(img);
    } else {
      els.infoVisual.appendChild(iconSvg(entry.category));
    }

    els.infoName.textContent = entry.name;
    els.infoRows.innerHTML = '<div class="info-row"><span class="info-row-label">Loading…</span></div>';
    els.infoActions.innerHTML = '';

    openEl(els.infoBackdrop);
    openEl(els.infoPanel);

    try {
      const res = await fetch(`/api/info/${encodeApiPath(entry.path)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      renderInfoRows(data);
      renderInfoActions(entry, data);
    } catch {
      els.infoRows.innerHTML = '<div class="info-row"><span class="info-row-label">Could not load details.</span></div>';
    }
  }

  function infoRow(label, value) {
    const row = document.createElement('div');
    row.className = 'info-row';
    const l = document.createElement('span');
    l.className = 'info-row-label';
    l.textContent = label;
    const v = document.createElement('span');
    v.className = 'info-row-value';
    v.textContent = value;
    row.appendChild(l);
    row.appendChild(v);
    return row;
  }

  function renderInfoRows(data) {
    els.infoRows.innerHTML = '';
    els.infoRows.appendChild(infoRow('Kind', KIND_LABELS[data.category] || 'File'));
    els.infoRows.appendChild(infoRow('Location', data.path ? `/${data.path}` : '/'));
    if (data.type === 'directory') {
      els.infoRows.appendChild(infoRow('Items', `${data.itemCount ?? 0} item${data.itemCount === 1 ? '' : 's'}`));
    } else {
      els.infoRows.appendChild(infoRow('Size', humanSize(data.size)));
    }
    els.infoRows.appendChild(infoRow('Modified', formatDate(data.modified)));
    els.infoRows.appendChild(infoRow('Created', formatDate(data.created)));
  }

  function actionButton(label, icon, onClick, primary, danger) {
    const btn = document.createElement('button');
    btn.className = 'info-action-btn' + (primary ? ' primary' : '') + (danger ? ' danger' : '');
    btn.type = 'button';
    btn.innerHTML = `${icon}<span>${label}</span>`;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function renderInfoActions(entry, data) {
    els.infoActions.innerHTML = '';

    if (entry.type === 'directory') {
      els.infoActions.appendChild(
        actionButton('Open folder', MENU_ICONS.open, () => {
          closeInfoPanel();
          navigate(entry.path);
        }, true)
      );
    } else {
      const hasPreview = ['image', 'video', 'audio', 'pdf', 'text'].includes(entry.category);
      if (hasPreview) {
        els.infoActions.appendChild(
          actionButton('Preview', MENU_ICONS.open, () => {
            closeInfoPanel();
            handleEntryActivate(entry);
          }, true)
        );
      }
      els.infoActions.appendChild(
        actionButton('Open in new tab', MENU_ICONS.newTab, () =>
          window.open(fileUrl(entry.path), '_blank', 'noopener')
        )
      );
      els.infoActions.appendChild(actionButton('Download', MENU_ICONS.download, () => triggerDownload(entry)));
    }

    els.infoActions.appendChild(
      actionButton('Copy link', MENU_ICONS.link, async () => {
        const url = window.location.origin + fileUrl(entry.path);
        const ok = await copyToClipboard(url);
        showToast(ok ? 'Link copied to clipboard' : 'Could not copy link');
      })
    );

    if (data.writable) {
      if (entry.type === 'file' && entry.category === 'text') {
        els.infoActions.appendChild(
          actionButton('Edit', MENU_ICONS.edit, () => {
            closeInfoPanel();
            openEditor(entry);
          })
        );
      }
      els.infoActions.appendChild(
        actionButton('Rename', MENU_ICONS.rename, () => {
          closeInfoPanel();
          renameEntry(entry);
        })
      );
      els.infoActions.appendChild(
        actionButton('Delete', MENU_ICONS.trash, () => {
          closeInfoPanel();
          deleteEntry(entry);
        }, false, true)
      );
    }
  }

  function closeInfoPanel() {
    closeEl(els.infoBackdrop);
    closeEl(els.infoPanel);
  }

  els.infoClose.addEventListener('click', closeInfoPanel);
  els.infoBackdrop.addEventListener('click', closeInfoPanel);

  // ---------- Lightbox ----------
  function openLightbox(index) {
    if (index < 0 || index >= state.images.length) return;
    state.lightboxIndex = index;
    updateLightbox();
    openEl(els.lightbox);
  }

  function updateLightbox() {
    const entry = state.images[state.lightboxIndex];
    els.lightboxImg.src = fileUrl(entry.path);
    els.lightboxCaption.textContent = entry.name;
    els.lightboxPrev.style.visibility = state.images.length > 1 ? 'visible' : 'hidden';
    els.lightboxNext.style.visibility = state.images.length > 1 ? 'visible' : 'hidden';
  }

  function lightboxStep(delta) {
    if (state.images.length === 0) return;
    state.lightboxIndex = (state.lightboxIndex + delta + state.images.length) % state.images.length;
    updateLightbox();
  }

  function closeLightbox() {
    if (els.lightbox.hidden) return;
    closeEl(els.lightbox);
  }

  els.lightboxPrev.addEventListener('click', () => lightboxStep(-1));
  els.lightboxNext.addEventListener('click', () => lightboxStep(1));
  els.lightboxClose.addEventListener('click', closeLightbox);
  els.lightbox.addEventListener('click', (e) => {
    if (e.target === els.lightbox) closeLightbox();
  });

  // ---------- Video ----------
  function openVideo(entry) {
    els.videoPlayer.src = fileUrl(entry.path);
    els.videoCaption.textContent = entry.name;
    openEl(els.videoModal);
  }

  function closeVideo() {
    if (els.videoModal.hidden) return;
    closeEl(els.videoModal);
    els.videoPlayer.pause();
    window.setTimeout(() => {
      els.videoPlayer.removeAttribute('src');
      els.videoPlayer.load();
    }, 220);
  }

  els.videoClose.addEventListener('click', closeVideo);
  els.videoModal.addEventListener('click', (e) => {
    if (e.target === els.videoModal) closeVideo();
  });

  // ---------- Document viewer (PDF / text) ----------
  function openDocFrame(entry) {
    els.docTitle.textContent = entry.name;
    els.docFrame.src = fileUrl(entry.path);
    els.docFrame.hidden = false;
    els.docText.hidden = true;
    els.docEditBtn.hidden = true;
    openEl(els.docModal);
  }

  async function openDocText(entry) {
    els.docTitle.textContent = entry.name;
    els.docFrame.hidden = true;
    els.docText.hidden = false;
    els.docEditBtn.hidden = !entry.writable;
    els.docEditBtn.onclick = () => {
      closeDoc();
      openEditor(entry);
    };
    openEl(els.docModal);

    const MAX_PREVIEW_BYTES = 2 * 1024 * 1024;
    if (entry.size != null && entry.size > MAX_PREVIEW_BYTES) {
      els.docText.textContent = 'File is too large to preview inline. Use "Open in new tab" instead.';
      return;
    }

    els.docText.textContent = 'Loading...';
    try {
      const res = await fetch(fileUrl(entry.path));
      const text = await res.text();
      els.docText.textContent = text;
    } catch {
      els.docText.textContent = 'Could not load this file.';
    }
  }

  function closeDoc() {
    if (els.docModal.hidden) return;
    closeEl(els.docModal);
    window.setTimeout(() => {
      els.docFrame.src = '';
    }, 220);
  }

  els.docClose.addEventListener('click', closeDoc);
  els.docModal.addEventListener('click', (e) => {
    if (e.target === els.docModal) closeDoc();
  });

  // ---------- Write access: edit / rename / delete ----------
  // Only ever reachable when the server has annotated an entry as
  // entry.writable (which itself only happens when allowWriteAccess is
  // enabled for that path in config.json) — see server/access.js. The
  // server re-checks writability on every request regardless of what the
  // UI shows, so these are pure conveniences, not the actual guard.
  const CM_MODE_BY_EXT = {
    md: { src: 'mode/markdown/markdown.js', spec: 'markdown' },
    markdown: { src: 'mode/markdown/markdown.js', spec: 'markdown' },
    json: { src: 'mode/javascript/javascript.js', spec: { name: 'javascript', json: true } },
    js: { src: 'mode/javascript/javascript.js', spec: 'javascript' },
    mjs: { src: 'mode/javascript/javascript.js', spec: 'javascript' },
    cjs: { src: 'mode/javascript/javascript.js', spec: 'javascript' },
    ts: { src: 'mode/javascript/javascript.js', spec: { name: 'javascript', typescript: true } },
    css: { src: 'mode/css/css.js', spec: 'css' },
    scss: { src: 'mode/css/css.js', spec: 'css' },
    html: { src: 'mode/xml/xml.js', spec: { name: 'xml', htmlMode: true } },
    htm: { src: 'mode/xml/xml.js', spec: { name: 'xml', htmlMode: true } },
    xml: { src: 'mode/xml/xml.js', spec: 'xml' },
    py: { src: 'mode/python/python.js', spec: 'python' },
    sh: { src: 'mode/shell/shell.js', spec: 'shell' },
    bash: { src: 'mode/shell/shell.js', spec: 'shell' },
    sql: { src: 'mode/sql/sql.js', spec: 'sql' },
    yml: { src: 'mode/yaml/yaml.js', spec: 'yaml' },
    yaml: { src: 'mode/yaml/yaml.js', spec: 'yaml' },
    ini: { src: 'mode/properties/properties.js', spec: 'properties' },
    conf: { src: 'mode/properties/properties.js', spec: 'properties' },
    properties: { src: 'mode/properties/properties.js', spec: 'properties' },
    toml: { src: 'mode/toml/toml.js', spec: 'toml' }
  };

  function cmModeForEntry(entry) {
    const ext = entry.name.includes('.') ? entry.name.split('.').pop().toLowerCase() : '';
    return CM_MODE_BY_EXT[ext] || null;
  }

  function loadScriptOnce(src) {
    if (document.querySelector(`script[data-src="${src}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.dataset.src = src;
      script.addEventListener('load', () => resolve());
      script.addEventListener('error', () => reject(new Error('Could not load editor assets.')));
      document.head.appendChild(script);
    });
  }

  let cmLoadPromise = null;
  function ensureCodeMirror() {
    if (window.CodeMirror) return Promise.resolve();
    if (!cmLoadPromise) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/vendor/codemirror/lib/codemirror.css';
      document.head.appendChild(link);
      cmLoadPromise = loadScriptOnce('/vendor/codemirror/lib/codemirror.js');
    }
    return cmLoadPromise;
  }

  let cmInstance = null;
  let editorEntry = null;

  async function openEditor(entry) {
    editorEntry = entry;
    els.editorTitle.textContent = entry.name;
    els.editorStatus.textContent = 'Loading…';
    els.editorSaveBtn.disabled = true;
    openEl(els.editorModal);

    try {
      const modeInfo = cmModeForEntry(entry);
      const [res] = await Promise.all([
        fetch(fileUrl(entry.path)),
        ensureCodeMirror().then(() => (modeInfo ? loadScriptOnce(`/vendor/codemirror/${modeInfo.src}`) : null))
      ]);
      if (!res.ok) throw new Error('Could not load this file.');
      const text = await res.text();

      if (cmInstance) {
        cmInstance.toTextArea();
        cmInstance = null;
      }
      els.editorTextarea.value = text;
      cmInstance = window.CodeMirror.fromTextArea(els.editorTextarea, {
        lineNumbers: true,
        mode: modeInfo ? modeInfo.spec : null,
        indentUnit: 2,
        tabSize: 2,
        viewportMargin: Infinity
      });
      els.editorStatus.textContent = '';
      els.editorSaveBtn.disabled = false;
      cmInstance.focus();
    } catch (err) {
      els.editorStatus.textContent = err.message || 'Could not load this file for editing.';
    }
  }

  function closeEditor() {
    if (els.editorModal.hidden) return;
    closeEl(els.editorModal);
    editorEntry = null;
  }

  els.editorClose.addEventListener('click', closeEditor);
  els.editorModal.addEventListener('click', (e) => {
    if (e.target === els.editorModal) closeEditor();
  });

  els.editorSaveBtn.addEventListener('click', async () => {
    if (!editorEntry || !cmInstance) return;
    const content = cmInstance.getValue();
    els.editorSaveBtn.disabled = true;
    els.editorStatus.textContent = 'Saving…';
    try {
      const res = await fetch(`/api/fs/${encodeApiPath(editorEntry.path)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: content
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed.');
      showToast('Saved');
      closeEditor();
      navigate(pathFromLocation(), { push: false });
    } catch (err) {
      els.editorStatus.textContent = err.message || 'Could not save.';
      els.editorSaveBtn.disabled = false;
    }
  });

  async function renameEntry(entry) {
    const newName = window.prompt('Rename to:', entry.name);
    if (!newName || newName === entry.name) return;
    try {
      const res = await fetch(`/api/fs/${encodeApiPath(entry.path)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Rename failed.');
      showToast(`Renamed to "${newName}"`);
      navigate(pathFromLocation(), { push: false });
    } catch (err) {
      showToast(err.message || 'Rename failed.');
    }
  }

  async function deleteEntry(entry) {
    const kind = entry.type === 'directory' ? 'folder and everything inside it' : 'file';
    if (!window.confirm(`Delete "${entry.name}"? This will permanently remove this ${kind}.`)) return;
    try {
      const res = await fetch(`/api/fs/${encodeApiPath(entry.path)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed.');
      showToast(`Deleted "${entry.name}"`);
      navigate(pathFromLocation(), { push: false });
    } catch (err) {
      showToast(err.message || 'Delete failed.');
    }
  }

  // ---------- Anonymous upload drop-box ----------
  // Only shown when the server reports uploadEnabled (config.json's
  // "allowAnonymousUpload"). Always uploads into the fixed /uploads folder —
  // see server/routes/upload.js.
  els.uploadBtn.addEventListener('click', () => els.uploadInput.click());

  els.uploadInput.addEventListener('change', async () => {
    const files = Array.from(els.uploadInput.files || []);
    els.uploadInput.value = '';
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    showToast(`Uploading ${files.length} file${files.length === 1 ? '' : 's'}…`);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      showToast(`Uploaded ${data.files.length} file${data.files.length === 1 ? '' : 's'} to /uploads`);
      if (pathFromLocation() === 'uploads') navigate('uploads', { push: false });
    } catch (err) {
      showToast(err.message || 'Upload failed.');
    }
  });

  // ---------- Audio player ----------
  function openAudioPlaylist(entry) {
    state.playlist = state.entries.filter((e) => e.category === 'audio');
    state.playlistIndex = state.playlist.findIndex((e) => e.path === entry.path);
    els.audioBar.hidden = false;
    els.audioBar.classList.remove('closing');
    playCurrentTrack();
  }

  function playCurrentTrack() {
    const track = state.playlist[state.playlistIndex];
    if (!track) return;
    els.audioEl.src = fileUrl(track.path);
    els.audioTrackName.textContent = track.name;
    els.audioEl.play().catch(() => {});
  }

  function audioStep(delta) {
    if (state.playlist.length === 0) return;
    state.playlistIndex = (state.playlistIndex + delta + state.playlist.length) % state.playlist.length;
    playCurrentTrack();
  }

  els.audioPrev.addEventListener('click', () => audioStep(-1));
  els.audioNext.addEventListener('click', () => audioStep(1));

  els.audioPlayPause.addEventListener('click', () => {
    if (els.audioEl.paused) els.audioEl.play().catch(() => {});
    else els.audioEl.pause();
  });

  els.audioEl.addEventListener('play', () => (els.audioPlayPause.innerHTML = '&#10074;&#10074;'));
  els.audioEl.addEventListener('pause', () => (els.audioPlayPause.innerHTML = '&#9654;'));
  els.audioEl.addEventListener('ended', () => audioStep(1));

  els.audioEl.addEventListener('timeupdate', () => {
    if (!Number.isFinite(els.audioEl.duration)) return;
    els.audioSeekBar.value = (els.audioEl.currentTime / els.audioEl.duration) * 100;
    els.audioCurrentTime.textContent = formatTime(els.audioEl.currentTime);
  });

  els.audioEl.addEventListener('loadedmetadata', () => {
    els.audioDuration.textContent = formatTime(els.audioEl.duration);
  });

  els.audioSeekBar.addEventListener('input', () => {
    if (!Number.isFinite(els.audioEl.duration)) return;
    els.audioEl.currentTime = (els.audioSeekBar.value / 100) * els.audioEl.duration;
  });

  els.audioVolume.addEventListener('input', () => {
    els.audioEl.volume = Number(els.audioVolume.value);
  });

  els.audioClose.addEventListener('click', () => {
    els.audioEl.pause();
    els.audioBar.classList.add('closing');
    window.setTimeout(() => {
      els.audioEl.removeAttribute('src');
      els.audioBar.hidden = true;
    }, 260);
    state.playlist = [];
    state.playlistIndex = -1;
  });

  // ---------- Global handlers ----------
  function closeAllModals() {
    closeLightbox();
    closeVideo();
    closeDoc();
    closeEditor();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
      closeContextMenu();
      closeInfoPanel();
      closeMobileSidebar();
      closeUserMenu();
      return;
    }
    if (!els.lightbox.hidden) {
      if (e.key === 'ArrowLeft') lightboxStep(-1);
      if (e.key === 'ArrowRight') lightboxStep(1);
    }
  });

  window.addEventListener('popstate', () => {
    navigate(pathFromLocation(), { push: false });
  });

  document.querySelector('[data-nav-root]').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('');
  });

  // ---------- User menu (storage-server mode only) ----------
  function closeUserMenu() {
    els.userMenuDropdown.classList.remove('open');
  }

  els.userMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    els.userMenuDropdown.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!els.userMenuDropdown.contains(e.target) && !els.userMenuBtn.contains(e.target)) closeUserMenu();
  });

  els.userMenuLogout.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  });

  function showUserMenu(user) {
    els.userMenu.hidden = false;
    els.userMenuUsername.textContent = user.username;
    els.userAvatar.textContent = user.username.slice(0, 1).toUpperCase();
    els.userMenuRole.textContent = user.role === 'admin' ? 'Admin' : 'Viewer';
    els.userMenuAdminLink.hidden = user.role !== 'admin';
  }

  // ---------- Init ----------
  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      document.title = data.title;
      el('site-title').textContent = data.title;
      const rootNode = state.treeIndex.get('');
      if (rootNode) rootNode.label.textContent = data.title;
      els.uploadBtn.hidden = !data.uploadEnabled;
    } catch {
      // Keep defaults if config fetch fails.
    }
  }

  // Returns false (and redirects to /login) when this server requires a
  // login this browser doesn't have — servers with adminEnabled:false always
  // report "open" here and this is a same-tick no-op.
  async function initAuth() {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      if (data.mode === 'setup' || data.mode === 'login') {
        window.location.href = '/login';
        return false;
      }
      if (data.mode === 'authenticated' && data.user) {
        showUserMenu(data.user);
      }
      return true;
    } catch {
      // Don't brick the app if the auth check itself fails — worst case the
      // subsequent data requests 401 and the user can retry.
      return true;
    }
  }

  async function boot() {
    const authOk = await initAuth();
    if (!authOk) return;

    if (localStorage.getItem('sb_sidebar_collapsed') === '1') {
      document.querySelector('.app-shell').classList.add('sidebar-collapsed');
    }

    initTree();
    applyView();
    loadConfig();
    navigate(pathFromLocation(), { push: false });
    window.history.replaceState(
      { path: pathFromLocation() },
      '',
      `${BROWSE_PREFIX}/${encodeApiPath(pathFromLocation())}`
    );
  }

  boot();
})();
