// Format & parser utilitas
function formatRupiah(n) {
  const currency = moneyCurrency();
  return new Intl.NumberFormat(moneyLocale(), {
    style: 'currency', currency, currencyDisplay: 'code',
    minimumFractionDigits: moneyDigits(currency), maximumFractionDigits: moneyDigits(currency),
  }).format(Number(n) || 0).replace(/^IDR\s*/, 'Rp ').replace(/^(−|-)IDR\s*/, '$1Rp ');
}

function formatShort(n) {
  const currency = moneyCurrency();
  if (Math.abs(Number(n) || 0) < 1000) return formatRupiah(n);
  return new Intl.NumberFormat(moneyLocale(), {
    style: 'currency', currency, currencyDisplay: 'code', notation: 'compact',
    maximumFractionDigits: Math.min(1, moneyDigits(currency)),
  }).format(Number(n) || 0).replace(/IDR\s*/g, 'Rp ');
}

// These fallbacks keep older exports/test harnesses readable before preferences load.
function moneyCurrency() { return typeof getAccountCurrency === 'function' ? getAccountCurrency() : 'IDR'; }
function moneyLocale() { return typeof getAppLocale === 'function' ? getAppLocale() : 'id-ID'; }
function moneyLanguage() { return typeof getAppLanguage === 'function' ? getAppLanguage() : 'id'; }
function moneyDigits(currency = moneyCurrency()) {
  if (currency === 'IDR') return 0;
  return typeof getCurrencyDigits === 'function' ? getCurrencyDigits(currency)
    : new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
}
function moneyText(id, en) { return moneyLanguage() === 'en' ? en : id; }

// Account currency is a unit, not an exchange-rate setting. Never convert or relabel input.
function moneyCurrencyError(text) {
  const currency = moneyCurrency();
  const raw = String(text || '');
  const known = typeof getSupportedCurrencies === 'function'
    ? getSupportedCurrencies().map(value => typeof value === 'string' ? value : value.code)
    : (typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : ['IDR','USD','SGD','MYR','EUR','GBP','JPY','KWD','AUD','CAD']);
  const commonWords = new Set(['ALL','BAM','CUP','GEL','MAD','TOP','TRY']);
  const codes = raw.match(/\b[A-Za-z]{3}\b/g) || [];
  const explicit = codes.filter(word => known.includes(word.toUpperCase()) && (!commonWords.has(word.toUpperCase()) || word === word.toUpperCase()));
  if (explicit.some(code => code.toUpperCase() !== currency)) return 'currency';
  const symbols = [
    [/\bRp\.?\s*(?=\d)|\bRupiah\b/i, ['IDR']], [/\bRM\s*(?=\d)/i, ['MYR']],
    [/\b(?:US\$|USD\s*\$)/i, ['USD']], [/\bS\$/i, ['SGD']], [/\b(?:A|AU)\$/i, ['AUD']],
    [/\b(?:C|CA)\$/i, ['CAD']], [/\bNZ\$/i, ['NZD']], [/\bHK\$/i, ['HKD']],
    [/\bNT\$/i, ['TWD']], [/\bR\$/i, ['BRL']], [/€/u, ['EUR']], [/£/u, ['GBP']],
    [/₹/u, ['INR']], [/¥/u, ['JPY','CNY']], [/₩/u, ['KRW']], [/₽/u, ['RUB']],
    [/₺/u, ['TRY']], [/₫/u, ['VND']], [/฿/u, ['THB']], [/₱/u, ['PHP']],
    [/₪/u, ['ILS']], [/₦/u, ['NGN']], [/₴/u, ['UAH']], [/\bkr\s*(?=\d)/i, ['NOK','SEK','DKK','ISK']],
  ];
  for (const [pattern, allowed] of symbols) if (pattern.test(raw) && !allowed.includes(currency)) return 'currency';
  const bareDollars = raw.replace(/\b(?:US|S|A|AU|C|CA|NZ|HK|NT|R)\$/gi, '');
  if (bareDollars.includes('$') && !['USD','SGD','AUD','CAD','NZD','HKD','TWD','MXN','ARS','CLP','COP','BND','FJD','GYD','LRD','NAD','SBD','SRD','TTD','BBD','BMD','BSD','BZD','JMD','KYD','XCD'].includes(currency)) return 'currency';
  return null;
}

