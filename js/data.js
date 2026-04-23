// Konstanta dan kategori default
const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
const DAYS_SHORT = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

const DEFAULT_CATEGORIES = {
  pengeluaran: {
    'Hunian': { alokasi: 'Kebutuhan', subs: ['KPR & cicilan mobil', 'Listrik & air', 'Perawatan rumah'] },
    'Tabungan & Investasi': { alokasi: 'Investasi', subs: ['Investasi reksa dana/saham', 'Investasi emas'] },
    'Pendidikan & Anak': { alokasi: 'Kebutuhan', subs: ['Les privat/kursus', 'Buku & perlengkapan sekolah'] },
    'Belanja Dapur': { alokasi: 'Kebutuhan', subs: ['Belanja bulanan supermarket', 'Belanja sayur/lauk/buah'] },
    'Konsumsi Makan': { alokasi: 'Keinginan', subs: ['Makan keluarga di luar', 'Makan pagi bubur', 'Minuman/jajan'] },
    'Kesehatan': { alokasi: 'Kebutuhan', subs: ['BPJS/Kesehatan', 'Obat & Apotek'] },
    'Transportasi': { alokasi: 'Kebutuhan', subs: ['BBM/bensin', 'Servis motor/mobil', 'Parkir & Tol'] },
    'Lifestyle & Self-care': { alokasi: 'Keinginan', subs: ['Fashion/pakaian', 'Gas/LPG', 'Salon & perawatan'] },
    'Hiburan & Rekreasi': { alokasi: 'Keinginan', subs: ['Nonton bioskop/teater', 'Langganan streaming', 'Liburan'] },
    'Internet & Komunikasi': { alokasi: 'Kebutuhan', subs: ['Internet & TV kabel', 'Pulsa & Paket Data'] },
  },
  pemasukan: {
    'Gaji & Pendapatan Utama': { subs: ['Gaji bulanan', 'Bonus/THR', 'Komisi afiliasi/digital'] },
    'Investasi/Tabungan': { subs: ['Dividen saham', 'Hasil sewa rumah/kos', 'Bunga tabungan'] },
    'Usaha/Sampingan': { subs: ['Pemasukan toko/online shop', 'Hasil freelance'] },
    'Lain-lain': { subs: ['Hadiah', 'Pengembalian uang'] },
  }
};

