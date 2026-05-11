# 🚀 BerUang → Google Play Store: Step-by-Step Guide

> Panduan lengkap submission BerUang ke Play Store via PWA Builder (tanpa Android Studio).

**Estimasi total waktu bos:** 2-3 jam kerja terpisah dalam 1-2 hari
**Estimasi go-live:** 5-10 hari (review Google)
**Biaya:** $25 USD (~Rp 400rb) one-time

---

## ✅ PRE-FLIGHT CHECKLIST (yang udah Claude siapin)

- [x] **Free Trial 7 hari** — implemented di code (TRIAL_DAYS=7)
- [x] **Freemium gating** — OCR, Export, Cloud Sync di-lock untuk free user
- [x] **Privacy Policy** — live di https://berstock.id/privacy.html
- [x] **Manifest PWA** — updated untuk Play Store (id, screenshots, maskable icon)
- [x] **Aset visual semua di `assets/icons/` dan `assets/screenshots/`:**
  - icon-72.png, 96, 144, 192, 512.png
  - icon-512-maskable.png (untuk adaptive icon Android)
  - splash-1080x1920.png
  - feature-graphic-1024x500.png
  - screen-1-dashboard.png, screen-2-input.png, screen-3-ocr.png, screen-4-hutang.png
- [x] **App ID:** `id.berstock.beruang`
- [x] **Hosting:** GitHub Pages → berstock.id (HTTPS valid)

---

## 📋 STEP 1: Daftar Google Play Console (15 menit)

1. Buka **https://play.google.com/console/signup**
2. Login dengan akun Google bos: **`hendryphang12@gmail.com`** atau **`hendrypangg12@icloud.com`** (sebagai backup)
   - ⚠️ **Rekomendasi pakai `hendryphang12@gmail.com`** karena udah jadi admin Firebase
3. Pilih **"An organization"** atau **"Myself"** (pilih Myself untuk personal/UMKM)
4. Setuju ke Developer Distribution Agreement
5. **Bayar $25 USD** via kartu kredit (Visa/Mastercard)
   - ⚠️ TIDAK BISA debit card lokal. Wajib kartu kredit beneran.
   - Alternatif: Jenius QRIS Kartu Kredit virtual (kalau punya)
6. Verifikasi identity:
   - Upload KTP/Passport
   - Bukti alamat (rekening listrik atau bank statement)
   - Proses verifikasi 1-2 hari
7. Setup payment profile (untuk terima payout dari Play Store):
   - Bank account: BCA 7130902183 a/n HENDRY (yang sama dengan landing)
   - NPWP (kalau ada)
   - Atau pakai PayPal sebagai fallback

---

## 📦 STEP 2: Generate AAB via PWA Builder (30 menit)

1. Buka **https://www.pwabuilder.com**
2. Masukkan URL PWA: **`https://berstock.id/app.html`**
3. Klik **"Start"**
4. PWA Builder akan analyze app dan kasih score (target 100/100):
   - **Manifest:** harus ✅ (udah saya prep)
   - **Service Worker:** harus ✅ (BerUang udah ada `sw.js`)
   - **Security (HTTPS):** harus ✅ (GitHub Pages auto HTTPS)
5. Klik tab **"Package For Stores"** → pilih **"Android"**
6. Isi form Package Options:
   - **Package ID:** `id.berstock.beruang`
   - **App name:** `BerUang`
   - **Launcher name:** `BerUang`
   - **App version:** `1.0.0`
   - **App version code:** `1`
   - **Host:** `berstock.id`
   - **Start URL:** `/app.html`
   - **Theme color:** `#8b5a2b`
   - **Background color:** `#fbf6ee`
   - **Display mode:** `Standalone`
   - **Orientation:** `Portrait`
   - **Status bar color:** `#8b5a2b`
7. **Signing key:**
   - Pilih **"Create new"** untuk pertama kali
   - PWA Builder generate keystore + kasih file `.keystore` + password
   - ⚠️ **PENTING:** Save keystore + password di tempat aman! Kalau hilang, gak bisa update app selamanya.
   - Backup ke Google Drive + email sendiri
