// Admin Panel: list semua user, aktivasi/deaktivasi, perpanjangan langganan
let allUsersCache = [];
let adminFilter = 'all';
let adminSearch = '';

function isAdmin() {
  return currentUser && currentUser.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase());
}

// Ambil semua user dari Firestore (collectionGroup pada subcollection 'meta')
async function loadAllUsers() {
  if (!fbDb || !isAdmin()) return [];
  try {
    const snap = await fbDb.collectionGroup('meta').get();
    const users = snap.docs
      .filter(d => d.id === 'profile')
      .map(d => ({ uid: d.ref.parent.parent.id, ...d.data() }));
    // Sort: pending dulu, lalu yang baru daftar di atas
    users.sort((a, b) => {
      const aActive = isUserActive(a);
      const bActive = isUserActive(b);
      if (aActive !== bActive) return aActive ? 1 : -1;  // pending naik
      const aDate = new Date(a.createdAt || 0);
      const bDate = new Date(b.createdAt || 0);
      return bDate - aDate;
    });
    allUsersCache = users;
    return users;
  } catch (e) {
    console.error('Gagal load users:', e);
    showToast('Gagal load users: ' + (e.message || ''), 'error');
    return [];
  }
}

function isUserActive(profile) {
  if (!profile || !profile.expiresAt) return false;
  return new Date(profile.expiresAt).getTime() > Date.now();
}

function getUserStatus(profile) {
  if (!profile.expiresAt) return { label: 'Pending', color: '#92400e', bg: '#fef3c7' };
  const now = Date.now();
  const exp = new Date(profile.expiresAt).getTime();
  if (profile.plan === 'lifetime' && exp > now) {
    return { label: '⭐ Lifetime', color: '#fff', bg: 'linear-gradient(135deg,#8b5a2b,#c89468)' };
  }
  if (profile.plan === 'monthly' && exp > now) {
    const days = Math.ceil((exp - now) / (24 * 60 * 60 * 1000));
    return { label: `📅 Monthly (${days}h)`, color: '#fff', bg: '#10b981' };
  }
  if (profile.plan === 'trial' && exp > now) {
    const days = Math.ceil((exp - now) / (24 * 60 * 60 * 1000));
    return { label: `🎁 Trial (${days}h)`, color: '#fff', bg: '#3b82f6' };
  }
  return { label: '⏸️ Expired/Pending', color: '#991b1b', bg: '#fee2e2' };
}

// Aktivasi user dengan paket tertentu
async function activateUser(uid, paket) {
  if (!fbDb || !isAdmin()) return;
  const ref = fbDb.collection('users').doc(uid).collection('meta').doc('profile');
  let plan, expiresAt;
  const now = new Date();
  if (paket === 'monthly') {
    plan = 'monthly';
    // Kalau masih aktif, tambahkan 30 hari ke expiresAt yang ada (perpanjangan)
    const existing = allUsersCache.find(u => u.uid === uid);
    let base = now;
    if (existing && existing.expiresAt && new Date(existing.expiresAt) > now) {
      base = new Date(existing.expiresAt);
    }
    expiresAt = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  } else if (paket === 'lifetime') {
    plan = 'lifetime';
    expiresAt = '2099-12-31T23:59:59.000Z';
  } else {
    throw new Error('Paket tidak dikenal');
  }
  await ref.update({
    plan,
    expiresAt,
    activatedBy: currentUser.email,
    activatedAt: now.toISOString(),
  });
}

async function deactivateUser(uid) {
  if (!fbDb || !isAdmin()) return;
  const ref = fbDb.collection('users').doc(uid).collection('meta').doc('profile');
  await ref.update({
    plan: 'pending',
    expiresAt: new Date().toISOString(),
    deactivatedBy: currentUser.email,
    deactivatedAt: new Date().toISOString(),
  });
}

// Render Admin Panel UI
async function renderAdmin() {
  const root = document.getElementById('admin-root');
  if (!root) return;
  if (!isAdmin()) {
    root.innerHTML = '<div class="empty">Akses admin hanya untuk akun admin.</div>';
    return;
  }
  root.innerHTML = '<div class="empty">⏳ Memuat data customer…</div>';
  const users = await loadAllUsers();
  renderAdminUsers(users);
}

