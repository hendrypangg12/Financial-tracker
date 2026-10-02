// "Laporan Beruang" — laporan mingguan proaktif via Telegram untuk user BerUang berbayar.
// Cron: Minggu 20:00 WIB (13:00 UTC). Data dibaca dari Firestore (users/{uid}/data/main) memakai
// service account, jadi tidak perlu push data tambahan dari aplikasi.
// Ringkasan angka dihitung deterministik di sini; AI hanya menulis 1 paragraf insight.
// Kalau AI gagal (kredit habis, timeout), laporan angka tetap terkirim — user tidak dapat pesan kosong.
// OPT-IN (keputusan bos 27 Sep, jaga saldo AI): laporan otomatis hanya untuk user yang ketik /laporan on.

import Anthropic from "@anthropic-ai/sdk";
import { sendMessage } from "./telegram.js";
import { firestoreAdmin } from "./firebase-admin.js";
import { resolveLinkUid, hasPaidAIAccess } from "./beruang.js";

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 350;
const TTL_SENT = 60 * 60 * 24 * 14;   // dedupe per minggu, 14 hari
const TTL_MANUAL = 60 * 60 * 24;      // /laporan manual: 1x per hari
const WIB_MS = 7 * 3600 * 1000;

const SYSTEM_PROMPT = `Kamu "Beruang Akuntan" — AI di app BerUang. Kamu menulis 1 paragraf insight untuk laporan mingguan Telegram.
Aturan:
- Bahasa Indonesia santai, sapa "Bos". Maksimal 3 kalimat, total di bawah 320 karakter.
- Sebut ANGKA dari data yang diberikan (format Rp 1.250.000). Jangan mengarang angka.
- Kalimat 1: pola paling penting minggu ini (naik/turun vs minggu lalu, kategori penyebab).
- Kalimat 2: SATU saran konkret yang bisa dilakukan minggu depan, dengan angka.
- Kalau minggu ini lebih hemat, beri pujian singkat lalu satu saran lanjutan.
- Tanpa emoji lebih dari 1, tanpa bullet, tanpa judul, tanpa markdown.`;

const fmt = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function isoDateWib(ms) { return new Date(ms + WIB_MS).toISOString().slice(0, 10); }

// Rentang minggu (Senin–Minggu) dalam WIB, dihitung dari waktu sekarang.
export function weekRanges(nowMs = Date.now()) {
  const wib = new Date(nowMs + WIB_MS);
  const dow = (wib.getUTCDay() + 6) % 7; // Senin = 0
  const mondayUtc = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() - dow);
  const day = 86400000;
  const iso = (t) => new Date(t).toISOString().slice(0, 10);
  return {
    thisWeek: { from: iso(mondayUtc), to: iso(mondayUtc + 6 * day) },
    lastWeek: { from: iso(mondayUtc - 7 * day), to: iso(mondayUtc - day) },
    fourWeeksAgo: iso(mondayUtc - 28 * day),
    monthStart: iso(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), 1)),
    weekKey: iso(mondayUtc),
    today: iso(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate())),
  };
}

// Ringkasan angka deterministik. transactions: [{tanggal:'YYYY-MM-DD', jenis, jumlah, kategori, deskripsi}]
export function computeWeeklySummary(transactions, target, nowMs = Date.now()) {
  const r = weekRanges(nowMs);
  const inRange = (t, a, b) => typeof t.tanggal === "string" && t.tanggal >= a && t.tanggal <= b;
  const num = (v) => Number(v) || 0;
  const tx = (Array.isArray(transactions) ? transactions : []).filter((t) => t && typeof t.tanggal === "string");

  const thisW = tx.filter((t) => inRange(t, r.thisWeek.from, r.thisWeek.to));
  const lastW = tx.filter((t) => inRange(t, r.lastWeek.from, r.lastWeek.to));
  const fourW = tx.filter((t) => inRange(t, r.fourWeeksAgo, r.lastWeek.to));
  const mtd = tx.filter((t) => inRange(t, r.monthStart, r.today));

  const sum = (arr, jenis) => arr.filter((t) => t.jenis === jenis).reduce((s, t) => s + num(t.jumlah), 0);
  const byCat = (arr) => {
    const m = {};
    arr.filter((t) => t.jenis === "pengeluaran").forEach((t) => { const k = t.kategori || "Lain"; m[k] = (m[k] || 0) + num(t.jumlah); });
    return m;
  };
  const catThis = byCat(thisW), catLast = byCat(lastW);
  const topCategories = Object.entries(catThis).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([name, total]) => ({ name, total, lastWeek: catLast[name] || 0 }));
  const biggest = thisW.filter((t) => t.jenis === "pengeluaran").sort((a, b) => num(b.jumlah) - num(a.jumlah)).slice(0, 3)
    .map((t) => ({ tanggal: t.tanggal, jumlah: num(t.jumlah), deskripsi: String(t.deskripsi || t.subKategori || t.kategori || "").slice(0, 40) }));
  const expenseThis = sum(thisW, "pengeluaran"), expenseLast = sum(lastW, "pengeluaran");
  const avg4w = sum(fourW, "pengeluaran") / 4;
  const pct = expenseLast > 0 ? Math.round((expenseThis - expenseLast) / expenseLast * 100) : null;

  return {
    range: r.thisWeek, weekKey: r.weekKey,
    txCount: thisW.length, activeDays: new Set(thisW.map((t) => t.tanggal)).size,
    expenseThis, incomeThis: sum(thisW, "pemasukan"), expenseLast, pctVsLastWeek: pct, avg4w: Math.round(avg4w),
    topCategories, biggest,
    mtdExpense: sum(mtd, "pengeluaran"), mtdIncome: sum(mtd, "pemasukan"),
    target: num(target) || 0,
    inactiveTwoWeeks: thisW.length === 0 && lastW.length === 0,
  };
}

