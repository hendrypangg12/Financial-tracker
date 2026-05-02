// 8 tools untuk Agent Stok — Claude akan memilih tool yang sesuai pertanyaan owner.
// Schema tools STABLE (tidak berubah per request) supaya prompt cache bisa hit.
// Eksekusi tool dilakukan di Cloudflare Worker, mengakses snapshot data dari KV.

export const TOOLS = [
  {
    name: "get_low_stock",
    description: "Ambil daftar barang yang stoknya sudah kritis (<= minimum stok per produk, atau threshold custom). PAKAI INI saat owner tanya tentang stok habis, restock, alert stok, atau barang yang perlu diperhatikan.",
    input_schema: {
      type: "object",
      properties: {
        threshold: {
          type: "number",
          description: "Optional: override threshold custom. Default: pakai field minStok per produk."
        }
      }
    }
  },

  {
    name: "get_product_info",
    description: "Cari detail satu barang berdasarkan nama, SKU, atau kategori. PAKAI INI saat owner tanya tentang barang spesifik (misal: 'Indomie sisa berapa?', 'harga beras berapa?').",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Kata kunci pencarian (nama/SKU/kategori)." }
      },
      required: ["query"]
    }
  },

  {
    name: "get_today_sales",
    description: "Ringkasan penjualan HARI INI: total revenue, jumlah transaksi, profit, margin, top seller. PAKAI INI saat owner tanya 'sales hari ini', 'penjualan hari ini', 'omset hari ini'.",
    input_schema: { type: "object", properties: {} }
  },

  {
    name: "get_period_summary",
    description: "Ringkasan keuangan untuk periode (hari/minggu/bulan/tahun): revenue, HPP, profit, margin, jumlah transaksi. PAKAI INI saat owner tanya periode tertentu (misal: 'omset minggu ini', 'profit bulan lalu').",
    input_schema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "yesterday", "week", "last_week", "month", "last_month", "year"],
          description: "Periode laporan."
        }
      },
      required: ["period"]
    }
  },

  {
    name: "get_top_sellers",
    description: "Daftar barang TERLARIS dalam suatu periode (sorted by qty terjual). PAKAI INI saat owner tanya 'best seller', 'paling laku', 'barang favorit pelanggan'.",
    input_schema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "week", "month", "year"],
          description: "Periode evaluasi."
        },
        limit: {
          type: "number",
          description: "Jumlah top N (default 5, max 20)."
        }
      },
      required: ["period"]
    }
  },

  {
    name: "get_slow_moving",
    description: "Barang SLOW MOVING — tidak laku selama N hari padahal masih ada stok. PAKAI INI saat owner tanya 'barang yang ga laku', 'modal mati', 'apa yang harus dipromo'.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Threshold hari (default 30)." }
      }
    }
  },

  {
    name: "get_restock_suggestion",
    description: "Saran restock cerdas: kombinasi barang yang stoknya kritis + tingkat penjualan. Output sudah diprioritaskan berdasarkan urgency (sisa stok / kecepatan jual). PAKAI INI saat owner tanya 'apa yang harus saya restock' atau 'bantuin order'.",
    input_schema: {
      type: "object",
      properties: {
        days_window: { type: "number", description: "Window hari untuk hitung velocity (default 14)." }
      }
    }
  },

  {
    name: "list_all_products",
    description: "List SEMUA produk dengan stok dan harga, dalam bentuk tabel. PAKAI INI saat owner tanya pertanyaan stok yang umum atau ingin lihat detail seluruh inventaris (mis. 'stok berapa', 'detail stok masing-masing', 'list semua barang', 'inventaris keseluruhan').",
    input_schema: {
      type: "object",
      properties: {
        sort_by: {
          type: "string",
          enum: ["nama", "stok_terbanyak", "stok_terkecil", "kategori"],
          description: "Cara sort. Default: nama (alfabetis)."
        },
        kategori: {
          type: "string",
          description: "Optional filter berdasarkan kategori tertentu."
        }
      }
    }
  },

  {
    name: "get_business_overview",
    description: "Snapshot keseluruhan bisnis: total produk, nilai stok, jumlah kategori, transaksi total, status BEP bulan ini. PAKAI INI saat owner tanya kondisi umum, kesehatan bisnis, atau pertanyaan luas seperti 'gimana toko hari ini'.",
    input_schema: { type: "object", properties: {} }
  },

  {
    name: "get_piutang_summary",
    description: "Ringkasan piutang/tempo: total Rp yang belum dibayar pelanggan, breakdown overdue (lewat jatuh tempo) vs masih jadwal, list invoice belum lunas. PAKAI INI saat owner tanya 'piutang berapa', 'siapa yang belum bayar', 'tempo overdue', 'tagihan jatuh tempo', 'utang pelanggan'.",
    input_schema: {
      type: "object",
      properties: {
        only_overdue: {
          type: "boolean",
          description: "Optional: kalau true, hanya tampilkan invoice yang sudah lewat jatuh tempo. Default false (tampilkan semua belum lunas)."
        },
        customer: {
          type: "string",
          description: "Optional: filter nama pelanggan tertentu (mis. 'Pak Budi')."
        }
      }
    }
  },

  {
    name: "get_customer_list",
    description: "Daftar pelanggan dengan statistik belanja: total transaksi, total Rp belanja, terakhir beli, outstanding tempo. Sorted by total belanja (top customer dulu). PAKAI INI saat owner tanya 'pelanggan top', 'siapa pelanggan terbaik', 'list pelanggan', 'pelanggan paling sering belanja'.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Jumlah top N (default 10, max 30)."
        },
        sort_by: {
          type: "string",
          enum: ["total_belanja", "frekuensi", "terakhir_beli", "outstanding"],
          description: "Cara sort. Default total_belanja."
        }
      }
    }
  },

  {
    name: "get_customer_history",
    description: "Riwayat pembelian satu pelanggan spesifik: list semua transaksi (tanggal, total, status bayar, items). PAKAI INI saat owner tanya tentang pelanggan tertentu (mis. 'Pak Budi belanja apa aja', 'history Edwin Abraham', 'PT Contoh sudah beli berapa kali').",
    input_schema: {
      type: "object",
      properties: {
        customer: {
          type: "string",
          description: "Nama pelanggan (partial match OK, case-insensitive)."
        },
        limit: {
          type: "number",
          description: "Jumlah transaksi terakhir yang ditampilkan (default 10, max 50)."
        }
      },
      required: ["customer"]
    }
  },
];

