/* ============================================================
   script.js — AdminForge
   All frontend functionality: auth simulation, CRUD, table,
   toast notifications, search, image preview, sidebar toggle
   ============================================================ */

// ════════════════════════════════════════════════════════════
// SHARED UTILITIES
// ════════════════════════════════════════════════════════════

// ── Toast Notification ───────────────────────────────────────
const toastStack = (() => {
  let el = document.querySelector('.toast-stack');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast-stack'; 
    document.body.appendChild(el);
  }
  return el;
})();

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `af-toast ${type}`;
  t.innerHTML = `<span class="toast-dot"></span><span>${msg}</span>`;
  toastStack.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 350);
  }, 3200);
}

// ── Password toggle ──────────────────────────────────────────
function initPwToggle(inputId, toggleId) {
  const input  = document.getElementById(inputId);
  const toggle = document.getElementById(toggleId);
  if (!input || !toggle) return;
  toggle.addEventListener('click', () => {
    input.type = input.type === 'password' ? 'text' : 'password';
    toggle.textContent = input.type === 'password' ? '👁' : '🙈';
  });
}

// ── Escape HTML (XSS guard) ──────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

// ── Format date string ───────────────────────────────────────
function fmtDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'2-digit' });
}

// ════════════════════════════════════════════════════════════
// SIGN IN PAGE
// ════════════════════════════════════════════════════════════
function initSignIn() {
  const form = document.getElementById('signin-form');
  if (!form) return;

  initPwToggle('si-password', 'si-pw-toggle');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const email = document.getElementById('si-email').value.trim();
    const pw    = document.getElementById('si-password').value;

    if (!email || !pw) {
      showToast('Please fill in all fields.', 'error'); return;
    }

    // Simulate auth — store dummy session
    sessionStorage.setItem('af_user', JSON.stringify({
      name: email.split('@')[0] || 'Admin',
      email: email,
      role: 'Admin'
    }));

    showToast('Signed in! Redirecting…', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);
  });

  // Google / Facebook dummy
  document.querySelectorAll('.btn-social').forEach(btn => {
    btn.addEventListener('click', () => {
      sessionStorage.setItem('af_user', JSON.stringify({ name: 'Social User', email: 'social@demo.com', role: 'User' }));
      showToast('Social sign-in simulated. Redirecting…', 'info');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);
    });
  });
}

// ════════════════════════════════════════════════════════════
// SIGN UP PAGE
// ════════════════════════════════════════════════════════════
function initSignUp() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  initPwToggle('su-password', 'su-pw-toggle');

  // Password strength
  const pwInput = document.getElementById('su-password');
  if (pwInput) {
    pwInput.addEventListener('input', function () {
      updateStrength(this.value);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const name  = document.getElementById('su-name').value.trim();
    const email = document.getElementById('su-email').value.trim();
    const pw    = document.getElementById('su-password').value;
    const role  = document.getElementById('su-role').value;

    if (!name || !email || !pw || !role) {
      showToast('Please fill in all fields.', 'error'); return;
    }
    if (pw.length < 6) {
      showToast('Password must be at least 6 characters.', 'error'); return;
    }

    sessionStorage.setItem('af_user', JSON.stringify({ name, email, role }));
    showToast('Account created! Redirecting…', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);
  });

  document.querySelectorAll('.btn-social').forEach(btn => {
    btn.addEventListener('click', () => {
      sessionStorage.setItem('af_user', JSON.stringify({ name: 'Social User', email: 'social@demo.com', role: 'User' }));
      showToast('Social sign-up simulated. Redirecting…', 'info');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);
    });
  });
}

function updateStrength(val) {
  const bar   = document.getElementById('pw-bar-fill');
  const label = document.getElementById('pw-label');
  const wrap  = document.getElementById('pw-strength-wrap');
  if (!bar || !label || !wrap) return;

  if (!val) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';

  let score = 0;
  if (val.length >= 6)  score++;
  if (val.length >= 10) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  const levels = [
    { w:'20%', c:'#c0392b', t:'Very weak'   },
    { w:'40%', c:'#e67e22', t:'Weak'        },
    { w:'60%', c:'#f1c40f', t:'Fair'        },
    { w:'80%', c:'#27ae60', t:'Strong'      },
    { w:'100%',c:'#27ae60', t:'Very strong' },
  ];
  const lvl = levels[Math.min(score - 1, 4)] || levels[0];
  bar.style.width      = lvl.w;
  bar.style.background = lvl.c;
  label.textContent    = lvl.t;
  label.style.color    = lvl.c;
}

