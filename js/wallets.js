// The original main ledger stays in IDR. New wallets live in additive fields,
// so older clients and Telegram cannot interpret foreign amounts as Rupiah.
const LEGACY_WALLET_ID = 'legacy';
const WALLET_RECORD_FIELDS = ['transactions', 'hutangs', 'assets', 'recurring', 'goals'];
function emptyWalletData(amount = 0, date = todayISO()) {
  return { transactions: [], hutangs: [], assets: [], recurring: [], goals: [], target: 0,
    startingBalance: { amount, date, completed: true } };
}
function validateWalletState(data) {
  const wallets = data.wallets ?? [], ledgers = data.walletData ?? {};
  if (!Array.isArray(wallets) || wallets.length > 40 || !ledgers || Array.isArray(ledgers) || typeof ledgers !== 'object') throw new Error('Invalid wallets');
  const ids = new Set();
  for (const wallet of wallets) {
    if (!wallet || !/^w_[a-z0-9]+$/.test(wallet.id) || ids.has(wallet.id)
      || typeof wallet.name !== 'string' || !wallet.name.trim() || wallet.name.length > 40
      || !getSupportedCurrencies().includes(wallet.currency)) throw new Error('Invalid wallet');
    ids.add(wallet.id);
    const ledger = ledgers[wallet.id];
    if (!ledger || !Number.isFinite(ledger.target) || ledger.target < 0) throw new Error('Invalid wallet ledger');
    for (const field of WALLET_RECORD_FIELDS) {
      if (!Array.isArray(ledger[field]) || ledger[field].some(row => !row || typeof row.id !== 'string')
        || new Set(ledger[field].map(row => row.id)).size !== ledger[field].length) throw new Error('Invalid wallet records');
      for (const row of ledger[field]) {
        for (const key of ['jumlah', 'nominal', 'targetAmount', 'savedAmount', 'currentSaving']) {
          if (row[key] !== undefined && (!Number.isFinite(row[key]) || row[key] < 0
            || !validWalletAmount(row[key], wallet.currency))) throw new Error('Invalid wallet amount');
        }
      }
    }
    const opening = ledger.startingBalance;
    if (!opening || opening.completed !== true || !validWalletAmount(opening.amount, wallet.currency)
      || opening.amount < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(opening.date)) throw new Error('Invalid wallet opening balance');
  }
  if (Object.keys(ledgers).some(id => !ids.has(id))) throw new Error('Unknown wallet ledger');
  return { wallets: JSON.parse(JSON.stringify(wallets)), walletData: JSON.parse(JSON.stringify(ledgers)) };
}
function validWalletAmount(amount, currency) {
  const factor = 10 ** getCurrencyDigits(currency);
  return Number.isFinite(amount) && Number.isSafeInteger(Math.round(amount * factor))
    && Math.abs(amount * factor - Math.round(amount * factor)) < 0.000001;
}
function getWallets() {
  return [{ id: LEGACY_WALLET_ID, name: state.preferences?.mainWalletName || preferenceMessage('Dompet utama', 'Main wallet'), currency: 'IDR' }, ...(state.wallets || [])];
}
function getActiveWalletId() {
  let selected;
  try { selected = localStorage.getItem(storageKey() + ':selected-wallet'); } catch (_) {}
  return getWallets().some(wallet => wallet.id === selected) ? selected
    : getWallets().some(wallet => wallet.id === state.preferences?.defaultWalletId) ? state.preferences.defaultWalletId : LEGACY_WALLET_ID;
}
function getActiveWallet() { return getWallets().find(wallet => wallet.id === getActiveWalletId()); }
function getWalletLedger(id = getActiveWalletId()) {
  if (id === LEGACY_WALLET_ID) return state;
  const ledger = state.walletData?.[id];
  if (!ledger) throw new Error('Wallet not found');
  return ledger;
}
function selectWallet(id) {
  if (!getWallets().some(wallet => wallet.id === id)) return false;
  if (id !== getActiveWalletId() && typeof aiAdvisorSending !== 'undefined' && aiAdvisorSending) {
    if (typeof showToast === 'function') showToast(preferenceMessage('Tunggu jawaban AI sebelum mengganti dompet.', 'Wait for the AI reply before switching wallets.'));
    return false;
  }
  if (typeof document !== 'undefined' && typeof document.querySelector === 'function' && id !== getActiveWalletId()) {
    const form = document.getElementById('form-transaksi');
    if (form?.elements.jumlah?.value && !confirm(preferenceMessage('Ganti dompet dan buang isian transaksi yang belum disimpan?', 'Switch wallets and discard the unsaved transaction?'))) return false;
    form?.reset();
    if (form?.elements.tanggal) form.elements.tanggal.value = todayISO();
    for (const field of ['chat-input','struk-text','koreksi-total']) { const input = document.getElementById(field); if (input) input.value = ''; }
    const receipt = document.getElementById('struk-result'); if (receipt) receipt.innerHTML = '';
    if (typeof resetAdvisorWallet === 'function') resetAdvisorWallet();
  }
  localStorage.setItem(storageKey() + ':selected-wallet', id);
  if (typeof renderAll === 'function') renderAll();
  return true;
}
function walletHasHistory(id) {
  const wallet = getWallets().find(item => item.id === id);
  const ledger = getWalletLedger(id);
  return id === LEGACY_WALLET_ID || wallet?.currencyLocked === true
    || Number(ledger.startingBalance?.amount) > 0 || Number(ledger.target) > 0
    || WALLET_RECORD_FIELDS.some(field => ledger[field]?.length);
}
function lockWalletCurrencies() {
  for (const wallet of state.wallets || []) if (walletHasHistory(wallet.id)) wallet.currencyLocked = true;
}
function createWallet({ name, currency, amount = 0, date = todayISO() }) {
  name = String(name || '').trim();
  if (!name || name.length > 40) return { ok: false, error: preferenceMessage('Nama dompet harus 1–40 karakter.', 'Wallet name must be 1–40 characters.') };
  if (!getSupportedCurrencies().includes(currency) || !validWalletAmount(amount, currency) || amount < 0) return { ok: false, error: preferenceMessage('Mata uang atau saldo awal tidak valid.', 'Invalid currency or opening balance.') };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parseISO(date).getTime())) return { ok: false, error: preferenceMessage('Tanggal tidak valid.', 'Invalid date.') };
  if ((state.wallets || []).length >= 40) return { ok: false, error: preferenceMessage('Batas 40 dompet tercapai.', 'The 40-wallet limit was reached.') };
  const id = 'w_' + uid().replace(/[^a-z0-9]/gi, '').toLowerCase();
  state.wallets ||= []; state.walletData ||= {};
  state.wallets.push({ id, name, currency, currencyLocked: amount > 0 });
  state.walletData[id] = emptyWalletData(amount, date);
  saveState(); selectWallet(id);
  return { ok: true, id };
}
function updateWallet(id, { name, currency }) {
  name = String(name || '').trim();
  if (id === LEGACY_WALLET_ID && name && name.length <= 40 && currency === 'IDR') {
    state.preferences = { ...state.preferences, mainWalletName: name }; saveState();
    if (typeof renderAll === 'function') renderAll();
    return { ok: true };
  }
  const wallet = (state.wallets || []).find(item => item.id === id);
  if (!wallet) return { ok: false, error: preferenceMessage('Dompet utama tetap dalam IDR.', 'The main wallet stays in IDR.') };
  if (!name || name.length > 40 || !getSupportedCurrencies().includes(currency)) return { ok: false, error: preferenceMessage('Pengaturan dompet tidak valid.', 'Invalid wallet settings.') };
  if (currency !== wallet.currency && walletHasHistory(id)) return { ok: false, error: preferenceMessage('Mata uang terkunci karena ada riwayat. Buat dompet baru untuk mata uang lain.', 'Currency is locked by its history. Create a new wallet for another currency.') };
  Object.assign(wallet, { name, currency }); saveState();
  if (typeof renderAll === 'function') renderAll();
  return { ok: true };
}
function formatWalletMoney(amount, currency) {
  return new Intl.NumberFormat(getAppLocale(), { style: 'currency', currency, currencyDisplay: 'code',
    minimumFractionDigits: getCurrencyDigits(currency), maximumFractionDigits: getCurrencyDigits(currency) }).format(amount);
}
function walletBalance(id, through = todayISO()) {
  const wallet = getWallets().find(item => item.id === id), ledger = getWalletLedger(id);
  const factor = 10 ** getCurrencyDigits(wallet.currency);
  const setup = ledger.startingBalance?.completed === true ? ledger.startingBalance : null;
  let units = setup && setup.date <= through ? Math.round(Number(setup.amount) * factor) : 0;
  for (const row of ledger.transactions || []) {
    if (row.tanggal > through || (setup && row.tanggal < setup.date) || isOpeningBalanceTransaction(row)) continue;
    units += (row.jenis === 'pemasukan' ? 1 : row.jenis === 'pengeluaran' ? -1 : 0) * Math.round(Number(row.jumlah) * factor);
  }
  return units / factor;
}
