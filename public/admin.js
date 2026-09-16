(() => {
  'use strict';

  const el = (id) => document.getElementById(id);
  const els = {
    denied: el('admin-denied'),
    deniedMessage: el('admin-denied-message'),
    content: el('admin-content'),
    siteTitle: el('admin-site-title'),
    settingsForm: el('settings-form'),
    settingsToast: el('settings-toast'),
    title: el('setting-title'),
    openMode: el('setting-open-mode'),
    anonUpload: el('setting-anon-upload'),
    writeEnabled: el('setting-write-enabled'),
    defaultMode: el('setting-default-mode'),
    webdav: el('setting-webdav'),
    rulesList: el('rules-list'),
    addRuleBtn: el('add-rule-btn'),
    root: el('setting-root'),
    hostPort: el('setting-hostport'),
    saveBtn: el('settings-save-btn'),
    usersBody: el('users-body'),
    userForm: el('user-form'),
    newUsername: el('new-username'),
    newPassword: el('new-password'),
    newRole: el('new-role'),
    usersToast: el('users-toast')
  };

  let currentUsername = null;
  let wasOpenMode = false;

  function showToast(box, message, isError) {
    box.textContent = message;
    box.className = 'admin-toast' + (isError ? ' error' : '');
    box.hidden = false;
    window.setTimeout(() => { box.hidden = true; }, 3500);
  }

  function addRuleRow(rule) {
    const row = document.createElement('div');
    row.className = 'rule-row';

    const pathInput = document.createElement('input');
    pathInput.type = 'text';
    pathInput.placeholder = 'e.g. incoming';
    pathInput.value = rule ? rule.path : '';

    const modeSelect = document.createElement('select');
    modeSelect.innerHTML = '<option value="read-only">Read-only</option><option value="read-write">Read-write</option>';
    modeSelect.value = rule && rule.mode === 'read-write' ? 'read-write' : 'read-only';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => row.remove());

    row.appendChild(pathInput);
    row.appendChild(modeSelect);
    row.appendChild(removeBtn);
    els.rulesList.appendChild(row);
  }

  els.addRuleBtn.addEventListener('click', () => addRuleRow(null));

  function collectRules() {
    return Array.from(els.rulesList.querySelectorAll('.rule-row'))
      .map((row) => ({
        path: row.querySelector('input').value.trim(),
        mode: row.querySelector('select').value
      }))
      .filter((r) => r.path);
  }

  async function loadSettings() {
    const res = await fetch('/api/admin/settings');
    if (!res.ok) throw new Error('Could not load settings.');
    const data = await res.json();

    els.title.value = data.title || '';
    els.openMode.checked = data.openDirectoryMode !== false;
    wasOpenMode = els.openMode.checked;
    els.anonUpload.checked = !!data.allowAnonymousUpload;
    els.writeEnabled.checked = !!(data.allowWriteAccess && data.allowWriteAccess.enabled);
    els.defaultMode.value = data.allowWriteAccess && data.allowWriteAccess.defaultMode === 'read-write' ? 'read-write' : 'read-only';
    els.webdav.checked = !!(data.allowWriteAccess && data.allowWriteAccess.webdav);
    els.rulesList.innerHTML = '';
    (data.allowWriteAccess && data.allowWriteAccess.rules ? data.allowWriteAccess.rules : []).forEach(addRuleRow);
    els.root.textContent = data.root || '';
    els.hostPort.textContent = `${data.host || ''}:${data.port || ''}`;
  }

  els.settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (els.openMode.checked && !wasOpenMode) {
      const ok = window.confirm(
        'Turning on Open Directory mode removes the login requirement — anyone will be able to browse (and use anonymous upload / write access, if those are on) without signing in. Continue?'
      );
      if (!ok) {
        els.openMode.checked = false;
        return;
      }
    }

    const payload = {
      title: els.title.value.trim(),
      openDirectoryMode: els.openMode.checked,
      allowAnonymousUpload: els.anonUpload.checked,
      allowWriteAccess: {
        enabled: els.writeEnabled.checked,
        webdav: els.webdav.checked,
        defaultMode: els.defaultMode.value,
        rules: collectRules()
      }
    };

    els.saveBtn.disabled = true;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save settings.');
      wasOpenMode = els.openMode.checked;
      showToast(els.settingsToast, 'Settings saved.', false);
    } catch (err) {
      showToast(els.settingsToast, err.message || 'Could not save settings.', true);
    } finally {
      els.saveBtn.disabled = false;
    }
  });

  function userRow(user) {
    const tr = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.textContent = user.username;
    tr.appendChild(nameTd);

    const roleTd = document.createElement('td');
    roleTd.textContent = user.role;
    if (user.role === 'admin') roleTd.className = 'role-admin';
    tr.appendChild(roleTd);

    const createdTd = document.createElement('td');
    createdTd.textContent = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—';
    tr.appendChild(createdTd);

    const actionsTd = document.createElement('td');

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.textContent = 'Reset password';
    resetBtn.addEventListener('click', async () => {
      const newPassword = window.prompt(`New password for "${user.username}" (min. 8 characters):`);
      if (!newPassword) return;
      try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(user.username)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPassword })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not reset password.');
        showToast(els.usersToast, `Password updated for "${user.username}".`, false);
      } catch (err) {
        showToast(els.usersToast, err.message || 'Could not reset password.', true);
      }
    });
    actionsTd.appendChild(resetBtn);

    if (user.username.toLowerCase() !== (currentUsername || '').toLowerCase()) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'danger';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', async () => {
        if (!window.confirm(`Delete the user "${user.username}"? This cannot be undone.`)) return;
        try {
          const res = await fetch(`/api/admin/users/${encodeURIComponent(user.username)}`, { method: 'DELETE' });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Could not delete user.');
          await loadUsers();
        } catch (err) {
          showToast(els.usersToast, err.message || 'Could not delete user.', true);
        }
      });
      actionsTd.appendChild(deleteBtn);
    }

    tr.appendChild(actionsTd);
    return tr;
  }

  async function loadUsers() {
    const res = await fetch('/api/admin/users');
    if (!res.ok) throw new Error('Could not load users.');
    const data = await res.json();
    els.usersBody.innerHTML = '';
    data.users.forEach((user) => els.usersBody.appendChild(userRow(user)));
  }

  els.userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: els.newUsername.value.trim(),
          password: els.newPassword.value,
          role: els.newRole.value
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not add user.');
      els.userForm.reset();
      showToast(els.usersToast, `User "${data.user.username}" created.`, false);
      await loadUsers();
    } catch (err) {
      showToast(els.usersToast, err.message || 'Could not add user.', true);
    }
  });

  async function init() {
    try {
      const statusRes = await fetch('/api/auth/status');
      const status = await statusRes.json();

      if (status.mode !== 'authenticated' || !status.user || status.user.role !== 'admin') {
        els.deniedMessage.textContent =
          status.mode === 'open'
            ? 'Open Directory mode is on, so there is no login and no admin panel. Turn it off in config.json (allowWriteAccess/openDirectoryMode) to use this page.'
            : status.user
            ? 'Your account is not an admin.'
            : 'You need to be signed in as an admin to view this page.';
        els.denied.hidden = false;
        return;
      }

      currentUsername = status.user.username;
      els.content.hidden = false;
      await Promise.all([loadSettings(), loadUsers()]);
    } catch {
      els.deniedMessage.textContent = 'Could not load the admin panel.';
      els.denied.hidden = false;
    }
  }

  fetch('/api/config')
    .then((r) => r.json())
    .then((data) => {
      if (data && data.title) {
        document.title = `Admin settings — ${data.title}`;
        els.siteTitle.textContent = data.title;
      }
    })
    .catch(() => {});

  init();
})();
