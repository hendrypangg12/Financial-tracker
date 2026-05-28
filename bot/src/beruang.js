// BerUang via Telegram — catat pemasukan/pengeluaran lewat chat bot.
// Alur: user /mulai → dapat kode → masukin di app (pairing) → chat "bakso 45rb"
// → di-parse → masuk "inbox" KV → app tarik (pull) → masuk ke transaksi user.
// Token bot: env.BERUANG_TG_TOKEN (secret, di-trim otomatis). KV: env.BOT_DATA.

import { sendMessage } from "./telegram.js";

const TTL_CODE = 900;            // kode pairing 15 menit
const TTL_INBOX = 60 * 60 * 24 * 14; // inbox 14 hari

function jres(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// ====== PARSER (self-contained, cukup buat chat) ======
function parseAmount(text) {
  const t = text.toLowerCase().replace(/rp\.?/g, " ");
  // cari angka + satuan (rb/ribu/k/jt/juta/m)
  const re = /(\d+(?:[.,]\d+)?)\s*(jt|juta|m|miliar|rb|ribu|k)?/g;
  let best = 0, m;
  while ((m = re.exec(t)) !== null) {
    let num = parseFloat(m[1].replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
    if (isNaN(num)) continue;
    const unit = m[2] || "";
    if (/jt|juta/.test(unit)) num *= 1e6;
    else if (/m|miliar/.test(unit)) num *= 1e9;
    else if (/rb|ribu|k/.test(unit)) num *= 1e3;
    if (num > best) best = num; // ambil nominal terbesar di kalimat
  }
  return Math.round(best);
}

const INCOME_RE = /\b(gaji|gajian|bonus|thr|untung|laba|terima|diterima|dapat|dapet|masuk|pemasukan|jual|jualan|honor|fee|komisi|bayaran|dividen|hadiah|refund|cashback|transfer masuk)\b/i;

const CAT_RULES = [
  { re: /\b(bakso|nasi|makan|gofood|grabfood|jajan|kopi|cafe|resto|warung|snack|minum|sarapan|lunch|dinner|gorengan|mie|ayam)\b/i, kategori: "Makanan", sub: "Makan/Jajan", alokasi: "Keinginan" },
  { re: /\b(bensin|pertamax|pertalite|solar|grab|gojek|ojek|parkir|tol|transport|busway|mrt|krl|angkot|bbm|ongkir)\b/i, kategori: "Transportasi", sub: "Transport", alokasi: "Kebutuhan" },
  { re: /\b(pulsa|paket data|internet|wifi|listrik|token|pln|pdam|air|tagihan|langganan|netflix|spotify)\b/i, kategori: "Tagihan", sub: "Tagihan/Langganan", alokasi: "Kebutuhan" },
  { re: /\b(kost|kos|sewa|kontrakan)\b/i, kategori: "Tempat Tinggal", sub: "Kost/Sewa", alokasi: "Kebutuhan" },
  { re: /\b(cicilan|kredit|kartu kredit|kpr|pinjaman|angsuran)\b/i, kategori: "Cicilan", sub: "Cicilan", alokasi: "Kebutuhan" },
  { re: /\b(belanja|baju|sepatu|skincare|kosmetik|shopee|tokopedia|lazada|tiktok shop|olshop)\b/i, kategori: "Belanja", sub: "Belanja", alokasi: "Keinginan" },
  { re: /\b(obat|dokter|rs|rumah sakit|apotek|vitamin|bpjs|kesehatan)\b/i, kategori: "Kesehatan", sub: "Kesehatan", alokasi: "Kebutuhan" },
];

function parseEntry(text) {
  const jumlah = parseAmount(text);
  if (!jumlah || jumlah <= 0) {
    return { error: 'Gak nemu nominalnya 😅 Contoh: "bakso 45rb", "gaji 5jt masuk", "bensin 50000".' };
  }
  const isIncome = INCOME_RE.test(text);
  const jenis = isIncome ? "pemasukan" : "pengeluaran";
  let kategori, sub, alokasi = "";
  if (isIncome) { kategori = "Pemasukan"; sub = "Pemasukan"; }
  else {
    const rule = CAT_RULES.find((r) => r.re.test(text));
    if (rule) { kategori = rule.kategori; sub = rule.sub; alokasi = rule.alokasi; }
    else { kategori = "Lainnya"; sub = "Lainnya"; alokasi = "Keinginan"; }
  }
  // deskripsi: buang angka + satuan + rp
  let deskripsi = text
    .replace(/\brp\.?\b/gi, "")
    .replace(/(\d+(?:[.,]\d+)*)\s*(rb|ribu|k|jt|juta|m|miliar)?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!deskripsi) deskripsi = sub;
  return {
    id: "tg_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    tanggal: new Date().toISOString().slice(0, 10),
    jenis, jumlah, deskripsi: deskripsi.slice(0, 80),
    subKategori: sub, kategori, alokasi,
    _src: "telegram",
  };
}

function fmtRp(n) { return "Rp " + Number(n || 0).toLocaleString("id-ID"); }
function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

// ====== WEBHOOK Telegram ======
export async function handleBeruangWebhook(request, env, ctx) {
  const token = (env.BERUANG_TG_TOKEN || "").trim(); // trim whitespace/newline (sering ke-copy)
  if (!token) return jres({ error: "BERUANG_TG_TOKEN not set" }, 500);
  let update;
  try { update = await request.json(); } catch { return jres({ ok: true }); }
  const msg = update.message || update.edited_message;
  const chatId = msg && msg.chat && msg.chat.id;
  const text = (msg && msg.text || "").trim();
  const photos = (msg && msg.photo) || []; // array of {file_id, width, height, file_size}, largest = last
  if (!chatId || (!text && photos.length === 0)) return jres({ ok: true });

  ctx.waitUntil((async () => {
    try {
      if (/^\/(start|mulai)\b/i.test(text)) {
        const code = genCode();
        await env.BOT_DATA.put("btg_code:" + code, JSON.stringify({ chatId }), { expirationTtl: TTL_CODE });
        await sendMessage(token, chatId,
          `Halo bos! 🐻 Aku <b>BerUang</b> — catat keuangan lewat chat.\n\n` +
          `Hubungkan dulu sama akunmu:\n` +
          `1️⃣ Buka app BerUang → menu (avatar) → <b>Hubungkan Telegram</b>\n` +
          `2️⃣ Masukin kode ini (berlaku 15 menit):\n\n` +
          `<b>🔑 ${code}</b>\n\n` +
          `Setelah nyambung:\n• Ketik transaksi: "bakso 45rb", "gaji 5jt masuk"\n• 📸 Atau kirim foto struk — auto ke-catat!`,
          { parse_mode: "HTML" });
        return;
      }
      if (/^\/(help|bantuan)\b/i.test(text)) {
        await sendMessage(token, chatId,
          `Cara pakai 🐻:\n• Ketik transaksi: "kopi 25rb", "gaji 5jt", "grab 30000"\n• 📸 Kirim foto struk → auto-baca total + toko\n• /mulai — hubungkan/ganti akun\n\nNominal otomatis kebaca (rb=ribu, jt=juta).`);
        return;
      }

      // butuh sudah linked untuk pesan/foto biasa
      const link = await env.BOT_DATA.get("btg_chat:" + chatId, "json");
      if (!link || !link.email) {
        await sendMessage(token, chatId, `Belum tersambung ke akun BerUang. Ketik /mulai dulu ya bos 🐻`);
        return;
      }

      // FOTO STRUK → OCR via Claude vision
      if (photos.length > 0) {
        const photo = photos[photos.length - 1]; // largest variant
        await handleStrukPhoto(env, token, chatId, photo, link.email, msg && msg.caption);
        return;
      }

      // TEKS biasa
      const entry = parseEntry(text);
      if (entry.error) { await sendMessage(token, chatId, entry.error); return; }
      await pushInbox(env, link.email, entry);
      const tag = entry.jenis === "pemasukan" ? "🟢 Pemasukan" : "🔴 Pengeluaran";
      await sendMessage(token, chatId,
        `✅ Dicatat!\n${tag} <b>${fmtRp(entry.jumlah)}</b>\n${entry.deskripsi} · ${entry.kategori}\n\n<i>Buka app BerUang buat lihat (auto-masuk pas dibuka).</i>`,
        { parse_mode: "HTML" });
    } catch (e) { /* swallow */ }
  })());

  return jres({ ok: true });
}

async function pushInbox(env, email, entry) {
  const key = "btg_inbox:" + email;
  const arr = (await env.BOT_DATA.get(key, "json")) || [];
  arr.push(entry);
  await env.BOT_DATA.put(key, JSON.stringify(arr.slice(-200)), { expirationTtl: TTL_INBOX });
}

// ====== FOTO STRUK — Claude vision ======
async function handleStrukPhoto(env, token, chatId, photo, email, caption) {
  const apiKey = (env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) { await sendMessage(token, chatId, "AI vision belum di-setup, ketik manual aja ya bos."); return; }

  // 1) Telegram getFile → dapat file_path
  const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(photo.file_id)}`);
  const fileData = await fileRes.json();
  if (!fileData.ok) { await sendMessage(token, chatId, "Gagal ambil foto, coba kirim lagi."); return; }
  const filePath = fileData.result.file_path;

  // 2) Acknowledge dulu (Telegram timeout 30s, vision bisa 5-10s)
  await sendMessage(token, chatId, "📸 Lagi baca struknya, sebentar...");

  // 3) Download foto → base64 (chunked supaya gak overflow argument limit)
  const imgRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!imgRes.ok) { await sendMessage(token, chatId, "Gagal download foto."); return; }
  const buf = await imgRes.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binStr = "";
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binStr += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  const base64 = btoa(binStr);
  const mediaType = /\.png$/i.test(filePath) ? "image/png" : "image/jpeg";

  // 4) Tanya Claude
  const promptText = `Ini foto struk belanja / nota / bon. Extract data:
- total: angka total bayar (integer Rupiah, tanpa titik/koma)
- vendor: nama toko/warung/merchant (kalau gak kelihatan, isi "Belanja")
- tanggal: format YYYY-MM-DD (kalau gak ada di struk, pakai hari ini: ${new Date().toISOString().slice(0,10)})
- kategori_tebak: salah satu dari "Makanan", "Transportasi", "Tagihan", "Belanja", "Kesehatan", "Tempat Tinggal", "Lainnya"
${caption ? `\nUser kasih caption: "${caption}" — bisa pake buat context.` : ""}

JAWAB dengan JSON saja, format persis:
{"total":50000,"vendor":"Indomaret","tanggal":"2026-05-28","kategori_tebak":"Belanja"}

Kalau foto BUKAN struk atau gak kebaca sama sekali, jawab:
{"error":"Bukan struk / foto kurang jelas, foto-in ulang yang fokus ke total ya"}`;

  let claudeText;
  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: promptText },
          ],
        }],
      }),
    });
    if (!claudeRes.ok) {
      const errBody = await claudeRes.text();
      console.error("Claude vision error:", claudeRes.status, errBody.slice(0,200));
      await sendMessage(token, chatId, "AI vision lagi sibuk, coba lagi sebentar.");
      return;
    }
    const data = await claudeRes.json();
    claudeText = (data.content && data.content[0] && data.content[0].text || "").trim();
  } catch (e) {
    await sendMessage(token, chatId, "Gagal panggil AI, coba lagi.");
    return;
  }

  // 5) Parse JSON dari response
  let parsed;
  try {
    const m = claudeText.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(m ? m[0] : claudeText);
  } catch {
    await sendMessage(token, chatId, "Gak bisa baca struknya, coba foto ulang dengan total yang kelihatan jelas.");
    return;
  }
  if (parsed.error) { await sendMessage(token, chatId, parsed.error); return; }

  const total = parseInt(parsed.total, 10) || 0;
  if (total <= 0) { await sendMessage(token, chatId, "Total gak ke-baca, ketik manual aja: \"belanja 150rb\""); return; }

  const validKategori = ["Makanan","Transportasi","Tagihan","Belanja","Kesehatan","Tempat Tinggal","Lainnya"];
  const kategori = validKategori.includes(parsed.kategori_tebak) ? parsed.kategori_tebak : "Belanja";
  const alokasiMap = { Makanan:"Keinginan", Transportasi:"Kebutuhan", Tagihan:"Kebutuhan", Belanja:"Keinginan", Kesehatan:"Kebutuhan", "Tempat Tinggal":"Kebutuhan", Lainnya:"Keinginan" };

  const entry = {
    id: "tg_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    tanggal: /^\d{4}-\d{2}-\d{2}$/.test(parsed.tanggal) ? parsed.tanggal : new Date().toISOString().slice(0,10),
    jenis: "pengeluaran",
    jumlah: total,
    deskripsi: (parsed.vendor || "Belanja").toString().slice(0, 80),
    subKategori: kategori,
    kategori,
    alokasi: alokasiMap[kategori] || "Keinginan",
    _src: "telegram-struk",
  };

  await pushInbox(env, email, entry);
  await sendMessage(token, chatId,
    `✅ Struk ke-catat!\n🔴 Pengeluaran <b>${fmtRp(entry.jumlah)}</b>\n${entry.deskripsi} · ${entry.kategori}\n📅 ${entry.tanggal}\n\n<i>Buka app BerUang buat lihat. Salah baca? Edit di app.</i>`,
    { parse_mode: "HTML" });
}

// ====== PAIR: app kirim {code, email, pullToken} ======
export async function handleBeruangPair(request, env) {
  if (request.method === "OPTIONS") return jres({ ok: true });
  let body; try { body = await request.json(); } catch { return jres({ error: "bad json" }, 400); }
  const { code, email, pullToken } = body || {};
  if (!code || !email || !pullToken) return jres({ error: "code, email, pullToken wajib" }, 400);
  const rec = await env.BOT_DATA.get("btg_code:" + String(code).trim(), "json");
  if (!rec || !rec.chatId) return jres({ ok: false, error: "Kode salah / kadaluarsa. Minta kode baru via /mulai di bot." }, 404);
  // simpan mapping 2 arah
  await env.BOT_DATA.put("btg_chat:" + rec.chatId, JSON.stringify({ email }));
  await env.BOT_DATA.put("btg_mail:" + email, JSON.stringify({ chatId: rec.chatId, pullToken }));
  await env.BOT_DATA.delete("btg_code:" + String(code).trim());
  const token = (env.BERUANG_TG_TOKEN || "").trim();
  if (token) { try { await sendMessage(token, rec.chatId, `✅ Akun <b>${email}</b> tersambung! Sekarang tinggal ketik transaksi, langsung ke-catat 🐻`, { parse_mode: "HTML" }); } catch (e) {} }
  return jres({ ok: true });
}

// ====== PULL: app tarik inbox {email, pullToken} ======
export async function handleBeruangPull(request, env) {
  if (request.method === "OPTIONS") return jres({ ok: true });
  let body; try { body = await request.json(); } catch { return jres({ error: "bad json" }, 400); }
  const { email, pullToken } = body || {};
  if (!email || !pullToken) return jres({ error: "email, pullToken wajib" }, 400);
  const map = await env.BOT_DATA.get("btg_mail:" + email, "json");
  if (!map || map.pullToken !== pullToken) return jres({ ok: false, linked: false, items: [] });
  const key = "btg_inbox:" + email;
  const arr = (await env.BOT_DATA.get(key, "json")) || [];
  if (arr.length) await env.BOT_DATA.delete(key); // clear setelah ditarik
  return jres({ ok: true, linked: true, items: arr });
}
