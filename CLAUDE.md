# CLAUDE.md — Konteks Proyek Financial Tracker

> Dokumen ini berisi konteks penting tentang proyek ini supaya Claude (saya) bisa cepat orientasi tanpa harus eksplor ulang. Update file ini setiap ada keputusan arsitektur baru.

---

## 🔥 TOP PRIORITY — STATUS SAAT INI (Last Updated: 31 Mei 2026)

### 📱 BerUang Android — 🚀 PRODUCTION APPLIED! Tinggal Tunggu Review

**Status saat ini (Sabtu 31 Mei 2026, 6:10 PM):**
- ✅ Closed test ran **14+ days continuously** with 12 testers (unlock confirmed pagi 31 Mei)
- ✅ **Production application SUBMITTED** ke Google (18:10 WIB)
- ✅ Semua 8 questionnaire question terjawab dalam Bahasa Inggris, di bawah 300 char/field
- ⏳ Google review estimasi **≤7 hari** ("usually 7 days or less, but may occasionally take longer")
- 🎯 **Estimasi LIVE PUBLIC: 1-7 Juni 2026**
- 📧 Update via email ke account owner (hendrypangg12@gmail.com)

**Application timeline (final):**
| Tanggal | Day | Milestone |
|---|---|---|
| Sab 16 Mei | — | 12 tester reached (bos counter) |
| Sen 18 Mei | Day 1 | Google official count start |
| Sab 31 Mei pagi | Day 14 | "Apply for production" UNLOCKED |
| **Sab 31 Mei 18:10** | — | ✅ **APPLICATION SUBMITTED** |
| 31 Mei - 7 Jun | Review | Google manual review (≤7 hari) |
| ~1-7 Juni 2026 | — | 🚀 **APP LIVE PUBLIC!** |

### 📝 Questionnaire jawaban (untuk referensi kalau perlu revisi)

**Section 1: About your closed test**
1. *How did you recruit users?* → Organic via WhatsApp + Instagram (@berstock.ai, @hendrypangg) + public Google Group `beruangbetatesters@googlegroups.com` (anyone-can-join). 12 testers in ~1 day. NO paid testing providers.
2. *How easy was it to recruit?* → Relatively easy. Leveraged existing audience (WhatsApp network + IG followers interested in personal finance). 24 hours to threshold.
3. *Describe engagement* → Strong. One tester logged Rp 50M income with full dashboard usage (confirmed via shared screenshot). Daily entries, dashboard review, debt/receivable tracking, monthly comparison.
4. *Feedback summary + how collected* → Via WhatsApp tester chat + Google Group + Instagram DM. Key feedback: cross-sell banner in dashboard middle pushed main chart below fold → moved to bottom in v39 PWA.

**Section 2: About your app**
5. *Intended audience* → Indonesian adults (18+) and small business owners (UMKM) wanting simple mobile-first personal finance tracking in Bahasa Indonesia. Chat-style input preference, Android-primary users.
6. *How app provides value* → Logs transactions naturally (type 'bakso 45rb' / photo OCR / form). Auto-categorize, dashboards, debts/receivables, recurring bills with Telegram reminders, offline-first cloud sync. Free + Pro optional.

**Section 2 (continued): Forecasts**
7. *Install expectation Year 1* → **0 - 10K** (organic marketing, solo dev, conservative honest estimate)

**Section 3: Production readiness**
8. *What changes after closed test* → (1) Moved cross-sell banner middle→bottom. (2) Added Telegram bot reminders for recurring bills with one-tap 'paid' callback. (3) Improved auth persistence.
9. *How decided app is ready* → 14+ days closed test, 12 engaged testers with real data, no critical bugs, all UX issues fixed and deployed. Core features stable. Backend (Firebase + Cloudflare Workers) scales automatically.

### 🐻 Quick Facts BerUang Play Store
- Package: `id.berstock.beruang`
- Developer: Berstock.id
- App name: "BerUang- Catat Keuangan"
- Google Group: `beruangbetatesters@googlegroups.com` (anyone can join, auto-join)
- Tester opt-in link: https://play.google.com/apps/testing/id.berstock.beruang
- Build method: ✅ **PWA Builder** (pwabuilder.com) — TWA wrapper Chrome Custom Tab
- Update web = update app (auto via Service Worker pickup)

### ⏳ Yang harus dilakukan sambil tunggu review (1-7 Juni)

1. ⚠️ **JANGAN bubarkan closed test** — keep counter ≥12 testers selama review berlangsung. Kalau drop, Google bisa minta clarification atau reject application.
2. 📧 **Monitor email** hendrypangg12@gmail.com — Google kirim update di sini
3. 🎨 **Prep launch assets** (countdown teaser, launch post, reels) — biar pas approved langsung publish
4. 📱 **Test bills push end-to-end** (carry over Day 17 work)
5. 🔧 **Setup webhook BerUang bot** dengan `allowed_updates=[message,callback_query]` — DONE via /api/beruang-setup-webhook (31 Mei)

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
- **File utama:** `app.html`, `landing.html`, `linktree.html` (link-in-bio, sebelumnya index.html)
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
- Sudah kena **5×** di proyek ini: `.modal`, `.auth-form`, `.login-screen`, `#app-main`, `.ai-paywall-modal` (Day 16, 18 Mei 2026)
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
9. **AUTO-UPDATE CLAUDE.md tanpa nanya** (permission default by owner — 16 Mei 2026):
   - Setiap selesai task besar / milestone → langsung update CLAUDE.md
   - Setiap ada keputusan bisnis di chat → langsung catat
   - Setiap ada bug/quirk baru ditemukan → langsung dokumen di section Skills
   - Commit & push auto, gak perlu konfirmasi
   - Tujuannya: memory persistent antar session, gak ada "amnesia" lagi

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