// Pemetaan kata kunci -> sub kategori (untuk chat parser)
const KEYWORD_MAP = [
  // Pemasukan
  { re: /\b(gaji)\b/i, jenis: 'pemasukan', sub: 'Gaji bulanan' },
  { re: /\b(bonus|thr)\b/i, jenis: 'pemasukan', sub: 'Bonus/THR' },
  { re: /\b(afiliasi|komisi)\b/i, jenis: 'pemasukan', sub: 'Komisi afiliasi/digital' },
  { re: /\b(dividen|deviden)\b/i, jenis: 'pemasukan', sub: 'Dividen saham' },
  { re: /\b(sewa\s*(rumah|kos)|uang kos)\b/i, jenis: 'pemasukan', sub: 'Hasil sewa rumah/kos' },
  { re: /\b(jualan|laku|online shop|olshop)\b/i, jenis: 'pemasukan', sub: 'Pemasukan toko/online shop' },
  { re: /\b(freelance|proyek|honor)\b/i, jenis: 'pemasukan', sub: 'Hasil freelance' },
  { re: /\b(hadiah|undian|menang)\b/i, jenis: 'pemasukan', sub: 'Hadiah' },
  { re: /\b(refund|pengembalian)\b/i, jenis: 'pemasukan', sub: 'Pengembalian uang' },
  { re: /\b(bunga|interest)\b/i, jenis: 'pemasukan', sub: 'Bunga tabungan' },
  // Pengeluaran
  { re: /\b(kpr|cicilan|kredit rumah|kredit mobil|kredit motor)\b/i, jenis: 'pengeluaran', sub: 'KPR & cicilan mobil' },
  { re: /\b(listrik|pln|pdam|tagihan air)\b/i, jenis: 'pengeluaran', sub: 'Listrik & air' },
  { re: /\b(cat rumah|perawatan rumah|servis ac)\b/i, jenis: 'pengeluaran', sub: 'Perawatan rumah' },
  { re: /\b(reksa\s*dana|reksadana|saham)\b/i, jenis: 'pengeluaran', sub: 'Investasi reksa dana/saham' },
  { re: /\b(emas|antam|logam mulia)\b/i, jenis: 'pengeluaran', sub: 'Investasi emas' },
  { re: /\b(les|kursus|bimbel|privat)\b/i, jenis: 'pengeluaran', sub: 'Les privat/kursus' },
  { re: /\b(buku|seragam|alat tulis|atk)\b/i, jenis: 'pengeluaran', sub: 'Buku & perlengkapan sekolah' },
  { re: /\b(indomaret|alfamart|supermarket|hypermart|giant|superindo|transmart)\b/i, jenis: 'pengeluaran', sub: 'Belanja bulanan supermarket' },
  { re: /\b(sayur|lauk|buah|pasar|ikan|daging)\b/i, jenis: 'pengeluaran', sub: 'Belanja sayur/lauk/buah' },
  { re: /\b(bubur|sarapan)\b/i, jenis: 'pengeluaran', sub: 'Makan pagi bubur' },
  { re: /\b(bakso|soto|nasi|mie|ayam|rendang|padang|warteg|resto|restoran|cafe|café|makan|gofood|grabfood|shopeefood)\b/i, jenis: 'pengeluaran', sub: 'Makan keluarga di luar' },
  { re: /\b(kopi|teh|jus|boba|es krim|snack|jajan|minuman|minum)\b/i, jenis: 'pengeluaran', sub: 'Minuman/jajan' },
  { re: /\b(bpjs|dokter|rumah sakit|klinik|kesehatan)\b/i, jenis: 'pengeluaran', sub: 'BPJS/Kesehatan' },
  { re: /\b(obat|apotek|apotik)\b/i, jenis: 'pengeluaran', sub: 'Obat & Apotek' },
  { re: /\b(bensin|pertamax|pertalite|solar|dex|bbm|pom|spbu|shell)\b/i, jenis: 'pengeluaran', sub: 'BBM/bensin' },
  { re: /\b(servis|bengkel|oli|ganti ban|tune up)\b/i, jenis: 'pengeluaran', sub: 'Servis motor/mobil' },
  { re: /\b(parkir|tol|e-toll|etoll)\b/i, jenis: 'pengeluaran', sub: 'Parkir & Tol' },
  { re: /\b(baju|kaos|celana|sepatu|tas|fashion|pakaian|jilbab)\b/i, jenis: 'pengeluaran', sub: 'Fashion/pakaian' },
  { re: /\b(gas|lpg|elpiji)\b/i, jenis: 'pengeluaran', sub: 'Gas/LPG' },
  { re: /\b(salon|potong rambut|spa|skincare)\b/i, jenis: 'pengeluaran', sub: 'Salon & perawatan' },
  { re: /\b(bioskop|film|xxi|cgv|teater)\b/i, jenis: 'pengeluaran', sub: 'Nonton bioskop/teater' },
  { re: /\b(netflix|spotify|youtube premium|disney|hbo|vidio|prime|langganan|streaming)\b/i, jenis: 'pengeluaran', sub: 'Langganan streaming' },
  { re: /\b(liburan|wisata|hotel|tiket pesawat|kereta api)\b/i, jenis: 'pengeluaran', sub: 'Liburan' },
  { re: /\b(internet|wifi|indihome|tv kabel|first media|biznet)\b/i, jenis: 'pengeluaran', sub: 'Internet & TV kabel' },
  { re: /\b(pulsa|paket data|kuota)\b/i, jenis: 'pengeluaran', sub: 'Pulsa & Paket Data' },
];

// Kata kunci pemasukan umum (fallback)
const INCOME_HINTS = /\b(terima|dapat|masuk|pemasukan|income|pendapatan|cair)\b/i;

const STORAGE_KEY = 'financial-tracker-v1';

const PIE_COLORS = [
  '#8b5a2b','#c17c3e','#5a8a3a','#c0392b','#d4a373','#6f4518',
  '#4a7fc1','#b5835a','#7a9f5d','#e07856','#9c6f44','#5a7a93'
];
