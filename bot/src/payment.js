import { requireUser, HttpError } from './auth.js';
import { firestoreAdmin, documentId, isContention } from './firebase-admin.js';
import { PACKAGES, applyPaidInvoice, assertInvoiceMatches, markInvoiceExpired } from './entitlements.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
const failure = error => json({ error: error instanceof HttpError ? error.message : 'Layanan pembayaran sedang tidak tersedia.' }, error.status || 503);

async function provider(env, path, body) {
  if (!env.XENDIT_SECRET_KEY) throw new HttpError(503, 'Pembayaran belum tersedia.');
  const response = await fetch('https://api.xendit.co/v2/invoices' + path, {
    method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + btoa(env.XENDIT_SECRET_KEY + ':') },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new HttpError(502, 'Penyedia pembayaran sedang tidak tersedia.');
  return data;
}

// Historical KV status is untrusted. Only a provider lookup can grant access.
async function getInvoice(env, ref) {
  const db = firestoreAdmin(env), path = 'payments/' + documentId(ref);
  const doc = await db.get(path);
  if (doc) return doc;
  const raw = await env.BOT_DATA.get('payment:' + ref);
  if (!raw) return null;
  let old;
  try { old = JSON.parse(raw); } catch { return null; }
  if (!old.uid || !old.invoiceId || old.externalId !== ref || !Object.hasOwn(PACKAGES, old.paket) || old.amount !== PACKAGES[old.paket].amount) return null;
  const migrated = { uid: old.uid, email: old.email || '', paket: old.paket, amount: old.amount,
    invoiceId: old.invoiceId, externalId: ref, status: 'pending', createdAt: old.createdAt || new Date().toISOString(), migratedFromKV: true };
  try { await db.commit([db.write(path, migrated, null)]); }
  catch (error) { if (!isContention(error)) throw error; }
  return db.get(path);
}

export async function handleCreateInvoice(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const user = await requireUser(request, env);
    let body;
    try { body = await request.json(); } catch { throw new HttpError(400, 'Invalid JSON'); }
    const { product, paket, amount, externalId, successUrl, failureUrl } = body || {};
    if (product !== 'beruang' || !user.email || !Object.hasOwn(PACKAGES, paket || '')) throw new HttpError(400, 'Paket atau akun tidak valid.');
    const cfg = PACKAGES[paket];
    documentId(externalId);
    if (!externalId.startsWith(`beruang_${user.uid}_`) || Number(amount) !== cfg.amount) throw new HttpError(400, 'Referensi atau jumlah tidak valid.');
    for (const value of [successUrl, failureUrl]) {
      let redirect;
      try { redirect = new URL(value); } catch {}
      if (redirect?.origin !== 'https://berstock.id' || redirect.pathname !== '/app.html') throw new HttpError(400, 'Invalid redirect URL');
    }
    // Reserve durably before charging so missing storage cannot strand a buyer.
    if (!env.XENDIT_SECRET_KEY || !env.XENDIT_WEBHOOK_TOKEN) throw new HttpError(503, 'Pembayaran belum tersedia.');
    const db = firestoreAdmin(env), uid = documentId(user.uid);
    if (await db.get('accountDeletions/' + uid)) throw new HttpError(409, 'Akun sedang dihapus.');
    if (!await db.get(`users/${uid}/meta/profile`)) throw new HttpError(409, 'Profil akun belum tersedia.');
    if (await env.BOT_DATA.get('payment:' + externalId)) throw new HttpError(409, 'Referensi sudah digunakan.');
    const path = 'payments/' + externalId;
    try { await db.commit([db.write(path, { uid, email: user.email, paket, amount: cfg.amount,
      externalId, status: 'creating', createdAt: new Date().toISOString() }, null)]); }
    catch (error) { if (isContention(error)) throw new HttpError(409, 'Referensi sudah digunakan.'); throw error; }
    const data = await provider(env, '', { external_id: externalId, amount: cfg.amount, payer_email: user.email,
      description: `BerUang Pro — ${cfg.label}`, success_redirect_url: successUrl, failure_redirect_url: failureUrl,
      invoice_duration: 86400, currency: 'IDR', items: [{ name: `BerUang Pro · ${cfg.label}`, quantity: 1, price: cfg.amount, category: 'Digital' }] });
    if (!data.id || !data.invoice_url || data.external_id !== externalId || Number(data.amount) !== cfg.amount || data.currency !== 'IDR') {
      throw new HttpError(502, 'Respons penyedia pembayaran tidak sesuai.');
    }
    const reserved = await db.get(path);
    await db.commit([db.write(path, { invoiceId: data.id, invoiceUrl: data.invoice_url, status: 'pending' }, reserved, true)]);
    return json({ ok: true, checkoutUrl: data.invoice_url, invoiceId: data.id, externalId });
  } catch (error) { return failure(error); }
}

export async function handleVerifyPayment(request, env) {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  try {
    const user = await requireUser(request, env);
    const ref = documentId(new URL(request.url).searchParams.get('ref'));
    const invoice = await getInvoice(env, ref);
    if (!invoice) throw new HttpError(404, 'Invoice tidak ditemukan.');
    const record = invoice.data;
    if (record.uid !== user.uid) throw new HttpError(403, 'Invoice bukan milik akun ini.');
    let applied;
    if (record.status === 'paid' && record.entitlementApplied === true) {
      const receipt = await firestoreAdmin(env).get(`users/${documentId(user.uid)}/verifiedPaymentReceipts/${ref}`);
      if (receipt) applied = { entitlementApplied: true, ...receipt.data };
    }
    // Polling recovers a missed webhook; the browser never grants entitlement.
    if (!applied && record.invoiceId) {
      const event = await provider(env, '/' + encodeURIComponent(record.invoiceId));
      assertInvoiceMatches(record, event);
      if (['PAID', 'SETTLED'].includes(event.status)) applied = await applyPaidInvoice(env, ref, event);
      else if (event.status === 'EXPIRED') { await markInvoiceExpired(env, ref, event); record.status = 'expired'; }
    }
    return json({ status: applied ? 'paid' : record.status, paket: record.paket, uid: record.uid,
      entitlementApplied: !!applied, ...(applied ? { plan: applied.plan, expiresAt: applied.expiresAt } : {}) });
  } catch (error) { return failure(error); }
}

export async function handleXenditWebhook(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!env.XENDIT_WEBHOOK_TOKEN) return json({ error: 'Webhook belum dikonfigurasi.' }, 503);
  if (request.headers.get('x-callback-token') !== env.XENDIT_WEBHOOK_TOKEN) return json({ error: 'Unauthorized' }, 401);
  try {
    let event;
    try { event = await request.json(); } catch { throw new HttpError(400, 'Invalid JSON'); }
    const ref = documentId(event?.external_id);
    if (!ref.startsWith('beruang_')) return json({ ok: true, skipped: 'other_product' });
    const invoice = await getInvoice(env, ref);
    // Returning 503 asks the provider to retry a creation/storage failure.
    if (!invoice || !invoice.data.invoiceId) throw new HttpError(503, 'Invoice belum dapat diproses.');
    assertInvoiceMatches(invoice.data, event);
    if (['PAID', 'SETTLED'].includes(event.status)) {
      const applied = await applyPaidInvoice(env, ref, event);
      return json({ ok: true, entitlementApplied: applied.entitlementApplied });
    }
    if (event.status === 'EXPIRED') await markInvoiceExpired(env, ref, event);
    return json({ ok: true, processed: event.status });
  } catch (error) { return failure(error); }
}
