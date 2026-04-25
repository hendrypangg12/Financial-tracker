// Firebase configuration & initialization
// apiKey di sini AMAN dipublikasikan (bukan rahasia) — keamanan dijaga oleh Firestore Rules.
const firebaseConfig = {
  apiKey: "AIzaSyDe-giPojPsL6-XeQf_4atnJqoemjj69oc",
  authDomain: "ber-uang-735b3.firebaseapp.com",
  projectId: "ber-uang-735b3",
  storageBucket: "ber-uang-735b3.firebasestorage.app",
  messagingSenderId: "746768296778",
  appId: "1:746768296778:web:0b46c6760aa7e2e06a6fb3",
  measurementId: "G-Y9N9M2GDZD"
};

// Kontak admin (buat customer hubungi saat belum/habis berlangganan)
const ADMIN_CONTACT = {
  whatsapp: '6282124848924',  // WA Admin BerUang
  instagram: 'hendrypangg',   // IG Admin BerUang
};

// Harga paket (Rupiah)
const PRICE_MONTHLY = 35000;
const PRICE_LIFETIME = 125000;

// Info pembayaran (EDIT sesuai rekening/e-wallet Anda)
const PAYMENT_INFO = {
  bankName: 'BCA',
  bankAccount: '7130902183',
  bankHolder: 'HENDRY',
  qris: true,  // true = tersedia QRIS (scan via WA admin)
};

// Trial hari (0 = tanpa trial, user langsung paywall setelah daftar)
const TRIAL_DAYS = 0;

// Email admin (untuk akses tab Admin Panel)
// Tambahkan email Anda di sini supaya bisa aktivasi customer dari aplikasi
const ADMIN_EMAILS = [
  'hendryphang12@gmail.com',  // Email utama admin
  // Tambah email lain di sini jika perlu (misal partner)
];

// Inisialisasi Firebase (pakai compat SDK dari window.firebase)
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const fbAuth = typeof firebase !== 'undefined' ? firebase.auth() : null;
const fbDb = typeof firebase !== 'undefined' ? firebase.firestore() : null;

// Aktifkan offline persistence supaya data tetap bisa diakses tanpa internet
if (fbDb) {
  fbDb.enablePersistence({ synchronizeTabs: true }).catch(() => { /* abaikan error multi-tab */ });
}
