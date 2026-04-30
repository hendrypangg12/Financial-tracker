// Module: Pelanggan / Customer aggregation + history

// Normalize customer key: lower-case nama (+ phone if ada)
function customerKey(sale) {
  const nama = (sale.pelanggan || 'Anonim').trim().toLowerCase();
  const telp = (sale.pelangganTelepon || '').replace(/\D/g, '');
  return telp ? `${nama}|${telp}` : nama;
}

function aggregateCustomers() {
  const map = new Map();
  for (const sale of (state.sales || [])) {
    const key = customerKey(sale);
    if (!map.has(key)) {
      map.set(key, {
        key,
        nama: sale.pelanggan || 'Anonim',
        telepon: sale.pelangganTelepon || '',
        alamat: sale.pelangganAlamat || '',
        sales: [],
        totalBelanja: 0,
        totalProfit: 0,
        totalOutstanding: 0,
        countTrx: 0,
        countOutstanding: 0,
        lastDate: '',
      });
    }
    const c = map.get(key);
    c.sales.push(sale);
    c.totalBelanja += sale.total || 0;
    c.totalProfit += sale.profit || 0;
    c.countTrx += 1;
    if (sale.metode === 'tempo' && !sale.lunas) {
      c.totalOutstanding += sale.total || 0;
      c.countOutstanding += 1;
    }
    // Update kontak/alamat dengan data terbaru kalau ada
    if (sale.pelangganTelepon && !c.telepon) c.telepon = sale.pelangganTelepon;
    if (sale.pelangganAlamat && !c.alamat) c.alamat = sale.pelangganAlamat;
    if ((sale.tanggal || '') > c.lastDate) c.lastDate = sale.tanggal || '';
  }
  return Array.from(map.values());
}

