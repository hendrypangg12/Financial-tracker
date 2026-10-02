// Langkah wajib pertama: catat baseline uang cair agar saldo akun tidak dimulai dari angka yang menyesatkan.

function hasStartingBalanceSetup() {
  return state.startingBalance?.completed === true
    && Number.isFinite(Number(state.startingBalance.amount))
    && Number(state.startingBalance.amount) >= 0
    && typeof state.startingBalance.date === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(state.startingBalance.date);
}

// Versi lama menyimpan dana awal sebagai transaksi pemasukan. Akun yang sudah
// punya transaksi juga harus mempertahankan saldo historisnya saat upgrade.
function migrateLegacyStartingBalance() {
  if (hasStartingBalanceSetup()) return false;
  const openingRows = (state.transactions || []).filter(t => isOpeningBalanceTransaction(t));
  const existingRows = state.transactions || [];
  if (!existingRows.length) return false;

  // Existing accounts already have a transaction history. A zero baseline at
  // their first transaction keeps their cumulative balance unchanged; asking
  // them to enter today's balance would discard all earlier transactions.
  const dates = existingRows.map(t => t.tanggal).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  state.startingBalance = {
    amount: openingRows.reduce((sum, t) => sum + (Number(t.jumlah) || 0), 0),
    date: dates[0] || todayISO(),
    completed: true,
    completedAt: new Date().toISOString(),
  };
  saveState();
  return true;
}

function maybeShowOnboarding() {
  try {
    const migrated = migrateLegacyStartingBalance();
    if (hasStartingBalanceSetup()) {
      if (migrated && typeof renderAll === 'function') renderAll();
      return false;
    }
    showOnboarding(false);
    return true;
  } catch (e) {
    console.warn('Setup dana awal belum dapat dimuat:', e);
    return false;
  }
}

