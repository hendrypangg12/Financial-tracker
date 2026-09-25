// Auth manager: login, register, logout, subscription check
let currentUser = null;
let currentProfile = null;
let authReady = false;
let currentClaims = {};
let authGeneration = 0;

// Listener utama: panggil saat auth state berubah
function onAuthStateChanged(callback) {
  if (!fbAuth) { callback(null); return () => {}; }
  return fbAuth.onAuthStateChanged(async (user) => {
    const generation = ++authGeneration;
    currentUser = user;
    currentProfile = null;
    currentClaims = {};
    if (user) {
      try {
        const [profile, token] = await Promise.all([ensureUserProfile(user), user.getIdTokenResult()]);
        if (generation !== authGeneration) return;
        currentProfile = profile;
        currentClaims = token.claims || {};
      } catch (error) {
        if (generation !== authGeneration) return;
        console.warn('Profil belum dapat diperbarui:', error.code || 'network-error');
      }
    }
    authReady = true;
    try { await callback(user, currentProfile); }
    catch (error) {
      console.warn('Aplikasi belum dapat dimuat:', error.code || error.message);
      if (typeof showScreen === 'function') showScreen('login');
      if (typeof showAuthError === 'function') showAuthError('Akun belum dapat dimuat. Periksa koneksi lalu muat ulang. Data yang tersimpan tidak dihapus.');
    }
  });
}

// Durasi & harga per paket (single source of truth)
const PACKAGE_CONFIG = {
  trial:   { days: 7,   priceIdr: 10000,  label: 'Akses 7 Hari', description: 'Akses penuh Pro 7 hari' },
  monthly: { days: 30,  priceIdr: 50000,  label: 'Bulanan',      description: 'Akses Pro selama 30 hari' },
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
// Profil baru dibuat server agar trial gratis tidak dapat dimanipulasi dari browser.
async function ensureUserProfile(user) {
  if (!fbDb) return null;
  const ref = fbDb.collection('users').doc(user.uid).collection('meta').doc('profile');
  const snap = await ref.get();
  if (snap.exists) return snap.data();
  const response = await fetch('https://berstock-bot.hendrypangg12.workers.dev/api/account/bootstrap', {
    method: 'POST', headers: { 'Content-Type':'application/json', Authorization:'Bearer ' + await user.getIdToken() },
    body: JSON.stringify({ displayName:user.displayName || user.email?.split('@')[0] || 'User', photoURL:user.photoURL || '' }),
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Profil belum dapat dibuat.');
  const created = await ref.get({ source:'server' });
  if (!created.exists) throw new Error('Profil belum tersedia.');
  return created.data();
}

// Activate subscription: panggil setelah payment success
// Argumen: profile (current), paket ('trial'|'monthly'|'annual'), opts={extendFromNow:true,paymentRef:''}
async function activateSubscription(uid, paket, opts = {}) {
  // Compatibility guard for stale callers. Entitlement changes belong to the
  // trusted payment backend; a browser may only refresh its own profile.
  throw new Error('Aktivasi langganan hanya dapat dilakukan oleh server pembayaran.');
}

async function refreshUserProfile() {
  const owner = currentUser?.uid;
  if (!fbDb || !owner) throw new Error('Silakan login kembali.');
  const snap = await fbDb.collection('users').doc(owner).collection('meta').doc('profile').get({ source: 'server' });
  if (currentUser?.uid !== owner) throw new Error('Akun telah berubah.');
  currentProfile = snap.exists ? snap.data() : null;
  return currentProfile;
}

// Cek apakah langganan masih aktif
function isSubscriptionActive(profile) {
  if (!profile || !profile.expiresAt) return false;
  return new Date(profile.expiresAt).getTime() > Date.now();
}

// ============ FREEMIUM: Cek user punya akses Pro ============
// Pricing model:
//   free_trial: uji coba gratis 2 hari, dibuat oleh server
//   trial    : akses 7 hari sekali bayar (Rp 10rb)
//   monthly  : akses 30 hari; renewal otomatis belum diimplementasikan
//   annual   : Rp 299rb/tahun (hemat 50%)
//   lifetime : LEGACY only — existing buyer sebelum pricing change masih dihormati
//   pro      : LEGACY admin/test
// AI (Tanya Beruang + Goal Planner) hanya untuk paket berbayar — uji coba gratis tidak termasuk AI
// (keputusan bos 26 Sep 2026: cegah biaya AI dari akun iseng/trial).
function isFreeTrial(profile) {
  return profile?.plan === 'free_trial';
}
function hasAIAccess(profile) {
  return isPro(profile) && !isFreeTrial(profile);
}

function isPro(profile) {
  if (!profile) return false;
  // Legacy lifetime = akses selamanya (honor existing buyers)
  if (profile.plan === 'lifetime') return true;
  // Legacy 'pro' plan (admin/test accounts)
  if (profile.plan === 'pro') return true;
  // Trial / Monthly / Annual — harus belum expired
  if (['free_trial', 'trial', 'monthly', 'annual', 'starter'].includes(profile.plan)) {
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
  // Keep account-scoped offline data on logout; never delete an unsynced transaction.
  if (typeof pushToCloudImmediate === 'function') await pushToCloudImmediate();
  // Stop auto-sync sebelum signOut
  if (typeof stopAutoSync === 'function') stopAutoSync();
  if (typeof stopCloudListener === 'function') stopCloudListener();
  await fbAuth.signOut();
  currentUser = null;
  currentProfile = null;
  // Clear local state lalu reload halaman
  // Local data remains available only under this account's storage key.
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

// Firebase refreshes expired tokens automatically. Never send account IDs as authentication.
async function authenticatedHeaders() {
  if (!currentUser) throw new Error('Silakan login kembali.');
  return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await currentUser.getIdToken() };
}
