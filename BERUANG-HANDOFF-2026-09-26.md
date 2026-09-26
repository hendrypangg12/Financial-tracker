# BerUang Android — catatan lanjut dari HP

Pembaruan terakhir: 26 September 2026. Ini catatan keadaan proyek saat laptop masih tersedia; jangan anggap build lokal sebagai rilis Play Store.

## Yang sudah tersimpan di GitHub

- Branch kerja: `codex/beruang-phone-handoff-20260926`
- Branch dapat dibuka dari HP: https://github.com/hendrypangg12/Financial-tracker/tree/codex/beruang-phone-handoff-20260926
- Commit sumber terakhir saat catatan ini dibuat: `43a6aafec12edb2c44d50cb21db7ff17b5136fdc` (catatan ini akan menjadi commit berikutnya).
- Repo GitHub bersifat publik. Tidak ada signing keystore atau isi Cloudflare/Firebase service-account secret di commit.
- Source Android, konfigurasi Firebase klien, Google Play Billing, backend verifikasi pembelian, dan handler notifikasi pembaruan langganan ada di branch ini.

## Bukti build dan pemeriksaan

- Android debug APK berhasil dibuat: `mobile/android/app/build/outputs/apk/debug/app-debug.apk` (8,278,986 byte). Ini build uji dengan package `id.berstock.beruang.dev`; tidak cocok untuk diunggah sebagai aplikasi Play.
- Production Android App Bundle berhasil dibuat: `mobile/android/app/build/outputs/bundle/release/app-release.aab` (6,496,427 byte). Isinya package `id.berstock.beruang`, version code 6, version name 1.4.0.
- AAB ditandatangani dengan upload key yang sidik jari SHA-1-nya cocok dengan upload key di Play Console. File kunci privat tetap hanya di laptop; jangan unggah atau kirim ke GitHub/chat.
- Pemeriksaan otomatis terakhir: mobile 6 lulus, 0 gagal, 1 dilewati (uji Firestore Rules emulator tidak dijalankan); backend 42 lulus, 0 gagal.
- Tidak ada perangkat Android/ADB yang terhubung, sehingga login Google, Play Billing, restore pembelian, dan sinkronisasi lintas perangkat belum diuji pada ponsel nyata.

## Keadaan Google Play dan pembayaran (cek per 26 September 2026)

- Versi publik yang terakhir terverifikasi: 1.3.0, version code 5. Versi 1.4.0/version code 6 di atas baru build lokal; belum diunggah atau dikirim untuk ditinjau.
- Langganan aktif di Play Console: `beruang_monthly_subscription` / `monthly-30d` dan `beruang_annual_subscription` / `annual-365d`. Keduanya auto-renewing dan cocok dengan ID yang dibaca klien/backend.
- Worker Cloudflare memiliki secret bernama `FIREBASE_SERVICE_ACCOUNT_JSON` dan `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (hanya keberadaan nama yang diperiksa; isi tidak dibaca/dicetak).
- Endpoint live `/api/google-play/verify` menjawab 401 untuk permintaan tanpa login. Ini membuktikan rute meminta autentikasi, bukan bahwa verifikasi pembelian berhasil dari ujung ke ujung.
- Deployment Worker live terakhir yang terlihat: 25 September 2026, version `c09710fd`. Deployment itu lebih lama daripada perubahan kode pembayaran Play di branch ini. Jadi verifikasi pembelian dan notifikasi pembaruan langganan dalam branch belum aktif di Worker produksi.
- Handler RTDN sudah ada di source, tetapi variabel `GOOGLE_PLAY_RTDN_AUDIENCE` dan `GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL`, serta sambungan Pub/Sub ke endpoint, belum dikonfigurasi/dibuktikan. Tanpa RTDN, pembaruan otomatis setelah perpanjangan atau pembatalan belum terjamin.

## Urutan kerja berikutnya

1. Jalankan backend Play billing + RTDN di staging dengan pembelian uji; buktikan aktivasi, restore, renewal, cancel, expiry, dan akun BerUang yang benar.
2. Uji login Google dan pembelian dari HP Android. ADB saat pemeriksaan kosong, jadi perlu perangkat Android untuk langkah ini.
3. Siapkan konfigurasi Pub/Sub/RTDN dan audience/service account untuk Worker; deploy Worker setelah staging lolos. Deployment produksi belum dilakukan dari branch ini.
4. Bangun ulang AAB setelah pengujian, lalu unggah version code 6 ke jalur pengujian Play terlebih dahulu. Rilis publik baru setelah tes dan Console menyatakan siap.

## Berkas lokal yang tidak ikut ke HP/GitHub

- AAB dan APK yang dibuat berada di folder build lokal di atas; folder ini diabaikan Git.
- Upload keystore dan info penandatanganan berada di folder unduhan lokal. Jangan hapus/cabut akses laptop sebelum keystore dicadangkan dengan aman; keystore ini diperlukan untuk menandatangani pembaruan Play berikutnya.
- Sesi login Play Console, Firebase, dan Cloudflare pada laptop tidak ikut tersinkron hanya karena source branch dibuka dari HP.
