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

  let items = [];
  const candidates = []; // nominal besar tanpa nama (kandidat total)
  let total = null;
  // Gunakan baris non-angka pertama sebagai nama toko
  let merchant = lines.find(l => !/^\s*[\d.,\s:\-]+\s*$/.test(l)) || lines[0];

  // Pola yang harus dibersihkan dari baris sebelum parse jumlah
  const noisePatterns = [
    /\b\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\b/g,                      // tanggal
    /\b\d{1,2}:\d{2}(?::\d{2})?\b/g,                              // jam
    /\b\d{1,2}\s+(jan|feb|mar|apr|mei|jun|jul|ags?|agu|sep|okt|nov|des)\w*\s+\d{2,4}\b/gi, // tgl indo
    /\b\d+\s*items?\b/gi,                                         // "4 items"
    /\b\d[.,]\d\s*(?:★|stars?|bintang)?\b(?=\s|$)/gi,             // rating 4.9
  ];
  // Kata kunci yang harus diabaikan sepenuhnya
  const skipKeywords = /\b(kembali|kembalian|diskon|tunai|ppn|pajak|pb1|service|ongkir|delivery|rating|repeat|completed|order|pesanan|tanggal|tgl|jam|waktu|no\.?\s*trx|cashier|kasir|alamat)\b/i;
  const totalKeywords = /\b(grand\s*total|total|subtotal|bayar|jumlah|tagihan|nilai)\b/i;

  for (const line of lines) {
    const lower = line.toLowerCase();
    // Bersihkan tanggal/jam/rating/dll
    let cleaned = line;
    for (const re of noisePatterns) cleaned = cleaned.replace(re, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;

    // Baris TOTAL eksplisit
    if (totalKeywords.test(lower)) {
      const amt = parseAmount(line);
      if (amt && amt >= 1000) { if (!total || amt > total) total = amt; }
      continue;
    }
    if (skipKeywords.test(lower)) continue;

    const amt = parseAmount(cleaned);
    if (!amt || amt < 1000) continue; // abaikan angka kecil (rating, jam, kuantitas)

    // Ekstrak nama item (buang angka & tanda baca)
    const name = cleaned
      .replace(/(\d+(?:[.,]\d+)*)\s*(rb|ribu|k|jt|juta)?/gi, '')
      .replace(/[^\w\s&/]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (name && name.length >= 2) items.push({ name, amt });
    else candidates.push(amt); // angka besar tanpa nama → mungkin total
  }

  // Tentukan total
  if (!total) {
    if (candidates.length) {
      total = Math.max(...candidates);
    } else if (items.length) {
      // Jika ada 1 angka yang jauh lebih besar dari jumlah sisanya, anggap itu total
      const sorted = [...items].sort((a, b) => b.amt - a.amt);
      const max = sorted[0].amt;
      const restSum = sorted.slice(1).reduce((s, i) => s + i.amt, 0);
      if (max >= 10000 && max > restSum * 0.8) {
        total = max;
        items = items.filter(i => i.amt !== max);
      } else {
        total = items.reduce((s, i) => s + i.amt, 0);
      }
    }
  }
  if (!total) return { error: 'Tidak menemukan total pada struk. Coba edit teks manual.' };

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
