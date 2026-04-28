# CLAUDE.md — Konteks Proyek Financial Tracker

> Dokumen ini berisi konteks penting tentang proyek ini supaya Claude (saya) bisa cepat orientasi tanpa harus eksplor ulang. Update file ini setiap ada keputusan arsitektur baru.

---

## 👤 OWNER PROYEK

- **Nama:** Hendry Phang
- **Email primary:** hendrypangg12@gmail.com
- **Email Anthropic:** hendrypangg12@icloud.com (akun API Claude)
- **Email admin BerUang:** hendryphang12@gmail.com (beda 1 huruf!)
- **WA:** +62 821-2484-8924 (untuk CTA & support)
- **IG:** @hendrypangg
- **Pembayaran:** BCA 7130902183 a/n HENDRY (atau QRIS)

---

## 🌟 PRODUK (BerSatu Suite)

Visi: ekosistem AI assistant untuk UMKM Indonesia dengan branding beruang coklat (Akuntan Gemoy).

### 1. **BerUang** — Personal Finance App (root `/`)
- **Tagline:** "Catet dulu, biar beneran ber-uang"
- **Target:** Personal & UMKM kecil
- **Pricing:** Rp 35rb/bulan atau Rp 125rb lifetime
- **Fitur:** Input via form/chat/struk OCR, dashboard, kategorisasi otomatis (incl. utang/piutang)
- **File utama:** `app.html`, `landing.html`, `index.html` (link-in-bio)
- **Storage:** localStorage + Firebase Firestore sync (cloud)
- **PWA:** ya, dengan service worker

### 2. **BerBisnis** — Kasir & Stok UMKM (`/tokountung/`)
- **Tagline:** "Beruang Bisnis · Atur stok, untung pasti masuk"
- **Target:** UMKM 50-200 SKU (toko sembako, kelontong, FnB)
- **Pricing:** Rp 99rb/bulan (Starter) → Rp 1,5jt/bulan (Pro) → Rp 7,5jt+/bulan (Enterprise)
- **Fitur:** POS, manajemen stok dengan foto, restock dengan HPP weighted average, laporan, BEP tracker, struk thermal
- **File utama:** `tokountung/app.html`, `tokountung/styles.css`, `tokountung/js/*.js`
- **Storage:** localStorage (offline-first) + cloud sync (via Berstock Bot endpoint)

### 3. **Berstock** — AI Agent Stok via Telegram (`/bot/`)
- **Tagline:** "Tanya stok & sales kapanpun via chat"
- **Target:** Owner BerBisnis yang butuh akses cepat dari HP
- **Pricing:** Rp 500rb/bulan early bird, Rp 1,5jt/bulan Pro
- **Tech:** Cloudflare Workers + Anthropic Claude Sonnet 4.6 + KV storage
- **Bot username:** `@BerstockBot` (✅ confirmed, dibuat via @BotFather)
- **8 tools:** get_low_stock, get_product_info, get_today_sales, get_period_summary, get_top_sellers, get_slow_moving, get_restock_suggestion, get_business_overview
- **System prompt:** `bot/src/prompt.js` (Bahasa Indonesia, casual-profesional)
- **Setup guide:** `bot/README.md`

### 4. **BerSatu** — Galaxy Command Center Demo (`/bersatu-demo.html`)
- **Untuk:** Pitch deck visual ke calon klien enterprise
- **Konsep:** 6 AI agent mengorbit orchestrator beruang (Pembukuan, HRD, Stok, Kasir, Sales, Telegram Bot)
- **Belum dibangun:** Pembukuan, HRD, Sales — masih roadmap

---

## 🛠️ TECH STACK

### Frontend (semua app)
- **Vanilla HTML/CSS/JS** — NO framework (intentional, owner solo dev)
- **Chart.js v4.4.1** — line, bar, doughnut charts
- **chartjs-plugin-datalabels** — pie chart labels
- **Tesseract.js v5** — OCR struk belanja (BerUang)
- **Firebase v11 compat** — Auth + Firestore (BerUang only sekarang)
- **Inter font** — primary typeface
- **JetBrains Mono** — untuk Berstock demo command center

### Backend (Berstock Bot)
- **Cloudflare Workers** — serverless edge runtime
- **Cloudflare KV** — multi-tenant data storage
- **`@anthropic-ai/sdk`** — Claude API client
- **Wrangler** — deploy CLI
- Model: **`claude-sonnet-4-6`** (chat-grade, cost-efficient — JANGAN downgrade tanpa diskusi)

