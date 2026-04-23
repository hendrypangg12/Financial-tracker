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

// Kontak admin (buat customer hubungi saat langganan habis)
const ADMIN_CONTACT = {
  whatsapp: '6281234567890', // GANTI dengan nomor WA Anda (format internasional tanpa +)
  instagram: 'beruang.app',  // GANTI dengan username IG Anda
};

// Lama trial gratis untuk user baru (hari)
const TRIAL_DAYS = 7;

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
