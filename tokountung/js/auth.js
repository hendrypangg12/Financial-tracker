// Auth module untuk BerBisnis: login, register, logout, subscription check
// Profile disimpan di Firestore: users/{uid}/berbisnis/profile

let currentUser = null;
let currentProfile = null;
let authReady = false;

function onBerbisnisAuthStateChanged(callback) {
  if (!fbAuth) { callback(null); return () => {}; }
  return fbAuth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
      currentProfile = await ensureBerbisnisProfile(user);
    } else {
      currentProfile = null;
    }
    authReady = true;
    callback(user, currentProfile);
  });
}

// Bikin/ambil profile BerBisnis user di Firestore
async function ensureBerbisnisProfile(user) {
  if (!fbDb) return null;
  const ref = fbDb.collection('users').doc(user.uid).collection('berbisnis').doc('profile');
  const snap = await ref.get();
  if (snap.exists) {
    const data = snap.data();
    return data;
  }
  // Profile baru: trial 3 hari
  const now = new Date();
  const expires = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const profile = {
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'User',
    photoURL: user.photoURL || '',
    createdAt: now.toISOString(),
    plan: 'trial',
    expiresAt: expires.toISOString(),
    bizName: '',  // diisi user nanti
  };
  await ref.set(profile);
  return profile;
}

function isBerbisnisActive(profile) {
  if (!profile || !profile.expiresAt) return false;
  return new Date(profile.expiresAt).getTime() > Date.now();
}

function daysRemainingBerbisnis(profile) {
  if (!profile || !profile.expiresAt) return 0;
  const diff = new Date(profile.expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

function isBerbisnisAdmin(user) {
  if (!user || !user.email) return false;
  return BERBISNIS_ADMIN_EMAILS.includes(user.email.toLowerCase());
}

// Login methods
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
  // Clear local state lalu reload
  if (typeof STORAGE_KEY !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

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

function adminWhatsAppLink(paket = '') {
  const email = currentUser?.email || '(email)';
  const text = paket === 'starter'
    ? `Halo Admin BerBisnis 💼\n\nSaya mau aktivasi paket *STARTER Rp 99.000/bulan*\nEmail akun: ${email}\nNama bisnis: ${(currentProfile?.bizName || '-')}\n\nBerikut bukti transfer:\n[lampirkan foto]`
    : paket === 'pro'
    ? `Halo Admin BerBisnis 💼\n\nSaya mau aktivasi paket *PRO EARLY BIRD Rp 500.000/bulan*\nEmail akun: ${email}\nNama bisnis: ${(currentProfile?.bizName || '-')}\n\nBerikut bukti transfer:\n[lampirkan foto]`
    : `Halo Admin BerBisnis 💼\n\nSaya ${email} ingin tanya/aktivasi langganan BerBisnis.`;
  return `https://wa.me/${ADMIN_CONTACT.whatsapp}?text=${encodeURIComponent(text)}`;
}

function adminInstagramLink() {
  return `https://instagram.com/${ADMIN_CONTACT.instagram}`;
}

// Setup Login UI form handlers
function setupAuthUI() {
  const loginForm = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');
  const errorEl = document.getElementById('auth-error');
  const infoEl = document.getElementById('auth-info');

  function showError(msg) {
    if (errorEl) { errorEl.textContent = msg; errorEl.hidden = false; }
    if (infoEl) infoEl.hidden = true;
  }
  function showInfo(msg) {
    if (infoEl) { infoEl.textContent = msg; infoEl.hidden = false; }
    if (errorEl) errorEl.hidden = true;
  }
  function clearMsg() {
    if (errorEl) errorEl.hidden = true;
    if (infoEl) infoEl.hidden = true;
  }

  // Tab switcher
  document.querySelectorAll('.login-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.authTab;
      loginForm.hidden = target !== 'login';
      registerForm.hidden = target !== 'register';
      clearMsg();
    };
  });

  // Login form
  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    clearMsg();
    const fd = new FormData(loginForm);
    try {
      await loginEmailPassword(fd.get('email').trim(), fd.get('password'));
    } catch (err) {
      showError(authErrorMessage(err));
    }
  };

  // Register form
  registerForm.onsubmit = async (e) => {
    e.preventDefault();
    clearMsg();
    const fd = new FormData(registerForm);
    if (fd.get('password') !== fd.get('password2')) {
      showError('Password & konfirmasi tidak sama.');
      return;
    }
    try {
      await registerEmailPassword(fd.get('email').trim(), fd.get('password'));
      showInfo('✅ Akun terdaftar. Login otomatis...');
    } catch (err) {
      showError(authErrorMessage(err));
    }
  };

  // Google login
  const btnGoogle = document.getElementById('btn-google-login');
  if (btnGoogle) btnGoogle.onclick = async () => {
    clearMsg();
    try { await loginGoogle(); }
    catch (err) { showError(authErrorMessage(err)); }
  };

  // Forgot password
  const linkForgot = document.getElementById('link-forgot');
  if (linkForgot) linkForgot.onclick = async (e) => {
    e.preventDefault();
    const email = prompt('Masukkan email Anda:');
    if (!email) return;
    try {
      await resetPassword(email.trim());
      showInfo('📧 Link reset password sudah dikirim ke email Anda.');
    } catch (err) {
      showError(authErrorMessage(err));
    }
  };

  // Logout button (di topbar setelah login)
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) btnLogout.onclick = () => {
    if (confirm('Yakin logout? Data lokal akan di-clear, tapi data cloud tetap aman.')) {
      logout();
    }
  };
}
