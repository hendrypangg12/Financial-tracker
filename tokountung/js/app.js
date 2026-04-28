// Init & navigation
function init() {
  loadState();
  setupTabs();

  // BIND TOMBOL GLOBAL DULU — supaya kalau ada error di setup form,
  // tombol-tombol utama tetap berfungsi.
  bindGlobalButtons();

  // Setup form (wrapped supaya 1 error tidak block yang lain)
  safeRun('setupProductForm', () => setupProductForm());
  safeRun('setupCheckoutForm', () => setupCheckoutForm());
  safeRun('setupRestockForm', () => setupRestockForm());
  safeRun('setupSettingsForms', () => setupSettingsForms());
  if (typeof setupCloudSyncForm === 'function') {
    safeRun('setupCloudSyncForm', () => setupCloudSyncForm());
  }

  renderAll();
}

function safeRun(label, fn) {
  try { fn(); }
  catch (err) {
    console.error(`[init:${label}] error:`, err);
    if (typeof showToast === 'function') {
      showToast(`Init warning: ${label} gagal — fitur lain tetap jalan`, 'error');
    }
  }
}

function bindGlobalButtons() {
  const $ = (id) => document.getElementById(id);

  if ($('btn-add-product')) {
    $('btn-add-product').addEventListener('click', (e) => {
      e.preventDefault();
      try { openProductModal(null); }
      catch (err) {
        console.error('btn-add-product click error:', err);
        alert('Error: ' + (err.message || err));
      }
    });
  }
  if ($('stok-search')) $('stok-search').addEventListener('input', renderStok);
  if ($('stok-filter-kat')) $('stok-filter-kat').addEventListener('change', renderStok);

  if ($('pos-search')) $('pos-search').addEventListener('input', renderPOSProducts);
  if ($('cart-diskon')) $('cart-diskon').addEventListener('input', renderCart);
  if ($('btn-clear-cart')) $('btn-clear-cart').onclick = () => {
    if (state.cart.length && !confirm('Kosongkan keranjang?')) return;
    clearCart();
  };
  if ($('btn-checkout')) $('btn-checkout').onclick = openCheckoutModal;

  if ($('laporan-periode')) $('laporan-periode').addEventListener('change', renderLaporan);

  if ($('btn-export')) $('btn-export').onclick = exportData;
  if ($('btn-import')) $('btn-import').onclick = () => $('file-import').click();
  if ($('file-import')) $('file-import').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { await importData(f); renderAll(); showToast('Data berhasil diimpor', 'success'); }
    catch (err) { showToast('Gagal impor: ' + (err.message || 'file invalid'), 'error'); }
    e.target.value = '';
  };
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      // Re-render tab when switched (data may have changed)
      const t = btn.dataset.tab;
      if (t === 'dashboard') renderDashboard();
      if (t === 'stok') renderStok();
      if (t === 'jual') { renderPOSProducts(); renderCart(); }
      if (t === 'restock') renderRestock();
      if (t === 'laporan') renderLaporan();
      if (t === 'pengaturan') renderPengaturan();
    };
  });
}

function setupSettingsForms() {
  // Form Toko
  const formToko = document.getElementById('form-toko');
  formToko.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(formToko);
    state.settings = {
      ...state.settings,
      namaToko: fd.get('namaToko'),
      alamat: fd.get('alamat'),
      telepon: fd.get('telepon'),
      footerStruk: fd.get('footerStruk'),
    };
    saveState();
    showToast('Info toko disimpan', 'success');
  };
  // Form BEP
  const formBep = document.getElementById('form-bep');
  formBep.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(formBep);
    state.settings = {
      ...state.settings,
      biayaTetap: +fd.get('biayaTetap') || 0,
      targetUntung: +fd.get('targetUntung') || 0,
    };
    saveState();
    renderDashboard();
    showToast('Target & BEP disimpan', 'success');
  };
  // Form Kategori
  document.getElementById('form-add-kat').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const nama = (fd.get('nama') || '').trim();
    if (!nama) return;
    addKategori(nama);
    e.target.reset();
    renderPengaturan();
    showToast('Kategori ditambahkan', 'success');
  };
}

