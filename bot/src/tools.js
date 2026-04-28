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
      return handleTodaySales(sales);
    case "get_period_summary":
      return handlePeriodSummary(sales, products, input);
    case "get_top_sellers":
      return handleTopSellers(sales, input);
    case "get_slow_moving":
      return handleSlowMoving(products, sales, input);
    case "get_restock_suggestion":
      return handleRestockSuggestion(products, sales, input);
    case "list_all_products":
      return handleListAllProducts(products, input);
    case "get_business_overview":
      return handleBusinessOverview(products, sales, settings);
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

function handleTodaySales(sales) {
  const today = todayISO();
  const todaySales = sales.filter(s => s.tanggal === today);
  const revenue = todaySales.reduce((a, s) => a + (s.total || 0), 0);
  const profit = todaySales.reduce((a, s) => a + (s.profit || 0), 0);
  const margin = revenue > 0 ? (profit / revenue * 100) : 0;
  const counts = aggregateBySoldQty(todaySales);
  const top = Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 3);

  return {
    tanggal: today,
    transaksi: todaySales.length,
    revenue,
    profit,
    margin_pct: +margin.toFixed(1),
    top_seller: top.map(t => ({ nama: t.nama, qty: t.qty, revenue: t.revenue })),
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

function handleTopSellers(sales, input) {
  const period = input.period || "month";
  const limit = Math.min(input.limit || 5, 20);
  const range = getDateRange(period);
  const periodSales = sales.filter(s => {
    const d = parseISO(s.tanggal);
    return d >= range.start && d <= range.end;
  });
  const counts = aggregateBySoldQty(periodSales);
  const top = Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, limit);

  return {
    period,
    count: top.length,
    items: top.map(t => ({
      nama: t.nama,
      qty_terjual: t.qty,
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

function aggregateBySoldQty(salesList) {
  const counts = {};
  for (const s of salesList) {
    for (const it of (s.items || [])) {
      const key = it.productId;
      if (!counts[key]) counts[key] = { nama: it.nama, qty: 0, revenue: 0 };
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
