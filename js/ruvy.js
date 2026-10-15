// Product shell. User records are always escaped; no sample money is seeded here.
function ruvyText(id, en) { return preferenceMessage(id, en); }
function ruvyEscape(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
function renderRuvyAuthCopy() {
  document.querySelectorAll('#login-screen [data-ruvy-id][data-ruvy-en]').forEach(node => {
    node.textContent = getAppLanguage() === 'en' ? node.dataset.ruvyEn : node.dataset.ruvyId;
  });
}
// Drafts stay in memory, separately for each account, wallet and currency.
// A wallet switch must never reinterpret an unfinished amount in another currency.
const ruvyQuickDrafts = new Map();
let ruvyQuickContext = null;
function ruvyQuickKey(wallet = getActiveWallet()) { return JSON.stringify([storageKey(), wallet.id, wallet.currency]); }
function setRuvyQuickFeedback(message = '', tone = '') {
  const feedback = document.getElementById('ruvy-quick-feedback');
  feedback.textContent = message; feedback.dataset.tone = tone; feedback.hidden = !message;
}
function renderRuvyQuickEntry() {
  const input = document.getElementById('ruvy-quick-input');
  if (!input) return;
  const wallet = getActiveWallet(), key = ruvyQuickKey(wallet);
  if (key !== ruvyQuickContext) {
    if (ruvyQuickContext !== null) ruvyQuickDrafts.set(ruvyQuickContext, input.value);
    input.value = ruvyQuickDrafts.get(key) || '';
    ruvyQuickContext = key;
    setRuvyQuickFeedback();
  }
  document.getElementById('ruvy-quick-wallet').textContent = wallet.name + ' · ' + wallet.currency;
  input.placeholder = wallet.currency === 'IDR' && getAppLanguage() !== 'en' ? 'kopi 25rb'
    : ruvyText('kopi ', 'coffee ') + wallet.currency + (getCurrencyDigits(wallet.currency) ? ' 3.50' : ' 300');
}
function waveRuvy(message) {
  const robot = document.getElementById('ruvy-robot'), bubble = document.getElementById('ruvy-bubble');
  const reducedMotion = document.body.classList.contains('ruvy-reduce-motion')
    || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const homeVisible = document.getElementById('tab-dashboard').classList.contains('active');
  // A second greeting refreshes the words without snapping an ongoing gesture.
  if (!document.hidden && homeVisible && !reducedMotion && !robot.classList.contains('waving')) robot.classList.add('waving');
  bubble.textContent = message;
  clearTimeout(robot._timer);
  robot._timer = setTimeout(() => { bubble.textContent = ruvyText('Kenali uangmu, satu catatan setiap hari.', 'Know your money, one entry at a time.'); }, 3500);
}
function submitRuvyQuickEntry(event) {
  event.preventDefault();
  const form = document.getElementById('ruvy-quick-form'), input = document.getElementById('ruvy-quick-input');
  if (form.dataset.submitting === 'true' || !input.value.trim()) return;
  if (document.body.classList.contains('app-locked') || (typeof isAccessLocked === 'function' && isAccessLocked())) {
    setRuvyQuickFeedback(ruvyText('Akses akun terkunci. Periksa akun dan paket sebelum mencatat.', 'Account access is locked. Check your account and plan before recording.'), 'error');
    return;
  }
  const wallet = getActiveWallet();
  if (ruvyQuickContext !== ruvyQuickKey(wallet)) {
    renderRuvyQuickEntry();
    setRuvyQuickFeedback(ruvyText('Dompet berubah. Periksa kembali isian untuk dompet ini.', 'Wallet changed. Review the entry for this wallet.'), 'error');
    return;
  }
  form.dataset.submitting = 'true';
  const submit = document.getElementById('ruvy-quick-submit'); submit.disabled = true;
  let parsed, target = wallet;
  try {
    // "bakso 25rb dari dompet utama" records into the named wallet; otherwise the selected one.
    const out = parseChatForWallet(input.value.trim(), wallet);
    if (!out || out.error) {
      setRuvyQuickFeedback(out?.error || ruvyText('Catatan belum diproses. Periksa isianmu.', 'Entry was not processed. Check your text.'), 'error');
      return;
    }
    parsed = out.parsed; target = out.wallet;
    addTransaction(parsed, target.id);
  } catch (error) {
    setRuvyQuickFeedback(ruvyText('Belum dapat mencatat. Periksa isian dan coba lagi.', 'Could not record this entry. Check it and try again.'), 'error');
    return;
  } finally {
    delete form.dataset.submitting; submit.disabled = false;
  }
  input.value = ''; ruvyQuickDrafts.delete(ruvyQuickContext);
  const message = ruvyText('Dicatat: ', 'Recorded: ') + formatWalletMoney(parsed.jumlah, target.currency) + ' · ' + target.name;
  // Rendering cannot turn an already-recorded entry into a failed-save message.
  try { renderAll(); } finally {
    setRuvyQuickFeedback(message, 'success');
    waveRuvy(ruvyText('Sudah dicatat. Satu langkah lebih jelas.', 'Recorded. Your money is a little clearer.'));
  }
  if (typeof window.maybeAskReview === 'function') setTimeout(() => window.maybeAskReview(), 1500);
}
function renderRuvy() {
  for (const page of ['privacy','terms']) document.querySelectorAll('a[href^="' + page + '"]').forEach(link => link.href = page + (getAppLanguage() === 'en' ? '-en' : '') + '.html');
  const home = document.getElementById('ruvy-home');
  if (!home) return;
  const wallet = getActiveWallet();
  const monthRows = getCashflowTransactionsFor(state.selectedMonth, state.selectedYear);
  const income = roundMoney(sumBy(monthRows, 'pemasukan')), expense = roundMoney(sumBy(monthRows, 'pengeluaran'));
  const end = toISODate(new Date(state.selectedYear, state.selectedMonth + 1, 0));
  document.getElementById('ruvy-greeting').textContent = state.userName ? ruvyText('Halo, ', 'Hello, ') + state.userName : ruvyText('Uangmu, lebih jelas.', 'Your money, made clear.');
  document.getElementById('ruvy-balance-label').textContent = ruvyText('Saldo dompet', 'Wallet balance');
  document.getElementById('ruvy-balance').textContent = formatWalletMoney(walletBalance(wallet.id, end), wallet.currency);
  document.getElementById('ruvy-income').textContent = formatWalletMoney(income, wallet.currency);
  document.getElementById('ruvy-expense').textContent = formatWalletMoney(expense, wallet.currency);
  document.getElementById('ruvy-net').textContent = formatWalletMoney(roundMoney(income - expense), wallet.currency);
  document.getElementById('ruvy-period-month').innerHTML = Array.from({ length: 12 }, (_, i) => '<option value="' + i + '">' + new Intl.DateTimeFormat(getAppLocale(), { month: 'long' }).format(new Date(2026, i, 1)) + '</option>').join('');
  document.getElementById('ruvy-period-month').value = state.selectedMonth;
  const years = new Set([state.selectedYear, new Date().getFullYear()]);
  for (const row of getFinancialState().transactions) years.add(Number(row.tanggal?.slice(0, 4)));
  document.getElementById('ruvy-period-year').innerHTML = [...years].filter(y => Number.isInteger(y) && y >= 1900 && y <= 9999).sort((a,b)=>b-a).map(y=>'<option>'+y+'</option>').join('');
  document.getElementById('ruvy-period-year').value = state.selectedYear;
  const strip = document.getElementById('ruvy-wallet-strip');
  strip.innerHTML = getWallets().map(w => '<button type="button" class="ruvy-wallet ' + (w.id === wallet.id ? 'selected' : '') + '" data-wallet="' + w.id + '" aria-pressed="' + (w.id === wallet.id) + '"><span class="ruvy-wallet-code">' + w.currency + '</span><strong>' + ruvyEscape(w.name) + '</strong><span>' + ruvyEscape(formatWalletMoney(walletBalance(w.id), w.currency)) + '</span></button>').join('') + '<button class="ruvy-wallet ruvy-new-wallet" type="button" data-new-wallet><span aria-hidden="true">＋</span><strong>' + ruvyText('Dompet baru','New wallet') + '</strong></button>';
  strip.querySelectorAll('[data-wallet]').forEach(button => button.onclick = () => selectWallet(button.dataset.wallet));
  strip.querySelector('[data-new-wallet]').onclick = () => openWalletEditor();
  const latest = monthRows.slice().sort((a,b)=>b.tanggal.localeCompare(a.tanggal)).slice(0, 3);
  document.getElementById('ruvy-recent').innerHTML = latest.length ? latest.map(row => '<button class="ruvy-recent-row" type="button" data-transaction="' + ruvyEscape(row.id) + '"><span class="ruvy-tx-icon ' + (row.jenis === 'pemasukan' ? 'income' : 'expense') + '" aria-hidden="true">' + (row.jenis === 'pemasukan' ? '↙' : '↗') + '</span><span class="ruvy-tx-copy"><strong>' + ruvyEscape(row.deskripsi || row.kategori) + '</strong><small>' + ruvyEscape(formatTanggal(row.tanggal)) + '</small></span><b class="' + (row.jenis === 'pemasukan' ? 'money-income' : 'money-expense') + '">' + (row.jenis === 'pemasukan' ? '+' : '−') + ruvyEscape(formatWalletMoney(row.jumlah, wallet.currency)) + '</b></button>').join('') : '<div class="ruvy-empty"><span aria-hidden="true">↗</span><strong>' + ruvyText('Mulai dari satu catatan','Start with one entry') + '</strong><p>' + ruvyText('Catat uang masuk atau keluar. Ruvy membantu melihat polanya.','Record income or an expense. Ruvy helps you see the patterns.') + '</p></div>';
  document.getElementById('ruvy-recent').querySelectorAll('[data-transaction]').forEach(button => button.onclick = () => { switchBeruangTab('transaksi'); document.getElementById('trx-search').value = ''; renderTransaksi(); });
  document.getElementById('ruvy-wallet-note').textContent = ruvyText('Saldo ditampilkan per dompet. Tidak ada konversi kurs otomatis.','Balances are shown per wallet. No automatic exchange-rate conversion.');
  document.getElementById('ruvy-settings-wallet').textContent = wallet.name + ' · ' + wallet.currency;
  document.querySelectorAll('[data-ruvy-id][data-ruvy-en]').forEach(node => node.textContent = getAppLanguage() === 'en' ? node.dataset.ruvyEn : node.dataset.ruvyId);
  document.querySelectorAll('.money-input').forEach(input => input.inputMode = getCurrencyDigits() ? 'decimal' : 'numeric');
  document.querySelectorAll('[data-currency-label]').forEach(node => node.textContent = ruvyText('Nominal','Amount') + ' (' + wallet.currency + ')');
  document.querySelectorAll('#form-transaksi select[name="kategori"] option, #form-transaksi select[name="subKategori"] option').forEach(option=>{
    const form=option.closest('form'),kind=form.elements.jenis.value,parent=option.parentElement.name==='subKategori'?form.elements.kategori.value:undefined;
    option.textContent=categoryDisplayName(option.value,kind,parent);
  });
  const currency=wallet.currency, small=getCurrencyDigits(currency) ? '3.50' : '300';
  const examples = getAppLanguage()==='en' ? ['coffee '+currency+' '+small,'fuel '+currency+' 30','salary '+currency+' 2500','coffee '+currency+' '+small+' yesterday']
    : currency==='IDR' ? ['bakso 25rb','bensin 50rb','gaji 8jt','kopi 28k kemarin'] : ['kopi '+currency+' '+small,'bensin '+currency+' 30','gaji '+currency+' 2500','kopi '+currency+' '+small+' kemarin'];
  document.querySelectorAll('[data-chat-example]').forEach((button,index)=>{button.dataset.chatExample=examples[index];button.textContent=examples[index];});
  const chat=document.getElementById('chat-input'); if(chat) chat.placeholder=examples[0];
  renderRuvyQuickEntry();
}

let walletEditorId = null;
function openWalletEditor(id = null) {
  walletEditorId = id;
  const wallet = id ? getWallets().find(w => w.id === id) : null;
  const form = document.getElementById('ruvy-wallet-form'); form.reset();
  document.getElementById('ruvy-wallet-title').textContent = id ? ruvyText('Pengaturan dompet','Wallet settings') : ruvyText('Dompet baru','New wallet');
  form.elements.name.value = wallet?.name || '';
  document.getElementById('ruvy-wallet-opening').hidden = !!id;
  const currency = document.getElementById('ruvy-wallet-currency');
  currency.dataset.selectedCurrency = wallet?.currency || getAccountCurrency();
  currency.disabled = !!id && walletHasHistory(id);
  document.getElementById('ruvy-wallet-lock-note').textContent = currency.disabled
    ? ruvyText('Mata uang tetap agar riwayat tidak berubah. Buat dompet baru untuk mata uang lain.','Currency stays fixed to preserve history. Create a new wallet for another currency.')
    : ruvyText('Setiap dompet punya mata uang sendiri. Saldo awal bukan pemasukan.','Each wallet has its own currency. Opening balance is not income.');
  renderCurrencyChoices();
  document.getElementById('ruvy-wallet-error').textContent = '';
  document.getElementById('ruvy-wallet-dialog').showModal();
  form.elements.name.focus();
}
function renderCurrencyChoices() {
  const select = document.getElementById('ruvy-wallet-currency');
  const query = document.getElementById('ruvy-currency-search').value.trim().toLocaleLowerCase(getAppLocale());
  let names; try { names = new Intl.DisplayNames([getAppLocale()], { type: 'currency' }); } catch (_) {}
  const selected = select.dataset.selectedCurrency;
  select.replaceChildren();
  const popular = ['USD','EUR','JPY','GBP','AUD','CAD','CHF','SGD','MYR','IDR'];
  const currencies = [...popular, ...getSupportedCurrencies().filter(code => !popular.includes(code))];
  for (const code of currencies) {
    const name = names?.of(code) || code;
    const symbol = new Intl.NumberFormat(getAppLocale(), { style:'currency', currency:code, currencyDisplay:'narrowSymbol' }).formatToParts(0).find(part => part.type === 'currency')?.value || code;
    if (query && ![code,name,symbol].some(text => text.toLocaleLowerCase(getAppLocale()).includes(query)) && code !== selected) continue;
    const option = document.createElement('option'); option.value = code; option.textContent = code + ' · ' + name + ' (' + symbol + ')'; select.append(option);
  }
  select.value = selected;
}
function initRuvy() {
  document.body.classList.add('ruvy-app');
  const remember = (key) => { try { return localStorage.getItem(key) === 'true'; } catch (_) { return false; } };
  for (const [id,key,cls] of [['app-reduce-transparency','ruvy-solid','ruvy-solid'],['ruvy-reduce-motion','ruvy-reduce-motion','ruvy-reduce-motion'],['ruvy-dark-mode','ruvy-dark','ruvy-dark']]) {
    const input = document.getElementById(id); input.checked = remember(key); document.body.classList.toggle(cls,input.checked);
    input.onchange = () => { document.body.classList.toggle(cls,input.checked); try { localStorage.setItem(key,String(input.checked)); } catch (_) {} };
  }
  document.getElementById('ruvy-period-month').onchange = event => { state.selectedMonth = Number(event.target.value); renderAll(); };
  document.getElementById('ruvy-period-year').onchange = event => { state.selectedYear = Number(event.target.value); renderAll(); };
  document.getElementById('ruvy-quick-form').onsubmit = submitRuvyQuickEntry;
  document.getElementById('ruvy-quick-input').oninput = () => { ruvyQuickDrafts.set(ruvyQuickContext, document.getElementById('ruvy-quick-input').value); setRuvyQuickFeedback(); };
  document.getElementById('ruvy-currency-search').oninput = renderCurrencyChoices;
  document.getElementById('ruvy-wallet-currency').onchange = event => { event.target.dataset.selectedCurrency = event.target.value; document.getElementById('ruvy-wallet-form').elements.amount.value = ''; };
  document.getElementById('ruvy-wallet-form').onsubmit = event => {
    event.preventDefault(); const form = event.target;
    const currency = form.elements.currency.value;
    const amount = form.elements.amount.value.trim() ? parseMoneyNumber(form.elements.amount.value.trim(), '', currency) : 0;
    const result = walletEditorId ? updateWallet(walletEditorId,{ name: form.elements.name.value, currency }) : createWallet({ name: form.elements.name.value, currency, amount });
    if (!result.ok) { document.getElementById('ruvy-wallet-error').textContent = result.error; return; }
    document.getElementById('ruvy-wallet-dialog').close(); renderAll();
  };
  document.getElementById('ruvy-wallet-close').onclick = () => document.getElementById('ruvy-wallet-dialog').close();
  document.querySelectorAll('[data-ruvy-action]').forEach(button => button.onclick = () => {
    const action = button.dataset.ruvyAction;
    if (action === 'wallet') openWalletEditor(getActiveWalletId());
    else if (action === 'preferences') { refreshAccountPreferencesUI(); document.getElementById('modal-preferences').hidden = false; }
    else if (action === 'ai') openAIChat();
    else document.getElementById(action)?.click();
  });
  for (const id of ['preferences-close','preferences-done']) document.getElementById(id).onclick = () => document.getElementById('modal-preferences').hidden = true;
  document.getElementById('btn-open-preferences').onclick = () => { document.getElementById('user-dropdown').hidden = true; refreshAccountPreferencesUI(); document.getElementById('modal-preferences').hidden = false; };
  const robot = document.getElementById('ruvy-robot');
  robot.onclick = () => waveRuvy(ruvyText('Hai! Mau lihat ke mana uangmu pergi?', 'Hi! Want to see where your money goes?'));
  const finishWave = event => { if (event.animationName === 'ruvy-wave') robot.classList.remove('waving'); };
  robot.addEventListener('animationend', finishWave);
  robot.addEventListener('animationcancel', finishWave);
  const syncRobotVisibility = () => document.body.classList.toggle('ruvy-paused', document.hidden);
  document.addEventListener('visibilitychange', syncRobotVisibility);
  syncRobotVisibility();
  const loginLanguage = document.getElementById('login-language');
  if (loginLanguage) loginLanguage.onchange = () => { setDeviceLanguage(loginLanguage.value); applyAppLanguage(); renderRuvyAuthCopy(); };
  renderRuvyAuthCopy();
  renderRuvy();
}
initRuvy();