8. Klik **"Generate Package"** → tunggu 30-60 detik
9. Download file ZIP yang berisi:
   - `*.aab` — file yang akan di-upload ke Play Store ⭐ INI YANG PENTING
   - `*-signed.apk` — untuk testing manual di HP
   - `signing.keystore` — backup ini!
   - `assetlinks.json` — file untuk Digital Asset Links (next step)

---

## 🔗 STEP 3: Setup Digital Asset Links (15 menit)

Ini step CRUCIAL biar URL berstock.id terhubung dengan app di Play Store (deep linking).

1. Buka file `assetlinks.json` dari hasil PWA Builder
2. Upload file ini ke server di lokasi: **`https://berstock.id/.well-known/assetlinks.json`**
3. Cara upload via repo:
   - Di /home/user/Financial-tracker, buat folder `.well-known/`
   - Copy `assetlinks.json` ke dalamnya
   - Commit + push → auto deploy via GitHub Pages
4. Verifikasi di browser: buka `https://berstock.id/.well-known/assetlinks.json` — harus tampil JSON

⚠️ **Note Claude:** Saya bisa bantu setup file ini setelah bos punya hasil dari PWA Builder.

---

## 🎨 STEP 4: Buat App di Play Console (45 menit)

1. Login **https://play.google.com/console**
2. Klik **"Create app"**
3. Isi form:
   - **App name:** `BerUang — Catat Keuangan Pribadi`
   - **Default language:** `Indonesian (id)`
   - **App or game:** `App`
   - **Free or paid:** `Free` (monetize via in-app subscription nanti)
   - **Confirm:** ✅ semua checkbox
4. Klik **"Create app"**

---

## 📝 STEP 5: Isi Store Listing (1 jam)

### **A. App Details**

**App name:** (max 50 char)
```
BerUang — Catat Keuangan Pribadi
```

**Short description:** (max 80 char)
```
Aplikasi catat keuangan pribadi via chat, foto struk, & dashboard otomatis 🐻
```

**Full description:** (max 4000 char)
```
🐻 BerUang — Catat dulu, biar beneran ber-uang!

Bingung tiap akhir bulan, "Uang gw kemana ya?" 🤔

BerUang bantu kamu rapih-in keuangan pribadi dengan cara paling gampang: tinggal CHAT, FOTO struk, atau ISI form simple. Dashboard otomatis update real-time.

✨ FITUR UTAMA:

📝 INPUT GAMPANG
• Chat seperti ngobrol dengan beruang AI
• Foto struk → otomatis terbaca (OCR Tesseract)
• Form quick-add untuk transaksi rutin
• Voice-friendly: ketik atau dictate aja

📊 DASHBOARD CERDAS
• Total pemasukan & pengeluaran real-time
• Grafik harian, mingguan, bulanan
• Rekap 50/30/20 (kebutuhan, keinginan, tabungan)
• Top kategori pengeluaran
• Tren bocor halus

💸 HUTANG & PIUTANG
• Catat siapa hutang sama kamu, siapa kamu hutangi
• Reminder otomatis untuk yang overdue
• Status lunas / aktif dengan 1 tap
• Filter dan history lengkap

🏷️ KATEGORI FLEXIBLE
• 30+ kategori default (makan, transport, gaji, dll)
• Sub-kategori custom unlimited (Pro)
• Tag warna untuk visual yang clear

☁️ SYNC ANTAR DEVICE (Pro)
• Login Google atau email
• Data aman tersinkron HP, tablet, laptop
• Backup otomatis ke cloud

🎁 TRIAL PRO 7 HARI GRATIS

Coba semua fitur Pro selama 1 minggu — tanpa kartu kredit, tanpa komitmen. Setelah trial:
• 🆓 Tetap pakai versi Free (basic, gratis selamanya)
• 💎 Upgrade ke Pro: Rp 35.000/bulan atau Rp 125.000 LIFETIME

KENAPA BerUang?
✅ Bahasa Indonesia native, bukan terjemahan
✅ Cocok untuk personal & UMKM kecil
✅ Offline-first, gak perlu internet 24/7
✅ Privacy: data tidak dijual, no iklan pop-up
✅ Tim Indonesia, support via WhatsApp

📞 BUTUH BANTUAN?
WhatsApp: wa.me/6282124848924
Email: info@berstock.id
Website: berstock.id

Buat hidup keuangan kamu lebih sehat, satu transaksi setiap hari. Download sekarang, trial Pro gratis 7 hari! 🚀
```

