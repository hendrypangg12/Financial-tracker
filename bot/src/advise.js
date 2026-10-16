// Endpoint AI Advisor untuk BerUang — Ruvy persona.
// Pro-only feature: user kirim pertanyaan + data spending, Claude balas insight.

import Anthropic from "@anthropic-ai/sdk";
import { requireUser, readPlan } from "./auth.js";

const MODEL = "claude-haiku-5-5"; // Haiku: jawaban keuangan rutin dengan biaya terkendali
const MAX_TOKENS = 600;   // Jawaban ringkas, gak boros token
const PAID_DAILY_LIMIT = 10;  // pertanyaan AI per hari, paket berbayar
const TRIAL_DAILY_LIMIT = 5;  // pertanyaan AI per hari, uji coba Google Play 3 hari

// System prompt — persona Beruang Gemoy
const SYSTEM_PROMPT_ID = `Kamu adalah "Ruvy" — AI Advisor di app Ruvy.

PERSONA:
- Karakter: robot pendamping keuangan, ramah dan teliti soal angka
- Sapa user dengan "Bos!" atau "Halo bos!"
- Bahasa Indonesia casual, kayak ngobrol sama temen — jangan formal
- Emoji moderate: 🐻 💰 💡 📊 🎯 ✨ (jangan lebay, max 1-2 per jawaban)
- Cepat & to-the-point — user pakai HP, jangan suruh baca paragraf panjang

FORMAT JAWABAN:
- Maks 4-5 kalimat per jawaban
- Gunakan mata uang dompet yang dipilih dan angka persis seperti konteks; jangan konversi mata uang atau menganggap semua pengguna memakai Rupiah
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

const SYSTEM_PROMPT_EN = `You are "Ruvy AI" — the friendly robot money assistant in Ruvy.

PERSONALITY AND FORMAT:
- Warm, concise, clear English; speak respectfully and avoid judging the user's spending.
- Use at most 1-2 emojis such as 🐻 💰 💡 📊 🎯.
- Usually answer in 4-5 short sentences with practical next steps, using specific figures from the user's own records.
- Use the selected wallet currency stated in the context. Preserve its decimal precision. Do not assume Rupiah or USD, convert currencies, or invent exchange rates.

SAVINGS GOALS:
- Estimate the remaining time from the target, relevant existing savings and monthly income minus expenses.
- Where monthly history is available, use several completed months rather than assuming an unfinished month represents normal income.
- If savings are zero or negative, explain why a reliable target date cannot be calculated and suggest concrete spending changes.
- Assets are not all available cash. Ask when their availability or the target price is unknown.

