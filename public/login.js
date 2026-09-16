(() => {
  'use strict';

  const el = (id) => document.getElementById(id);
  const heading = el('auth-heading');
  const sub = el('auth-sub');
  const form = el('auth-form');
  const errorBox = el('auth-error');
  const submitBtn = el('auth-submit');
  const confirmWrap = el('auth-confirm-wrap');
  const confirmInput = el('auth-confirm');
  const usernameInput = el('auth-username');
  const passwordInput = el('auth-password');

  let mode = 'login';

  function applyMode() {
    form.hidden = false;
    if (mode === 'setup') {
      heading.textContent = 'Create the admin account';
      sub.textContent = 'This is a one-time setup for this server. This account can manage users and settings.';
      submitBtn.textContent = 'Create account';
      confirmWrap.hidden = false;
      confirmInput.required = true;
    } else {
      heading.textContent = 'Sign in';
      sub.textContent = 'Log in to browse this server.';
      submitBtn.textContent = 'Sign in';
      confirmWrap.hidden = true;
      confirmInput.required = false;
    }
  }

  async function init() {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      if (data.mode === 'open' || data.mode === 'authenticated') {
        window.location.href = '/browse/';
        return;
      }
      mode = data.mode === 'setup' ? 'setup' : 'login';
    } catch {
      mode = 'login';
    }
    applyMode();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.hidden = true;

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (mode === 'setup' && password !== confirmInput.value) {
      errorBox.textContent = 'Passwords do not match.';
      errorBox.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    try {
      const endpoint = mode === 'setup' ? '/api/auth/setup' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      window.location.href = '/browse/';
    } catch (err) {
      errorBox.textContent = err.message || 'Something went wrong.';
      errorBox.hidden = false;
      submitBtn.disabled = false;
    }
  });

  fetch('/api/config')
    .then((r) => r.json())
    .then((data) => {
      if (data && data.title) {
        document.title = `Sign in — ${data.title}`;
        el('auth-brand-title').textContent = data.title;
      }
    })
    .catch(() => {});

  init();
})();
