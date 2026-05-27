// Tagihan rutin + Pengingat (#2 & #3)
// - Tagihan rutin (kost/cicilan/langganan): template di state.recurring[]
// - Dashboard "🔔 Pengingat": tagihan rutin yg belum dicatat bulan ini (1-tap Catat)
//   + hutang/piutang yang jatuh tempo / lewat tempo.

function curYM() { return new Date().toISOString().slice(0, 7); }

// Catat 1 tagihan rutin sebagai pengeluaran bulan ini (di-tag biar gak dobel)
function postRecurring(id) {
  const r = (state.recurring || []).find(x => x.id === id);
  if (!r) return;
  if (recurringPostedThisMonth(r.id)) return;
  addTransaction({
    jenis: 'pengeluaran',
    jumlah: Number(r.jumlah) || 0,
    kategori: r.kategori || 'Tagihan Rutin',
    subKategori: r.subKategori || r.nama || 'Tagihan',
    alokasi: r.alokasi || 'Kebutuhan',
    tanggal: todayISO(),
    deskripsi: r.nama || 'Tagihan rutin',
    recurringId: r.id,
    recurringMonth: curYM(),
  });
  if (typeof showToast === 'function') showToast(`"${r.nama}" tercatat ✓`, 'success');
  if (typeof renderAll === 'function') renderAll();
}

// Kartu Pengingat di dashboard
function renderReminder() {
  const el = document.getElementById('dash-reminder');
  if (!el) return;
  const items = [];

  // 1) Tagihan rutin yang belum dicatat bulan ini
  (state.recurring || []).forEach(r => {
    if (!recurringPostedThisMonth(r.id)) {
      items.push(`
        <li style="display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line);">
          <span style="font-size:16px;">🔁</span>
          <span style="flex:1;min-width:0;">
            <span style="display:block;color:#1f1b16;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtmlRec(r.nama)}</span>
            <span style="font-size:11px;color:var(--ink-soft);">Tagihan rutin · ${formatRupiah(Number(r.jumlah) || 0)}</span>
          </span>
          <button class="rec-post" data-id="${r.id}" style="flex:0 0 auto;border:none;background:#221a12;color:#fff;font-weight:700;font-size:12px;padding:8px 12px;border-radius:9px;cursor:pointer;">✓ Catat</button>
        </li>`);
    }
  });

  // 2) Hutang/piutang jatuh tempo (≤7 hari) atau lewat tempo
  (state.hutangs || []).forEach(h => {
    if (h.lunas || !h.jatuhTempo) return;
    const days = (typeof hutangDaysToDue === 'function') ? hutangDaysToDue(h) : null;
    if (days === null || days > 7) return;
    const isPiutang = h.jenis === 'piutang';
    const subj = isPiutang ? `Piutang dari ${h.nama}` : `Utang ke ${h.nama}`;
    let when, color;
    if (days < 0) { when = `lewat ${Math.abs(days)} hari`; color = '#c0392b'; }
    else if (days === 0) { when = 'jatuh tempo HARI INI'; color = '#c0392b'; }
    else { when = `jatuh tempo ${days} hari lagi`; color = '#b08a3c'; }
    items.push(`
      <li style="display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line);">
        <span style="font-size:16px;">⏰</span>
        <span style="flex:1;min-width:0;">
          <span style="display:block;color:#1f1b16;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtmlRec(subj)} · ${formatRupiah(Number(h.nominal) || 0)}</span>
          <span style="font-size:11px;color:${color};font-weight:600;">${when}</span>
        </span>
        <button class="rec-gohutang" style="flex:0 0 auto;border:1px solid var(--line);background:#fff;color:#8b5a2b;font-weight:700;font-size:12px;padding:8px 12px;border-radius:9px;cursor:pointer;">Lihat</button>
      </li>`);
  });

  if (!items.length) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>🔔 Pengingat</h3><span style="font-size:11px;color:var(--ink-soft);">${items.length} hal perlu perhatian</span></div>
      <ul style="list-style:none;padding:0;margin:2px 0 0;">${items.join('')}</ul>
    </div>`;
  el.querySelectorAll('.rec-post').forEach(b => { b.onclick = () => postRecurring(b.dataset.id); });
  el.querySelectorAll('.rec-gohutang').forEach(b => {
    b.onclick = () => {
      const tab = document.querySelector('.tab[data-tab="hutang"], .bnav-item[data-tab="hutang"]');
      if (tab) tab.click();
    };
  });
}

// Daftar kelola tagihan rutin (di tab Tambah)
function renderRecurringManager() {
  const el = document.getElementById('recurring-list');
  if (!el) return;
  const list = state.recurring || [];
  if (!list.length) {
    el.innerHTML = `<p style="font-size:13px;color:var(--ink-soft);margin:0;">Belum ada tagihan rutin. Centang "Jadikan tagihan rutin" pas nambah pengeluaran (kost, cicilan, langganan).</p>`;
    return;
  }
  el.innerHTML = list.map(r => `
    <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--line);">
      <span style="font-size:16px;">🔁</span>
      <span style="flex:1;min-width:0;">
        <span style="display:block;color:#1f1b16;font-weight:600;">${escapeHtmlRec(r.nama)}</span>
        <span style="font-size:11px;color:var(--ink-soft);">${formatRupiah(Number(r.jumlah) || 0)} · tiap tgl ${r.hariTagih || 1} · ${recurringPostedThisMonth(r.id) ? '✓ sudah bulan ini' : 'belum bulan ini'}</span>
      </span>
      <button class="rec-del" data-id="${r.id}" title="Hapus" style="flex:0 0 auto;border:none;background:#f7ede0;color:#b91c1c;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:15px;">×</button>
    </div>`).join('');
  el.querySelectorAll('.rec-del').forEach(b => {
    b.onclick = () => {
      if (typeof deleteRecurring === 'function') deleteRecurring(b.dataset.id);
      renderRecurringManager();
      if (typeof renderDashboard === 'function') renderDashboard();
    };
  });
}

function escapeHtmlRec(s) {
  const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML;
}

window.renderReminder = renderReminder;
window.renderRecurringManager = renderRecurringManager;
window.postRecurring = postRecurring;