function renderPengaturan() {
  // Pre-fill form Toko (defensive)
  const ft = document.getElementById('form-toko');
  if (ft) {
    const setVal = (name, val) => { const el = ft.querySelector(`[name="${name}"]`); if (el) el.value = val; };
    setVal('namaToko', state.settings.namaToko || '');
    setVal('alamat', state.settings.alamat || '');
    setVal('telepon', state.settings.telepon || '');
    setVal('footerStruk', state.settings.footerStruk || '');
  }
  // Pre-fill form BEP
  const fb = document.getElementById('form-bep');
  if (fb) {
    const setVal = (name, val) => { const el = fb.querySelector(`[name="${name}"]`); if (el) el.value = val; };
    setVal('biayaTetap', state.settings.biayaTetap || 0);
    setVal('targetUntung', state.settings.targetUntung || 0);
  }
  // Render kategori list
  const kl = document.getElementById('kategori-list');
  if (kl) {
    kl.innerHTML = (state.kategori || []).map(k => `
      <span class="kat-pill">${escapeHtml(k)} <button data-del-kat="${escapeHtml(k)}" title="Hapus">×</button></span>
    `).join('');
    kl.querySelectorAll('[data-del-kat]').forEach(b => b.onclick = () => {
      if (confirm(`Hapus kategori "${b.dataset.delKat}"?`)) {
        deleteKategori(b.dataset.delKat);
        renderPengaturan();
      }
    });
  }
}

function renderAll() {
  renderDashboard();
  renderStok();
  renderPOSProducts();
  renderCart();
  renderRestock();
  renderLaporan();
  renderPengaturan();
}

// =============================================================================
// AUTH GATE — show login or app based on auth state
// =============================================================================

function hideAllScreens() {
  const ls = document.getElementById('login-screen');
  const pw = document.getElementById('paywall-screen');
  const am = document.getElementById('app-main');
  if (ls) ls.hidden = true;
  if (pw) pw.hidden = true;
  if (am) am.hidden = true;
}

function showLoginScreen() {
  hideAllScreens();
  const ls = document.getElementById('login-screen');
  if (ls) ls.hidden = false;
  if (typeof setupAuthUI === 'function') setupAuthUI();
}

function showPaywallScreen(user, profile) {
  hideAllScreens();
  const pw = document.getElementById('paywall-screen');
  if (pw) pw.hidden = false;

  const emailEl = document.getElementById('paywall-email');
  if (emailEl) emailEl.textContent = user.email || '';

  const titleEl = document.getElementById('paywall-title');
  if (titleEl) {
    titleEl.textContent = profile?.plan === 'expired'
      ? 'Langganan Habis — Perpanjang Sekarang'
      : 'Trial Habis — Pilih Paket Langganan';
  }

  // Bind paket selection → WA admin
  document.querySelectorAll('.btn-buy').forEach(btn => {
    btn.onclick = () => {
      const paket = btn.dataset.paket;
      if (typeof adminWhatsAppLink === 'function') {
        window.open(adminWhatsAppLink(paket), '_blank');
      }
    };
  });

  // WA admin button (umum)
  const btnWa = document.getElementById('btn-wa-admin');
  if (btnWa && typeof adminWhatsAppLink === 'function') {
    btnWa.href = adminWhatsAppLink();
  }

  // Logout dari paywall
  const btnPwLogout = document.getElementById('btn-paywall-logout');
  if (btnPwLogout) btnPwLogout.onclick = () => logout();
}

