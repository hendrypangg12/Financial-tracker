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
- **Pricing:** Rp 149.999/bulan (Starter) → Rp 500rb/bln (Pro Early Bird, 50 klien pertama) → Rp 1,5jt/bulan (Pro) → Rp 7,5jt+/bulan (Enterprise)
- **Fitur:** POS, manajemen stok dengan foto, restock dengan HPP weighted average, laporan, BEP tracker, struk thermal
- **AUTH:** ✅ Login Firebase (email/password + Google), Trial 3 hari, Paywall, Admin Panel, per-user Firestore sync
- **File utama:** `tokountung/app.html`, `tokountung/styles.css`, `tokountung/js/*.js`
- **Storage:** localStorage (offline-first) + Firestore per-user (auto-sync) + cloud sync ke Berstock bot

### 3. **Berstock** — AI Agent Stok via Telegram (`/bot/`) — ✅ LIVE PRODUCTION
- **Tagline:** "Tanya stok & sales kapanpun via chat"
- **Target:** Owner BerBisnis yang butuh akses cepat dari HP
- **Pricing:** Rp 500rb/bulan early bird, Rp 1,5jt/bulan Pro
- **Tech:** Cloudflare Workers + Anthropic Claude Sonnet 4.6 + KV storage
- **Bot username:** `@BerstockBot` (✅ confirmed, dibuat via @BotFather)
- **Worker URL:** `https://berstock-bot.hendrypangg12.workers.dev`
- **Cloudflare Account ID:** `55dcdad9595a282a448413e8167a21bf`
- **KV Namespaces:** BOT_DATA + BOT_AUTH (sudah dibuat)
- **9 tools:** get_low_stock, get_product_info, get_today_sales, get_period_summary, get_top_sellers, get_slow_moving, get_restock_suggestion, get_business_overview, **list_all_products** (NEW)
- **System prompt:** `bot/src/prompt.js` (Bahasa Indonesia, casual-profesional, satuan dari data)
- **Setup guide:** `bot/README.md`
- **Tenant pertama:** PT SPC = `tnt_a82328a860e4` (api_key disimpan terpisah)
- **Token rotation:** Cloudflare API token expired 1 Jun 2026, Anthropic + Telegram WAJIB di-rotate (sempat lewat chat hari ini)

### 4. **BerSatu Neural Command** — Pitch Demo (`/bersatu-demo.html`)
- **Untuk:** Pitch deck visual ke calon klien enterprise
- **Konsep:** 6 AI agent terhubung neural network ke **CEO PT SPC** (logo beruang berdasi)
- **Layout:** Hub-and-spoke (bukan orbital ring)
- **Background:** Nebula curves + flowing strands (purple/cyan/pink)
- **Agents:** Stok Manager (LIVE), Telegram Bot (LIVE), CEO PT SPC (LIVE), Pembukuan/Sales/HRD (IDLE — roadmap)
- **Brand top-left:** "PT SPC" dengan logo beruang
- **Status badges:** ACT (live, glowing) / IDL (idle, dim)

### 5. **Berstock Landing Page** (`/landing-berstock.html`)
- Sales page singkat untuk closing klien
- Section: Hero + chat mockup, Problem, How it works (3 steps), Features (6 cards), Pricing (Starter/Pro Early Bird/Enterprise), FAQ, CTA WhatsApp
- Theme: Navy + gold (BerBisnis brand)

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
- **BerUang (akuntan gemoy):** `assets/logo-beruang.png`, `mascot-beruang.png` — beruang coklat pakai kacamata pegang buku (FRIENDLY untuk personal user)
- **BerBisnis & Berstock & BerSatu (beruang berdasi):** `tokountung/assets/logo-berbisnis.png`, `assets/logo-berbisnis.png` — beruang dasi navy + clipboard chart + briefcase (PROFESSIONAL untuk B2B)
- **Two-logo strategy:** BerUang = friendly, BerBisnis suite = corporate
- **Size:** 512×512 PNG with transparency
- **Cache buster:** sekarang di `?v=3` (bump kalau ganti logo)

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
- Project: `ber-uang-735b3` (di-share BerUang + BerBisnis)
- Admin email BerUang: `hendryphang12@gmail.com` (perhatikan typo!)
- Admin email BerBisnis (3): `hendryphang12@gmail.com`, `hendrypangg12@gmail.com`, `hendrypangg12@icloud.com`
- Firestore Rules: ada `function isAdmin()` + collectionGroup query untuk admin panel — lihat config terbaru di Firebase Console
- BerBisnis path: `users/{uid}/meta/berbisnis-profile` (subscription) + `users/{uid}/meta/berbisnis-data` (state)
- BerUang path: `users/{uid}/meta/profile` + `users/{uid}/transactions/{docId}`
- TRIAL_DAYS BerUang=0, BerBisnis=3
- BerBisnis pricing: Starter Rp 149.999, Pro Early Bird 500rb, Pro 1.5jt
- iOS Safari/Chrome: SKIP `fbDb.enablePersistence()` — bikin auth flap

