import { HttpError } from './auth.js';
import { firestoreAdmin, documentId, isContention } from './firebase-admin.js';

export const PACKAGES = Object.freeze({
  trial: { amount: 10000, days: 7, label: 'Akses 7 Hari' },
  monthly: { amount: 50000, days: 30, label: 'Bulanan' },
  annual: { amount: 299000, days: 365, label: 'Tahunan' },
});

export function assertInvoiceMatches(record, event) {
  if (!record.invoiceId || event.id !== record.invoiceId || event.external_id !== record.externalId ||
      Number(event.amount) !== record.amount || event.currency !== 'IDR') {
    throw new HttpError(400, 'Invoice mismatch');
  }
}
// Receipt creation, profile extension and invoice status are one atomic commit.
// CAS on the profile prevents two different invoices losing an extension.
export async function applyPaidInvoice(env, externalId, event) {
  const db = firestoreAdmin(env);
  const ref = documentId(externalId);
  for (let attempt = 0; attempt < 5; attempt++) {
    const invoice = await db.get('payments/' + ref);
    if (!invoice) throw new HttpError(404, 'Invoice tidak ditemukan.');
    const record = invoice.data;
    assertInvoiceMatches(record, event);
    if (!['PAID', 'SETTLED'].includes(event.status)) throw new HttpError(400, 'Invoice belum dibayar.');
    const cfg = Object.hasOwn(PACKAGES, record.paket) && PACKAGES[record.paket];
    if (!cfg || cfg.amount !== record.amount) throw new HttpError(400, 'Paket invoice tidak valid.');
    const uid = documentId(record.uid);
    const deletion = await db.get('accountDeletions/' + uid);
    if (deletion) throw new HttpError(409, 'Akun sedang dihapus. Hubungi dukungan untuk pembayaran ini.');
    const receiptPath = `users/${uid}/verifiedPaymentReceipts/${ref}`;
    const receipt = await db.get(receiptPath);
    if (receipt) return { entitlementApplied: true, ...receipt.data };
    const profilePath = `users/${uid}/meta/profile`;
    const profile = await db.get(profilePath);
    if (!profile) throw new HttpError(409, 'Profil akun belum tersedia. Silakan login kembali.');
    const now = new Date();
    const previousExpiry = Date.parse(profile.data.expiresAt || '');
    const permanent = ['lifetime', 'pro'].includes(profile.data.plan);
    const update = { plan: permanent ? profile.data.plan : record.paket,
      expiresAt: permanent ? (profile.data.expiresAt || '2099-12-31T23:59:59.000Z')
        : new Date(Math.max(now.getTime(), Number.isFinite(previousExpiry) ? previousExpiry : 0) + cfg.days * 86400000).toISOString(),
      activatedAt: now.toISOString(), activatedBy: 'payment-server', lastPaymentRef: ref, lastPaymentPaket: record.paket };
    const applied = { uid, paket: record.paket, plan: update.plan, expiresAt: update.expiresAt,
      invoiceId: record.invoiceId, amount: record.amount, currency: 'IDR', appliedAt: now.toISOString() };
    try {
      await db.commit([
        db.write(profilePath, update, profile, true),
        db.write(receiptPath, applied, null),
        db.write('payments/' + ref, { status: 'paid', entitlementApplied: true,
          paidAt: typeof event.paid_at === 'string' ? event.paid_at : now.toISOString(),
          paymentMethod: typeof event.payment_method === 'string' ? event.payment_method : 'unknown', appliedAt: now.toISOString() }, invoice, true),
      ]);
      return { entitlementApplied: true, ...applied };
    } catch (error) { if (!isContention(error)) throw error; }
  }
  throw new HttpError(503, 'Aktivasi sedang diproses. Periksa kembali sebentar lagi.');
}

export async function markInvoiceExpired(env, externalId, event) {
  const db = firestoreAdmin(env), path = 'payments/' + documentId(externalId);
  for (let attempt = 0; attempt < 5; attempt++) {
    const invoice = await db.get(path);
    if (!invoice) throw new HttpError(404, 'Invoice tidak ditemukan.');
    assertInvoiceMatches(invoice.data, event);
    if (invoice.data.status === 'paid') return;
    try { await db.commit([db.write(path, { status: 'expired' }, invoice, true)]); return; }
    catch (error) { if (!isContention(error)) throw error; }
  }
  throw new HttpError(503, 'Status pembayaran sedang diperbarui.');
}
