# 🤖 Berstock — AI Agent Stok via Telegram

**AI assistant 24/7** untuk owner UMKM Indonesia. Tinggal chat di Telegram — tanya stok, sales, profit, dapat jawaban dalam 3-5 detik.

> Powered by **Cloudflare Workers** (serverless edge) + **Claude Sonnet 4.6** (LLM with tool use).

---

## 📋 Apa yang dilakukan bot ini?

Owner ketik di Telegram:
- *"Stok apa yang habis hari ini?"* → bot list barang kritis + saran
- *"Sales hari ini gimana?"* → revenue + profit + top seller
- *"Apa yang harus saya restock?"* → kombinasi low stock × velocity penjualan
- *"Indomie sisa berapa?"* → detail stok + harga + margin
- *"Best seller minggu ini?"* → top 5 barang laris

Bot membaca data **real-time** dari aplikasi BerBisnis owner (yang ada di `tokountung/`) yang di-sync ke cloud.

---

## 🏗️ Arsitektur

```
[Owner di Telegram]
        ↓ ketik pertanyaan
[Telegram Bot API]
        ↓ webhook
[Cloudflare Worker — berstock-bot]
        ├─→ Cek tenant berdasarkan chat_id (KV)
        ├─→ Ambil data BerBisnis dari KV
        ├─→ Panggil Claude Sonnet 4.6 dengan 8 tools
        ├─→ Loop tool execution
        └─→ Kirim jawaban ke Telegram
        
[BerBisnis Web App]
        ↓ tombol "Sync ke Cloud"
        ↓ POST /api/sync
[Cloudflare Worker]
        └─→ Simpan ke KV: tenant:{id}:data
```

---

## 🚀 Setup — Step-by-step (untuk OWNER bot, sekali aja)

> ⏱️ Total waktu: ~30 menit. Anda butuh: laptop, browser, kartu kredit untuk Anthropic.

### 1️⃣ Bikin Bot di Telegram (5 menit)