// =============================================================================
// HANDLER — eksekusi tool berdasarkan name + input + tenant data
// =============================================================================

export async function executeTool(name, input, data) {
  const products = data.products || [];
  const sales = data.sales || [];
  const settings = data.settings || {};

  switch (name) {
    case "get_low_stock":
      return handleLowStock(products, input);
    case "get_product_info":
      return handleProductInfo(products, sales, input);
    case "get_today_sales":
      return handleTodaySales(sales, products);
    case "get_period_summary":
      return handlePeriodSummary(sales, products, input);
    case "get_top_sellers":
      return handleTopSellers(sales, input, products);
    case "get_slow_moving":
      return handleSlowMoving(products, sales, input);
    case "get_restock_suggestion":
      return handleRestockSuggestion(products, sales, input);
    case "list_all_products":
      return handleListAllProducts(products, input);
    case "get_business_overview":
      return handleBusinessOverview(products, sales, settings);
    case "get_piutang_summary":
      return handlePiutangSummary(sales, input);
    case "get_customer_list":
      return handleCustomerList(sales, input);
    case "get_customer_history":
      return handleCustomerHistory(sales, products, input);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// =============================================================================
// IMPLEMENTASI TOOL HANDLERS
// =============================================================================

function handleLowStock(products, input) {
  const overrideThreshold = input?.threshold;
  const lowStock = products
    .filter(p => {
      const min = overrideThreshold ?? (p.minStok || 5);
      return (p.stok || 0) <= min;
    })
    .sort((a, b) => (a.stok || 0) - (b.stok || 0))
    .map(p => {
      const stok = p.stok || 0;
      const minStok = p.minStok || 5;
      let urgency;
      if (stok <= 0) urgency = "HABIS";
      else if (stok <= minStok / 2) urgency = "URGENT";
      else urgency = "WARNING";
      return {
        nama: p.nama,
        sku: p.sku,
        stok,
        satuan: p.satuan || "pcs",
        minStok,
        urgency,
      };
    });
  return {
    count: lowStock.length,
    items: lowStock.slice(0, 20),
    summary: lowStock.length === 0
      ? "Semua stok aman"
      : `${lowStock.length} barang stok kritis (${lowStock.filter(x => x.urgency === "HABIS").length} habis, ${lowStock.filter(x => x.urgency === "URGENT").length} urgent)`,
  };
}

function handleProductInfo(products, sales, input) {
  const q = (input.query || "").toLowerCase();
  const matches = products.filter(p =>
    (p.nama || "").toLowerCase().includes(q) ||
    (p.sku || "").toLowerCase().includes(q) ||
    (p.kategori || "").toLowerCase().includes(q)
  ).slice(0, 5);

  if (!matches.length) return { found: false, query: input.query };

  return {
    found: true,
    count: matches.length,
    items: matches.map(p => {
      const margin = p.hargaModal && p.hargaJual
        ? ((p.hargaJual - p.hargaModal) / p.hargaJual * 100)
        : 0;
      const sold30d = countQtySoldInPeriod(sales, p.id, 30);
      return {
        nama: p.nama,
        sku: p.sku,
        kategori: p.kategori,
        stok: p.stok || 0,
        satuan: p.satuan || "pcs",
        hargaModal: p.hargaModal || 0,
        hargaJual: p.hargaJual || 0,
        margin_pct: +margin.toFixed(1),
        terjual_30hari: sold30d,
      };
    }),
  };
}

function handleTodaySales(sales, products) {
  const today = todayISO();
  const todaySales = sales.filter(s => s.tanggal === today);
  const revenue = todaySales.reduce((a, s) => a + (s.total || 0), 0);
  const profit = todaySales.reduce((a, s) => a + (s.profit || 0), 0);
  const margin = revenue > 0 ? (profit / revenue * 100) : 0;
  const counts = aggregateBySoldQty(todaySales, products);
  const top = Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 3);

  // Breakdown cash vs tempo
  const cashSales = todaySales.filter(s => s.metode !== 'tempo' || s.lunas === true);
  const tempoSales = todaySales.filter(s => s.metode === 'tempo' && !s.lunas);
  const cashTotal = cashSales.reduce((a, s) => a + (s.total || 0), 0);
  const tempoTotal = tempoSales.reduce((a, s) => a + (s.total || 0), 0);

  return {
    tanggal: today,
    transaksi: todaySales.length,
    revenue,
    profit,
    margin_pct: +margin.toFixed(1),
    breakdown_pemasukan: {
      cash: { jumlah: cashTotal, transaksi: cashSales.length },
      tempo_belum_dibayar: { jumlah: tempoTotal, invoice: tempoSales.length },
    },
    top_seller: top.map(t => ({ nama: t.nama, qty: t.qty, satuan: t.satuan, revenue: t.revenue })),
  };
}

function handlePeriodSummary(sales, products, input) {
  const period = input.period || "month";
  const range = getDateRange(period);
  const periodSales = sales.filter(s => {
    const d = parseISO(s.tanggal);
    return d >= range.start && d <= range.end;
  });

  const revenue = periodSales.reduce((a, s) => a + (s.total || 0), 0);
  const hpp = periodSales.reduce((a, s) =>
    a + (s.items || []).reduce((b, it) => b + (it.hargaModal || 0) * (it.qty || 0), 0), 0);
  const profit = periodSales.reduce((a, s) => a + (s.profit || 0), 0);
  const margin = revenue > 0 ? (profit / revenue * 100) : 0;

  return {
    period,
    range: { start: range.start.toISOString().slice(0, 10), end: range.end.toISOString().slice(0, 10) },
    transaksi: periodSales.length,
    revenue,
    hpp,
    profit,
    margin_pct: +margin.toFixed(1),
    avg_per_transaksi: periodSales.length > 0 ? Math.round(revenue / periodSales.length) : 0,
  };
}

function handleTopSellers(sales, input, products) {
  const period = input.period || "month";
  const limit = Math.min(input.limit || 5, 20);
  const range = getDateRange(period);
  const periodSales = sales.filter(s => {
    const d = parseISO(s.tanggal);
    return d >= range.start && d <= range.end;
  });
  const counts = aggregateBySoldQty(periodSales, products);
  const top = Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, limit);

  return {
    period,
    count: top.length,
    items: top.map(t => ({
      nama: t.nama,
      qty_terjual: t.qty,
      satuan: t.satuan,
      revenue: t.revenue,
    })),
  };
}

