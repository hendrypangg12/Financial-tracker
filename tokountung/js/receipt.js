// Module: Receipt (struk thermal) + Invoice A4 (formal 3-ply)

// Lookup satuan dari product master (fallback untuk sale lama)
function lookupSatuan(productId) {
  if (!productId) return null;
  const p = (state.products || []).find(x => x.id === productId);
  return p ? (p.satuan || null) : null;
}

// =============================================================================
// STRUK THERMAL — 32 char width
// =============================================================================
function showReceipt(sale) {
  const s = state.settings;
  const lines = [];
  lines.push((s.namaToko || 'TOKO').toUpperCase().padStart((32 + (s.namaToko || 'TOKO').length) / 2, ' '));
  if (s.alamat) lines.push(s.alamat);
  if (s.telepon) lines.push('Telp: ' + s.telepon);
  lines.push('================================');
  lines.push(`No: ${sale.nomor}`);
  lines.push(`Tgl: ${formatTanggal(sale.tanggal)} ${sale.waktu || ''}`);
  lines.push(`Kasir: Admin`);
  if (sale.pelanggan && sale.pelanggan !== 'Anonim') lines.push(`Plg: ${sale.pelanggan}`);
  lines.push('--------------------------------');
  for (const it of sale.items) {
    const namaShort = (it.nama || '').slice(0, 28);
    lines.push(namaShort);
    const subtot = it.hargaJual * it.qty;
    const satuan = it.satuan || lookupSatuan(it.productId) || 'pcs';
    const line = `  ${it.qty} ${satuan} x ${formatNumber(it.hargaJual).padStart(7)}  ${formatNumber(subtot).padStart(9)}`;
    lines.push(line);
  }
  lines.push('--------------------------------');
  lines.push(`Subtotal:  ${formatNumber(sale.subtotal).padStart(15)}`);
  if (sale.diskon > 0) lines.push(`Diskon:    ${('-' + formatNumber(sale.diskon)).padStart(15)}`);
  lines.push(`TOTAL:     ${formatNumber(sale.total).padStart(15)}`);
  lines.push(`Bayar:     ${formatNumber(sale.bayar).padStart(15)}`);
  lines.push(`Kembali:   ${formatNumber(sale.kembalian).padStart(15)}`);
  lines.push('================================');
  lines.push(`Metode: ${(sale.metode || 'tunai').toUpperCase()}`);
  if (sale.metode === 'tempo' && sale.jatuhTempo) {
    lines.push(`Jth Tempo: ${formatTanggal(sale.jatuhTempo)}`);
  }
  if (s.footerStruk) {
    lines.push('');
    lines.push(s.footerStruk);
  }
  lines.push('');
  lines.push('🏪 Powered by BerBisnis');

  document.getElementById('receipt-content').textContent = lines.join('\n');
  openModal('modal-receipt');

  document.getElementById('btn-print-receipt').onclick = () => window.print();
  document.getElementById('btn-share-receipt').onclick = async () => {
    const text = lines.join('\n');
    if (navigator.share) {
      try { await navigator.share({ title: 'Struk ' + sale.nomor, text }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        showToast('Struk disalin ke clipboard', 'success');
      } catch {
        showToast('Pakai tombol Cetak / Save PDF', 'info');
      }
    }
  };

  const btnInvoice = document.getElementById('btn-show-invoice');
  if (btnInvoice) btnInvoice.onclick = () => {
    closeModal('modal-receipt');
    setTimeout(() => showInvoiceA4(sale), 200);
  };
}

// =============================================================================
// INVOICE A4 — 3 PLY (Asli/Putih, Copy/Merah, Arsip/Kuning) + jatuh tempo
// =============================================================================
function showInvoiceA4(sale) {
  const s = state.settings;
  const minRows = 8;
  const items = sale.items || [];
  const emptyRowsCount = Math.max(0, minRows - items.length);

  // Lookup SKU per produk dari state.products
  const skuMap = {};
  (state.products || []).forEach(p => skuMap[p.id] = p.sku || '');

  // Status pembayaran
  const isTempo = sale.metode === 'tempo';
  const isLunas = !isTempo || sale.lunas === true;
  let paymentLabel;
  if (!isTempo) {
    paymentLabel = `<b style="color:#16a34a">LUNAS ✓</b>`;
  } else if (sale.lunas) {
    paymentLabel = `<b style="color:#16a34a">LUNAS ✓ (Tempo)</b>`;
  } else {
    paymentLabel = `<b style="color:#c44848">TEMPO ⏱️</b>`;
  }
  const jatuhTempoLabel = isTempo && sale.jatuhTempo
    ? formatTanggal(sale.jatuhTempo) + (sale.lunas && sale.tanggalLunas ? ` · dibayar ${formatTanggal(sale.tanggalLunas)}` : '')
    : (isTempo ? '— belum diatur —' : 'Lunas saat transaksi');

  function buildPly(plyLabel, plyColor) {
    const itemRows = items.map((it, i) => {
      const satuan = it.satuan || lookupSatuan(it.productId) || 'pcs';
      return `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${escapeHtml(skuMap[it.productId] || '-')}</td>
        <td>${escapeHtml(it.nama || '')}</td>
        <td class="c">${it.qty} ${escapeHtml(satuan)}</td>
        <td class="r">${formatNumber(it.hargaJual)}</td>
        <td class="r"><b>${formatNumber(it.hargaJual * it.qty)}</b></td>
      </tr>
    `;
    }).join('');

    const emptyRows = Array.from({ length: emptyRowsCount }).map((_, i) => `
      <tr><td class="c">${items.length + i + 1}</td><td></td><td></td><td></td><td></td><td></td></tr>
    `).join('');

    const subtotalRow = sale.diskon > 0
      ? `<tr class="subtotal-row"><td colspan="5" class="r"><b>Subtotal</b></td><td class="r">Rp ${formatNumber(sale.subtotal)}</td></tr>
         <tr class="discount-row"><td colspan="5" class="r">Diskon</td><td class="r">-Rp ${formatNumber(sale.diskon)}</td></tr>`
      : '';

    return `
      <div class="invoice-ply" data-ply="${plyLabel}">
        <div class="ply-stamp" style="color:${plyColor}">${plyLabel}</div>

        <h1 class="inv-title">INVOICE</h1>

        <div class="inv-header-row">
          <div class="inv-company">
            <h2>${escapeHtml((s.namaToko || 'Toko Anda').toUpperCase())}</h2>
            ${s.alamat ? `<p>${escapeHtml(s.alamat)}</p>` : ''}
            ${s.telepon ? `<p>Telp: ${escapeHtml(s.telepon)}</p>` : ''}
          </div>
          <div class="inv-meta">
            <div class="meta-row"><span>No Invoice</span><b>: ${escapeHtml(sale.nomor)}</b></div>
            <div class="meta-row"><span>Tanggal</span><b>: ${formatTanggal(sale.tanggal)}</b></div>
            <div class="meta-row"><span>Payment</span>: ${(sale.metode || '-').toUpperCase()}</div>
            <div class="meta-row"><span>Status</span>: ${paymentLabel}</div>
            <div class="meta-row"><span>Jatuh Tempo</span>: ${jatuhTempoLabel}</div>
          </div>
        </div>

        <div class="inv-customer">
          <p class="kepada-label">Kepada Yth :</p>
          <h3>${escapeHtml(sale.pelanggan || 'Anonim')}</h3>
          ${sale.pelangganAlamat ? `<p>${escapeHtml(sale.pelangganAlamat)}</p>` : ''}
          ${sale.pelangganTelepon ? `<p>${escapeHtml(sale.pelangganTelepon)}</p>` : ''}
        </div>

        <table class="inv-table">
          <thead>
            <tr>
              <th style="width:38px">No</th>
              <th style="width:90px">Kode<br>Produk</th>
              <th>Nama Produk</th>
              <th style="width:90px">Quantity</th>
              <th style="width:90px" class="r">Price</th>
              <th style="width:120px" class="r">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
            ${emptyRows}
            ${subtotalRow}
          </tbody>
        </table>

        <div class="inv-bottom">
          <div class="inv-terbilang">
            <p class="terbilang-label">Terbilang:</p>
            <div class="terbilang-box"><i>${formatTerbilang(sale.total)}</i></div>
          </div>
          <div class="inv-total">
            <div class="total-label">Total</div>
            <div class="total-amount">Rp ${formatNumber(sale.total)}</div>
          </div>
        </div>

        <div class="inv-signatures">
          <div class="sign-box">
            <p>Diterima oleh,</p>
            <div class="sign-space"></div>
            <p class="sign-line">(______________________)</p>
          </div>
          <div class="sign-box">
            <p>Hormat kami,</p>
            <div class="sign-space"></div>
            <p class="sign-line">(______________________)</p>
          </div>
        </div>

        <div class="inv-footer-note">
          ${s.footerStruk ? escapeHtml(s.footerStruk) : ''}
          <span class="powered">Powered by BerBisnis · ${escapeHtml(sale.nomor)}</span>
        </div>
      </div>
    `;
  }

  const html = `
    <div class="invoice-3ply">
      ${buildPly('LEMBAR 1 — ASLI (untuk Customer)', '#1e3a5f')}
      ${buildPly('LEMBAR 2 — COPY (untuk Pembukuan)', '#c44848')}
      ${buildPly('LEMBAR 3 — ARSIP (untuk Toko)', '#a3823a')}
    </div>
  `;

  document.getElementById('invoice-content').innerHTML = html;
  openModal('modal-invoice');

  document.getElementById('btn-print-invoice').onclick = () => window.print();
}
