// AI Advisor — Beruang Akuntan Gemoy
// Pro-only feature: chat dengan Claude API via Cloudflare Worker

const AI_ADVISOR_ENDPOINT = "https://berstock-bot.hendrypangg12.workers.dev/api/advise";

let aiAdvisorInited = false;
let aiAdvisorSending = false;

function initAIAdvisor() {
  if (aiAdvisorInited) return;
  aiAdvisorInited = true;

  const fab = document.getElementById("ai-fab");
  const panel = document.getElementById("ai-chat-panel");
  const overlay = document.getElementById("ai-chat-overlay");
  const closeBtn = document.getElementById("ai-chat-close");
  const form = document.getElementById("ai-chat-form");
  const input = document.getElementById("ai-chat-input");
  const paywall = document.getElementById("ai-paywall-modal");
  const paywallClose = document.getElementById("ai-paywall-close");
  const paywallUpgrade = document.getElementById("ai-paywall-upgrade");

  if (!fab) return;

  // Tap FAB → buka chat (kalau Pro) atau paywall (kalau Free)
  fab.addEventListener("click", () => {
    const profile = typeof currentProfile !== "undefined" ? currentProfile : null;
    const userIsPro = typeof isPro === "function" && isPro(profile);
    if (userIsPro) {
      openAIChat();
    } else {
      openPaywall();
    }
  });

  // Close handlers
  closeBtn?.addEventListener("click", closeAIChat);
  overlay?.addEventListener("click", closeAIChat);
  paywallClose?.addEventListener("click", closePaywall);
  paywall?.addEventListener("click", (e) => {
    if (e.target === paywall) closePaywall();
  });

  // Upgrade button — tutup paywall, scroll ke pricing
  paywallUpgrade?.addEventListener("click", () => {
    closePaywall();
    // Trigger paywall screen biar bisa upgrade
    if (typeof showPaywallScreen === "function") {
      showPaywallScreen();
    } else {
      // Fallback — scroll ke section upgrade
      const upgradeBtn = document.querySelector("[data-paket]");
      upgradeBtn?.scrollIntoView({ behavior: "smooth" });
    }
  });

  // Suggestion chips
  document.getElementById("ai-chips")?.addEventListener("click", (e) => {
    const chip = e.target.closest(".ai-chip");
    if (!chip) return;
    const q = chip.dataset.q;
    if (q) {
      input.value = q;
      sendQuestion(q);
    }
  });

  // Form submit
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    sendQuestion(q);
  });
}

function showAIFab() {
  const fab = document.getElementById("ai-fab");
  if (fab) fab.hidden = false;
}

function openAIChat() {
  document.getElementById("ai-chat-overlay").hidden = false;
  document.getElementById("ai-chat-panel").hidden = false;
  setupVisualViewportListener();
  setTimeout(() => document.getElementById("ai-chat-input")?.focus(), 200);
}

function closeAIChat() {
  document.getElementById("ai-chat-overlay").hidden = true;
  document.getElementById("ai-chat-panel").hidden = true;
  teardownVisualViewportListener();
}

/**
 * Handle iOS / Android keyboard appear/disappear.
 * Pas keyboard muncul, viewport height berkurang.
 * Adjust chat panel height pakai visualViewport API supaya input field
 * tetep visible di atas keyboard.
 */
let vvListener = null;
function setupVisualViewportListener() {
  if (!window.visualViewport) return; // Browser lama, skip
  const panel = document.getElementById("ai-chat-panel");
  if (!panel) return;

  vvListener = () => {
    const vh = window.visualViewport.height;
    panel.style.height = `${vh}px`;
    panel.style.maxHeight = `${vh}px`;
    // Scroll chat body ke bawah biar latest message keliatan
    const body = document.getElementById("ai-chat-body");
    if (body) body.scrollTop = body.scrollHeight;
  };
  window.visualViewport.addEventListener("resize", vvListener);
  window.visualViewport.addEventListener("scroll", vvListener);
  vvListener(); // trigger sekali
}

function teardownVisualViewportListener() {
  if (!window.visualViewport || !vvListener) return;
  window.visualViewport.removeEventListener("resize", vvListener);
  window.visualViewport.removeEventListener("scroll", vvListener);
  const panel = document.getElementById("ai-chat-panel");
  if (panel) {
    panel.style.height = "";
    panel.style.maxHeight = "";
  }
  vvListener = null;
}

function openPaywall() {
  document.getElementById("ai-paywall-modal").hidden = false;
}
function closePaywall() {
  document.getElementById("ai-paywall-modal").hidden = true;
}