### ✅ DAY 3 (Done — 5 Mei 2026)

**Massive Progress — 14 PR merged ke main hari ini:**

#### **🌟 Homepage Redesign**
| Item | Status | Notes |
|---|---|---|
| Marquee announcement bar (PERTAMA DI INDONESIA) | ✅ Done | NYSE-style ticker dengan 4 talking points scroll, gradient + shimmer + flag wave |
| Hero badge upgrade dengan trophy bounce | ✅ Done | "🏆 PERTAMA DI INDONESIA · POWERED BY ANTHROPIC" |
| Hero claim box dengan border gold | ✅ Done | "1st-of-its-kind di Indonesia" — strong positioning |
| Section "Apa itu POS System?" | ✅ Done | 8 cards edukasi (POS, CRM, Cloud, AI, Inventory, Piutang, PO, Reporting) |
| Section "Fitur Lengkap Berstock" | ✅ Done | 12 cards detail (POS, Stok, AI Bot, Piutang, Customer 360, PO Supplier, Laporan, Struk, Cloud, Offline, Edit Invoice, Security) |

#### **🔍 SEO + Analytics**
| Item | Status | Notes |
|---|---|---|
| SEO comprehensive | ✅ Done | Meta lengkap, canonical, OG, Twitter Card, geo tags Indonesia |
| Structured data JSON-LD | ✅ Done | Organization + SoftwareApplication + FAQPage (5 Q&A untuk Google rich snippet) |
| sitemap.xml + robots.txt | ✅ Done | 8 URL terindex, block AI scrapers (kecuali ClaudeBot) |
| **Google Analytics 4 LIVE** | ✅ Done | **Measurement ID: G-MLBG9XFBMB** |
| GA4 custom events tracking | ✅ Done | 8 events: chat_widget_opened/closed, chat_flow_view, lead_captured, generate_lead, whatsapp_click, try_app_click, page_view |

#### **🤖 Smart Chat Widget Pro**
| Item | Status | Notes |
|---|---|---|
| 22 conversation flow nodes | ✅ Done | start, harga, usaha, ai, beda, fitur, demo, faq (6 sub), integrasi, roi (5 tier), vs-excel, onboarding, founder, klien, pdf, pdf-fnb, wa, more (submenu), fnb, toko, beauty, lain |
| Lead capture form | ✅ Done | Nama + WA + Jenis Usaha sebelum kasih PDF/demo/WA |
| Smart greeting time-based | ✅ Done | Pagi/Siang/Sore/Malam sesuai jam |
| Persistent user data localStorage | ✅ Done | Inget nama bos saat repeat visit |
| Pre-filled WA dengan flow context | ✅ Done | "Saya {nama}, usaha {jenis}, dari chat {flow}" |
| Idle nudge 25 detik | ✅ Done | Re-engagement message |
| ROI Calculator interactive | ✅ Done | 4 tier omzet (<30jt, 30-100jt, 100-500jt, 500jt+) dengan honest "tunggu dulu" untuk yang gak fit |
| Founder story flow | ✅ Done | Humanize brand, link IG @hendrypangg |
| Honest "Klien?" framing | ✅ Done | Frame sebagai Early Adopter benefit (bukan fake-it) |
| Apple-grade animations | ✅ Done | Stagger cascade, hover scale, success checkmark |
| Main menu ringkas 7 tombol + submenu "Info lainnya" | ✅ Done | Reduced from 13 (overwhelming) |

#### **🔔 Lead Notification System**
| Item | Status | Notes |
|---|---|---|
| Cloudflare Worker /api/lead endpoint | ✅ Code ready | bot/src/index.js — handle POST, send Telegram notif, save KV 90 hari TTL |
| Frontend fetch /api/lead saat form submit | ✅ Done | Fire & forget, no blocking UX |
| **PENDING: Worker deploy** | ⏳ User action | `wrangler deploy` dari /bot |
| **PENDING: ADMIN_TELEGRAM_CHAT_ID secret** | ⏳ User action | Get dari @userinfobot, set via wrangler secret put |

#### **🎨 Brand Consolidation**
| Item | Status | Notes |
|---|---|---|
| Hapus SEMUA mention "Claude/Sonnet" → "Anthropic" | ✅ Done | 13 HTML files updated, PDF + PNG re-rendered |
| Hapus nama kompetitor (Moka, Pawoon, Kasir Pintar) | ✅ Done | Ganti pakai kategori generic (POS Premium/Mid/Budget) |
| Pricing simplified: 2 paket only | ✅ Done | Bulanan Rp 500rb / Tahunan Rp 5jt (hemat Rp 1jt) |
| Hapus "Starter Rp 149rb" + "Early Bird" embel-embel | ✅ Done | Premium positioning, no discount-y language |

#### **📝 Register Form Upgrade**
| Item | Status | Notes |
|---|---|---|
| Tambah field Nama Lengkap | ✅ Done | Required text input |
| **Tambah field No. WhatsApp** | ✅ Done | Required, tel type, min 8 digit, pattern angka |
| Tambah field Nama Bisnis | ✅ Done | Optional |
| Auto-save extra profile ke Firestore | ✅ Done | fullName, whatsapp, bizName |
| Format WA otomatis di-clean | ✅ Done | Hapus non-digit |