function renderAdminUsers(users) {
  const root = document.getElementById('admin-root');
  if (!root) return;
  // Filter & search
  let list = users;
  if (adminFilter === 'pending') list = list.filter(u => !isUserActive(u));
  else if (adminFilter === 'active') list = list.filter(u => isUserActive(u));
  else if (adminFilter === 'lifetime') list = list.filter(u => u.plan === 'lifetime' && isUserActive(u));
  if (adminSearch) {
    const q = adminSearch.toLowerCase();
    list = list.filter(u =>
      (u.email || '').toLowerCase().includes(q) ||
      (u.displayName || '').toLowerCase().includes(q)
    );
  }

  // Stats
  const total = users.length;
  const active = users.filter(u => isUserActive(u)).length;
  const pending = users.filter(u => !isUserActive(u)).length;
  const lifetime = users.filter(u => u.plan === 'lifetime' && isUserActive(u)).length;
  const monthly = users.filter(u => u.plan === 'monthly' && isUserActive(u)).length;
  const revenue = lifetime * PRICE_LIFETIME + monthly * PRICE_MONTHLY;

  root.innerHTML = `
    <div class="admin-stats">
      <div class="admin-stat"><b>${total}</b><small>Total User</small></div>
      <div class="admin-stat ok"><b>${active}</b><small>Aktif</small></div>
      <div class="admin-stat warn"><b>${pending}</b><small>Pending/Expired</small></div>
      <div class="admin-stat star"><b>${lifetime}</b><small>Lifetime</small></div>
      <div class="admin-stat blue"><b>${monthly}</b><small>Bulanan</small></div>
      <div class="admin-stat money"><b>${formatRupiah(revenue)}</b><small>Revenue Total</small></div>
    </div>

    <div class="admin-toolbar">
      <input type="search" id="admin-search" placeholder="Cari email / nama…" value="${escapeHtml(adminSearch)}" />
      <div class="admin-filters">
        <button class="seg ${adminFilter==='all'?'active':''}" data-fil="all">Semua (${total})</button>
        <button class="seg ${adminFilter==='pending'?'active':''}" data-fil="pending">Pending (${pending})</button>
        <button class="seg ${adminFilter==='active'?'active':''}" data-fil="active">Aktif (${active})</button>
        <button class="seg ${adminFilter==='lifetime'?'active':''}" data-fil="lifetime">Lifetime (${lifetime})</button>
      </div>
      <button class="btn btn-ghost" id="admin-refresh">🔄 Refresh</button>
    </div>

    <div class="admin-list">
      ${list.length === 0 ? '<div class="empty">Tidak ada user yang cocok.</div>' :
        list.map(u => renderAdminCard(u)).join('')}
    </div>
  `;

  // Bind events
  document.getElementById('admin-search').addEventListener('input', (e) => {
    adminSearch = e.target.value;
    renderAdminUsers(allUsersCache);
  });
  document.querySelectorAll('.admin-filters .seg').forEach(btn => {
    btn.onclick = () => {
      adminFilter = btn.dataset.fil;
      renderAdminUsers(allUsersCache);
    };
  });
  document.getElementById('admin-refresh').onclick = () => renderAdmin();

  // Bind action buttons
  document.querySelectorAll('[data-act]').forEach(btn => {
    btn.onclick = () => handleAdminAction(btn.dataset.act, btn.dataset.uid, btn.dataset.email);
  });
}

function renderAdminCard(u) {
  const status = getUserStatus(u);
  const initial = (u.displayName || u.email || '?')[0].toUpperCase();
  const created = u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  const expires = u.expiresAt ? new Date(u.expiresAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  return `
    <div class="admin-card">
      <div class="admin-card-head">
        <div class="admin-avatar">${u.photoURL ? `<img src="${escapeHtml(u.photoURL)}" />` : initial}</div>
        <div class="admin-info">
          <b>${escapeHtml(u.displayName || u.email || '?')}</b>
          <span>${escapeHtml(u.email || '')}</span>
          <small>Daftar: ${created} · Expires: ${expires}</small>
        </div>
        <div class="admin-status" style="background:${status.bg};color:${status.color}">${status.label}</div>
      </div>
      <div class="admin-actions">
        <button class="btn btn-primary btn-small" data-act="monthly" data-uid="${u.uid}" data-email="${escapeHtml(u.email||'')}">📅 Aktivasi Bulanan</button>
        <button class="btn btn-life btn-small" data-act="lifetime" data-uid="${u.uid}" data-email="${escapeHtml(u.email||'')}">⭐ Aktivasi Lifetime</button>
        <button class="btn btn-ghost btn-small" data-act="deactivate" data-uid="${u.uid}" data-email="${escapeHtml(u.email||'')}">⏸️ Nonaktifkan</button>
      </div>
    </div>
  `;
}

async function handleAdminAction(action, uid, email) {
  let confirmMsg = '';
  if (action === 'monthly') confirmMsg = `Aktivasi paket BULANAN (Rp ${PRICE_MONTHLY.toLocaleString('id-ID')}) untuk ${email}?\n\nMasa berlaku: 30 hari (akan ditambah ke sisa langganan jika masih aktif).`;
  else if (action === 'lifetime') confirmMsg = `Aktivasi paket LIFETIME (Rp ${PRICE_LIFETIME.toLocaleString('id-ID')}) untuk ${email}?\n\nAkun akan aktif SELAMANYA.`;
  else if (action === 'deactivate') confirmMsg = `Nonaktifkan akun ${email}?\n\nUser akan langsung ke paywall.`;
  if (!confirm(confirmMsg)) return;

  try {
    if (action === 'deactivate') {
      await deactivateUser(uid);
      showToast(`Akun ${email} dinonaktifkan`, 'success');
    } else {
      await activateUser(uid, action);
      showToast(`✅ Akun ${email} aktif (${action})`, 'success');
    }
    // Reload list
    await renderAdmin();
  } catch (e) {
    console.error(e);
    showToast('Gagal: ' + (e.message || 'unknown'), 'error');
  }
}
