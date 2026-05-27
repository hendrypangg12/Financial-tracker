// Onboarding "Setup Dana Awal" — buat user baru, dipanggil sebelum masuk menu utama.
// Tujuan: bantu user catat posisi awal (aset, piutang, utang, biaya rutin) biar
// dashboard + AI Advisor langsung paham kondisi keuangannya.
// Keputusan desain (bos, 27 Mei): aset = info terpisah (gak masuk cashflow);
// biaya rutin (kost/cicilan) = dicatat sebagai pengeluaran bulan ini.

let onbInited = false;

function onbFlagKey() {
  const email = (typeof currentUser !== 'undefined' && currentUser && currentUser.email) || 'local';
  return 'beruang-onboarding-done:' + email;
}

function isFreshUser() {
  const noTrx = !state.transactions || state.transactions.length === 0;
  const noHutang = !state.hutangs || state.hutangs.length === 0;
  const noAset = !state.assets || state.assets.length === 0;
  return noTrx && noHutang && noAset;
}

// Dipanggil setelah init() di alur login. Tampilkan wizard kalau user baru & belum skip.
function maybeShowOnboarding() {
  try {
    if (localStorage.getItem(onbFlagKey()) === '1') return false;
    if (!isFreshUser()) return false;
    showOnboarding();
    return true;
  } catch (e) { return false; }
}

function injectOnbStyles() {
  if (document.getElementById('onb-styles')) return;
  const css = `
  .onb-wrap{position:fixed;inset:0;z-index:9000;overflow-y:auto;background:linear-gradient(180deg,#fef3e2,#fbf6ee);-webkit-overflow-scrolling:touch;}
  .onb-card{max-width:520px;margin:0 auto;padding:28px 20px 48px;}
  .onb-logo{width:72px;height:72px;border-radius:18px;display:block;margin:8px auto 10px;}
  .onb-title{font-size:24px;font-weight:900;color:#5d3a1a;text-align:center;margin:0 0 4px;}
  .onb-sub{font-size:14px;color:#6e5a4a;text-align:center;line-height:1.5;margin:0 auto 22px;max-width:420px;}
  .onb-sec{background:#fff;border:2px solid #f0e9d8;border-radius:16px;padding:16px;margin-bottom:14px;box-shadow:0 4px 14px rgba(74,51,40,.05);}
  .onb-sec h3{font-size:15px;font-weight:800;color:#8b5a2b;margin:0 0 3px;}
  .onb-sec .hint{font-size:12px;color:#8a7766;margin:0 0 12px;line-height:1.4;}
  .onb-row{display:flex;gap:8px;margin-bottom:8px;align-items:center;}
  .onb-row input{padding:11px 12px;border:1.5px solid #e6dcc6;border-radius:10px;font-size:15px;font-family:inherit;width:100%;background:#fdfbf6;}
  .onb-row input:focus{outline:none;border-color:#c9a352;}
  .onb-row .onb-nama{flex:1.3;min-width:0;}
  .onb-row .onb-jml{flex:1;min-width:0;}
  .onb-del{flex:0 0 auto;width:36px;height:40px;border:none;background:#f7ede0;color:#b91c1c;border-radius:9px;font-size:17px;cursor:pointer;}
  .onb-add{background:none;border:1.5px dashed #c9a352;color:#a3823a;border-radius:10px;padding:9px;width:100%;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;}
  .onb-fixed{display:flex;gap:8px;align-items:center;margin-bottom:10px;}
  .onb-fixed label{flex:1;font-size:14px;color:#4a3328;font-weight:600;}
  .onb-fixed input{flex:1;padding:11px 12px;border:1.5px solid #e6dcc6;border-radius:10px;font-size:15px;font-family:inherit;background:#fdfbf6;min-width:0;}
  .onb-actions{margin-top:18px;}
  .onb-actions .btn{margin-bottom:10px;}
  `;
  const s = document.createElement('style');
  s.id = 'onb-styles';
  s.textContent = css;
  document.head.appendChild(s);
}

function onbRowHtml(namaPh, jmlPh) {
  return `<div class="onb-row">
    <input class="onb-nama" type="text" placeholder="${namaPh}" />
    <input class="onb-jml" type="tel" inputmode="numeric" placeholder="${jmlPh}" />
    <button type="button" class="onb-del" title="Hapus">×</button>
  </div>`;
}

