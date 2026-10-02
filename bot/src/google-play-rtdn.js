import { HttpError } from './auth.js';
import { firestoreAdmin, isContention } from './firebase-admin.js';
import { scopedServiceToken } from './service-token.js';
import { PLAY_PRODUCTS, PLAY_SUBSCRIPTIONS, applyPlaySubscriptionEntitlement, combinedPlayEntitlement,
  hashPlayValue, playBase, subscriptionLedgerForProfile } from './google-play.js';

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
    const playControlled = ['google-play', 'google-play-subscription', 'google-play-subscription-ended',
      'google-play-voided', 'google-play-ended'].includes(profile.data.activatedBy);
    const providerExpiry = line?.expiryTime || receipt.data.providerExpiry || now.toISOString();
    const receiptUpdate = { ...receipt.data, subscriptionState: purchase.subscriptionState, autoRenewEnabled: line?.autoRenewingPlan?.autoRenewEnabled === true,
      providerExpiry, lifecycleUpdatedAt: now.toISOString() };
    const writes = [db.write(receiptPath, receiptUpdate, receipt, true)];
    const base = playBase(profile.data, now);
    const { ledger: oldSubscriptions, needsReview } = await subscriptionLedgerForProfile(db, uid, profile.data);
    const subscriptionLedger = { entries: [...oldSubscriptions.entries.filter(entry => entry.receiptId !== mapping.receiptId),
      { receiptId: mapping.receiptId, productId: mapping.productId, providerExpiry,
        activatedAt: profile.data.activatedAt || now.toISOString(), status: 'ended' }] };
    const entitlement = combinedPlayEntitlement(base, profile.data.oneTimePurchaseLedger, subscriptionLedger, now.getTime());
    const update = { playEntitlementBase: base, googlePlaySubscriptionLedger: subscriptionLedger,
      ...(playControlled && !permanent ? entitlement : {}),
      ...(needsReview || base.activatedBy === 'google-play-legacy' || !playControlled ? { billingReviewNeeded: true } : {}) };
    writes.unshift(db.write(profilePath, update, profile, true));
    try { await db.commit(writes); return { revoked: playControlled && !permanent && entitlement.plan === 'pending', receiptId: mapping.receiptId }; }
    catch (error) { if (!['ABORTED', 'FAILED_PRECONDITION', 'ALREADY_EXISTS'].includes(error.code)) throw error; }
  }
  throw new HttpError(503, 'Pembaruan status langganan akan dicoba kembali.');
}

