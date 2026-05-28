// BerUang via Telegram — catat pemasukan/pengeluaran lewat chat bot.
// Alur: user /mulai → dapat kode → masukin di app (pairing) → chat "bakso 45rb"
// → di-parse → masuk "inbox" KV → app tarik (pull) → masuk ke transaksi user.
// Token bot: env.BERUANG_TG_TOKEN (secret). KV: env.BOT_DATA.

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
  const token = env.BERUANG_TG_TOKEN;
  if (!token) return jres({ error: "BERUANG_TG_TOKEN not set" }, 500);
  let update;
  try { update = await request.json(); } catch { return jres({ ok: true }); }
  const msg = update.message || update.edited_message;
  const chatId = msg && msg.chat && msg.chat.id;
  const text = (msg && msg.text || "").trim();
  if (!chatId || !text) return jres({ ok: true });

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
          `Setelah nyambung, tinggal ketik aja: "bakso 45rb", "gaji 5jt masuk", "bensin 50000" — langsung ke-catat!`);
        return;
      }
      if (/^\/(help|bantuan)\b/i.test(text)) {
        await sendMessage(token, chatId,
          `Cara pakai 🐻:\n• Ketik transaksi natural: "kopi 25rb", "gaji 5jt", "grab 30000"\n• /mulai — hubungkan/ganti akun\n\nNominal otomatis kebaca (rb=ribu, jt=juta).`);
        return;
      }

      // pesan biasa → harus udah linked
      const link = await env.BOT_DATA.get("btg_chat:" + chatId, "json");
      if (!link || !link.email) {
        await sendMessage(token, chatId, `Belum tersambung ke akun BerUang. Ketik /mulai dulu ya bos 🐻`);
        return;
      }
      const entry = parseEntry(text);
      if (entry.error) { await sendMessage(token, chatId, entry.error); return; }
      // push ke inbox email
      const key = "btg_inbox:" + link.email;
      const arr = (await env.BOT_DATA.get(key, "json")) || [];
      arr.push(entry);
      await env.BOT_DATA.put(key, JSON.stringify(arr.slice(-200)), { expirationTtl: TTL_INBOX });
      const tag = entry.jenis === "pemasukan" ? "🟢 Pemasukan" : "🔴 Pengeluaran";
      await sendMessage(token, chatId,
        `✅ Dicatat!\n${tag} <b>${fmtRp(entry.jumlah)}</b>\n${entry.deskripsi} · ${entry.kategori}\n\n<i>Buka app BerUang buat lihat (auto-masuk pas dibuka).</i>`);
    } catch (e) { /* swallow */ }
  })());

  return jres({ ok: true });
}

// ====== PAIR: app kirim {code, email, pullToken} ======
export async function handleBeruangPair(request, env) {
  if (request.method === "OPTIONS") return jres({ ok: true });
  let body; try { body = await request.json(); } catch { return jres({ error: "bad json" }, 400); }
  const { code, email, pullToken } = body || {};
  if (!code || !email || !pullToken) return jres({ error: "code, email, pullToken wajib" }, 400);
  const rec = await env.BOT_DATA.get("btg_code:" + String(code).trim(), "json");
  if (!rec || !rec.chatId) return jres({ ok: false, error: "Kode salah / kadaluarsa. Minta kode baru via /mulai di bot." }, 404);
  const token = env.BERUANG_TG_TOKEN;
  // simpan mapping 2 arah
  await env.BOT_DATA.put("btg_chat:" + rec.chatId, JSON.stringify({ email }));
  await env.BOT_DATA.put("btg_mail:" + email, JSON.stringify({ chatId: rec.chatId, pullToken }));
  await env.BOT_DATA.delete("btg_code:" + String(code).trim());
  if (token) { try { await sendMessage(token, rec.chatId, `✅ Akun <b>${email}</b> tersambung! Sekarang tinggal ketik transaksi, langsung ke-catat 🐻`); } catch (e) {} }
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
