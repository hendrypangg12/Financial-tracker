// Optimistic concurrency: an old device must never overwrite a newer cloud document.
let cloudUnsubscribe = null, cloudPushTimer = null, autoSyncInterval = null;
let cloudLoadedOnce = false, isApplyingRemote = false, cloudConflict = false;
let cloudBase = null, cloudOwner = null, cloudWrite = null;
const SYNC_FIELDS = ['transactions', 'hutangs', 'assets', 'recurring', 'goals', 'userName', 'categories', 'target'];
function syncData(data) {
  return Object.fromEntries(SYNC_FIELDS.map(k => [k, data[k] ?? (k === 'userName' ? '' : k === 'target' ? 0 : k === 'categories' ? {} : [])]));
}
function stableJSON(v) {
  if (Array.isArray(v)) return '[' + v.map(stableJSON).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stableJSON(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function sameSyncData(a, b) { return stableJSON(syncData(a)) === stableJSON(syncData(b)); }
function userDataRef() { return fbDb && currentUser ? fbDb.collection('users').doc(currentUser.uid).collection('data').doc('main') : null; }
function saveSyncBase(data) {
  cloudBase = JSON.parse(JSON.stringify(syncData(data)));
  localStorage.setItem('beruang-sync-base:' + cloudOwner, JSON.stringify(cloudBase));
}
function applyCloud(data) {
  isApplyingRemote = true;
  try {
    Object.assign(state, syncData(data));
    localStorage.setItem(storageKey(), JSON.stringify(syncData(state)));
    saveSyncBase(data);
  } finally { isApplyingRemote = false; }
}
function preserveConflict() {
  const key = 'beruang-sync-conflict:' + cloudOwner;
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(syncData(state)));
  cloudConflict = true;
  setSyncStatus('conflict');
}
async function loadFromCloud() {
  clearTimeout(cloudPushTimer);
  cloudLoadedOnce = false; cloudConflict = false; cloudBase = null;
  cloudOwner = currentUser?.uid || null;
  const owner = cloudOwner, ref = userDataRef();
  if (!ref) return false;
  try {
    const saved = localStorage.getItem('beruang-sync-base:' + owner);
    if (saved) cloudBase = syncData(JSON.parse(saved));
    const snap = await ref.get({ source: 'server' });
    if (currentUser?.uid !== owner) return false;
    const remote = snap.exists ? syncData(snap.data()) : null;
    cloudLoadedOnce = true;
    if (remote) {
      if (cloudBase && !sameSyncData(state, cloudBase)) {
        if (!sameSyncData(remote, cloudBase) && !sameSyncData(state, remote)) { preserveConflict(); return false; }
        saveSyncBase(remote);
        if (!sameSyncData(state, remote)) return await pushToCloudImmediate();
      }
      if (!cloudBase && !sameSyncData(state, remote)) localStorage.setItem('beruang-sync-legacy-backup:' + owner, JSON.stringify(syncData(state)));
      applyCloud(remote); setSyncStatus('ok'); return true;
    }
    if (cloudBase) { preserveConflict(); return false; }
    return await pushToCloudImmediate();
  } catch (e) { cloudLoadedOnce = false; setSyncStatus('err'); console.warn('Gagal load cloud:', e); return false; }
}
function startCloudListener(onRemoteChange) {
  stopCloudListener();
  const ref = userDataRef(), owner = currentUser?.uid;
  if (!ref) return;
  cloudUnsubscribe = ref.onSnapshot({ includeMetadataChanges: true }, snap => {
    if (currentUser?.uid !== owner || snap.metadata?.fromCache || snap.metadata?.hasPendingWrites || cloudConflict || cloudWrite || !cloudLoadedOnce) return;
    if (!snap.exists) { if (cloudBase) preserveConflict(); return; }
    const remote = syncData(snap.data());
    if (cloudBase && !sameSyncData(state, cloudBase)) {
      if (!sameSyncData(remote, cloudBase) && !sameSyncData(state, remote)) preserveConflict();
      return;
    }
    applyCloud(remote);
    if (typeof onRemoteChange === 'function') onRemoteChange();
  }, e => { setSyncStatus('err'); console.warn('Listener error:', e); });
}
function stopCloudListener() { if (cloudUnsubscribe) cloudUnsubscribe(); cloudUnsubscribe = null; }
function pushToCloud() {
  if (!currentUser || isApplyingRemote) return;
  clearTimeout(cloudPushTimer);
  cloudPushTimer = setTimeout(() => pushToCloudImmediate(), 1500);
}
async function pushToCloudImmediate() {
  if (!cloudLoadedOnce || cloudConflict || cloudOwner !== currentUser?.uid) return false;
  if (cloudWrite) return cloudWrite;
  const ref = userDataRef(), owner = cloudOwner, base = cloudBase;
  if (!ref) return false;
  const payload = JSON.parse(JSON.stringify(syncData(state)));
  if (base && sameSyncData(payload, base)) return true;
  cloudWrite = (async () => {
    try {
      await fbDb.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (currentUser?.uid !== owner) throw new Error('Account changed');
        const remote = snap.exists ? syncData(snap.data()) : null;
        if ((!base && remote) || (base && (!remote || !sameSyncData(remote, base)))) throw new Error('SYNC_CONFLICT');
        tx.set(ref, { ...payload, _updatedAt: new Date().toISOString(), _updatedBy: getDeviceId() }, { merge: true });
      });
      if (currentUser?.uid !== owner) return false;
      saveSyncBase(payload); setSyncStatus('ok'); return true;
    } catch (e) {
      if (currentUser?.uid === owner) { if (e.message === 'SYNC_CONFLICT') preserveConflict(); else setSyncStatus('err'); }
      console.warn('Gagal sync:', e); return false;
    } finally { cloudWrite = null; }
  })();
  const ok = await cloudWrite;
  if (ok && currentUser?.uid === owner && !sameSyncData(state, payload)) pushToCloud();
  return ok;
}
function getDeviceId() {
  let id = localStorage.getItem('beruang-device-id');
  if (!id) { id = 'dev_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36); localStorage.setItem('beruang-device-id', id); }
  return id;
}
function setSyncStatus(status) {
  const el = document.getElementById('sync-status'); if (!el) return;
  clearTimeout(setSyncStatus._t); el.className = 'sync-status ' + status;
  el.textContent = status === 'ok' ? '☁️ Tersimpan' : status === 'conflict' ? '⚠️ Data berbeda — ketuk untuk pulihkan' : '⚠️ Belum tersimpan di cloud';
  el.onclick = status === 'conflict' ? recoverCloudConflict : null;
  if (status === 'ok') setSyncStatus._t = setTimeout(() => { el.className = 'sync-status'; el.textContent = ''; }, 2500);
}
async function recoverCloudConflict() {
  if (!cloudConflict || !currentUser) return;
  const owner = currentUser.uid;
  try {
    const snap = await userDataRef().get({ source: 'server' });
    if (currentUser?.uid !== owner) return;
    const remote = snap.exists ? syncData(snap.data()) : null;
    const backup = { local: syncData(state), cloud: remote, savedAt: new Date().toISOString() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'beruang-pemulihan-' + Date.now() + '.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    if (remote && confirm('Simpan file backup kedua versi terlebih dahulu. Muat versi cloud sekarang? Perubahan lokal tetap ada di backup.')) {
      applyCloud(remote); cloudConflict = false; setSyncStatus('ok');
      localStorage.removeItem('beruang-sync-conflict:' + owner);
      if (typeof renderAll === 'function') renderAll();
    }
  } catch (e) { console.warn('Pemulihan perlu koneksi:', e); }
}
function startAutoSync() {
  stopAutoSync(); autoSyncInterval = setInterval(() => {
    if (currentUser && !isApplyingRemote) { if (!cloudLoadedOnce) loadFromCloud(); else pushToCloudImmediate(); }
  }, 5 * 60 * 1000);
}
function stopAutoSync() { clearInterval(autoSyncInterval); clearTimeout(cloudPushTimer); autoSyncInterval = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && currentUser && !isApplyingRemote) pushToCloudImmediate(); });
window.addEventListener('beforeunload', () => { if (currentUser && !isApplyingRemote) pushToCloudImmediate(); });
