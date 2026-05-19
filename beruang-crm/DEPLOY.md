# Deploy Beruang CRM ke Railway — Step-by-Step iPad Safari

> Target: app live di public URL (`https://beruang-crm.up.railway.app`) dalam **10-15 menit** tanpa terminal/coding.

---

## ⚠️ PRA-REQUISITE

- ✅ Akun GitHub (bos punya: hendrypangg12)
- ✅ Repo `Financial-tracker` udah ke-push branch `claude/financial-tracking-app-QUmrz`
- ✅ Anthropic API key (sk-ant-...) — sama yang dipake Berstock bot
- ✅ (Opsional) Twilio Sandbox credentials kalau mau WA aktif

---

## 🚀 STEP 1: SIGN UP RAILWAY (3 menit, sekali aja)

### 1.1. Buka Safari iPad → `railway.com`

### 1.2. Klik **"Start a New Project"** atau **"Login"**

### 1.3. Pilih **"Login with GitHub"**

- Authorize Railway akses repo
- Approve untuk repo `hendrypangg12/Financial-tracker`

### 1.4. Setup billing (Railway free trial $5 credit, no card needed awal)

- Hobby plan: $5/bulan setelah trial
- Untuk Beruang CRM (1 service + volume) → ~$5/bulan total

---

## 🚀 STEP 2: CREATE PROJECT (5 menit)

### 2.1. Dashboard Railway → klik **"+ New Project"**

### 2.2. Pilih **"Deploy from GitHub repo"**

### 2.3. Pilih repo **`hendrypangg12/Financial-tracker`**

### 2.4. Klik **"Add variables"** ... atau langsung deploy dulu, edit nanti.

⚠️ **PENTING — Set Root Directory:**

1. Setelah service ter-create, **klik service-nya**
2. Tab **Settings** → scroll ke **"Service Source"**
3. **Root Directory:** ketik **`beruang-crm`**
4. **Branch:** pilih `claude/financial-tracking-app-QUmrz`
5. Save changes

Railway bakal redeploy dari folder `beruang-crm/`.

---

## 🔐 STEP 3: SET ENVIRONMENT VARIABLES

### 3.1. Service → Tab **"Variables"** → klik **"+ New Variable"**

### 3.2. Add variables ini (WAJIB):

```
JWT_SECRET=ganti-dengan-string-acak-min-32-karakter-jangan-pake-default-yaaa
ANTHROPIC_API_KEY=sk-ant-...                  (dari console.anthropic.com)
CLIENT_ORIGIN=*                                (atau set ke URL Railway nanti)
PORT=3001                                      (Railway auto-detect tapi explicit OK)
NODE_ENV=production
```

### 3.3. Add Twilio (opsional, kalau mau aktifkan WA):

```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886    (sandbox default)
TWILIO_SKIP_VERIFY=false                       (production = false)
```

### 3.4. Add Berstock bridge (untuk integrasi Telegram approval):

```
BERSTOCK_BRIDGE_KEY=string-acak-shared-secret-min-32-char-sama-dgn-berstock-bot
BERUANG_CRM_PUBLIC_URL=https://<railway-domain>.up.railway.app
```

**⚠️ Catatan:** `BERSTOCK_BRIDGE_KEY` HARUS SAMA dengan `BERUANG_CRM_BRIDGE_KEY` yang
akan kita set di Cloudflare Worker (Berstock bot).

---

## 💾 STEP 4: ADD PERSISTENT VOLUME (untuk SQLite database)

⚠️ **WAJIB**, kalau gak data hilang tiap deploy.

### 4.1. Service → Tab **"Settings"** → scroll ke **"Volumes"**

### 4.2. Klik **"+ New Volume"**

- **Mount path:** `/data`
- **Size:** 1 GB (cukup banget untuk SQLite SQLite app)

### 4.3. Add env var baru:

```
DATABASE_PATH=/data/data.db
```

(File db.js udah saya update biar baca `DATABASE_PATH` env var → mount ke volume.)

---

## 🌐 STEP 5: GENERATE PUBLIC URL

### 5.1. Service → Tab **"Settings"** → **"Networking"**

### 5.2. Klik **"Generate Domain"**

Railway kasih URL seperti:
```
beruang-crm-production-xxxx.up.railway.app
```

### 5.3. (Opsional) Custom domain `beruang-crm.berstock.id`

