// Module: Hutang & Piutang Personal (BerUang)

function renderHutang() {
  const filterJenis = document.getElementById('hutang-filter-jenis')?.value || 'all';
  const filterStatus = document.getElementById('hutang-filter-status')?.value || 'aktif';

  const all = state.hutangs || [];

  // Summary calculations (semua data)
  const piutangs = all.filter(h => h.jenis === 'piutang' && !h.lunas);
  const hutangs = all.filter(h => h.jenis === 'hutang' && !h.lunas);
  const totalPiutang = piutangs.reduce((s, h) => s + (h.nominal || 0), 0);
  const totalHutang = hutangs.reduce((s, h) => s + (h.nominal || 0), 0);
  const net = totalPiutang - totalHutang;

  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('hsum-piutang', formatRupiah(totalPiutang));
  setText('hsum-piutang-count', `${piutangs.length} ${piutangs.length === 1 ? 'orang' : 'orang'} berhutang ke saya`);
  setText('hsum-hutang', formatRupiah(totalHutang));
  setText('hsum-hutang-count', `${hutangs.length} ${hutangs.length === 1 ? 'orang' : 'orang'} saya berhutang`);
  setText('hsum-net', (net >= 0 ? '+' : '') + formatRupiah(net));
  const netEl = document.getElementById('hsum-net');
  if (netEl) netEl.style.color = net > 0 ? '#10b981' : (net < 0 ? '#ef4444' : '');

  // Filter list
  let list = [...all];
  if (filterJenis !== 'all') list = list.filter(h => h.jenis === filterJenis);
  if (filterStatus === 'aktif') list = list.filter(h => !h.lunas);
  else if (filterStatus === 'overdue') list = list.filter(h => isHutangOverdue(h));
  else if (filterStatus === 'lunas') list = list.filter(h => h.lunas);

  // Sort: overdue dulu, jatuh tempo terdekat, terakhir tanggal catat
  list.sort((a, b) => {
    const aOver = isHutangOverdue(a) ? 0 : 1;
    const bOver = isHutangOverdue(b) ? 0 : 1;
    if (aOver !== bOver) return aOver - bOver;
    const ad = a.jatuhTempo || '9999-12-31';
    const bd = b.jatuhTempo || '9999-12-31';
    if (ad !== bd) return ad.localeCompare(bd);
    return (b.tanggalCatat || '').localeCompare(a.tanggalCatat || '');
  });

  const wrap = document.getElementById('hutang-list');
  const empty = document.getElementById('hutang-empty');
  if (!list.length) {
    wrap.innerHTML = '';
    empty.hidden = false;
    empty.textContent = filterStatus === 'lunas'
      ? 'Belum ada yang lunas.'
      : (filterStatus === 'overdue' ? '🎉 Tidak ada yang lewat jatuh tempo.' : 'Belum ada catatan hutang/piutang. Klik "+ Tambah" untuk mulai.');
    return;
  }
  empty.hidden = true;

  wrap.innerHTML = list.map(h => {
    const days = hutangDaysToDue(h);
    const overdue = isHutangOverdue(h);
    const isPiutang = h.jenis === 'piutang';

    let statusBadge;
    if (h.lunas) statusBadge = `<span class="hbadge hbadge-success">✓ Lunas</span>`;
    else if (overdue) statusBadge = `<span class="hbadge hbadge-danger">⚠️ Lewat ${Math.abs(days)} hari</span>`;
    else if (days !== null && days <= 3) statusBadge = `<span class="hbadge hbadge-warn">⏱️ ${days} hari lagi</span>`;
    else if (days !== null) statusBadge = `<span class="hbadge hbadge-info">${days} hari lagi</span>`;
    else statusBadge = `<span class="hbadge hbadge-neutral">⏱️ Aktif</span>`;

    const arrow = isPiutang ? '↗' : '↙';
    const arrowColor = isPiutang ? '#10b981' : '#ef4444';
    const jenisLabel = isPiutang ? 'Piutang' : 'Hutang';
    const jenisBg = isPiutang ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)';
    const jenisColor = isPiutang ? '#10b981' : '#ef4444';

    return `
      <div class="hutang-card ${overdue ? 'hutang-overdue' : ''} ${h.lunas ? 'hutang-lunas' : ''}">
        <div class="hutang-card-head">
          <div class="hutang-arrow" style="color:${arrowColor}">${arrow}</div>
          <div class="hutang-info">
            <div class="hutang-nama">${escapeHtml(h.nama)}</div>
            <div class="hutang-jenis-row">
              <span class="hutang-jenis" style="background:${jenisBg}; color:${jenisColor}">${jenisLabel}</span>
              ${statusBadge}
            </div>
          </div>
          <div class="hutang-nominal">${formatRupiah(h.nominal)}</div>
        </div>
        <div class="hutang-card-body">
          ${h.jatuhTempo ? `<div class="hutang-meta">📅 Jatuh tempo: <b>${formatTanggal(h.jatuhTempo)}</b></div>` : ''}
          ${h.catatan ? `<div class="hutang-meta">📝 ${escapeHtml(h.catatan)}</div>` : ''}
          ${h.lunas && h.tanggalLunas ? `<div class="hutang-meta">✓ Lunas pada: <b>${formatTanggal(h.tanggalLunas)}</b></div>` : ''}
        </div>
        <div class="hutang-card-actions">
          ${!h.lunas
            ? `<button class="btn btn-small btn-success" data-act="lunas" data-id="${h.id}">✓ Tandai Lunas</button>`
            : `<button class="btn btn-small btn-ghost" data-act="unpaid" data-id="${h.id}">↩️ Batal Lunas</button>`}
          <button class="btn btn-small btn-ghost" data-act="edit" data-id="${h.id}">✏️ Edit</button>
          <button class="btn btn-small btn-danger" data-act="del" data-id="${h.id}">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  wrap.querySelectorAll('[data-act]').forEach(btn => btn.onclick = () => {
    const id = btn.dataset.id;
    const h = state.hutangs.find(x => x.id === id);
    if (!h) return;
    const act = btn.dataset.act;
    if (act === 'lunas') {
      if (!confirm(`Tandai "${h.nama}" (${formatRupiah(h.nominal)}) sebagai LUNAS?`)) return;
      markHutangLunas(id);
      renderHutang();
    } else if (act === 'unpaid') {
      markHutangBelumLunas(id);
      renderHutang();
    } else if (act === 'edit') {
      openHutangModal(h);
    } else if (act === 'del') {
      if (!confirm(`Hapus catatan "${h.nama}" (${formatRupiah(h.nominal)})?`)) return;
      deleteHutang(id);
      renderHutang();
    }
  });
}

function openHutangModal(h) {
  const form = document.getElementById('form-hutang');
  form.reset();
  document.getElementById('modal-hutang-title').textContent = h
    ? '✏️ Edit Hutang/Piutang'
    : '💸 Tambah Hutang/Piutang';
  if (h) {
    form.querySelector('[name="id"]').value = h.id;
    form.querySelector('[name="jenis"]').value = h.jenis;
    form.querySelector('[name="nama"]').value = h.nama || '';
    form.querySelector('[name="nominal"]').value = h.nominal || '';
    form.querySelector('[name="jatuhTempo"]').value = h.jatuhTempo || '';
    form.querySelector('[name="catatan"]').value = h.catatan || '';
  }
  const modal = document.getElementById('modal-hutang');
  modal.hidden = false;
  modal.style.display = 'grid';
}

function closeHutangModal() {
  const modal = document.getElementById('modal-hutang');
  modal.hidden = true;
  modal.style.display = 'none';
}

function setupHutangForm() {
  const btn = document.getElementById('btn-add-hutang');
  if (btn) btn.onclick = () => openHutangModal(null);

  const form = document.getElementById('form-hutang');
  if (form) form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const id = fd.get('id');
    const data = {
      jenis: fd.get('jenis'),
      nama: (fd.get('nama') || '').trim(),
      nominal: +fd.get('nominal') || 0,
      jatuhTempo: fd.get('jatuhTempo') || '',
      catatan: (fd.get('catatan') || '').trim(),
    };
    if (!data.nama || data.nominal <= 0) {
      alert('Nama dan nominal wajib diisi');
      return;
    }
    if (id) {
      updateHutang(id, data);
    } else {
      addHutang(data);
    }
    closeHutangModal();
    renderHutang();
  };

  // Filter handlers
  ['hutang-filter-jenis', 'hutang-filter-status'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.onchange = renderHutang;
  });
}