async function sendQuestion(question) {
  if (aiAdvisorSending) return;
  aiAdvisorSending = true;

  const body = document.getElementById("ai-chat-body");
  const input = document.getElementById("ai-chat-input");
  const sendBtn = document.getElementById("ai-chat-send");

  // Hide chips after first send
  const chips = document.getElementById("ai-chips");
  if (chips) chips.style.display = "none";

  // Render user bubble
  appendBubble(question, "user");
  input.value = "";
  sendBtn.disabled = true;

  // Render typing indicator
  const typing = document.createElement("div");
  typing.className = "ai-bubble-typing";
  typing.innerHTML = "<span></span><span></span><span></span>";
  body.appendChild(typing);
  body.scrollTop = body.scrollHeight;

  // Build context from current state
  const context = buildAdvisorContext();
  const email = (typeof currentUser !== "undefined" && currentUser?.email) || "anonymous@local";

  try {
    const res = await fetch(AI_ADVISOR_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, question, context }),
    });

    const data = await res.json();
    typing.remove();

    if (data.reply) {
      appendBubble(data.reply, "bot");
    } else if (data.error) {
      appendBubble(`Bos, ada error: ${data.error}. Coba lagi ya 🐻`, "bot");
    } else {
      appendBubble("Bos, response gak ke-detect. Coba tanya lagi ya 🐻", "bot");
    }

    // Update quota info
    if (data.quota) {
      const quotaEl = document.getElementById("ai-quota-info");
      if (quotaEl) {
        quotaEl.textContent = `💎 Pro • ${data.quota.used}/${data.quota.limit} query hari ini`;
      }
    }
  } catch (err) {
    typing.remove();
    appendBubble(
      "Bos, koneksi error. Cek internet kamu ya, atau coba beberapa menit lagi 🐻",
      "bot"
    );
    console.error("AI Advisor error:", err);
  } finally {
    aiAdvisorSending = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

function appendBubble(text, who) {
  const body = document.getElementById("ai-chat-body");
  const bubble = document.createElement("div");
  bubble.className = `ai-bubble ai-bubble-${who}`;
  if (who === "bot") {
    bubble.innerHTML = `<div class="ai-bubble-meta">🐻 Beruang Akuntan</div>` + escapeHtml(text);
  } else {
    bubble.textContent = text;
  }
  body.appendChild(bubble);
  body.scrollTop = body.scrollHeight;
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

/**
 * Build context object dari state app (transaksi user)
 */
function buildAdvisorContext() {
  if (typeof state === "undefined" || !state.transactions) return null;

  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
  const monthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  // Filter transaksi bulan ini
  const thisMonth = state.transactions.filter((t) => {
    const d = new Date(t.tanggal);
    return d.getMonth() === curMonth && d.getFullYear() === curYear;
  });

  // Filter bulan lalu (untuk comparison)
  const lastMonth = state.transactions.filter((t) => {
    const d = new Date(t.tanggal);
    const lastMonthYear = curMonth === 0 ? curYear - 1 : curYear;
    const lastMonthIdx = curMonth === 0 ? 11 : curMonth - 1;
    return d.getMonth() === lastMonthIdx && d.getFullYear() === lastMonthYear;
  });

  const sumByJenis = (arr, jenis) =>
    arr.filter((t) => t.jenis === jenis).reduce((sum, t) => sum + (t.jumlah || 0), 0);

  const totalPemasukan = sumByJenis(thisMonth, "pemasukan");
  const totalPengeluaran = sumByJenis(thisMonth, "pengeluaran");
  const sisaSaldo = totalPemasukan - totalPengeluaran;

  const lastPemasukan = sumByJenis(lastMonth, "pemasukan");
  const lastPengeluaran = sumByJenis(lastMonth, "pengeluaran");

  const pctChange = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  // Category breakdown (pengeluaran)
  const catMap = {};
  thisMonth.filter((t) => t.jenis === "pengeluaran").forEach((t) => {
    const cat = t.kategori || "Lain";
    catMap[cat] = (catMap[cat] || 0) + (t.jumlah || 0);
  });
  const categoryBreakdown = Object.entries(catMap)
    .map(([name, total]) => ({
      name,
      total,
      pct: totalPengeluaran > 0 ? Math.round((total / totalPengeluaran) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Recent transactions (last 10)
  const recentTransactions = thisMonth
    .slice()
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
    .slice(0, 10)
    .map((t) => ({
      tanggal: t.tanggal,
      desc: t.deskripsi || t.desc || "",
      jenis: t.jenis,
      jumlah: t.jumlah,
      kategori: t.kategori,
    }));

  return {
    monthName,
    totalPemasukan,
    totalPengeluaran,
    sisaSaldo,
    totalTransaksi: thisMonth.length,
    compareIncome: pctChange(totalPemasukan, lastPemasukan),
    compareExpense: pctChange(totalPengeluaran, lastPengeluaran),
    categoryBreakdown,
    recentTransactions,
  };
}

// Expose globals
window.initAIAdvisor = initAIAdvisor;
window.showAIFab = showAIFab;
