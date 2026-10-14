// AI Advisor — Ruvy Gemoy
// Pro-only feature: chat dengan Claude API via Cloudflare Worker

const AI_ADVISOR_ENDPOINT = "https://berstock-bot.hendrypangg12.workers.dev/api/advise";

let aiAdvisorInited = false;
let aiAdvisorSending = false;

function advisorText(id, en) {
  return typeof getAppLanguage === 'function' && getAppLanguage() === 'en' ? en : id;
}

function advisorPreferences() {
  return {
    language: typeof getAppLanguage === 'function' ? getAppLanguage() : 'id',
    locale: typeof getAppLocale === 'function' ? getAppLocale() : 'id-ID',
    currency: typeof getAccountCurrency === 'function' ? getAccountCurrency() : 'IDR',
  };
}

function advisorSuggestion(question) {
  const suggestions = {
    'Pengeluaran aku bulan ini gimana?': 'How are my expenses this month?',
    'Saran hemat buat aku apa?': 'How can I save more based on my records?',
    'Bandingkan bulan ini sama bulan lalu': 'Compare this month with last month.',
    'Kategori pengeluaran terbesarku apa?': 'What are my largest expense categories?',
  };
  return advisorText(question, suggestions[question] || question);
}

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
    const userIsPro = typeof hasAIAccess === "function" && hasAIAccess(profile);
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

  // Tombol "← Kembali ke Home" (top of panel, always visible)
  document.getElementById("ai-chat-back")?.addEventListener("click", closeAIChat);
  paywall?.addEventListener("click", (e) => {
    if (e.target === paywall) closePaywall();
  });

  // Upgrade button — tutup paywall, scroll ke pricing
  paywallUpgrade?.addEventListener("click", () => {
    closePaywall();
    if (typeof window.showScreen === 'function') { window.showScreen('paywall'); return; }
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
    const q = advisorSuggestion(chip.dataset.q);
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

function markGuideAI() {
  try {
    const uid = (typeof currentUser !== "undefined" && currentUser?.uid) || "local";
    localStorage.setItem("beruang-guide-ai:" + uid, "1");
  } catch (_) {}
}

function openAIChat() {
  markGuideAI();
  if (typeof trackOnce === "function") trackOnce("ai_open");
  document.getElementById("ai-chat-overlay").hidden = false;
  document.getElementById("ai-chat-panel").hidden = false;
  // NOTE: visualViewport listener di-disable — bikin layout broken di iOS Safari.
  // iOS Safari sendiri udah handle keyboard via position:fixed+bottom:0.
  setTimeout(() => document.getElementById("ai-chat-input")?.focus(), 200);
}

function closeAIChat() {
  document.getElementById("ai-chat-overlay").hidden = true;
  document.getElementById("ai-chat-panel").hidden = true;
}

function resetAdvisorWallet() {
  closeAIChat();
  const body = document.getElementById('ai-chat-body');
  if (!body) return;
  body.querySelectorAll('.ai-bubble-user, .ai-bubble-bot:not(#ai-greeting), .ai-bubble-typing').forEach(item => item.remove());
  const chips = document.getElementById('ai-chips');
  if (chips) chips.style.display = '';
  const input = document.getElementById('ai-chat-input');
  if (input) input.value = '';
}

function openPaywall() {
  markGuideAI();
  if (typeof trackOnce === "function") trackOnce("ai_locked");
  const profile = typeof currentProfile !== "undefined" ? currentProfile : null;
  const sub = document.querySelector("#ai-paywall-modal .ai-paywall-sub");
  if (sub) {
    sub.textContent = typeof isFreeTrial === "function" && isFreeTrial(profile)
      ? advisorText("Uji coba gratis belum termasuk AI. Aktifkan paket berbayar untuk ngobrol dengan Ruvy.", "The free trial does not include AI. Choose a paid plan to get insights from Ruvy AI.")
      : advisorText("Insight AI dari catatan keuanganmu — khusus Pro", "AI insights from your financial records — available with Pro");
  }
  const upgrade = document.getElementById('ai-paywall-upgrade');
  if (upgrade) upgrade.textContent = advisorText('💎 Lihat Paket Pro', '💎 View Pro Plans');
  const note = document.querySelector('#ai-paywall-modal .ai-paywall-note');
  if (note) note.textContent = advisorText('Harga dan rincian paket ditampilkan sebelum pembelian.', 'Prices and plan details are shown before purchase.');
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
      headers: { ...await authenticatedHeaders(), 'Accept-Language': advisorPreferences().language },
      body: JSON.stringify({ email, question, context }),
    });

    const data = await res.json();
    typing.remove();

    if (data.reply) {
      appendBubble(data.reply, "bot");
      if (res.ok && typeof trackOnce === "function") trackOnce("ai_ask");
    } else if (data.error) {
      appendBubble(data.error, "bot");
    } else {
      appendBubble(advisorText("Bos, jawaban belum tersedia. Coba tanya lagi ya 🐻", "I couldn't create a reply. Please try again. 🐻"), "bot");
    }

    // Update quota info
    if (data.quota) {
      const quotaEl = document.getElementById("ai-quota-info");
      if (quotaEl) {
        quotaEl.textContent = advisorText(`💎 Pro • ${data.quota.used}/${data.quota.limit} pertanyaan hari ini`, `💎 Pro • ${data.quota.used}/${data.quota.limit} questions today`);
      }
    }
  } catch (err) {
    typing.remove();
    appendBubble(
      advisorText("Bos, koneksi error. Cek internet kamu ya, atau coba beberapa menit lagi 🐻", "Connection failed. Check your internet or try again in a few minutes. 🐻"),
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
    bubble.innerHTML = `<div class="ai-bubble-meta">${advisorText('🐻 Ruvy', '🐻 Ruvy AI')}</div>` + escapeHtml(text);
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
  if (typeof state === "undefined" || !getFinancialState().transactions) return null;

  const preferences = advisorPreferences();

  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
  const monthName = now.toLocaleDateString(preferences.locale, { month: "long", year: "numeric" });

  // Filter transaksi bulan ini
  const cashflowTransactions = (getFinancialState().transactions || []).filter(t => !isOpeningBalanceTransaction(t));
  const thisMonth = cashflowTransactions.filter((t) => {
    const d = parseISO(t.tanggal);
    return d.getMonth() === curMonth && d.getFullYear() === curYear;
  });

  // Filter bulan lalu (untuk comparison)
  const lastMonth = cashflowTransactions.filter((t) => {
    const d = parseISO(t.tanggal);
    const lastMonthYear = curMonth === 0 ? curYear - 1 : curYear;
    const lastMonthIdx = curMonth === 0 ? 11 : curMonth - 1;
    return d.getMonth() === lastMonthIdx && d.getFullYear() === lastMonthYear;
  });

  const sumByJenis = (arr, jenis) =>
    arr.filter((t) => t.jenis === jenis).reduce((sum, t) => sum + (Number(t.jumlah) || 0), 0);

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
    const cat = t.kategori || advisorText('Lain', 'Other');
    catMap[cat] = (catMap[cat] || 0) + (Number(t.jumlah) || 0);
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
    .sort((a, b) => parseISO(b.tanggal) - parseISO(a.tanggal))
    .slice(0, 10)
    .map((t) => ({
      tanggal: t.tanggal,
      desc: t.deskripsi || t.desc || "",
      jenis: t.jenis,
      jumlah: t.jumlah,
      kategori: t.kategori,
    }));

  // Aset / kekayaan (di luar cashflow bulanan)
  const assets = Array.isArray(getFinancialState().assets) ? getFinancialState().assets : [];
  const assetTotal = assets.reduce((s, a) => s + (Number(a.jumlah) || 0), 0);
  const assetBreakdown = assets.map((a) => ({
    jenis: a.jenis || "lainnya",
    nama: a.nama || a.jenis || advisorText('Aset', 'Asset'),
    jumlah: Number(a.jumlah) || 0,
  }));

  // Hutang & piutang (yang belum lunas)
  const hutangs = Array.isArray(getFinancialState().hutangs) ? getFinancialState().hutangs : [];
  const piutangTotal = hutangs
    .filter((h) => h.jenis === "piutang" && !h.lunas)
    .reduce((s, h) => s + (Number(h.nominal) || 0), 0);
  const hutangTotal = hutangs
    .filter((h) => h.jenis === "hutang" && !h.lunas)
    .reduce((s, h) => s + (Number(h.nominal) || 0), 0);

  // Riwayat 6 bulan (bulan ini + 5 sebelumnya) — ringkasan per bulan biar AI bisa baca tren
  const monthlyHistory = [];
  for (let back = 5; back >= 0; back--) {
    const ref = new Date(curYear, curMonth - back, 1);
    const m = ref.getMonth(), y = ref.getFullYear();
    const txs = cashflowTransactions.filter((t) => {
      const d = parseISO(t.tanggal);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    if (!txs.length && !monthlyHistory.length) continue; // lewati bulan kosong di awal
    const pemasukan = sumByJenis(txs, "pemasukan");
    const pengeluaran = sumByJenis(txs, "pengeluaran");
    const cats = {};
    txs.filter((t) => t.jenis === "pengeluaran").forEach((t) => {
      const cat = t.kategori || advisorText('Lain', 'Other');
      cats[cat] = (cats[cat] || 0) + (Number(t.jumlah) || 0);
    });
    monthlyHistory.push({
      bulan: ref.toLocaleDateString(preferences.locale, { month: "short", year: "numeric" }),
      pemasukan,
      pengeluaran,
      sisa: pemasukan - pengeluaran,
      jumlahTransaksi: txs.length,
      topKategori: Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([name, total]) => ({ name, total })),
    });
  }

  return {
    ...preferences,
    userName: (state.userName || "").trim() || null,
    monthName,
    wallet: typeof getActiveWallet === 'function' ? { name: getActiveWallet().name, currency: getAccountCurrency() } : null,
    monthlyHistory,
    totalPemasukan,
    totalPengeluaran,
    sisaSaldo,
    tabunganBulanIni: sisaSaldo, // pemasukan - pengeluaran = yang bisa ditabung bulan ini
    totalTransaksi: thisMonth.length,
    compareIncome: pctChange(totalPemasukan, lastPemasukan),
    compareExpense: pctChange(totalPengeluaran, lastPengeluaran),
    categoryBreakdown,
    recentTransactions,
    assetTotal,
    assetBreakdown,
    piutangTotal,
    hutangTotal,
  };
}

// ============ PROMO AI di dashboard (sekali, dismissible) ============
function aiPromoKey() {
  const email = (typeof currentUser !== "undefined" && currentUser && currentUser.email) || "local";
  return "beruang-ai-promo:" + email;
}
function renderAIPromo() {
  const el = document.getElementById("ai-promo");
  if (!el) return;
  let seen = false;
  try { seen = localStorage.getItem(aiPromoKey()) === "1"; } catch (_) {}
  if (seen) { el.hidden = true; el.innerHTML = ""; return; }
  el.hidden = false;
  el.innerHTML = `
    <div class="ai-promo-card">
      <button class="ai-promo-x" aria-label="${advisorText('Tutup', 'Close')}">×</button>
      <img class="ai-promo-emoji" src="assets/icons/ruvy-192.png" alt="" />
      <div class="ai-promo-body">
        <div class="ai-promo-title">${advisorText('Tanya <b>Ruvy</b> 🤖', 'Ask <b>Ruvy AI</b> 🤖')}</div>
        <div class="ai-promo-sub">${advisorText('Tanya <i>"kapan aku bisa beli HP baru?"</i> atau <i>"pengeluaran mana yang bisa dikurangi?"</i> — dijawab pakai catatan keuanganmu.', 'Ask <i>"when can I afford a new phone?"</i> or <i>"where could I spend less?"</i> — get insights from your own financial records.')}</div>
        <button class="ai-promo-cta">${advisorText('✨ Coba Sekarang', '✨ Try Now')}</button>
      </div>
    </div>`;
  const dismiss = () => { try { localStorage.setItem(aiPromoKey(), "1"); } catch (_) {} el.hidden = true; el.innerHTML = ""; };
  el.querySelector(".ai-promo-x").onclick = dismiss;
  el.querySelector(".ai-promo-cta").onclick = () => {
    dismiss();
    const profile = typeof currentProfile !== "undefined" ? currentProfile : null;
    const userIsPro = typeof hasAIAccess === "function" && hasAIAccess(profile);
    if (userIsPro) { if (typeof openAIChat === "function") openAIChat(); }
    else { if (typeof openPaywall === "function") openPaywall(); }
  };
}

// Expose globals
window.initAIAdvisor = initAIAdvisor;
window.showAIFab = showAIFab;
window.renderAIPromo = renderAIPromo;
