// Konstanta dan default data
const STORAGE_KEY = 'tokountung-v1';

const DEFAULT_KATEGORI = [
  'Makanan', 'Minuman', 'Sembako', 'Snack', 'Mie Instan',
  'Sabun & Toiletries', 'Rokok', 'ATK', 'Lain-lain'
];

const DEFAULT_SETTINGS = {
  namaToko: 'Toko Saya',
  alamat: '',
  telepon: '',
  footerStruk: 'Terima kasih atas kunjungan!',
  biayaTetap: 0,
  targetUntung: 0,
};

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
const HARI = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

// Sample data demo (untuk first time user)
const SAMPLE_PRODUCTS = [
  { sku: 'IDM-001', nama: 'Indomie Goreng', kategori: 'Mie Instan', satuan: 'pcs', hargaModal: 2800, hargaJual: 3500, stok: 50, minStok: 10 },
  { sku: 'IDM-002', nama: 'Indomie Soto', kategori: 'Mie Instan', satuan: 'pcs', hargaModal: 2800, hargaJual: 3500, stok: 30, minStok: 10 },
  { sku: 'BRS-001', nama: 'Beras Premium 5kg', kategori: 'Sembako', satuan: 'pcs', hargaModal: 65000, hargaJual: 75000, stok: 12, minStok: 5 },
  { sku: 'GUL-001', nama: 'Gula Pasir 1kg', kategori: 'Sembako', satuan: 'pcs', hargaModal: 14000, hargaJual: 16000, stok: 25, minStok: 5 },
  { sku: 'KPI-001', nama: 'Kopi Kapal Api 65gr', kategori: 'Minuman', satuan: 'pcs', hargaModal: 5500, hargaJual: 7000, stok: 40, minStok: 10 },
];
