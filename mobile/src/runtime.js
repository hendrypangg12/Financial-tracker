/* Mobile-only adapter. Never grants entitlement or replaces the account synchronization flow. */
(() => {
  'use strict';
  const production = window.__BERUANG_STORE_BUILD__ === true;
  const unavailable = () => showToast('Pembelian belum tersedia dalam aplikasi Android ini.', 'info');
  const originalScreen = window.showScreen;
  window.showScreen = function (which) {
    if (which === 'paywall') { unavailable(); return originalScreen('app'); }
    return originalScreen(which);
  };
  window.loginGoogle = async () => { throw new Error('Login Google belum tersedia di Android. Gunakan email dan password.'); };
  window.createPaymentInvoice = async () => { throw new Error('Pembelian native belum tersedia.'); };
  window.openPaymentModal = unavailable;
  window.handlePostPaymentRedirect = async () => {};
  window.showProGate = unavailable;
  window.isAdmin = () => false;
  window.saveNativeBackup = async (data, filename) => {
    if (!window.Capacitor?.isNativePlatform()) throw new Error('Backup ini memerlukan APK Android.');
    const filesystem = window.Capacitor.registerPlugin('Filesystem');
    const share = window.Capacitor.registerPlugin('Share');
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const json = JSON.stringify(data, null, 2);
    // Keep a durable app-private copy before opening the system share dialog.
    // Do not store financial backups in a publicly accessible directory.
    await filesystem.writeFile({ path: 'backups/' + safeName, data: json, directory: 'DATA', encoding: 'utf8', recursive: true });
    const file = await filesystem.writeFile({ path: 'backups/' + safeName, data: json, directory: 'CACHE', encoding: 'utf8', recursive: true });
    await share.share({ title: 'Backup BerUang', files: [file.uri], dialogTitle: 'Simpan backup BerUang' });
  };
  window.exportData = async () => {
    try {
      await window.saveNativeBackup({ ...syncData(state), exportedAt: new Date().toISOString() }, 'beruang-' + Date.now() + '.json');
    } catch (error) { showToast('Backup belum diekspor: ' + error.message, 'error'); }
  };
  const originalFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const target = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (/\/api\/(create-invoice|verify-payment)/.test(target.pathname)) return Promise.reject(new Error('Payment API disabled in native build'));
    return originalFetch(input, init);
  };
  document.addEventListener('DOMContentLoaded', () => {
    if (production) return;
    const banner = document.createElement('aside');
    banner.className = 'mobile-test-banner';
    banner.textContent = 'BerUang Uji · Terhubung ke server produksi · Gunakan akun khusus tes';
    document.body.prepend(banner);
    const notice = document.createElement('div');
    notice.className = 'mobile-test-notice';
    notice.innerHTML = '<strong>APK uji, belum rilis publik</strong><p>Data tersinkron ke Firebase BerUang yang aktif. Buat atau gunakan akun khusus tes. Jangan memakai akun pelanggan atau memasukkan data keuangan penting.</p><p>Masuk dengan email/password. Login Google dan pembelian dalam aplikasi belum tersedia.</p><label><input id="mobile-test-ack" type="checkbox"> Saya menggunakan akun khusus tes dan memahami bahwa data tersimpan di server produksi.</label><p><a href="privacy.html">Kebijakan privasi</a></p>';
    document.querySelector('#login-screen .login-tabs').before(notice);
    document.querySelector('#form-register small').textContent = 'Pendaftaran akun uji gratis. Pembelian belum tersedia di APK uji.';
    for (const id of ['form-login', 'form-register']) document.getElementById(id).addEventListener('submit', event => {
      if (!document.getElementById('mobile-test-ack').checked) {
        event.preventDefault(); event.stopImmediatePropagation();
        showAuthError('Baca pemberitahuan APK uji dan centang persetujuan akun tes terlebih dahulu.');
      }
    }, true);
  });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-paket], .btn-buy, #btn-upgrade-pro, #ai-paywall-upgrade, #payment-wa-btn, .aff-card')) {
      event.preventDefault(); event.stopImmediatePropagation(); unavailable();
    }
  }, true);
})();
