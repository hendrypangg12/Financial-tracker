import { requireUser, HttpError } from './auth.js';
import { firestoreAdmin, documentId, isContention } from './firebase-admin.js';
import { scopedServiceToken } from './service-token.js';

export const PLAY_PRODUCTS = Object.freeze({
  beruang_access_7d: { paket: 'trial', days: 7 },
  // Legacy one-time products remain verifiable for existing Play customers.
  beruang_access_30d: { paket: 'monthly', days: 30 },
  beruang_access_365d: { paket: 'annual', days: 365 },
});
export const PLAY_SUBSCRIPTIONS = Object.freeze({
  beruang_monthly_subscription: { paket: 'monthly', days: 30, basePlanId: 'monthly-30d' },
  beruang_annual_subscription: { paket: 'annual', days: 365, basePlanId: 'annual-365d' },
});
const DAY_MS = 86400000;

const profileSnapshot = profile => ({
  plan: profile.plan || 'pending', expiresAt: profile.expiresAt || '',
  activatedAt: profile.activatedAt || '', activatedBy: profile.activatedBy || '',
  lastPaymentRef: profile.lastPaymentRef || '', lastPaymentPaket: profile.lastPaymentPaket || '',
});

// Keep the non-Play baseline separate from both Play purchase types. A
// subscription's provider expiry must never inherit refundable one-time days.
export function playBase(profile, now) {
  if (profile.playEntitlementBase) return profile.playEntitlementBase;
  if (profile.oneTimePurchaseLedger?.base) return profile.oneTimePurchaseLedger.base;
  if (profile.activatedBy === 'google-play-subscription' || profile.activatedBy === 'google-play-subscription-ended') {
    return { plan: 'pending', expiresAt: now.toISOString(), activatedAt: now.toISOString(),
      activatedBy: 'account-bootstrap', lastPaymentRef: '', lastPaymentPaket: '' };
  }
  // Older one-time purchases have no order ledger. Preserve their paid time,
  // but make the uncertainty visible for a manual billing audit.
  return { ...profileSnapshot(profile),
    ...(profile.activatedBy === 'google-play' ? { activatedBy: 'google-play-legacy' } : {}) };
}

export async function subscriptionLedgerForProfile(db, uid, profile) {
  if (Array.isArray(profile.googlePlaySubscriptionLedger?.entries)) {
    return { ledger: profile.googlePlaySubscriptionLedger, needsReview: false };
  }
  const ledger = { entries: [] };
  if (profile.activatedBy !== 'google-play-subscription' || !profile.lastPaymentRef) {
    return { ledger, needsReview: false };
  }
  const receipt = await db.get(`users/${uid}/verifiedPaymentReceipts/${profile.lastPaymentRef}`);
  const data = receipt?.data;
  if (!PLAY_SUBSCRIPTIONS[data?.productId] || !Number.isFinite(Date.parse(data.providerExpiry || ''))) {
    // A legacy profile may predate a complete subscription receipt. Keep its
    // existing expiry until Google sends an authoritative update; flag it so
    // support can verify the provenance instead of silently shortening access.
    const fallbackId = Object.keys(PLAY_SUBSCRIPTIONS).find(id => PLAY_SUBSCRIPTIONS[id].paket === profile.lastPaymentPaket);
    if (fallbackId && Number.isFinite(Date.parse(profile.expiresAt || ''))) {
      ledger.entries.push({ receiptId: profile.lastPaymentRef, productId: fallbackId,
        providerExpiry: profile.expiresAt, activatedAt: profile.activatedAt || new Date().toISOString(), status: 'active' });
    }
    return { ledger, needsReview: true };
  }
  ledger.entries.push({ receiptId: profile.lastPaymentRef, productId: data.productId,
    providerExpiry: data.providerExpiry, activatedAt: profile.activatedAt || new Date().toISOString(), status: 'active' });
  return { ledger, needsReview: false };
}

