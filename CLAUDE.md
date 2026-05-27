# CLAUDE.md — Konteks Proyek Financial Tracker

> Dokumen ini berisi konteks penting tentang proyek ini supaya Claude (saya) bisa cepat orientasi tanpa harus eksplor ulang. Update file ini setiap ada keputusan arsitektur baru.

---

## 🔥 TOP PRIORITY — STATUS SAAT INI (Last Updated: 27 Mei 2026)

### 🆕 SESI 27 MEI 2026 — yang baru selesai (detail di section bawah)
1. **Homepage**: section showcase "Kantor Virtual" (preview video + tombol LIVE) di `index.html`.
2. **🟢 LIVE PRESENCE**: tiap orang buka BerUang/BerBisnis = 1 beruang di kantor virtual
   (`pt-beruang-pang-office.html`) + badge "● N ONLINE". Firebase RTDB udah aktif. FITUR LIVE.
3. **🐛 Fix**: tombol Admin Panel di dropdown BerUang (salah nama fungsi `switchTab`).
4. **🔄 Auto-update PWA**: SW + controllerchange auto-reload (BerUang & BerBisnis) →
   user homescreen otomatis dapat versi terbaru. BerBisnis baru dikasih SW.
5. **🧹 Tombol "Bersihkan Cache & Muat Ulang"** di BerUang (menu akun) & BerBisnis (Pengaturan)
   — escape hatch update manual, data aman.
6. **📲 Insight**: tester Play Store (TWA) AUTO dapat update web, gak perlu APK baru.
> Branch deploy live: `claude/financial-tracking-app-QUmrz` (yg di-serve berstock.id).
> Branch kerja sesi ini: `claude/code-session-work-PkbMp` (CLAUDE.md + catatan).

### 📱 BerUang Android di Google Play Store — HAMPIR LIVE!

**Status saat ini (Day 1 of 14 per Google counter):**
- ✅ App live di Closed Beta Play Store (`id.berstock.beruang`)
- ✅ Store listing SUBSTANTIVELY COMPLETE
- ✅ **12/12 tester opted-in** sejak Sabtu 16 Mei 2026
- ✅ Google official counter: **"12 testers have currently been opted in for 1 day"** (per 18 Mei pagi)
- ✅ **Tester aktif pakai app** — bukti via screenshot 18 Mei (user "R" lagi pake dashboard, data real Rp 50jt)
- ✅ 10/11 App content forms done
- ✅ Bug fix dari real tester feedback (18 Mei): cross-sell pindah ke bawah dashboard
- 🎯 **Estimasi LIVE PUBLIC: ~5-8 Juni 2026**

**Real tester engagement confirmed!** Tester "R" pake BerUang dengan data real (Rp 50jt pemasukan), bukan cuma install lalu uninstall. Engagement = quality signal untuk Production review.

### 🎯 STATUS GROUP & GAP ANALYSIS (per 18 Mei 10:12 AM)

| Source | Angka |
|---|---|
| **Google Group `beruangbetatesters` members** | **20** ✅ |
| **Play Console testers opted-in** | **12** |
| **GAP (join group, belum install)** | **8 orang** |

**OPPORTUNITY:** Dorong 8 orang ini install app → counter bisa naik ke 16-20.
Buffer ultra-safe dari risk uninstall.

**Bos udah post di group dengan pin:** "BANTU KLIK LINK INI - Tolong dibantu teman2 klik link ini Dan buat idnya..."

⚠️ **CATATAN PENTING (KOREKSI 18 Mei oleh bos):**
> **PENCAPAIAN 12 TESTER: Sabtu 16 Mei 2026** (achievement bos, dalam 1 hari!)
>
> Google's "14-day continuous" counter punya delay sendiri (kemungkinan
> 24-36 jam stabilisasi atau timezone UTC). Per Senin 18 Mei pagi,
> counter Google nunjukin "1 day".
>
> **2 angka beda:**
> - Achievement bos: 12 tester reached **Sab 16 Mei** ✅
> - Google counter: 1 day per **Sen 18 Mei** (Day 1 of 14)
>
> **Yang Google pake buat unlock Production = counter mereka.**
> Tapi pas isi questionnaire, BANGGAKAN pencapaian Sabtu sebagai
> "achieved 12 testers in 1 day via WA + Google Group + Instagram".

### 📅 Timeline Production (REVISI per Google counter)

| Tanggal | Day | Milestone |
|---|---|---|
| **Sab 16 Mei** | — | 12 tester reached (bos counter) |
| **Sen 18 Mei** | Day 1 | Google official count start |
| **Sel 27 Mei** | Day 10 | 4 hari lagi sebelum unlock |
| **Sab 31 Mei** | Day 14 | 🎯 "Apply for production" UNLOCK |
| **31 Mei - 3 Jun** | — | Submit + answer questionnaire |
| **3-7 Juni** | — | Google review production |
| **~5-8 Juni 2026** | — | 🚀 **APP LIVE PUBLIC!** |

