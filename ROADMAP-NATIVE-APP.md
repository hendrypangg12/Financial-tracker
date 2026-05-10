# 📱 BerUang Native App — Roadmap Implementasi

> Dokumen ini panduan teknis lengkap untuk wrapping BerUang PWA jadi native app di Google Play Store + Apple App Store.

---

## 🎯 STRATEGI: PWA → Native via Capacitor.js

**Kenapa Capacitor.js?**
- Code yang sama (BerUang HTML/CSS/JS) jalan di web + Android + iOS
- Maintenance 1 codebase, deploy 3 platform
- Performance hampir sama dengan native (Ionic-grade)
- Akses native API (kamera, push notif, dll) kalau perlu

**Alternatif yang ditolak:**
- React Native: butuh rewrite total dari Vanilla JS → React
- Flutter: butuh rewrite ke Dart, ekosistem berbeda
- Cordova: legacy, lambat, kurang maintained

---

## 📋 PHASE 2A: GOOGLE PLAY STORE (Priority #1)

### **Step 1: Setup Capacitor (1-2 hari)**

```bash
# Di folder project
cd /home/user/Financial-tracker
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "BerUang" "id.berstock.beruang" --web-dir=. 

# Add Android platform
npx cap add android

# Build & open di Android Studio
npx cap sync
npx cap open android
```

### **Step 2: Konfigurasi App (1 hari)**
- App ID: `id.berstock.beruang`
- App name: "BerUang"
- Version: 1.0.0
- Splash screen: logo beruang gold + bg cream
- Icon: 512×512 + adaptive icon
- Permissions yang dibutuhkan:
  - INTERNET (wajib)
  - CAMERA (untuk OCR struk)
  - STORAGE (untuk cache & PWA)

### **Step 3: Aset Visual yang Dibutuhkan**
- **Icon set:** 48, 72, 96, 144, 192, 512 px (saya bisa generate dari `assets/mascot-beruang.png`)
- **Splash screen:** 1080×1920 (portrait) + 1920×1080 (landscape)
- **Feature graphic Play Store:** 1024×500 px
- **Screenshots:** 8 screenshot (HP, tablet) — minimal 1080×1920
- **Promotional video (optional):** 30 detik di YouTube

### **Step 4: Google Play Console (1-2 hari)**
- Daftar Google Play Console: **$25 one-time** (bayar via kartu kredit)
- Lengkapi store listing:
  - Title, short description, full description (Bahasa Indonesia)
  - Category: **Finance**
  - Content rating questionnaire
  - Privacy policy URL: `berstock.id/privacy`
  - Target audience: 13+
- Upload APK / AAB (Android App Bundle, format direkomendasikan)
- Submit for review

### **Step 5: Review Process (3-7 hari)**
Google Play biasanya approve dalam 1-7 hari kalau:
- Tidak ada konten violation
- Privacy policy valid
- Target API level Android terbaru

### **Step 6: Launch & Marketing**
- Soft launch ke 100 close circle
- Collect review awal (5-bintang dari teman)
- Gradual rollout 5% → 25% → 100%
- ASO (App Store Optimization):
  - Keyword: "catat keuangan", "personal finance", "OCR struk", "manajemen uang", "BerUang"
  - First 80 karakter description = paling penting

---

## 📋 PHASE 2B: APPLE APP STORE (Priority #2)

### **Prerequisites**
- **Apple Developer Account: $99/tahun** (recurring)
- Mac komputer (atau pakai Mac di cloud: MacInCloud, MacStadium ~$30/bulan)
- Xcode 15+ untuk build

### **Step 1: Setup Capacitor iOS**
```bash
npm install @capacitor/ios
npx cap add ios
npx cap sync
npx cap open ios  # Open di Xcode
```

### **Step 2: Apple Developer Setup**
- Daftar di: https://developer.apple.com/programs/
- Verifikasi identity (KTP, NPWP)
- Add app ID: `id.berstock.beruang`
- Generate provisioning profile + signing certificate

### **Step 3: App Store Connect**
- Buat app baru di App Store Connect
- Lengkapi:
  - App information (Bahasa Indonesia + English)
  - Privacy policy
  - Screenshots: 6.5" iPhone (1284×2778), iPad Pro (2048×2732)
  - App preview video (optional, max 30 detik)
  - Category: Finance
  - Age rating: 4+

### **Step 4: Submit & Review**
- Upload via Xcode atau Transporter app
- Submit for review
- **Review time: 1-2 minggu** (Apple ketat)
- Common rejection reasons:
  - Privacy policy gak lengkap
  - Test login credentials gak disediakan
  - In-App Purchase belum diset proper
  - Screenshots gak sesuai actual app

---

## 💰 IN-APP PURCHASE (IAP) IMPLEMENTATION

### **Strategi: Free + Premium**

**Tier Free (semua user dapat):**
- Catat manual via form/chat
- 1 device only
- Storage 30 hari history
- Basic dashboard
- 5 kategori