function idDate(iso) { const [y, m, d] = iso.split("-"); return `${Number(d)}/${Number(m)}`; }

export function buildReportMessage(s, insight, userName) {
  const name = userName ? esc(userName.split(" ")[0]) : "Bos";
  const arrow = s.pctVsLastWeek == null ? "" : s.pctVsLastWeek > 0 ? ` (▲ ${s.pctVsLastWeek}% vs minggu lalu)` : s.pctVsLastWeek < 0 ? ` (▼ ${Math.abs(s.pctVsLastWeek)}% vs minggu lalu)` : " (sama dengan minggu lalu)";
  const lines = [`🐻 <b>Laporan Beruang</b> · ${idDate(s.range.from)}–${idDate(s.range.to)}`, ``, `Halo ${name}! Ini rekap minggumu:`];
  if (s.txCount === 0) {
    lines.push(`Belum ada catatan minggu ini. Yuk mulai lagi — ketik aja "kopi 20rb" di sini, langsung kecatat ✍️`);
    return lines.join("\n");
  }
  lines.push(`💸 Keluar: <b>${fmt(s.expenseThis)}</b>${arrow}`);
  if (s.incomeThis) lines.push(`💰 Masuk: ${fmt(s.incomeThis)}`);
  if (s.topCategories.length) {
    lines.push(``, `Terbesar:`);
    s.topCategories.forEach((c) => {
      const d = c.lastWeek ? (c.total > c.lastWeek ? ` ▲` : c.total < c.lastWeek ? ` ▼` : "") : "";
      lines.push(`• ${esc(c.name)}: ${fmt(c.total)}${d}`);
    });
  }
  if (s.biggest[0]) lines.push(``, `Transaksi terbesar: ${esc(s.biggest[0].deskripsi || "-")} ${fmt(s.biggest[0].jumlah)} (${idDate(s.biggest[0].tanggal)})`);
  if (s.target > 0) {
    const sisa = s.target - s.mtdExpense;
    lines.push(``, sisa >= 0 ? `🎯 Bulan ini: ${fmt(s.mtdExpense)} dari target ${fmt(s.target)} — sisa ${fmt(sisa)}`
      : `🎯 Bulan ini sudah lewat target ${fmt(s.target)} sebesar ${fmt(-sisa)}`);
  } else {
    lines.push(``, `📅 Bulan ini: keluar ${fmt(s.mtdExpense)}`);
  }
  if (insight) lines.push(``, `💡 ${esc(insight.trim())}`);
  lines.push(``, `<i>Catat terus ya, ${name}. Ketik /laporan kapan saja · /laporan on = kirim otomatis tiap Minggu malam · /laporan off = berhenti.</i>`);
  return lines.join("\n");
}