PRINCIPLES:
- Analyze the records supplied in this request. You have not been individually trained on this user's data and do not remember previous conversations unless they are included.
- Say when records are insufficient; never invent spending, income, goals, trends or guaranteed savings.
- Describe real patterns in the provided history without claiming causation.
- Offer spending and budgeting insights, not professional financial, tax or legal advice.
- Do not recommend speculative investments, specific products, account numbers, politics or religion.
`;

// ISO currency codes supported by Intl, with a fallback for runtimes without supportedValuesOf.
const CURRENCY_FALLBACK = "AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HRK HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SLL SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VES VND VUV WST XAF XCD XCG XDR XOF XPF XSU YER ZAR ZMW ZWG ZWL".split(" ");
const SUPPORTED_CURRENCIES = new Set([
  ...CURRENCY_FALLBACK,
  ...(typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("currency") : []),
]);
const copy = (language, id, en) => language === "en" ? en : id;

export function normalizeAdvisorPreferences(ctx) {
  const language = ctx?.language ?? "id";
  if (language !== "id" && language !== "en") throw new Error("language");
  const currency = ctx?.currency ?? "IDR";
  if (typeof currency !== "string" || !SUPPORTED_CURRENCIES.has(currency)) throw new Error("currency");
  const locale = language === "en" ? "en-US" : "id-ID";
  if (ctx?.locale != null && ctx.locale !== locale) throw new Error("locale");
  return { language, currency, locale };
}

export function formatAdvisorMoney(value, preferences) {
  const { locale, currency } = preferences;
  const number = Number(value);
  const amount = Number.isFinite(number) ? number : 0;
  const digits = currency === "IDR" ? 0 : new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
  if (currency === "IDR" && locale === "id-ID") {
    return "Rp " + amount.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }
  return new Intl.NumberFormat(locale, {
    style: "currency", currency, currencyDisplay: "code",
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(amount);
}

export function buildAdvisorSystemPrompt(preferences) {
  const { language, currency, locale } = preferences;
  const instruction = language === "en"
    ? `Respond in English. Selected wallet currency: ${currency}; number locale: ${locale}. Example amount: ${formatAdvisorMoney(1234.5, preferences)}. All monetary records in this request use this currency; never apply an exchange rate.`
    : `Jawab dalam bahasa Indonesia. Mata uang dompet terpilih: ${currency}; locale angka: ${locale}. Contoh nominal: ${formatAdvisorMoney(1234.5, preferences)}. Semua nominal dalam permintaan ini memakai mata uang ini; jangan konversi kurs.`;
  const prompt = language === "en" ? SYSTEM_PROMPT_EN : currency === "IDR" ? SYSTEM_PROMPT_ID
    : SYSTEM_PROMPT_ID.replace(/TONE CONTOH:[\s\S]*?PERTANYAAN GOAL/, 'PERTANYAAN GOAL')
      .replace('4. INDONESIAN CONTEXT — paham GoFood, Tokopedia, BCA, OVO, GoPay, dll', '4. KONTEKS USER — gunakan kategori dan nama dari data user; jangan asumsikan negara, bank, atau aplikasi tertentu');
  return prompt + "\n\n" + instruction;
}

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
  let language = /^en(?:[-,;]|$)/i.test(request.headers.get("Accept-Language") || "") ? "en" : "id";
  if (request.method !== "POST") {
    return jsonResponse({ error: copy(language, "Gunakan metode POST.", "Use the POST method.") }, 405);
  }

  let user;
  try { user = await requireUser(request, env); }
  catch (e) { return jsonResponse({ error: copy(language, "Sesi tidak tersedia. Masuk lagi atau coba sebentar lagi.", "Your session is unavailable. Sign in again or try shortly.") }, e.status || 503); }

  // Validate request
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: copy(language, "Format permintaan tidak valid.", "The request format is invalid.") }, 400);
  }

  const { question, context } = body || {};
  if (context?.language === "en" || context?.language === "id") language = context.language;
  let preferences;
  try {
    if (context != null && (typeof context !== "object" || Array.isArray(context))) throw new Error("context");
    preferences = normalizeAdvisorPreferences(context);
  } catch {
    return jsonResponse({ error: copy(language, "Bahasa atau mata uang dompet yang dipilih tidak didukung.", "The account language or currency is not supported.") }, 400);
  }
  language = preferences.language;
  if (typeof question !== "string" || !question.trim()) {
    return jsonResponse({ error: copy(language, "Pertanyaan wajib diisi.", "Enter a question.") }, 400);
  }

  // Validate question length (anti-abuse)
  const isGoal = context?.source === "goal-planner";
  const maxLength = isGoal ? 2500 : 500;
  if (question.length > maxLength || JSON.stringify(context || {}).length > 20000) {
    return jsonResponse({ error: copy(language, "Pertanyaan atau data pendukung terlalu panjang", "The question or supporting data is too long.") }, 400);
  }

  let account;
  try { account = await readPlan(user, env); }
  catch (e) { return jsonResponse({ error: copy(language, "Status paket belum bisa diperiksa. Coba lagi sebentar.", "Your plan could not be checked. Try again shortly.") }, e.status || 503); }
  // Uji coba (2 hari saat daftar, atau 3 hari Google Play) boleh AI dengan kuota kecil.
  const trialQuota = account.active && (account.plan === 'free_trial' || account.playTrial);
  const pro = account.active;
  if (!pro && !isGoal) return jsonResponse({ error: copy(language, 'Fitur ini memerlukan paket Pro aktif.', 'This feature requires an active Pro plan.') }, 403);
  const month = new Date().toISOString().slice(0, 7);
  const freeKey = `goal_free:${user.uid}:${month}`;
  if (!pro && await env.BOT_DATA.get(freeKey)) return jsonResponse({ error: copy(language, 'Kuota Goal gratis bulan ini sudah dipakai.', 'Your free goal plan for this month has already been used.') }, 429);

  // UID comes from Firebase, not a user-supplied email.
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const rateKey = `advise_rate:${user.uid}:${today}`;
  const currentCount = parseInt((await env.BOT_DATA.get(rateKey)) || "0", 10);
  // Biaya AI dijaga: uji coba 5/hari, paket berbayar 10/hari.
  const RATE_LIMIT = trialQuota ? TRIAL_DAILY_LIMIT : PAID_DAILY_LIMIT;
  if (currentCount >= RATE_LIMIT) {
    return jsonResponse({
      error: copy(language, "Limit harian tercapai", "Daily limit reached"),
      reply: trialQuota
        ? copy(language, `Bos, kuota AI uji coba hari ini udah habis (${RATE_LIMIT} pertanyaan/hari). Setelah uji coba berakhir kuotanya naik jadi ${PAID_DAILY_LIMIT}/hari 🐻`, `You've used today's ${RATE_LIMIT} free-trial AI questions. After the trial, the limit rises to ${PAID_DAILY_LIMIT} per day. 🐻`)
        : copy(language, `Bos, kuota Tanya Ruvy hari ini udah habis (${RATE_LIMIT} pertanyaan/hari). Coba lagi besok ya! 🐻`, `You've used today's ${RATE_LIMIT} AI questions. Try again tomorrow. 🐻`),
    }, 429);
  }

  // Reserve before the provider call, including failed calls (cost/abuse protection).
  await env.BOT_DATA.put(rateKey, String(currentCount + 1), { expirationTtl: 90000 });

  // Build user message dengan context
  const userMsg = buildUserMessage(question, context, preferences);

  // Call Claude API
  let reply;
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 0 });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // Routine advice needs a direct answer, not thinking that consumes the output budget.
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: [
        {
          type: "text",
          text: buildAdvisorSystemPrompt(preferences),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMsg }],
    });

    // Select by block type; provider thinking is never shown as an answer.
    reply = (response.content || []).filter(b => b.type === "text" && typeof b.text === "string")
      .map(b => b.text.trim()).filter(Boolean).join("\n\n");
    if (["refusal", "max_tokens", "model_context_window_exceeded"].includes(response.stop_reason) || !reply) {
      return jsonResponse({
        error: copy(language, "Layanan AI tidak tersedia", "AI service unavailable"),
        reply: copy(language, "Belum dapat membuat jawaban. Coba ubah pertanyaan atau coba lagi nanti.", "I couldn't provide an answer. Rephrase your question or try again later."),
      }, 503);
    }
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
    let userReply = copy(language, "Bos, AI belum bisa menjawab. Coba 1-2 menit lagi ya 🐻", "AI is temporarily unavailable. Try again in a minute or two. 🐻");
    const msgLower = (errInfo.errBody || errInfo.message || "").toLowerCase();
    if (msgLower.includes("credit balance") || msgLower.includes("insufficient")) {
      userReply = copy(language, "Bos, layanan AI sementara tidak tersedia. Coba lagi nanti ya 🐻", "AI is temporarily unavailable. Please try again later. 🐻");
    } else if (err?.status === 401 || err?.status === 403) {
      userReply = copy(language, "Bos, layanan AI perlu diperiksa. Hubungi dukungan kalau masalah berlanjut ya 🐻", "The AI service needs attention. Contact support if this continues. 🐻");
    } else if (err?.status === 404 || errInfo.type === "not_found_error") {
      userReply = copy(language, "Bos, AI sementara tidak tersedia. Coba lagi nanti 🐻", "AI is temporarily unavailable. Please try again later. 🐻");
    } else if (err?.status === 429) {
      userReply = copy(language, "Bos, banyak yang tanya sekaligus. Tunggu 1 menit ya 🐻", "AI is busy right now. Try again in a minute. 🐻");
    } else if (err?.status >= 500) {
      userReply = copy(language, "Bos, server AI lagi ada gangguan. Coba lagi bentar 🐻", "The AI service is having trouble. Please try again shortly. 🐻");
    }

    return jsonResponse({
      error: copy(language, "Layanan AI tidak tersedia", "AI service unavailable"),
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
export function buildUserMessage(question, ctx, preferences = normalizeAdvisorPreferences(ctx)) {
  const { language, currency, locale } = preferences;
  const text = (id, en) => copy(language, id, en);
  const money = value => formatAdvisorMoney(value, preferences);
  const header = text(
    `[Bahasa: Indonesia; mata uang dompet yang dipilih: ${currency}; locale: ${locale}]`,
    `[Language: English; selected wallet currency: ${currency}; locale: ${locale}]`
  );
  if (!ctx || (ctx.source === 'goal-planner' && ctx.totalPemasukan == null)) {
    return [header, text('[Pertanyaan user]', '[User question]'), question,
      text('(Gunakan hanya data yang tersedia. Kalau data kurang, minta user melengkapi catatan.)', '(Use only the supplied records. Ask for more records when the data is insufficient.)')].join('\n\n');
  }

  const lines = [header];
  if (ctx.userName) lines.push(text(`[Nama user: ${ctx.userName}]`, `[User name: ${ctx.userName}]`));
  lines.push(
    text(`[Data keuangan untuk ${ctx.monthName || "bulan ini"}]`, `[Financial records for ${ctx.monthName || "this month"}]`),
    '',
    `${text('💰 Total Pemasukan', '💰 Total income')}: ${money(ctx.totalPemasukan)}`,
    `${text('💸 Total Pengeluaran', '💸 Total expenses')}: ${money(ctx.totalPengeluaran)}`,
    `${text('🏦 Sisa Saldo bulan ini', '🏦 Net income this month')}: ${money(ctx.sisaSaldo)}`,
    `${text('🐷 Bisa ditabung bulan ini (pemasukan - pengeluaran)', '🐷 Potential savings this month (income - expenses)')}: ${money(ctx.tabunganBulanIni ?? ctx.sisaSaldo)}`,
    `${text('📝 Total Transaksi', '📝 Transaction count')}: ${Number(ctx.totalTransaksi) || 0}`
  );

  if (ctx.assetTotal) {
    lines.push('', `${text('💎 Total Aset/Tabungan saat ini', '💎 Current assets/savings')}: ${money(ctx.assetTotal)}`);
    if (Array.isArray(ctx.assetBreakdown)) ctx.assetBreakdown.slice(0, 8).forEach(a => {
      lines.push(`  - ${a.nama} (${a.jenis}): ${money(a.jumlah)}`);
    });
  }
  if (ctx.piutangTotal) lines.push(`${text('🤝 Piutang (belum kembali)', '🤝 Outstanding receivables')}: ${money(ctx.piutangTotal)}`);
  if (ctx.hutangTotal) lines.push(`${text('📕 Utang user (belum lunas)', '📕 Outstanding debt')}: ${money(ctx.hutangTotal)}`);

  for (const [key, label] of [['compareIncome', text('Pemasukan', 'Income')], ['compareExpense', text('Pengeluaran', 'Expenses')]]) {
    if (typeof ctx[key] === 'number') lines.push(`📊 ${label}: ${ctx[key] >= 0 ? '▲' : '▼'} ${Math.abs(ctx[key])}% ${text('vs bulan lalu', 'vs last month')}`);
  }
  if (Array.isArray(ctx.monthlyHistory) && ctx.monthlyHistory.length > 1) {
    lines.push('', text('📅 Riwayat bulanan (lama → baru):', '📅 Monthly history (oldest → newest):'));
    ctx.monthlyHistory.slice(-6).forEach(m => {
      if (!m || typeof m !== 'object') return;
      const cats = Array.isArray(m.topKategori) ? m.topKategori.slice(0, 3)
        .map(c => `${String(c?.name || text('Lain', 'Other')).slice(0, 40)} ${money(c?.total)}`).join(', ') : '';
      lines.push(`  - ${String(m.bulan || '').slice(0, 20)}: ${text('masuk', 'income')} ${money(m.pemasukan)}, ${text('keluar', 'expenses')} ${money(m.pengeluaran)}, ${text('sisa', 'net')} ${money(m.sisa)}, ${Number(m.jumlahTransaksi) || 0} ${text('transaksi', 'transactions')}${cats ? ` | ${text('terbesar', 'largest')}: ${cats}` : ''}`);
    });
  }
  if (Array.isArray(ctx.categoryBreakdown) && ctx.categoryBreakdown.length > 0) {
    lines.push('', text('📂 Kategori pengeluaran teratas:', '📂 Top expense categories:'));
    ctx.categoryBreakdown.slice(0, 5).forEach(c => lines.push(`  - ${c.name}: ${money(c.total)} (${c.pct}%)`));
  }
  if (Array.isArray(ctx.recentTransactions) && ctx.recentTransactions.length > 0) {
    lines.push('', text('🧾 Transaksi terakhir:', '🧾 Recent transactions:'));
    ctx.recentTransactions.slice(0, 10).forEach(t => {
      const sign = t.jenis === 'pemasukan' ? '+' : '-';
      lines.push(`  - ${t.tanggal} ${sign}${money(t.jumlah)} (${t.kategori || text('lain', 'other')}) — ${t.desc || ''}`);
    });
  }
  lines.push('', text('[Pertanyaan user]', '[User question]'), question);
  return lines.join('\n');
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
