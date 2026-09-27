// Corong penjualan BerUang: hitungan ANONIM berapa user baru mencapai tiap langkah
// (daftar → transaksi pertama → ... → bayar). Tidak ada Google Analytics / pihak ketiga.
//
// - POST /api/metric {event, source}  (butuh login; tiap user dihitung SEKALI per event)
//   Firestore metrics/day-YYYY-MM-DD  : { <event>: n, <event>__android: n, ... } (increment atomik)
//   Firestore metricsSeen/<sha256(uid:event)> : penanda dedupe, hanya berisi tanggal
// - GET /api/metrics?days=30  (hanya admin: custom claim admin) → total per event + per hari
import { requireUser, HttpError } from './auth.js';
import { firestoreAdmin } from './firebase-admin.js';

export const METRIC_EVENTS = [
  'signup',         // akun baru dibuat (uji coba gratis dimulai)
  'first_tx',       // transaksi pertama
  'tx5',            // sudah 5 transaksi (mulai jadi kebiasaan)
  'returned',       // buka app lagi di hari berbeda dari hari daftar
  'guide_done',     // 3 langkah panduan selesai
  'ai_open',        // membuka AI Akuntan
  'ai_locked',      // user uji coba menabrak paywall AI
  'ai_ask',         // pertanyaan AI pertama terjawab (paket berbayar)
  'paywall_view',   // melihat layar paket
  'checkout_click', // menekan salah satu paket
  'paid',           // paket berbayar aktif
  'review_prompt',  // diminta rating Play Store (Android)
];
const SOURCES = ['web', 'android'];

const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

export function wibDay(nowMs = Date.now()) {
  return new Date(nowMs + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function handleMetric(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const user = await requireUser(request, env);
    const body = await request.json().catch(() => ({}));
    const event = String(body.event || '');
    const source = SOURCES.includes(body.source) ? body.source : 'web';
    if (!METRIC_EVENTS.includes(event)) return json({ error: 'Event tidak dikenal.' }, 400);

    const db = firestoreAdmin(env);
    const day = wibDay();
    const marker = 'metricsSeen/' + (await sha256Hex(user.uid + ':' + event)).slice(0, 40);
    try {
      await db.commit([
        // Penanda hanya boleh dibuat sekali → user yang sama tidak dihitung dua kali.
        { update: { name: db.name(marker), fields: { day: { stringValue: day } } }, currentDocument: { exists: false } },
        { transform: { document: db.name('metrics/day-' + day), fieldTransforms: [
          { fieldPath: event, increment: { integerValue: '1' } },
          { fieldPath: event + '__' + source, increment: { integerValue: '1' } },
        ] } },
      ]);
    } catch (error) {
      // Penanda sudah ada = sudah pernah dihitung.
      if (error.code === 'FAILED_PRECONDITION' || error.code === 'ALREADY_EXISTS' || error.providerStatus === 409) {
        return json({ ok: true, counted: false });
      }
      throw error;
    }
    return json({ ok: true, counted: true });
  } catch (error) {
    return json({ error: error.message || 'Gagal mencatat.' }, error instanceof HttpError ? error.status : 500);
  }
}

export async function handleMetricsReport(request, env) {
  try {
    const user = await requireUser(request, env);
    if (user.claims?.admin !== true) return json({ error: 'Khusus admin.' }, 403);
    const url = new URL(request.url);
    const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30', 10) || 30, 1), 90);
    const db = firestoreAdmin(env);
    const now = Date.now();
    const dates = Array.from({ length: days }, (_, i) => wibDay(now - i * 86400000));
    const docs = await Promise.all(dates.map(d => db.get('metrics/day-' + d)));
    const totals = {}, bySource = { web: {}, android: {} }, daily = [];
    dates.forEach((date, i) => {
      const data = docs[i]?.data || {};
      const row = { date };
      for (const event of METRIC_EVENTS) {
        const n = Number(data[event]) || 0;
        row[event] = n;
        totals[event] = (totals[event] || 0) + n;
        for (const s of SOURCES) bySource[s][event] = (bySource[s][event] || 0) + (Number(data[event + '__' + s]) || 0);
      }
      daily.push(row);
    });
    return json({ days, events: METRIC_EVENTS, totals, bySource, daily });
  } catch (error) {
    return json({ error: error.message || 'Gagal membaca.' }, error instanceof HttpError ? error.status : 500);
  }
}