function handleSlowMoving(products, sales, input) {
  const days = input?.days || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const soldInWindow = new Set();
  for (const s of sales) {
    if (parseISO(s.tanggal) >= cutoff) {
      for (const it of (s.items || [])) soldInWindow.add(it.productId);
    }
  }
  const slow = products
    .filter(p => !soldInWindow.has(p.id) && (p.stok || 0) > 0)
    .map(p => ({
      nama: p.nama,
      sku: p.sku,
      kategori: p.kategori,
      stok: p.stok,
      satuan: p.satuan || "pcs",
      modal_terikat: (p.stok || 0) * (p.hargaModal || 0),
      hargaJual: p.hargaJual || 0,
    }))
    .sort((a, b) => b.modal_terikat - a.modal_terikat)
    .slice(0, 15);

  const totalModalMati = slow.reduce((a, x) => a + x.modal_terikat, 0);

  return {
    days_window: days,
    count: slow.length,
    items: slow,
    total_modal_terikat: totalModalMati,
  };
}

function handleRestockSuggestion(products, sales, input) {
  const days = input?.days_window || 14;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recentSales = sales.filter(s => parseISO(s.tanggal) >= cutoff);

  // Hitung velocity per produk (qty/hari)
  const velocity = {};
  for (const s of recentSales) {
    for (const it of (s.items || [])) {
      velocity[it.productId] = (velocity[it.productId] || 0) + (it.qty || 0);
    }
  }
  Object.keys(velocity).forEach(id => velocity[id] /= days);

  // Cari yang stoknya rendah relatif velocity
  const suggestions = products
    .filter(p => (p.stok || 0) >= 0)
    .map(p => {
      const vel = velocity[p.id] || 0;
      const stokSisa = p.stok || 0;
      const hariTersisa = vel > 0 ? stokSisa / vel : Infinity;
      const minStok = p.minStok || 5;
      let priority = 0;
      if (stokSisa <= 0) priority = 100;
      else if (hariTersisa <= 3) priority = 90;
      else if (hariTersisa <= 7) priority = 70;
      else if (stokSisa <= minStok) priority = 50;
      else if (hariTersisa <= 14) priority = 30;
      return {
        nama: p.nama,
        sku: p.sku,
        stok_sisa: stokSisa,
        satuan: p.satuan || "pcs",
        velocity_per_hari: +vel.toFixed(1),
        hari_tersisa: hariTersisa === Infinity ? null : Math.round(hariTersisa),
        priority,
        saran_order: vel > 0 ? Math.ceil(vel * 30) : minStok * 2,
      };
    })
    .filter(x => x.priority >= 30)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 10);

  return {
    days_window: days,
    count: suggestions.length,
    suggestions,
  };
}