function injectOnbStyles() {
  if (document.getElementById('onb-styles')) return;
  const css = `
  .onb-wrap{position:fixed;inset:0;z-index:9000;overflow-y:auto;background:linear-gradient(180deg,#f8f0e3,#fbf8f2);-webkit-overflow-scrolling:touch;display:grid;place-items:center;padding:20px 14px;}
  .onb-card{width:min(100%,480px);margin:auto;padding:26px 24px 24px;background:#fff;border:1px solid #eadcc5;border-radius:24px;box-shadow:0 20px 70px rgba(65,43,28,.16);}
  .onb-logo{width:58px;height:58px;border-radius:16px;display:block;margin:0 auto 14px;}
  .onb-title{font-size:24px;font-weight:850;color:#422e22;text-align:center;margin:0 0 8px;letter-spacing:-.5px;}
  .onb-sub{font-size:14px;color:#786757;text-align:center;line-height:1.55;margin:0 auto 20px;max-width:400px;}
  .onb-field-label{display:block;font-size:13px;font-weight:750;color:#493427;margin:0 0 8px;}
  .onb-amount-wrap{display:flex;align-items:center;gap:8px;padding:0 14px;border:1.5px solid #d9c8aa;border-radius:13px;background:#fffdf9;}
  .onb-amount-wrap:focus-within{border-color:#a16c31;box-shadow:0 0 0 3px rgba(161,108,49,.12);}
  .onb-currency{font-size:18px;font-weight:800;color:#967044;}
  .onb-amount{width:100%;min-width:0;padding:14px 0;border:0;background:transparent;color:#34251c;font-family:inherit;font-size:23px;line-height:1.2;font-weight:700;outline:0;}
  .onb-hint{display:block;margin:8px 0 0;color:#887968;font-size:12px;line-height:1.5;}
  .onb-name{width:100%;margin-top:16px;padding:11px 12px;border:1px solid #e9dfd1;border-radius:10px;font:inherit;background:#fff;}
  .onb-error{margin:10px 0 0;color:#b42318;font-size:12px;}
  .onb-actions{display:grid;gap:9px;margin-top:20px;}
  .onb-actions button{width:100%;min-height:46px;border-radius:11px;font:inherit;font-size:14px;font-weight:800;cursor:pointer;}
  .onb-primary{border:1px solid #815328;background:#815328;color:#fff;}
  .onb-primary:hover{background:#69421e;}
  .onb-zero{border:1px solid #e6dccd;background:#fff;color:#5f4e3e;}
  .onb-zero:hover{background:#faf6ef;}
  .onb-cancel{border:0;background:transparent;color:#776757;}
  .onb-extras{margin-top:18px;border:1px solid #eee5d8;border-radius:12px;padding:0 12px;background:#fffdf9;}
  .onb-extras summary{padding:12px 0;color:#60482f;font-size:13px;font-weight:750;cursor:pointer;}
  .onb-extras-body{padding:0 0 12px;display:grid;gap:14px;}
  .onb-extra-section{display:grid;gap:7px;}
  .onb-extra-section b{font-size:12px;color:#493427;}
  .onb-extra-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(130px,.8fr);gap:7px;}
  .onb-extra-row input,.onb-fixed input{min-width:0;width:100%;padding:10px;border:1px solid #e9dfd1;border-radius:9px;font:inherit;font-size:13px;background:#fff;}
  .onb-add-row{justify-self:start;border:0;background:transparent;color:#815328;font:inherit;font-size:12px;font-weight:750;cursor:pointer;padding:3px 0;}
  .onb-extras-hint{margin:0;color:#827262;font-size:11px;line-height:1.45;}
  .onb-foot{margin:14px 0 0;text-align:center;color:#8a7b6d;font-size:11px;line-height:1.45;}
  @media(max-width:420px){.onb-wrap{padding:10px}.onb-card{padding:22px 18px;border-radius:20px}.onb-title{font-size:22px}.onb-amount{font-size:21px;}}
  `;
  const style = document.createElement('style');
  style.id = 'onb-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

function showOnboarding(editing = false) {
  const screen = document.getElementById('onboarding-screen');
  if (!screen) return;
  injectOnbStyles();
  const existing = editing && hasStartingBalanceSetup() ? Number(state.startingBalance.amount) : '';
  const amount = existing === '' ? '' : existing.toLocaleString('id-ID');
  const displayName = state.userName
    || (typeof currentProfile !== 'undefined' && currentProfile && currentProfile.displayName)
    || '';
  screen.innerHTML = `
    <div class="onb-wrap" role="dialog" aria-modal="true" aria-labelledby="onb-title">
      <section class="onb-card">
        <img class="onb-logo" src="assets/icons/beruang-wallet-192.png" alt="" />
        <h1 class="onb-title" id="onb-title">${editing ? 'Ubah Dana Awal' : 'Mulai dengan Dana Awal'}</h1>
        <p class="onb-sub">${editing
          ? 'Perbaiki angka saldo saat pertama mulai memakai BerUang. Transaksi setelah tanggal setup tetap dihitung seperti biasa.'
          : 'Sebelum mencatat transaksi, masukkan uang yang tersedia sekarang supaya saldo awal dan laporanmu akurat.'}</p>
        <label class="onb-field-label" for="onb-starting-amount">${editing ? `Saldo pembuka pada ${state.startingBalance.date}` : 'Total uang tersedia sekarang'}</label>
        <div class="onb-amount-wrap"><span class="onb-currency">Rp</span><input id="onb-starting-amount" class="onb-amount" type="text" inputmode="numeric" autocomplete="off" placeholder="0" value="${amount}" aria-describedby="onb-starting-hint" /></div>
        <small class="onb-hint" id="onb-starting-hint">${editing ? 'Ubah saldo saat pertama mulai mencatat. Jangan isi saldo hari ini jika sudah ada transaksi sesudah tanggal tersebut, karena transaksi itu tetap dihitung.' : 'Jumlahkan saldo di rekening, e-wallet, dan uang tunai. Jangan masukkan investasi, piutang, atau limit kartu kredit. Dana awal hanya menjadi saldo pembuka, bukan pemasukan di laporan.'}</small>
        <input id="onb-nama-user" class="onb-name" type="text" placeholder="Nama panggilan (opsional)" autocomplete="name" value="${escapeHtmlOnboarding(displayName)}" />
        ${editing ? '' : `
        <details class="onb-extras">
          <summary>Opsional: isi aset, utang, dan tagihan rutin</summary>
          <div class="onb-extras-body">
            <section class="onb-extra-section"><b>Investasi &amp; aset</b><div id="onb-assets"></div><button type="button" class="onb-add-row" data-add-row="onb-assets" data-name-placeholder="Jenis aset">+ Tambah aset</button></section>
            <section class="onb-extra-section"><b>Piutang</b><div id="onb-receivables"></div><button type="button" class="onb-add-row" data-add-row="onb-receivables" data-name-placeholder="Nama orang">+ Tambah piutang</button></section>
            <section class="onb-extra-section"><b>Utang</b><div id="onb-debts"></div><button type="button" class="onb-add-row" data-add-row="onb-debts" data-name-placeholder="Ke siapa / keterangan">+ Tambah utang</button></section>
            <section class="onb-extra-section"><b>Pengingat tagihan rutin</b><div id="onb-routines"></div><button type="button" class="onb-add-row" id="onb-add-routine">+ Tambah pengingat</button><p class="onb-extras-hint">Disimpan sebagai pengingat belum dibayar; tagihan tidak otomatis dicatat sebagai pengeluaran.</p></section>
          </div>
        </details>`}
        <p id="onb-error" class="onb-error" role="alert" hidden></p>
        <div class="onb-actions">
          <button type="button" class="onb-primary" id="onb-save">${editing ? 'Simpan perubahan' : 'Simpan dana awal & lanjutkan'}</button>
          <button type="button" class="onb-zero" id="onb-zero">${editing ? 'Atur saldo ke Rp0' : 'Saya mulai dari Rp0'}</button>
          ${editing ? '<button type="button" class="onb-cancel" id="onb-cancel">Batal</button>' : ''}
        </div>
        <p class="onb-foot">${editing ? 'Perubahan hanya memperbaiki angka saldo pembuka.' : 'Isi nominal atau pilih Rp0. Setelah itu kamu langsung masuk ke BerUang.'}</p>
      </section>
    </div>`;
  screen.hidden = false;

  const input = document.getElementById('onb-starting-amount');
  input.addEventListener('input', () => {
    const digits = input.value.replace(/[^\d]/g, '');
    input.value = digits ? Number(digits).toLocaleString('id-ID') : '';
    document.getElementById('onb-error').hidden = true;
  });
  screen.querySelectorAll('.onb-add-row').forEach(button => {
    button.onclick = () => appendOnboardingRow(button.dataset.addRow, button.dataset.namePlaceholder);
  });
  document.getElementById('onb-add-routine')?.addEventListener('click', appendOnboardingRoutineRow);
  screen.addEventListener('input', event => {
    if (!event.target.matches('.onb-money')) return;
    const digits = event.target.value.replace(/[^\d]/g, '');
    event.target.value = digits ? Number(digits).toLocaleString('id-ID') : '';
  });
  if (!editing) {
    appendOnboardingRow('onb-assets', 'Jenis aset');
    appendOnboardingRow('onb-receivables', 'Nama orang');
    appendOnboardingRow('onb-debts', 'Ke siapa / keterangan');
    appendOnboardingRoutineRow();
  }
  document.getElementById('onb-save').onclick = () => {
    const amountValue = Number(input.value.replace(/[^\d]/g, ''));
    if (!Number.isSafeInteger(amountValue) || amountValue <= 0) {
      const error = document.getElementById('onb-error');
      error.textContent = 'Masukkan saldo lebih dari Rp0, atau pilih tombol “Saya mulai dari Rp0”.';
      error.hidden = false;
      input.focus();
      return;
    }
    saveStartingBalance(amountValue);
  };
  document.getElementById('onb-zero').onclick = () => {
    if (editing && !window.confirm('Ubah saldo awal akun ini menjadi Rp0?')) return;
    saveStartingBalance(0);
  };
  document.getElementById('onb-cancel')?.addEventListener('click', hideOnboarding);
}

function appendOnboardingRow(containerId, namePlaceholder) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'onb-extra-row';
  const name = document.createElement('input');
  name.className = 'onb-extra-name';
  name.type = 'text';
  name.placeholder = namePlaceholder || 'Nama';
  const amount = document.createElement('input');
  amount.className = 'onb-money onb-extra-amount';
  amount.type = 'text';
  amount.inputMode = 'numeric';
  amount.placeholder = 'Nominal Rp';
  row.append(name, amount);
  container.appendChild(row);
}

