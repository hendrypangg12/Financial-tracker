# 🐻 BerUang — Catet dulu, biar beneran ber-uang

Aplikasi pencatatan keuangan pribadi berbasis web. Tidak perlu server — cukup buka `index.html` di browser. Semua data disimpan di `localStorage` browser Anda.

## Fitur

1. **Input Pemasukan & Pengeluaran** via 3 cara:
   - **Form** biasa (tanggal, jenis, jumlah, deskripsi, kategori, alokasi)
   - **Chat** bahasa alami, contoh: `bensin pertamax 250rb`, `makan bakso 45000`, `terima gaji 5jt`, `beli kopi 28k kemarin`
   - **Struk** belanja — tempel teks struk, aplikasi mengekstrak item & total otomatis
2. **Dashboard** lengkap mirip Google Sheets "Financial Tracker":
   - 4 kartu ringkasan (Pemasukan, Pengeluaran, Sisa Saldo, Total Transaksi) + % perbandingan ke bulan lalu
   - Grafik pengeluaran harian
   - Top pengeluaran & pemasukan
   - Pie kategori pengeluaran & pemasukan
   - Alokasi **50/30/20** (Kebutuhan / Keinginan / Investasi) dengan ring progress
   - Perbandingan bulan ini vs bulan lalu per sub-kategori
   - Tabel & grafik **6 bulan terakhir**
3. **Rekap**: Harian, Mingguan, Bulanan — dengan tabel dan chart.
4. **Kategori & sub-kategori** yang bisa ditambah/dihapus.
5. **Export/Import JSON** untuk backup.

## Cara pakai

1. Buka `index.html` di browser (double click atau drag ke browser).
2. Gunakan tab **Tambah** untuk input transaksi — pilih salah satu:
   - Form, atau
   - Chat (ketik natural seperti ngobrol), atau
   - Struk (paste teks struk belanja)
3. Buka tab **Dashboard** untuk melihat ringkasan bulan ini.
4. Gunakan tab **Rekap** untuk melihat rekapan Harian/Mingguan/Bulanan.
5. Klik **Export** di kanan atas untuk backup data ke file `.json`.

## Contoh input chat
- `bensin pertamax 250rb` → Pengeluaran Rp 250.000, BBM/bensin, Transportasi, Kebutuhan
- `makan bakso 45000 kemarin` → Pengeluaran Rp 45.000, Makan keluarga di luar, Konsumsi Makan, Keinginan
- `terima gaji 5jt` → Pemasukan Rp 5.000.000, Gaji bulanan
- `beli kopi 28k` → Pengeluaran Rp 28.000, Minuman/jajan
- `bayar listrik 350rb` → Pengeluaran Rp 350.000, Listrik & air, Hunian, Kebutuhan
- `investasi emas 500rb` → Pengeluaran Rp 500.000, Investasi emas, Tabungan & Investasi, Investasi

## Struktur file
```
index.html        # struktur halaman
styles.css        # styling (warna, grid, kartu, chart)
js/data.js        # konstanta + kategori default + keyword map
js/utils.js       # format rupiah, parse amount, helper tanggal
js/storage.js     # state & localStorage (CRUD, export/import)
js/parser.js      # parser chat & struk
js/dashboard.js   # render dashboard + chart (Chart.js)
js/pages.js       # halaman Transaksi, Rekap, Kategori
js/app.js         # inisialisasi, tab, form, event handler
```

Data disimpan lokal di browser (`localStorage` key `financial-tracker-v1`). Gunakan **Export** untuk backup ke file JSON, dan **Import** untuk memulihkan.