function handleListAllProducts(products, input) {
  let list = [...products];

  // Filter kategori (kalau ada)
  if (input?.kategori) {
    const k = input.kategori.toLowerCase();
    list = list.filter(p => (p.kategori || "").toLowerCase().includes(k));
  }

  // Sort
  const sortBy = input?.sort_by || "nama";
  if (sortBy === "stok_terbanyak") list.sort((a, b) => (b.stok || 0) - (a.stok || 0));
  else if (sortBy === "stok_terkecil") list.sort((a, b) => (a.stok || 0) - (b.stok || 0));
  else if (sortBy === "kategori") list.sort((a, b) => (a.kategori || "").localeCompare(b.kategori || ""));
  else list.sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));

  return {
    total_produk: list.length,
    total_nilai_stok: list.reduce((a, p) => a + (p.stok || 0) * (p.hargaModal || 0), 0),
    items: list.map(p => ({
      nama: p.nama,
      sku: p.sku,
      kategori: p.kategori || "-",
      stok: p.stok || 0,
      satuan: p.satuan || "pcs",
      hargaJual: p.hargaJual || 0,
      hargaModal: p.hargaModal || 0,
      nilai_stok: (p.stok || 0) * (p.hargaModal || 0),
      stok_kritis: (p.stok || 0) <= (p.minStok || 5),
    })),
  };
}