### Hosting
- **GitHub Pages** — main hosting (`hendrypangg12.github.io/Financial-tracker/`)
- **Cloudflare Workers** — Berstock bot backend
- **Permanent URLs** — owner butuh URL stabil supaya localStorage tidak reset

---

## 🌳 GIT WORKFLOW

- **Repo:** `hendrypangg12/financial-tracker` (GitHub)
- **Working branch:** `claude/financial-tracking-app-QUmrz` (semua dev di sini)
- **Main branch:** `main` (deploy GitHub Pages dari sini setelah merge)
- **Commit style:** Bahasa Indonesia, descriptive subject, list bullet di body
- **PR creation:** JANGAN auto-create PR kecuali user minta eksplisit

---

## 🎨 BRANDING

### Warna
**BerUang (coklat-krem):**
- `--bg: #fbf6ee` (krem)
- `--ink: #4a3328` (coklat tua)
- `--accent: #c9a352` (emas)
- `--brand: #8b5a2b` (coklat brand)

**BerBisnis (navy-gold):**
- `--bg: #f7f6f2` (off-white warm)
- `--primary: #1e3a5f` (navy korporat)
- `--accent: #c9a352` (emas elegant)

**Berstock Demo (galaxy):**
- Background: `#050816` (deep space)
- Accents: gold + orange (orchestrator), per-agent colors

### Logo
- **File:** `assets/logo-beruang.png`, `mascot-beruang.png`, `mascot-alt.png`, `tokountung/assets/logo-berbisnis.png` — semua identik (akuntan gemoy: beruang coklat pakai kacamata pegang buku)
- **Size:** 512×512 PNG with transparency
- **Cache buster:** sekarang di `?v=2` (bump kalau ganti logo)

---

## 📊 DATA MODEL (BerBisnis)

```js
state = {
  products: [{
    id, sku, nama, kategori, satuan,
    hargaModal, hargaJual, stok, minStok,
    fotoUrl  // base64 dataUrl, max 300px JPEG
  }],
  sales: [{
    id, tanggal (ISO date), waktu, nomor,
    items: [{productId, nama, qty, hargaJual, hargaModal}],
    subtotal, diskon, total, bayar, kembalian,
    metode, pelanggan, profit
  }],
  restocks: [{
    id, tanggal, supplier, items, total, notes
  }],
  kategori: [string],
  settings: {
    namaToko, alamat, telepon, footerStruk,
    biayaTetap, targetUntung
  },
  cart: [...]  // tidak disimpan
}
```

**Key invariant:**
- HPP pakai **weighted average** saat restock: `hargaModal = (stokLama × modalLama + qtyBaru × modalBaru) / totalQty`
- Sale **otomatis kurangi stok**: `p.stok -= qty`
- Delete sale → restore stok

---

## 🧠 SKILLS YANG SUDAH DIPELAJARI / DIPAKAI

### A. Building Apps for Indonesian UMKM
- Bahasa harus **Indonesia casual** (sapa "bos" atau "kak"), bukan formal
- Format Rupiah: **`Rp 1.500.000`** (titik pemisah ribuan, tanpa koma desimal)
- Mobile-first: kebanyakan owner pakai HP, bukan laptop
- Telegram > WhatsApp untuk MVP (WA Business API mahal & butuh approval)

### B. Cloudflare Workers + Claude API
- Workers compatibility: `compatibility_date >= 2024-09-23` + `compatibility_flags = ["nodejs_compat"]` untuk SDK
- KV access via `env.NAMESPACE.get/put/delete` di handler
- Webhook validation: pakai header `X-Telegram-Bot-Api-Secret-Token`
- `ctx.waitUntil(...)` untuk async background jobs (misalnya processQuery setelah ack ke Telegram)

### C. Claude API Best Practices
- **Model untuk chat:** `claude-sonnet-4-6` (default, jangan ganti tanpa diskusi)
- **Adaptive thinking:** `thinking: {type: "adaptive"}` untuk tasks kompleks
- **Prompt caching:** WAJIB untuk cost efficiency
  - System prompt + tools = stable bytes → cache
  - Volatile content (date, biz name) → masuk ke USER message, BUKAN system prompt
  - `cache_control: { type: "ephemeral" }` di system block terakhir
