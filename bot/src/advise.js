// Endpoint AI Advisor untuk BerUang — Beruang Akuntan Gemoy persona.
// Pro-only feature: user kirim pertanyaan + data spending, Claude balas insight.

import Anthropic from "@anthropic-ai/sdk";
import { requireUser, readPlan } from "./auth.js";

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 1024;  // Jawaban ringkas, gak boros token

// System prompt — persona Beruang Gemoy
const SYSTEM_PROMPT = `Kamu adalah "Beruang Akuntan Gemoy" — AI Advisor di app BerUang Indonesia.

PERSONA:
- Karakter: beruang coklat pakai kacamata, lucu tapi sharp soal angka
- Sapa user dengan "Bos!" atau "Halo bos!"
- Bahasa Indonesia casual, kayak ngobrol sama temen — jangan formal
- Emoji moderate: 🐻 💰 💡 📊 🎯 ✨ (jangan lebay, max 1-2 per jawaban)
- Cepat & to-the-point — user pakai HP, jangan suruh baca paragraf panjang

FORMAT JAWABAN:
- Maks 4-5 kalimat per jawaban
- Format Rupiah: Rp 1.500.000 (titik pemisah ribuan)
- Selalu actionable: kasih saran konkret berdasarkan DATA REAL user
- Reference angka spesifik dari data yang dikasih
- Akhiri dengan emoji yang pas (kadang aja, gak harus)

TONE CONTOH:
❌ "Berdasarkan analisis spending pattern Anda, saya rekomendasikan..."
✅ "Bos, GoFood kamu bulan ini Rp 1.2jt. Coba kurangi ke 2x/minggu, bisa hemat Rp 600rb."

❌ "Anda memerlukan budget Rp 5.000.000 per bulan untuk mencapai goal."
✅ "Kalau mau target Rp 50jt 5 bulan, sisihin Rp 10jt/bulan ya bos. Saat ini kamu cuma sisihin Rp 5jt 💪"

PERTANYAAN GOAL ("kapan bisa beli X" / "cara nabung buat X"):
- Hitung dari data: (Aset/tabungan sekarang) + (yang bisa ditabung per bulan = pemasukan - pengeluaran)
- Estimasi: (harga barang - aset sekarang) / tabungan per bulan = berapa bulan lagi
- Kasih angka konkret + 1-2 saran biar lebih cepat (pos pengeluaran mana yang bisa dipangkas)
- Kalau ada "Riwayat bulanan", pakai rata-rata sisa beberapa bulan (bukan cuma bulan ini yang belum selesai) biar estimasi realistis
- Kalau tabungan bulanan negatif/nol: jujur bilang "belum bisa nabung, harus benerin pengeluaran dulu" + tunjuk kategori boros

PRINSIP:
1. JUJUR — kalau data kurang, bilang "Catet dulu transaksinya lebih banyak ya bos, baru aku bisa kasih saran akurat"
2. PRAKTIS — jangan saran investasi crypto / saham yang berisiko (out of scope)
3. EMPATIK — kalau spending tinggi, jangan judge. Kasih opsi yang masuk akal
4. INDONESIAN CONTEXT — paham GoFood, Tokopedia, BCA, OVO, GoPay, dll
5. JANGAN claim sebagai financial advisor profesional — kasih insight aja
6. TREN — kalau ada riwayat bulanan, sebut pola nyata (mis. "3 bulan terakhir makan naik terus") dan bandingkan dengan bulan-bulan sebelumnya

YANG TIDAK DILAKUKAN:
- Jangan kasih advice pajak / hukum (out of scope)
- Jangan saran beli produk specific brand
- Jangan bahas politik / agama
- Jangan kasih nomor rekening atau invest opportunity
`;

/**
 * Handler endpoint POST /api/advise
 *
 * Body request:
 * {
 *   email: "user@email.com",     // untuk rate limiting + Pro check
 *   question: "Kapan bisa beli laptop 15jt?",
 *   context: {
 *     totalPemasukan: 50000000,
 *     totalPengeluaran: 5000000,
 *     sisaSaldo: 45000000,
 *     totalTransaksi: 15,
 *     monthName: "Mei 2026",
 *     compareIncome: -5,  // % vs bulan lalu (negatif = turun)
 *     compareExpense: 10,
 *     categoryBreakdown: [
 *       { name: "Makanan", total: 1500000, pct: 30 },
 *       { name: "Transport", total: 800000, pct: 16 },
 *       ...
 *     ],
 *     recentTransactions: [
 *       { tanggal: "2026-05-15", desc: "GoFood", jenis: "pengeluaran", jumlah: 50000, kategori: "Makanan" },
 *       ...
 *     ]
 *   }
 * }
 *
 * Returns: { reply: "Bos, ..." }
 */
