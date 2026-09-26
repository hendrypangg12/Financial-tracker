# BerUang Android — catatan lanjut dari HP

Pembaruan terakhir: 26 September 2026. Ini catatan keadaan proyek saat laptop masih tersedia; bedakan rilis internal dari versi publik.

## Yang sudah tersimpan di GitHub

- Branch kerja: `codex/beruang-phone-handoff-20260926`
- Branch dapat dibuka dari HP: https://github.com/hendrypangg12/Financial-tracker/tree/codex/beruang-phone-handoff-20260926
- Gunakan commit terbaru pada branch ini; catatan dan perbaikan pemulihan langganan ikut disimpan di branch.
- Repo GitHub bersifat publik. Tidak ada signing keystore atau isi Cloudflare/Firebase service-account secret di commit.
- Source Android, konfigurasi Firebase klien, Google Play Billing, backend verifikasi pembelian, dan handler notifikasi pembaruan langganan ada di branch ini.

## Bukti build dan pemeriksaan

- Android debug APK berhasil dibuat: `mobile/android/app/build/outputs/apk/debug/app-debug.apk` (8,278,986 byte). Ini build uji dengan package `id.berstock.beruang.dev`; tidak cocok untuk diunggah sebagai aplikasi Play.
- Production Android App Bundle berhasil dibuat ulang setelah perbaikan sinkronisasi: `mobile/android/app/build/outputs/bundle/release/app-release.aab` (6,496,625 byte, SHA-256 `6A661E4AB26194AD64E8F20A308A41B7EFB04DA79593587B7F21E8173B79757C`). Isinya package `id.berstock.beruang`, version code 6, version name 1.4.0.
- AAB ditandatangani dengan upload key yang sidik jari SHA-1-nya cocok dengan upload key di Play Console. File kunci privat tetap hanya di laptop; jangan unggah atau kirim ke GitHub/chat.
- Pemeriksaan otomatis terakhir: mobile 12 lulus, 0 gagal, 0 dilewati, termasuk lima uji Firestore Rules pada emulator; backend 42 lulus, 0 gagal.
- Restore langganan native kini mencoba ulang setelah kegagalan, saat aplikasi kembali aktif, dan maksimal tiap enam jam selama sesi akun.
- Tidak ada perangkat Android/ADB yang terhubung, sehingga login Google, Play Billing, restore pembelian, dan sinkronisasi lintas perangkat belum diuji pada ponsel nyata.

## Keadaan Google Play dan pembayaran (cek per 26 September 2026)

- Versi publik yang terakhir terverifikasi: 1.3.0, version code 5. Dashboard Production menampilkan 8 instalasi dan 2 ulasan bintang 5 saat diperiksa.
- Versi 1.4.0/version code 6 telah diunggah dan dipublikasikan ke jalur Internal Testing, nama rilis `BerUang 1.4.0 - Sync langganan`. Status Console: tersedia untuk penguji; ini bukan rilis publik dan bukan pengajuan Production.
- Tautan bergabung Internal Testing: https://play.google.com/apps/internaltest/4701748702183636599. Penguji harus memakai akun Google yang masuk daftar uji dan perangkat Android yang didukung; perubahan dapat perlu waktu hingga sekitar satu jam untuk terlihat.
- Pemeriksaan Play memperingatkan 1.172 perangkat kehilangan dukungan (sekitar 8% dari perangkat yang tercatat untuk rilis sebelumnya) karena batas minimum naik dari API 23 ke 24. Ini terkait Capacitor 8 yang menetapkan minimum API 24. Menurunkan kembali minimum mungkin mengharuskan downgrade Capacitor ke 7 serta build dan tes ulang; pertimbangkan dukungan perangkat lawas sebelum Production.
- Play juga memperingatkan ukuran unduhan bertambah (5,96 MB dibanding 4,93 MB) dan tidak ada berkas deobfuscation; R8 saat ini nonaktif, jadi peringatan deobfuscation bukan blocker.
- Langganan aktif di Play Console: `beruang_monthly_subscription` / `monthly-30d` dan `beruang_annual_subscription` / `annual-365d`. Keduanya auto-renewing dan cocok dengan ID yang dibaca klien/backend.
- Worker Cloudflare memiliki secret bernama `FIREBASE_SERVICE_ACCOUNT_JSON` dan `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (hanya keberadaan nama yang diperiksa; isi tidak dibaca/dicetak).
- Endpoint live `/api/google-play/verify` menjawab 401 untuk permintaan tanpa login. Ini membuktikan rute meminta autentikasi, bukan bahwa verifikasi pembelian berhasil dari ujung ke ujung.
- Worker Cloudflare produksi kini sudah memuat verifikasi Google Play dan handler RTDN dari branch ini: version `c8d92158-5034-4c6b-a291-54cb98cc2c75`, deployed 26 September 2026 06:35 UTC. Smoke check tanpa login mendapat HTTP 401 sesuai harapan; transaksi Play sungguhan belum dites.
- RTDN belum aktif: di Play Console checkbox masih mati dan kolom topic kosong; di Google Cloud project `ber-uang-735b3` belum ada Pub/Sub topic. Perlu topic, push subscription yang memakai OIDC, izin publish Google Play, lalu simpan audience/email service account di Worker dan kirim test notification.

## Urutan kerja berikutnya

1. Selesaikan Pub/Sub/RTDN dengan OIDC push dan kirim test notification dari Play Console.
2. Uji build internal di HP Android: login Google, data akun konsisten di dua perangkat, pembelian Play, pemulihan langganan, dan pembatalan. Transaksi sungguhan dan renewal otomatis belum teruji.
3. Putuskan apakah kenaikan minimum API 24 dapat diterima. Jika tidak, evaluasi downgrade Capacitor 7 lalu bangun version code berikutnya (code 6 sudah terpakai di Console).
4. Jika tes dan pemeriksaan kebijakan lolos, promosikan build dari jalur test ke Production. Versi publik tetap 1.3.0/version code 5 sampai rilis Production disetujui dan tayang.

## Berkas lokal yang tidak ikut ke HP/GitHub

- AAB dan APK yang dibuat berada di folder build lokal di atas; folder ini diabaikan Git.
- Upload keystore dan info penandatanganan berada di folder unduhan lokal. Jangan hapus/cabut akses laptop sebelum keystore dicadangkan dengan aman; keystore ini diperlukan untuk menandatangani pembaruan Play berikutnya.
- Sesi login Play Console, Firebase, dan Cloudflare pada laptop tidak ikut tersinkron hanya karena source branch dibuka dari HP.
