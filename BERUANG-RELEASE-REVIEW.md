# BerUang — perbaikan persiapan penjualan, 21 September 2026

Status: draft untuk review, **belum layak langsung dirilis**. Tidak ada perubahan produksi, secret, akun pelanggan, atau data pembayaran.

## Perbaikan dalam branch ini

- AI membutuhkan Firebase ID token yang diperiksa Google. UID terverifikasi menggantikan email kiriman pengguna untuk kuota. Status Pro dibaca dari Firestore; Goal gratis tetap satu hasil per bulan. Batas pertanyaan Goal diperbesar karena prompt bawaan melampaui batas lama 500 karakter.
- Pembuatan dan verifikasi invoice memerlukan login. UID/email berasal dari token, invoice hanya dapat dibaca pemiliknya, dan redirect dibatasi ke aplikasi BerUang.
- Webhook menolak semua permintaan jika secret belum dikonfigurasi. ID invoice, jumlah, dan mata uang harus cocok. Event expired terlambat tidak membatalkan pembayaran yang sudah lunas.
- Aktivasi langganan menggunakan transaksi Firestore dan receipt per referensi untuk mencegah aktivasi ganda. Ini **belum memindahkan otoritas aktivasi ke server**.
- Data lokal dipisah per UID dan dipertahankan saat logout. Cache lama tidak otomatis dipindah ke akun yang belum diketahui pemiliknya; key lama tetap tersedia untuk pemulihan manual.
- Bootstrap memuat lokal sebelum cloud dan tidak memuat ulang lokal setelah cloud. Penulisan cloud memakai transaksi dengan pembandingan snapshot. Konflik menyimpan backup dan menghentikan penimpaan; ketuk status konflik untuk mengunduh kedua versi dan memilih versi cloud. Penggabungan otomatis belum dilakukan.
- Cache PWA diperbarui dan Goal Planner dimasukkan ke precache. Pengujian PR tidak melakukan deployment; workflow deployment yang sudah ada menjalankan tes sebelum deploy.

## Penghambat rilis yang perlu diselesaikan

1. **Firestore Security Rules produksi belum tersedia di repo dan belum diperiksa.** Pembacaan status Pro tidak aman bila pengguna dapat mengubah `plan`/`expiresAt` sendiri. Alur aktivasi lama masih menulis langganan dari browser. Sebelum menerima pembayaran otomatis, pindahkan aktivasi ke backend tepercaya dan buat rules yang melarang perubahan entitlement oleh pengguna biasa. Jangan sekadar membuka izin untuk collection `users/{uid}/paymentReceipts`; aturan dan aktivasi harus dirancang bersama. Tetap gunakan aktivasi manual oleh admin sampai itu selesai.
2. Kuota Worker masih memakai KV read/write yang tidak atomik. UID menutup penggantian email, tetapi permintaan paralel dapat melampaui batas. Gunakan penyimpanan transaksional/rate limiter sebelum penjualan luas. Jangan menjanjikan AI unlimited.
3. Verifikasi Firebase API key di Worker di lingkungan staging: konfigurasi pembatasan key produksi tidak terlihat dari repo. Verifikasi project cocok. ID token/secret jangan dicatat dalam log.
4. Periksa saldo dan akses model Anthropic dengan akun uji. Health endpoint tidak membuktikan panggilan AI bekerja. Model tidak diganti dalam perubahan ini.
5. Uji Firebase Emulator/staging dengan rules sebenarnya: dua perangkat, edit offline, pergantian akun, transaksi bersamaan, dan pembayaran sandbox. Unit test memalsukan layanan eksternal; bukan bukti integrasi produksi.
6. Klien lama yang belum menerima pembaruan masih dapat menulis memakai implementasi lama. Saat rilis, pastikan pembaruan klien dan rules/version gate terkoordinasi. Snapshot satu dokumen juga masih memerlukan rencana pemecahan ketika data membesar.

## Urutan rilis yang disarankan

Selesaikan otoritas pembayaran/rules → uji staging → deploy Worker yang menerima token → rilis frontend dengan cache baru → uji satu akun pelanggan. Perubahan kontrak AI akan menolak frontend lama tanpa token; jadwalkan pembaruan bersama. Jangan merge draft ini ke branch produksi sebelum penghambat di atas ditangani.

## Sumber implementasi

- Firebase Auth REST: https://firebase.google.com/docs/reference/rest/auth#section-get-account-info
- Transaksi Firestore: https://firebase.google.com/docs/firestore/manage-data/transactions
- Firestore REST dan rules: https://firebase.google.com/docs/firestore/use-rest-api

Jalankan dari `bot/`: `npm ci`, lalu `npm test`. Tes tidak menghubungi Firebase, Anthropic, Xendit, atau pelanggan nyata.