### G. CSS Hidden Override Pattern (BUG KAMBUHAN!)
- **Setiap container dengan `display: flex/grid/block` HARUS punya `[hidden] { display: none !important }`**
- Sudah kena 4× di proyek ini: `.modal`, `.auth-form`, `.login-screen`, `#app-main`
- **CHECKLIST baru:** kalau bikin container yang punya display rule, langsung tambah hidden override

### H. Landing Page Pattern yang Bagus (Day 2 learning)
- Hero dengan **dual CTA** (high-intent + low-friction): "💬 WhatsApp" + "🎁 Coba Gratis"
- **Deep features section** dengan zigzag layout (text kiri/kanan bergantian) + mockup visual realistis
- **Floating mascot chat widget** auto-popup setelah 3s — sequential messages dengan typing indicator, 2 CTA
- **Cross-sell banner sebelum pricing** (bukan setelah footer) — visitor non-fit catch sebelum bounce
- **Pre-filled WhatsApp message** di link CTA: `wa.me/X?text=...` biar bos langsung tahu produk apa
- **Mockup data realistis** (Pak Budi Rp 8.5jt overdue, dll) — bukan placeholder lorem ipsum

### I. 3-Layer Auto-Sync Protection (Day 2)
**Pattern yang dipakai di BerBisnis cloud-sync + BerUang sync:**
1. **Debounced push** dari saveState — 1.5s (BerUang) atau 30s (BerBisnis) idle
2. **Periodic interval push** — fallback safety net 5 menit
3. **Tab close push** — `visibilitychange` (mobile) + `beforeunload` (desktop) + `sendBeacon` untuk reliability
- Default auto-sync ON saat first config save
- Stop interval saat logout

### J. Feature Flags Infrastructure (Day 2 — Tutorial Step 2/6 Done)
**File:** `tokountung/js/auth.js`
- `FEATURE_DEFINITIONS` registry — label, desc, icon per flag
- `defaultFeatures()` — generate object semua flag = false
- `hasFeature(profile, flagName)` — safe check (handle profile lama)
- 4 flag awal contoh: `multi_gudang`, `kredit_limit`, `menu_modifier`, `custom_bot_prompt`
- **Belum:** Admin UI toggle (Step 3), conditional render (Step 4), bot per-tenant (Step 5), testing (Step 6)

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

### ✅ DAY 1 (Done)
| Item | Status | Notes |
|---|---|---|
| BerUang core (input, dashboard, OCR) | ✅ Done | Live di GitHub Pages |
| BerUang Firebase auth + sync | ✅ Done | Admin panel works |
| BerBisnis core (POS, stok, laporan) | ✅ Done | Live di subfolder |
| BerBisnis foto produk | ✅ Done | dengan kamera capture |
| BerBisnis Login Auth | ✅ Done | Firebase email/password (Google ada bug) |
| BerBisnis Trial 3 hari + Paywall | ✅ Done | |
| BerBisnis Admin Panel | ✅ Done | List user + aktivasi/deaktivasi |
| BerBisnis Per-user Firestore sync | ✅ Done | Cross-device, auto-migrate |
| Berstock Bot — kode + DEPLOYED | ✅ LIVE | berstock-bot.hendrypangg12.workers.dev |
| Berstock Bot — tenant PT SPC | ✅ Done | tnt_a82328a860e4 active |
| Berstock landing page | ✅ Done | /landing-berstock.html |
| BerSatu Neural Command demo | ✅ Done | CEO PT SPC + 6 agents, hub-spoke |
| Two-logo strategy | ✅ Done | BerUang gemoy / BerBisnis berdasi |
| Bot satuan fix (karton vs pcs) | ✅ Done | satuan dari products lookup |

### ✅ DAY 2 (Done — 2 Mei 2026)