function showOnboarding() {
  const screen = document.getElementById('onboarding-screen');
  if (!screen) return;
  injectOnbStyles();

  screen.innerHTML = `
  <div class="onb-wrap">
    <div class="onb-card">
      <img class="onb-logo" src="assets/logo-berbisnis.png?v=3" alt="BerUang" />
      <h1 class="onb-title">Setup Dana Awal 🐻</h1>
      <p class="onb-sub">Halo bos! Biar dashboard & si Beruang Akuntan langsung paham kondisi duitmu, isi posisi awal di bawah. Isi yang ada aja — sisanya bisa dilewati, bisa diubah kapan aja.</p>

      <div class="onb-sec">
        <h3>👤 Nama Kamu</h3>
        <p class="hint">Biar pas buka app langsung kelihatan ini keuangan siapa.</p>
        <div class="onb-fixed"><input id="onb-nama-user" type="text" placeholder="Nama panggilan kamu" autocomplete="name" /></div>
      </div>

      <div class="onb-sec">
        <h3>💳 Saldo di Rekening</h3>
        <p class="hint">Tulis nama bank/e-wallet & saldonya. Contoh: BCA, BNI, GoPay, Dana.</p>
        <div id="onb-rekening">${onbRowHtml('Nama bank / e-wallet', 'Saldo (Rp)')}</div>
        <button type="button" class="onb-add" data-add="onb-rekening" data-nama="Nama bank / e-wallet" data-jml="Saldo (Rp)">+ Tambah rekening</button>
      </div>

      <div class="onb-sec">
        <h3>📈 Investasi</h3>
        <p class="hint">Saham, reksadana, emas, kripto, dll — beserta nilainya sekarang.</p>
        <div id="onb-investasi">${onbRowHtml('Jenis (saham/reksadana)', 'Nilai (Rp)')}</div>
        <button type="button" class="onb-add" data-add="onb-investasi" data-nama="Jenis (saham/reksadana)" data-jml="Nilai (Rp)">+ Tambah investasi</button>
      </div>

      <div class="onb-sec">
        <h3>🤝 Duit di Teman (piutang)</h3>
        <p class="hint">Uang yang dipinjam orang ke kamu — mereka utang ke kamu.</p>
        <div id="onb-piutang">${onbRowHtml('Nama orang', 'Jumlah (Rp)')}</div>
        <button type="button" class="onb-add" data-add="onb-piutang" data-nama="Nama orang" data-jml="Jumlah (Rp)">+ Tambah piutang</button>
      </div>

      <div class="onb-sec">
        <h3>💸 Utang Kamu</h3>
        <p class="hint">Uang yang kamu pinjam dari orang/pihak lain. Cuma buat pencatatan, gak ngurangi saldo.</p>
        <div id="onb-utang">${onbRowHtml('Ke siapa / keterangan', 'Jumlah (Rp)')}</div>
        <button type="button" class="onb-add" data-add="onb-utang" data-nama="Ke siapa / keterangan" data-jml="Jumlah (Rp)">+ Tambah utang</button>
      </div>

      <div class="onb-sec">
        <h3>🔁 Biaya Rutin Bulan Ini</h3>
        <p class="hint">Dicatat sebagai pengeluaran bulan ini. Kosongin kalau gak ada.</p>
        <div class="onb-fixed"><label>🏠 Kost / sewa bulanan</label><input id="onb-kost" type="tel" inputmode="numeric" placeholder="Rp" /></div>
        <div class="onb-fixed"><label>💳 Cicilan kartu kredit</label><input id="onb-cicilan" type="tel" inputmode="numeric" placeholder="Rp" /></div>
      </div>

      <div class="onb-actions">
        <button type="button" class="btn btn-primary btn-block" id="onb-save">Simpan & Mulai 🚀</button>
        <button type="button" class="btn btn-ghost btn-block" id="onb-skip">Lewati dulu</button>
      </div>
    </div>
  </div>`;

  screen.hidden = false;

  // Prefill nama kalau udah pernah diisi
  const namaInput = document.getElementById('onb-nama-user');
  if (namaInput) {
    namaInput.value = state.userName
      || (typeof currentProfile !== 'undefined' && currentProfile && currentProfile.displayName)
      || '';
  }

  // Tambah baris dinamis
  screen.querySelectorAll('.onb-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const cont = document.getElementById(btn.dataset.add);
      cont.insertAdjacentHTML('beforeend', onbRowHtml(btn.dataset.nama, btn.dataset.jml));
    });
  });
  // Hapus baris (event delegation)
  screen.addEventListener('click', (e) => {
    const del = e.target.closest('.onb-del');
    if (del) del.closest('.onb-row').remove();
  });

  document.getElementById('onb-skip').addEventListener('click', () => finishOnboarding(false));
  document.getElementById('onb-save').addEventListener('click', () => finishOnboarding(true));
}

