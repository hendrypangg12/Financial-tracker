// Firebase configuration untuk BerBisnis (REUSE project Firebase BerUang)
// API key di sini AMAN dipublikasikan — keamanan dijaga oleh Firestore Rules.
const firebaseConfig = {
  apiKey: "AIzaSyDe-giPojPsL6-XeQf_4atnJqoemjj69oc",
  authDomain: "ber-uang-735b3.firebaseapp.com",
  projectId: "ber-uang-735b3",
  storageBucket: "ber-uang-735b3.firebasestorage.app",
  messagingSenderId: "746768296778",
  appId: "1:746768296778:web:0b46c6760aa7e2e06a6fb3",
  measurementId: "G-Y9N9M2GDZD"
};

// Kontak admin (untuk paywall / bantuan)
const ADMIN_CONTACT = {
  whatsapp: '6282124848924',
  instagram: 'hendrypangg',
};

// Pricing BerBisnis (per bulan dalam Rupiah)
const BERBISNIS_PRICE = {
  starter: 99000,
  pro: 1500000,           // Pro normal
  pro_early_bird: 500000, // Early bird 50 klien pertama
};

// Info pembayaran
const PAYMENT_INFO = {
  bankName: 'BCA',
  bankAccount: '7130902183',
  bankHolder: 'HENDRY',
  qris: true,
};

// Trial 3 hari untuk user baru
const TRIAL_DAYS = 3;

// Email admin (yang bisa akses Admin Panel BerBisnis)
const BERBISNIS_ADMIN_EMAILS = [
  'hendryphang12@gmail.com',
  'hendrypangg12@gmail.com',
  'hendrypangg12@icloud.com',
];

// Inisialisasi Firebase pakai compat SDK
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const fbAuth = typeof firebase !== 'undefined' ? firebase.auth() : null;
const fbDb = typeof firebase !== 'undefined' ? firebase.firestore() : null;

// Offline persistence untuk Firestore (data tetap bisa diakses tanpa internet)
if (fbDb) {
  fbDb.enablePersistence({ synchronizeTabs: true }).catch(() => { /* ignore multi-tab error */ });
}
