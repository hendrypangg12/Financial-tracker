// Optimistic concurrency: an old device must never overwrite a newer cloud document.
let cloudUnsubscribe = null, cloudPushTimer = null, autoSyncInterval = null;
let cloudLoadedOnce = false, isApplyingRemote = false, cloudConflict = false;
let cloudBase = null, cloudOwner = null, cloudWrite = null;
let pendingCloudSnapshot = null;
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
// Three-way merge: independent records can sync together; competing edits to the
// same record require the user's choice. Never guess which financial value wins.
function mergeSyncData(base, local, remote) {
  const b = syncData(base), l = syncData(local), r = syncData(remote);
  const conflicts = [], data = {};
  const equal = (a, z) => stableJSON(a) === stableJSON(z);
  const choose = (before, ours, theirs, key) => {
    if (equal(ours, theirs) || equal(theirs, before)) return ours;
    if (equal(ours, before)) return theirs;
    conflicts.push(key); return ours;
  };
  for (const key of SYNC_FIELDS) {
    if (!['transactions', 'hutangs', 'assets', 'recurring', 'goals'].includes(key) ||
        equal(l[key], r[key]) || equal(l[key], b[key]) || equal(r[key], b[key])) {
      data[key] = choose(b[key], l[key], r[key], key); continue;
    }
    const arrays = [b[key], l[key], r[key]];
    const valid = arrays.every(items => Array.isArray(items) &&
      items.every(item => item && typeof item.id === 'string' && item.id.length > 0) &&
      new Set(items.map(item => item.id)).size === items.length);
    if (!valid) { conflicts.push(key); data[key] = l[key]; continue; }
    const [bm, lm, rm] = arrays.map(items => new Map(items.map(item => [item.id, item])));
    // Remote order is stable; new local records are appended exactly once.
    const ids = new Set([...rm.keys(), ...lm.keys(), ...bm.keys()]);
    data[key] = [];
    for (const id of ids) {
      const item = choose(bm.get(id), lm.get(id), rm.get(id), key + ':' + id);
      if (item !== undefined) data[key].push(item);
    }
  }
  return { data: JSON.parse(JSON.stringify(data)), conflicts };
}
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
function acceptRemoteSnapshot(remote, onRemoteChange) {
  if (!remote) { if (cloudBase) preserveConflict(); return false; }
  const merged = cloudBase ? mergeSyncData(cloudBase, state, remote) : { data: remote, conflicts: [] };
  if (merged.conflicts.length) { preserveConflict(); return false; }
  isApplyingRemote = true;
  try {
    Object.assign(state, merged.data);
    localStorage.setItem(storageKey(), JSON.stringify(syncData(state)));
    saveSyncBase(remote);
  } finally { isApplyingRemote = false; }
  if (typeof onRemoteChange === 'function') onRemoteChange();
  if (!sameSyncData(state, remote)) pushToCloud(); else setSyncStatus('ok');
  return true;
}
async function loadFromCloud() {
  clearTimeout(cloudPushTimer);
  cloudLoadedOnce = false; cloudConflict = false; cloudBase = null; pendingCloudSnapshot = null;
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
        if (!acceptRemoteSnapshot(remote)) return false;
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
    if (currentUser?.uid !== owner || snap.metadata?.fromCache || snap.metadata?.hasPendingWrites || cloudConflict || !cloudLoadedOnce) return;
    const remote = snap.exists ? syncData(snap.data()) : null;
    if (cloudWrite) { pendingCloudSnapshot = { owner, ref, onRemoteChange }; return; }
    acceptRemoteSnapshot(remote, onRemoteChange);
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
  let committed = payload;
  if (base && sameSyncData(payload, base)) return true;
  cloudWrite = (async () => {
    try {
      await fbDb.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (currentUser?.uid !== owner) throw new Error('Account changed');
        const remote = snap.exists ? syncData(snap.data()) : null;
        if ((!base && remote && !sameSyncData(payload, remote)) || (base && !remote)) throw new Error('SYNC_CONFLICT');
        const merged = base && remote ? mergeSyncData(base, payload, remote) : { data: payload, conflicts: [] };
        if (merged.conflicts.length) throw new Error('SYNC_CONFLICT');
        committed = merged.data;
        tx.set(ref, { ...committed, _updatedAt: new Date().toISOString(), _updatedBy: getDeviceId() }, { merge: true });
      });
      if (currentUser?.uid !== owner) return false;
      // Preserve edits made while the transaction was in flight.
      const latest = mergeSyncData(payload, state, committed);
      saveSyncBase(committed);
      if (latest.conflicts.length) { preserveConflict(); return false; }
      Object.assign(state, latest.data);
      localStorage.setItem(storageKey(), JSON.stringify(syncData(state)));
      if (typeof renderAll === 'function') renderAll();
      setSyncStatus(sameSyncData(state, committed) ? 'ok' : 'pending'); return true;
    } catch (e) {
      if (currentUser?.uid === owner) { if (e.message === 'SYNC_CONFLICT') preserveConflict(); else setSyncStatus('err'); }
      console.warn('Gagal sync:', e); return false;
    } finally {
      cloudWrite = null;
      const queued = pendingCloudSnapshot; pendingCloudSnapshot = null;
      // A queued event may predate our commit. Read again instead of replaying a
      // stale snapshot that could make this device appear to lose new records.
      if (queued && queued.owner === currentUser?.uid && !cloudConflict) {
        queued.ref.get({ source: 'server' }).then(snap => {
          if (queued.owner !== currentUser?.uid || cloudConflict) return;
          if (cloudWrite) { pendingCloudSnapshot = queued; return; }
          acceptRemoteSnapshot(snap.exists ? syncData(snap.data()) : null, queued.onRemoteChange);
        }).catch(() => setSyncStatus('err'));
      }
    }
  })();
  const ok = await cloudWrite;
  if (ok && currentUser?.uid === owner && !sameSyncData(state, cloudBase)) pushToCloud();
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
  el.textContent = status === 'ok' ? '☁️ Tersimpan' : status === 'pending' ? '☁️ Menyimpan perubahan…' : status === 'conflict' ? '⚠️ Data berbeda — ketuk untuk pulihkan' : '⚠️ Belum tersimpan di cloud';
  el.onclick = status === 'conflict' ? recoverCloudConflict : null;
  updateAccountSyncState(status);
  if (status === 'ok') setSyncStatus._t = setTimeout(() => { el.className = 'sync-status'; el.textContent = ''; }, 2500);
}

function updateAccountSyncState(status) {
  const detail = document.getElementById('user-sync-state');
  if (!detail) return;
  const key = 'beruang-last-sync:' + (currentUser?.uid || 'local');
  if (status === 'ok') localStorage.setItem(key, new Date().toISOString());
  const last = localStorage.getItem(key);
  const time = last ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(last)) : '';
  detail.className = 'user-sync-state ' + status;
  detail.textContent = status === 'ok'
    ? `Data tersinkron${time ? ` · ${time}` : ''}`
    : status === 'pending' ? 'Menyimpan perubahan…'
    : status === 'conflict' ? 'Perlu memilih versi data'
    : 'Belum tersimpan di cloud';
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
