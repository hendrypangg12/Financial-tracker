import { requireUser, HttpError } from './auth.js';
import { firestoreAdmin, documentId, isContention } from './firebase-admin.js';
import { scopedServiceToken } from './service-token.js';

export const PLAY_PRODUCTS = Object.freeze({
  beruang_access_7d: { paket: 'trial', days: 7 },
  beruang_access_30d: { paket: 'monthly', days: 30 },
  beruang_access_365d: { paket: 'annual', days: 365 },
});

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*' } });
const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
  .map(v => v.toString(16).padStart(2, '0')).join('');

export async function handleGooglePlayVerify(request, env) {
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    const user = await requireUser(request, env), body = await request.json().catch(() => ({}));
    const productId = documentId(body.productId), token = typeof body.purchaseToken === 'string' ? body.purchaseToken : '';
    const cfg = PLAY_PRODUCTS[productId]; if (!cfg || token.length < 20 || token.length > 2000) throw new HttpError(400, 'Pembelian tidak valid.');
    const accessToken = await scopedServiceToken(env, 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', 'https://www.googleapis.com/auth/androidpublisher');
    const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/id.berstock.beruang/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}`;
    const provider = await fetch(base, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15000) });
    const purchase = await provider.json().catch(() => ({}));
    if (!provider.ok || purchase.purchaseState !== 0) throw new HttpError(provider.status === 404 ? 400 : 503, 'Pembayaran belum dapat diverifikasi.');
    const expectedAccount = await digest(user.uid);
    if (purchase.obfuscatedExternalAccountId !== expectedAccount) throw new HttpError(409, 'Pembelian tidak cocok dengan akun BerUang ini.');
    const result = await applyPlayEntitlement(env, user.uid, productId, token, purchase, cfg);
    if (!result.alreadyApplied && purchase.consumptionState !== 1) {
      const consumed = await fetch(base + ':consume', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15000) });
      if (!consumed.ok) console.error('Play purchase granted but consume failed', consumed.status, result.receiptId);
    }
    return json({ ok: true, entitlementApplied: true, paket: cfg.paket, expiresAt: result.expiresAt });
  } catch (error) { return json({ error: error.message || 'Aktivasi gagal.' }, error.status || 500); }
}

export async function applyPlayEntitlement(env, uidValue, productId, purchaseToken, purchase, cfg = PLAY_PRODUCTS[productId]) {
  const db = firestoreAdmin(env), uid = documentId(uidValue), tokenHash = await digest(purchaseToken);
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
