# Usage Tracker — Pemakaian Token & Biaya Claude

Dashboard untuk pantau pemakaian token dan biaya Claude API secara otomatis lewat **Anthropic Admin API**.

```
usage-tracker/
├── index.html          # Dashboard (deploy ke GitHub Pages)
├── styles.css
├── js/app.js
└── worker/             # Cloudflare Worker proxy
    ├── src/index.js
    ├── wrangler.toml
    └── package.json
```

## Kenapa pakai Worker?

Anthropic Admin Key punya akses penuh ke organisasi (bisa lihat semua usage, bikin API key, dll). Jangan pernah taruh di browser. Worker jadi gatekeeper:

- Browser → Worker (auth dengan `DASHBOARD_KEY` random buatan kita)
- Worker → Anthropic Admin API (auth dengan `ANTHROPIC_ADMIN_KEY` asli, disimpan sebagai secret di Cloudflare)

---

## Setup (sekali doang, ~15 menit)

### 1. Ambil Anthropic Admin Key

1. Login ke [console.anthropic.com](https://console.anthropic.com) sebagai **Owner** organisasi (akun lain gak bisa).
2. Settings → **Admin Keys** → **Create Admin Key**.
3. Kasih nama `usage-tracker`, copy keynya (mulai dengan `sk-ant-admin01-...`). Simpan sementara di password manager — dia cuma muncul sekali.

### 2. Bikin Dashboard Key

Generate string random sendiri. Contoh di terminal:

```bash
openssl rand -hex 32
```

Simpan stringnya — nanti dipakai 2x (di worker secret + di dashboard).

### 3. Deploy Cloudflare Worker

Asumsi sudah punya akun Cloudflare gratis dan Wrangler terinstall.

```bash
cd usage-tracker/worker

# install wrangler kalau belum
npm install

# login Cloudflare (browser akan kebuka)
npx wrangler login

# set 2 secrets — paste-kan key saat diminta
npm run set:admin-key       # paste sk-ant-admin01-...
npm run set:dashboard-key   # paste hasil openssl rand -hex 32

# deploy
npm run deploy
```

Output deploy akan kasih URL semacam:

```
https://claude-usage-proxy.<your-subdomain>.workers.dev
```

Test cepat:

```bash
curl https://claude-usage-proxy.<your-subdomain>.workers.dev/health
# → {"ok":true,"ts":"..."}
```

### 4. Konfigurasi Dashboard

1. Buka `https://hendrypangg12.github.io/Financial-tracker/usage-tracker/` (setelah branch ini di-merge ke `main`).
2. Klik **⚙️ Pengaturan**.
3. Isi:
   - **Worker URL**: dari step 3 (tanpa trailing slash)
   - **Dashboard Key**: string random yang sama dari step 2
   - **Kurs IDR per USD**: opsional, default 16500
4. **Simpan** → data otomatis ke-load.

Settings disimpan di `localStorage` browser, jadi cuma di device kamu sendiri.

---

## Fitur Dashboard

- **4 KPI card**: total token, total biaya (USD + IDR), cache hit rate, model paling dipakai
- **Chart**:
  - Token harian (stacked bar: input · output · cache write · cache read)
  - Biaya harian (line, USD)
  - Distribusi per model (doughnut)
  - Komposisi token (doughnut)
- **Filter**: rentang tanggal, granularity (harian/jam), group by (model / API key / workspace / service tier)
- **Quick range**: 7 / 14 / 30 hari
- **Tabel detail** per bucket × group

---

## Endpoint Worker

| Method | Path        | Deskripsi                                                   |
|--------|-------------|-------------------------------------------------------------|
| GET    | `/health`   | Health check (no auth)                                      |
| GET    | `/usage`    | Proxy ke `/v1/organizations/usage_report/messages`          |
| GET    | `/cost`     | Proxy ke `/v1/organizations/cost_report`                    |

Semua param query Admin API yang relevan (whitelist) diteruskan apa adanya. Auth: header `X-Dashboard-Key` (atau `?key=` untuk testing).

---

## Update / Maintenance

- **Ganti admin key**: `npm run set:admin-key` lalu `npm run deploy`.
- **Tambah origin** (misal preview link): edit `ALLOWED_ORIGINS` di `wrangler.toml` lalu redeploy.
- **Lihat log live**: `npm run tail`.
- **Bump cache buster** dashboard: ubah `?v=1` di `index.html` jadi `?v=2`.

---

## Limit Anthropic Admin API

- `bucket_width=1d` → max **31 hari** per request
- `bucket_width=1h` → max **168 jam** (7 hari)
- Worker otomatis follow `next_page` (sampai 20 halaman per fetch)
- Cost report **selalu harian** (`1d`)

Kalau butuh range lebih panjang, lakukan beberapa fetch dengan tanggal berbeda lalu gabung di frontend (belum implemented).

---

## Troubleshooting

| Gejala                                                    | Penyebab                                | Fix                                                          |
|-----------------------------------------------------------|-----------------------------------------|--------------------------------------------------------------|
| `401 unauthorized` di toast                               | Dashboard Key salah / belum match       | Cek `Pengaturan` & secret di worker                          |
| `500 ANTHROPIC_ADMIN_KEY belum di-set`                    | Lupa `npm run set:admin-key`            | Set secret lalu deploy ulang                                 |
| `403` dari Anthropic                                      | Admin key bukan dari Owner              | Bikin admin key baru dari akun Owner                         |
| Cache hit 0% padahal pakai prompt caching                 | Belum ada request cached, atau range terlalu pendek | Cek di Berstock bot apakah `cache_control` sudah diset |
| CORS error di console                                     | Domain belum di whitelist               | Tambah ke `ALLOWED_ORIGINS` di `wrangler.toml`               |

---

## Cost Worker

Cloudflare Workers free tier: **100.000 request/hari**. Dashboard ini paling banyak ~5 request per refresh, jadi gratis seumur hidup buat 1-2 user.

Anthropic Admin API: **gratis** (gak masuk ke billing token).
