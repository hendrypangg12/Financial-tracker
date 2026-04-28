// Admin Panel untuk BerBisnis
// Akses: hanya email yang ada di BERBISNIS_ADMIN_EMAILS (firebase-config.js)
// Fitur: list semua user, aktivasi/deaktivasi paket

async function loadAllBerbisnisUsers() {
  if (!fbDb) throw new Error('Firestore belum siap');
  // collectionGroup query — ambil semua doc dengan id 'berbisnis-profile' di subcollection 'meta'
  const snap = await fbDb.collectionGroup('meta').get();
  const users = [];
  snap.forEach(doc => {
    if (doc.id === 'berbisnis-profile') {
      // Path: users/{uid}/meta/berbisnis-profile
      const uid = doc.ref.parent.parent.id;
      users.push({ uid, ...doc.data() });
    }
  });
  return users;
}

async function activateBerbisnisUser(uid, plan, days) {
  if (!fbDb) throw new Error('Firestore belum siap');
  const ref = fbDb.collection('users').doc(uid).collection('meta').doc('berbisnis-profile');
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await ref.update({
    plan,
    expiresAt: expires.toISOString(),
    activatedAt: new Date().toISOString(),
    activatedBy: currentUser?.email || 'admin',
  });
}

async function deactivateBerbisnisUser(uid) {
  if (!fbDb) throw new Error('Firestore belum siap');
  const ref = fbDb.collection('users').doc(uid).collection('meta').doc('berbisnis-profile');
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await ref.update({
    plan: 'expired',
    expiresAt: yesterday.toISOString(),
  });
}

async function findUserByEmail(email) {
  const users = await loadAllBerbisnisUsers();
  return users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
}

async function renderAdminPanel() {
  const tbody = document.getElementById('admin-users-body');
  const countEl = document.getElementById('admin-count');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="empty">Loading...</td></tr>';

  let users = [];
  try {
    users = await loadAllBerbisnisUsers();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty" style="color:var(--danger)">Error: ${err.message}</td></tr>`;
    return;
  }

  if (countEl) countEl.textContent = `${users.length} user`;

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Belum ada user</td></tr>';
    return;
  }

  // Sort: trial active dulu, lalu paid, lalu expired
  users.sort((a, b) => {
    const aActive = isBerbisnisActive(a) ? 1 : 0;
    const bActive = isBerbisnisActive(b) ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return (a.email || '').localeCompare(b.email || '');
  });

  tbody.innerHTML = users.map(u => {
    const days = daysRemainingBerbisnis(u);
    const active = isBerbisnisActive(u);
    const planBadge = u.plan === 'trial' ? `<span style="color:#3b82f6">Trial</span>`
      : u.plan === 'starter' ? `<span style="color:#10b981">Starter</span>`
      : u.plan === 'pro' ? `<span style="color:#c9a352">Pro</span>`
      : `<span style="color:var(--danger)">Expired</span>`;
    const expiresStr = u.expiresAt ? new Date(u.expiresAt).toLocaleDateString('id-ID') : '-';
    const daysStr = active ? `${days} hari lagi` : 'Habis';
    const createdStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-';
    return `
      <tr>
        <td><b>${escapeHtml(u.email || '-')}</b></td>
        <td>${escapeHtml(u.bizName || '-')}</td>
        <td>${planBadge} <small>(${daysStr})</small></td>
        <td>${expiresStr}</td>
        <td>${createdStr}</td>
        <td>
          <button class="btn btn-small" data-act-uid="${u.uid}" data-plan="starter">+ Starter</button>
          <button class="btn btn-small btn-gold" data-act-uid="${u.uid}" data-plan="pro">+ Pro</button>
          <button class="btn btn-small btn-danger" data-deact-uid="${u.uid}">Deaktivasi</button>
        </td>
      </tr>
    `;
  }).join('');

  // Bind activation buttons
  tbody.querySelectorAll('[data-act-uid]').forEach(btn => {
    btn.onclick = async () => {
      const uid = btn.dataset.actUid;
      const plan = btn.dataset.plan;
      const planLabel = plan === 'pro' ? 'Pro Early Bird Rp 500rb' : 'Starter Rp 99rb';
      if (!confirm(`Aktivasi ${planLabel} untuk 30 hari?`)) return;
      btn.disabled = true; btn.textContent = '...';
      try {
        await activateBerbisnisUser(uid, plan, 30);
        showToast(`✅ User aktif sebagai ${plan} (30 hari)`, 'success');
        renderAdminPanel();
      } catch (err) {
        showToast(`❌ ${err.message}`, 'error');
        btn.disabled = false;
        btn.textContent = plan === 'pro' ? '+ Pro' : '+ Starter';
      }
    };
  });

  // Bind deactivation buttons
  tbody.querySelectorAll('[data-deact-uid]').forEach(btn => {
    btn.onclick = async () => {
      const uid = btn.dataset.deactUid;
      if (!confirm('Yakin deaktivasi user ini? Akan tampil paywall di akun mereka.')) return;
      btn.disabled = true; btn.textContent = '...';
      try {
        await deactivateBerbisnisUser(uid);
        showToast('✅ User di-deaktivasi', 'success');
        renderAdminPanel();
      } catch (err) {
        showToast(`❌ ${err.message}`, 'error');
        btn.disabled = false;
        btn.textContent = 'Deaktivasi';
      }
    };
  });
}

function setupAdminPanel(user) {
  if (!isBerbisnisAdmin(user)) return;
  // Show admin tab
  const tabBtn = document.getElementById('tab-btn-admin');
  if (tabBtn) tabBtn.hidden = false;

  // Re-render when admin tab clicked
  if (tabBtn) {
    tabBtn.addEventListener('click', () => {
      setTimeout(renderAdminPanel, 100);
    });
  }

  // Refresh button
  const btnRefresh = document.getElementById('btn-refresh-admin');
  if (btnRefresh) btnRefresh.onclick = () => renderAdminPanel();

  // Manual activation form
  const form = document.getElementById('form-activate');
  if (form) form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = (fd.get('email') || '').trim();
    const plan = fd.get('plan');
    const days = +fd.get('days') || 30;
    if (!email) return;
    try {
      const target = await findUserByEmail(email);
      if (!target) { showToast(`User ${email} tidak ditemukan`, 'error'); return; }
      await activateBerbisnisUser(target.uid, plan, days);
      showToast(`✅ ${email} aktif sebagai ${plan} (${days} hari)`, 'success');
      form.reset();
      renderAdminPanel();
    } catch (err) {
      showToast(`❌ ${err.message}`, 'error');
    }
  };
}