// ════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════

// In-memory data store
let users = [];
let editingId = null; // null = add mode, number = edit mode

function initDashboard() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  // Populate logged-in user info
  const session = JSON.parse(sessionStorage.getItem('af_user') || '{}');
  const uname = session.name || 'Admin';
  const urole = session.role || 'Admin';
  const uemail = session.email || '';

  const nameEls = document.querySelectorAll('.js-user-name');
  const roleEls = document.querySelectorAll('.js-user-role');
  nameEls.forEach(el => el.textContent = uname);
  roleEls.forEach(el => el.textContent = urole);

  // Set sidebar avatar initial
  const avatarEl = document.getElementById('sidebar-avatar');
  if (avatarEl) avatarEl.textContent = uname[0].toUpperCase();

  // Load sample data
  loadSampleData();
  renderTable();
  updateStats();

  // Image file preview
  const imgInput = document.getElementById('f-image');
  if (imgInput) {
    imgInput.addEventListener('change', function () {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById('img-preview').src = e.target.result;
        document.getElementById('img-preview-wrap').style.display = 'block';
      };
      reader.readAsDataURL(file);
    });
  }

  // Add/Update form submit
  document.getElementById('user-form').addEventListener('submit', function (e) {
    e.preventDefault();
    handleFormSubmit();
  });

  // Clear button
  document.getElementById('btn-clear').addEventListener('click', clearForm);

  // Search
  document.getElementById('table-search').addEventListener('input', function () {
    renderTable(this.value.toLowerCase());
  });

  // Sidebar toggle
  document.getElementById('sidebar-toggle')?.addEventListener('click', openSidebar);
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    sessionStorage.removeItem('af_user');
    window.location.href = 'index.html';
  });
}

// ── Sample seed data ─────────────────────────────────────────
function loadSampleData() {
  users = [
    {
      id: 1001,
      name: 'Alice Monroe',
      email: 'alice@example.com',
      phone: '+1 415 555 0101',
      address: '42 Market St, San Francisco, CA',
      image: '',
      created_at: '2024-11-01',
      updated_at: '2025-01-15',
    },
    {
      id: 1002,
      name: 'James Okafor',
      email: 'james.o@example.com',
      phone: '+44 20 7946 0802',
      address: '8 Baker Street, London, UK',
      image: '',
      created_at: '2024-12-10',
      updated_at: '2025-02-20',
    },
    {
      id: 1003,
      name: 'Sofia Reyes',
      email: 'sofia.r@example.com',
      phone: '+34 91 555 0303',
      address: 'Calle Mayor 12, Madrid, Spain',
      image: '',
      created_at: '2025-01-05',
      updated_at: '2025-03-01',
    },
  ];
}

// ── Render table ─────────────────────────────────────────────
function renderTable(query = '') {
  const tbody   = document.getElementById('users-tbody');
  const emptyEl = document.getElementById('empty-state');
  const countEl = document.getElementById('table-count');
  const sideBar = document.getElementById('sidebar-count');

  let filtered = users;
  if (query) {
    filtered = users.filter(u =>
      (u.name   || '').toLowerCase().includes(query) ||
      (u.email  || '').toLowerCase().includes(query) ||
      (u.phone  || '').toLowerCase().includes(query) ||
      (u.address|| '').toLowerCase().includes(query) ||
      String(u.id).includes(query)
    );
  }

  if (countEl) countEl.textContent = filtered.length;
  if (sideBar) sideBar.textContent = users.length;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  tbody.innerHTML = filtered.map(u => {
    const avatarHtml = u.image
      ? `<img src="${esc(u.image)}" class="t-avatar" alt="${esc(u.name)}"
           onerror="this.outerHTML='<div class=t-avatar-placeholder>${esc((u.name||'?')[0].toUpperCase())}</div>'" />`
      : `<div class="t-avatar-placeholder">${esc((u.name || '?')[0].toUpperCase())}</div>`;

    return `
      <tr>
        <td><span class="t-id-badge">#${esc(u.id)}</span></td>
        <td class="t-name">${esc(u.name || '—')}</td>
        <td class="t-email">${esc(u.email || '—')}</td>
        <td>${esc(u.phone || '—')}</td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(u.address)}">${esc(u.address || '—')}</td>
        <td>${avatarHtml}</td>
        <td style="font-size:0.8rem;color:var(--ink-4);white-space:nowrap">${fmtDate(u.created_at)}</td>
        <td style="font-size:0.8rem;color:var(--ink-4);white-space:nowrap">${fmtDate(u.updated_at)}</td>
        <td>
          <button class="btn btn-sm btn-success-soft me-1" onclick="editUser(${u.id})" title="Edit">✏️</button>
          <button class="btn btn-sm btn-danger-soft"       onclick="deleteUser(${u.id})" title="Delete">🗑</button>
        </td>
      </tr>`;
  }).join('');
}