**BerBisnis App — Fitur Baru:**
| Item | Status | Notes |
|---|---|---|
| Tab Piutang Pelanggan | ✅ Done | Filter overdue + tandai lunas 1-klik |
| Tab Pelanggan + History | ✅ Done | Aggregasi dari sales, customer 360°, WA chat link |
| Customer Picker autocomplete | ✅ Done | Datalist + modal picker di checkout & edit |
| Edit Invoice | ✅ Done | Edit qty, harga, items, hapus invoice (auto-restore stok) |
| Laporan Custom Range | ✅ Done | Per tanggal/bulan/tahun/range bebas |
| Dashboard Cash vs Tempo Breakdown | ✅ Done | Pisah uang masuk kas vs piutang baru |
| Laporan per Item Akumulasi | ✅ Done | Ganti Top 10, full table dengan profit & margin |
| Tab PO Supplier | ✅ Done | Ganti tab Restock — auto-create produk + foto faktur + jatuh tempo |
| Foto Upload 1-Tap Clean UX | ✅ Done | Drop zone besar 240×240, naik resolusi 500px |
| Stok Kasir Real-Time vs Cart | ✅ Done | Display sisa = stok - qty cart, badge cart count |
| Filter Kategori + Bounce Animation | ✅ Done | Tab kategori horizontal scroll di kasir |
| Mobile Responsive Compact | ✅ Done | Cards 2-kolom mobile, tabel scroll horizontal |
| Hapus Target & BEP | ✅ Done | Dari dashboard + pengaturan |

**Berstock Bot — Update:**
| Item | Status | Notes |
|---|---|---|
| 3 Tools Baru | ✅ LIVE | get_piutang_summary, get_customer_list, get_customer_history |
| Update get_today_sales | ✅ LIVE | Breakdown cash vs tempo |
| Total tools sekarang 12 | ✅ LIVE | Dari 9 sebelumnya |

**Cloud Sync 3-Layer Protection:**
| Item | Status | Notes |
|---|---|---|
| BerBisnis cloud-sync.js | ✅ Done | Debounce 30s + interval 5min + beforeunload sendBeacon |
| BerUang sync.js | ✅ Done | Debounce 1.5s + interval 5min + visibilitychange + beforeunload |
| Default auto-sync ON | ✅ Done | Untuk user baru saat save config pertama kali |

**Marketing Assets:**
| Item | Status | Notes |
|---|---|---|
| Carousel Day 2 — 8 slides | ✅ Done | berstock-carousel-day2.html (1080×1080) |
| Pitch Deck PDF — 10 slides | ✅ Done | berstock-pitch-deck.html (A4 landscape, ready export PDF) |
| Captions IG (3 versi) | ✅ Done | Long storytelling + short punchy + pain-point focus |
| Reels Auto-Play 45 detik | ✅ Done | reels-berstock-autoplay.html — single screen-record, no edit |
| Landing BerBisnis Pro | ✅ Done | berbisnis-pro.html dengan 6 fitur deep-dive + mockup visual |
| Landing BerUang rebuild | ✅ Done | landing.html — profesional + mockup chat input + OCR demo |
| Cross-sell bidirectional | ✅ Done | BerBisnis ↔ BerUang banner cross-promotion |
| Floating Mascot Chat Widget | ✅ Done | Auto-popup setelah 3s, sequential messages, 2 CTA |
| Admin Provision Tenant Form | ✅ Done | admin-berstock.html — form web untuk bos provision tenant |

**Pricing Update (Day 2):**
- Starter: ~~Rp 99rb~~ → **Rp 149.999/bulan**
- Pro+AI: Rp 500rb/bulan (Early Bird, 50 klien pertama)
- Enterprise: Rp 1.5jt+/bulan
- BerUang Monthly: Rp 35rb/bulan
- BerUang Lifetime: Rp 125rb (sekali bayar)

**Lynk.id Setup:**
- URL: https://lynk.id/hendrypangg
- 3 produk listed: E-Book Cerdas 2026 (Rp 49.999) / BerBisnis PRO+AI Bot (Rp 500rb/bln) / BerUang Lifetime (Rp 125rb)
- Block titles direkomendasikan update dengan emoji + clickbait
- Affiliate program: pakai Lynk built-in (MARKETING TOOLS → Affiliates)
- Komisi rekomendasi: E-Book 30%, BerUang 25%, BerBisnis 15% recurring

**BerUang App — Fitur Baru:**
| Item | Status | Notes |
|---|---|---|
| Tab Hutang & Piutang | ✅ Done | Personal — bukan business. State.hutangs[] |
| 3 summary cards | ✅ Done | Total Piutang (hijau), Hutang (merah), Net Position (gold) |
| Filter jenis + status | ✅ Done | Aktif (default) / overdue / lunas |
| CRUD lengkap | ✅ Done | Add/edit/delete/markLunas/markUnpaid |
| Sync ke Firestore + export | ✅ Done | Field hutangs include di payload |