#### **👑 Admin Panel Upgrade**
| Item | Status | Notes |
|---|---|---|
| Kolom WhatsApp di tabel admin | ✅ Done | Display nomor + clickable wa.me link |
| Tombol Chat WA pre-filled template | ✅ Done | "Halo bos {nama}, saya Hendry dari Berstock 🐻..." |
| Format 08xxx → 628xxx auto-convert | ✅ Done | International format untuk wa.me |
| Tombol +Bulanan / +Tahunan | ✅ Done | Replace +Starter/+Pro lama |
| Plan badge backward-compatible | ✅ Done | Support old (starter/pro) + new (bulanan/tahunan) |

#### **📄 Company Profile PDF**
| Item | Status | Notes |
|---|---|---|
| 11 halaman PDF profesional | ✅ Done | company-profile-berstock.pdf (1.3MB) |
| Section "Nilai Investasi" Rp 16rb/hari | ✅ Done | Anti-objection harga dengan breakdown visual |
| Comparison TANPA vs DENGAN Berstock | ✅ Done | Pain point reframing |
| 7 halaman versi FnB khusus | ✅ Done | company-profile-fnb.pdf — fokus restoran/es krim |
| Bug gradient text di cover (kotak kuning) | ✅ Fixed | Solid color untuk reliable PDF rendering |

