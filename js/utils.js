// Format & parser utilitas
function formatRupiah(n) {
  n = Math.round(Number(n) || 0);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return sign + 'Rp ' + abs;
}

function formatShort(n) {
  n = Number(n) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) return sign + 'Rp' + (abs / 1_000_000_000_000).toFixed(1) + 't';   // triliun
  if (abs >= 1_000_000_000)     return sign + 'Rp' + (abs / 1_000_000_000).toFixed(1) + 'mlr';     // miliar
  if (abs >= 1_000_000)         return sign + 'Rp' + (abs / 1_000_000).toFixed(1) + 'jt';          // juta
  if (abs >= 1_000)             return sign + 'Rp' + Math.round(abs / 1_000) + 'rb';                // ribu
  return sign + 'Rp' + abs;
}

function parseAmount(text) {
  const t = String(text).toLowerCase().replace(/rp\.?/g, ' ');
  const re = /(\d+(?:[.,]\d+)*)\s*(rb|ribu|k|jt|juta|m|miliar)?/gi;
  let m, last = null;
  while ((m = re.exec(t)) !== null) {
    let numStr = m[1];
    const suffix = (m[2] || '').toLowerCase();
    let num;
    if (numStr.includes('.') || numStr.includes(',')) {
      if (suffix) {
        // Dengan suffix: separator dianggap desimal
        numStr = numStr.replace(',', '.');
        const parts = numStr.split('.');
        if (parts.length === 2 && parts[1].length <= 2) num = parseFloat(numStr);
        else num = parseInt(numStr.replace(/[.,]/g, ''), 10);
      } else {
        // Tanpa suffix: separator = ribuan
        num = parseInt(numStr.replace(/[.,]/g, ''), 10);
      }
    } else {
      num = parseInt(numStr, 10);
    }
    if (isNaN(num)) continue;
    if (suffix === 'rb' || suffix === 'ribu' || suffix === 'k') num *= 1000;
    else if (suffix === 'jt' || suffix === 'juta') num *= 1000000;
    else if (suffix === 'm' || suffix === 'miliar') num *= 1000000000;
    last = num;
  }
  return last;
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
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatTanggal(s) {
  const d = parseISO(s);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
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
  const lower = text.toLowerCase();
  const today = new Date();
  if (/\bkemarin\b/.test(lower)) {
    const d = new Date(today); d.setDate(d.getDate() - 1); return toISODate(d);
  }
  if (/\b(tadi|hari ini|barusan)\b/.test(lower)) return toISODate(today);
  const m = lower.match(/\btanggal\s+(\d{1,2})\b/);
  if (m) {
    const d = new Date(today.getFullYear(), today.getMonth(), parseInt(m[1], 10));
    return toISODate(d);
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
