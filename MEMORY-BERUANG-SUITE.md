# 🐻 MEMORY BERUANG SUITE

> **Status snapshot:** Day 2-3 Complete · IG @berstock.ai LAUNCHED · Marketing assets ready
> **Last update:** 3 Mei 2026
> **Owner:** Hendry Phang (@hendrypangg)
> **Brand umbrella:** BerSatu Suite (BerUang + BerBisnis + Berstock)

---

## 🎯 RINGKASAN PROYEK

**3 produk digital:**

| Produk | Target | Pricing | Status |
|---|---|---|---|
| 💰 **BerUang** | Personal finance | Rp 35rb/bln · **Rp 125rb lifetime** | ✅ LIVE |
| 🐻 **BerBisnis Pro** | UMKM (POS+Stok) | Rp 149.999/bln Starter · **Rp 500rb/bln Pro+AI** | ✅ LIVE |
| 🤖 **Berstock AI Bot** | Add-on Pro+AI | Included | ✅ LIVE @ Cloudflare |

**Tech stack:**
- Frontend: Vanilla HTML/CSS/JS (no framework)
- Auth: Firebase v11 compat
- Storage: localStorage + Firestore sync (BerUang) / Cloudflare KV (BerBisnis bot)
- AI: Claude Sonnet 4.6 via Anthropic SDK
- Hosting: GitHub Pages (`hendrypangg12.github.io/Financial-tracker`)
- Bot Worker: Cloudflare Workers

---

## 📸 INSTAGRAM @berstock.ai

**Status (last check 3 Mei 2026):**
- 3 posts · 9 followers · 123 following
- **361 profile views dalam 30 hari** (organic)
- Top post: Reels "Toko Banyak Hilang" — 191 views
- Connected: Facebook + WhatsApp button

**Profile setup:**
- Display: `Berstock · AI Stock Assistant · POS SYSTEM`
- Bio (Versi 2 dari template):
  ```
  🚀 Pertama di Indonesia
  🤖 POS + AI Bot Telegram untuk UMKM
  Owner tinggal chat, AI yang kerja 🐻
  👇 Mulai gratis sekarang
  ```
- Profile pic: gold ring + dark navy + beruang berdasi
- Link: lynk.id/hendrypangg

**Insight viral formula:**
- Hook pertanyaan provokatif ("Berapa...", "Tau gak...", "Hilang ga...")
- Angka spesifik shocking ("3 dari 5", "5-15%", "96%")
- Emoji emosi (😰💸⏰😶🔥)
- 3 detik pertama harus catch
- CTA "Follow + DM demo"

---

## 🎨 MARKETING ASSETS LIBRARY

**Lokasi semua asset di repo: `github.com/hendrypangg12/financial-tracker`**

### Carousel PNG (20 slides total) — `/carousel-png/`
| File | Tema | Status |
|---|---|---|
| `slide-1.png ... slide-5.png` | Cover Carousel "Owner Toko, Stok Hilang Ga?" | Ready |
| `pain-a-1.png ... pain-a-5.png` | "Berapa Duit Hilang Tiap Bulan? 💸" | Ready |
| `pain-b-1.png ... pain-b-5.png` | "Berapa Jam Buang Tugas Manual? ⏰" | Ready |
| `pain-c-1.png ... pain-c-5.png` | "Pelanggan Diam-Diam Pergi 😶" | Ready |

### Video MP4 — `/`
- `berstock-reels-15s.mp4` — Reels 20 detik (1080×1920, H.264, ~250KB)

### HTML Templates (kalau butuh re-render / variasi) — `/`
- `reels-15s.html` / `reels-20s.html` — single record reels
- `reels-berstock-autoplay.html` — 45 detik long-form
- `reels-berstock-b.html` — 5 scene templates manual record
- `carousel-berstock-5.html` — cover carousel original
- `carousel-pain-3x5.html` — 3 carousel variations × 5 slides
- `berstock-carousel-day2.html` — 8 slides full marketing
- `profile-pic-berstock.html` — 4 template profile picture
- `berstock-pitch-deck.html` — 10 slides A4 landscape (export PDF untuk pitch B2B)

