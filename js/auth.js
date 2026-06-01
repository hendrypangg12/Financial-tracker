// Auth manager: login, register, logout, subscription check
let currentUser = null;
let currentProfile = null;
let authReady = false;

// Listener utama: panggil saat auth state berubah
function onAuthStateChanged(callback) {
  if (!fbAuth) { callback(null); return () => {}; }
  return fbAuth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
      currentProfile = await ensureUserProfile(user);
    } else {
      currentProfile = null;
    }
    authReady = true;
    callback(user, currentProfile);
  });
}

// Durasi & harga per paket (single source of truth)
const PACKAGE_CONFIG = {
  trial:   { days: 7,   priceIdr: 10000,  label: 'Coba 7 Hari',  description: 'Akses penuh Pro 7 hari' },
  monthly: { days: 30,  priceIdr: 50000,  label: 'Bulanan',      description: 'Pro auto-renewal tiap bulan' },
  annual:  { days: 365, priceIdr: 299000, label: 'Tahunan',      description: 'Pro setahun, hemat 50%' },
};

function getPackageConfig(paket) {
  return PACKAGE_CONFIG[paket] || null;
}

function computeExpiry(paket, fromDate = new Date()) {
  const cfg = PACKAGE_CONFIG[paket];
  if (!cfg) return null;
  return new Date(fromDate.getTime() + cfg.days * 24 * 60 * 60 * 1000);
}

// Pastikan profile user ada di Firestore (buat saat pertama login)
// User baru: plan='pending' (belum bayar) → langsung diarahkan ke paywall pilih paket
async function ensureUserProfile(user) {
  if (!fbDb) return null;
  const ref = fbDb.collection('users').doc(user.uid).collection('meta').doc('profile');
  const snap = await ref.get();
  if (snap.exists) return snap.data();
  const now = new Date();
  const profile = {
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'User',
    photoURL: user.photoURL || '',
    createdAt: now.toISOString(),
    plan: 'pending',           // belum bayar → tampil paywall
    expiresAt: now.toISOString(), // expired sejak detik pertama
  };
  await ref.set(profile);
  return profile;
}

// Activate subscription: panggil setelah payment success
// Argumen: profile (current), paket ('trial'|'monthly'|'annual'), opts={extendFromNow:true,paymentRef:''}
async function activateSubscription(uid, paket, opts = {}) {
  if (!fbDb || !uid) throw new Error('Firebase belum siap atau uid kosong');
  const cfg = PACKAGE_CONFIG[paket];
  if (!cfg) throw new Error(`Paket tidak dikenal: ${paket}`);

  const ref = fbDb.collection('users').doc(uid).collection('meta').doc('profile');
  const snap = await ref.get();
  const profile = snap.exists ? snap.data() : {};

  // Extend dari expiry sekarang kalau masih aktif (avoid kehilangan sisa hari saat renewal)
  const now = new Date();
  const currentExpiry = profile.expiresAt ? new Date(profile.expiresAt) : now;
  const fromDate = (currentExpiry.getTime() > now.getTime() && opts.extendFromNow !== true)
    ? currentExpiry
    : now;
  const newExpiry = computeExpiry(paket, fromDate);

  const update = {
    plan: paket,
    expiresAt: newExpiry.toISOString(),
    lastPaymentAt: now.toISOString(),
    lastPaymentPaket: paket,
    lastPaymentAmount: cfg.priceIdr,
  };
  if (opts.paymentRef) update.lastPaymentRef = opts.paymentRef;

  await ref.set(update, { merge: true });
  return { ...profile, ...update };
}

// Cek apakah langganan masih aktif
function isSubscriptionActive(profile) {
  if (!profile || !profile.expiresAt) return false;
  return new Date(profile.expiresAt).getTime() > Date.now();
}

// ============ FREEMIUM: Cek user punya akses Pro ============
// Pricing model:
//   trial    : 7 hari paid entry (Rp 10rb)
//   monthly  : Rp 50rb/bulan auto-renewal
//   annual   : Rp 299rb/tahun (hemat 50%)
//   lifetime : LEGACY only — existing buyer sebelum pricing change masih dihormati
//   pro      : LEGACY admin/test
function isPro(profile) {
  if (!profile) return false;
  // Legacy lifetime = akses selamanya (honor existing buyers)
  if (profile.plan === 'lifetime') return true;
  // Legacy 'pro' plan (admin/test accounts)
  if (profile.plan === 'pro') return true;
  // Trial / Monthly / Annual — harus belum expired
  if (['trial', 'monthly', 'annual', 'starter'].includes(profile.plan)) {
    return profile.expiresAt && new Date(profile.expiresAt).getTime() > Date.now();
  }
  return false;
}

