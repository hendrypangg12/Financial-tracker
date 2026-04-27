// Cloud Sync untuk BerBisnis ↔ Berstock Bot
// Push data localStorage ke Cloudflare Worker supaya bot Telegram bisa baca.

const CLOUD_SYNC_KEY = "tokountung-cloud-config";

function loadCloudConfig() {
  try {
    return JSON.parse(localStorage.getItem(CLOUD_SYNC_KEY) || "{}");
  } catch { return {}; }
}

function saveCloudConfig(cfg) {
  localStorage.setItem(CLOUD_SYNC_KEY, JSON.stringify(cfg));
}

function getCloudConfig() { return loadCloudConfig(); }

async function syncToCloud(opts = {}) {
  const cfg = loadCloudConfig();
  if (!cfg.workerUrl || !cfg.tenantId || !cfg.apiKey) {
    throw new Error("Cloud sync belum dikonfigurasi. Isi di Pengaturan dulu.");
  }

  const payload = {
    tenant_id: cfg.tenantId,
    api_key: cfg.apiKey,
    data: {
      products: state.products || [],
      sales: state.sales || [],
      settings: state.settings || {},
      kategori: state.kategori || [],
    },
  };

  const url = cfg.workerUrl.replace(/\/$/, "") + "/api/sync";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);

  cfg.lastSync = new Date().toISOString();
  cfg.lastSyncCounts = result.counts;
  saveCloudConfig(cfg);

  return result;
}

function setupCloudSyncForm() {
  const form = document.getElementById("form-cloud-sync");
  if (!form) return;

  // Pre-fill dari localStorage
  const cfg = loadCloudConfig();
  form.querySelector('[name="workerUrl"]').value = cfg.workerUrl || "";
  form.querySelector('[name="tenantId"]').value = cfg.tenantId || "";
  form.querySelector('[name="apiKey"]').value = cfg.apiKey || "";

  // Update status display
  updateCloudStatus();

  // Save config
  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    saveCloudConfig({
      ...loadCloudConfig(),
      workerUrl: (fd.get("workerUrl") || "").trim(),
      tenantId: (fd.get("tenantId") || "").trim(),
      apiKey: (fd.get("apiKey") || "").trim(),
    });
    showToast("Cloud config disimpan", "success");
    updateCloudStatus();
  };

  // Sync now button
  document.getElementById("btn-sync-now").onclick = async () => {
    const btn = document.getElementById("btn-sync-now");
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "🔄 Sync...";
    try {
      const result = await syncToCloud();
      showToast(`✅ Berhasil! ${result.counts.products} produk, ${result.counts.sales} transaksi`, "success");
      updateCloudStatus();
    } catch (err) {
      showToast(`❌ Gagal: ${err.message}`, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  };

  // Auto-sync toggle
  const autoToggle = document.getElementById("auto-sync-toggle");
  if (autoToggle) {
    autoToggle.checked = !!cfg.autoSync;
    autoToggle.onchange = () => {
      saveCloudConfig({ ...loadCloudConfig(), autoSync: autoToggle.checked });
      showToast(autoToggle.checked ? "Auto-sync aktif (setiap 5 menit)" : "Auto-sync mati", "info");
      if (autoToggle.checked) startAutoSync();
      else stopAutoSync();
    };
  }
}

function updateCloudStatus() {
  const cfg = loadCloudConfig();
  const el = document.getElementById("cloud-status");
  if (!el) return;
  if (!cfg.tenantId) {
    el.innerHTML = "<span style='color:#f59e0b'>⚠️ Belum dikonfigurasi</span>";
    return;
  }
  if (!cfg.lastSync) {
    el.innerHTML = `<span style='color:#3b82f6'>✓ Terkonfigurasi (belum pernah sync)</span>`;
    return;
  }
  const last = new Date(cfg.lastSync);
  const ago = formatTimeAgo(last);
  const counts = cfg.lastSyncCounts || {};
  el.innerHTML = `<span style='color:#10b981'>✅ Last sync: ${ago}</span> · ${counts.products || 0} produk, ${counts.sales || 0} transaksi`;
}

function formatTimeAgo(date) {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec} detik lalu`;
  if (sec < 3600) return `${Math.floor(sec / 60)} menit lalu`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} jam lalu`;
  return date.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
}

// Auto-sync interval (5 minutes)
let autoSyncInterval = null;
function startAutoSync() {
  if (autoSyncInterval) clearInterval(autoSyncInterval);
  autoSyncInterval = setInterval(async () => {
    const cfg = loadCloudConfig();
    if (!cfg.autoSync) return;
    try {
      await syncToCloud();
      updateCloudStatus();
    } catch (err) {
      console.warn("Auto-sync failed:", err.message);
    }
  }, 5 * 60 * 1000);
}
function stopAutoSync() {
  if (autoSyncInterval) clearInterval(autoSyncInterval);
  autoSyncInterval = null;
}

// Init auto-sync on load if enabled
document.addEventListener("DOMContentLoaded", () => {
  const cfg = loadCloudConfig();
  if (cfg.autoSync) startAutoSync();
});