export async function handleAdvise(request, env) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "POST only" }, 405);
  }

  let user;
  try { user = await requireUser(request, env); }
  catch (e) { return jsonResponse({ error: e.message }, e.status || 503); }

  // Validate request
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const { question, context } = body || {};
  if (typeof question !== "string" || !question.trim()) {
    return jsonResponse({ error: "question required" }, 400);
  }

  // Validate question length (anti-abuse)
  const isGoal = context?.source === "goal-planner";
  const maxLength = isGoal ? 2500 : 500;
  if (question.length > maxLength || JSON.stringify(context || {}).length > 20000) {
    return jsonResponse({ error: "Pertanyaan atau data pendukung terlalu panjang" }, 400);
  }

  let account;
  try { account = await readPlan(user, env); }
  catch (e) { return jsonResponse({ error: e.message }, e.status || 503); }
  if (account.active && account.plan === 'free_trial') {
    return jsonResponse({ error: 'AI khusus paket berbayar.', reply: 'Bos, uji coba gratis belum termasuk AI. Aktifkan paket mulai Rp 10rb biar bisa ngobrol sama Beruang Akuntan ya 🐻' }, 403);
  }
  const pro = account.active;
  if (!pro && !isGoal) return jsonResponse({ error: 'Fitur ini memerlukan paket Pro aktif.' }, 403);
  const month = new Date().toISOString().slice(0, 7);
  const freeKey = `goal_free:${user.uid}:${month}`;
  if (!pro && await env.BOT_DATA.get(freeKey)) return jsonResponse({ error: 'Kuota Goal gratis bulan ini sudah dipakai.' }, 429);

  // UID comes from Firebase, not a user-supplied email.
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const rateKey = `advise_rate:${user.uid}:${today}`;
  const currentCount = parseInt((await env.BOT_DATA.get(rateKey)) || "0", 10);
  const RATE_LIMIT = 30;
  if (currentCount >= RATE_LIMIT) {
    return jsonResponse({
      error: "Limit harian tercapai",
      reply: "Bos, kuota Tanya Beruang hari ini udah habis (30 query/hari). Coba lagi besok ya! 🐻",
    }, 429);
  }

  // Reserve before the provider call, including failed calls (cost/abuse protection).
  await env.BOT_DATA.put(rateKey, String(currentCount + 1), { expirationTtl: 90000 });

  // Build user message dengan context
  const userMsg = buildUserMessage(question, context);

  // Call Claude API
  let reply;
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMsg }],
    });

    // Extract text from response
    const textBlock = response.content.find((b) => b.type === "text");
    reply = textBlock?.text?.trim() || "Bos, ada masalah sebentar. Coba tanya lagi ya 🐻";
  } catch (err) {
    // Detail error info supaya bisa debug via `wrangler tail`
    const errInfo = {
      name: err?.name || "Unknown",
      status: err?.status,
      message: (err?.message || String(err)).slice(0, 300),
      type: err?.error?.type || err?.error?.error?.type,
      errBody: err?.error?.error?.message?.slice(0, 200),
    };
    console.error("Claude API error:", JSON.stringify(errInfo));

    // Reply message sesuai tipe error (user-friendly)
    let userReply = "Bos, Aku lagi capek nih, coba 1-2 menit lagi ya 😅";
    const msgLower = (errInfo.errBody || errInfo.message || "").toLowerCase();
    if (msgLower.includes("credit balance") || msgLower.includes("insufficient")) {
      userReply = "Bos, kredit AI Admin lagi habis. Lagi di-top-up, coba lagi 1 jam lagi ya 🐻";
    } else if (err?.status === 401 || err?.status === 403) {
      userReply = "Bos, API key AI perlu di-refresh. Kontak Admin ya 🐻";
    } else if (err?.status === 404 || errInfo.type === "not_found_error") {
      userReply = "Bos, model AI lagi maintenance. Coba lagi nanti 🐻";
    } else if (err?.status === 429) {
      userReply = "Bos, banyak yang tanya sekaligus. Tunggu 1 menit ya 😅";
    } else if (err?.status >= 500) {
      userReply = "Bos, AI server lagi ada gangguan. Coba lagi bentar 🐻";
    }

    return jsonResponse({
      error: "AI service error",
      reply: userReply,
    }, 503);
  }

  if (!pro) await env.BOT_DATA.put(freeKey, "1", { expirationTtl: 32 * 86400 });

  // Financial questions and answers are not retained for optional analytics.
  // Historical advise_log records retain their old 30-day TTL until cleanup.

  return jsonResponse({
    reply,
    quota: { used: currentCount + 1, limit: RATE_LIMIT },
  });
}

/**
 * Build user message with structured context data
 */