async function showApp(user, profile) {
  hideAllScreens();
  const am = document.getElementById('app-main');
  if (am) am.hidden = false;

  // Display user info di topbar
  const userInfoEl = document.getElementById('user-info');
  if (userInfoEl && user) {
    const days = (typeof daysRemainingBerbisnis === 'function') ? daysRemainingBerbisnis(profile) : 0;
    let planLabel;
    if (profile?.plan === 'trial') {
      planLabel = days <= 1 ? `⚠️ Trial ${days} hari` : `Trial (${days} hari)`;
    } else if (profile?.plan === 'starter') {
      planLabel = `Starter (${days} hari)`;
    } else if (profile?.plan === 'pro') {
      planLabel = `🔥 Pro (${days} hari)`;
    } else {
      planLabel = profile?.plan || 'Active';
    }
    userInfoEl.textContent = `${user.email} · ${planLabel}`;
    userInfoEl.title = `${user.email}\nPlan: ${profile?.plan || '-'}\nExpires: ${profile?.expiresAt || '-'}`;
  }

  // Bind logout button
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) btnLogout.onclick = () => {
    if (confirm('Yakin logout?')) logout();
  };

  // Setup admin panel kalau email Anda admin
  if (typeof setupAdminPanel === 'function') setupAdminPanel(user);

  // Sync data dari Firestore SEBELUM init() supaya data fresh
  if (typeof syncOnLogin === 'function') {
    try { await syncOnLogin(user); }
    catch (err) { console.warn('syncOnLogin failed:', err); }
  }

  // Init app (render dengan data yang sudah ter-sync)
  init();
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof onBerbisnisAuthStateChanged !== 'function' || typeof fbAuth === 'undefined' || !fbAuth) {
    // Firebase tidak load (offline / blocked) — fallback ke mode lama tanpa login
    console.warn('Firebase not loaded — running in offline mode');
    init();
    return;
  }

  // Handle return dari Google redirect (kalau ada)
  if (typeof handleGoogleRedirectResult === 'function') {
    handleGoogleRedirectResult();
  }

  // Debug overlay (cuma muncul kalau URL pakai ?debug=1)
  const debugMode = new URLSearchParams(location.search).has('debug');
  const debugBox = document.createElement('div');
  debugBox.id = 'debug-auth';
  debugBox.style.cssText = 'position:fixed;bottom:8px;left:8px;background:rgba(0,0,0,.85);color:#0f0;padding:6px 10px;font:11px monospace;z-index:9999;border-radius:6px;max-width:90vw;display:none';
  if (debugMode) document.body.appendChild(debugBox);
  function debug(msg) {
    if (!debugMode) return;
    const t = new Date().toLocaleTimeString();
    debugBox.style.display = 'block';
    debugBox.innerHTML = `[${t}] ${msg}<br>` + (debugBox.innerHTML || '');
    debugBox.innerHTML = debugBox.innerHTML.split('<br>').slice(0, 5).join('<br>');
  }
  window.debugAuth = debug;

  let lastAuthState = null;
  onBerbisnisAuthStateChanged((user, profile) => {
    const newState = user ? user.uid : null;
    debug(`Auth: ${user ? 'IN ' + user.email : 'OUT'} (was ${lastAuthState ? 'IN' : 'OUT'})`);
    console.log('[Auth] state:', user ? `logged in as ${user.email}` : 'logged out');
    lastAuthState = newState;
    if (user) {
      try {
        // Cek subscription — kalau expired/pending tampilkan paywall
        const isActive = (typeof isBerbisnisActive === 'function') ? isBerbisnisActive(profile) : true;
        const isAdmin = (typeof isBerbisnisAdmin === 'function') && isBerbisnisAdmin(user);
        if (!isActive && !isAdmin) {
          showPaywallScreen(user, profile);
        } else {
          showApp(user, profile);
        }
      } catch (err) {
        console.error('showApp error:', err);
        debug('showApp ERR: ' + err.message);
        alert('Error masuk app: ' + err.message);
      }
    } else {
      showLoginScreen();
    }
  });
});
