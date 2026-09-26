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
    if (mapping && mapping.data.uid !== uid) throw new HttpError(409, 'Token pembelian sudah terhubung ke akun lain.');
    const profilePath = `users/${uid}/meta/profile`, profile = await db.get(profilePath);
    if (!profile) throw new HttpError(409, 'Profil akun belum tersedia. Silakan login kembali.');
    const previousExpiry = Date.parse(profile.data.expiresAt || '');
    const permanent = ['lifetime', 'pro'].includes(profile.data.plan);
    const expiresAt = permanent ? (profile.data.expiresAt || '2099-12-31T23:59:59.000Z')
      : new Date(Math.max(providerExpiry.getTime(), Number.isFinite(previousExpiry) ? previousExpiry : 0)).toISOString();
    const update = { plan: permanent ? profile.data.plan : cfg.paket, expiresAt, activatedAt: now.toISOString(), activatedBy: 'google-play-subscription', lastPaymentRef: receiptId, lastPaymentPaket: cfg.paket };
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
  for (let attempt = 0; attempt < 5; attempt++) {
    if (await db.get('accountDeletions/' + uid)) throw new HttpError(409, 'Akun sedang dihapus. Hubungi dukungan untuk pembayaran ini.');
    const existing = await db.get(receiptPath); if (existing) return { alreadyApplied: true, receiptId, ...existing.data };
    const profilePath = `users/${uid}/meta/profile`, profile = await db.get(profilePath);
    if (!profile) throw new HttpError(409, 'Profil akun belum tersedia. Silakan login kembali.');
    const now = new Date(), old = Date.parse(profile.data.expiresAt || ''), permanent = ['lifetime','pro'].includes(profile.data.plan);
    const expiresAt = permanent ? (profile.data.expiresAt || '2099-12-31T23:59:59.000Z') : new Date(Math.max(now.getTime(), Number.isFinite(old) ? old : 0) + cfg.days * 86400000).toISOString();
    const update = { plan: permanent ? profile.data.plan : cfg.paket, expiresAt, activatedAt: now.toISOString(), activatedBy: 'google-play', lastPaymentRef: receiptId, lastPaymentPaket: cfg.paket };
    const receipt = { provider:'google-play', productId, orderId: purchase.orderId || '', paket:cfg.paket, expiresAt, appliedAt:now.toISOString() };
    try { await db.commit([db.write(profilePath, update, profile, true), db.write(receiptPath, receipt, null)]); return { receiptId, ...receipt }; }
    catch (error) { if (!isContention(error)) throw error; }
  }
  throw new HttpError(503, 'Aktivasi sedang diproses. Coba lagi sebentar.');
}
