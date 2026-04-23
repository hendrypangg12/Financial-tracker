// Firestore sync: simpan seluruh state sebagai 1 dokumen per user untuk minimalkan biaya read/write
let cloudUnsubscribe = null;
let cloudPushTimer = null;
let cloudLoadedOnce = false;
let isApplyingRemote = false;

function userDataRef() {
  if (!fbDb || !currentUser) return null;
  return fbDb.collection('users').doc(currentUser.uid).collection('data').doc('main');
}

// Ambil state dari Firestore (sekali)
async function loadFromCloud() {
  const ref = userDataRef();
  if (!ref) return false;
  try {
    const snap = await ref.get();
    if (snap.exists) {
      const data = snap.data();
      if (Array.isArray(data.transactions)) state.transactions = data.transactions;
      if (data.categories) state.categories = data.categories;
      if (typeof data.target === 'number') state.target = data.target;
      cloudLoadedOnce = true;
      return true;
    }
    // Dokumen belum ada → buat dengan data lokal yang ada (migrasi)
    await pushToCloudImmediate();
    cloudLoadedOnce = true;
    return true;
  } catch (e) {
    console.warn('Gagal load dari cloud:', e);
    return false;
  }
}

// Listener real-time: data berubah di device lain → auto update di device ini
function startCloudListener(onRemoteChange) {
  stopCloudListener();
  const ref = userDataRef();
  if (!ref) return;
  cloudUnsubscribe = ref.onSnapshot((snap) => {
    if (!snap.exists) return;
    const data = snap.data();
    const updatedByThisDevice = data._updatedBy === getDeviceId();
    if (updatedByThisDevice) return; // Jangan update ulang dari perubahan sendiri
    isApplyingRemote = true;
    if (Array.isArray(data.transactions)) state.transactions = data.transactions;
    if (data.categories) state.categories = data.categories;
    if (typeof data.target === 'number') state.target = data.target;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({
      transactions: state.transactions,
      categories: state.categories,
      target: state.target,
    })); } catch(_){}
    isApplyingRemote = false;
    if (typeof onRemoteChange === 'function') onRemoteChange();
  }, (err) => console.warn('Listener error:', err));
}

function stopCloudListener() {
  if (cloudUnsubscribe) { cloudUnsubscribe(); cloudUnsubscribe = null; }
}

// Push ke cloud (debounced 1.5 detik supaya tidak spam write)
function pushToCloud() {
  if (!currentUser || isApplyingRemote) return;
  clearTimeout(cloudPushTimer);
  cloudPushTimer = setTimeout(() => pushToCloudImmediate().catch(()=>{}), 1500);
}

async function pushToCloudImmediate() {
  const ref = userDataRef();
  if (!ref) return;
  const payload = {
    transactions: state.transactions || [],
    categories: state.categories || {},
    target: state.target || 0,
    _updatedAt: new Date().toISOString(),
    _updatedBy: getDeviceId(),
  };
  try {
    await ref.set(payload, { merge: true });
    setSyncStatus('ok');
  } catch (e) {
    setSyncStatus('err');
    console.warn('Gagal sync ke cloud:', e);
  }
}

// ID device unik (untuk hindari echo sync)
function getDeviceId() {
  let id = localStorage.getItem('beruang-device-id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36);
    localStorage.setItem('beruang-device-id', id);
  }
  return id;
}

// Update badge status sync di UI
function setSyncStatus(status) {
  const el = document.getElementById('sync-status');
  if (!el) return;
  el.className = 'sync-status ' + status;
  el.textContent = status === 'ok' ? '☁️ Tersimpan' : status === 'syncing' ? '🔄 Sync…' : '⚠️ Offline';
  if (status === 'ok') {
    clearTimeout(setSyncStatus._t);
    setSyncStatus._t = setTimeout(() => { el.className = 'sync-status'; el.textContent = ''; }, 2500);
  }
}