export function combinedPlayEntitlement(base, oneTimeLedger, subscriptionLedger, nowMs = Date.now()) {
  if (!base) throw new HttpError(503, 'Dasar paket belum tersedia.');
  const candidates = [];
  const add = candidate => {
    if (!candidate) return;
    if (['lifetime', 'pro'].includes(candidate.plan) || Date.parse(candidate.expiresAt || '') > nowMs) candidates.push(candidate);
  };
  add(base);
  if (oneTimeLedger) add(oneTimeLedgerEntitlement(oneTimeLedger, nowMs));
  for (const entry of subscriptionLedger?.entries || []) {
    const cfg = PLAY_SUBSCRIPTIONS[entry.productId];
    if (!cfg || !entry.receiptId || !['active', 'ended'].includes(entry.status)) {
      throw new HttpError(503, 'Riwayat langganan perlu diperiksa.');
    }
    if (entry.status === 'active') add({ plan: cfg.paket, expiresAt: entry.providerExpiry,
      activatedAt: entry.activatedAt || new Date(nowMs).toISOString(), activatedBy: 'google-play-subscription',
      lastPaymentRef: entry.receiptId, lastPaymentPaket: cfg.paket });
  }
  const permanent = candidates.find(candidate => ['lifetime', 'pro'].includes(candidate.plan));
  if (permanent) return permanent;
  candidates.sort((a, b) => Date.parse(b.expiresAt) - Date.parse(a.expiresAt));
  return candidates[0] || { plan: 'pending', expiresAt: new Date(nowMs).toISOString(),
    activatedAt: new Date(nowMs).toISOString(), activatedBy: 'google-play-ended',
    lastPaymentRef: '', lastPaymentPaket: '' };
}

// This ledger records the paid time contributed by each one-time Play order.
// Replaying it after a refund preserves other paid orders without retaining
// the refunded order's days. It lives in the server-owned profile document so
// a profile update and its receipt remain one optimistic Firestore commit.
export function oneTimeLedgerEntitlement(ledger, nowMs = Date.now()) {
  if (!ledger?.base || !Array.isArray(ledger.entries)) throw new HttpError(503, 'Riwayat pembelian belum tersedia.');
  let expiry = Date.parse(ledger.base.expiresAt || ''), latest = null;
  for (const entry of ledger.entries) {
    const cfg = PLAY_PRODUCTS[entry.productId], appliedAt = Date.parse(entry.appliedAt || '');
    if (!cfg || !Number.isFinite(appliedAt) || !entry.receiptId || !['active', 'voided'].includes(entry.status)) {
      throw new HttpError(503, 'Riwayat pembelian perlu diperiksa.');
    }
    if (entry.status === 'voided') continue;
    expiry = Math.max(appliedAt, Number.isFinite(expiry) ? expiry : 0) + cfg.days * DAY_MS;
    latest = { ...entry, cfg };
  }
  if (latest) return { plan: latest.cfg.paket, expiresAt: new Date(expiry).toISOString(),
    activatedAt: latest.appliedAt, activatedBy: 'google-play', lastPaymentRef: latest.receiptId,
    lastPaymentPaket: latest.cfg.paket };
  const base = ledger.base, permanent = ['lifetime', 'pro'].includes(base.plan);
  if (permanent || Number.isFinite(expiry) && expiry > nowMs) return {
    plan: base.plan, expiresAt: base.expiresAt, activatedAt: base.activatedAt || new Date(nowMs).toISOString(),
    activatedBy: base.activatedBy || 'account-bootstrap', lastPaymentRef: base.lastPaymentRef || '',
    lastPaymentPaket: base.lastPaymentPaket || '',
  };
  return { plan: 'pending', expiresAt: new Date(nowMs).toISOString(), activatedAt: new Date(nowMs).toISOString(),
    activatedBy: 'google-play-voided', lastPaymentRef: '', lastPaymentPaket: '' };
}