- Tap **"+ Custom Domain"**
- Masukkan `beruang-crm.berstock.id`
- Railway kasih CNAME record
- Buka Cloudflare DNS dashboard:
  - Tambah CNAME `beruang-crm` → target dari Railway
  - Proxy status: **DNS Only** (orange cloud OFF)
- Tunggu 5-30 menit propagate

### 5.4. Update env var `BERUANG_CRM_PUBLIC_URL` ke URL final.

---

## ✅ STEP 6: VERIFY DEPLOY

### 6.1. Tab **"Deployments"** → tunggu build selesai (~3-5 menit)

Indicator hijau "Active" = deploy sukses.

### 6.2. Test health endpoint

Buka di Safari:
```
https://<your-railway-url>/api/health
```

Harus return:
```json
{"ok":true,"ts":"2026-05-19T..."}
```

### 6.3. Test full app

Buka:
```
https://<your-railway-url>/
```

Harus muncul halaman Login Beruang CRM. Tap "Daftar" → buat akun → test.

---

## 🔗 STEP 7: SETUP BERSTOCK BOT BRIDGE

Sekarang Telegram approval flow perlu di-link ke Beruang CRM yang udah live.

### 7.1. Buka Cloudflare Dashboard di Safari

- `dash.cloudflare.com`
- Workers & Pages → `berstock-bot`

### 7.2. Tab **Settings** → **Variables and Secrets**

### 7.3. Add 2 secrets baru:

| Variable | Value |
|---|---|
| `BERUANG_CRM_BRIDGE_KEY` | (SAMA dengan `BERSTOCK_BRIDGE_KEY` di Railway) |
| `BERUANG_CRM_API_URL` | `https://<railway-url>` (full URL Beruang CRM Railway) |

### 7.4. **Redeploy worker** — klik **"Save and Deploy"**

Atau lewat GitHub Actions kalau bos udah setup auto-deploy.

---

## 🧪 STEP 8: END-TO-END TEST

### 8.1. Login Beruang CRM (URL Railway)
- Daftar akun pertama
- Skip Inbox dulu

### 8.2. Buka **🏪 Integrasi BerBisnis** tab
- Tenant ID: `tnt_a82328a860e4` (PT SPC, yang udah ada di Berstock)
- API Key: (minta ke admin / yang udah di-provision)
- Telegram Chat ID: get dari Berstock bot (`/start` dulu)
- Klik **Save**, lalu **Sync Now**

### 8.3. Buka **🤖 AI Suggestions** tab
- Klik **Scan Now**
- AI akan generate suggestion (cek log Railway kalau ada error)
- Suggestion bakal push ke Telegram bos via Berstock bot

### 8.4. Test approve di Telegram
- Buka @BerstockBot di Telegram
- Tap tombol **✅ Approve** di message yang masuk
- Twilio bakal kirim WA ke customer (kalau Twilio aktif) atau cuma log (kalau simulator)

---

## 💰 ESTIMASI BIAYA RAILWAY

| Item | Cost/bulan |
|---|---|
| Service (Hobby plan) | $5 |
| Volume 1 GB | included |
| Bandwidth (low traffic) | included |
| **Total** | **~$5 (Rp 80rb)** |

Plus:
- Anthropic API: Rp 50-200rb/bulan (tergantung scan frequency)
- Twilio sandbox: free (production: Rp 700-1500/msg)

---

## 🆘 TROUBLESHOOTING

### Deploy failed: "npm install error"
- Cek Logs tab di Railway service
- Pastikan Root Directory = `beruang-crm`
- Pastikan Node version >= 20

### Database error / data hilang setelah redeploy
- Cek Volume udah ter-mount ke `/data`
- Cek env `DATABASE_PATH=/data/data.db`

### CORS error pas Telegram callback
- Cek `BERSTOCK_BRIDGE_KEY` SAMA di Cloudflare Worker + Railway

### Frontend white screen
- Cek Logs: ada `Serving static frontend from: .../client/dist`?
- Kalau gak, build:client gagal. Re-run deploy.

---

## 🔄 UPDATE / REDEPLOY

Setiap kali kita push commit baru ke branch `claude/financial-tracking-app-QUmrz`:

✅ Railway **auto-deploy** dalam ~3 menit

Bos gak perlu lakuin apa-apa — push doang.

---

## 📞 BUTUH BANTUAN?

Kalau stuck di step manapun:
1. Screenshot terminal/error Railway
2. Kirim ke Claude (session ini)
3. Saya pandu real-time