function renderPelanggan() {
  const search = (document.getElementById('pelanggan-search')?.value || '').toLowerCase().trim();
  const sortBy = document.getElementById('pelanggan-sort')?.value || 'spent';

  let customers = aggregateCustomers();

  // Summary
  const totalOmzet = customers.reduce((s, c) => s + c.totalBelanja, 0);
  const totalTrx = customers.reduce((s, c) => s + c.countTrx, 0);
  const totalOutstanding = customers.reduce((s, c) => s + c.totalOutstanding, 0);
  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setText('cust-total-count', customers.length);
  setText('cust-total-omzet', formatRupiah(totalOmzet));
  setText('cust-total-trx', `${totalTrx} transaksi`);
  setText('cust-total-piutang', formatRupiah(totalOutstanding));

  // Filter search
  if (search) {
    customers = customers.filter(c =>
      c.nama.toLowerCase().includes(search) ||
      (c.telepon || '').toLowerCase().includes(search)
    );
  }

  // Sort
  if (sortBy === 'spent') customers.sort((a, b) => b.totalBelanja - a.totalBelanja);
  else if (sortBy === 'recent') customers.sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''));
  else if (sortBy === 'trx') customers.sort((a, b) => b.countTrx - a.countTrx);
  else if (sortBy === 'nama') customers.sort((a, b) => a.nama.localeCompare(b.nama));

  const tbody = document.getElementById('pelanggan-body');
  const empty = document.getElementById('pelanggan-empty');
  if (!customers.length) {
    tbody.innerHTML = '';
    empty.hidden = false;
    empty.textContent = search ? 'Tidak ditemukan.' : 'Belum ada pelanggan.';
    return;
  }
  empty.hidden = true;

  tbody.innerHTML = customers.map(c => {
    const outstandingCell = c.totalOutstanding > 0
      ? `<span style="color:#dc2626;font-weight:700">${formatRupiah(c.totalOutstanding)}</span>
         <div class="cell-meta">${c.countOutstanding} invoice</div>`
      : `<span style="color:#94a3b8">-</span>`;
    return `
      <tr>
        <td><b>${escapeHtml(c.nama)}</b></td>
        <td>
          ${c.telepon ? `<div>📱 ${escapeHtml(c.telepon)}</div>` : '<span style="color:#94a3b8">-</span>'}
          ${c.alamat ? `<div class="cell-meta">${escapeHtml(c.alamat).slice(0, 40)}${c.alamat.length > 40 ? '…' : ''}</div>` : ''}
        </td>
        <td class="num">${c.countTrx}</td>
        <td class="num"><b>${formatRupiah(c.totalBelanja)}</b></td>
        <td class="num">${outstandingCell}</td>
        <td>${c.lastDate ? formatTanggal(c.lastDate) : '-'}</td>
        <td>
          <button class="btn btn-small btn-primary" data-cust="${escapeHtml(c.key)}">📋 History</button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-cust]').forEach(btn => btn.onclick = () => {
    const c = customers.find(x => x.key === btn.dataset.cust);
    if (c) showCustomerDetail(c);
  });
}

function showCustomerDetail(customer) {
  // Sort transaksi dari terbaru
  const sales = [...customer.sales].sort((a, b) => {
    const ad = (a.tanggal || '') + (a.waktu || '');
    const bd = (b.tanggal || '') + (b.waktu || '');
    return bd.localeCompare(ad);
  });

  const avgTrx = customer.countTrx > 0 ? customer.totalBelanja / customer.countTrx : 0;

  // WA link kalau ada telepon
  const telpClean = (customer.telepon || '').replace(/\D/g, '');
  const waNumber = telpClean.startsWith('0') ? '62' + telpClean.slice(1) : telpClean;
  const waLink = waNumber
    ? `<a href="https://wa.me/${waNumber}" target="_blank" class="btn btn-small" style="background:#25d366;color:#fff;border-color:#1da851">💬 Chat WA</a>`
    : '';

  const html = `
    <div class="cust-detail-head">
      <div class="cust-avatar">${escapeHtml((customer.nama || '?').charAt(0).toUpperCase())}</div>
      <div class="cust-info">
        <h2>${escapeHtml(customer.nama)}</h2>
        ${customer.telepon ? `<div class="cust-meta">📱 ${escapeHtml(customer.telepon)}</div>` : ''}
        ${customer.alamat ? `<div class="cust-meta">📍 ${escapeHtml(customer.alamat)}</div>` : ''}
        <div class="cust-actions">${waLink}</div>
      </div>
    </div>

    <div class="cust-stats">
      <div class="cstat"><div class="cstat-label">Total Transaksi</div><div class="cstat-value">${customer.countTrx}</div></div>
      <div class="cstat"><div class="cstat-label">Total Belanja</div><div class="cstat-value">${formatRupiah(customer.totalBelanja)}</div></div>
      <div class="cstat"><div class="cstat-label">Rata-rata / Trx</div><div class="cstat-value">${formatRupiah(avgTrx)}</div></div>
      <div class="cstat ${customer.totalOutstanding > 0 ? 'cstat-warn' : ''}">
        <div class="cstat-label">Outstanding</div>
        <div class="cstat-value">${formatRupiah(customer.totalOutstanding)}</div>
      </div>
    </div>

    <h3 style="margin:16px 0 8px">📋 Riwayat Pembelian</h3>
    <div class="cust-history">
      ${sales.map(s => buildHistoryCard(s)).join('')}
    </div>
  `;

  document.getElementById('customer-detail-content').innerHTML = html;
  openModal('modal-customer-detail');

  // Bind invoice buttons
  document.querySelectorAll('[data-inv-id]').forEach(btn => btn.onclick = () => {
    const sale = state.sales.find(x => x.id === btn.dataset.invId);
    if (sale && typeof showInvoiceA4 === 'function') showInvoiceA4(sale);
  });
}

function buildHistoryCard(sale) {
  const isTempo = sale.metode === 'tempo';
  const isLunas = !isTempo || sale.lunas;
  let statusBadge;
  if (isLunas) statusBadge = `<span class="badge badge-success">✓ Lunas</span>`;
  else if (isOverdue(sale)) statusBadge = `<span class="badge badge-danger">⚠️ Overdue</span>`;
  else statusBadge = `<span class="badge badge-warn">⏱️ Tempo</span>`;

  const itemsList = (sale.items || []).map(it => {
    const satuan = it.satuan || (typeof lookupSatuan === 'function' ? lookupSatuan(it.productId) : '') || 'pcs';
    return `<li>${escapeHtml(it.nama)} <span style="color:#64748b">— ${it.qty} ${escapeHtml(satuan)} × ${formatRupiah(it.hargaJual)}</span></li>`;
  }).join('');

  return `
    <div class="hist-card">
      <div class="hist-head">
        <div>
          <b>${escapeHtml(sale.nomor || '-')}</b>
          <span class="cell-meta">${formatTanggal(sale.tanggal)} ${sale.waktu || ''}</span>
        </div>
        <div class="hist-status">
          ${statusBadge}
          <span class="badge badge-info">${(sale.metode || 'tunai').toUpperCase()}</span>
        </div>
      </div>
      <ul class="hist-items">${itemsList}</ul>
      <div class="hist-foot">
        <div>
          ${sale.diskon > 0 ? `<span class="cell-meta">Diskon -${formatRupiah(sale.diskon)}</span>` : ''}
          ${isTempo && sale.jatuhTempo ? `<span class="cell-meta">Jth tempo: ${formatTanggal(sale.jatuhTempo)}</span>` : ''}
        </div>
        <div class="hist-total">
          <b>${formatRupiah(sale.total)}</b>
          <button class="btn btn-small" data-inv-id="${sale.id}">📄 Invoice</button>
        </div>
      </div>
    </div>
  `;
}

function setupPelangganFilter() {
  const search = document.getElementById('pelanggan-search');
  const sort = document.getElementById('pelanggan-sort');
  if (search) search.oninput = renderPelanggan;
  if (sort) sort.onchange = renderPelanggan;
}
