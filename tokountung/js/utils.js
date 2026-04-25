// Format & helper utilities
function formatRupiah(n) {
  n = Math.round(Number(n) || 0);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return sign + 'Rp ' + abs;
}

function formatShort(n) {
  n = Number(n) || 0;
  const a = Math.abs(n);
  if (a >= 1_000_000_000) return 'Rp' + (n/1_000_000_000).toFixed(1) + 'mlr';
  if (a >= 1_000_000) return 'Rp' + (n/1_000_000).toFixed(1) + 'jt';
  if (a >= 1_000) return 'Rp' + Math.round(n/1_000) + 'rb';
  return 'Rp' + n;
}

function formatNumber(n) {
  return Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function todayISO() { return toISODate(new Date()); }
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function parseISO(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
function formatTanggal(s) {
  const d = parseISO(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function formatTanggalLong(s) {
  const d = parseISO(s);
  return `${HARI[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function nowTime() {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}

function startOfWeek(d) { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); return x; }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfYear(d) { return new Date(d.getFullYear(), 0, 1); }

function uid(prefix = 'id') {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function nextInvoiceNumber(sales) {
  const today = todayISO().replace(/-/g, '');
  const todaySales = sales.filter(s => s.tanggal && s.tanggal.replace(/-/g, '').startsWith(today.slice(0,8)));
  const num = todaySales.length + 1;
  return `INV-${today.slice(2,8)}-${String(num).padStart(3, '0')}`;
}

// Margin calculator
function calcMargin(hargaModal, hargaJual) {
  if (!hargaJual || hargaJual <= 0) return 0;
  return (hargaJual - hargaModal) / hargaJual * 100;
}
function calcMarkup(hargaModal, hargaJual) {
  if (!hargaModal || hargaModal <= 0) return 0;
  return (hargaJual - hargaModal) / hargaModal * 100;
}
function calcProfit(hargaModal, hargaJual, qty) {
  return (hargaJual - hargaModal) * qty;
}

function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast ' + type;
  el.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.hidden = true; }, 2500);
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.hidden = false;
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.hidden = true;
}