function appendOnboardingRoutineRow() {
  const container = document.getElementById('onb-routines');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'onb-extra-row';
  const name = document.createElement('input');
  name.className = 'onb-routine-name';
  name.type = 'text';
  name.placeholder = 'Contoh: kost / cicilan';
  const amount = document.createElement('input');
  amount.className = 'onb-money onb-routine-amount';
  amount.type = 'text';
  amount.inputMode = 'numeric';
  amount.placeholder = 'Nominal Rp';
  row.append(name, amount);
  container.appendChild(row);
}

function onboardingRoutineCategory(name) {
  const available = Object.keys(state.categories?.pengeluaran || {});
  const categoryHints = [
    { re: /kost|kos|sewa|kontrak|rumah|kpr|listrik|air/i, names: ['Hunian', 'Tempat Tinggal'] },
    { re: /cicil|utang|pinjaman/i, names: ['Utang & Pinjaman', 'Cicilan'] },
    { re: /internet|wifi|pulsa|data/i, names: ['Internet & Komunikasi'] },
    { re: /stream|hiburan|langganan/i, names: ['Hiburan & Rekreasi'] },
  ];
  const hint = categoryHints.find(item => item.re.test(name));
  return (hint && hint.names.find(candidate => available.includes(candidate))) || available[0] || 'Tagihan Rutin';
}

