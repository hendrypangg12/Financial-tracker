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

// Pastikan profile user ada di Firestore (buat saat pertama login)
async function ensureUserProfile(user) {
  if (!fbDb) return null;
  const ref = fbDb.collection('users').doc(user.uid).collection('meta').doc('profile');
  const snap = await ref.get();
  if (snap.exists) return snap.data();
  const now = new Date();
  const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const profile = {
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'User',
    photoURL: user.photoURL || '',
    createdAt: now.toISOString(),
    plan: 'trial',
    expiresAt: trialEnd.toISOString(),
  };
  await ref.set(profile);
  return profile;
}

// Cek apakah langganan masih aktif
function isSubscriptionActive(profile) {
  if (!profile || !profile.expiresAt) return false;
  return new Date(profile.expiresAt).getTime() > Date.now();
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
function adminWhatsAppLink(subject = '') {
  const text = encodeURIComponent(
    subject ||
    `Halo Admin BerUang, saya ${currentUser?.email || 'user'} ingin perpanjang/aktivasi langganan.`
  );
  return `https://wa.me/${ADMIN_CONTACT.whatsapp}?text=${text}`;
}
