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
    'Utang & Pinjaman': { alokasi: 'Kebutuhan', subs: ['Bayar utang', 'Bayar cicilan', 'Pinjaman keluar'] },
  },
  pemasukan: {
    'Gaji & Pendapatan Utama': { subs: ['Gaji bulanan', 'Bonus/THR', 'Komisi afiliasi/digital'] },
    'Investasi/Tabungan': { subs: ['Dividen saham', 'Hasil sewa rumah/kos', 'Bunga tabungan'] },
    'Usaha/Sampingan': { subs: ['Pemasukan toko/online shop', 'Hasil freelance'] },
    'Utang & Piutang': { subs: ['Pelunasan piutang', 'Pinjaman cair', 'Transfer masuk'] },
    'Lain-lain': { subs: ['Hadiah', 'Pengembalian uang'] },
  }
};

// Pemetaan kata kunci -> sub kategori (untuk chat parser)
// PENTING: urutan rule = priority. Rule yang lebih spesifik harus di atas.
const KEYWORD_MAP = [
  // ==== UTANG & PIUTANG (priority paling tinggi karena ambigu) ====
  // "saya/aku/gue bayar utang" -> pengeluaran (saya yang bayar)
  { re: /\b(saya|aku|gue|gw|kami|kita)\s+bayar\s+(utang|hutang|pinjaman|cicilan)\b/i, jenis: 'pengeluaran', sub: 'Bayar utang' },
  // "bayar utang ke X" -> pengeluaran
  { re: /\bbayar\s+(utang|hutang|pinjaman|cicilan)\s+(ke|kepada|sama|buat)\b/i, jenis: 'pengeluaran', sub: 'Bayar utang' },
  // "kasih pinjaman ke X" / "pinjamkan X" -> pengeluaran (uang keluar)
  { re: /\b(kasih|beri|kirim)\s+pinjaman\b|\bpinjamkan\b|\bminjam[ki]n?\s+(ke|kepada)\b/i, jenis: 'pengeluaran', sub: 'Pinjaman keluar' },
  // "[Nama X] bayar utang" -> pemasukan (orang lain yg bayar ke saya)
  { re: /\b[a-z]+\s+(bayar|melunasi|lunas[ki]n?)\s+(utang|hutang|pinjaman)\b/i, jenis: 'pemasukan', sub: 'Pelunasan piutang' },
  // "utang dari X dilunasi" / "piutang lunas" / "pelunasan utang"
  { re: /\b(piutang|pelunasan)\b|\b(utang|hutang)\s+(dari|kembali|balik|lunas)\b/i, jenis: 'pemasukan', sub: 'Pelunasan piutang' },
  // "pinjam dari X" / "pinjaman cair" -> pemasukan (uang masuk meskipun hutang)
  { re: /\bpinjam(an)?\s+(dari|cair|masuk)\b|\bdapet?\s+pinjaman\b/i, jenis: 'pemasukan', sub: 'Pinjaman cair' },
  // "transfer dari X" / "ditransfer X"
  { re: /\b(transfer|tf)\s+dari\b|\bditransfer\s+(sama|oleh)\b|\bkirim(an)?\s+dari\b/i, jenis: 'pemasukan', sub: 'Transfer masuk' },
  // "X kasih duit" / "X kasih uang" -> pemasukan
  { re: /\b[a-z]+\s+(kasih|ngasih|kasi)\s+(duit|uang|dana|fulus)\b/i, jenis: 'pemasukan', sub: 'Transfer masuk' },

  // ==== Pemasukan biasa ====
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

// Palet warna cantik untuk pie/donut (vibrant, modern, IG-worthy)
const PIE_COLORS = [
  '#6366F1', // indigo
  '#EC4899', // pink
  '#F59E0B', // amber emas
  '#10B981', // emerald
  '#8B5CF6', // violet
  '#F97316', // orange segar
  '#06B6D4', // cyan
  '#F43F5E', // rose
  '#84CC16', // lime
  '#3B82F6', // biru langit
  '#A855F7', // ungu elektrik
  '#14B8A6', // teal
  '#EAB308', // kuning emas
  '#EF4444', // merah
  '#22C55E', // hijau segar
  '#0EA5E9', // sky blue
];