### ⏳ PENDING (Day 3+)
| Item | Status | Notes |
|---|---|---|
| Google Login BerBisnis | ⚠️ Bug | Email/password works, Google fail (popup-redirect issue) |
| Token rotation (Anthropic + Telegram) | ⏳ Pending | WAJIB rotate (sudah keluar di chat lama) |
| Cloudflare API token rotation | ⏳ Pending | Sempat lewat chat, WAJIB rotate juga |
| GitHub Actions auto-deploy bot | ⏳ Setup ready | File `.github/workflows/deploy-bot.yml` ada, butuh `CLOUDFLARE_API_TOKEN` di GitHub Secrets |
| ADMIN_KEY Cloudflare Worker | ⏳ Belum di-set | Dibutuhkan untuk admin-berstock.html provision |
| Customization 3 Klien (Feature Flags Tutorial) | 🟡 In Progress | Step 2/6 selesai (infrastructure di auth.js). Belum: admin UI toggle, render conditional, customize bot, testing |
| Beruang celebrate mascot upload | ⏳ Pending | User mau upload PNG dari mockup Manus → save ke `assets/mascot-berstock.png` |

### 📋 ROADMAP (Phase 2-3)
| Item | Status | Notes |
|---|---|---|
| Agent Pembukuan | 📋 Roadmap | Setelah Berstock validated 3+ paying customers |
| Agent HRD | 📋 Roadmap | Phase 2 |
| Agent Sales/CRM | 📋 Roadmap | Phase 3 |
| WhatsApp Business integration | 📋 Roadmap | Setelah 10+ paying customers |
| iOS/Android native app | 📋 Roadmap | PWA dulu, native nanti |
| Affiliate dashboard custom | 📋 Roadmap | Kalau Lynk built-in gak cukup |
| Meta Pixel di landing pages | 📋 Roadmap | Untuk track ads conversion |

---

## 📦 FILES IMPORTANT (Day 2)

**Landing Pages:**
- `/berbisnis-pro.html` — landing utama BerBisnis Pro (CTA WA + dual buttons + 6 fitur deep-dive + cross-sell BerUang)
- `/landing.html` — landing BerUang (cream theme + 4 deep features mockup + cross-sell BerBisnis)
- `/landing-berstock.html` — landing bot Telegram (existing, harga Starter sudah update)
- `/index.html` — linktree BerSatu Suite

**Marketing Assets:**
- `/berstock-carousel-day2.html` — 8 slides 1080×1080
- `/berstock-pitch-deck.html` — 10 slides A4 landscape (ready PDF)
- `/reels-berstock-autoplay.html` — 45s auto-play single record
- `/reels-berstock-b.html` — 5 scene templates manual record
- `/admin-berstock.html` — provision tenant form (butuh ADMIN_KEY)

**App BerBisnis (tokountung/):**
- `tokountung/js/piutang.js` — tab Piutang Pelanggan
- `tokountung/js/customers.js` — tab Pelanggan + customer picker (CRUD + history)
- `tokountung/js/edit-sale.js` — edit invoice (qty, harga, items, hapus)
- `tokountung/js/restock.js` — PO Supplier (auto-create produk + foto faktur)
- `tokountung/js/cloud-sync.js` — 3-layer auto-sync ke Berstock bot
- `tokountung/js/auth.js` — feature flags infrastructure (FEATURE_DEFINITIONS, hasFeature)

**App BerUang (root):**
- `js/hutang.js` — Tab Hutang & Piutang personal (NEW Day 2)
- `js/sync.js` — 3-layer auto-sync ke Firestore (UPDATED Day 2)

**Cache Versions Last Update (Day 2):**
- BerBisnis: styles v=23, app v=19, sales v=7, products v=5, etc.
- BerUang: styles v=21, app v=22, sync v=22, hutang v=1, storage v=21

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

### Live Production Links
- **BerUang app:** hendrypangg12.github.io/Financial-tracker/app.html
- **BerUang landing:** hendrypangg12.github.io/Financial-tracker/landing.html
- **BerUang link-in-bio:** hendrypangg12.github.io/Financial-tracker/index.html
- **BerBisnis app:** hendrypangg12.github.io/Financial-tracker/tokountung/app.html
- **Berstock landing:** hendrypangg12.github.io/Financial-tracker/landing-berstock.html
- **BerSatu Neural Command:** hendrypangg12.github.io/Financial-tracker/bersatu-demo.html
- **Berstock Bot Telegram:** https://t.me/BerstockBot
- **Berstock Worker:** https://berstock-bot.hendrypangg12.workers.dev

### IG Bio Berstock (recommended Versi 2)
```
🤖 Pusing pantau stok 24/7?
💬 Tinggal chat di Telegram, AI jawab
✅ Sales · Stok · Profit realtime
🔥 Early Bird 50 klien pertama
👇 Cek demo
```