async function getAIInsight(env, s) {
  const apiKey = (env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey || s.txCount === 0) return null;
  const data = {
    minggu: `${s.range.from} s/d ${s.range.to}`, pengeluaran_minggu_ini: s.expenseThis, pengeluaran_minggu_lalu: s.expenseLast,
    perubahan_persen: s.pctVsLastWeek, rata2_4_minggu: s.avg4w, pemasukan_minggu_ini: s.incomeThis,
    kategori_terbesar: s.topCategories, transaksi_terbesar: s.biggest, pengeluaran_bulan_berjalan: s.mtdExpense, target_bulanan: s.target || null,
    jumlah_transaksi: s.txCount, hari_aktif: s.activeDays,
  };
  try {
    const client = new Anthropic({ apiKey, timeout: 25000 });
    const res = await client.messages.create({
      model: MODEL, max_tokens: MAX_TOKENS,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: "Data minggu ini (JSON):\n" + JSON.stringify(data) + "\n\nTulis paragraf insight." }],
    });
    const text = (res.content || []).filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
    return text ? text.slice(0, 400) : null;
  } catch (e) {
    console.error("[WeeklyReport] AI insight gagal:", e && e.message);
    return null; // laporan angka tetap dikirim
  }
}

// Kirim laporan untuk satu link Telegram. Return: 'sent' | 'skipped:<alasan>'
export async function sendWeeklyReportFor(env, token, chatId, link, { force = false, manual = false, nowMs = Date.now() } = {}) {
  const uid = await resolveLinkUid(env, link);
  if (!uid) return "skipped:no-uid";
  if (!manual && !(await env.BOT_DATA.get("btg_weekly_on:" + uid))) return "skipped:not-opted-in";
  if (!(await hasPaidAIAccess(env, { ...link, uid }))) {
    if (manual) await sendMessage(token, chatId, "Laporan Beruang mingguan khusus paket berbayar yang aktif, bos. Aktifkan paket di app BerUang (mulai Rp 10rb) ya 🐻", { parse_mode: "HTML" });
    return "skipped:not-paid";
  }
  const ranges = weekRanges(nowMs);
  const dedupeKey = manual ? `btg_weekly_manual:${uid}:${ranges.today}` : `btg_weekly:${uid}:${ranges.weekKey}`;
  if (!force && await env.BOT_DATA.get(dedupeKey)) {
    if (manual) await sendMessage(token, chatId, "Laporan hari ini sudah dikirim tadi, bos. Coba lagi besok ya 🐻", { parse_mode: "HTML" });
    return "skipped:already-sent";
  }
  const doc = await firestoreAdmin(env).get(`users/${uid}/data/main`);
  const data = doc?.data || {};
  const s = computeWeeklySummary(data.transactions, data.target, nowMs);
  if (!manual && s.inactiveTwoWeeks) return "skipped:inactive"; // jangan spam user yang berhenti mencatat
  await env.BOT_DATA.put(dedupeKey, "1", { expirationTtl: manual ? TTL_MANUAL : TTL_SENT }); // reservasi dulu (anti dobel & anti biaya ganda)
  const insight = await getAIInsight(env, s);
  const ok = await sendMessage(token, chatId, buildReportMessage(s, insight, data.userName), { parse_mode: "HTML" });
  return ok ? "sent" : "skipped:telegram-failed";
}

// Dipanggil cron Minggu 20:00 WIB. Iterasi semua chat Telegram yang tersambung ke akun BerUang.
export async function sendWeeklyReports(env, { force = false, onlyEmail = null } = {}) {
  const token = (env.BERUANG_TG_TOKEN || "").trim();
  if (!token) { console.warn("[WeeklyReport] BERUANG_TG_TOKEN not set"); return { sent: 0, scanned: 0, errors: 0 }; }
  let sent = 0, scanned = 0, errors = 0, cursor;
  const results = {};
  do {
    const list = await env.BOT_DATA.list({ prefix: "btg_chat:", cursor, limit: 1000 });
    for (const k of list.keys) {
      try {
        const link = await env.BOT_DATA.get(k.name, "json");
        if (!link || !link.email) continue;
        if (onlyEmail && link.email !== onlyEmail) continue;
        scanned++;
        const chatId = k.name.slice("btg_chat:".length);
        const r = await sendWeeklyReportFor(env, token, chatId, link, { force });
        results[r] = (results[r] || 0) + 1;
        if (r === "sent") sent++;
      } catch (e) { errors++; console.error("[WeeklyReport] gagal untuk", k.name, e && e.message); }
    }
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
  console.log(`[WeeklyReport] scanned=${scanned} sent=${sent} errors=${errors}`, results);
  return { sent, scanned, errors, results };
}

// Debug/manual trigger admin: GET /api/beruang-weekly-test?admin_key=...&email=...&force=1
export async function handleWeeklyReportTest(request, env) {
  const url = new URL(request.url);
  if (!env.ADMIN_KEY || url.searchParams.get("admin_key") !== env.ADMIN_KEY) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  const result = await sendWeeklyReports(env, { force: url.searchParams.get("force") === "1", onlyEmail: url.searchParams.get("email") || null });
  return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
}