// ── Stats ────────────────────────────────────────────────────
function updateStats() {
  const today = new Date().toISOString().slice(0, 10);

  setText('stat-total',  users.length);
  setText('stat-emails', users.filter(u => u.email).length);
  setText('stat-images', users.filter(u => u.image).length);
  setText('stat-today',  users.filter(u => u.created_at === today).length);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Add / Update ─────────────────────────────────────────────
function handleFormSubmit() {
  const id      = parseInt(document.getElementById('f-id').value) || Date.now();
  const name    = document.getElementById('f-name').value.trim();
  const email   = document.getElementById('f-email').value.trim();
  const phone   = document.getElementById('f-phone').value.trim();
  const address = document.getElementById('f-address').value.trim();
  const created = document.getElementById('f-created').value;
  const updated = document.getElementById('f-updated').value;

  if (!name || !email) {
    showToast('Name and Email are required.', 'error'); return;
  }

  // Resolve image (FileReader result or empty)
  const previewSrc = document.getElementById('img-preview').src;
  const image = (previewSrc && previewSrc !== window.location.href) ? previewSrc : '';

  const record = { id, name, email, phone, address, image, created_at: created, updated_at: updated };

  if (editingId !== null) {
    // Update existing
    const idx = users.findIndex(u => u.id === editingId);
    if (idx > -1) {
      users[idx] = { ...users[idx], ...record };
      showToast(`"${name}" updated successfully. ✓`, 'success');
    }
    editingId = null;
    setFormMode('add');
  } else {
    // Check duplicate ID
    if (users.find(u => u.id === id)) {
      showToast('A user with this ID already exists.', 'error'); return;
    }
    users.push(record);
    showToast(`"${name}" added successfully! ✓`, 'success');
  }

  clearForm();
  renderTable();
  updateStats();
  scrollToSection('section-table');
}

// ── Edit ─────────────────────────────────────────────────────
function editUser(id) {
  const u = users.find(u => u.id === id);
  if (!u) return;
  editingId = id;

  document.getElementById('f-id').value      = u.id;
  document.getElementById('f-name').value    = u.name;
  document.getElementById('f-email').value   = u.email;
  document.getElementById('f-phone').value   = u.phone || '';
  document.getElementById('f-address').value = u.address || '';
  document.getElementById('f-created').value = u.created_at || '';
  document.getElementById('f-updated').value = u.updated_at || '';

  if (u.image) {
    document.getElementById('img-preview').src = u.image;
    document.getElementById('img-preview-wrap').style.display = 'block';
  } else {
    document.getElementById('img-preview-wrap').style.display = 'none';
  }

  setFormMode('edit', u.name);
  scrollToSection('section-form');
}

// ── Delete ───────────────────────────────────────────────────
function deleteUser(id) {
  const u = users.find(u => u.id === id);
  if (!u) return;
  if (!confirm(`Delete "${u.name}"? This cannot be undone.`)) return;
  users = users.filter(u => u.id !== id);
  showToast(`"${u.name}" deleted.`, 'info');
  clearForm();
  renderTable(document.getElementById('table-search').value.toLowerCase());
  updateStats();
}

// ── Clear form ───────────────────────────────────────────────
function clearForm() {
  document.getElementById('user-form').reset();
  document.getElementById('img-preview-wrap').style.display = 'none';
  document.getElementById('img-preview').src = '';
  editingId = null;
  setFormMode('add');
}

// ── Form mode label ──────────────────────────────────────────
function setFormMode(mode, name = '') {
  const label  = document.getElementById('form-mode-label');
  const submit = document.getElementById('btn-submit');
  if (mode === 'edit') {
    if (label)  label.textContent  = `Editing: ${name}`;
    if (submit) submit.textContent = '✏️ Update User';
  } else {
    if (label)  label.textContent  = 'Add New User';
    if (submit) submit.textContent = '＋ Add Data';
  }
}

// ── Scroll helper ────────────────────────────────────────────
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Sidebar ──────────────────────────────────────────────────
function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('show');
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
}

// ════════════════════════════════════════════════════════════
// AUTO-INIT on DOM ready
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initSignIn();
  initSignUp();
  initDashboard();
});