- **Tool use loop:** manual loop lebih kontrol daripada toolRunner untuk error handling
- **Stop reason check:** `end_turn` (selesai) | `tool_use` (eksekusi) | `max_tokens` (kepotong)

### D. UX Quirks yang Ditemui
- **Modal can't close (CSS issue):** `.modal { display: grid }` override `[hidden]`. Fix: `.modal[hidden] { display: none !important }` + inline `style.display`
- **iPad Safari file input:** `<button onclick="input.click()">` blocked. Fix: `<label for="id">` pattern + visually-hidden CSS
- **Native confirm() in IG/FB browser:** blocked. Fix: bikin `customConfirm()` modal sendiri
- **OCR parser too aggressive:** filter date/time patterns, require amount >= 1000
- **localStorage isolation:** beda subdomain = beda storage. User confused saat switch dari raw.githack.com ke github.io. Fix: stick to satu URL permanen

### E. Service Worker / PWA
- Cache-bust progressively: `?v=1 → v=2 → v=20`
- `CACHE_VERSION` di sw.js juga harus bump tiap deploy besar (`beruang-v8 → v9`)
- iOS: `apple-mobile-web-app-capable` + `apple-touch-icon` wajib untuk add to homescreen

### F. Firebase
- Project sudah set up untuk BerUang
- Admin email: `hendryphang12@gmail.com` (perhatikan typo!)
- Collection group query butuh rules: `match /{path=**}/meta/{docId} { allow read: if isAdmin(); }`
- TRIAL_DAYS=0, PRICE_MONTHLY=35000, PRICE_LIFETIME=125000

---

## 🚦 RULES OF ENGAGEMENT

1. **Bahasa Indonesia** untuk semua interaksi dengan user (kecuali code/identifier)
2. **Selalu commit ke branch** `claude/financial-tracking-app-QUmrz`, JANGAN ke main
3. **Jangan create PR** kecuali diminta eksplisit
4. **Jangan ganti model Claude** ke yang lebih kecil tanpa diskusi (default: sonnet-4-6)
5. **Jangan add fitur** di luar yang diminta — owner suka minimalis & focused
6. **Update file ini** kalau ada keputusan arsitektur baru
7. **Saat restart session:** BACA file ini DULU sebelum mulai task baru
8. **Setup actions yang butuh user:** kasih instruksi step-by-step yang jelas (owner non-technical untuk hal cloud/API)

---

## 🗺️ STATUS ROADMAP

| Item | Status | Notes |
|---|---|---|
| BerUang core (input, dashboard, OCR) | ✅ Done | Live di GitHub Pages |
| BerUang Firebase auth + sync | ✅ Done | Admin panel works |
| BerBisnis core (POS, stok, laporan) | ✅ Done | Live di subfolder |
| BerBisnis foto produk | ✅ Done | dengan kamera capture |
| Berstock Bot (kode) | ✅ Done | Tinggal deploy |
| Berstock deployment | ⏳ Pending | User perlu setup tokens (30 menit) |
| BerSatu Galaxy demo | ✅ Done | Untuk pitch ke klien |
| Logo akuntan-gemoy semua app | ✅ Done | v=2 |
| Agent Pembukuan | 📋 Roadmap | Setelah Berstock validated |
| Agent HRD | 📋 Roadmap | Phase 2 |
| Agent Sales/CRM | 📋 Roadmap | Phase 3 |
| WhatsApp Business integration | 📋 Roadmap | Setelah 10+ paying customers |
| iOS/Android native app | 📋 Roadmap | PWA dulu, native nanti |

---

## 💡 PRINCIPLES

- **Build for paying customer first**, fitur kedua → user sudah ada calon pembeli
- **Offline-first di client, cloud sync optional** → owner UMKM internet sering putus
- **Read-only AI (untuk MVP)** → safety. Action AI nanti setelah trust terbangun
- **Indonesian UMKM context** → harga sensitif, butuh edukasi, prefer chat over form
- **Mobile-first selalu** → 80%+ traffic dari HP

---

## 📞 LINKS PENTING

- **Repo:** github.com/hendrypangg12/financial-tracker
- **GitHub Pages live:** hendrypangg12.github.io/Financial-tracker/
- **Branch dev:** claude/financial-tracking-app-QUmrz
- **Preview link (githack):** raw.githack.com/hendrypangg12/Financial-tracker/claude/financial-tracking-app-QUmrz/
- **Anthropic console:** console.anthropic.com (model: claude-sonnet-4-6 default untuk chat)