function handleBusinessOverview(products, sales, settings) {
  const totalProduk = products.length;
  const totalKategori = new Set(products.map(p => p.kategori).filter(Boolean)).size;
  const nilaiStok = products.reduce((a, p) => a + (p.stok || 0) * (p.hargaModal || 0), 0);
  const lowStockCount = products.filter(p => (p.stok || 0) <= (p.minStok || 5)).length;

  // BEP bulan ini
  const startMonth = new Date();
  startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);
  const monthSales = sales.filter(s => parseISO(s.tanggal) >= startMonth);
  const monthRevenue = monthSales.reduce((a, s) => a + (s.total || 0), 0);
  const monthProfit = monthSales.reduce((a, s) => a + (s.profit || 0), 0);
  const biayaTetap = settings.biayaTetap || 0;
  const bepStatus = biayaTetap > 0
    ? {
        target: biayaTetap,
        tercapai: monthProfit,
        sisa: Math.max(0, biayaTetap - monthProfit),
        progress_pct: +Math.min(100, monthProfit / biayaTetap * 100).toFixed(1),
        bep_tercapai: monthProfit >= biayaTetap,
      }
    : null;

  return {
    total_produk: totalProduk,
    total_kategori: totalKategori,
    nilai_stok: nilaiStok,
    barang_low_stock: lowStockCount,
    total_transaksi_history: sales.length,
    revenue_bulan_ini: monthRevenue,
    profit_bulan_ini: monthProfit,
    transaksi_bulan_ini: monthSales.length,
    bep_status: bepStatus,
  };
}