function parseMoneyNumber(raw, suffix = '', currency = moneyCurrency()) {
  let value = String(raw).replace(/[\u00a0\u202f]/g, ' ').trim();
  if (!/^\d+(?:[.,' ]\d+)*$/.test(value)) return null;
  const digits = moneyDigits(currency);
  const unit = suffix.toLowerCase();
  const multipliers = { rb: 1000, ribu: 1000, k: 1000, thousand: 1000,
    jt: 1000000, juta: 1000000, million: 1000000,
    m: moneyLanguage() === 'en' ? 1000000 : 1000000000,
    miliar: 1000000000, billion: 1000000000, b: 1000000000,
    triliun: 1000000000000, trillion: 1000000000000, t: 1000000000000 };
  if (unit && !multipliers[unit]) return null;
  const grouping = separator => {
    const escaped = separator === '.' ? '\\.' : separator;
    return new RegExp('^\\d{1,3}(?:' + escaped + '\\d{3})+$').test(value);
  };
  if (/[ ']/.test(value)) {
    // Spaces/apostrophes are accepted only as complete groups of three.
    if (!/^\d{1,3}(?:[ ']\d{3})+(?:[.,]\d+)?$/.test(value)) return null;
    value = value.replace(/[ ']/g, '');
  }
  let number;
  if (value.includes('.') && value.includes(',')) {
    const decimal = value.lastIndexOf('.') > value.lastIndexOf(',') ? '.' : ',';
    const group = decimal === '.' ? ',' : '.';
    const split = value.split(decimal);
    if (split.length !== 2 || !new RegExp('^\\d{1,3}(?:' + (group === '.' ? '\\.' : group) + '\\d{3})+$').test(split[0])) return null;
    if (!split[1] || split[1].length > (unit ? 6 : digits)) return null;
    number = Number(split[0].split(group).join('') + '.' + split[1]);
  } else if (/[.,]/.test(value)) {
    const separator = value.includes('.') ? '.' : ',';
    const parts = value.split(separator);
    const decimalLength = parts.length === 2 ? parts[1].length : Infinity;
    const localeDecimal = new Intl.NumberFormat(moneyLocale()).formatToParts(1.1).find(part => part.type === 'decimal')?.value || '.';
    // Abbreviations retain legacy decimal shorthand: 1,5jt / 1.5k.
    if (parts.length === 2 && (unit || separator === localeDecimal) && decimalLength <= (unit ? 6 : digits)) {
      number = Number(parts.join('.'));
    } else if (grouping(separator)) {
      number = Number(parts.join(''));
    } else if (parts.length === 2 && decimalLength <= digits) {
      // A single foreign decimal separator is unambiguous when it cannot be grouping.
      number = Number(parts.join('.'));
    } else return null;
  } else number = Number(value);
  number *= unit ? multipliers[unit] : 1;
  if (!Number.isFinite(number) || number < 0 || number > Number.MAX_SAFE_INTEGER / (10 ** digits)) return null;
  const minor = number * (10 ** digits);
  if (Math.abs(minor - Math.round(minor)) > 0.000001) return null;
  return Math.round(minor) / (10 ** digits);
}

function moneyWithoutDatesAndQuantities(text) {
  return String(text || '')
    .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, ' ')
    .replace(/\b\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\b/g, ' ')
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' ')
    .replace(/\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan\w*|feb\w*|mar\w*|apr\w*|mei|may|jun\w*|jul\w*|aug\w*|ags\w*|agu\w*|sep\w*|oct\w*|okt\w*|nov\w*|dec\w*|des\w*)\s+\d{4}\b/gi, ' ')
    .replace(/\b(?:jan\w*|feb\w*|mar\w*|apr\w*|may|jun\w*|jul\w*|aug\w*|sep\w*|oct\w*|nov\w*|dec\w*)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b/gi, ' ')
    .replace(/\b(?:tanggal|on(?:\s+the)?)\s+\d{1,2}(?:st|nd|rd|th)?\b/gi, ' ')
    .replace(/\b(?:x|qty\s*:?|quantity\s*:?|jumlah\s*:)\s*\d+\b/gi, ' ')
    .replace(/(?<![$\d])\b\d+\s*(?:x|×|pcs|pieces|items|buah|porsi|cups?|coffees?|kopi|teh|eggs?|bottles?)\b/gi, (match, offset, source) => {
      // An explicit money marker makes "$ 2 coffee" an amount, not a quantity.
      const prefix = source.slice(0, offset);
      return /(?:[$€£₹¥₩₽₺₫฿₱₪₦₴]|\b(?:[A-Z]{3}|Rp\.?|RM))\s*$/i.test(prefix) ? match : ' ';
    });
}

function parseAmountDetails(text) {
  if (moneyCurrencyError(text)) return { amount: null, error: 'currency' };
  const cleaned = moneyWithoutDatesAndQuantities(text);
  if (/(?:^|\s|[$€£])[-−]\s*\d|\(\s*\d[\d.,]*\s*\)/.test(cleaned)) return { amount: null, error: 'invalid' };
  const pattern = /(?<![\w.,])\d+(?:[.,'\u00a0\u202f]\d+)*(?: \d{3})*(?:[.,]\d+)?(?:\s*(?:rb|ribu|k|jt|juta|miliar|million|m|thousand|billion|b|triliun|trillion|t)\b)?(?![\w.,])/gi;
  const candidates = [...cleaned.matchAll(pattern)];
  if (!candidates.length) return { amount: null, error: 'missing' };
  if (candidates.length !== 1) return { amount: null, error: 'ambiguous' };
  const raw = candidates[0][0].trim();
  const split = raw.match(/^(.*?)(?:\s*(rb|ribu|k|jt|juta|miliar|million|m|thousand|billion|b|triliun|trillion|t))?$/i);
  const amount = parseMoneyNumber(split[1].trim(), split[2] || '');
  return amount === null ? { amount: null, error: 'invalid' } : { amount, raw, error: null };
}

function parseAmount(text) { return parseAmountDetails(text).amount; }

function parseMoneyInput(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return null;
    const scale = 10 ** moneyDigits();
    const minor = value * scale;
    return Number.isSafeInteger(Math.round(minor)) && Math.abs(minor - Math.round(minor)) < 0.000001 ? Math.round(minor) / scale : null;
  }
  const raw = String(value ?? '').trim();
  if (!raw || moneyCurrencyError(raw)) return null;
  const bare = raw
    .replace(/\b(?:[A-Z]{3}|Rp|RM|Rupiah)\b\.?/gi, '')
    .replace(/(?:US|S|A|AU|C|CA|NZ|HK|NT|R)?\$|[€£₹¥₩₽₺₫฿₱₪₦₴]/g, '')
    .trim();
  const match = bare.match(/^(\d+(?:[.,'\u00a0\u202f ]\d+)*)(?:\s*(rb|ribu|k|jt|juta|miliar|million|m|thousand|billion|b|triliun|trillion|t))?$/i);
  return match ? parseMoneyNumber(match[1], match[2] || '') : null;
}

function formatMoneyInput(value) {
  const amount = parseMoneyInput(value);
  // Keep an incomplete decimal while the user types; validation happens on submit.
  if (amount === null) return String(value ?? '');
  return new Intl.NumberFormat(moneyLocale(), { maximumFractionDigits: moneyDigits() }).format(amount);
}

function roundMoney(value) {
  const scale = 10 ** moneyDigits();
  return Math.round((Number(value) + Number.EPSILON) * scale) / scale;
}

function todayISO() {
  const d = new Date();
  return toISODate(d);
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function parseISO(s) {
  const match = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date(NaN);
  const [y, m, d] = match.slice(1).map(Number);
  const date = new Date(0);
  date.setFullYear(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : new Date(NaN);
}

function formatTanggal(s) {
  const d = parseISO(s);
  if (!Number.isFinite(d.getTime())) return '—';
  return new Intl.DateTimeFormat(moneyLocale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

function getMonthYear(s) {
  const d = parseISO(s);
  return { m: d.getMonth(), y: d.getFullYear() };
}

function daysInMonth(month, year) {
  return new Date(year, month + 1, 0).getDate();
}

function weekOfMonth(d) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  return Math.ceil((d.getDate() + first.getDay()) / 7);
}

function addMonths(m, y, delta) {
  const d = new Date(y, m + delta, 1);
  return { m: d.getMonth(), y: d.getFullYear() };
}

function detectDateFromChat(text) {
  const lower = String(text || '').toLowerCase();
  const today = new Date();
  const iso = lower.match(/\b\d{4}-\d{1,2}-\d{1,2}\b/);
  if (iso) {
    const valid = parseISO(iso[0]);
    return Number.isFinite(valid.getTime()) ? toISODate(valid) : null;
  }
  const slash = lower.match(/\b(\d{1,2})[\/](\d{1,2})[\/](\d{4})\b/);
  if (slash) {
    const month = moneyLanguage() === 'en' ? +slash[1] : +slash[2];
    const day = moneyLanguage() === 'en' ? +slash[2] : +slash[1];
    const valid = parseISO(`${slash[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    return Number.isFinite(valid.getTime()) ? toISODate(valid) : null;
  }
  const monthNames = 'jan\\w*|feb\\w*|mar\\w*|apr\\w*|mei|may|jun\\w*|jul\\w*|aug\\w*|ags\\w*|agu\\w*|sep\\w*|oct\\w*|okt\\w*|nov\\w*|dec\\w*|des\\w*';
  const dayFirst = lower.match(new RegExp('\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(' + monthNames + ')(?:\\s+(\\d{4}))?\\b'));
  const monthFirst = lower.match(new RegExp('\\b(' + monthNames + ')\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b'));
  if (dayFirst || monthFirst) {
    const name = (dayFirst ? dayFirst[2] : monthFirst[1]).slice(0, 3);
    const months = { jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, aug: 8, ags: 8, agu: 8, sep: 9, oct: 10, okt: 10, nov: 11, dec: 12, des: 12 };
    const day = dayFirst ? dayFirst[1] : monthFirst[2];
    const year = (dayFirst ? dayFirst[3] : monthFirst[3]) || today.getFullYear();
    const valid = parseISO(`${year}-${String(months[name]).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    return Number.isFinite(valid.getTime()) ? toISODate(valid) : null;
  }
  if (/\b(kemarin|yesterday)\b/.test(lower)) {
    const d = new Date(today); d.setDate(d.getDate() - 1); return toISODate(d);
  }
  if (/\b(besok|tomorrow)\b/.test(lower)) {
    const d = new Date(today); d.setDate(d.getDate() + 1); return toISODate(d);
  }
  if (/\b(tadi|hari ini|barusan|today|just now)\b/.test(lower)) return toISODate(today);
  const m = lower.match(/\b(?:tanggal|on(?:\s+the)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (m) {
    const valid = parseISO(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`);
    return Number.isFinite(valid.getTime()) ? toISODate(valid) : null;
  }
  return toISODate(today);
}

function pctDelta(now, prev) {
  if (!prev) return now ? 100 : 0;
  return ((now - prev) / Math.abs(prev)) * 100;
}

function uid() {
  return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  el.className = 'toast show ' + type;
  el.style.background = '';
  // Haptic feedback untuk feedback action (native app feel)
  haptic(type === 'error' ? 30 : 10);
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { el.hidden = true; }, 350);
  }, 2500);
}

// Haptic feedback — vibration pulse untuk Android native feel
function haptic(duration = 10) {
  if (navigator.vibrate && /android/i.test(navigator.userAgent)) {
    try { navigator.vibrate(duration); } catch (e) {}
  }
}

// Count-up number animation untuk KPI cards (Instagram-style)
function animateNumber(el, target, format = (v) => v) {
  if (!el) return;
  const startVal = parseFloat(el.dataset.animValue || 0);
  const endVal = target;
  if (startVal === endVal) { el.textContent = format(endVal); return; }
  const duration = 600;
  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = startVal + (endVal - startVal) * eased;
    el.textContent = format(current);
    if (progress < 1) requestAnimationFrame(step);
    else { el.textContent = format(endVal); el.dataset.animValue = endVal; }
  }
  requestAnimationFrame(step);
}

function appHtml(parts, ...values) {
  if (typeof ui === 'function') return ui(parts, ...values);
  return parts.reduce((out, part, index) => out + (index ? String(values[index - 1] ?? '') : '') + part, '');
}