### **B. Graphics**

Upload aset dari folder `assets/`:
- **App icon:** `assets/icons/icon-512.png` (otomatis di-ambil dari AAB sebenarnya)
- **Feature graphic:** `assets/icons/feature-graphic-1024x500.png`
- **Phone screenshots (min 2, max 8):**
  - `assets/screenshots/screen-1-dashboard.png`
  - `assets/screenshots/screen-2-input.png`
  - `assets/screenshots/screen-3-ocr.png`
  - `assets/screenshots/screen-4-hutang.png`

### **C. Categorization**

- **App category:** `Finance`
- **Tags:** `Personal finance`, `Budget tracker`, `Money manager`

### **D. Contact Details**

- **Email:** `info@berstock.id`
- **Phone:** `+62 821-2484-8924`
- **Website:** `https://berstock.id`

### **E. Privacy Policy**

- **URL:** `https://berstock.id/privacy.html`

---

## 🛡️ STEP 6: App Content & Policies (30 menit)

### **A. Privacy & Safety**
- Privacy policy URL: `https://berstock.id/privacy.html`
- Target audience: Adults (18+) atau Teens (13+)

### **B. Data Safety Form** (PENTING & WAJIB)
Jawab honestly:
- **Data collected:**
  - ✅ Email address (for account)
  - ✅ Personal info (Name) — optional
  - ✅ Financial info (your own transactions) — for app functionality
  - ✅ App activity (analytics) — anonymous
- **Data sharing:** ❌ NO data shared with third parties
- **Data security:** ✅ Encrypted in transit (TLS), ✅ User can request deletion
- **Data deletion:** User can delete account via app or email request

### **C. Ads**
- **Does your app contain ads?** ❌ NO

### **D. Content Rating**
- Submit questionnaire — semua "NO" untuk content sensitif
- Hasil rating expected: **Everyone (3+)** atau **Teen (13+)**

### **E. Target Audience**
- **Age range:** 13-65+
- **Appeal to children?** ❌ NO

### **F. News App?**
- ❌ NO

### **G. COVID-19 Contact Tracing?**
- ❌ NO

### **H. Data Safety Section** (sertakan):
- Collected: Personal info, Financial info, App activity
- Shared: No
- Security practices: Encryption in transit + at rest

---

## 📦 STEP 7: Production Release (15 menit)

1. Di Play Console → **Production** tab
2. **Create new release**
3. **Upload AAB** dari hasil PWA Builder (step 2)
4. **Release name:** `1.0.0 - Initial Launch`
5. **Release notes (Bahasa Indonesia):**
```
🎉 Welcome to BerUang 1.0!

✨ Fitur perdana:
• Catat keuangan via chat, foto struk, atau form
• Dashboard real-time dengan grafik & rekap 50/30/20
• Tab Hutang & Piutang dengan reminder
• Trial Pro 7 hari GRATIS untuk OCR & cloud sync
• Sync antar device (Pro)

🚀 Mari mulai perjalanan finansial yang lebih sehat!
```
6. Klik **"Save"** → **"Review release"** → **"Start rollout to Production"**

---

## ⏳ STEP 8: Tunggu Review (3-7 hari kerja)

Google akan review:
- ✅ App content (sesuai policy)
- ✅ Privacy policy validity
- ✅ Data safety form akurat
- ✅ Functional app (gak crash di test devices)
- ✅ Target API level >= 33 (Android 13+, auto via PWA Builder)