1. Buka [@BotFather](https://t.me/BotFather) di Telegram
2. Kirim `/newbot`
3. Nama bot: `Berstock` (display name, bisa apa saja)
4. Username: `BerstockBot` (kalau sudah taken, coba `BerstockApp_bot`, `MyBerstockBot`, dll — harus diakhiri "bot")
5. Bot akan kasih **token** seperti: `8123456789:AAH...xyz`
6. **SIMPAN TOKEN INI** — anggap seperti password

Optional tapi bagus:
- `/setdescription` → "AI Agent Stok untuk UMKM. Tanya stok, sales, profit kapanpun."
- `/setabouttext` → "Powered by Berstock — bersatu.id"
- `/setuserpic` → upload logo beruang
- `/setcommands`:
  ```
  start - Hubungkan ke toko Anda
  status - Cek status & usage
  help - Daftar pertanyaan yang bisa
  unlink - Putuskan dari toko
  ```

### 2️⃣ Daftar Anthropic & Top-up (10 menit)

1. Buka [console.anthropic.com](https://console.anthropic.com) → daftar
2. Verifikasi email + kartu kredit
3. **Top-up minimum $20** (untuk testing 1 bulan; nanti scale up)
4. Settings → API Keys → **Create Key**
5. Copy key seperti `sk-ant-api03-...` — **SIMPAN**
6. (Optional, recommended) Settings → Usage → set **monthly limit $50** supaya tidak kebobolan

### 3️⃣ Daftar Cloudflare & Install Wrangler (10 menit)

```bash
# 1. Daftar di cloudflare.com (free, butuh email + verifikasi)

# 2. Install Wrangler CLI (pakai npm)
npm install -g wrangler

# 3. Login (akan buka browser untuk auth)
wrangler login
```

### 4️⃣ Setup Cloudflare KV Namespaces

Dari folder `bot/`:

```bash
# Bikin 2 KV namespace
wrangler kv namespace create BOT_DATA
# Output: id = "abc123def456..."

wrangler kv namespace create BOT_AUTH
# Output: id = "xyz789..."
```

Edit `wrangler.toml`, uncomment dan paste ID-nya:

```toml
[[kv_namespaces]]
binding = "BOT_DATA"
id = "abc123def456..."  # ← paste dari output di atas

[[kv_namespaces]]
binding = "BOT_AUTH"
id = "xyz789..."         # ← paste dari output di atas
```

### 5️⃣ Set Secrets (4 secrets)

```bash
# Anthropic API key (paste dari step 2)
wrangler secret put ANTHROPIC_API_KEY

# Telegram bot token (paste dari step 1)
wrangler secret put TELEGRAM_BOT_TOKEN

# Webhook secret — generate random string sendiri (32 char)
wrangler secret put TELEGRAM_WEBHOOK_SECRET
# Contoh: 9f8e7d6c5b4a3210fedcba9876543210

# Admin key — untuk endpoint provision tenant baru (32 char random)
wrangler secret put ADMIN_KEY
# Contoh: aaaa1111bbbb2222cccc3333dddd4444
```

> 💡 Tip: generate random string di terminal:
> ```bash
> openssl rand -hex 16
> ```

### 6️⃣ Deploy Worker

```bash
npm install
wrangler deploy
```

Output akan kasih URL seperti: `https://berstock-bot.your-name.workers.dev`

**SIMPAN URL INI** — namanya `WORKER_URL`.

### 7️⃣ Set Telegram Webhook

```bash
# Ganti placeholder di bawah dengan nilai Anda
TOKEN="8123456789:AAH...xyz"
WORKER_URL="https://berstock-bot.your-name.workers.dev"
SECRET="9f8e7d6c5b4a3210fedcba9876543210"

curl -X POST "https://api.telegram.org/bot${TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${WORKER_URL}/webhook\",\"secret_token\":\"${SECRET}\",\"allowed_updates\":[\"message\"]}"
```

Response sukses: `{"ok":true,"result":true,"description":"Webhook was set"}`

### 8️⃣ Test Bot

Buka bot di Telegram (`@BerstockBot` atau username yang Anda pilih) → ketik `/start`.

Bot akan reply:
> Halo! 👋 Saya Berstock.
> Untuk hubungkan ke toko Anda: /start <KODE_TENANT>

✅ **Bot live!** Sekarang tinggal provision tenant pertama.

---

## 👥 Onboarding Customer Pertama

Untuk setiap perusahaan/toko yang langganan:

### A. Bikin tenant baru via API

```bash
ADMIN_KEY="aaaa1111bbbb2222cccc3333dddd4444"
WORKER_URL="https://berstock-bot.your-name.workers.dev"

curl -X POST "${WORKER_URL}/api/provision" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: ${ADMIN_KEY}" \
  -d '{
    "bizName": "Toko Pak Budi",
    "ownerName": "Budi Santoso",
    "plan": "Pro"
  }'
```

Response:
```json
{
  "ok": true,
  "tenant_id": "tnt_a1b2c3d4e5f6",
  "api_key": "abc123...32hexchars",
  "instructions": { ... }
}
```

### B. Berikan ke owner toko (3 hal):

1. **Worker URL**: `https://berstock-bot.your-name.workers.dev`
2. **Tenant ID**: `tnt_a1b2c3d4e5f6`
3. **API Key**: `abc123...`

### C. Owner setup di sisi mereka (5 menit):

**Di BerBisnis Web App:**
1. Buka tab **Pengaturan** → scroll ke bagian "🤖 Cloud Sync (Berstock Bot)"
2. Isi **Worker URL**, **Tenant ID**, **API Key**
3. Klik **💾 Simpan Config**
4. Klik **🔄 Sync Sekarang** → harus muncul "✅ Berhasil! N produk, M transaksi"
5. Aktifkan **Auto-sync tiap 5 menit** (opsional)

**Di Telegram:**
1. Owner buka bot `@BerstockBot` → ketik `/start tnt_a1b2c3d4e5f6`
2. Bot konfirmasi: "✅ Terhubung dengan Toko Pak Budi!"
3. **Done!** Mulai tanya: *"Sales hari ini gimana?"*

---

## 🧪 Testing Lokal

```bash
# Run local dev server
wrangler dev

# Akan jalan di http://localhost:8787
# Untuk test webhook lokal, pakai ngrok atau cloudflare tunnel
```

---

## 📊 Monitoring & Cost

### Lihat live logs
```bash
wrangler tail
```

### Cek usage per tenant
Owner bisa cek sendiri lewat command `/status` di Telegram. Akan tampilkan:
- Query bulan ini
- Estimasi cost API ($)

### Monitor di Anthropic
- [console.anthropic.com](https://console.anthropic.com) → Usage tab → daily breakdown
- Set hard limit $50/bulan supaya safety net

### Monitor di Cloudflare
- Workers dashboard → analytics tab → request count, error rate
- KV dashboard → storage usage

---

## 💰 Cost Estimate

| Komponen | Free tier | Untuk 1 perusahaan |
|---|---|---|
| Cloudflare Workers | 100k req/day | ~Rp 0 |
| Cloudflare KV | 1k writes/day | ~Rp 0 |
| Telegram Bot API | unlimited | Rp 0 |
| Claude Sonnet 4.6 | bayar per pakai | ~Rp 100-150rb/bulan |
| **Total cost ke Anda** | | **~Rp 150rb/bulan** |
| **Anda jual ke klien** | Pro tier | **Rp 1.500rb/bulan** |
| **Margin kotor** | | **~Rp 1.350rb/perusahaan** |

(Estimasi: 30 query/hari, prompt caching aktif)

---

## 🛠️ Troubleshooting

### Bot tidak balas
1. Cek `wrangler tail` untuk error log
2. Cek webhook: `curl "https://api.telegram.org/bot${TOKEN}/getWebhookInfo"`
3. Cek tenant binding: owner ketik `/status` di bot

### Sync gagal dari BerBisnis
1. Cek browser console (F12) untuk error CORS / network
2. Pastikan Worker URL benar (tanpa trailing slash)
3. Cek API key match — bisa cek di Worker via `wrangler kv key get "tenant:tnt_xxx:meta" --binding=BOT_DATA`

### Claude jawab aneh / halusinasi
- Edit `src/prompt.js` → tambah aturan baru
- Test ulang via Telegram
- Re-deploy: `wrangler deploy`

### Cost tinggi
1. Cek query count per tenant via `/status`
2. Sonnet 4.6 ke Haiku 4.5 (turun 70% cost): edit `MODEL` di `src/claude.js`
3. Tambahkan rate limit per tenant (TODO Phase 2)

---

## 📁 File Structure

```
bot/
├── README.md           ← file ini
├── wrangler.toml       ← Cloudflare config
├── package.json        ← dependencies
├── .gitignore
└── src/
    ├── index.js        ← entry point: routing
    ├── prompt.js       ← system prompt Indonesian
    ├── tools.js        ← 8 tool definitions + handlers
    ├── claude.js       ← Claude API + tool loop + caching
    ├── telegram.js     ← Telegram API helpers
    └── storage.js      ← KV wrapper (tenant, auth, usage)
```

---

## 🗺️ Roadmap

**v0.1 (sekarang):** Read-only stok & sales queries
**v0.2:** Push notification proaktif (alert stok habis, sales target)
**v0.3:** Multi-staff per tenant (kasir, manager, owner berbeda akses)
**v0.4:** Voice notes (speech-to-text)
**v0.5:** WhatsApp Business API integration
**v1.0:** Tambah Agent Pembukuan, HRD, CRM (BerSatu Suite)

---

## 📞 Support

- Bug report: GitHub Issues di repo ini
- Sales / demo: WhatsApp [+62 821-2484-8924](https://wa.me/6282124848924)
- Email: hendrypangg12@gmail.com
