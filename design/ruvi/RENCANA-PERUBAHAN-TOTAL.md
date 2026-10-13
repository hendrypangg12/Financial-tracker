# Rencana Perubahan Total BerUang → "BerUang × Ruvi"

Disusun 13 Oktober 2026. Acuan tampilan: https://berstock.id/demo-ruvi.html
Desain & keputusan maskot: `design/ruvi/README.md`

## Prinsip

1. **Data dan server TIDAK diubah.** Akun, transaksi, sinkron Firestore, langganan Google Play,
   bot Telegram, AI Akuntan tetap jalan. Yang berubah: tampilan dan cara mencatat. User lama tidak kehilangan apa pun.
2. **Bertahap dan bisa dibatalkan.** Tampilan baru dipasang di balik saklar "Coba tampilan baru"
   dulu, lalu jadi default setelah aman. Tampilan lama tetap ada sebagai cadangan 1–2 versi.
3. **Satu sumber kode** untuk web (berstock.id/app.html) dan Android (Capacitor). Selesai di web → masuk build Android.
4. **Hemat AI.** Pencatatan memakai parser gratis; AI hanya untuk kalimat yang tidak terbaca (paket berbayar)
   dan pertanyaan bebas.

## Fitur lama → tempatnya di versi baru

| Sekarang | Versi Ruvi |
|---|---|
| Tab Dashboard | **Beranda**: saldo, masuk/keluar, arus kas, kategori, transaksi terbaru, Ruvi menyapa |
| Tab Tambah (form, chat, struk, tagihan rutin) | **Ngobrol dengan Ruvi** (chat, suara, foto struk) + form manual tetap ada di menu "+" |
| Tab Transaksi | **Transaksi** (per tanggal, cari, ubah/hapus) |
| Tab Rekap / Laporan | **Laporan** (6 bulan, kategori, "Kata Ruvi") |
| Tab Rencana (hutang-piutang, target) | **Target & budget** (+ budget per kategori — fitur baru) |
| Aset/Kekayaan (Setup Dana Awal) | **Dompet** (fitur baru, permintaan bos 13 Okt): kartu saldo per bank/e-wallet/tunai/investasi di beranda, "+ Dompet baru", pindah dana ("pindah 500rb dari bca ke gopay", "top up gopay", "beli reksadana 1jt"), investasi terpisah dari uang harian + total kekayaan. Ketuk dompet → detail masuk/keluar; setiap transaksi (termasuk catatan Ruvi) bisa diubah/dihapus manual |
| AI Akuntan (tombol melayang) | Menyatu di panel Ruvi |
| Peringatan "Perlu dicek", panduan "Mulai di sini" | Disampaikan Ruvi sebagai pesan |
| Telegram, tagihan rutin, Setup Dana Awal, kategori custom (Codex), backup, Admin | Tetap, dipindah ke menu Profil/Pengaturan |
| Paywall, uji coba 2 hari, hard lock | Tetap, tampilannya diganti gaya kaca + Ruvi |

## Tahapan

| Fase | Isi | Siapa | Perkiraan |
|---|---|---|---|
| **0. Prasyarat** | Audit perubahan Codex 1.4.6 → rilis ke Production → tes beli di emulator → isi saldo Anthropic | Claude audit, ChatGPT/bos build & tes | 1–3 hari |
| **1. Fondasi desain** | Token warna (gelap/terang ikut perangkat), komponen kaca, Ruvi sebagai komponen JS (8 ekspresi), cadangan tanpa blur untuk HP lemah | Claude | 3–4 hari |
| **2. Kerangka baru** | 4 menu (Beranda, Transaksi, Laporan, Target), panel Ruvi (laptop) / tombol "Catat ke Ruvi" (HP), saklar "Coba tampilan baru" | Claude | 3–4 hari |
| **3. Otak Ruvi** | Parser multi-transaksi (pakai parser + kategori Codex), aturan reaksi (budget, pemasukan, beruntun, mingguan), pesan proaktif maks 2–3/hari, "Ruvi diam dulu", sambung ke AI Akuntan untuk pertanyaan bebas | Claude | 4–5 hari |
| **4. Pindah semua halaman** | Beranda, Transaksi, Laporan, Target & budget, hutang-piutang, pengaturan, paywall, onboarding dengan Ruvi | Claude | 5–7 hari |
| **5. Uji & rilis** | Uji di web (iPhone bos) → build Android → Internal Testing → Production bertahap 10% | Bos + ChatGPT, Claude perbaiki | 3–5 hari |
| **6. Toko & pemasaran** | Ikon baru (Ruvi), feature graphic, screenshot Play, video promosi Ruvi, teks listing "AI" | Claude render, bos unggah | 2 hari |
| **7. (Nanti) Internasional** | Bahasa Inggris + multi mata uang, buka negara lain | Setelah ~50–100 pembeli | — |

Total realistis: **±4–5 minggu** sampai versi Ruvi tayang penuh di Play Store.

## Risiko & penangkalnya

- **User lama kaget** → saklar tampilan baru + pesan perkenalan Ruvi + tampilan lama sebagai cadangan.
- **HP Android murah lambat karena efek kaca** → deteksi otomatis, pakai kartu tanpa blur.
- **Budget per kategori = data baru** → ditambah sebagai kolom baru di data user, tidak mengubah data lama.
- **Ruvi terlalu cerewet** → batas 2–3 sapaan/hari + tombol diam.
- **Kerja paralel Claude & ChatGPT/Codex bentrok** → semua kerja di branch `claude/financial-tracking-app-QUmrz`,
  wajib `git pull` sebelum mulai dan push setelah selesai; satu pihak per bagian.

## Keputusan yang perlu bos ambil

1. ~~Tema default~~ ✅ DIPUTUSKAN 13 Okt: ikut pengaturan HP + tombol ☀️/🌙 untuk ganti manual (sudah di demo).
2. Fitur **budget per kategori** dimasukkan di fase 3? (disarankan ya — inilah yang membuat Ruvi bisa "khawatir" dan kasih tips)
3. Untuk kalimat yang tidak terbaca parser, boleh pakai **model AI kecil yang lebih murah** (khusus paket berbayar)?
4. **Ikon aplikasi** diganti wajah Ruvi? Nama aplikasi tetap "BerUang"?
5. Saklar "Coba tampilan baru" dulu (aman), atau langsung ganti semua?