function handlePiutangSummary(sales, input) {
  const onlyOverdue = !!input?.only_overdue;
  const customerFilter = (input?.customer || "").trim().toLowerCase();
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const tempoSales = sales.filter(s => s.metode === "tempo" && !s.lunas);
  let filtered = tempoSales;

  if (customerFilter) {
    filtered = filtered.filter(s => (s.pelanggan || "").toLowerCase().includes(customerFilter));
  }

  const enriched = filtered.map(s => {
    const due = s.jatuhTempo ? parseISO(s.jatuhTempo) : null;
    const isOverdue = due ? today > due : false;
    const daysToDue = due ? Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
    return {
      nomor: s.nomor,
      tanggal: s.tanggal,
      pelanggan: s.pelanggan || "Anonim",
      telepon: s.pelangganTelepon || "",
      total: s.total || 0,
      jatuh_tempo: s.jatuhTempo || null,
      hari_ke_jatuh_tempo: daysToDue,
      overdue: isOverdue,
      hari_lewat: isOverdue && daysToDue !== null ? Math.abs(daysToDue) : 0,
    };
  });

  const finalList = onlyOverdue ? enriched.filter(x => x.overdue) : enriched;
  finalList.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return (a.jatuh_tempo || "9999-12-31").localeCompare(b.jatuh_tempo || "9999-12-31");
  });

  const totalOutstanding = enriched.reduce((a, x) => a + x.total, 0);
  const overdueList = enriched.filter(x => x.overdue);
  const totalOverdue = overdueList.reduce((a, x) => a + x.total, 0);

  return {
    filter: { only_overdue: onlyOverdue, customer: customerFilter || null },
    total_outstanding: totalOutstanding,
    total_invoice_belum_lunas: enriched.length,
    total_overdue: totalOverdue,
    invoice_overdue_count: overdueList.length,
    invoices: finalList.slice(0, 30),
  };
}

function aggregateCustomers(sales) {
  const map = new Map();
  for (const s of sales) {
    const nama = (s.pelanggan || "Anonim").trim();
    const telp = (s.pelangganTelepon || "").replace(/\D/g, "");
    const key = telp ? `${nama.toLowerCase()}|${telp}` : nama.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        key,
        nama,
        telepon: s.pelangganTelepon || "",
        alamat: s.pelangganAlamat || "",
        total_belanja: 0,
        total_profit: 0,
        outstanding: 0,
        outstanding_count: 0,
        transaksi: 0,
        terakhir_beli: "",
        sales: [],
      });
    }
    const c = map.get(key);
    c.sales.push(s);
    c.transaksi += 1;
    c.total_belanja += s.total || 0;
    c.total_profit += s.profit || 0;
    if (s.metode === "tempo" && !s.lunas) {
      c.outstanding += s.total || 0;
      c.outstanding_count += 1;
    }
    if ((s.tanggal || "") > c.terakhir_beli) c.terakhir_beli = s.tanggal || "";
    if (s.pelangganTelepon && !c.telepon) c.telepon = s.pelangganTelepon;
    if (s.pelangganAlamat && !c.alamat) c.alamat = s.pelangganAlamat;
  }
  return Array.from(map.values());
}

function handleCustomerList(sales, input) {
  const limit = Math.min(input?.limit || 10, 30);
  const sortBy = input?.sort_by || "total_belanja";
  let customers = aggregateCustomers(sales);

  if (sortBy === "frekuensi") customers.sort((a, b) => b.transaksi - a.transaksi);
  else if (sortBy === "terakhir_beli") customers.sort((a, b) => (b.terakhir_beli || "").localeCompare(a.terakhir_beli || ""));
  else if (sortBy === "outstanding") customers.sort((a, b) => b.outstanding - a.outstanding);
  else customers.sort((a, b) => b.total_belanja - a.total_belanja);

  const totalOmzet = customers.reduce((a, c) => a + c.total_belanja, 0);
  const totalOutstanding = customers.reduce((a, c) => a + c.outstanding, 0);

  return {
    sort_by: sortBy,
    total_pelanggan: customers.length,
    total_omzet: totalOmzet,
    total_outstanding: totalOutstanding,
    customers: customers.slice(0, limit).map(c => ({
      nama: c.nama,
      telepon: c.telepon,
      total_belanja: c.total_belanja,
      total_profit: c.total_profit,
      transaksi: c.transaksi,
      avg_per_transaksi: c.transaksi > 0 ? Math.round(c.total_belanja / c.transaksi) : 0,
      outstanding: c.outstanding,
      outstanding_invoice: c.outstanding_count,
      terakhir_beli: c.terakhir_beli,
    })),
  };
}

