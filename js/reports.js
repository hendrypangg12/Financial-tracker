// Laporan keuangan siap bagikan. Data asli tetap positif; tanda minus hanya presentasi.
(function () {
  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const signedMoney = (amount, expense) => `${expense ? '\u2212' : ''}${formatRupiah(Math.abs(Number(amount) || 0))}`;

  function reportData(scope) {
    let transactions = [...(state.transactions || [])];
    let label = 'Akumulasi Semua Data';
    if (scope === 'month') {
      transactions = transactions.filter(t => {
        const d = parseISO(t.tanggal);
        return d.getMonth() === state.selectedMonth && d.getFullYear() === state.selectedYear;
      });
      label = `${MONTHS[state.selectedMonth]} ${state.selectedYear}`;
    }
    transactions.sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)));
    const income = transactions.filter(t => t.jenis === 'pemasukan').reduce((s, t) => s + (Number(t.jumlah) || 0), 0);
    const expense = transactions.filter(t => t.jenis === 'pengeluaran').reduce((s, t) => s + (Number(t.jumlah) || 0), 0);
    return { label, transactions, income, expense, net: income - expense };
  }

  function selectedScope() {
    return document.querySelector('input[name="report-scope"]:checked')?.value || 'month';
  }

  function updatePreview() {
    const el = document.getElementById('report-preview');
    if (!el) return;
    const r = reportData(selectedScope());
    el.innerHTML = `<strong>${esc(r.label)}</strong><div class="report-preview-grid" style="margin-top:10px">
      <div class="report-preview-item"><small>Pemasukan</small><b class="money-income">${formatRupiah(r.income)}</b></div>
      <div class="report-preview-item"><small>Pengeluaran</small><b class="money-expense">${signedMoney(r.expense, true)}</b></div>
      <div class="report-preview-item"><small>Saldo bersih</small><b class="${r.net >= 0 ? 'money-income' : 'money-expense'}">${signedMoney(r.net, r.net < 0)}</b></div>
    </div><small style="display:block;margin-top:9px">${r.transactions.length} transaksi</small>`;
  }

  function filename(r, ext) {
    return `BerUang-Laporan-${r.label.replace(/\s+/g, '-')}.${ext}`;
  }

  function reportRows(r) {
    return r.transactions.map(t => `<tr><td>${esc(formatTanggal(t.tanggal))}</td><td>${esc(t.deskripsi || '-')}</td><td>${esc(t.kategori || '-')}</td><td>${esc(t.subKategori || '-')}</td><td>${esc(t.jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran')}</td><td class="${t.jenis === 'pemasukan' ? 'income' : 'expense'}">${signedMoney(t.jumlah, t.jenis === 'pengeluaran')}</td></tr>`).join('');
  }

  function exportPdf() {
    const r = reportData(selectedScope());
    const popup = window.open('', '_blank');
    if (!popup) { showToast('Izinkan pop-up untuk membuat PDF', 'error'); return; }
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(filename(r, 'pdf'))}</title><style>
      body{font:13px Arial,sans-serif;color:#2f2118;margin:28px}h1{margin:0 0 4px}.meta{color:#766658;margin-bottom:18px}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.box{border:1px solid #ddd;padding:12px;border-radius:8px}.box small{display:block;color:#777;margin-bottom:6px}.income{color:#2f7d32}.expense{color:#c0392b}table{width:100%;border-collapse:collapse}th,td{padding:8px 6px;border-bottom:1px solid #ddd;text-align:left}th:last-child,td:last-child{text-align:right}@media print{body{margin:12mm}.no-print{display:none}}
    </style></head><body><h1>BerUang</h1><div class="meta">Laporan Keuangan · ${esc(r.label)} · dibuat ${esc(new Date().toLocaleString('id-ID'))}</div>
    <div class="summary"><div class="box"><small>Pemasukan</small><b class="income">${formatRupiah(r.income)}</b></div><div class="box"><small>Pengeluaran</small><b class="expense">${signedMoney(r.expense,true)}</b></div><div class="box"><small>Saldo bersih</small><b class="${r.net >= 0 ? 'income' : 'expense'}">${signedMoney(r.net,r.net < 0)}</b></div></div>
    <table><thead><tr><th>Tanggal</th><th>Deskripsi</th><th>Kategori</th><th>Subkategori</th><th>Jenis</th><th>Nominal</th></tr></thead><tbody>${reportRows(r) || '<tr><td colspan="6">Belum ada transaksi</td></tr>'}</tbody></table>
    <script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    popup.document.close();
  }

  function exportExcel() {
    const r = reportData(selectedScope());
    const rows = [['Laporan BerUang', r.label], [], ['Ringkasan', 'Nominal'], ['Pemasukan', r.income], ['Pengeluaran', -r.expense], ['Saldo bersih', r.net], [], ['Tanggal','Deskripsi','Kategori','Subkategori','Jenis','Nominal']];
    r.transactions.forEach(t => rows.push([t.tanggal, t.deskripsi || '', t.kategori || '', t.subKategori || '', t.jenis, t.jenis === 'pengeluaran' ? -(Number(t.jumlah)||0) : (Number(t.jumlah)||0)]));
    const csv = '\ufeff' + rows.map(row => row.map(value => `"${String(value == null ? '' : value).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    downloadBlob(new Blob([csv], {type:'text/csv;charset=utf-8'}), filename(r, 'csv'));
  }

  function exportImage() {
    const r = reportData(selectedScope());
    const shown = r.transactions.slice(-20);
    const width = 1080, rowH = 54, height = 430 + shown.length * rowH + (r.transactions.length > 20 ? 55 : 0);
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const c = canvas.getContext('2d'); c.fillStyle = '#fbf7ef'; c.fillRect(0,0,width,height);
    c.fillStyle='#3e2d21'; c.font='bold 46px Arial'; c.fillText('BerUang',60,72); c.font='26px Arial'; c.fillStyle='#806d5c'; c.fillText(`Laporan Keuangan · ${r.label}`,60,112);
    const cards = [[r.income,'Pemasukan','#2f7d32',false],[r.expense,'Pengeluaran','#c0392b',true],[r.net,'Saldo bersih',r.net>=0?'#2f7d32':'#c0392b',r.net<0]];
    cards.forEach((x,i)=>{const left=60+i*330;c.fillStyle='#fff';c.fillRect(left,150,300,120);c.fillStyle='#806d5c';c.font='20px Arial';c.fillText(x[1],left+18,185);c.fillStyle=x[2];c.font='bold 28px Arial';c.fillText(signedMoney(x[0],x[3]),left+18,232);});
    c.fillStyle='#3e2d21'; c.font='bold 24px Arial'; c.fillText(`Detail transaksi (${r.transactions.length})`,60,325);
    let y=370; shown.forEach(t=>{c.fillStyle='#806d5c';c.font='18px Arial';c.fillText(formatTanggal(t.tanggal),60,y);c.fillStyle='#3e2d21';c.fillText(String(t.deskripsi||'-').slice(0,42),245,y);c.textAlign='right';c.fillStyle=t.jenis==='pemasukan'?'#2f7d32':'#c0392b';c.font='bold 19px Arial';c.fillText(signedMoney(t.jumlah,t.jenis==='pengeluaran'),1020,y);c.textAlign='left';c.strokeStyle='#e7dccb';c.beginPath();c.moveTo(60,y+18);c.lineTo(1020,y+18);c.stroke();y+=rowH;});
    if(r.transactions.length>20){c.fillStyle='#806d5c';c.font='18px Arial';c.fillText(`Menampilkan 20 transaksi terbaru. Detail lengkap tersedia di PDF/Excel.`,60,y+10);}
    canvas.toBlob(async blob => {
      const name = filename(r,'png');
      const file = new File([blob], name, {type:'image/png'});
      if (navigator.share && navigator.canShare?.({files:[file]})) { try { await navigator.share({title:`Laporan BerUang ${r.label}`,files:[file]}); return; } catch(e) { if(e.name==='AbortError') return; } }
      downloadBlob(blob,name);
    }, 'image/png');
  }

  function downloadBlob(blob, name) {
    const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  window.setupReportSharing = function () {
    const button=document.getElementById('btn-share-report'), modal=document.getElementById('modal-report');
    if (!button || !modal || button.dataset.bound) return;
    button.dataset.bound='1';
    button.onclick=()=>{
      if(typeof isPro==='function' && !isPro(currentProfile)){showProGate('Bagikan Laporan','Unduh rekap bulanan atau akumulasi sebagai PDF, gambar, dan Excel.\n\nFitur laporan hanya untuk paket Pro.');return;}
      updatePreview(); modal.hidden=false;
    };
    document.getElementById('report-modal-close').onclick=()=>{modal.hidden=true;};
    modal.onclick=e=>{if(e.target===modal)modal.hidden=true;};
    modal.querySelectorAll('input[name="report-scope"]').forEach(el=>el.onchange=updatePreview);
    document.getElementById('report-pdf').onclick=exportPdf;
    document.getElementById('report-image').onclick=exportImage;
    document.getElementById('report-excel').onclick=exportExcel;
  };
})();