**Tier Pro (Rp 35.000/bulan atau Rp 125.000 lifetime):**
- Cloud sync multi-device
- Unlimited history
- Unlimited kategori
- OCR struk (Tesseract.js)
- Export PDF/Excel
- AI Insight
- Priority support

### **Implementation:**

**Google Play Billing:**
```bash
npm install @capacitor-community/in-app-purchases
npx cap sync
```
Buat 2 produk di Play Console:
- `beruang_pro_monthly` — Rp 35.000 (subscription, monthly)
- `beruang_pro_lifetime` — Rp 125.000 (one-time consumable)

**Apple StoreKit:**
Buat 2 IAP di App Store Connect:
- Subscription: Pro Monthly Rp 35.000
- Non-consumable: Pro Lifetime Rp 125.000

**Code logic (frontend):**
```javascript
// Cek user pro status saat app load
async function checkProStatus() {
  if (window.cordova && window.store) {
    const product = window.store.get('beruang_pro_lifetime');
    return product.owned || false;
  }
  // Fallback: cek dari Firestore (web users)
  return await checkFirestoreProStatus();
}

// Lock fitur Pro
function gateProFeature(featureName) {
  if (!isPro()) {
    showPaywall();
    return false;
  }
  return true;
}
```

---

## 📊 COST BREAKDOWN (Year 1)

| Item | Cost |
|---|---|
| Google Play Developer | $25 (one-time) = ~Rp 400rb |
| Apple Developer | $99/tahun = Rp 1.6jt |
| Mac for iOS dev | Rp 0 (kalau punya) atau Rp 360rb/bln (cloud) |
| Push notif service (FCM) | Free (Firebase) |
| Backend infra | Rp 0 (existing Cloudflare + Firebase) |
| **TOTAL Year 1 Setup** | **~Rp 2-6jt** |

**Apple/Google Cut:**
- Kedua platform potong **30%** dari IAP (atau 15% kalau revenue <$1jt/year first year)
- Stripe/Midtrans web alternative: cuma **2.9-3%**
- Strategi: tetap promote web checkout untuk margin lebih tinggi

---

## 📈 PROJECTION REVENUE (Year 1)

**Asumsi growth rate 20%/bulan:**

| Bulan | User Aktif | Pro (5%) | IAP Revenue | Affiliate | Total |
|---|---|---|---|---|---|
| 1 | 500 | 25 | Rp 3.1jt | Rp 0.5jt | Rp 3.6jt |
| 3 | 1.500 | 75 | Rp 9.4jt | Rp 1.5jt | Rp 10.9jt |
| 6 | 5.000 | 250 | Rp 31jt | Rp 5jt | Rp 36jt |
| 12 | 15.000 | 750 | Rp 93jt | Rp 15jt | Rp 108jt/bulan |

**Year 1 cumulative:** Rp 300-600jt revenue (kalau marketing aktif).

---

## 🚧 PRIORITY URUTAN KERJA

### **Q2 2026 (Sekarang)**
- ✅ Phase 1: PWA Affiliate Banner (DONE)
- ⏳ Closing klien BerBisnis dulu (lebih high revenue per effort)

### **Q3 2026**
- ⏳ Setup Capacitor + APK build
- ⏳ Submit Google Play Store
- ⏳ Implement Google Play Billing IAP
- ⏳ Soft launch + ASO

### **Q4 2026 (kalau Google Play sukses)**
- ⏳ Submit Apple App Store
- ⏳ Implement StoreKit IAP
- ⏳ Marketing campaign nasional

### **Q1 2027 (kalau metric bagus)**
- ⏳ Monetisasi advanced (subscription tier, family plan)
- ⏳ Sponsorship/partnership besar

---

## ⚠️ HONEST WARNING

**Native app development cost vs benefit:**

| Aspect | Web/PWA | Native App |
|---|---|---|
| Time to monetize | **Hari ini** | 2-3 bulan |
| Cost setup | **Rp 0** | Rp 2-6jt |
| Maintenance | Low | High (review tiap update) |
| Distribution | Manual share | Auto via store |
| Trust | Medium | **High** (orang lebih trust app store) |
| Discovery | SEO + IG | **App store search + ASO** |

**Rule of thumb:**
- < 1.000 user/bulan → **PWA cukup**
- 1.000-10.000 user/bulan → **Native worth it**
- 10.000+ user/bulan → **Native WAJIB**

---

## 🎯 ACTION ITEM HARI INI

Bos sekarang udah dapet Phase 1 (Affiliate Banner) selesai. Native App tetap roadmap untuk Q3 2026.

**Fokus sekarang:**
1. Closing 3 paying klien BerBisnis (revenue per customer 100x lipat dari BerUang Pro)
2. Polish PWA BerUang sambil promo organik di IG
3. Saat user PWA hit 500-1000/bulan → mulai Capacitor setup

**Kontak:** Hendry Phang · WA +62 821-2484-8924 · info@berstock.id
