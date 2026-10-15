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

  // Ruvy is the single place to record: typing and receipt photos work for everyone,
  // only free-form questions need a paid AI plan (checked when the question is sent).
  fab.addEventListener("click", openAIChat);
  document.querySelectorAll("[data-open-ruvy]").forEach(btn => btn.addEventListener("click", openAIChat));
  document.getElementById("ruvy-receipt-input")?.addEventListener("change", handleRuvyReceipt);
  // Manual form stays available (e.g. to fix what the parser got wrong), tucked in the Tambah tab.
  document.getElementById("ai-chat-manual")?.addEventListener("click", () => {
    closeAIChat();
    const manual = document.querySelector("#tab-tambah .manual-entry");
    if (manual) manual.open = true;
    if (typeof switchBeruangTab === "function") switchBeruangTab("tambah");
    document.getElementById("quick-form-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    if (chip.dataset.record) { input.value = chip.dataset.record; input.focus(); return; }
    const q = advisorSuggestion(chip.dataset.q);
    if (q) {
      input.value = q;
      handleRuvyInput(q);
    }
  });

  // Form submit
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    handleRuvyInput(q);
  });
}

function ruvyHasAI() {
  const profile = typeof currentProfile !== "undefined" ? currentProfile : null;
  return typeof hasAIAccess === "function" && hasAIAccess(profile);
}
// "?" or a leading question word means "ask the AI"; everything else is tried as an entry
// first, so "bakso 25rb dari dompet utama" never spends AI tokens.
function looksLikeQuestion(text) {
  return /\?\s*$/.test(text) || /^(berapa|apa|apakah|gimana|bagaimana|kenapa|mengapa|kapan|kalau|jika|bandingkan|saran|tips|analisa|analisis|how|what|why|when|should|compare|which)\b/i.test(text.trim());
}
function handleRuvyInput(text) {
  if (aiAdvisorSending) return;
  const input = document.getElementById("ai-chat-input");
  const chips = document.getElementById("ai-chips");
  if (!looksLikeQuestion(text) && typeof parseChatForWallet === "function") {
    if (document.body.classList.contains("app-locked") || (typeof isAccessLocked === "function" && isAccessLocked())) {
      appendBubble(text, "user"); input.value = "";
      appendBubble(advisorText("Akses akun terkunci. Pilih paket untuk lanjut mencatat.", "Account access is locked. Choose a plan to keep recording."), "bot");
      return;
    }
    const out = parseChatForWallet(text);
    if (out && !out.error) {
      if (chips) chips.style.display = "none";
      appendBubble(text, "user"); input.value = "";
      try { addTransaction(out.parsed, out.wallet.id); }
      catch (_) { appendBubble(advisorText("Belum bisa mencatat. Periksa nominalnya lalu coba lagi.", "Could not record this. Check the amount and try again."), "bot"); return; }
      appendRecordedBubble(out.parsed, out.wallet);
      if (typeof renderAll === "function") renderAll();
      if (typeof window.maybeAskReview === "function") setTimeout(() => window.maybeAskReview(), 1500);
      return;
    }
    // No amount at all reads as a question; any other parse problem is shown as-is.
    const noAmount = out && /jumlah uang|No amount/i.test(out.error || "");
    if (!noAmount || !ruvyHasAI()) {
      appendBubble(text, "user"); input.value = "";
      appendBubble((out && out.error ? out.error + " " : "") + advisorText("Contoh: \"bakso 25rb dari dompet utama\" atau \"gaji 8jt\".", "Example: \"coffee 4.50\" or \"salary 2500\"."), "bot");
      if (noAmount && !ruvyHasAI()) openPaywall();
      return;
    }
  }
  if (!ruvyHasAI()) {
    appendBubble(text, "user"); input.value = "";
    appendBubble(advisorText("Mencatat transaksi gratis. Untuk bertanya ke AI, aktifkan paket berbayar.", "Recording is free. Asking the AI needs a paid plan."), "bot");
    openPaywall();
    return;
  }
  sendQuestion(text);
}
function appendRecordedBubble(t, wallet) {
  const money = typeof formatWalletMoney === "function" ? formatWalletMoney(t.jumlah, wallet.currency) : formatRupiah(t.jumlah);
  appendBubble(advisorText("✅ Dicatat: ", "✅ Recorded: ") + (t.jenis === "pemasukan" ? "+" : "−") + money + " · " + (t.deskripsi || t.subKategori)
    + "\n" + t.subKategori + " (" + t.kategori + ") · " + wallet.name + " · " + formatTanggal(t.tanggal), "bot");
  const bubble = document.getElementById("ai-chat-body").lastElementChild;
  const edit = document.createElement("button");
  edit.type = "button"; edit.className = "ai-chip ruvy-edit-chip"; edit.textContent = advisorText("✏️ Ubah", "✏️ Edit");
  edit.onclick = () => {
    closeAIChat();
    if (typeof getActiveWalletId === "function" && getActiveWalletId() !== wallet.id && !selectWallet(wallet.id)) return;
    if (typeof openEditModal === "function") openEditModal(t.id);
  };
  bubble.appendChild(edit);
}
// Receipt photo: free on-device OCR (same engine and Pro rule as before), then Ruvy
// shows the total for confirmation before anything is saved.
async function handleRuvyReceipt(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!file || aiAdvisorSending) return;
  if (typeof isPro === "function" && !isPro(currentProfile)) {
    appendBubble(advisorText("Baca foto struk tersedia di paket berbayar. Sementara, ketik saja totalnya, mis. \"indomaret 86rb\".", "Receipt photos need a paid plan. For now, type the total, e.g. \"groceries 86.50\"."), "bot");
    return;
  }
  if (typeof readReceiptPhoto !== "function") return;
  const chips = document.getElementById("ai-chips");
  if (chips) chips.style.display = "none";
  appendBubble(advisorText("📷 Foto struk", "📷 Receipt photo"), "user");
  appendBubble(advisorText("Membaca struk…", "Reading the receipt…"), "bot");
  const status = document.getElementById("ai-chat-body").lastElementChild;
  aiAdvisorSending = true;
  try {
    const text = await readReceiptPhoto(file, pct => { status.lastChild.textContent = advisorText("Membaca struk… ", "Reading the receipt… ") + pct + "%"; });
    status.remove();
    const res = text ? parseStruk(text, todayISO()) : { error: "empty" };
    const input = document.getElementById("ai-chat-input");
    if (!res || res.error) {
      appendBubble(advisorText("Total struk belum terbaca. Ketik saja, mis. \"indomaret 86rb\".", "I couldn't find the total. Type it instead, e.g. \"groceries 86.50\"."), "bot");
      input.focus();
      return;
    }
    const wallet = getActiveWallet();
    const { items, ...toSave } = res;
    appendBubble(advisorText("Struk terbaca: ", "Receipt read: ") + (toSave.deskripsi || "") + " · " + (typeof formatWalletMoney === "function" ? formatWalletMoney(toSave.jumlah, wallet.currency) : formatRupiah(toSave.jumlah))
      + "\n" + toSave.subKategori + " · " + wallet.name + advisorText(". Simpan?", ". Save it?"), "bot");
    const bubble = document.getElementById("ai-chat-body").lastElementChild;
    const save = document.createElement("button"), fix = document.createElement("button");
    save.type = fix.type = "button"; save.className = fix.className = "ai-chip ruvy-edit-chip";
    save.textContent = advisorText("✅ Simpan", "✅ Save"); fix.textContent = advisorText("✏️ Ubah dulu", "✏️ Edit first");
    save.onclick = () => {
      save.disabled = fix.disabled = true;
      try { addTransaction(toSave, wallet.id); } catch (_) { appendBubble(advisorText("Belum bisa mencatat struk ini.", "Could not record this receipt."), "bot"); return; }
      appendRecordedBubble(toSave, wallet);
      if (typeof renderAll === "function") renderAll();
    };
    fix.onclick = () => {
      save.disabled = fix.disabled = true;
      input.value = (toSave.deskripsi || "struk") + " " + formatMoneyInput(toSave.jumlah);
      input.focus();
    };
    bubble.append(save, fix);
  } catch (err) {
    status.remove();
    appendBubble(advisorText("Gagal membaca foto. Coba foto yang lebih terang dan lurus.", "Couldn't read the photo. Try a brighter, straighter shot."), "bot");
  } finally {
    aiAdvisorSending = false;
  }
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
    bubble.innerHTML = `<div class="ai-bubble-meta">🤖 Ruvy</div>` + escapeHtml(text).replace(/\n/g, "<br>");
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
    if (typeof openAIChat === "function") openAIChat();
  };
}

// Expose globals
window.initAIAdvisor = initAIAdvisor;
window.showAIFab = showAIFab;
window.renderAIPromo = renderAIPromo;
