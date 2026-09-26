# Audit BerUang Pra-Jualan — 26 September 2026

Diperiksa langsung dari kode di branch `claude/financial-tracking-app-QUmrz`, server produksi
(Worker + Firestore via REST), dan tes browser. Bukan dari asumsi.

## Status singkat

| Area | Status | Catatan |
|---|---|---|
| Aplikasi live di Play Store (Indonesia) | ✅ | Versi lama (web dibungkus). Update v1.3.0 masih review |
| Daftar akun baru | ✅ | Diperbaiki 26 Sep (secret Firebase) |
| Firestore Rules produksi | ✅ | User tidak bisa ubah plan sendiri (dites: 403) |
| Kunci total saat paket habis | ✅ | Diperbaiki hari ini: offline tidak ikut terkunci, backup tetap bisa diunduh |
| Trial 2 hari tanpa AI | ✅ | Client + server + bot Telegram |
| **AI Advisor** | 🚨 MATI | Saldo Anthropic habis → semua user (termasuk yang bayar) kena error |
| Pembayaran Google Play (v1.3.0) | 🚨 BELUM SIAP | Secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` belum ada di worker live |
| Login Google di Android | ❌ | Gagal di versi live; disembunyikan di v1.3.0. Perlu native sign-in (build berikutnya) |
| Admin panel (aktivasi manual) | ❓ | Butuh custom claim `admin` di akun bos — BELUM DIVERIFIKASI |
| Halaman depan berstock.id | ⚠️ | Masih tulis "Coba 7 hari cuma Rp 10rb", tidak sebut gratis 2 hari & AI khusus berbayar |
| Syarat & Ketentuan / kebijakan refund | ❌ | Belum ada (privacy.html ada) |
| Build Android di repo (`mobile/`) | ⚠️ | Belum membawa kunci total + trial tanpa AI (perlu versionCode 6) |

## Wajib sebelum jualan (urut prioritas)

1. **Top-up saldo Anthropic** (console.anthropic.com → Billing, nyalakan auto-reload).
   Tanpa ini, produk yang dijual (AI Akuntan) tidak jalan.
2. **Tes admin panel dengan akun admin bos.** Kalau daftar user tidak muncul / tombol aktivasi gagal,
   berarti custom claim `admin` belum diset → bos tidak bisa mengaktifkan pembeli QRIS/BCA.
3. **Pasang `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`** di Cloudflare akun icloud (langkah sudah dikirim di chat).
   Kalau update v1.3.0 lolos review sebelum ini dipasang, pembeli lewat Google Play bayar tapi paket tidak aktif.
4. **Samakan pesan di berstock.id & landing.html** dengan kenyataan: gratis 2 hari (tanpa AI) → Rp 10rb/7 hari,
   Rp 50rb/30 hari, Rp 299rb/tahun. Sekarang homepage bilang "Coba 7 hari Rp 10rb" seolah tidak ada gratis.
5. **Buat halaman Syarat & Ketentuan singkat** (masa aktif tidak diperpanjang otomatis, kebijakan refund,
   batas AI 30 pertanyaan/hari, data bisa diunduh/dihapus). Dipasang di app + Play listing.
6. **Cek Play Console → Data safety** sudah menyebut data keuangan dikirim ke pihak ketiga (Anthropic, Cloudflare)
   sesuai privacy.html. Ketidaksesuaian = risiko takedown.

## Sebaiknya diperbaiki (setelah jualan mulai)

- **Peringatan H-1 sebelum kunci.** Sekarang hanya ada label "X hari lagi" di header. Tambah banner/toast
  "Paket habis besok" supaya user tidak kaget terkunci.
- **Login Google native** untuk Android (versionCode 6) + bawa kunci total & trial tanpa AI ke build Capacitor.
- **Ikon & teks listing Play** (sudah siap di `store-assets/`), tempel setelah review selesai.
- **Jam HP bisa dimajukan/dimundurkan** untuk mengakali masa aktif di aplikasi (AI aman karena dicek server).
  Perbaikan: pakai waktu server saat baca profil. Risiko kecil, biaya kecil.
- **Verifikasi email** belum ada. Akun palsu hanya dapat 2 hari tanpa AI → biaya ~0. Bisa ditunda.
- **Data satu dokumen per user** (`users/{uid}/data/main`). Aman sampai ribuan transaksi; perlu dipecah
  kalau ada user dengan puluhan ribu transaksi.
- **Notifikasi** hanya lewat Telegram. Tidak ada push notification di aplikasi.

## Catatan bisnis (pendapat, bukan bug)

- **Trial 2 hari tanpa AI** = user tidak pernah mencoba fitur andalan sebelum bayar. Konversi kemungkinan
  rendah. Alternatif murah: beri **3 pertanyaan AI** selama trial (biaya ≈ Rp 300/user). Keputusan bos.
- Kompetitor lokal rata-rata kasih free trial 14–30 hari. BerUang paling ketat di pasar; kompensasinya
  harga masuk Rp 10rb sangat murah. Pantau angka: berapa % trial → bayar.
- Semua pembayaran web masih manual (QRIS/BCA → bos aktifkan). Untuk puluhan user sehari ini akan jadi beban.
  Google Play Billing (v1.3.0) menyelesaikan ini untuk Android.

## Yang sudah dikerjakan hari ini

- Fix bug: user berbayar tidak lagi terkunci saat offline / server gangguan.
- User terkunci tetap bisa mengunduh backup datanya (tombol di paywall).
- Deploy bot diperbaiki (ID KV), pendaftaran akun jalan, trial tanpa AI, AI riwayat 6 bulan,
  kunci total, video promosi, teks ASO.