async function revokeVoidedOneTimePurchase(env, notification) {
  // Google sends this notification for subscriptions too. Subscription state
  // remains governed by subscriptionsv2, not a single refunded renewal order.
  if (notification.productType !== 2) return { skipped: 'not-one-time' };
  const purchaseToken = notification.purchaseToken, orderId = notification.orderId;
  if (typeof purchaseToken !== 'string' || purchaseToken.length < 20 || purchaseToken.length > 2000
      || typeof orderId !== 'string' || !orderId || orderId.length > 200) {
    throw new HttpError(400, 'Referensi pembelian yang dibatalkan tidak valid.');
  }
  const tokenHash = await hashPlayValue(purchaseToken), db = firestoreAdmin(env);
  const mappingDoc = await db.get(`googlePlayOneTimePurchases/${tokenHash}`);
  // The purchase can be voided before the app has submitted its token. A retry
  // also covers a short Firestore propagation delay after verification.
  if (!mappingDoc) throw new HttpError(503, 'Akun pembelian belum terhubung; notifikasi akan dicoba ulang.');
  const mapping = mappingDoc.data;
  if (!PLAY_PRODUCTS[mapping.productId] || mapping.orderId !== orderId
      || mapping.receiptId !== `googleplay_${tokenHash}`) {
    throw new HttpError(409, 'Notifikasi tidak cocok dengan pembelian tersimpan.');
  }
  const receiptPath = `users/${mapping.uid}/verifiedPaymentReceipts/${mapping.receiptId}`;
  const receiptDoc = await db.get(receiptPath);
  if (!receiptDoc) {
    if (await db.get(`accountDeletions/${mapping.uid}`)) return { skipped: 'account-deleted' };
    throw new HttpError(503, 'Bukti pembelian belum tersedia; notifikasi akan dicoba ulang.');
  }
  if (receiptDoc.data.productId !== mapping.productId || receiptDoc.data.orderId !== orderId
      || receiptDoc.data.purchaseTokenHash && receiptDoc.data.purchaseTokenHash !== tokenHash) {
    throw new HttpError(409, 'Bukti pembelian tidak cocok dengan notifikasi.');
  }
  if (receiptDoc.data.status === 'voided') return { receiptId: mapping.receiptId, alreadyProcessed: true, revoked: false };

  const accessToken = await scopedServiceToken(env, 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', 'https://www.googleapis.com/auth/androidpublisher');
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/id.berstock.beruang/orders/${encodeURIComponent(orderId)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15000) });
  const order = await response.json().catch(() => ({}));
  if (!response.ok) throw new HttpError(503, 'Status refund dari Google Play belum bisa diperiksa.');
  if (order.orderId !== orderId || order.purchaseToken !== purchaseToken
      || !order.lineItems?.some(item => item.productId === mapping.productId && !item.subscriptionDetails)) {
    throw new HttpError(409, 'Pesanan Google Play tidak cocok dengan bukti pembelian.');
  }
  if (order.state === 'PARTIALLY_REFUNDED' && notification.refundType === 2) {
    return { receiptId: mapping.receiptId, skipped: 'partial-refund' };
  }
  if (!['REFUNDED', 'CANCELED'].includes(order.state)) {
    // RTDN may arrive before the Orders API reflects the refund. Do not infer
    // a full refund from the notification alone or a transient API response.
    throw new HttpError(503, 'Refund belum terkonfirmasi oleh Google Play.');
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const profilePath = `users/${mapping.uid}/meta/profile`;
    const profile = await db.get(profilePath), receipt = await db.get(receiptPath);
    if (!receipt || !profile) {
      if (await db.get(`accountDeletions/${mapping.uid}`)) return { skipped: 'account-deleted' };
      throw new HttpError(503, 'Data paket belum tersedia; notifikasi akan dicoba ulang.');
    }
    if (receipt.data.status === 'voided') return { receiptId: mapping.receiptId, alreadyProcessed: true, revoked: false };
    if (receipt.data.orderId !== orderId || receipt.data.productId !== mapping.productId) {
      throw new HttpError(409, 'Bukti pembelian berubah dan tidak cocok.');
    }
    const now = new Date(), ledger = profile.data.oneTimePurchaseLedger;
    const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
    const entryIndex = entries.findIndex(entry => entry.receiptId === mapping.receiptId);
    if (entryIndex >= 0 && (entries[entryIndex].productId !== mapping.productId || entries[entryIndex].status !== 'active')) {
      throw new HttpError(409, 'Riwayat pembelian tidak cocok dengan refund.');
    }
    const playControlled = ['google-play', 'google-play-subscription', 'google-play-subscription-ended',
      'google-play-voided', 'google-play-ended'].includes(profile.data.activatedBy)
      && !['lifetime', 'pro'].includes(profile.data.plan);
    const writes = [db.write(receiptPath, { status: 'voided', voidedAt: order.lastEventTime || now.toISOString(),
      orderState: order.state, lifecycleUpdatedAt: now.toISOString() }, receipt, true)];
    let adjusted = false, manualReview = false, effective = null;
    if (entryIndex >= 0) {
      const updatedLedger = { ...ledger, entries: entries.map((entry, index) =>
        index === entryIndex ? { ...entry, status: 'voided', voidedAt: now.toISOString() } : entry) };
      const base = playBase(profile.data, now);
      const { ledger: subscriptionLedger, needsReview } = await subscriptionLedgerForProfile(db, mapping.uid, profile.data);
      effective = playControlled ? combinedPlayEntitlement(base, updatedLedger, subscriptionLedger, now.getTime()) : null;
      manualReview = needsReview || base.activatedBy === 'google-play-legacy' || !playControlled;
      writes.unshift(db.write(profilePath, { ...(effective || {}), oneTimePurchaseLedger: updatedLedger,
        playEntitlementBase: base, googlePlaySubscriptionLedger: subscriptionLedger,
        ...(manualReview ? { billingReviewNeeded: true } : {}) }, profile, true));
      adjusted = !!effective;
    } else {
      // Older receipts have no per-order ledger. Guessing from lastPaymentRef can
      // revoke a second paid purchase or leave refunded days in a stacked pass.
      // Preserve access, flag the account for a manual entitlement review.
      manualReview = true;
      writes.unshift(db.write(profilePath, { billingReviewNeeded: true }, profile, true));
    }
    try {
      await db.commit(writes);
      if (manualReview) console.warn('Google Play refund requires legacy entitlement review', mapping.uid, mapping.receiptId);
      return { receiptId: mapping.receiptId, revoked: adjusted, restoredTrial: effective?.plan === 'free_trial', manualReview };
    } catch (error) { if (!isContention(error)) throw error; }
  }
  throw new HttpError(503, 'Pembaruan refund sedang diproses dan akan dicoba kembali.');
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
    if (event.voidedPurchaseNotification) {
      const result = await revokeVoidedOneTimePurchase(env, event.voidedPurchaseNotification);
      return json({ ok: true, ...result });
    }
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

export const _test = { verifyPubSubIdentity, revokeExpiredSubscription, revokeVoidedOneTimePurchase, jwksCache };
