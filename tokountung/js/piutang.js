// Module: Piutang / Tempo Tracker

function getTempoSales() {
  return (state.sales || []).filter(s => s.metode === 'tempo');
}

function isOverdue(sale) {
  if (sale.lunas) return false;
  if (!sale.jatuhTempo) return false;
  const due = new Date(sale.jatuhTempo + 'T23:59:59');
  return Date.now() > due.getTime();
}

function daysToDue(sale) {
  if (!sale.jatuhTempo) return null;
  const due = new Date(sale.jatuhTempo + 'T23:59:59');
  const ms = due.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function renderPiutang() {
  const filter = document.getElementById('piutang-filter')?.value || 'belum';
  const tempoSales = getTempoSales();

  // Summary
  const belum = tempoSales.filter(s => !s.lunas);
  const overdue = belum.filter(s => isOverdue(s));
  const lunas = tempoSales.filter(s => s.lunas);

  const sumBelum = belum.reduce((s, x) => s + (x.total || 0), 0);
  const sumOverdue = overdue.reduce((s, x) => s + (x.total || 0), 0);
  const sumLunas = lunas.reduce((s, x) => s + (x.total || 0), 0);

  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('psum-belum', formatRupiah(sumBelum));
  setText('psum-belum-count', `${belum.length} invoice`);
  setText('psum-overdue', formatRupiah(sumOverdue));
  setText('psum-overdue-count', `${overdue.length} invoice`);
  setText('psum-lunas', formatRupiah(sumLunas));
  setText('psum-lunas-count', `${lunas.length} invoice`);

  // Filter list
  let list;
  if (filter === 'belum') list = belum;
  else if (filter === 'overdue') list = overdue;
  else if (filter === 'lunas') list = lunas;
  else list = tempoSales;

  // Sort: overdue dulu, lalu jatuh tempo terdekat, lalu tanggal jual terbaru
  list.sort((a, b) => {
    const aOver = isOverdue(a) ? 0 : 1;
    const bOver = isOverdue(b) ? 0 : 1;
    if (aOver !== bOver) return aOver - bOver;
    const ad = a.jatuhTempo || '9999-12-31';
    const bd = b.jatuhTempo || '9999-12-31';
    if (ad !== bd) return ad.localeCompare(bd);
    return (b.tanggal || '').localeCompare(a.tanggal || '');
  });

  const tbody = document.getElementById('piutang-body');
  const empty = document.getElementById('piutang-empty');
  if (!list.length) {
    tbody.innerHTML = '';
    empty.hidden = false;
    empty.textContent = filter === 'lunas'
      ? 'Belum ada tempo yang sudah lunas.'
      : (filter === 'overdue' ? '🎉 Tidak ada yang lewat jatuh tempo.' : 'Belum ada transaksi tempo.');
    return;
  }
  empty.hidden = true;

  tbody.innerHTML = list.map(s => {
    const days = daysToDue(s);
    let statusBadge;
    if (s.lunas) {
      statusBadge = `<span class="badge badge-success">✓ Lunas</span>`;
    } else if (isOverdue(s)) {
      statusBadge = `<span class="badge badge-danger">⚠️ Lewat ${Math.abs(days)} hari</span>`;
    } else if (days !== null && days <= 3) {
      statusBadge = `<span class="badge badge-warn">⏱️ ${days} hari lagi</span>`;
    } else if (days !== null) {
      statusBadge = `<span class="badge badge-info">${days} hari lagi</span>`;
    } else {
      statusBadge = `<span class="badge badge-warn">⏱️ Tempo</span>`;
    }

    const actionBtn = s.lunas
      ? `<button class="btn btn-small" data-act="unpaid" data-id="${s.id}" title="Tandai belum lunas">↩️ Belum Lunas</button>`
      : `<button class="btn btn-small btn-success" data-act="paid" data-id="${s.id}" title="Tandai sudah lunas">✓ Tandai Lunas</button>`;

    return `
      <tr ${isOverdue(s) ? 'class="row-overdue"' : ''}>
        <td><b>${escapeHtml(s.nomor || '-')}</b></td>
        <td>
          ${escapeHtml(s.pelanggan || 'Anonim')}
          ${s.pelangganTelepon ? `<div class="cell-meta">${escapeHtml(s.pelangganTelepon)}</div>` : ''}
        </td>
        <td>${formatTanggal(s.tanggal)}</td>
        <td>${s.jatuhTempo ? formatTanggal(s.jatuhTempo) : '-'}</td>
        <td class="num"><b>${formatRupiah(s.total || 0)}</b></td>
        <td>${statusBadge}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-small" data-act="invoice" data-id="${s.id}" title="Lihat invoice">📄</button>
            ${actionBtn}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-act]').forEach(btn => btn.onclick = () => {
    const id = btn.dataset.id;
    const act = btn.dataset.act;
    const sale = state.sales.find(x => x.id === id);
    if (!sale) return;

    if (act === 'paid') {
      if (!confirm(`Tandai invoice ${sale.nomor} (${formatRupiah(sale.total)}) sebagai LUNAS?`)) return;
      markSaleLunas(id);
      showToast(`✓ ${sale.nomor} ditandai LUNAS`, 'success');
      renderPiutang();
      renderDashboard();
    } else if (act === 'unpaid') {
      if (!confirm(`Batalkan status lunas untuk ${sale.nomor}?`)) return;
      markSaleBelumLunas(id);
      showToast(`↩️ ${sale.nomor} dikembalikan ke status belum lunas`, 'info');
      renderPiutang();
      renderDashboard();
    } else if (act === 'invoice') {
      if (typeof showInvoiceA4 === 'function') showInvoiceA4(sale);
    }
  });
}

function setupPiutangFilter() {
  const sel = document.getElementById('piutang-filter');
  if (sel) sel.onchange = renderPiutang;
}
