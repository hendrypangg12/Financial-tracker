// Parser: chat dan struk belanja
function parseChat(text) {
  if (!text || !text.trim()) return null;
  const jumlah = parseAmount(text);
  if (!jumlah || jumlah <= 0) {
    return { error: 'Tidak menemukan jumlah uang. Contoh: "bakso 45000" atau "bensin 250rb".' };
  }

  let jenis = null;
  let sub = null;
  for (const rule of KEYWORD_MAP) {
    if (rule.re.test(text)) {
      jenis = rule.jenis;
      sub = rule.sub;
      break;
    }
  }
  if (!jenis) {
    jenis = INCOME_HINTS.test(text) ? 'pemasukan' : 'pengeluaran';
  }
  if (!sub) {
    sub = jenis === 'pemasukan' ? 'Gaji bulanan' : 'Makan keluarga di luar';
  }

  const { kategori, alokasi } = findCategoryForSub(sub, jenis);
  const tanggal = detectDateFromChat(text);

  // Deskripsi: buang angka & satuan
  let deskripsi = text
    .replace(/\brp\.?\b/gi, '')
    .replace(/(\d+(?:[.,]\d+)*)\s*(rb|ribu|k|jt|juta|m|miliar)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!deskripsi) deskripsi = sub;

  return {
    tanggal,
    jenis,
    jumlah,
    deskripsi: deskripsi.slice(0, 80),
    subKategori: sub,
    kategori,
    alokasi,
  };
}

function parseStruk(text, fallbackDate) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return { error: 'Teks struk kosong.' };

  const items = [];
  let total = null;
  let merchant = lines[0];

  for (const line of lines) {
    const lower = line.toLowerCase();
    // Cari total
    if (/\btotal\b|\bgrand\s*total\b|\bsubtotal\b|\bbayar\b/.test(lower)) {
      const amt = parseAmount(line);
      if (amt && (!total || amt > total)) total = amt;
      continue;
    }
    const amt = parseAmount(line);
    if (amt && amt > 0 && !/\bkembali|kembalian|diskon|tunai|ppn|pajak|pb1|service\b/.test(lower)) {
      // Nama item = line tanpa angka
      const name = line
        .replace(/(\d+(?:[.,]\d+)*)\s*(rb|ribu|k|jt|juta)?/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (name && name.length > 1) items.push({ name, amt });
    }
  }

  if (!total && items.length) {
    total = items.reduce((s, i) => s + i.amt, 0);
  }
  if (!total) return { error: 'Tidak menemukan total pada struk.' };

  // Deteksi kategori dari merchant & item
  let sub = null;
  const allText = [merchant, ...items.map(i => i.name)].join(' ');
  for (const rule of KEYWORD_MAP) {
    if (rule.jenis === 'pengeluaran' && rule.re.test(allText)) { sub = rule.sub; break; }
  }
  if (!sub) sub = 'Belanja bulanan supermarket';
  const { kategori, alokasi } = findCategoryForSub(sub, 'pengeluaran');

  return {
    tanggal: fallbackDate || todayISO(),
    jenis: 'pengeluaran',
    jumlah: total,
    deskripsi: (merchant || 'Struk belanja').slice(0, 80),
    subKategori: sub,
    kategori,
    alokasi,
    items,
  };
}