### Landing Pages — `/`
- `berbisnis-pro.html` — main landing BerBisnis Pro
- `landing.html` — landing BerUang
- `landing-berstock.html` — landing bot Telegram
- `index.html` — linktree BerSatu Suite
- `bersatu-demo.html` — Neural Command pitch demo
- `admin-berstock.html` — provision tenant form (butuh ADMIN_KEY)

---

## 🛠️ DEV CAPABILITY (Penting buat Future Sessions)

**Environment ini punya:**
- ✅ Node.js + npm
- ✅ Puppeteer + Chromium (untuk render HTML → PNG/screenshots)
- ✅ FFmpeg (untuk encode PNG frames → MP4 H.264)
- ✅ Git/GitHub access ke repo

**Pattern render:**
- HTML to PNG: pakai `puppeteer.screenshot()` per element
- HTML to MP4: capture frames at 30fps → `ffmpeg -framerate 30 -i frame_%05d.png -c:v libx264`
- Lihat `/tmp/render-reels.js` (MP4) atau `/tmp/render-pain-carousels.js` (PNG) untuk template

**Yang TIDAK bisa:**
- Generate AI image/video langsung (gak ada Stable Diffusion / DALL-E access)
- Voice over generation (no TTS)
- Motion graphic kompleks (cuma CSS animation basic)

---

## 🎨 BRANDING REFERENCE

### Color Palette
**Berstock (POS+AI):** Navy `#0a1628` + Magenta `#e91e63` + Gold `#d4af37` + Cyan `#06b6d4`
**BerUang (Personal):** Cream `#fbf6ee` + Brown `#8b5a2b` + Gold `#c9a352`
**BerBisnis:** Navy `#1e3a5f` + Gold `#c9a352`

### Mascot Logo
- `tokountung/assets/logo-berbisnis.png` — beruang berdasi profesional (B2B)
- `assets/logo-beruang.png` — beruang akuntan gemoy (personal finance)
- `assets/mascot-berstock.png` — TBD (user mau upload PNG dari Manus)

### Typography
- Body: Inter (400-900 weights)
- Mono/tags: JetBrains Mono (600-800)

---

## 🤝 PROSES BISNIS

### Onboarding Klien Baru (manual via WA)
1. Klien tertarik via Lynk/IG → DM @berstock.ai atau WA
2. Bos qualify lead → kirim landing page
3. Klien daftar di `tokountung/app.html` (free trial 3 hari)
4. Klien commit beli → bayar transfer
5. Bos buka `admin-berstock.html` → input form provision
6. ⚠️ **BUTUH ADMIN_KEY** (belum di-set di Cloudflare)
7. Output: tenant_id + api_key + pesan WA siap kirim
8. Klien isi config di Pengaturan app + chat `/start` ke bot
9. Klien aktif

### Pricing Strategy
- E-Book: Rp 49.999 (Lynk Digital Product, auto-deliver PDF)
- BerUang Lifetime: Rp 125rb (sekali bayar, manual via WA → enable di Firebase)
- BerBisnis Starter: Rp 149.999/bulan
- BerBisnis Pro+AI: Rp 500rb/bulan (Early Bird, 50 klien pertama)
- BerBisnis Enterprise: Rp 1.5jt+/bulan (multi-cabang, custom)

---

## ⏳ PENDING ACTIONS (Sorted by Priority)

### 🔴 URGENT
1. **Rotate Cloudflare API Token** — yang kemarin di-share di chat tidak aman
2. **Set ADMIN_KEY Cloudflare Worker** — wajib untuk provision tenant baru
3. **Setup GitHub Secret `CLOUDFLARE_API_TOKEN`** — untuk auto-deploy bot

### 🟡 NORMAL
4. **Aktifkan Lynk Affiliate Program** — buka Lynk → Marketing Tools → Affiliates
5. **Update Lynk bio + block titles** dengan emoji + clickbait (template ready)
6. **Upload `assets/mascot-berstock.png`** (beruang celebrate dari Manus)
7. **Lanjut Tutorial Feature Flags Step 3-6** untuk customize per klien

### 🟢 NICE-TO-HAVE
8. Bikin reels variation untuk @beruangfinance (akun BerUang personal)
9. Bikin highlight cover icons (6 icons matching brand)
10. Content plan 14 hari first month
11. Setup Meta Pixel di landing pages (untuk track ads conversion)

---

## 🐛 BUG/ISSUE KAMBUHAN (Catatan Bug)

