// Module: Receipt / Struk
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
    const line = `  ${it.qty} x ${formatNumber(it.hargaJual).padStart(8)}  ${formatNumber(subtot).padStart(10)}`;
    lines.push(line);
  }
  lines.push('--------------------------------');
  lines.push(`Subtotal:  ${formatNumber(sale.subtotal).padStart(15)}`);
  if (sale.diskon > 0) lines.push(`Diskon:    ${('-'+formatNumber(sale.diskon)).padStart(15)}`);
  lines.push(`TOTAL:     ${formatNumber(sale.total).padStart(15)}`);
  lines.push(`Bayar:     ${formatNumber(sale.bayar).padStart(15)}`);
  lines.push(`Kembali:   ${formatNumber(sale.kembalian).padStart(15)}`);
  lines.push('================================');
  lines.push(`Metode: ${(sale.metode || 'tunai').toUpperCase()}`);
  if (s.footerStruk) {
    lines.push('');
    lines.push(s.footerStruk);
  }
  lines.push('');
  lines.push('🏪 Powered by TokoUntung');

  document.getElementById('receipt-content').textContent = lines.join('\n');
  openModal('modal-receipt');

  document.getElementById('btn-print-receipt').onclick = () => {
    window.print();
  };
  document.getElementById('btn-share-receipt').onclick = async () => {
    const text = lines.join('\n');
    if (navigator.share) {
      try { await navigator.share({ title: 'Struk ' + sale.nomor, text }); }
      catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        showToast('Struk disalin ke clipboard', 'success');
      } catch {
        showToast('Pakai tombol Cetak / Save PDF', 'info');
      }
    }
  };
}