**Status mungkin:**
- 🟡 **In review** — tunggu
- 🟢 **Approved** — app live di Play Store!
- 🔴 **Rejected** — perbaiki sesuai feedback, resubmit

**Common rejection reasons:**
1. Privacy policy gak lengkap → udah saya buat lengkap
2. App crash di test → test manual dulu sebelum submit
3. Data safety form misleading → jawab honest aja
4. Target API outdated → PWA Builder otomatis target latest

---

## 💰 STEP 9 (NEXT): Setup In-App Subscription

⚠️ **JANGAN setup IAP di submission pertama.** Submit dulu sebagai free app, biar review lebih cepat.

Setelah app approved:
1. Di Play Console → **Monetize** → **Products** → **Subscriptions**
2. Buat 2 produk:
   - `beruang_pro_monthly` — Subscription, base price Rp 35.000/month, **7-day free trial** auto-handled
   - `beruang_pro_lifetime` — One-time product, Rp 125.000
3. Setup tax info (negara untuk Indonesia: PPN 11%)
4. Integration: pakai `@capacitor-community/in-app-purchases` plugin
5. Update app code untuk handle purchase flow
6. Submit update version 1.1.0 dengan IAP support

**Catatan revenue:**
- Google potong 15% (year 1, <$1M revenue) atau 30% (year 2+)
- Bos terima Rp 29.750 dari Rp 35rb monthly (15% cut)
- Bos terima Rp 106.250 dari Rp 125rb lifetime (15% cut)
- **TIPS:** Tetap promote web checkout via berstock.id untuk lifetime → bos terima full

---

## 🎯 POST-LAUNCH ACTION

### **Marketing (Bos)**
1. Update IG bio @berstock.ai dengan link Play Store
2. Update IG bio @hendrypangg juga
3. Post di IG: "BerUang LIVE di Play Store! 🚀"
4. Kirim WA broadcast ke teman (template udah ready)
5. Update website berstock.id dengan badge "Get it on Google Play"

### **ASO (App Store Optimization)**
1. Monitor keyword ranking
2. Respond ke review jelek dengan empati
3. Update screenshots tiap fitur baru
4. A/B test description text

### **Metrics**
1. Monitor GA4 untuk:
   - Install rate
   - 1-day, 7-day, 30-day retention
   - Trial-to-paid conversion (target 5-10%)
2. Play Console Vitals:
   - Crash rate (target <1%)
   - ANR rate (target <0.5%)

---

## ❌ TROUBLESHOOTING

**PWA Builder score <80?**
- Cek manifest.json: pastikan semua field wajib ada
- Cek service worker: pastikan `sw.js` accessible
- Cek HTTPS: pastikan SSL berstock.id valid

**AAB rejected?**
- Sebagian besar karena target API outdated → PWA Builder auto handle ini
- Atau karena pakai permission yang tidak terpakai

**Verification stuck?**
- Tunggu 1-3 hari kerja untuk identity verification
- Atau hubungi Google Play support

---

## 📞 KONTAK EMERGENCY

Kalau stuck di mana aja:
- **Claude:** lanjutkan chat ini, kasih screenshot error
- **Google Play Support:** support.google.com/googleplay/android-developer
- **PWA Builder support:** github.com/pwa-builder/PWABuilder/issues

---

## ✅ FINAL CHECKLIST SEBELUM SUBMIT

- [ ] Akun Google Play Console verified
- [ ] $25 paid
- [ ] AAB file generated via PWA Builder
- [ ] Keystore + password saved di tempat aman
- [ ] `assetlinks.json` uploaded ke berstock.id/.well-known/
- [ ] Store listing terisi lengkap (description, screenshots, feature graphic)
- [ ] Privacy policy live di berstock.id/privacy.html
- [ ] Data Safety form filled
- [ ] Content rating done
- [ ] Test AAB manual di HP Android sendiri (install dari APK)
- [ ] Submit for review

---

**🎉 SELAMAT! Kalau semua done, BerUang siap go-live di Play Store. Estimasi 5-10 hari kerja sampai live.**

*— Generated by Claude untuk Hendry Phang, 11 Mei 2026*