**Catatan PENTING (bos koreksi 16 Mei 2026):**
> Walaupun dashboard nunjukin "10/11 complete" dan ada warning "Some languages have errors", FAKTA-nya app udah berhasil masuk Closed Testing dengan 12 tester install. Artinya store listing minimum udah valid. Warning yang muncul kemungkinan:
> - Translation tambahan (English, dll) yang opsional belum diisi → bisa di-remove via "Manage translations" kalau gak dipake
> - Tablet screenshots opsional belum di-upload
> - Promo video YouTube opsional kosong
>
> **TIDAK akan block "Apply for Production" tanggal 30 Mei nanti.**

**Yang HARUS dikerjain di session berikutnya (urutan prioritas REVISI):**

1. ⚠️ **Daily monitor counter** (5 menit/hari) — PALING KRITIKAL
   - Buka [play.google.com/console](https://play.google.com/console) → Dashboard
   - Pastikan counter "X testers currently opted-in" tetap **≥12**
   - Kalau drop di bawah 12 → TIMER RESET, emergency recruit pengganti

2. 🛡️ **Recruit BUFFER 3-5 tester ekstra** (target 15-17 total) biar safe kalau ada uninstall

3. 📝 **Generate Production questionnaire draft** (sebelum 30 Mei)
   - Klik "Preview questions" di Play Console Dashboard
   - Screenshot pertanyaan → kasih ke Claude → generate jawaban
   - Pertanyaan tipikal: cara recruit tester, feedback received, changes made, user discovery

4. 🎨 **Marketing pre-launch sambil nunggu 14 hari:**
   - Behind The Scenes carousel: ✅ DONE (16 Mei, file `beruang-behind-scenes.html`)
   - Countdown teaser 7 days story: ⏳ TBD
   - Launch day post + reels: ⏳ TBD

5. 🔧 **(OPSIONAL, low priority) Cleanup Store Listing warning**
   - Buka Play Console → Set up your store listing
   - Klik "Manage translations" → hapus bahasa selain Indonesian kalau gak dipake
   - Atau biarin aja, bukan blocker

### 🐻 Quick Facts BerUang Play Store
- Package: `id.berstock.beruang`
- Developer: Berstock.id
- App name: "BerUang- Catat Keuangan"
- Google Group: `beruangbetatesters@googlegroups.com` (anyone can join, auto-join)
- Tester opt-in link: https://play.google.com/apps/testing/id.berstock.beruang
- Build method: ✅ **PWA Builder** (pwabuilder.com) — upload AAB ke Play Console
  → APK adalah **TWA (Trusted Web Activity)** wrapper Chrome Custom Tab
  → Load content dari `berstock.id/app.html` setiap launch
  → Asset CSS/JS gak di-bundle, fetch dari web
  → Update web = update app (asal Service Worker pickup)
  → JANGAN tester uninstall — counter reset!

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
- **Tenant pertama:** PT SPC = `tnt_a82328a860e4` (api_key disimpan terpisah) — NOTE: "PT SPC" di sini = tenant/client data (bukan brand). Brand parent company sekarang = **PT Beruang Pang** (rename 27 Mei 2026)
- **Token rotation:** Cloudflare API token expired 1 Jun 2026, Anthropic + Telegram WAJIB di-rotate (sempat lewat chat hari ini)

### 4. **BerSatu Neural Command** — Pitch Demo (`/bersatu-demo.html`)
- **Untuk:** Pitch deck visual ke calon klien enterprise
- **Konsep:** 6 AI agent terhubung neural network ke **CEO PT Beruang Pang** (logo beruang berdasi)
- **Layout:** Hub-and-spoke (bukan orbital ring)
- **Background:** Nebula curves + flowing strands (purple/cyan/pink)
- **Agents:** Stok Manager (LIVE), Telegram Bot (LIVE), CEO PT Beruang Pang (LIVE), Pembukuan/Sales/HRD (IDLE — roadmap)
- **Brand top-left:** "PT Beruang Pang" dengan logo beruang
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
9. **AUTO-UPDATE CLAUDE.md tanpa nanya** (permission default by owner — 16 Mei 2026; diperkuat 27 Mei 2026):
   - **Setiap selesai task (gak harus milestone besar)** → langsung update CLAUDE.md
   - Setiap ada keputusan bisnis di chat → langsung catat
   - Setiap ada bug/quirk baru ditemukan → langsung dokumen di section Skills
   - Setiap ganti arah/fokus baru → catat status terakhir biar sesi depan nyambung
   - Commit & push auto, gak perlu konfirmasi (JANGAN tanya "mau di-update?")
   - **WAJIB baca file ini DULU tiap awal sesi** — itu jaminan "gak mulai dari 0"
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
| BerSatu Neural Command demo | ✅ Done | CEO PT Beruang Pang + 6 agents, hub-spoke |
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

### ⏳ PENDING (Day 16+)

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
| **Beruang CRM (monorepo subfolder)** | 🆕 Day 17 Plan | Rebuild di `/beruang-crm/` folder repo ini — full-stack React + Vite + Express + SQLite + AI Haiku 4.5. Integration dengan BerBisnis (customer data sync) |
| Agent Pembukuan | 📋 Roadmap | Setelah Berstock validated 3+ paying customers |
| Agent HRD | 📋 Roadmap | Phase 2 |
| Agent Sales/CRM | 📋 Roadmap | Phase 3 |
| WhatsApp Business integration | 📋 Roadmap | Setelah 10+ paying customers |
| iOS/Android native app | 📋 Roadmap | PWA dulu, native nanti |
| Affiliate dashboard custom | 📋 Roadmap | Kalau Lynk built-in gak cukup |
| Meta Pixel di landing pages | 📋 Roadmap | Untuk track ads conversion |

---

## 🆕 BERUANG CRM — ⏸️ PAUSED (deploy in progress, 24 Mei 2026)

**STATUS:** ⏸️ **PROJECT DISIMPAN SEMENTARA** — bos mau fokus fitur baru dulu.

### Apa yang udah selesai:
- ✅ Full code imported + integration BerBisnis/Berstock (commit `1a7932f`)
- ✅ Rename Cekat → Beruang CRM (commit `2d8e50f`)
- ✅ Frontend UI: BerBisnis Integration + AI Suggestions pages (commit `8a9a910`)
- ✅ Deploy config: package.json + railway.json + DEPLOY.md (commit `b3fc458`)
- ✅ Tested local: build OK, server start OK, UI render OK

### Deploy progress (Railway) — TINGGAL LANJUT:
- ✅ Railway project created (project name: `beneficial-eagerness`)
- ✅ GitHub repo connected: `hendrypangg12/Financial-tracker`
- ✅ Branch: `claude/financial-tracking-app-QUmrz`
- ✅ Root Directory: `beruang-crm`
- ⏳ **PENDING (lanjut dari sini):**
  - Set env variables (JWT_SECRET, ANTHROPIC_API_KEY, CLIENT_ORIGIN=*, NODE_ENV=production, DATABASE_PATH=/data/data.db)
  - Add persistent volume → mount `/data` 1GB
  - Generate public domain
  - Set Berstock bot Cloudflare secrets (BERUANG_CRM_BRIDGE_KEY, BERUANG_CRM_API_URL)
  - End-to-end test

**Untuk lanjut deploy:** baca `beruang-crm/DEPLOY.md` Step 5-8.

---

## 📦 BERUANG CRM — MIGRATED & READY (Day 17, 19 Mei 2026)

**STATUS:** ✅ **FULL IMPORTED** ke `/beruang-crm/` (commit `2ca2aa8`)

**Source:** GitHub tarball public dari `hendrypangg12/Claude` branch `claude/new-session-8fl5o`. 36 file (15 client + 16 server + 4 root marketing) ke-download via curl, tanpa copy-paste manual.

**Project internal name:** "BerBisnis (MVP)" — namespace integrate dengan BerBisnis POS.


### Tech Stack
- **Server:** Node.js + Express + better-sqlite3 + bcryptjs + jsonwebtoken + @anthropic-ai/sdk + twilio
- **Client:** React + Vite + React Router
- **AI:** Claude Haiku 4.5 + prompt caching
- **WA:** Twilio Sandbox (sandbox number `+1 415 523 8886`)
- **Storage:** SQLite (`data.db`, gitignored, auto-generated)

### Fitur yang Udah Ada
- 🔐 Auth (JWT, register/login)
- 👥 Contact CRUD + tag + notes
- 📥 CSV bulk import (max 500 per file)
- 💬 Inbox conversation + chat view (status: open/closed)
- 🤖 AI auto-reply Claude Haiku (di luar jam kerja)
- 🧠 AI Suggest (admin minta saran balasan)
- ⚡ Quick Reply templates
- 📚 Knowledge Base editor (SOP bisnis untuk AI context)
- 🕐 Working hours config
- 👋 Auto-greeting customer baru
- 📱 Twilio WhatsApp integration (sandbox)
- 📊 Dashboard analytics 14-hari
- 🎭 4 tone AI (Ramah/Formal/Santai/Singkat)

### Database Schema (Current)
```sql
users (id, email, name, password_hash, created_at)
contacts (id, user_id, name, phone, email, tag, notes, created_at)
conversations (id, user_id, contact_id, channel, ai_enabled, status, updated_at)
messages (id, conversation_id, sender ['customer'|'agent'|'ai'], body, created_at)
knowledge (id, user_id, content, updated_at)
settings (user_id, working_hours_enabled, work_start, work_end, work_days,
          business_name, greeting, ai_tone, updated_at)
quick_replies (id, user_id, label, body, created_at)
```

### Integration Plan dengan BerBisnis + Berstock (NEXT)

**Phase 1 — Schema Extension:**
```sql
ALTER TABLE contacts ADD external_id TEXT;        -- link ke BerBisnis customer
ALTER TABLE contacts ADD total_spent INTEGER DEFAULT 0;
ALTER TABLE contacts ADD total_outstanding INTEGER DEFAULT 0;
ALTER TABLE contacts ADD transaction_count INTEGER DEFAULT 0;
ALTER TABLE contacts ADD last_purchase_date TEXT;
ALTER TABLE contacts ADD customer_status TEXT DEFAULT 'active';
ALTER TABLE contacts ADD loyalty_score INTEGER DEFAULT 0;

CREATE TABLE berbisnis_sync (
  user_id INTEGER PRIMARY KEY,
  tenant_id TEXT,           -- link ke Berstock bot tenant
  api_key TEXT,
  last_sync_at TEXT,
  auto_sync INTEGER DEFAULT 1
);

CREATE TABLE ai_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  contact_id INTEGER NOT NULL,
  trigger_type TEXT,        -- 'loyalty' | 'outstanding' | 'winback'
  suggested_message TEXT,
  status TEXT DEFAULT 'pending',
  telegram_message_id TEXT,
  created_at TEXT,
  sent_at TEXT
);
```

**Phase 2 — New Endpoints:**
- `POST /api/sync/berbisnis` — Receive customer data from BerBisnis cloud-sync
- `POST /api/ai-suggestions/scan` — Trigger AI analyze 3 use case (loyalty/utang/winback)
- `POST /api/ai-suggestions/:id/approve` — Approve & send WA
- `POST /api/telegram/webhook` — Bridge ke Berstock bot

**Phase 3 — Berstock Bot Extension:**
- Tambah handler di `bot/src/` untuk push suggestion ke owner Telegram
- Inline keyboard "Approve / Reject / Edit" callback
- Call back ke Beruang CRM `/api/ai-suggestions/:id/approve`

### 3 Killer Use Case (confirmed bos 19 Mei)

1. **💰 Loyalty Follow-up** — Customer baru beli / repeat → thank you + cross-sell
2. **💸 Outstanding Reminder** — Tempo > 7 hari → polite WA reminder
3. **🔄 Win-back Campaign** — Loyal customer (>3 trx) tapi gak balik 30 hari → promo

### Bisnis & Marketing Asset (Already Built!)
- ✅ `pitch-deck.html` — 13-slide pitch deck standalone HTML
- ✅ `sales-kit.md` — outreach script + objection handler
- ✅ `mockup.html` — static preview untuk demo
- ✅ README.md detailed dengan setup guide + pricing AI

### Cost Estimate AI
- Claude Haiku 4.5: Input $1/1M token, Output $5/1M token
- Prompt caching aktif → 90% hemat req ke-2 dst
- 1 chat (10 turn) ≈ Rp 50-200

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

**Cache Versions Last Update (per 27 Mei 2026):**
- BerUang: **styles v=39**, **app v=36**, firebase-config v=22, presence v=2, **sync v=24**,
  **hutang v=2**, **storage v=23**, **dashboard v=25**, ai-advisor v=6, **onboarding v=6**,
  **recurring v=1** (baru) · Service Worker **beruang-v32**
- **Dashboard kartu "💸 Hutang & Piutang"** (`renderHutangSummary`): Piutang hijau + Hutang
  merah + posisi bersih + link ke tab Hutang. Pakai field `nominal`.
- **🔁 Tagihan Rutin + 🔔 Pengingat (`state.recurring[]` + `js/recurring.js`):** template
  tagihan bulanan (kost/cicilan/langganan). Kartu "Pengingat" di dashboard = tagihan rutin
  belum dicatat bulan ini (1-tap "✓ Catat" → transaksi ber-tag `recurringId`+`recurringMonth`
  anti-dobel) + hutang/piutang jatuh tempo ≤7hr/lewat. Dibuat dari onboarding (kost/cicilan)
  & checkbox "Jadikan tagihan rutin" di form Tambah. Kelola/hapus di panel "Tagihan Rutin"
  (tab Tambah). recurring ikut persist (storage+sync+export/reset).
- **🐛 Fix modal ketutup nav:** `.modal` z-index 50 → **1100** (di atas bottom-nav 1000) →
  tombol Simpan hutang/edit gak ketutup menu.
- **💵 Format ribuan GLOBAL semua input uang:** class `.money-input` + listener global di
  app.js (`fmtThousands` saat ketik, `parseMoney` saat baca). Input jadi `text inputmode=
  numeric` (BUKAN type=number, biar bisa titik). Kena: Tambah jumlah, Edit jumlah, Hutang
  nominal, Target. **POLA PENTING:** kalau nambah input uang baru → kasih class money-input
  + baca via parseMoney + isi via fmtThousands.
- **🔄 Reset Data & Mulai Ulang (item dropdown akun, mobile-friendly):** buat user yg
  coba-coba dulu lalu mau serius. Konfirmasi → `resetAll()` (hapus transaksi/hutang/aset/
  userName) + `clearOnboardingDone()` → langsung buka wizard Setup Dana Awal lagi.
  (`btn-reset-data` di `js/app.js`; `.user-item-danger` merah. Reset lama `btn-reset` cuma
  ada di topbar desktop yg ke-hide di mobile.)
- BerBisnis: styles v=24, **app v=22**, firebase-config v=4, auth v=7 · Service Worker
  **berbisnis-v2** (BARU — sebelumnya BerBisnis gak punya SW)
- **WAJIB tiap deploy:** bump `?v=` file yg diubah DI app.html + bump `CACHE_VERSION`
  & samain CORE di sw.js (BerUang `sw.js`, BerBisnis `tokountung/sw.js`). Itu pemicu
  auto-update. Lupa bump = user lama gak ke-update.

**📲 PLAY STORE / TWA = AUTO DAPAT UPDATE WEB (penting, 27 Mei 2026):**
APK BerUang (PWA Builder → TWA) cuma cangkang yg load `berstock.id/app.html` tiap launch.
**Update web = update app** — tester Closed Testing OTOMATIS dapat update tanpa download
APK ulang (APK tetap v1.0.0). Android (Chrome engine) pickup SW jauh lebih patuh dari iOS.
AAB baru cuma perlu kalau ganti package/ikon/URL. Counter 12 tester gak kepengaruh update.

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

### 🏢 PT BERUANG PANG — VIDEO KANTOR PIXEL-ART (NEW, 27 Mei 2026)

**File:** `pt-beruang-pang-office.html` (source) + `pt-beruang-pang-office.mp4` (output)
**Tujuan ganda (request bos):** (1) konten sosmed — "perusahaan virtual" biar orang tertarik;
(2) inventory personal — biar bos inget udah bikin project apa aja.

**Spec:** 1080×1080 (square IG), **45 detik**, 15fps (675 frame), Canvas pixel-art.
**Render:** `node /tmp/ui-render/render-office-video.cjs` (puppeteer frame-by-frame + ffmpeg H.264).
Deterministik via `window.__renderFrame(frame)` — TAPI pakai `Math.random()` di pathfinding,
jadi tiap render hasil gerakannya beda (nomor frame gak bisa dibandingin antar-render).

**Isi kantor (8 ruangan = 8 produk/agent):**
- BERUANG/Agent Finance, BERBISNIS/Agent Kasir, BERSTOCK/Agent Stok (LIVE)
- CEO PANG/Ceo Pang (Founder, ngerokok + ngobrolin bisnis, **gak pernah keluar ruangan**)
- BERUANG CRM/Agent CRM (BUILDING), PEMBUKUAN/SALES/HRD (SOON, dim)
- Beruang humanoid (kaki-tangan, walk cycle, blink, typing, name-tag, chat & activity bubble)
- Pantry lantai beda (ubin dapur) + coffee machine/dispenser/sofa, beruang bawa kopi
- Dekorasi: AC, poster, rak buku, tanaman, jam, whiteboard, karpet
- Pintu MASUK/KELUAR, 2 tamu (1 di sofa, 1 dekat pintu), **sekretaris cewek** di ruang CEO
- Title bar pakai **logo `assets/logo-berbisnis.png`** (beruang berdasi) — bukan emoji

**Tuning anti-"beruang ilang":** `MAX_WALKERS=2` + CEO `roam:false` → minimal banyak desk keisi.

**LIVE ONLINE (27 Mei 2026):** HTML sekarang dual-mode — dibuka di browser = **animasi jalan terus** (live loop `setInterval` 15fps) + responsive `min(100vw,100vh)`; dipakai render = `__renderFrame` auto-stop live loop + `resetSim()` → video tetap deterministik.
- Preview live (branch kerja): `https://raw.githack.com/hendrypangg12/Financial-tracker/claude/code-session-work-PkbMp/pt-beruang-pang-office.html`
- ✅ **DEPLOYED ke berstock.id (27 Mei 2026):** `https://berstock.id/pt-beruang-pang-office.html` (file di branch deploy `claude/financial-tracking-app-QUmrz`). Tombol "Kantor Virtual PT Beruang Pang" dipasang di `linktree.html` (section Enterprise/Pitch) DAN section showcase di homepage `index.html` (preview video autoplay + tombol "Buka versi LIVE", setelah products-section). Web scaling pakai `image-rendering:auto` biar teks bersih pas di-downscale.

### 🟢 LIVE PRESENCE — Beruang per pengguna app real-time (27 Mei 2026) ✅ LIVE
**Konsep (request bos):** tiap orang yang lagi BUKA app = 1 beruang muncul di kantor
virtual, masuk dari pintu MASUK, roam di ruangnya. Dipajang **publik** di
`pt-beruang-pang-office.html`. **Multi-app:**
- **BerUang** (`app.html`, web link ATAU APK Play Store TWA — sama) → beruang **"User"**
  (kuning) di ruang BERUANG. `window.PRESENCE_APP='beruang'`.
- **BerBisnis** (`tokountung/app.html`) → beruang **"Kasir"** (biru) di ruang BERBISNIS.
  `window.PRESENCE_APP='berbisnis'`, include `../js/presence.js`.
- **Berstock** = bot Telegram (gak ada sesi web) → ke-cover via user BerBisnis (customer-nya).
- **Badge "● N ONLINE"** (glow hijau, pulse) di tengah-atas kantor, **cuma mode live**.
- **TANPA cap** (rame gpp) — cuma pagar `SAFETY_BEARS=80` anti-freeze HP. Spawn di-stagger
  (1 per ~4 frame) biar masuk satu-satu, gak numpuk di pintu.

**Arsitektur (Firebase Realtime Database, project `ber-uang-735b3`, region asia-southeast1):**
- `js/presence.js`: tulis `presence/<sessionId>` = `{t, app}` pakai `onDisconnect().remove()`
  + heartbeat 30s + visibility-aware (hidden→remove). App name dari `window.PRESENCE_APP`
  (default 'beruang'). Defensif total (guard `typeof firebase`) — gak ganggu app kalau RTDB off.
- BerUang `app.html`: SDK `firebase-database-compat`, `firebase-config.js` v=22 (+`databaseURL`),
  `presence.js?v=2`. BerBisnis `tokountung/app.html`: SDK database, `firebase-config.js` v=4
  (+`databaseURL`), include `../js/presence.js?v=2`.
- `pt-beruang-pang-office.html`: subscribe `presence` → hitung per-app (`t`<70s) → `liveByApp`
  + `liveUserCount`. `syncUserBears()` spawn/exit per app (cuma di `step()` live loop).
  `resetSim()` buang semua `isUser` + `__renderFrame` set `liveMode=false` & gak panggil sync →
  **video render tetap deterministik & bersih** (no beruang-user, no badge di MP4).
- `countWalkers()` exclude `isUser`. Hook tes lokal: `window.__setLiveUsers(beruang, berbisnis)`.

**✅ SETUP SELESAI (27 Mei 2026):** RTDB udah di-create region **Singapore (asia-southeast1)**,
rules published (`presence` read public + per-child write, node lain locked). `databaseURL` match.
End-to-end ke-test via REST (write/read/delete OK). **FITUR LIVE.**

### 🐛 BUG FIX — Tombol "Admin Panel" di dropdown BerUang (27 Mei 2026)
Tombol Admin Panel di user-dropdown gak bisa diklik (klik → dropdown nutup, gak
buka apa2). Akar: handler manggil `switchTab('admin')` padahal fungsi aslinya
`switchToTab` (nested di `attachEvents()`, gak global) → **ReferenceError**.
Fix: `js/app.js` ganti jadi klik tab admin programatik
(`document.querySelector('.tab[data-tab="admin"]').click()`) biar reuse path yang
udah bener (switchToTab + renderAdmin). app.js bump v=30.
**LESSON:** kalau ada fungsi nested di dalam fungsi lain, gak bisa dipanggil dari
luar scope-nya — panggil via elemen/handler yang udah ada, atau bikin global.

### 🔄 AUTO-UPDATE PWA — user homescreen otomatis dapat versi terbaru (27 Mei 2026)
**Masalah:** user yang udah "Add to Home Screen" (PWA standalone) nyangkut di versi
cache lama → fix/update gak nyampe ("masih versi lama").
**Solusi (BerUang, `js/app.js` + `sw.js`):**
- SW udah `skipWaiting()` (install) + `clients.claim()` (activate). DITAMBAH di app.js:
  listener `controllerchange` → `location.reload()` pas SW baru ambil alih. **Guard:**
  cuma pasang listener kalau `navigator.serviceWorker.controller` udah ada (bukan
  install pertama) → gak reload sia-sia di kunjungan pertama.
- `reg.update()` dipanggil tiap `visibilitychange`→visible (app dibalikin ke depan) +
  interval 30 menit → sesi homescreen yang kebuka lama tetap ke-detect versi baru.
- **WAJIB tiap deploy app BerUang:** bump `CACHE_VERSION` di `sw.js` (sekarang
  `beruang-v21`) + samain daftar `CORE` ke versi `?v=` terbaru. Itu yang bikin browser
  install SW baru → trigger auto-reload. Kalau lupa bump, user lama gak ke-update.
- Alur: buka app → browser fetch sw.js (beda byte) → install SW baru → skipWaiting →
  activate → claim → controllerchange → reload → HTML baru (network-first) → JS `?v=` baru.
- **✅ BerBisnis (`tokountung/`) UDAH dipasang juga (27 Mei):** `tokountung/sw.js` BARU
  (`CACHE_VERSION='berbisnis-v1'`, scope `/tokountung/`, network-first HTML + cache-first
  asset, KONSERVATIF: cuma same-origin + CDN statis; bypass total Firebase runtime,
  RTDB `firebasedatabase.app`, worker `/api/sync`, non-GET). Registrasi + auto-reload di
  `tokountung/js/app.js` (app.js bump v=21). SW BerUang juga tambah bypass
  `firebasedatabase|workers.dev`, CACHE_VERSION → `beruang-v22`.
- **⚠️ iOS PWA nyangkut:** instance homescreen LAMA (sebelum punya kode auto-reload)
  gak bisa di-update dari jarak jauh — user harus SEKALI: cold-close PWA + buka lagi
  (online) 1-2x, atau hapus ikon homescreen → add ulang dari Safari. Habis sekali itu,
  auto-update jalan selamanya. (Web/Safari udah confirmed serve versi terbaru.)
- **🧹 Tombol "Bersihkan Cache & Muat Ulang" (escape hatch manual, 27 Mei):** ide dari
  app Daily Generator bos. Handler: unregister SEMUA service worker + hapus SEMUA Cache API
  + `location.reload()`. **localStorage (data transaksi) & sesi login TIDAK dihapus** →
  data aman. Lokasi: BerUang = item di user-dropdown (`#btn-refresh-app`, `js/app.js`);
  BerBisnis = panel "Versi Aplikasi" di tab Pengaturan (`bindGlobalButtons`). Bump:
  BerUang app.js v32 + sw `beruang-v23`; BerBisnis app.js v22 + sw `berbisnis-v2`.
  CATCH-22: tombol ini baru kepake SETELAH user dapat versi yg ADA tombolnya — instance
  super-lama tetap perlu cold-close/re-add sekali. Sesudah itu, tinggal tap tombol.

### 🆕 ONBOARDING "Setup Dana Awal" + Nama User + AI diperkaya (27 Mei 2026)
**Request bos:** user baru jangan langsung ke menu utama — bantu setup posisi awal dulu,
+ simpan NAMA user biar app tau "ini keuangan siapa".
- **`js/onboarding.js` (BARU):** wizard full-screen (`#onboarding-screen`), muncul buat
  user fresh (belum ada trx/hutang/aset) via `maybeShowOnboarding()` di alur login
  (`js/app.js`); bisa di-LEWATI; bisa dibuka ulang dari menu dropdown "💰 Setup Dana Awal"
  (`openOnboardingManual`). Flag `beruang-onboarding-done:<email>` di localStorage.
- **Field:** 👤 Nama, 💳 Rekening (nama+saldo, multi-row), 📈 Investasi, 🤝 Duit di teman,
  💸 Utang kamu, 🔁 Kost + Cicilan KK. Parsing angka via `onbNum` (strip non-digit).
- **Keputusan desain (REVISI bos setelah tes, 27 Mei):** pisahin uang CAIR vs ASET.
  - **Rekening/e-wallet (BCA/BNI/GoPay)** = uang cair → dicatat **pemasukan "Saldo Awal"**
    (`addTransaction`) → **MASUK Sisa Saldo**. (Sebelumnya nyangkut di assets → saldo minus.)
  - **Investasi/properti/kendaraan (saham/emas/rumah)** = `state.assets[]`
    (`addAsset/deleteAsset/assetsTotal`), TERPISAH dari cashflow (kartu "Aset/Kekayaan").
  - Piutang→`hutangs` jenis piutang; utang→`hutangs` jenis hutang. Kost+cicilan =
    **pengeluaran bulan ini** (`addTransaction`, kategori 'Tempat Tinggal' / 'Cicilan').
- **Format ribuan otomatis** di field nominal onboarding (4000000 → 4.000.000) — listener
  `input` di `showOnboarding`, `onbNum` tetap strip non-digit pas submit. (onboarding v5)
- **`state.userName`** (baru) + **`state.assets`** ikut persist: storage.js (save/load/
  export/import/reset) + sync.js (push payload + load + listener). 
- **Dashboard (`js/dashboard.js`):** `renderGreeting()` "Halo, {nama} 👋" + `renderAssets()`
  kartu "💎 Aset/Kekayaan" (total + list + hapus per item), dipanggil di renderDashboard.
- Bump: storage v22, sync v23, dashboard v22, app v33, onboarding v1, SW **beruang-v24**.

### 🤖 AI ADVISOR "Beruang Akuntan" — UDAH ADA tapi BELUM di-deploy (27 Mei 2026)
**TEMUAN:** Fitur AI tanya-jawab data user yang bos minta **udah ke-build** (frontend
`js/ai-advisor.js` chat UI + paywall Pro; backend `bot/src/advise.js` `/api/advise`,
`claude-sonnet-4-6`, rate-limit 30/hari, prompt caching). Contoh di kode: "Kapan bisa
beli laptop 15jt?".
- **⚠️ BLOCKER:** tes `GET/POST /api/advise` → **"Not Found"**. Worker yang live belum
  punya route ini → **PERLU `cd bot && wrangler deploy`** + pastikan secret
  **`ANTHROPIC_API_KEY`** di-set di Cloudflare. (Aksi BOS — gak ada akses CF dari sini.)
- **FAB AI masih di-HIDE** di `js/app.js` (~baris 530, `showAIFab()` di-comment). Setelah
  worker deploy & dites OK → uncomment `showAIFab()` + bump app.js biar tombol AI muncul.
- **Sudah diperkaya (siap pas deploy):** `buildAdvisorContext` kirim `userName`, `assetTotal`
  + breakdown, `piutangTotal`/`hutangTotal`, `tabunganBulanIni`. `advise.js` render data itu
  + prompt baru buat jawab "kapan bisa beli X" (hitung dari aset + tabungan/bulan).
- Alur sinergi: onboarding ngisi aset/utang/rutin → AI makin akurat jawab goal.

### 🎨 REDESIGN DASHBOARD BerUang "versi pro" + GANTI LOGO (27 Mei 2026)
**Request bos:** bikin dashboard lebih profesional (dari mockup side-by-side yg disetujui),
+ ganti logo BerUang ke **beruang berdasi** (`assets/logo-berbisnis.png`).
- **CSS (`styles.css`):** `--bg` krem `#fbf6ee` → off-white `#f7f5f1`. Kartu KPI dirombak:
  buang aksen pelangi (`.card::before{display:none}`), kartu putih seragam border tipis.
  **Sisa Saldo jadi HERO** (gelap `#221a12`, full-width, `order:-1; grid-column:1/-1`,
  value 30px putih). Pemasukan/Pengeluaran/Transaksi = 3 kartu kecil (icon chip netral
  `#f1ece2`, value warna ink, delta kecil). `.cards` jadi 3-kolom (mobile tetap 2-kolom
  via media query — angka Rupiah penuh muat).
- **Logo:** SEMUA `assets/mascot-beruang.png?v=2` → `assets/logo-berbisnis.png?v=3` di
  app.html (login, paywall, topbar, welcome, favicon, apple-touch) + onboarding.js.
- **⚠️ INI MENGUBAH "two-logo strategy" lama** (BerUang gemoy / BerBisnis berdasi).
  Sekarang BerUang JUGA pakai beruang berdasi (bos mau lebih korporat). Mascot gemoy
  (`mascot-beruang.png`) gak dipake lagi di app — tapi file masih ada (dipakai marketing).
- Bump: styles v35, onboarding v2, SW **beruang-v25** (+ logo-berbisnis di CORE).
- **Catatan APK/TWA:** ikon launcher di HP (Play Store APK + homescreen lama) gak ikut
  berubah — itu di-bake di AAB. Cuma favicon web + logo dalam app yang ganti. Kalau mau
  ikon launcher ikut berdasi → perlu build & upload AAB baru.
- **Tab lain disenadain (styles v36, SW beruang-v26):** kartu ringkasan Hutang
  (`.hsum-card`) dibikin putih bersih (buang gradient + border warna) — semantik lewat
  warna ANGKA (piutang=income, hutang=expense, net=primary). Transaksi & Rekap udah clean.
- **🐛 FIX field `nominal`:** hutang/piutang pakai field **`nominal`** (bukan `jumlah`).
  Onboarding (`addHutang`) & `buildAdvisorContext` sempat salah tulis `jumlah` → piutang/
  utang dari onboarding tampil Rp 0. Udah dibetulin ke `nominal`. (onboarding v3, ai-advisor v6)

### 🐛 SKILL BARU — Canvas Mirror Flip (BUG PENTING, 27 Mei 2026)
Buat flip sprite menghadap kiri, mirror HARUS di titik `x`:
`ctx.translate(x,0); ctx.scale(-1,1); ctx.translate(-x,0)`.
**JANGAN** pakai `x*2` / `-x*2` → itu mirror di titik `2x`, badan ke-render di ~`3x`
(luar layar) sementara elemen di luar transform (name-tag, cangkir) tetap di posisi benar.
Gejalanya persis: "karakter ilang tapi benda di tangannya melayang". Ke-fix 1 baris.


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
