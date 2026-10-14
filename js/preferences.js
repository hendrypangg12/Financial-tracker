// Language belongs to the account; currency belongs to each wallet.
const CURRENCY_FALLBACK = 'AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HRK HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SLL SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VES VND VUV WST XAF XCD XCG XDR XOF XPF XSU YER ZAR ZMW ZWG ZWL'.split(' ');
function getSupportedCurrencies() {
  try { return [...new Set([...CURRENCY_FALLBACK, ...Intl.supportedValuesOf('currency')])].sort(); } catch (_) { return [...CURRENCY_FALLBACK]; }
}
function getDeviceLanguage() {
  try {
    const selected = localStorage.getItem('beruang_ui_language');
    if (selected === 'id' || selected === 'en') return selected;
  } catch (_) {}
  return typeof navigator !== 'undefined' && /^id\b/i.test(navigator.language || '') ? 'id' : 'en';
}
function preferenceState() {
  try { return typeof state !== 'undefined' ? state : null; } catch (_) { return null; }
}
function getAppLanguage() {
  const data = preferenceState();
  if (typeof currentUser !== 'undefined' && !currentUser) return getDeviceLanguage();
  return data?.preferences?.language === 'en' ? 'en' : data?.preferences?.language === 'id' ? 'id' : getDeviceLanguage();
}
function getAppLocale() { return getAppLanguage() === 'en' ? 'en-US' : 'id-ID'; }
function getAccountCurrency() { return typeof getActiveWallet === 'function' ? getActiveWallet().currency : preferenceState()?.preferences?.currency || 'IDR'; }
function getCurrencyDigits(code = getAccountCurrency()) {
  // Existing Rupiah balances and inputs use whole Rupiah.
  if (code === 'IDR') return 0;
  return new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits;
}
function normalizePreferences(input) {
  const raw = input && typeof input === 'object' ? input : {};
  const currency = raw.currency === undefined ? 'IDR' : raw.currency;
  if (!getSupportedCurrencies().includes(currency)) throw new Error('Unsupported account currency');
  return { language: raw.language === 'en' ? 'en' : 'id', currency, currencyLocked: raw.currencyLocked === true,
    ...(typeof raw.mainWalletName === 'string' && raw.mainWalletName.trim().length <= 40 ? { mainWalletName: raw.mainWalletName.trim() } : {}),
    ...(typeof raw.defaultWalletId === 'string' && /^w_[a-z0-9]+$/.test(raw.defaultWalletId) ? { defaultWalletId: raw.defaultWalletId } : {}) };
}

function preferenceMessage(id, en) { return getAppLanguage() === 'en' ? en : id; }
function setAccountPreferences(patch = {}) {
  const data = preferenceState();
  if (!data) return { ok: false, error: 'Account not loaded' };
  if (patch.currency !== undefined) return { ok: false, error: preferenceMessage('Pilih mata uang di pengaturan dompet.', 'Choose currency in wallet settings.') };
  data.preferences = normalizePreferences({ ...data.preferences, ...patch, currency: 'IDR' });
  try { localStorage.setItem('beruang_ui_language', data.preferences.language); } catch (_) {}
  if (typeof saveState === 'function') saveState();
  if (typeof applyAppLanguage === 'function') applyAppLanguage();
  if (typeof renderAll === 'function') renderAll();
  return { ok: true };
}
function refreshAccountPreferencesUI() {
  if (typeof document === 'undefined') return;
  const select = document.getElementById('app-language');
  if (select) { select.value = getAppLanguage(); select.onchange = () => setAccountPreferences({ language: select.value }); }
}
