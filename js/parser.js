// Parser: chat dan struk belanja
function parseChat(text) {
  if (!text || !text.trim()) return null;
  const amountDetails = parseAmountDetails(text);
  const jumlah = amountDetails.amount;
  if (amountDetails.error === 'currency') return { error: moneyText('Mata uang berbeda dari mata uang akun. Belum disimpan; tidak ada konversi otomatis.', 'This amount uses a different currency from your account. Not saved; no automatic conversion is available.') };
  if (amountDetails.error === 'ambiguous') return { error: moneyText('Ada lebih dari satu nominal. Belum disimpan. Tulis satu transaksi dengan satu jumlah uang.', 'More than one amount was found. Not saved. Enter one transaction with one amount.') };
  if (amountDetails.error === 'invalid') return { error: moneyText('Format nominal tidak valid untuk mata uang akun. Belum disimpan. Periksa tanda desimal dan ribuan.', 'The amount is invalid for your account currency. Not saved. Check decimal and grouping separators.') };
  if (!jumlah || jumlah <= 0) {
    return { error: moneyText('Tidak menemukan jumlah uang. Contoh: "bakso 45000" atau "bensin 250rb".', 'No amount found. Try "coffee 12.50" or "salary 2500" using your account currency.') };
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
  // If the user explicitly names one of their categories in the sentence,
  // honor that choice before using the keyword-based suggestion.
  const categoryMap = state.categories?.[jenis] || {};
  const explicitCategory = Object.keys(categoryMap)
    .sort((a, b) => b.length - a.length)
    .find(name => new RegExp('\\b' + escapeRegexText(name) + '\\b', 'i').test(text));
  const selectedInfo = explicitCategory ? categoryMap[explicitCategory] : null;
  if (!sub && selectedInfo?.subs?.length) sub = selectedInfo.subs[0];
  if (!sub && jenis === 'pemasukan') sub = 'Gaji bulanan';
  if (!sub) return { error: moneyText('Kategori transaksi belum dikenali. Belum disimpan. Tulis nama kategori yang sudah dibuat, atau gunakan form Tambah untuk memilih/membuat kategori.', 'The category was not recognized. Not saved. Include an existing category name, or use the Add form to choose/create a category.') };

  const matched = findCategoryForSub(sub, jenis);
  const kategori = explicitCategory || matched.kategori;
  const alokasi = selectedInfo ? (selectedInfo.alokasi || '') : matched.alokasi;
  if (selectedInfo?.subs?.length) sub = selectedInfo.subs[0];
  const tanggal = detectDateFromChat(text);
  if (!tanggal) return { error: moneyText('Tanggal tidak valid. Belum disimpan. Gunakan format YYYY-MM-DD.', 'Invalid date. Not saved. Use YYYY-MM-DD.') };

  // Deskripsi: buang angka & satuan
  let deskripsi = text
    .replace(amountDetails.raw, '')
    .replace(/\b(?:IDR|USD|SGD|MYR|EUR|GBP|JPY|KWD|AUD|CAD|NZD|CHF|CNY|INR|Rp\.?|RM)\b/gi, '')
    .replace(/[\$€£₹¥₩₽₺₫฿₱₪₦₴]/g, '')
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

function escapeRegexText(value) {
  const meta = '.*+?^${}()|[]\\';
  return [...String(value)].map(char => meta.includes(char) ? '\\' + char : char).join('');
}

function parseStruk(text, fallbackDate) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return { error: moneyText('Teks struk kosong.', 'Receipt text is empty.') };
  if (moneyCurrencyError(text)) return { error: moneyText('Mata uang struk berbeda dari mata uang akun. Tidak ada konversi otomatis.', 'The receipt currency differs from your account currency. No automatic conversion is available.') };

  let items = [];
  const candidates = []; // nominal besar tanpa nama (kandidat total)
  let total = null;
  let totalPriority = 0;
  // Gunakan baris non-angka pertama sebagai nama toko
  let merchant = lines.find(l => !/^\s*[\d.,\s:\-]+\s*$/.test(l)) || lines[0];

  // Pola yang harus dibersihkan dari baris sebelum parse jumlah
  const noisePatterns = [
    /\b\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\b/g,                      // tanggal
    /\b\d{1,2}:\d{2}(?::\d{2})?\b/g,                              // jam
    /\b\d{4}-\d{1,2}-\d{1,2}\b/g,
    /\b\d{1,2}\s+(jan|feb|mar|apr|mei|may|jun|jul|aug|ags?|agu|sep|okt|oct|nov|des|dec)\w*\s+\d{2,4}\b/gi,
    /\b\d+\s*items?\b/gi,                                         // "4 items"
    /\b(?:rating\s*:?\s*)\d(?:[.,]\d)?\b|\b\d(?:[.,]\d)?\s*(?:★|stars?|bintang)\b/gi,
  ];
  // Kata kunci yang harus diabaikan sepenuhnya
  const skipKeywords = /\b(kembali|kembalian|diskon|tunai|ppn|pajak|pb1|service|ongkir|delivery|rating|repeat|completed|order|pesanan|tanggal|tgl|jam|waktu|no\.?\s*trx|cashier|kasir|alamat|change|cash|tax|vat|discount|tip|address|street|date|time|receipt\s*(?:no|number))\b/i;
  const totalKeywords = /\b(grand\s*total|total|subtotal|sub\s*total|bayar|jumlah|tagihan|nilai|amount due|balance due)\b/i;

  for (const line of lines) {
    const lower = line.toLowerCase();
    // Bersihkan tanggal/jam/rating/dll
    let cleaned = line;
    for (const re of noisePatterns) cleaned = cleaned.replace(re, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;

    // Baris TOTAL eksplisit
    if (totalKeywords.test(lower)) {
      const details = parseAmountDetails(cleaned);
      if (details.error && details.error !== 'missing') return { error: moneyText('Nominal total struk tidak jelas. Periksa atau edit teks sebelum menyimpan.', 'The receipt total is unclear. Check or edit the text before saving.') };
      const amt = details.amount;
      const priority = /\b(?:grand\s*total|amount due|balance due)\b/i.test(line) ? 3 : /\b(?:subtotal|sub\s*total)\b/i.test(line) ? 1 : 2;
      if (amt && amt > 0) {
        if (priority === totalPriority && total !== null && amt !== total) return { error: moneyText('Ada total struk yang berbeda. Periksa teks sebelum menyimpan.', 'Conflicting receipt totals were found. Check the text before saving.') };
        if (priority > totalPriority) { total = amt; totalPriority = priority; }
      }
      continue;
    }
    if (skipKeywords.test(lower)) continue;

    const details = parseAmountDetails(cleaned);
    if (details.error === 'missing') continue;
    if (details.error) return { error: moneyText('Nominal pada item struk tidak jelas. Periksa atau edit teks sebelum menyimpan.', 'A receipt item amount is unclear. Check or edit the text before saving.') };
    const amt = details.amount;
    if (!amt || amt <= 0) continue;

    // Ekstrak nama item (buang angka & tanda baca)
    const name = cleaned
      .replace(details.raw, '')
      .replace(/\b(?:IDR|USD|SGD|MYR|EUR|GBP|JPY|KWD|AUD|CAD|Rp\.?|RM)\b/gi, '')
      .replace(/[\$€£₹¥₩₽₺₫฿₱₪₦₴]/g, '')
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
      // Without a labeled total, sum priced items instead of guessing a costly item is the total.
      total = roundMoney(items.reduce((s, i) => s + i.amt, 0));
    }
  }
  if (!total) return { error: moneyText('Tidak menemukan total pada struk. Coba edit teks manual.', 'No receipt total was found. Edit the text manually.') };
  if (fallbackDate && !Number.isFinite(parseISO(fallbackDate).getTime())) return { error: moneyText('Tanggal struk tidak valid.', 'Invalid receipt date.') };

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
    deskripsi: (merchant || moneyText('Struk belanja', 'Shopping receipt')).slice(0, 80),
    subKategori: sub,
    kategori,
    alokasi,
    items,
  };
}
