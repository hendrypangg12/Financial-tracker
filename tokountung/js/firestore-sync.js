// Per-user Firestore data sync untuk BerBisnis
// Data disimpan di: users/{uid}/meta/berbisnis-data
// Auto-pull saat login, auto-push (debounced) saat saveState

let pushDebounceTimer = null;
let isPullingData = false;
let lastPushTime = 0;

async function pullDataFromFirestore(uid) {
  if (!fbDb || !uid) return null;
  const ref = fbDb.collection('users').doc(uid).collection('meta').doc('berbisnis-data');
  const snap = await ref.get();
  return snap.exists ? snap.data() : null;
}

async function pushDataToFirestore(uid, data) {
  if (!fbDb || !uid) return;
  const ref = fbDb.collection('users').doc(uid).collection('meta').doc('berbisnis-data');
  // Strip foto base64 supaya tidak lewat batas 1MB Firestore doc
  const compactProducts = (data.products || []).map(p => ({
    ...p,
    fotoUrl: p.fotoUrl && p.fotoUrl.length > 50000 ? '' : p.fotoUrl,
  }));
  await ref.set({
    products: compactProducts,
    sales: data.sales || [],
    restocks: data.restocks || [],
    kategori: data.kategori || [],
    settings: data.settings || {},
    updatedAt: new Date().toISOString(),
  });
  lastPushTime = Date.now();
}

function schedulePushToFirestore() {
  if (isPullingData) return;
  if (typeof currentUser === 'undefined' || !currentUser) return;
  if (typeof state === 'undefined') return;
  if (pushDebounceTimer) clearTimeout(pushDebounceTimer);
  pushDebounceTimer = setTimeout(async () => {
    try {
      await pushDataToFirestore(currentUser.uid, state);
      updateSyncIndicator('synced');
      console.log('[Firestore] Pushed at', new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('[Firestore] Push failed:', err);
      updateSyncIndicator('error');
    }
  }, 1500);
}

function updateSyncIndicator(status) {
  const el = document.getElementById('sync-indicator');
  if (!el) return;
  if (status === 'synced') {
    el.textContent = '✅ tersinkron';
    el.style.color = 'var(--green)';
    setTimeout(() => { el.textContent = ''; }, 3000);
  } else if (status === 'syncing') {
    el.textContent = '🔄 sync...';
    el.style.color = 'var(--accent)';
  } else if (status === 'error') {
    el.textContent = '⚠️ sync gagal';
    el.style.color = 'var(--danger)';
  }
}

async function syncOnLogin(user) {
  if (!user || !fbDb) return;
  isPullingData = true;
  updateSyncIndicator('syncing');
  try {
    const cloudData = await pullDataFromFirestore(user.uid);
    if (cloudData && Array.isArray(cloudData.products)) {
      // Cloud punya data → gunakan, override localStorage
      state.products = cloudData.products;
      state.sales = cloudData.sales || [];
      state.restocks = cloudData.restocks || [];
      if (Array.isArray(cloudData.kategori)) state.kategori = cloudData.kategori;
      state.settings = { ...state.settings, ...(cloudData.settings || {}) };
      saveStateLocalOnly();
      console.log('[Firestore] Pulled cloud data:', state.products.length, 'products');
      if (typeof showToast === 'function') {
        showToast(`☁️ Data ter-restore dari cloud (${state.products.length} produk)`, 'info');
      }
    } else {
      // No cloud data → migrate localStorage ke cloud
      const hasLocalData = (state.products && state.products.length > 0)
                       || (state.sales && state.sales.length > 0);
      if (hasLocalData) {
        await pushDataToFirestore(user.uid, state);
        console.log('[Firestore] Migrated localStorage ke cloud');
        if (typeof showToast === 'function') {
          showToast('☁️ Data lokal berhasil di-backup ke cloud', 'success');
        }
      }
    }
    updateSyncIndicator('synced');
  } catch (err) {
    console.error('[Firestore] syncOnLogin error:', err);
    updateSyncIndicator('error');
  } finally {
    isPullingData = false;
  }
}

// Helper supaya saveState tidak loop saat pull (override saveState versi original)
function saveStateLocalOnly() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      products: state.products,
      sales: state.sales,
      restocks: state.restocks,
      kategori: state.kategori,
      settings: state.settings,
    }));
  } catch (e) { console.warn('saveStateLocalOnly failed:', e); }
}
