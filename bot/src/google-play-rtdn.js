import { HttpError } from './auth.js';
import { decodeFields, firestoreAdmin } from './firebase-admin.js';
import { scopedServiceToken } from './service-token.js';
import { PLAY_SUBSCRIPTIONS, applyPlaySubscriptionEntitlement, hashPlayValue } from './google-play.js';

const jwksCache = { keys: null, expiresAt: 0 };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const decodeBase64Url = value => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')), c => c.charCodeAt(0));
};
const decodeJsonPart = value => JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));

async function verifyPubSubIdentity(request, env) {
  const audience = env.GOOGLE_PLAY_RTDN_AUDIENCE, expectedEmail = env.GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL;
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('Authorization') || '');
  if (!audience || !expectedEmail || !match) throw new HttpError(401, 'Notifikasi Google Play tidak terautentikasi.');
  const parts = match[1].split('.');
  if (parts.length !== 3) throw new HttpError(401, 'Token notifikasi tidak valid.');
  let header, claims;
  try { header = decodeJsonPart(parts[0]); claims = decodeJsonPart(parts[1]); }
  catch { throw new HttpError(401, 'Token notifikasi tidak valid.'); }
  if (header.alg !== 'RS256' || !header.kid || !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss)
      || !(claims.aud === audience || Array.isArray(claims.aud) && claims.aud.includes(audience))
      || claims.email !== expectedEmail || claims.email_verified !== true
      || !Number.isFinite(claims.exp) || claims.exp <= Date.now() / 1000
      || !Number.isFinite(claims.iat) || claims.iat > Date.now() / 1000 + 60 || claims.iat < Date.now() / 1000 - 3600) {
    throw new HttpError(401, 'Token notifikasi Google Play tidak cocok.');
  }
  if (!jwksCache.keys || jwksCache.expiresAt <= Date.now()) {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/certs', { signal: AbortSignal.timeout(10000) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(result.keys)) throw new HttpError(503, 'Kunci verifikasi Google sementara tidak tersedia.');
    jwksCache.keys = result.keys; jwksCache.expiresAt = Date.now() + 60 * 60 * 1000;
  }
  const jwk = jwksCache.keys.find(key => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) { jwksCache.expiresAt = 0; throw new HttpError(401, 'Kunci token Google tidak dikenal.'); }
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const signed = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decodeBase64Url(parts[2]), signed)) throw new HttpError(401, 'Tanda tangan token Google tidak sah.');
}

async function revokeExpiredSubscription(env, mapping, purchase, line) {
  const db = firestoreAdmin(env), uid = mapping.uid, receiptPath = `users/${uid}/verifiedPaymentReceipts/${mapping.receiptId}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const profilePath = `users/${uid}/meta/profile`, profile = await db.get(profilePath), receipt = await db.get(receiptPath);
    if (!profile || !receipt) throw new HttpError(503, 'Data langganan belum ditemukan; notifikasi akan dicoba ulang.');
    const now = new Date(), permanent = ['lifetime', 'pro'].includes(profile.data.plan);
    const ownsCurrentEntitlement = profile.data.lastPaymentRef === mapping.receiptId && profile.data.activatedBy === 'google-play-subscription';
    const providerExpiry = line?.expiryTime || receipt.data.providerExpiry || now.toISOString();
    const receiptUpdate = { ...receipt.data, subscriptionState: purchase.subscriptionState, autoRenewEnabled: line?.autoRenewingPlan?.autoRenewEnabled === true,
      providerExpiry, lifecycleUpdatedAt: now.toISOString() };
    const writes = [db.write(receiptPath, receiptUpdate, receipt, true)];
    if (ownsCurrentEntitlement && !permanent) writes.unshift(db.write(profilePath, {
      plan: 'pending', expiresAt: now.toISOString(), activatedAt: now.toISOString(), activatedBy: 'google-play-subscription-ended',
      lastPaymentRef: mapping.receiptId, lastPaymentPaket: receipt.data.paket,
    }, profile, true));
    try { await db.commit(writes); return { revoked: ownsCurrentEntitlement && !permanent, receiptId: mapping.receiptId }; }
    catch (error) { if (!['ABORTED', 'FAILED_PRECONDITION', 'ALREADY_EXISTS'].includes(error.code)) throw error; }
  }
  throw new HttpError(503, 'Pembaruan status langganan akan dicoba kembali.');
}

export async function handleGooglePlayRtdn(request, env) {
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    await verifyPubSubIdentity(request, env);
    const envelope = await request.json().catch(() => null), encoded = envelope?.message?.data;
    if (typeof encoded !== 'string' || !encoded) throw new HttpError(400, 'Pesan notifikasi kosong.');
    let event;
    try { event = JSON.parse(new TextDecoder().decode(decodeBase64Url(encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')))); }
    catch { throw new HttpError(400, 'Isi notifikasi tidak valid.'); }
    if (event.packageName !== 'id.berstock.beruang') throw new HttpError(400, 'Notifikasi bukan untuk aplikasi BerUang.');
    const notification = event.subscriptionNotification;
    if (!notification) return json({ ok: true, skipped: true });
    const purchaseToken = notification.purchaseToken;
    if (typeof purchaseToken !== 'string' || purchaseToken.length < 20 || purchaseToken.length > 2000) throw new HttpError(400, 'Token langganan tidak valid.');
    const tokenHash = await hashPlayValue(purchaseToken), db = firestoreAdmin(env);
    const mappingDoc = await db.get(`googlePlaySubscriptions/${tokenHash}`);
    if (!mappingDoc) throw new HttpError(503, 'Akun pembelian belum terhubung; Google Play akan mencoba ulang.');
    const mapping = mappingDoc.data, cfg = PLAY_SUBSCRIPTIONS[mapping.productId];
    if (!cfg) throw new HttpError(503, 'Produk langganan belum dikenali oleh backend.');
    const accessToken = await scopedServiceToken(env, 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', 'https://www.googleapis.com/auth/androidpublisher');
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/id.berstock.beruang/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15000) });
    const purchase = await response.json().catch(() => ({}));
    if (!response.ok) throw new HttpError(503, 'Status langganan dari Google Play belum bisa diperiksa.');
    const line = (purchase.lineItems || []).find(item => item.productId === mapping.productId && item.offerDetails?.basePlanId === cfg.basePlanId);
    const uidHash = await hashPlayValue(mapping.uid), accountId = purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId;
    if (accountId && accountId !== uidHash) throw new HttpError(409, 'Langganan tidak cocok dengan pemilik akun tersimpan.');
    const expiry = Date.parse(line?.expiryTime || '');
    const currentState = ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED'].includes(purchase.subscriptionState);
    if (line && currentState && Number.isFinite(expiry) && expiry > Date.now()) {
      const result = await applyPlaySubscriptionEntitlement(env, mapping.uid, mapping.productId, purchaseToken, purchase, line, cfg);
      return json({ ok: true, status: purchase.subscriptionState, expiresAt: result.expiresAt });
    }
    const result = await revokeExpiredSubscription(env, mapping, purchase, line);
    return json({ ok: true, status: purchase.subscriptionState, ...result });
  } catch (error) { return json({ error: error.message || 'Notifikasi tidak dapat diproses.' }, error.status || 500); }
}

export const _test = { verifyPubSubIdentity, revokeExpiredSubscription, jwksCache };