#### **🐛 Bug Fixes**
| Bug | Resolution | PR |
|---|---|---|
| Tombol "Coba Gratis" nav broken (#pricing) | Ganti href ke tokountung/app.html | #9 |
| Paket Starter Rp 149rb masih ada di landing | Cleanup di berbisnis-pro.html, landing-berstock.html | #10 |
| Linktree mobile overflow 18px | Tambah overflow-x: hidden | #11 |
| Tombol "Coba Gratis" gak clickable di IG in-app | Hapus target=_blank, tambah z-index, tap area, touch-action | #12 |
| Starter 149rb di app login + admin | Cleanup di app.html, auth.js, admin.js | #13 |

#### **🎯 LEAD POTENSIAL DITEMUKAN!**
- **Edwin Abraham** (`edwinabraham456@gmail.com`) — real user yang daftar trial, sekarang HABIS
- Action: kirim email follow-up dengan template yang udah disiapkan
- Status: ⏳ User action (kirim email besok)

### ✅ DAY 4 (Done — 6 Mei 2026 / malam)

**Focus: App features + Lead engagement validation**

#### **🎉 LEAD VALIDATION**
| Item | Status | Notes |
|---|---|---|
| GA4 LIVE tracking | ✅ Confirmed | 18-20 active users in 30 min, 22 first-visits |
| Chat widget engagement | ✅ Strong | 13/22 buka widget = **59% rate** (industry 5-15%) |
| Session_start: 23, page_view: 29 | ✅ Healthy | First-day organic traffic |
| User_engagement events | ✅ 11 | 47% engagement rate (above benchmark) |

#### **📱 APP UPGRADES**
| Item | Status | Notes |
|---|---|---|
| **Register WA field + Nama** | ✅ Done | Required: nama, email, WA (8-15 digit), bizName optional |
| **Admin panel WA chat link** | ✅ Done | Klik nomor WA → buka WhatsApp pre-filled template |
| **Mode Kasir dengan PIN** | ✅ Done & Tested | Hide profit, harga modal, laporan, settings, admin. Banner gold indicator. |
| **Admin UI Feature Flags Toggle** | ✅ Done | Customize 4 fitur per klien (Multi Gudang, Kredit Limit, Menu Modifier, Custom Bot) |

#### **🐛 BUG FIXES**
- Tombol "Coba Gratis" nav broken → arahkan ke app.html (PR #9)
- Pricing Starter Rp 149rb di landing pages → cleanup ke 2 paket (PR #10)
- Linktree mobile overflow 18px → overflow-x: hidden (PR #11)
- Tombol "Coba Gratis" gak clickable di IG in-app → fix target=_blank + tap area (PR #12)
- Starter 149rb di app login + admin → cleanup (PR #13)
- WA field saat register (PR #14)
- Mode Kasir feature (PR #15)
- Feature Flags admin UI (PR #16)

#### **🎯 LEAD POTENSIAL DI ADMIN PANEL (4 user)**
- berdemo12@gmail.com — Pro (test akun)
- hendrypangg12@icloud.com — Pro (akun bos)
- hendryphang12@gmail.com — Pro (akun bos typo)
- **edwinabraham456@gmail.com — Trial HABIS** (REAL LEAD, action besok!)

### ✅ DAY 5-15 (Done — 7-16 Mei 2026)

**Focus utama: Google Play Store launch BerUang via Closed Testing**

#### **📱 BerUang Android — LIVE di Play Store Closed Beta**

| Item | Status | Notes |
|---|---|---|
| **Package ID** | ✅ `id.berstock.beruang` | Reverse domain naming |
| **Developer name** | ✅ Berstock.id | Brand consistent dengan domain |
| **App name** | ✅ "BerUang- Catat Keuangan" | 23/30 chars |
| **Build method** | ✅ PWA Builder | Upload AAB ke Play Console — TWA wrapper, asset dari berstock.id |
| **AAB version** | ✅ 1.0.0 | Same version untuk Internal + Closed track |
| **Internal testing release** | ✅ "1.0.0 - Initial Launch" | May 15, 2026 11:11 AM |
| **Closed testing release** | ✅ "1.0.0 - Closed Beta" track "Alpha" | May 16, 2026 9:06 AM |
| **Country** | ✅ Indonesia (1 of 177 available) | Single market launch, bisa expand ke SEA setelah Production |

#### **🎨 Store Listing Assets (Hampir Lengkap)**

| Asset | Status | Detail |
|---|---|---|
| **App icon 512×512** | ✅ Done | Mascot beruang berkacamata + buku (gemoy) |
| **Feature graphic 1024×500** | ✅ Done | Cream "BerUang" + tagline + badge "Auto Dashboard" & "Hutang & Piutang" |
| **Phone screenshots** | ✅ Done | 4+ slides: "Tracking lengkap", "Foto sekali auto-masuk", "Catat via chat", "Lihat real-time" |
| **Tablet screenshots** | ❓ Cek status | Opsional |
| **Promo video YouTube** | ⏳ Empty | Opsional, skip aja |
| **Short description** (80) | ✅ Done | "Catat keuangan via chat, foto struk & form. Trial Pro 7 hari" (67/80) |
| **Full description** (4000) | ✅ Started | "🐻 BerUang — Catat dulu, biar beneran ber-uang!" (perlu verify length) |
| **App category** | ⏳ Cek | Should be Finance |
| **Email contact** | ✅ Done | hendrypangg12@gmail.com (assumed) |
| **Website** | ✅ Done | berstock.id |
| **Privacy Policy URL** | ✅ Done | `berstock.id/privacy.html` |

⚠️ **STATUS:** Ada warning "Some languages have errors" — TAPI **BUKAN BLOCKER** (bos koreksi 16 Mei). App udah live di Closed Testing = store listing valid. Warning kemungkinan dari translation tambahan opsional yang belum diisi. Bisa di-cleanup nanti, gak akan block Production apply.

#### **📋 App Content & Policy Forms (10/11 Complete — 91%)**

✅ **VERIFIED DONE (per screenshot 16 Mei 2026):**
- ✅ Set privacy policy → `berstock.id/privacy.html`
- ✅ App access
- ✅ Ads (No ads)
- ✅ Content rating
- ✅ Target audience
- ✅ Data safety
- ✅ Government apps
- ✅ Financial features → YES "Personal finance management"
- ✅ Health
- ✅ Select app category & contact details

⏳ **REMAINING (1 task — non-blocking):**
- ⏳ **Set up your store listing** — Dashboard nunjukin ⚪ tapi store listing substantively complete (bukti: udah live Closed Testing dengan 12 tester install)

⚠️ **CLARIFICATION (16 Mei 2026):** Bos KOREKSI saya — walaupun ada warning "Some languages have errors", itu BUKAN BLOCKER. App udah berhasil masuk Closed Testing dengan asset lengkap (icon, feature graphic, 4+ screenshots, descriptions). Warning kemungkinan dari translation opsional (English, dll) atau Google perfectionist checklist. Tidak block apply Production tanggal 30 Mei.

#### **👥 Closed Testing — Google Groups Method**

| Item | Status | Notes |
|---|---|---|
| **Method** | ✅ Google Groups (bukan Email Lists) | Easier broadcast, gak perlu daftar email 1-1 |
| **Group name** | ✅ `beruangbetatesters` | https://groups.google.com/g/beruangbetatesters |
| **Group email** | ✅ `beruangbetatesters@googlegroups.com` | Added ke Play Console testers |
| **Group permission** | ✅ "Anyone on the web can join" | Auto-join, no manual approval |
| **Tester opted-in counter** | ✅ **12 / 12** (16 Mei 2026) | TARGET REACHED |
| **Feedback URL** | ✅ hendrypangg12@gmail.com | |

#### **⏰ Production Timeline (Estimasi)**

| Tanggal | Milestone |
|---|---|
| **16 Mei 2026** | ✅ 12 tester opted-in — Timer 14 hari START |
| **16-30 Mei** | ⏳ Run closed test 14 days |
| **30 Mei 2026** | ⏳ "Apply for production" button unlocks |
| **30 Mei - 2 Juni** | ⏳ Submit + answer questionnaire |
| **2-7 Juni 2026** | ⏳ Google review production access |
| **~7 Juni 2026** | 🎯 **BERUANG LIVE PUBLIC DI PLAY STORE!** |

#### **🔗 Important Links (BerUang Play Store)**

```
Play Console:  https://play.google.com/console
Closed Testing dashboard: (login → BerUang app → Dashboard)
Tester opt-in link: https://play.google.com/apps/testing/id.berstock.beruang
Store listing (public, after Production): https://play.google.com/store/apps/details?id=id.berstock.beruang
Google Group join: https://groups.google.com/g/beruangbetatesters
```

#### **⚠️ KRITIKAL — JAGA AGAR COUNTER GAK DROP**

- Counter harus tetap **≥12 testers** selama **14 hari berturut-turut**
- Kalau ada tester uninstall → counter drop → **TIMER RESET KE 0!**
- **Saran:** recruit buffer 15-17 tester biar safe
- **Reminder ke tester:** jangan uninstall, buka app sesekali (gak harus tiap hari)

#### **🎨 Marketing Assets BerUang Launch (Day 5-15)**

| Asset | Status | File |
|---|---|---|
| **Behind The Scenes carousel** (6 slides) | ✅ Done (16 Mei) | `beruang-behind-scenes.html` + `carousel-bts/*.png` |
| Countdown teaser 7 days | ⏳ Belum | Saya bisa render kalau diminta |
| Launch day post + story + reels | ⏳ Belum | Saya bisa render kalau diminta |
| WA broadcast template tester | ✅ Done (di chat) | "Jangan uninstall 14 hari" reminder |
| Production questionnaire jawaban | ⏳ Belum draft | Tunggu "Preview questions" dari bos |

### ✅ DAY 17 (Done — 28 Mei 2026)

**Focus: Pengingat tagihan rutin via Telegram (notif H-3 + H-0 + inline "Udah bayar" button)**

#### **🔔 BILL REMINDERS — End-to-end Architecture**

| Komponen | File | Notes |
|---|---|---|
| **App push bills ke bot** | `js/telegram-link.js` | `schedulePushBillsToBot()` debounced 4s, dipanggil dari `saveState()` di `js/storage.js`. Payload: `{email, pullToken, bills, posted}`. Skip kalau payload sama dengan terakhir (cache hash) |
| **Endpoint terima bills** | `bot/src/beruang.js` → `handleBeruangBillsPush` | Validate pullToken, sanitize (max 50 bills, cap hariTagih 1-31), simpan ke KV `btg_bills:<email>` TTL 90 hari |
| **Cron notif H-3 + H-0** | `bot/src/beruang.js` → `sendBillReminders` | List `btg_bills:*` keys, compute due date pakai timezone WIB (UTC+7), kirim notif kalau diff=3 atau diff=0. Cap hari 31 ke last day bulan ini (Feb 30 → 28). Skip kalau bulan ini udah dicatat (via `posted` ledger) atau udah pernah dikirim per-type (dedupe key `btg_notif:` TTL 60 hari) |
| **Wire cron** | `bot/src/index.js` | `scheduled()` tambah `ctx.waitUntil(sendBillReminders(env))` di samping daily digest |
| **Callback handler** | `bot/src/beruang.js` → `handleBillCallback` | Inline button `paid:<billId>:<ym>` → push transaksi ke inbox dengan `recurringId+recurringMonth` (app auto-dedupe via `recurringPostedThisMonth`) → update server-side `posted` ledger → edit pesan jadi "✅ Lunas" |
| **Endpoint debug** | `bot/src/beruang.js` → `handleBeruangBillsTest` | `GET /api/beruang-bills-test?admin_key=...&email=...&force=1&type=h3` — trigger reminder manual buat 1 user atau scan all |

#### **🐛 Telegram Webhook setup requirement (ACTION USER)**

⚠️ **PENDING USER:** Set webhook BerUang bot dengan `allowed_updates=[message,callback_query]` — default Telegram cuma kirim `message`, jadi tombol "✅ Udah bayar" gak akan terdeteksi tanpa update ini.

```bash
TOKEN="<BERUANG_TG_TOKEN>"
curl -X POST "https://api.telegram.org/bot${TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://berstock-bot.hendrypangg12.workers.dev/beruang-webhook","allowed_updates":["message","edited_message","callback_query"]}'
```

#### **📐 Data Flow Lengkap**

```
[App: saveState()] → debounce 4s
  → POST /api/beruang-bills-push {email, pullToken, bills, posted}
  → KV: btg_bills:<email> = {bills, posted, updatedAt}

[Cron 7 AM WIB tiap hari]
  → list btg_bills:* → loop
  → for each bill: diff = bill.hariTagih - today
  → diff===3 OR diff===0 → kirim notif inline_keyboard "Udah bayar"
  → set btg_notif:<email>:<billId>:<ym>:<h3|h0> (dedupe, TTL 60 hari)

[User tap "✅ Udah bayar"]
  → callback_query → handleBillCallback
  → push entry ke btg_inbox:<email> dengan recurringId+recurringMonth
  → update btg_bills.posted (suppress notif H-0 selanjutnya)
  → set btg_notif:...:paid (extra suppress)
  → edit pesan → "✅ Lunas"
  → app pull inbox berikutnya → transaksi masuk, dedupe via recurringPostedThisMonth
```

#### **🧠 SKILL BARU**

- **Cloudflare KV `list({prefix})` untuk iterate user data:** pakai cursor pagination, `list_complete` flag untuk break. Cocok buat cron yang scan semua user (alternatif: track index key terpisah, tapi list prefix simpler kalau jumlah user < 1000).
- **Telegram `allowed_updates` default exclude `callback_query`:** harus eksplisit set via setWebhook. Lesson dipelajari hari ini karena hampir lupa — inline button gak akan jalan tanpa ini.
- **Dedupe pattern multi-layer untuk notif:**
  1. App-side: `recurringPostedThisMonth(id)` cek transaksi dengan `recurringId+recurringMonth`
  2. Server-side: `posted[]` array di `btg_bills:<email>` (di-sync dari app)
  3. Server-side: `btg_notif:<email>:<billId>:<ym>:<type>` dedupe key TTL 60 hari per notification type
  Triple-layer biar gak spam notif walaupun ada race condition app sync vs cron jadwal.

#### **⏳ TODO Day 18+**

| Item | Status | Notes |
|---|---|---|
| **Set webhook allowed_updates** | 🚨 BLOCKER | Tanpa ini, tombol "Udah bayar" gak jalan |
| **Set ADMIN_KEY secret** | ⏳ Mungkin belum di-set | `cd bot && wrangler secret put ADMIN_KEY` (untuk debug endpoint + provision tenant) |
| Test end-to-end | ⏳ User action | Input tagihan di app → 4 detik tunggu → trigger debug endpoint → tap button → verify transaksi masuk app |
| Render asset "Bonus fitur reminder tagihan" | 💡 Saran | IG carousel/reels promote fitur baru ini buat dapet engagement |
| Cross-promo di app dashboard "Sambungkan Telegram → dapet reminder tagihan otomatis" | 💡 Saran | Tambah banner di tab Hutang/Tagihan kalau user belum link TG |

---

### ⏳ PENDING (Day 18+)

**🔥 BerUang Play Store (URGENT — lihat TOP PRIORITY di atas)**
| Item | Status | Notes |
|---|---|---|
| Fix Store Listing "Some languages have errors" | 🚨 URGENT | Manage translations → cari bahasa error → fix field merah |
| Daily monitor counter ≥12 testers | ⚠️ Daily | Play Console Dashboard, 5 menit/hari |
| Recruit buffer 3-5 tester ekstra | 🟡 Recommended | Target 15-17 biar safe kalau ada yang uninstall |
| Generate Production questionnaire draft | ⏳ Before 30 Mei | Screenshot "Preview questions" → Claude generate jawaban |
| Build method tracking | ❓ Cek dengan bos | Tanya: PWA Builder / Bubblewrap / Capacitor / Native? |

**🔥 Lead engagement (carry-over dari Day 4)**
| Item | Status | Notes |
|---|---|---|
| Email Edwin Abraham | ⏳ URGENT | Template ready di chat lama. Send via Gmail manual |
| WA outreach 2 calon klien FnB | ⏳ URGENT | WA opener templates 4 versi (A/B/C/D) di chat lama |

**🤖 Bot deployment & secrets**
| Item | Status | Notes |
|---|---|---|
| Bot worker deploy `/api/lead` | ⏳ User action | `cd bot && wrangler deploy` |
| Set ADMIN_TELEGRAM_CHAT_ID secret | ⏳ User action | Dari @userinfobot, untuk lead notif Telegram |
| Set ADMIN_KEY Cloudflare Worker | ⏳ Belum di-set | Dibutuhkan untuk admin-berstock.html provision |
| GitHub Actions auto-deploy bot | ⏳ Setup ready | File `.github/workflows/deploy-bot.yml` ada, butuh `CLOUDFLARE_API_TOKEN` di GitHub Secrets |
| Token rotation (Anthropic + Telegram + CF API) | ⏳ Pending | WAJIB rotate (sempat lewat chat lama, security risk) |

**📊 Analytics & Marketing**
| Item | Status | Notes |
|---|---|---|
| Mark conversion di GA4 | ⏳ User action | lead_captured + whatsapp_click → mark conversion |
| Update IG bio @berstock.ai | ⏳ User action | Tambah link berstock.id |
| Beruang celebrate mascot upload | ⏳ Pending | User mau upload PNG dari mockup Manus → save ke `assets/mascot-berstock.png` |

**🛠️ Dev work in progress**
| Item | Status | Notes |
|---|---|---|
| Conditional render Feature Flags Step 3-6 | 🟡 In Progress | Step 2/6 selesai (infrastructure di auth.js). Belum: admin UI toggle, render conditional, customize bot, testing |
| Google Login BerBisnis bug | ⚠️ Bug | Email/password works, Google fail (popup-redirect issue) |

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

## 📦 FILES IMPORTANT (Day 2-3)

**Landing Pages:**
- `/index.html` — Homepage utama berstock.id (DAY 3: marquee bar + 8 cards POS edukasi + 12 cards fitur lengkap + chat widget pro 22 flows)
- `/berbisnis-pro.html` — landing utama BerBisnis Pro (DAY 3: pricing 2 tier Bulanan/Tahunan, hapus Starter)
- `/landing.html` — landing BerUang (cream theme + 4 deep features mockup + cross-sell BerBisnis)
- `/landing-berstock.html` — landing bot Telegram (DAY 3: pricing baru Bulanan/Tahunan)
- `/linktree.html` — linktree BerSatu Suite (DAY 3: bug fix overflow mobile)

**Marketing Assets:**
- `/berstock-carousel-day2.html` — 8 slides 1080×1080
- `/berstock-pitch-deck.html` — 10 slides A4 landscape (ready PDF)
- `/reels-berstock-autoplay.html` — 45s auto-play single record
- `/reels-berstock-b.html` — 5 scene templates manual record
- `/admin-berstock.html` — provision tenant form (butuh ADMIN_KEY)
- `/launch-post-berstock.html` + `/launch-story-berstock.html` (DAY 3) — IG launch
- `/perbandingan-harga-pos.html` (DAY 3) — 4 slides perbandingan POS
- `/company-profile-berstock.html` (DAY 3) + PDF — 11 halaman, killer pricing breakdown Rp 16rb/hari
- `/company-profile-fnb.html` (DAY 3) + PDF — 7 halaman khusus FnB

**SEO + Analytics (DAY 3):**
- `/sitemap.xml` — 8 URL terindex
- `/robots.txt` — allow majors, block AI scrapers (kecuali ClaudeBot)
- GA4 ID `G-MLBG9XFBMB` di-embed di index.html (line ~16)
- 8 custom events tracked di chat widget

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
- `js/recurring.js` — Tagihan rutin (state.recurring[] + dashboard reminder card)
- `js/telegram-link.js` — Pairing + pull inbox + push bills (UPDATED Day 17: `schedulePushBillsToBot()` + `pushBillsToBotNow()`)
- `js/storage.js` — `saveState()` panggil push bills ke bot (UPDATED Day 17)

**Bot Berstock (bot/src/):**
- `index.js` — Routes worker, cron handler. Tambah `/api/beruang-bills-push` + `/api/beruang-bills-test` + cron `sendBillReminders` (UPDATED Day 17)
- `beruang.js` — Logic BerUang Telegram. Tambah `handleBeruangBillsPush`, `handleBeruangBillsTest`, `handleBillCallback`, `sendBillReminders`, `sendBillNotif` (UPDATED Day 17)

**Cache Versions Last Update:**
- BerBisnis: styles v=23, app v=19, sales v=7, products v=5, etc.
- BerUang: styles v=27, app v=26, sync v=22, hutang v=1, storage v=21, **telegram-link v=4** (Day 17)
- BerUang Service Worker: **beruang-v39** (Day 17 — bill reminders push)

**Day 16 Bug Fix (18 Mei 2026):**
- Cross-sell BerSatu Suite di dashboard BerUang dipindah dari TENGAH ke BAWAH
  (sebelumnya bikin user harus scroll panjang buat liat chart utama)
- Bug ditemukan via screenshot real tester pakai app
- File: `app.html` line 360 (sebelumnya line 228)
- LESSON LEARNED: Cross-sell/ad placement di MIDDLE = bad UX. Letakkan di BOTTOM
  setelah user finished consuming primary value.

---

## 🐻 MEMORY BERUANG SUITE (Day 2-3 Marketing & IG Launch)

### 📸 IG @berstock.ai LAUNCHED ✅
- **Akun:** instagram.com/berstock.ai
- **Display name:** "Berstock · AI Stock Assistant · POS SYSTEM"
- **Profile pic:** Template Premium (gold ring + dark navy)
- **Bio (Versi 2):**
  ```
  🚀 Pertama di Indonesia
  🤖 POS + AI Bot Telegram untuk UMKM
  Owner tinggal chat, AI yang kerja 🐻
  👇 Mulai gratis sekarang
  ```
- **Status (saat last check):** 3 posts · 9 followers · 123 following · **361 profile views/30 hari** (organic)
- **Connected:** Facebook (Hendry Pang), WhatsApp button
- **Top performer:** Reels "Toko Banyak Hilang" 191 views
- **Insight:** Hook formula "Berapa...?" + "Hilang ga...?" + angka spesifik = engagement tinggi

### 🎨 ASSET MARKETING SUDAH DI-RENDER (Auto by Claude)

**Capability di environment ini (PENTING buat next session):**
- ✅ **Puppeteer + ffmpeg installed** di system
- ✅ Bisa render HTML → PNG (puppeteer screenshot)
- ✅ Bisa render HTML → MP4 (puppeteer frames + ffmpeg encode)
- ❌ TIDAK BISA generate AI image/video langsung
- ❌ TIDAK BISA voice over

**Folder asset tersedia:**
- `/carousel-png/` — 22 PNG slides
  - `slide-1.png` s/d `slide-5.png` — Carousel cover (5 slides "Owner Toko Stok Hilang Ga")
  - `pain-a-1.png` s/d `pain-a-5.png` — Carousel A "Berapa Duit Hilang Tiap Bulan?" 💸
  - `pain-b-1.png` s/d `pain-b-5.png` — Carousel B "Berapa Jam Buang Tugas Manual?" ⏰
  - `pain-c-1.png` s/d `pain-c-5.png` — Carousel C "Pelanggan Diam-Diam Pergi" 😶
  - `launch-post-berstock-id.png` — 1080×1080 launch post berstock.id LIVE 🚀 (NEW Day 3)
  - `launch-story-berstock-id.png` — 1080×1920 launch story berstock.id (NEW Day 3)
- `/berstock-reels-15s.mp4` — Reels 20 detik (originally 15s, di-extend ke 20s comfortable)
- HTML sources: `reels-15s.html`, `reels-20s.html`, `reels-berstock-autoplay.html` (45s), `reels-berstock-b.html`
- HTML carousels: `carousel-berstock-5.html`, `carousel-pain-3x5.html`, `berstock-carousel-day2.html`
- HTML launch: `launch-post-berstock.html`, `launch-story-berstock.html` (NEW Day 3)
- `/profile-pic-berstock.html` — 4 template profile picture
- `/berstock-pitch-deck.html` — 10 slides A4 landscape

### 📅 STRATEGI POSTING (Recommended)

| Hari | Konten | File |
|---|---|---|
| Senin Week 1 | Carousel A (Duit Hilang) | `carousel-png/pain-a-*.png` |
| Rabu Week 1 | Carousel B (Jam Hilang) | `carousel-png/pain-b-*.png` |
| Sabtu Week 1 | Carousel C (Pelanggan Pergi) | `carousel-png/pain-c-*.png` |
| Senin Week 2 | Reels Demo 20s | `berstock-reels-15s.mp4` |
| Rabu Week 2 | Carousel original 5 (intro) | `carousel-png/slide-*.png` |
| Sabtu Week 2 | Pitch deck export PDF (highlight 1 slide) | `berstock-pitch-deck.html` |

### 💰 Lynk.id Setup
- URL: lynk.id/hendrypangg
- 3 produk: E-Book Rp 49.999 / BerBisnis Pro Rp 500rb/bln / BerUang Rp 125rb lifetime
- **TODO bos:** Aktifkan **Affiliate Program** built-in di Lynk (Marketing Tools → Affiliates)
- Komisi rekomendasi: E-Book 30%, BerUang 25%, BerBisnis 15% recurring

### 🤝 PROSES ONBOARDING KLIEN
1. Klien daftar di app `tokountung/app.html`
2. Bos buka **admin-berstock.html** → provision tenant (butuh ADMIN_KEY)
3. Bos copy "📩 Pesan untuk Klien" → kirim WA
4. Klien isi tenant_id + api_key di Pengaturan → Sync
5. Klien chat `/start <tenant_id>` di @BerstockBot
6. **PENDING:** ADMIN_KEY belum di-set di Cloudflare Worker secrets

### 🌐 DOMAIN BERSTOCK.ID — LIVE! (4 Mei 2026)

**STATUS:** ✅ **berstock.id LIVE di GitHub Pages dengan custom homepage profesional**

**Setup Detail:**
- **Domain:** berstock.id (registrar IDwebhost, Rp 225.226/tahun first year)
- **Email:** info@berstock.id (webmail di webmail.berstock.id, hosted di IDwebhost cPanel)
- **DNS:** Cloudflare (account `hendrypangg12@icloud.com`)
- **Nameservers:** `coco.ns.cloudflare.com` + `dave.ns.cloudflare.com`
- **DNS Records di Cloudflare:**
  - 4× A `@` → 185.199.108-111.153 (GitHub Pages, Proxy OFF/DNS only)
  - CNAME `www` → `hendrypangg12.github.io` (Proxy OFF)
  - 9× A records existing IDwebhost (autoconfig, autodiscover, cpanel, webmail, dll) — KEEP untuk email
  - MX, SRV, TXT (SPF/DKIM/DMARC) — KEEP semua untuk email
- **Hosting:** GitHub Pages (FREE) — branch `claude/financial-tracking-app-QUmrz`
- **CNAME file:** `/CNAME` content `berstock.id`
- **Homepage:** `/index.html` (was `home.html`, dark navy + magenta + gold theme, 837 lines)
- **Linktree lama:** `/linktree.html` (was old `index.html`, BerSatu Suite linktree)
- **HTTPS/SSL:** ⏳ Provisioning (Let's Encrypt via GitHub Pages, ~15-30 menit)

**Plan Renewal Tahun Depan:**
- Cuman perpanjang domain (~Rp 240rb/tahun), GA perpanjang hosting IDwebhost
- DNS aman di Cloudflare (gratis selamanya)
- Email `info@berstock.id` akan migrasi ke Gmail Workspace (Rp 65rb/user/bln) atau Zoho Mail (gratis 5GB) sebelum hosting expired

**Lessons Learned:**
- Cloudflare DNS harus **Proxy OFF (DNS only)** untuk GitHub Pages — kalau Proxied (orange cloud) bentrok dengan SSL Let's Encrypt
- IDwebhost Member Area beda dengan cPanel — manage nameserver di Member Area
- Radio button "Gunakan default nameserver" vs "Gunakan nameserver lain" WAJIB pilih kedua, bukan cukup isi field
- Warning Chrome "Connection is not secure" untuk HTTP-only adalah NORMAL, bukan Google blacklist

### 🎯 PENDING ACTION (Next Session)
1. ⏳ **Centang "Enforce HTTPS"** di GitHub Pages settings (setelah SSL ready, ~15 menit dari 17:53 4 Mei)
2. ⏳ **Update IG bio @berstock.ai** dengan link `berstock.id`
3. ⏳ **Update IG bio @hendrypangg** kalau perlu cross-promo
4. ⏳ **Switch GitHub Pages source branch** dari `claude/...` ke `main` (best practice, gak urgent)
5. ⏳ **Rotate Cloudflare API Token** (sebelumnya di chat — tidak aman)
6. ⏳ **Set ADMIN_KEY** di Cloudflare Worker secrets
7. ⏳ **Setup GitHub Secret CLOUDFLARE_API_TOKEN** untuk auto-deploy bot
8. ⏳ **Aktifkan Lynk Affiliate**
9. ⏳ **Upload mascot beruang celebrate** dari Manus → `assets/mascot-berstock.png`
10. ⏳ **Lanjut Tutorial Feature Flags** Step 3-6 (admin UI toggle, conditional render, customize bot per tenant, testing)

### 🎬 SARAN UNTUK NEXT SESSION
- Kalau bos minta video/carousel/visual marketing → langsung pakai puppeteer + ffmpeg yang udah installed
- Pattern HTML render: lihat `carousel-pain-3x5.html` (best practice — multi-slide single file, naming convention pain-{a,b,c}-{1..5})
- Pattern MP4 render: lihat `reels-15s.html` + `/tmp/render-reels.js` (timing JSON config + scene fade transitions)
- Branding warna: Navy `#0a1628` + Magenta `#e91e63` + Gold `#d4af37` + Cyan `#06b6d4`
- Mascot: pakai `tokountung/assets/logo-berbisnis.png` (beruang berdasi)
- Format: Reels 1080×1920 vertical, Carousel 1080×1080 square

### 💡 CONTENT FORMULA YANG TERBUKTI VIRAL
1. **Pertanyaan provokatif** — "Berapa...", "Tau gak...", "Hilang ga..."
2. **Angka spesifik shocking** — "3 dari 5", "5-15%", "96%", "60 jam"
3. **Emoji emosi** — 😰💸⏰😶🔥
4. **Hook 3 detik pertama** harus catch attention
5. **CTA jelas** — Follow + DM "demo"

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
- **🌟 Homepage utama (custom domain):** https://berstock.id ⭐ NEW
- **Linktree BerSatu Suite:** https://berstock.id/linktree.html
- **BerUang app (web/PWA):** https://berstock.id/app.html (atau hendrypangg12.github.io/Financial-tracker/app.html)
- **BerUang Android (Play Store Closed Beta):** https://play.google.com/apps/testing/id.berstock.beruang (Production ~7 Juni 2026)
- **BerUang landing:** https://berstock.id/landing.html
- **BerBisnis app:** https://berstock.id/tokountung/app.html
- **BerBisnis Pro landing:** https://berstock.id/berbisnis-pro.html
- **Berstock landing:** https://berstock.id/landing-berstock.html
- **BerSatu Neural Command:** https://berstock.id/bersatu-demo.html
- **Berstock Bot Telegram:** https://t.me/BerstockBot
- **Berstock Worker:** https://berstock-bot.hendrypangg12.workers.dev
- **Email bisnis:** info@berstock.id (webmail: https://webmail.berstock.id)

### IG Bio Berstock (recommended Versi 2)
```
🤖 Pusing pantau stok 24/7?
💬 Tinggal chat di Telegram, AI jawab
✅ Sales · Stok · Profit realtime
🔥 Early Bird 50 klien pertama
👇 Cek demo
```
