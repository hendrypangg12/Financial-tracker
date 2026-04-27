// Usage Tracker — dashboard logic
// Memanggil Cloudflare Worker (claude-usage-proxy) yang mem-proxy Anthropic Admin API.

const STORE_KEY = "berusage.settings.v1";
const els = {
  btnSettings: document.getElementById("btnSettings"),
  btnRefresh: document.getElementById("btnRefresh"),
  dlg: document.getElementById("dlgSettings"),
  formSettings: document.getElementById("formSettings"),
  dateFrom: document.getElementById("dateFrom"),
  dateTo: document.getElementById("dateTo"),
  bucketWidth: document.getElementById("bucketWidth"),
  groupBy: document.getElementById("groupBy"),
  quickRanges: document.querySelectorAll(".chip[data-range]"),

  kpiTotalTokens: document.getElementById("kpiTotalTokens"),
  kpiTokenBreakdown: document.getElementById("kpiTokenBreakdown"),
  kpiTotalCost: document.getElementById("kpiTotalCost"),
  kpiCostIdr: document.getElementById("kpiCostIdr"),
  kpiCacheHit: document.getElementById("kpiCacheHit"),
  kpiTopModel: document.getElementById("kpiTopModel"),
  kpiTopModelShare: document.getElementById("kpiTopModelShare"),

  thGroup: document.getElementById("thGroup"),
  tbody: document.querySelector("#dataTable tbody"),
  rowCount: document.getElementById("rowCount"),
  lastFetched: document.getElementById("lastFetched"),
};

const charts = { tokens: null, cost: null, model: null, composition: null };

const fmtInt = new Intl.NumberFormat("id-ID");
const fmtUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 });
const fmtIdr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const fmtPct = new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: 1 });

const PALETTE = ["#8b5a2b", "#4a7fc1", "#5a8a3a", "#c17c3e", "#9b59b6", "#16a085", "#e67e22", "#34495e"];

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); }
  catch { return {}; }
}
function saveSettings(s) { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }

function toast(msg, isError = false) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.toggle("error", isError);
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3000);
}

function setQuickRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  els.dateFrom.value = isoDate(start);
  els.dateTo.value = isoDate(end);
  els.quickRanges.forEach((c) => c.classList.toggle("active", Number(c.dataset.range) === days));
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function toRfc3339Start(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).toISOString();
}
function toRfc3339End(dateStr) {
  // Anthropic ending_at is exclusive; gunakan akhir hari + 1 detik aman
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

async function callApi(path, params) {
  const settings = loadSettings();
  if (!settings.workerUrl || !settings.dashboardKey) {
    throw new Error("Worker URL atau Dashboard Key belum di-set. Klik ⚙️ Pengaturan.");
  }
  const url = new URL(path, settings.workerUrl);
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === "") continue;
    if (Array.isArray(v)) v.forEach((vv) => url.searchParams.append(k, vv));
    else url.searchParams.append(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { "X-Dashboard-Key": settings.dashboardKey },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!res.ok) {
    const msg = body?.error?.message || body?.error || body?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

async function fetchAllPages(path, baseParams) {
  const all = [];
  let page = null;
  for (let i = 0; i < 20; i++) {
    const params = { ...baseParams };
    if (page) params.page = page;
    const data = await callApi(path, params);
    if (Array.isArray(data?.data)) all.push(...data.data);
    if (!data?.has_more || !data?.next_page) break;
    page = data.next_page;
  }
  return all;
}

async function refresh() {
  const from = els.dateFrom.value;
  const to = els.dateTo.value;
  if (!from || !to) { toast("Pilih tanggal dulu", true); return; }
  if (from > to) { toast("Tanggal mulai > tanggal akhir", true); return; }

  const groupBy = els.groupBy.value;
  const bucketWidth = els.bucketWidth.value;

  els.btnRefresh.disabled = true;
  els.btnRefresh.textContent = "↻ Memuat…";
  try {
    const baseParams = {
      starting_at: toRfc3339Start(from),
      ending_at: toRfc3339End(to),
      bucket_width: bucketWidth,
      group_by: groupBy,
      limit: bucketWidth === "1d" ? 31 : 168,
    };
    const [usageBuckets, costBuckets] = await Promise.all([
      fetchAllPages("/usage", baseParams),
      fetchAllPages("/cost", { starting_at: toRfc3339Start(from), ending_at: toRfc3339End(to), bucket_width: "1d", group_by: "description", limit: 31 }),
    ]);
    render(usageBuckets, costBuckets, groupBy);
    els.lastFetched.textContent = `Diperbarui ${new Date().toLocaleString("id-ID")}`;
  } catch (err) {
    console.error(err);
    toast(err.message || "Gagal memuat data", true);
    els.lastFetched.textContent = `Error: ${err.message}`;
  } finally {
    els.btnRefresh.disabled = false;
    els.btnRefresh.textContent = "↻ Refresh";
  }
}

function tokenTotal(r) {
  const cache = (r.cache_creation?.ephemeral_5m_input_tokens || 0) + (r.cache_creation?.ephemeral_1h_input_tokens || 0);
  return (r.uncached_input_tokens || 0) + (r.cache_read_input_tokens || 0) + cache + (r.output_tokens || 0);
}
function cacheCreate(r) {
  return (r.cache_creation?.ephemeral_5m_input_tokens || 0) + (r.cache_creation?.ephemeral_1h_input_tokens || 0);
}

function render(usageBuckets, costBuckets, groupBy) {
  const labels = usageBuckets.map((b) => b.starting_at.slice(0, 10));
  let totUncached = 0, totCacheRead = 0, totCacheWrite = 0, totOutput = 0;
  const dailyUncached = [], dailyCacheRead = [], dailyCacheWrite = [], dailyOutput = [];
  const groupTotals = new Map();

  for (const bucket of usageBuckets) {
    let bU = 0, bCR = 0, bCW = 0, bO = 0;
    for (const r of (bucket.results || [])) {
      bU += r.uncached_input_tokens || 0;
      bCR += r.cache_read_input_tokens || 0;
      bCW += cacheCreate(r);
      bO += r.output_tokens || 0;
      const key = r[groupBy] || "(default)";
      groupTotals.set(key, (groupTotals.get(key) || 0) + tokenTotal(r));
    }
    dailyUncached.push(bU); dailyCacheRead.push(bCR); dailyCacheWrite.push(bCW); dailyOutput.push(bO);
    totUncached += bU; totCacheRead += bCR; totCacheWrite += bCW; totOutput += bO;
  }

  const totalTokens = totUncached + totCacheRead + totCacheWrite + totOutput;
  const totalInput = totUncached + totCacheRead + totCacheWrite;
  const cacheHit = totalInput > 0 ? totCacheRead / totalInput : 0;

  const costLabels = costBuckets.map((b) => b.starting_at.slice(0, 10));
  const costPerDay = costBuckets.map((b) => (b.results || []).reduce((s, r) => s + Number(r.amount || 0), 0));
  const totalCostCents = costPerDay.reduce((s, v) => s + v, 0);
  const totalCostUsd = totalCostCents / 100;
  const idrRate = Number(loadSettings().idrRate || 16500);

  els.kpiTotalTokens.textContent = fmtInt.format(totalTokens);
  els.kpiTokenBreakdown.textContent = `${fmtInt.format(totUncached)} input · ${fmtInt.format(totOutput)} output · ${fmtInt.format(totCacheRead + totCacheWrite)} cache`;
  els.kpiTotalCost.textContent = fmtUsd.format(totalCostUsd);
  els.kpiCostIdr.textContent = `≈ ${fmtIdr.format(totalCostUsd * idrRate)}`;
  els.kpiCacheHit.textContent = fmtPct.format(cacheHit);

  const topGroup = [...groupTotals.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topGroup && totalTokens > 0) {
    els.kpiTopModel.textContent = shorten(topGroup[0]);
    els.kpiTopModel.title = topGroup[0];
    els.kpiTopModelShare.textContent = `${fmtPct.format(topGroup[1] / totalTokens)} dari total`;
  } else {
    els.kpiTopModel.textContent = "—";
    els.kpiTopModelShare.textContent = "—";
  }

  drawTokensChart(labels, dailyUncached, dailyCacheRead, dailyCacheWrite, dailyOutput);
  drawCostChart(costLabels, costPerDay.map((c) => c / 100));
  drawDoughnut("model", groupTotals);
  drawComposition({ "Input (uncached)": totUncached, "Cache read": totCacheRead, "Cache write": totCacheWrite, "Output": totOutput });

  renderTable(usageBuckets, groupBy);
}

function shorten(s) {
  if (!s) return "—";
  return s.length > 22 ? s.slice(0, 20) + "…" : s;
}

function destroy(name) {
  if (charts[name]) { charts[name].destroy(); charts[name] = null; }
}

function drawTokensChart(labels, uncached, cacheRead, cacheWrite, output) {
  destroy("tokens");
  const ctx = document.getElementById("chartTokens").getContext("2d");
  charts.tokens = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Input (uncached)", data: uncached, backgroundColor: "#4a7fc1" },
        { label: "Cache write",      data: cacheWrite, backgroundColor: "#c17c3e" },
        { label: "Cache read",       data: cacheRead, backgroundColor: "#5a8a3a" },
        { label: "Output",           data: output, backgroundColor: "#8b5a2b" },
      ],
    },
    options: stackedBarOpts(),
  });
}