function hideOnboarding() {
  const screen = document.getElementById('onboarding-screen');
  if (screen) { screen.hidden = true; screen.innerHTML = ''; }
}

function onbNum(v) {
  return Number(String(v || '').replace(/[^\d]/g, '')) || 0;
}

function onbReadRows(contId, jenis, sink) {
  document.querySelectorAll('#' + contId + ' .onb-row').forEach(row => {
    const nama = row.querySelector('.onb-nama').value.trim();
    const jml = onbNum(row.querySelector('.onb-jml').value);
    if (jml > 0) sink(nama, jml);
  });
}

function finishOnboarding(save) {
  if (save) {
    try {
      // Nama user → state.userName (buat sapaan & identitas di dashboard)
      const namaUser = (document.getElementById('onb-nama-user').value || '').trim();
      if (namaUser) { state.userName = namaUser; saveState(); }

      // Aset rekening + investasi → state.assets (info terpisah, gak masuk cashflow)
      onbReadRows('onb-rekening', 'rekening', (nama, jml) =>
        addAsset({ jenis: 'rekening', nama: nama || 'Rekening', jumlah: jml }));
      onbReadRows('onb-investasi', 'investasi', (nama, jml) =>
        addAsset({ jenis: 'investasi', nama: nama || 'Investasi', jumlah: jml }));

      // Piutang (duit di teman) → hutangs jenis piutang
      onbReadRows('onb-piutang', 'piutang', (nama, jml) =>
        addHutang({ jenis: 'piutang', nama: nama || 'Teman', jumlah: jml, keterangan: 'Setup dana awal' }));

      // Utang kamu → hutangs jenis hutang
      onbReadRows('onb-utang', 'hutang', (nama, jml) =>
        addHutang({ jenis: 'hutang', nama: nama || 'Utang', jumlah: jml, keterangan: 'Setup dana awal' }));

      // Biaya rutin → pengeluaran bulan ini
      const kost = onbNum(document.getElementById('onb-kost').value);
      const cicilan = onbNum(document.getElementById('onb-cicilan').value);
      if (kost > 0) addTransaction({ jenis: 'pengeluaran', jumlah: kost, kategori: 'Tempat Tinggal', subKategori: 'Kost/Sewa', alokasi: 'Kebutuhan', tanggal: todayISO(), deskripsi: 'Kost/sewa bulanan' });
      if (cicilan > 0) addTransaction({ jenis: 'pengeluaran', jumlah: cicilan, kategori: 'Cicilan', subKategori: 'Cicilan Kartu Kredit', alokasi: 'Kebutuhan', tanggal: todayISO(), deskripsi: 'Cicilan kartu kredit' });

      if (typeof showToast === 'function') showToast('Dana awal tersimpan! Selamat datang 🐻', 'success');
    } catch (e) {
      console.warn('Onboarding save error:', e);
    }
  }
  try { localStorage.setItem(onbFlagKey(), '1'); } catch (_) {}
  hideOnboarding();
  // Refresh tampilan dengan data baru
  if (typeof renderAll === 'function') renderAll();
  if (typeof renderAssets === 'function') renderAssets();
}

// Buka ulang manual dari menu (reset flag biar form muncul lagi walau bukan user fresh)
function openOnboardingManual() {
  showOnboarding();
}

// Expose
window.maybeShowOnboarding = maybeShowOnboarding;
window.openOnboardingManual = openOnboardingManual;