function buildUserMessage(question, ctx) {
  if (!ctx) {
    return `Pertanyaan: ${question}\n\n(Data spending user tidak tersedia — kasih jawaban general tapi tetap minta user catat transaksi dulu biar bisa kasih advice akurat.)`;
  }

  const lines = [];
  if (ctx.userName) lines.push(`[Nama user: ${ctx.userName} — sapa dengan nama ini]`, "");
  lines.push(
    `[Data spending user untuk ${ctx.monthName || "bulan ini"}]`,
    "",
    `💰 Total Pemasukan: Rp ${formatRupiah(ctx.totalPemasukan || 0)}`,
    `💸 Total Pengeluaran: Rp ${formatRupiah(ctx.totalPengeluaran || 0)}`,
    `🏦 Sisa Saldo bulan ini: Rp ${formatRupiah(ctx.sisaSaldo || 0)}`,
    `🐷 Bisa ditabung bulan ini (pemasukan - pengeluaran): Rp ${formatRupiah(ctx.tabunganBulanIni != null ? ctx.tabunganBulanIni : (ctx.sisaSaldo || 0))}`,
    `📝 Total Transaksi: ${ctx.totalTransaksi || 0}`
  );

  // Aset / kekayaan (duit yang udah dipunya — penting buat jawab "kapan bisa beli X")
  if (ctx.assetTotal) {
    lines.push("", `💎 Total Aset/Tabungan saat ini: Rp ${formatRupiah(ctx.assetTotal)}`);
    if (Array.isArray(ctx.assetBreakdown)) {
      ctx.assetBreakdown.slice(0, 8).forEach((a) => {
        lines.push(`  - ${a.nama} (${a.jenis}): Rp ${formatRupiah(a.jumlah)}`);
      });
    }
  }
  if (ctx.piutangTotal) lines.push(`🤝 Piutang (dipinjam orang, blm balik): Rp ${formatRupiah(ctx.piutangTotal)}`);
  if (ctx.hutangTotal) lines.push(`📕 Utang user (blm lunas): Rp ${formatRupiah(ctx.hutangTotal)}`);

  if (typeof ctx.compareIncome === "number") {
    const arrow = ctx.compareIncome >= 0 ? "▲" : "▼";
    lines.push(`📊 Pemasukan: ${arrow} ${Math.abs(ctx.compareIncome)}% vs bulan lalu`);
  }
  if (typeof ctx.compareExpense === "number") {
    const arrow = ctx.compareExpense >= 0 ? "▲" : "▼";
    lines.push(`📊 Pengeluaran: ${arrow} ${Math.abs(ctx.compareExpense)}% vs bulan lalu`);
  }

  // Riwayat per bulan (maks 6) — dipakai buat baca tren/kebiasaan jangka panjang
  if (Array.isArray(ctx.monthlyHistory) && ctx.monthlyHistory.length > 1) {
    lines.push("", "📅 Riwayat bulanan (lama → baru):");
    ctx.monthlyHistory.slice(-6).forEach((m) => {
      if (!m || typeof m !== "object") return;
      const cats = Array.isArray(m.topKategori)
        ? m.topKategori.slice(0, 3).map((c) => `${String(c?.name || "Lain").slice(0, 40)} Rp ${formatRupiah(c?.total)}`).join(", ")
        : "";
      lines.push(`  - ${String(m.bulan || "").slice(0, 20)}: masuk Rp ${formatRupiah(m.pemasukan)}, keluar Rp ${formatRupiah(m.pengeluaran)}, sisa Rp ${formatRupiah(m.sisa)}, ${Number(m.jumlahTransaksi) || 0} transaksi${cats ? ` | terbesar: ${cats}` : ""}`);
    });
  }

  // Category breakdown (top 5)
  if (Array.isArray(ctx.categoryBreakdown) && ctx.categoryBreakdown.length > 0) {
    lines.push("", "📂 Kategori pengeluaran teratas:");
    ctx.categoryBreakdown.slice(0, 5).forEach((c) => {
      lines.push(`  - ${c.name}: Rp ${formatRupiah(c.total)} (${c.pct}%)`);
    });
  }

  // Recent transactions (last 10)
  if (Array.isArray(ctx.recentTransactions) && ctx.recentTransactions.length > 0) {
    lines.push("", "🧾 Transaksi terakhir:");
    ctx.recentTransactions.slice(0, 10).forEach((t) => {
      const sign = t.jenis === "pemasukan" ? "+" : "-";
      lines.push(`  - ${t.tanggal} ${sign}Rp ${formatRupiah(t.jumlah)} (${t.kategori || "lain"}) — ${t.desc || ""}`);
    });
  }

  lines.push("", `[Pertanyaan user]`, question);

  return lines.join("\n");
}

function formatRupiah(n) {
  return Number(n || 0).toLocaleString("id-ID");
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