function daysRemaining(profile) {
  if (!profile || !profile.expiresAt) return 0;
  const diff = new Date(profile.expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

// ============ Login/Register Functions ============
async function loginEmailPassword(email, password) {
  if (!fbAuth) throw new Error('Firebase belum siap');
  await fbAuth.signInWithEmailAndPassword(email, password);
}

async function registerEmailPassword(email, password) {
  if (!fbAuth) throw new Error('Firebase belum siap');
  await fbAuth.createUserWithEmailAndPassword(email, password);
}

async function loginGoogle() {
  if (!fbAuth) throw new Error('Firebase belum siap');
  const provider = new firebase.auth.GoogleAuthProvider();
  await fbAuth.signInWithPopup(provider);
}

async function resetPassword(email) {
  if (!fbAuth) throw new Error('Firebase belum siap');
  await fbAuth.sendPasswordResetEmail(email);
}

async function logout() {
  if (!fbAuth) return;
  // Stop auto-sync sebelum signOut
  if (typeof stopAutoSync === 'function') stopAutoSync();
  if (typeof stopCloudListener === 'function') stopCloudListener();
  await fbAuth.signOut();
  currentUser = null;
  currentProfile = null;
  // Clear local state lalu reload halaman
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

// Humanize error dari Firebase biar user-friendly
function authErrorMessage(err) {
  const code = err && err.code || '';
  const map = {
    'auth/invalid-email': 'Format email tidak valid.',
    'auth/user-disabled': 'Akun ini dinonaktifkan.',
    'auth/user-not-found': 'Email belum terdaftar. Silakan daftar dulu.',
    'auth/wrong-password': 'Password salah.',
    'auth/invalid-credential': 'Email atau password salah.',
    'auth/email-already-in-use': 'Email sudah terdaftar. Coba login.',
    'auth/weak-password': 'Password minimal 6 karakter.',
    'auth/network-request-failed': 'Koneksi internet bermasalah.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa menit.',
    'auth/popup-closed-by-user': 'Login Google dibatalkan.',
    'auth/unauthorized-domain': 'Domain ini belum di-whitelist di Firebase.',
  };
  return map[code] || (err.message || 'Terjadi kesalahan.');
}

// Build link WhatsApp untuk hubungi admin
function adminWhatsAppLink(paket = '') {
  const email = currentUser?.email || '(email)';
  const templates = {
    trial:   `Halo Admin BerUang 🐻\n\nSaya mau aktivasi paket *COBA 7 HARI Rp 10.000*\nEmail akun: ${email}\n\nBerikut bukti transfer:\n[lampirkan foto transfer/QRIS]`,
    monthly: `Halo Admin BerUang 🐻\n\nSaya mau aktivasi paket *BULANAN Rp 50.000*\nEmail akun: ${email}\n\nBerikut bukti transfer:\n[lampirkan foto transfer/QRIS]`,
    annual:  `Halo Admin BerUang 🐻\n\nSaya mau aktivasi paket *TAHUNAN Rp 299.000* (hemat 50%)\nEmail akun: ${email}\n\nBerikut bukti transfer:\n[lampirkan foto transfer/QRIS]`,
    lifetime:`Halo Admin BerUang 🐻\n\nSaya mau aktivasi paket *LIFETIME* (legacy)\nEmail akun: ${email}\n\nBerikut bukti transfer:\n[lampirkan foto transfer/QRIS]`,
  };
  const text = templates[paket] || `Halo Admin BerUang 🐻\n\nSaya ${email} ingin tanya/aktivasi langganan.`;
  return `https://wa.me/${ADMIN_CONTACT.whatsapp}?text=${encodeURIComponent(text)}`;
}

function adminInstagramLink() {
  return `https://instagram.com/${ADMIN_CONTACT.instagram}`;
}