### CSS `[hidden]` Override Pattern
- Setiap container dengan `display: flex/grid/block` HARUS punya `[hidden] { display: none !important }`
- Sudah kena 4× di proyek: `.modal`, `.auth-form`, `.login-screen`, `#app-main`

### Google Login BerBisnis
- Email/password works ✅
- Google login fail (popup-redirect issue) ⚠️
- Workaround: stick to email/password untuk sekarang

### iOS Safari File Input
- `<button onclick="input.click()">` blocked
- Fix: pakai `<label for="id">` pattern

### Firestore Persistence
- `fbDb.enablePersistence()` bikin auth flap di iOS
- Solusi: skip enablePersistence, pakai `setPersistence(LOCAL)` saja

---

## 📚 SKILLS YANG DIPELAJARI

### A. Building untuk UMKM Indonesia
- Bahasa casual (sapa "bos"/"kak")
- Format Rupiah: Rp 1.500.000 (titik pemisah ribuan)
- Mobile-first (80%+ traffic dari HP)
- Telegram > WhatsApp untuk AI bot MVP

### B. Cloudflare Workers + Claude API
- `compatibility_date >= 2024-09-23` + `nodejs_compat`
- Prompt caching WAJIB untuk cost efficiency
- Volatile content (date, biz name) → user message, BUKAN system prompt
- Manual tool use loop > toolRunner untuk error handling

### C. Landing Page Pattern (Day 2 learning)
- Dual CTA (high-intent + low-friction)
- Deep features section dengan zigzag layout + mockup visual
- Floating mascot chat widget (auto-popup 3s, sequential messages)
- Cross-sell banner SEBELUM pricing (catch non-fit visitor)
- Pre-filled WhatsApp message di CTA link
- Mockup data realistis (Pak Budi Rp 8.5jt, dll)

### D. 3-Layer Auto-Sync Protection
1. Debounced push (1.5s/30s) dari saveState
2. Periodic interval push (5 menit) — fallback
3. Tab close push (visibilitychange + beforeunload + sendBeacon)

### E. Marketing Visual Render (Day 3 learning)
- Puppeteer headless chromium → screenshot per element atau frames
- FFmpeg encode PNG frames → MP4 H.264 yuv420p
- Multiple slides single HTML file (per ID screenshot pattern)
- Auto-play timing JSON untuk reels animation

---

## 📞 CONTACT & LINKS

**Owner:** Hendry Phang
**Email:** hendrypangg12@gmail.com (primary)
**WA:** +62 821-2484-8924
**IG personal:** @hendrypangg
**IG brand:** @berstock.ai
**IG planned:** @beruangfinance (untuk BerUang)

**Live URLs:**
- Linktree: `hendrypangg12.github.io/Financial-tracker/`
- BerUang app: `.../app.html`
- BerBisnis app: `.../tokountung/app.html`
- Berstock landing: `.../landing-berstock.html`
- Berstock bot Telegram: `t.me/BerstockBot`
- Berstock Worker: `berstock-bot.hendrypangg12.workers.dev`
- Lynk: `lynk.id/hendrypangg`

**Repo:**
- Main: `github.com/hendrypangg12/financial-tracker`
- Branch dev: `claude/financial-tracking-app-QUmrz`

---

## 🎯 NEXT MILESTONE TARGETS

**Week 1 (sekarang):**
- [ ] Post 3 carousel pain-point ke @berstock.ai (Senin/Rabu/Sabtu)
- [ ] Reach 100 followers IG organik
- [ ] Get 1 klien Pro+AI confirmed
- [ ] Set ADMIN_KEY Cloudflare

**Week 2-4 (bulan ini):**
- [ ] Total 12-15 posts di IG
- [ ] 500 followers
- [ ] 3-5 klien BerBisnis Pro+AI active
- [ ] 10-20 affiliate signed up via Lynk

**Bulan ke-2:**
- [ ] 1000 followers
- [ ] 10 klien aktif
- [ ] Mulai paid ads Meta (kalau organic engagement udah established)

---

> 🐻 **"Bisnis Naik Kelas, Owner Tidur Nyenyak"** — Tagline Beruang Suite

> **Untuk session berikutnya:** baca CLAUDE.md (auto-loaded) + file ini sebagai konteks lengkap. Semua progress, pending tasks, dan dev capability sudah tercatat di sini.