function escapeHtmlOnboarding(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function saveStartingBalance(amount) {
  const existingDate = hasStartingBalanceSetup() ? state.startingBalance.date : '';
  const name = (document.getElementById('onb-nama-user')?.value || '').trim();
  if (name) state.userName = name;
  state.startingBalance = {
    amount,
    date: existingDate || todayISO(),
    completed: true,
    completedAt: new Date().toISOString(),
  };
  saveOptionalOnboardingData();
  saveState();
  hideOnboarding();
  if (typeof renderAll === 'function') renderAll();
  if (typeof showToast === 'function') showToast('Dana awal tersimpan. BerUang siap dipakai.', 'success');
}

function saveOptionalOnboardingData() {
  if (document.getElementById('onb-assets')) {
    document.querySelectorAll('#onb-assets .onb-extra-row').forEach(row => {
      const amount = Number(row.querySelector('.onb-extra-amount')?.value.replace(/[^\d]/g, '') || 0);
      if (Number.isSafeInteger(amount) && amount > 0 && typeof addAsset === 'function') {
        addAsset({ jenis: 'investasi', nama: row.querySelector('.onb-extra-name')?.value.trim() || 'Aset', jumlah: amount });
      }
    });
    document.querySelectorAll('#onb-receivables .onb-extra-row').forEach(row => {
      const nominal = Number(row.querySelector('.onb-extra-amount')?.value.replace(/[^\d]/g, '') || 0);
      if (Number.isSafeInteger(nominal) && nominal > 0 && typeof addHutang === 'function') {
        addHutang({ jenis: 'piutang', nama: row.querySelector('.onb-extra-name')?.value.trim() || 'Piutang', nominal, keterangan: 'Setup dana awal' });
      }
    });
    document.querySelectorAll('#onb-debts .onb-extra-row').forEach(row => {
      const nominal = Number(row.querySelector('.onb-extra-amount')?.value.replace(/[^\d]/g, '') || 0);
      if (Number.isSafeInteger(nominal) && nominal > 0 && typeof addHutang === 'function') {
        addHutang({ jenis: 'hutang', nama: row.querySelector('.onb-extra-name')?.value.trim() || 'Utang', nominal, keterangan: 'Setup dana awal' });
      }
    });
  }
  document.querySelectorAll('#onb-routines .onb-extra-row').forEach(row => {
    const routineName = row.querySelector('.onb-routine-name')?.value.trim();
    const routineAmount = Number(row.querySelector('.onb-routine-amount')?.value.replace(/[^\d]/g, '') || 0);
    if (routineName && Number.isSafeInteger(routineAmount) && routineAmount > 0 && typeof addRecurring === 'function') {
      const category = onboardingRoutineCategory(routineName);
      addRecurring({ nama: routineName, jumlah: routineAmount, hariTagih: Math.min(parseInt(todayISO().slice(8, 10), 10) || 1, 28), kategori: category, subKategori: routineName, alokasi: 'Kebutuhan' });
    }
  });
}

function hideOnboarding() {
  const screen = document.getElementById('onboarding-screen');
  if (screen) { screen.hidden = true; screen.innerHTML = ''; }
}

function openOnboardingManual() {
  showOnboarding(hasStartingBalanceSetup());
}

function clearOnboardingDone() {
  // Status setup disimpan bersama data akun; resetAll() menghapusnya.
}

window.maybeShowOnboarding = maybeShowOnboarding;
window.openOnboardingManual = openOnboardingManual;
window.clearOnboardingDone = clearOnboardingDone;
