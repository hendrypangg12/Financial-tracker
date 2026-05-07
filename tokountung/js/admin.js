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

// Set fitur ON/OFF untuk user tertentu (per-tenant feature flag)
async function setUserFeature(uid, flagName, enabled) {
  if (!fbDb) throw new Error('Firestore belum siap');
  const ref = fbDb.collection('users').doc(uid).collection('meta').doc('berbisnis-profile');
  // Defensive: ambil profile dulu, fallback kalau features-nya kosong
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const features = data.features || defaultFeatures();
  features[flagName] = !!enabled;
  await ref.update({
    features,
    featuresUpdatedAt: new Date().toISOString(),
    featuresUpdatedBy: currentUser?.email || 'admin',
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
    tbody.innerHTML = '<tr><td colspan="7" class="empty">Belum ada user</td></tr>';
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
      : u.plan === 'bulanan' || u.plan === 'starter' ? `<span style="color:#10b981">Bulanan</span>`
      : u.plan === 'tahunan' || u.plan === 'pro' ? `<span style="color:#c9a352">Tahunan</span>`
      : `<span style="color:var(--danger)">Expired</span>`;
    const expiresStr = u.expiresAt ? new Date(u.expiresAt).toLocaleDateString('id-ID') : '-';
    const daysStr = active ? `${days} hari lagi` : 'Habis';
    const createdStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-';
    const wa = (u.whatsapp || '').replace(/\D/g, '');
    const fullName = u.fullName || u.bizName || u.email?.split('@')[0] || 'bos';
    const waCell = wa ? `<a href="https://wa.me/${wa.startsWith('0') ? '62' + wa.slice(1) : wa}?text=${encodeURIComponent(`Halo bos ${fullName}! 👋\n\nSaya Hendry dari Berstock 🐻\n\nMau cek progress trial bos di aplikasi. Ada yang bisa dibantu?`)}" target="_blank" rel="noopener" style="color:#25d366; font-weight:700">📱 ${wa}</a>` : '<span style="color:#94a3b8">-</span>';
    // Build feature flags toggle (collapsible)
    const userFeatures = u.features || defaultFeatures();
    const featuresHtml = Object.entries(FEATURE_DEFINITIONS).map(([key, def]) => {
      const enabled = userFeatures[key] === true;
      return `
        <label class="feat-toggle" style="display:inline-flex; align-items:center; gap:6px; padding:5px 10px; background:${enabled ? '#fef3c7' : '#f1f5f9'}; border:1px solid ${enabled ? '#d4af37' : '#e2e8f0'}; border-radius:8px; font-size:12px; cursor:pointer; margin:3px;">
          <input type="checkbox" ${enabled ? 'checked' : ''} data-feat-uid="${u.uid}" data-feat-key="${key}" style="margin:0">
          <span>${def.icon} ${def.label}</span>
        </label>`;
    }).join('');

    return `
      <tr>
        <td><b>${escapeHtml(u.email || '-')}</b><br><small style="color:#64748b">${escapeHtml(u.fullName || '')}</small></td>
        <td>${waCell}</td>
        <td>${escapeHtml(u.bizName || '-')}</td>
        <td>${planBadge} <small>(${daysStr})</small></td>
        <td>${expiresStr}</td>
        <td>${createdStr}</td>
        <td>
          <button class="btn btn-small" data-act-uid="${u.uid}" data-plan="bulanan">+ Bulanan</button>
          <button class="btn btn-small btn-gold" data-act-uid="${u.uid}" data-plan="tahunan">+ Tahunan</button>
          <button class="btn btn-small btn-danger" data-deact-uid="${u.uid}">Deaktivasi</button>
          <button class="btn btn-small" data-toggle-feat="${u.uid}" style="background:#0a1628; color:#fff;">⚙️ Fitur</button>
        </td>
      </tr>
      <tr class="feat-row" id="feat-row-${u.uid}" style="display:none">
        <td colspan="7" style="background:#f8fafc; padding:14px 18px; border-top:1px dashed #cbd5e1;">
          <div style="font-size:11px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">⚙️ Custom Feature Flags untuk ${escapeHtml(u.email || u.bizName || 'klien ini')}</div>
          <div>${featuresHtml}</div>
          <div style="font-size:10px; color:#94a3b8; margin-top:8px;">💡 Toggle ON untuk aktifkan fitur custom buat klien ini. Klien perlu refresh app setelah toggle.</div>
        </td>
      </tr>
    `;
  }).join('');

  // Bind activation buttons
  tbody.querySelectorAll('[data-act-uid]').forEach(btn => {
    btn.onclick = async () => {
      const uid = btn.dataset.actUid;
      const plan = btn.dataset.plan;
      const planLabel = plan === 'tahunan' ? 'Tahunan Rp 5jt (365 hari)' : 'Bulanan Rp 500rb (30 hari)';
      const days = plan === 'tahunan' ? 365 : 30;
      if (!confirm(`Aktivasi ${planLabel}?`)) return;
      btn.disabled = true; btn.textContent = '...';
      try {
        await activateBerbisnisUser(uid, plan, days);
        showToast(`✅ User aktif sebagai ${plan} (${days} hari)`, 'success');
        renderAdminPanel();
      } catch (err) {
        showToast(`❌ ${err.message}`, 'error');
        btn.disabled = false;
        btn.textContent = plan === 'tahunan' ? '+ Tahunan' : '+ Bulanan';
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

  // Bind toggle feature row (expand/collapse)
  tbody.querySelectorAll('[data-toggle-feat]').forEach(btn => {
    btn.onclick = () => {
      const uid = btn.dataset.toggleFeat;
      const row = document.getElementById(`feat-row-${uid}`);
      if (row) row.style.display = row.style.display === 'none' ? '' : 'none';
    };
  });

  // Bind feature flag checkboxes — toggle ON/OFF
  tbody.querySelectorAll('input[data-feat-uid]').forEach(cb => {
    cb.onchange = async () => {
      const uid = cb.dataset.featUid;
      const flagKey = cb.dataset.featKey;
      const enabled = cb.checked;
      cb.disabled = true;
      try {
        await setUserFeature(uid, flagKey, enabled);
        showToast(`✅ Fitur "${FEATURE_DEFINITIONS[flagKey]?.label}" ${enabled ? 'AKTIF' : 'NON-AKTIF'} untuk klien`, 'success');
        // Update visual style of label
        const label = cb.closest('.feat-toggle');
        if (label) {
          label.style.background = enabled ? '#fef3c7' : '#f1f5f9';
          label.style.borderColor = enabled ? '#d4af37' : '#e2e8f0';
        }
      } catch (err) {
        showToast(`❌ ${err.message}`, 'error');
        cb.checked = !enabled; // revert
      } finally {
        cb.disabled = false;
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
