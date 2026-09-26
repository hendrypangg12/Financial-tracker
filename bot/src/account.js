import { requireUser, HttpError } from './auth.js';
import { adminToken, firestoreAdmin, documentId, isContention, decodeFields } from './firebase-admin.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

export function requireRecentLogin(user, env, now = Date.now()) {
  // accounts:lookup has already verified this exact token. Decoding here is
  // ONLY to inspect its verified authentication time, not to authenticate it.
  let claims;
  try { claims = JSON.parse(atob(user.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch {}
  if (claims?.aud !== env.FIREBASE_PROJECT_ID || claims?.iss !== `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}` ||
      claims?.sub !== user.uid || !Number.isFinite(claims.auth_time) || claims.auth_time * 1000 > now + 60000 || now - claims.auth_time * 1000 > 300000) {
    const error = new HttpError(401, 'Login ulang untuk menghapus akun.');
    error.code = 'auth/requires-recent-login'; throw error;
  }
}

async function hasSharedAccountData(db, uid) {
  const meta = await db.list(`users/${uid}/meta`);
  if (meta.nextPageToken || meta.documents.some(doc => !doc.name.endsWith('/meta/profile'))) return true;
  // Never erase shared authentication if an unrecognized product uses the UID.
  const collections = await db.request(db.name(`users/${uid}`) + ':listCollectionIds', {
    method: 'POST', body: JSON.stringify({ pageSize: 100 }),
  });
  if (collections.nextPageToken || (collections.collectionIds || []).some(id => !['meta', 'data', 'paymentReceipts', 'verifiedPaymentReceipts', 'apiUsage'].includes(id))) return true;
  const data = await db.list(`users/${uid}/data`);
  return !!(data.nextPageToken || data.documents.some(doc => !doc.name.endsWith('/data/main')));
}

export async function handleDeleteAccount(request, env, ctx) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const user = await requireUser(request, env);
    requireRecentLogin(user, env);
    let body;
    try { body = await request.json(); } catch { throw new HttpError(400, 'Invalid JSON'); }
    if (body?.confirmation !== 'HAPUS AKUN') throw new HttpError(400, 'Konfirmasi penghapusan diperlukan.');
    const db = firestoreAdmin(env), uid = documentId(user.uid), path = 'accountDeletions/' + uid;
    const existing = await db.get(path);
    const sharedAccountRetained = existing ? existing.data.sharedAccountRetained : await hasSharedAccountData(db, uid);
    if (!existing) {
      try { await db.commit([db.write(path, { status: 'pending', email: user.email,
        requestedAt: new Date().toISOString(), sharedAccountRetained }, null)]); }
      catch (error) { if (!isContention(error)) throw error; }
    }
    // Persist the job before acknowledging it. A disconnect or worker timeout
    // cannot lose the request; the scheduled handler retries pending work.
    ctx?.waitUntil(processAccountDeletion(env, uid).catch(() => {
      console.error('[account-delete] cleanup pending; scheduled retry required');
    }));
    return json({ ok: true, status: 'queued', sharedAccountRetained: !!sharedAccountRetained }, 202);
  } catch (error) {
    return json({ error: error instanceof HttpError ? error.message : 'Penghapusan belum dapat dimulai.', ...(error.code ? { code: error.code } : {}) }, error.status || 503);
  }
}

async function removeKVPrefix(kv, prefix) {
  const page = await kv.list({ prefix, limit: 200 });
  for (const key of page.keys) await kv.delete(key.name);
  return page.list_complete;
}

async function removeTelegramData(env, email) {
  if (!email) return true;
  const kv = env.BOT_DATA;
  // Remove both sides only when still bound to this email. A re-paired chat
  // belonging to another account must not be deleted by an old cleanup job.
  const map = await kv.get('btg_mail:' + email, 'json');
  if (map?.chatId) {
    const link = await kv.get('btg_chat:' + map.chatId, 'json');
    if (link?.email === email) await kv.delete('btg_chat:' + map.chatId);
  }
  for (const key of ['btg_mail:', 'btg_inbox:', 'btg_bills:']) await kv.delete(key + email);
  return removeKVPrefix(kv, 'btg_notif:' + email + ':');
}

export async function processAccountDeletion(env, userId) {
  const db = firestoreAdmin(env), uid = documentId(userId), jobPath = 'accountDeletions/' + uid;
  const job = await db.get(jobPath);
  if (!job || job.data.status === 'completed') return true;
  const email = job.data.email || '';
  for (const collection of ['paymentReceipts', 'verifiedPaymentReceipts', 'apiUsage']) {
    const page = await db.list(`users/${uid}/${collection}`);
    if (page.documents.length) await db.commit(page.documents.map(doc => ({ delete: doc.name })));
    if (page.nextPageToken) return false;
  }
  // Token-to-account links are server-only, but must also disappear with the account.
  const subscriptionRows = await db.request(db.name('').slice(0, -1) + ':runQuery', { method: 'POST', body: JSON.stringify({ structuredQuery: {
    from: [{ collectionId: 'googlePlaySubscriptions' }], where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } }, limit: 100,
  } }) });
  const subscriptionMappings = subscriptionRows.filter(row => row.document).map(row => row.document);
  if (subscriptionMappings.length) await db.commit(subscriptionMappings.map(doc => ({ delete: doc.name })));
  if (subscriptionMappings.length === 100) return false;
  for (const prefix of [`advise_log:${uid}:`, `advise_rate:${uid}:`, `goal_free:${uid}:`, `payment:beruang_${uid}_`,
    ...(email ? [`advise_log:${email}:`, `advise_rate:${email}:`, `goal_free:${email}:`] : [])]) {
    if (!await removeKVPrefix(env.BOT_DATA, prefix)) return false;
  }
  if (!await removeTelegramData(env, email)) return false;
  // Financial provider references are retained for reconciliation, while
  // contact details and account association are removed from the ledger.
  const rows = await db.request(db.name('').slice(0, -1) + ':runQuery', { method: 'POST', body: JSON.stringify({ structuredQuery: {
    from: [{ collectionId: 'payments' }], where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } }, limit: 100,
  } }) });
  const invoices = rows.filter(row => row.document).map(row => row.document);
  if (invoices.length) await db.commit(invoices.map(doc => ({ update: { name: doc.name, fields: {
    accountDeleted: { booleanValue: true }, accountDeletedAt: { stringValue: new Date().toISOString() },
  } }, updateMask: { fieldPaths: ['uid', 'email', 'accountDeleted', 'accountDeletedAt'] }, currentDocument: { updateTime: doc.updateTime } })));
  if (invoices.length === 100) return false;
  const sharedAccountRetained = await hasSharedAccountData(db, uid);
  await db.commit([{ delete: db.name(`users/${uid}/data/main`) }, { delete: db.name(`users/${uid}/meta/profile`) }]);
  if (!sharedAccountRetained) {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/accounts:delete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await adminToken(env) },
      body: JSON.stringify({ localId: uid }), signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok && result.error?.message !== 'USER_NOT_FOUND') throw new HttpError(503, 'Penghapusan identitas akun menunggu percobaan ulang.');
  }
  // Keep only the UID tombstone to stop stale clients and late payment events
  // from recreating a deleted BerUang profile. Drop the job's email.
  await db.commit([db.write(jobPath, { status: 'completed', sharedAccountRetained,
    completedAt: new Date().toISOString() }, undefined)]);
  return true;
}

export async function processAccountDeletions(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) return;
  const db = firestoreAdmin(env);
  const rows = await db.request(db.name('').slice(0, -1) + ':runQuery', { method: 'POST', body: JSON.stringify({ structuredQuery: {
    from: [{ collectionId: 'accountDeletions' }], where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'pending' } } }, limit: 10,
  } }) });
  for (const row of rows) {
    if (!row.document) continue;
    try { await processAccountDeletion(env, row.document.name.split('/').at(-1)); }
    catch { console.error('[account-delete] scheduled cleanup pending'); }
  }
}