function handleCustomerHistory(sales, products, input) {
  const q = (input?.customer || "").trim().toLowerCase();
  if (!q) return { error: "customer parameter required" };
  const limit = Math.min(input?.limit || 10, 50);

  const customers = aggregateCustomers(sales);
  const matches = customers.filter(c =>
    c.nama.toLowerCase().includes(q) ||
    (c.telepon || "").toLowerCase().includes(q)
  );

  if (!matches.length) return { found: false, query: input.customer };

  // Pakai match pertama (paling top by belanja)
  matches.sort((a, b) => b.total_belanja - a.total_belanja);
  const customer = matches[0];

  const sortedSales = [...customer.sales].sort((a, b) =>
    (b.tanggal || "").localeCompare(a.tanggal || "")
  );

  const satuanMap = {};
  for (const p of (products || [])) satuanMap[p.id] = p.satuan || "pcs";

  return {
    found: true,
    multiple_match: matches.length > 1,
    other_matches: matches.length > 1 ? matches.slice(1, 5).map(m => m.nama) : [],
    customer: {
      nama: customer.nama,
      telepon: customer.telepon,
      alamat: customer.alamat,
      total_belanja: customer.total_belanja,
      total_profit: customer.total_profit,
      transaksi: customer.transaksi,
      avg_per_transaksi: customer.transaksi > 0 ? Math.round(customer.total_belanja / customer.transaksi) : 0,
      outstanding: customer.outstanding,
      outstanding_invoice: customer.outstanding_count,
      terakhir_beli: customer.terakhir_beli,
    },
    sales: sortedSales.slice(0, limit).map(s => ({
      nomor: s.nomor,
      tanggal: s.tanggal,
      total: s.total,
      profit: s.profit,
      metode: s.metode,
      lunas: s.metode === "tempo" ? !!s.lunas : true,
      jatuh_tempo: s.jatuhTempo || null,
      items: (s.items || []).map(it => ({
        nama: it.nama,
        qty: it.qty,
        satuan: it.satuan || satuanMap[it.productId] || "pcs",
        harga: it.hargaJual,
      })),
    })),
  };
}

// =============================================================================
// UTILITIES
// =============================================================================

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function parseISO(s) {
  if (!s) return new Date(0);
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function getDateRange(period) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let start = new Date(now);

  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0); break;
    case "yesterday":
      start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999);
      break;
    case "week": {
      const dow = start.getDay() || 7;
      start.setDate(start.getDate() - dow + 1);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "last_week": {
      const dow = start.getDay() || 7;
      start.setDate(start.getDate() - dow - 6);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - dow);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "month":
      start.setDate(1); start.setHours(0, 0, 0, 0); break;
    case "last_month":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end.setDate(0); end.setHours(23, 59, 59, 999);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1); break;
    default:
      start.setDate(1); start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

function aggregateBySoldQty(salesList, products) {
  // Bikin lookup productId → satuan dari products
  const satuanMap = {};
  if (Array.isArray(products)) {
    for (const p of products) satuanMap[p.id] = p.satuan || 'pcs';
  }
  const counts = {};
  for (const s of salesList) {
    for (const it of (s.items || [])) {
      const key = it.productId;
      if (!counts[key]) counts[key] = {
        nama: it.nama,
        qty: 0,
        revenue: 0,
        satuan: satuanMap[key] || it.satuan || 'pcs',
      };
      counts[key].qty += (it.qty || 0);
      counts[key].revenue += (it.qty || 0) * (it.hargaJual || 0);
    }
  }
  return counts;
}

function countQtySoldInPeriod(sales, productId, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  let qty = 0;
  for (const s of sales) {
    if (parseISO(s.tanggal) >= cutoff) {
      for (const it of (s.items || [])) {
        if (it.productId === productId) qty += (it.qty || 0);
      }
    }
  }
  return qty;
}
