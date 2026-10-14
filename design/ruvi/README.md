# Ruvi — maskot asisten AI BerUang (desain, Oktober 2026)

Keputusan bos (13 Okt 2026):
- **Nama:** Ruvi (dibaca RU-vi). Ditolak: Kuma (terlalu umum), Benji/Zeni (dipakai fintech lain),
  awalan "Pang" (ada aplikasi keuangan Indonesia bernama "Pang", com.pang.mobile — pesaing langsung).
- **Bentuk:** Kapsul Kaca versi **A "Ruvi Klasik"** — badan kapsul kaca transparan, wajah layar gelap,
  mata bulat mint bercahaya, pipi merona, inti energi menyala di dada, tangan melayang, antena bola.
  Generator SVG: `podgen.py` → `pod(i, body='capsule', eyes='round', mouth='smile', hand='wave')`.
- **Ekspresi berubah otomatis sesuai keadaan user** (`ruvi-a.html`, video `ruvi-a-ekspresi.mp4`):
  menyapa (app dibuka) · mendengarkan (mic) · berpikir (AI menjawab) · ceria (pemasukan/target) ·
  kasih tips (saran hemat) · khawatir (lewat budget) · sayang (7 hari beruntun) · tidur (malam/lama tak dibuka).
  Warna antena ikut suasana hati; inti dada selalu "bernapas", cepat saat berpikir.
- **Komunikatif, TEKS SAJA (tanpa suara):** Ruvi bicara duluan, mulut bergerak saat "bicara",
  kalimat diketik huruf per huruf (`ruvi-talk.html`, video `ruvi-ngobrol.mp4`).
  Gaya: aku–kamu, hangat, selalu pakai angka nyata user, maks 2 kalimat, peringatan ditutup tawaran bantuan.
  Batas: bicara duluan maks 2–3x/hari; reaksi setelah mencatat selalu; ada tombol "Ruvi diam dulu".
  Sebagian besar kalimat = hitungan biasa (gratis); AI hanya untuk pertanyaan bebas.
- **Gaya UI:** kaca (glassmorphism) ala iOS, aksen mint→indigo. HP terang, web gelap futuristik;
  rencana: ikut mode terang/gelap perangkat.
- **Pasar:** Indonesia dulu, siap dua bahasa (mockup EN tersedia). Go international setelah ~50–100 pembeli.

File: `mockup-hp-id.*`, `mockup-hp-en.*`, `mockup-web.*` (HTML bisa dibuka di browser, animasi jalan),
`ruvi-6-konsep.*` (6 arah desain awal), `ruvi-pod-variasi.*` (6 variasi kapsul).
Render: Playwright Chromium `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, video via `render(t)` per frame
+ ffmpeg dari pip `imageio-ffmpeg`.