function drawCostChart(labels, dailyCostUsd) {
  destroy("cost");
  const ctx = document.getElementById("chartCost").getContext("2d");
  charts.cost = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "USD",
        data: dailyCostUsd,
        borderColor: "#c0392b",
        backgroundColor: "rgba(192,57,43,.15)",
        fill: true,
        tension: .25,
        pointRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => fmtUsd.format(ctx.parsed.y) } } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => "$" + Number(v).toFixed(2) } },
        x: { ticks: { maxRotation: 0, autoSkip: true } },
      },
    },
  });
}

function drawDoughnut(name, groupTotals) {
  destroy(name);
  const entries = [...groupTotals.entries()].sort((a, b) => b[1] - a[1]);
  const labels = entries.map((e) => e[0]);
  const data = entries.map((e) => e[1]);
  const colors = labels.map((_, i) => PALETTE[i % PALETTE.length]);
  const ctx = document.getElementById("chartModel").getContext("2d");
  charts[name] = new Chart(ctx, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmtInt.format(ctx.parsed)} token` } },
      },
      cutout: "55%",
    },
  });
}

function drawComposition(map) {
  destroy("composition");
  const labels = Object.keys(map);
  const data = labels.map((k) => map[k]);
  const colors = ["#4a7fc1", "#5a8a3a", "#c17c3e", "#8b5a2b"];
  const ctx = document.getElementById("chartComposition").getContext("2d");
  charts.composition = new Chart(ctx, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmtInt.format(ctx.parsed)} token` } },
      },
      cutout: "55%",
    },
  });
}

function stackedBarOpts() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtInt.format(ctx.parsed.y)}` } },
    },
    scales: {
      x: { stacked: true, ticks: { maxRotation: 0, autoSkip: true } },
      y: { stacked: true, beginAtZero: true, ticks: { callback: (v) => fmtInt.format(v) } },
    },
  };
}

function renderTable(buckets, groupBy) {
  els.thGroup.textContent = groupBy.replace(/_/g, " ");
  const rows = [];
  for (const bucket of buckets) {
    const date = bucket.starting_at.slice(0, 10);
    for (const r of (bucket.results || [])) {
      rows.push({
        date,
        group: r[groupBy] || "(default)",
        uncached: r.uncached_input_tokens || 0,
        cacheWrite: cacheCreate(r),
        cacheRead: r.cache_read_input_tokens || 0,
        output: r.output_tokens || 0,
        total: tokenTotal(r),
      });
    }
  }
  rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.total - a.total));
  els.rowCount.textContent = `${rows.length} baris`;
  els.tbody.innerHTML = rows.map((r) => `
    <tr>
      <td>${r.date}</td>
      <td>${escapeHtml(String(r.group))}</td>
      <td class="num">${fmtInt.format(r.uncached)}</td>
      <td class="num">${fmtInt.format(r.cacheWrite)}</td>
      <td class="num">${fmtInt.format(r.cacheRead)}</td>
      <td class="num">${fmtInt.format(r.output)}</td>
      <td class="num"><strong>${fmtInt.format(r.total)}</strong></td>
    </tr>
  `).join("");
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// --- Settings dialog ---
function openSettings() {
  const s = loadSettings();
  els.formSettings.workerUrl.value = s.workerUrl || "";
  els.formSettings.dashboardKey.value = s.dashboardKey || "";
  els.formSettings.idrRate.value = s.idrRate || 16500;
  els.dlg.showModal();
}
els.btnSettings.addEventListener("click", openSettings);
els.dlg.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => els.dlg.close()));
els.formSettings.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(els.formSettings);
  saveSettings({
    workerUrl: String(fd.get("workerUrl") || "").trim().replace(/\/$/, ""),
    dashboardKey: String(fd.get("dashboardKey") || "").trim(),
    idrRate: Number(fd.get("idrRate") || 16500),
  });
  els.dlg.close();
  toast("Tersimpan");
  refresh();
});

els.btnRefresh.addEventListener("click", refresh);
els.bucketWidth.addEventListener("change", refresh);
els.groupBy.addEventListener("change", refresh);
els.dateFrom.addEventListener("change", () => { setActiveQuick(null); refresh(); });
els.dateTo.addEventListener("change", () => { setActiveQuick(null); refresh(); });
els.quickRanges.forEach((c) => c.addEventListener("click", () => {
  const days = Number(c.dataset.range);
  setQuickRange(days);
  refresh();
}));

function setActiveQuick(days) {
  els.quickRanges.forEach((c) => c.classList.toggle("active", days != null && Number(c.dataset.range) === days));
}

// Init
setQuickRange(30);
const initial = loadSettings();
if (initial.workerUrl && initial.dashboardKey) {
  refresh();
} else {
  toast("Set Worker URL dulu di ⚙️ Pengaturan", false);
  setTimeout(openSettings, 400);
}