function oneTimeLedgerForPurchase(profile, base, receiptId, productId, now) {
  const existing = profile.oneTimePurchaseLedger;
  const ledger = Array.isArray(existing?.entries) ? existing : { base, entries: [] };
  return { base: ledger.base, entries: [...ledger.entries, { receiptId, productId, appliedAt: now.toISOString(), status: 'active' }] };
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*' } });
export const hashPlayValue = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
  .map(v => v.toString(16).padStart(2, '0')).join('');

// Diagnostik konfigurasi tanpa membocorkan rahasia: hanya boolean + domain email service account.
export function handleGooglePlayHealth(env) {
  const raw = env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  let account = null; try { account = JSON.parse(raw || ''); } catch {}
  const email = typeof account?.client_email === 'string' ? account.client_email : '';
  return json({
    present: typeof raw === 'string' && raw.length > 0,
    length: typeof raw === 'string' ? raw.length : 0,
    parses: !!account,
    hasClientEmail: !!email,
    hasPrivateKey: typeof account?.private_key === 'string' && account.private_key.includes('PRIVATE KEY'),
    projectMatches: account?.project_id === env.FIREBASE_PROJECT_ID,
    emailDomain: email.includes('@') ? email.split('@')[1] : null,
  });
}

export async function handleGooglePlayVerify(request, env) {
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    const user = await requireUser(request, env), body = await request.json().catch(() => ({}));
    const productId = documentId(body.productId), token = typeof body.purchaseToken === 'string' ? body.purchaseToken : '';
    const cfg = PLAY_PRODUCTS[productId] || PLAY_SUBSCRIPTIONS[productId]; if (!cfg || token.length < 20 || token.length > 2000) throw new HttpError(400, 'Pembelian tidak valid.');
    const accessToken = await scopedServiceToken(env, 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', 'https://www.googleapis.com/auth/androidpublisher');
    const subscription = !!PLAY_SUBSCRIPTIONS[productId];
    const base = subscription
      ? `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/id.berstock.beruang/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`
      : `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/id.berstock.beruang/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}`;
    const provider = await fetch(base, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15000) });
    const purchase = await provider.json().catch(() => ({}));
    const expectedAccount = await hashPlayValue(user.uid);
    if (!provider.ok) throw new HttpError(provider.status === 404 ? 400 : 503, 'Pembayaran belum dapat diverifikasi.');
    if (subscription) {
      const line = (purchase.lineItems || []).find(item => item.productId === productId && item.offerDetails?.basePlanId === cfg.basePlanId);
      const accountId = purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId;
      const expiry = Date.parse(line?.expiryTime || '');
      const entitledState = ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED'].includes(purchase.subscriptionState);
      if (!line || line.offerDetails?.basePlanId !== cfg.basePlanId || !Number.isFinite(expiry) || expiry <= Date.now() || !entitledState) throw new HttpError(402, 'Langganan belum aktif atau sudah berakhir.');
      if (accountId !== expectedAccount) throw new HttpError(409, 'Pembelian tidak cocok dengan akun BerUang ini.');
      const result = await applyPlaySubscriptionEntitlement(env, user.uid, productId, token, purchase, line, cfg);
      if (purchase.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING') {
        const ackUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/id.berstock.beruang/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:acknowledge`;
        try {
          const ack = await fetch(ackUrl, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(15000) });
          if (!ack.ok) console.error('Play subscription activated but acknowledgement failed', ack.status, result.receiptId);
        } catch (error) { console.error('Play subscription activated but acknowledgement could not be attempted', result.receiptId, error.message); }
      }
      return json({ ok: true, entitlementApplied: true, paket: cfg.paket, expiresAt: result.expiresAt, autoRenewing: line.autoRenewingPlan?.autoRenewEnabled === true });
    }
    if (purchase.purchaseState !== 0) throw new HttpError(402, 'Pembayaran belum selesai.');
    if (purchase.obfuscatedExternalAccountId !== expectedAccount) throw new HttpError(409, 'Pembelian tidak cocok dengan akun BerUang ini.');
    const result = await applyPlayEntitlement(env, user.uid, productId, token, purchase, cfg);
    // A transient consume failure must be recoverable. Even when entitlement was
    // already applied, a later verification retries consumption so the customer
    // can buy the same duration again after the current access ends.
    if (purchase.consumptionState !== 1) {
      const consumed = await fetch(base + ':consume', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15000) });
      if (!consumed.ok) console.error('Play purchase granted but consume failed', consumed.status, result.receiptId);
    }
    return json({ ok: true, entitlementApplied: true, paket: cfg.paket, expiresAt: result.expiresAt });
  } catch (error) { return json({ error: error.message || 'Aktivasi gagal.' }, error.status || 500); }
}

export async function applyPlaySubscriptionEntitlement(env, uidValue, productId, purchaseToken, purchase, line, cfg = PLAY_SUBSCRIPTIONS[productId]) {
  const db = firestoreAdmin(env), uid = documentId(uidValue), tokenHash = await hashPlayValue(purchaseToken);
  const receiptId = documentId('googleplay_sub_' + tokenHash), receiptPath = `users/${uid}/verifiedPaymentReceipts/${receiptId}`;
  const mappingPath = `googlePlaySubscriptions/${tokenHash}`;
  const providerExpiry = new Date(line.expiryTime), now = new Date();
  if (!cfg || !Number.isFinite(providerExpiry.getTime()) || providerExpiry <= now) throw new HttpError(402, 'Langganan sudah berakhir.');
  for (let attempt = 0; attempt < 5; attempt++) {
    if (await db.get('accountDeletions/' + uid)) throw new HttpError(409, 'Akun sedang dihapus. Hubungi dukungan untuk pembayaran ini.');
    const mapping = await db.get(mappingPath);
    if (mapping && (mapping.data.uid !== uid || mapping.data.productId !== productId || mapping.data.receiptId !== receiptId)) {
      throw new HttpError(409, 'Token langganan sudah terhubung ke pembelian lain.');
    }
    const profilePath = `users/${uid}/meta/profile`, profile = await db.get(profilePath);
    if (!profile) throw new HttpError(409, 'Profil akun belum tersedia. Silakan login kembali.');
    const base = playBase(profile.data, now);
    const { ledger: oldSubscriptions, needsReview } = await subscriptionLedgerForProfile(db, uid, profile.data);
    const subscriptionLedger = { entries: [...oldSubscriptions.entries.filter(entry => entry.receiptId !== receiptId),
      { receiptId, productId, providerExpiry: providerExpiry.toISOString(), activatedAt: now.toISOString(), status: 'active' }] };
    const entitlement = combinedPlayEntitlement(base, profile.data.oneTimePurchaseLedger, subscriptionLedger, now.getTime());
    const expiresAt = entitlement.expiresAt;
    const update = { ...entitlement, playEntitlementBase: base, googlePlaySubscriptionLedger: subscriptionLedger,
      ...(needsReview || base.activatedBy === 'google-play-legacy' ? { billingReviewNeeded: true } : {}) };
    const receiptPathExisting = await db.get(receiptPath);
    const receipt = { provider: 'google-play', billingType: 'subscription', productId, orderId: purchase.latestOrderId || '', paket: cfg.paket,
      purchaseTokenHash: tokenHash, subscriptionState: purchase.subscriptionState, autoRenewEnabled: line.autoRenewingPlan?.autoRenewEnabled === true,
      providerExpiry: providerExpiry.toISOString(), expiresAt, updatedAt: now.toISOString() };
    const mappingValue = { uid, productId, receiptId, updatedAt: now.toISOString() };
    try {
      await db.commit([db.write(profilePath, update, profile, true), db.write(receiptPath, receipt, receiptPathExisting, !receiptPathExisting),
        db.write(mappingPath, mappingValue, mapping, !mapping)]);
      return { receiptId, ...receipt };
    } catch (error) { if (!isContention(error)) throw error; }
  }
  throw new HttpError(503, 'Sinkronisasi langganan sedang diproses. Coba lagi sebentar.');
}

export async function applyPlayEntitlement(env, uidValue, productId, purchaseToken, purchase, cfg = PLAY_PRODUCTS[productId]) {
  const db = firestoreAdmin(env), uid = documentId(uidValue), tokenHash = await hashPlayValue(purchaseToken);
  const receiptId = documentId('googleplay_' + tokenHash), receiptPath = `users/${uid}/verifiedPaymentReceipts/${receiptId}`;
  const mappingPath = `googlePlayOneTimePurchases/${tokenHash}`, orderId = documentId(purchase.orderId);
  if (!cfg) throw new HttpError(400, 'Produk pembelian tidak dikenal.');
  for (let attempt = 0; attempt < 5; attempt++) {
    if (await db.get('accountDeletions/' + uid)) throw new HttpError(409, 'Akun sedang dihapus. Hubungi dukungan untuk pembayaran ini.');
    const mapping = await db.get(mappingPath), existing = await db.get(receiptPath);
    if (mapping && (mapping.data.uid !== uid || mapping.data.productId !== productId || mapping.data.orderId !== orderId)) {
      throw new HttpError(409, 'Token pembelian sudah terhubung ke pembelian lain.');
    }
    if (existing) {
      if (existing.data.productId !== productId || existing.data.orderId !== orderId) throw new HttpError(409, 'Bukti pembelian tidak cocok.');
      if (existing.data.status === 'voided') throw new HttpError(402, 'Pembelian ini sudah dikembalikan atau dibatalkan.');
      if (mapping) return { alreadyApplied: true, receiptId, ...existing.data };
      // Backfill the token link for a previously verified receipt. The receipt
      // and link remain tied to the same Google order; no extra days are added.
      try {
        await db.commit([db.write(mappingPath, { uid, productId, orderId, receiptId, updatedAt: new Date().toISOString() }, null),
          db.write(receiptPath, { purchaseTokenHash: tokenHash }, existing, true)]);
        return { alreadyApplied: true, receiptId, ...existing.data };
      } catch (error) { if (!isContention(error)) throw error; continue; }
    }
    if (mapping) throw new HttpError(503, 'Bukti pembelian belum ditemukan; akses tidak ditambah ulang.');
    const profilePath = `users/${uid}/meta/profile`, profile = await db.get(profilePath);
    if (!profile) throw new HttpError(409, 'Profil akun belum tersedia. Silakan login kembali.');
    const now = new Date(), base = playBase(profile.data, now);
    const { ledger: subscriptionLedger, needsReview } = await subscriptionLedgerForProfile(db, uid, profile.data);
    const ledger = oneTimeLedgerForPurchase(profile.data, base, receiptId, productId, now);
    const effective = combinedPlayEntitlement(base, ledger, subscriptionLedger, now.getTime());
    const expiresAt = effective.expiresAt;
    const update = { ...effective, oneTimePurchaseLedger: ledger, playEntitlementBase: base,
      googlePlaySubscriptionLedger: subscriptionLedger,
      ...(needsReview || base.activatedBy === 'google-play-legacy' ? { billingReviewNeeded: true } : {}) };
    const receipt = { provider:'google-play', billingType:'one-time', productId, orderId, purchaseTokenHash:tokenHash,
      paket:cfg.paket, status:'active', expiresAt, appliedAt:now.toISOString(),
      previousPlan:profile.data.plan || 'pending', previousExpiresAt:profile.data.expiresAt || '' };
    const mappingValue = { uid, productId, orderId, receiptId, updatedAt: now.toISOString() };
    try { await db.commit([db.write(profilePath, update, profile, true), db.write(receiptPath, receipt, null),
      db.write(mappingPath, mappingValue, null)]); return { receiptId, ...receipt }; }
    catch (error) { if (!isContention(error)) throw error; }
  }
  throw new HttpError(503, 'Aktivasi sedang diproses. Coba lagi sebentar.');
}
