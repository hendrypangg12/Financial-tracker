// ============================================================
// AI GOAL PLANNER — set target nabung, AI bantu plan
// ============================================================
// State: getFinancialState().goals[] — array of goal objects
// Goal struct: { id, nama, targetAmount, deadline, currentSaving,
//                aiPlan, monthlyTarget, createdAt, updatedAt, status }
// AI: pakai endpoint /api/advise yang udah live (reuse Ruvy)

const GOAL_AI_ENDPOINT = "https://berstock-bot.hendrypangg12.workers.dev/api/advise";
let goalAIError = '';

function goalText(id, en) {
  return typeof getAppLanguage === 'function' && getAppLanguage() === 'en' ? en : id;
}

function goalPreferences() {
  return {
    language: typeof getAppLanguage === 'function' ? getAppLanguage() : 'id',
    locale: typeof getAppLocale === 'function' ? getAppLocale() : 'id-ID',
    currency: typeof getAccountCurrency === 'function' ? getAccountCurrency() : 'IDR',
  };
}

function goalMoneyPrecision(value, roundUp = false) {
  const factor = 10 ** (typeof getCurrencyDigits === 'function' ? getCurrencyDigits() : 0);
  return (roundUp ? Math.ceil(Number(value) * factor - 1e-9) : Math.round(Number(value) * factor)) / factor;
}

function parseGoalAmount(input) {
  const result = typeof parseMoneyInput === 'function' ? parseMoneyInput(input) : Number(input);
  return Number.isFinite(result) ? result : null;
}

// ============ DATA ============

function getGoals() {
  return getFinancialState().goals || [];
}

function addGoal(g) {
  if (!getFinancialState().goals) getFinancialState().goals = [];
  const goal = {
    id: 'goal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    nama: g.nama,
    targetAmount: Number(g.targetAmount) || 0,
    deadline: g.deadline,
    currentSaving: Number(g.currentSaving) || 0,
    aiPlan: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
  };
  getFinancialState().goals.push(goal);
  saveState();
  renderGoals();
  return goal;
}

function deleteGoal(id) {
  getFinancialState().goals = (getFinancialState().goals || []).filter(g => g.id !== id);
  saveState();
  renderGoals();
}

function updateGoalSaving(id, newSaving) {
  const g = (getFinancialState().goals || []).find(x => x.id === id);
  if (!g) return;
  g.currentSaving = Number(newSaving) || 0;
  g.updatedAt = new Date().toISOString();
  if (g.currentSaving >= g.targetAmount) g.status = 'completed';
  saveState();
  renderGoals();
}

// ============ COMPUTATIONS ============

function computeMonthsLeft(deadline) {
  const now = new Date();
  const d = parseISO(deadline);
  if (isNaN(d)) return 1;
  const ms = d.getTime() - now.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24 * 30)));
}

function computeMonthlyTarget(goal) {
  const target = Number(goal.targetAmount) || 0;
  const current = Number(goal.currentSaving) || 0;
  const remaining = Math.max(0, target - current);
  const months = computeMonthsLeft(goal.deadline);
  return goalMoneyPrecision(remaining / months, true);
}

function computeProgress(goal) {
  const target = Number(goal.targetAmount) || 0;
  const current = Number(goal.currentSaving) || 0;
  if (target === 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

function computeMonthlyAvg(jenis) {
  // Avg of last 3 months
  const now = new Date();
  let total = 0, monthsWithData = 0;
  for (let i = 1; i <= 3; i++) {
    const checkDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = checkDate.getMonth();
    const y = checkDate.getFullYear();
    const txs = (getFinancialState().transactions || []).filter(t => {
      if (isOpeningBalanceTransaction(t)) return false;
      if (!t.tanggal) return false;
      const td = parseISO(t.tanggal);
      return td.getMonth() === m && td.getFullYear() === y && t.jenis === jenis;
    });
    const sum = txs.reduce((s, t) => s + (Number(t.jumlah) || 0), 0);
    if (sum > 0) {
      total += sum;
      monthsWithData++;
    }
  }
  return monthsWithData > 0 ? goalMoneyPrecision(total / monthsWithData) : 0;
}

function getTopExpenseCategories(limit) {
  const byCat = {};
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  for (const t of (getFinancialState().transactions || [])) {
    if (t.jenis !== 'pengeluaran') continue;
    if (parseISO(t.tanggal) < sixMonthsAgo) continue;
    const cat = (t.kategori || goalText('Lainnya', 'Other')).trim();
    byCat[cat] = (byCat[cat] || 0) + (Number(t.jumlah) || 0);
  }
  return Object.entries(byCat)
    .map(([kategori, total]) => ({ kategori, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit || 3);
}

// ============ AI PLAN GENERATION ============

function buildGoalRequest(goal) {
  const preferences = goalPreferences();
  const recentIncome = computeMonthlyAvg('pemasukan');
  const recentExpense = computeMonthlyAvg('pengeluaran');
  const topCats = getTopExpenseCategories(3);
  const monthlyTarget = computeMonthlyTarget(goal);
  const monthsLeft = computeMonthsLeft(goal.deadline);

  const catSummary = topCats.length > 0
    ? topCats.map(c => `${c.kategori} (${formatRpGoal(c.total)})`).join(', ')
    : goalText('belum ada data', 'no records yet');

  const question = goalText(`Saya butuh rencana menabung untuk target ini:

Goal: ${goal.nama}
Mata uang: ${preferences.currency} (jangan konversi kurs)
Target: ${formatRpGoal(goal.targetAmount)}
Deadline: ${formatDateID(goal.deadline)} (${monthsLeft} bulan dari sekarang)
Tabungan sekarang: ${formatRpGoal(goal.currentSaving)}
Butuh nabung: ${formatRpGoal(monthlyTarget)}/bulan

Pola keuangan saya 3 bulan terakhir:
- Income rata-rata: ${formatRpGoal(recentIncome)}/bulan
- Expense rata-rata: ${formatRpGoal(recentExpense)}/bulan
- Top expense (6 bulan): ${catSummary}

Sebagai Akuntan AI, kasih plan saving lengkap dengan:
1. Realistis atau enggak? (YA / SUSAH / GAK MUNGKIN) — kasih reasoning singkat
2. 3 saran konkret cut/optimize spending biar cukup nabung
3. Total potential saving per bulan kalau saran dijalanin
4. 1 kalimat encouraging closing

Format: bahasa casual Indonesia, max 150 kata, pakai emoji. Jangan membuat angka tabungan yang tidak didukung data.`, `Please make a savings plan for this goal:

Goal: ${goal.nama}
Account currency: ${preferences.currency} (do not convert currencies)
Target: ${formatRpGoal(goal.targetAmount)}
Deadline: ${formatDateID(goal.deadline)} (${monthsLeft} months from now)
Current savings: ${formatRpGoal(goal.currentSaving)}
Required savings: ${formatRpGoal(monthlyTarget)}/month

My recorded pattern over the last 3 completed months:
- Average income: ${formatRpGoal(recentIncome)}/month
- Average expenses: ${formatRpGoal(recentExpense)}/month
- Largest expense categories over 6 months: ${catSummary}

Give a concise plan in clear English, at most 150 words:
1. Is the goal realistic, difficult or currently not achievable? Explain briefly.
2. Three concrete spending changes based on my records.
3. Estimated monthly savings only where the records support the estimate.
4. One encouraging closing sentence.
Use occasional emojis and say when records are insufficient. Do not invent savings or assume they are guaranteed.`);

  return { question, context: {
    ...(typeof buildAdvisorContext === 'function' ? buildAdvisorContext() : {}),
    ...preferences,
    source: 'goal-planner',
  } };
}

async function generateAIPlan(goal) {
  if (!goal) return null;
  goalAIError = '';
  const { question, context } = buildGoalRequest(goal);

  const email = (typeof currentUser !== "undefined" && currentUser?.email) || "anonymous@local";

  try {
    const res = await fetch(GOAL_AI_ENDPOINT, {
      method: "POST",
      headers: { ...await authenticatedHeaders(), 'Accept-Language': context.language },
      body: JSON.stringify({ email, question, context }),
    });
    const data = await res.json();
    if (!res.ok) {
      goalAIError = data.reply || data.error || goalText('AI belum tersedia, coba lagi nanti.', 'AI is unavailable. Please try again later.');
      return null;
    }
    if (data.reply) return data.reply;
    if (data.error) goalAIError = data.error;
    return null;
  } catch (e) {
    console.error('[goal-ai]', e);
    goalAIError = goalText('Koneksi AI gagal. Periksa internet dan coba lagi.', 'AI connection failed. Check your internet and try again.');
    return null;
  }
}

// ============ UI RENDER ============

function escGoal(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatDateID(iso) {
  if (!iso) return '-';
  const d = parseISO(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(goalPreferences().locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatRpGoal(n) {
  return formatRupiah(n);
}

function renderGoals() {
  const container = document.getElementById('goal-list');
  if (!container) return;

  const goals = getGoals();
  if (goals.length === 0) {
    container.innerHTML = `
      <div class="goal-empty">
        <div class="goal-empty-emoji">🎯</div>
        <h3>${goalText('Belum ada goal saving', 'No savings goals yet')}</h3>
        <p>${goalText('Set target nabung pertama lu — Beruang AI bantu buat plan konkret.', 'Set your first savings goal and get a plan from Ruvy AI.')}</p>
        <p style="font-size:12px;color:var(--ink-soft);margin-top:8px;">
          ${goalText('Contoh: beli iPhone, DP rumah, liburan Bali, dana darurat', 'Examples: a new phone, home deposit, vacation or emergency fund')}
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = goals.map(g => {
    const monthly = computeMonthlyTarget(g);
    const progress = computeProgress(g);
    const monthsLeft = computeMonthsLeft(g.deadline);
    const isCompleted = g.status === 'completed' || progress >= 100;
    const remaining = Math.max(0, Number(g.targetAmount) - Number(g.currentSaving));

    return `
      <div class="goal-card ${isCompleted ? 'goal-completed' : ''}" data-id="${escGoal(g.id)}">
        <div class="goal-header">
          <div class="goal-title">${isCompleted ? '🎉 ' : '🎯 '}${escGoal(g.nama)}</div>
          <button class="goal-delete" data-id="${escGoal(g.id)}" aria-label="${goalText('Hapus', 'Delete')}" title="${goalText('Hapus goal', 'Delete goal')}">×</button>
        </div>
        <div class="goal-amounts">
          <div class="goal-amt-box">
            <div class="goal-amt-label">Target</div>
            <div class="goal-amt-value">${formatRpGoal(g.targetAmount)}</div>
          </div>
          <div class="goal-amt-box">
            <div class="goal-amt-label">${goalText('Sekarang', 'Current')}</div>
            <div class="goal-amt-value goal-amt-current">${formatRpGoal(g.currentSaving)}</div>
          </div>
        </div>
        <div class="goal-progress-wrap">
          <div class="goal-progress-bar">
            <div class="goal-progress-fill" style="width:${progress}%"></div>
          </div>
          <div class="goal-progress-label">${progress}% · ${goalText('sisa', 'remaining')} ${formatRpGoal(remaining)}</div>
        </div>
        <div class="goal-meta">
          <div class="goal-meta-row">
            <span class="goal-meta-ic">📅</span>
            <span>${goalText('Deadline', 'Due')}: <b>${formatDateID(g.deadline)}</b> (${monthsLeft} ${goalText('bulan lagi', 'months left')})</span>
          </div>
          <div class="goal-meta-row">
            <span class="goal-meta-ic">💰</span>
            <span>${goalText('Nabung', 'Save')}: <b>${formatRpGoal(monthly)}/${goalText('bulan', 'month')}</b></span>
          </div>
        </div>
        ${g.aiPlan ? `
          <div class="goal-ai-plan">
            <div class="goal-ai-header">
              <span class="goal-ai-emoji">🐻</span>
              <span>Beruang AI Plan</span>
              <button class="goal-ai-regen" data-id="${escGoal(g.id)}" title="${goalText('Generate ulang', 'Regenerate')}">↻</button>
            </div>
            <div class="goal-ai-body">${escGoal(g.aiPlan).replace(/\n/g, '<br>')}</div>
          </div>
        ` : `
          <button class="btn btn-primary goal-gen-btn" data-id="${escGoal(g.id)}">
            ${goalText('✨ Generate Plan AI', '✨ Create AI Plan')}
          </button>
        `}
        <button class="btn btn-ghost goal-update-btn" data-id="${escGoal(g.id)}">
          ${goalText('📝 Update saving sekarang', '📝 Update current savings')}
        </button>
      </div>
    `;
  }).join('');

  // Wire actions
  container.querySelectorAll('.goal-delete').forEach(btn => {
    btn.onclick = () => {
      const goal = getFinancialState().goals.find(g => g.id === btn.dataset.id);
      if (!goal) return;
      if (confirm(goalText(`Hapus goal "${goal.nama}"?`, `Delete goal "${goal.nama}"?`))) deleteGoal(btn.dataset.id);
    };
  });

  container.querySelectorAll('.goal-gen-btn, .goal-ai-regen').forEach(btn => {
    btn.onclick = async () => {
      const goal = getFinancialState().goals.find(g => g.id === btn.dataset.id);
      if (!goal) return;

      // Uji coba gratis tidak termasuk AI — arahkan ke paket berbayar
      if (typeof isFreeTrial === 'function' && isFreeTrial(currentProfile)) {
        if (typeof openPaywall === 'function') openPaywall();
        else if (typeof showScreen === 'function') showScreen('paywall');
        return;
      }
      // Check Pro status (Goal Planner is Pro feature, free user get 1 plan/month)
      const userIsPro = typeof hasAIAccess === 'function' && hasAIAccess(currentProfile);
      const freeQuotaKey = `goal-ai-free-${new Date().getFullYear()}-${new Date().getMonth()}`;
      const freeUsedThisMonth = parseInt(localStorage.getItem(freeQuotaKey) || '0', 10);
      if (!userIsPro && freeUsedThisMonth >= 1) {
        if (typeof showToast === 'function') {
          showToast(goalText('Kuota gratis bulan ini sudah dipakai. Paket Pro tetap mengikuti batas penggunaan harian.', 'Your free goal plan for this month has been used. Pro plans also have a daily usage limit.'), 'error');
        }
        if (typeof showScreen === 'function') showScreen('paywall');
        return;
      }

      const orig = btn.textContent;
      btn.disabled = true;
      btn.textContent = goalText('⏳ AI lagi mikir...', '⏳ Creating your plan...');

      const plan = await generateAIPlan(goal);
      if (plan) {
        goal.aiPlan = plan;
        goal.aiPlanGeneratedAt = new Date().toISOString();
        if (!userIsPro) {
          localStorage.setItem(freeQuotaKey, String(freeUsedThisMonth + 1));
        }
        saveState();
        renderGoals();
        if (typeof showToast === 'function') showToast(goalText('Plan AI ready! 🎯', 'Your AI plan is ready! 🎯'), 'success');
      } else {
        btn.disabled = false;
        btn.textContent = orig;
        if (typeof showToast === 'function') showToast(goalAIError || goalText('AI lagi sibuk, coba lagi nanti', 'AI is busy. Please try again later.'), 'error');
      }
    };
  });

  container.querySelectorAll('.goal-update-btn').forEach(btn => {
    btn.onclick = () => {
      const goal = getFinancialState().goals.find(g => g.id === btn.dataset.id);
      if (!goal) return;
      const input = prompt(
        goalText(`Saving sekarang untuk "${goal.nama}":\n\nSaat ini: ${formatRpGoal(goal.currentSaving)}\nTarget: ${formatRpGoal(goal.targetAmount)}\n\nMasukkan nominal baru:`, `Current savings for "${goal.nama}":\n\nCurrent: ${formatRpGoal(goal.currentSaving)}\nTarget: ${formatRpGoal(goal.targetAmount)}\n\nEnter the new amount:`),
        Number(goal.currentSaving || 0).toLocaleString(goalPreferences().locale, { useGrouping: false, maximumFractionDigits: typeof getCurrencyDigits === 'function' ? getCurrencyDigits() : 0 })
      );
      if (input === null) return;
      const num = parseGoalAmount(input);
      if (num !== null && num >= 0) {
        updateGoalSaving(goal.id, num);
        if (typeof showToast === 'function') showToast(goalText('Saving updated! 💰', 'Savings updated! 💰'), 'success');
      } else if (typeof showToast === 'function') {
        showToast(goalText('Nominal tidak valid. Gunakan format mata uang akun.', 'Invalid amount. Use your account currency format.'), 'error');
      }
    };
  });
}

function setupGoalForm() {
  const form = document.getElementById('form-goal');
  if (!form) return;

  // Set min date deadline = 1 month from now
  const deadlineInput = form.querySelector('input[name="deadline"]');
  if (deadlineInput && !deadlineInput.value) {
    const minDate = new Date();
    minDate.setMonth(minDate.getMonth() + 1);
    deadlineInput.min = toISODate(minDate);
  }

  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    if (!data.nama || !data.nama.trim()) {
      if (typeof showToast === 'function') showToast(goalText('Nama goal wajib diisi', 'Enter a goal name.'), 'error');
      return;
    }
    const target = parseGoalAmount(data.targetAmount || '');
    if (target === null || target <= 0) {
      if (typeof showToast === 'function') showToast(goalText('Target amount harus lebih dari 0', 'Enter a valid target amount greater than zero.'), 'error');
      return;
    }
    if (!data.deadline) {
      if (typeof showToast === 'function') showToast(goalText('Deadline wajib diisi', 'Choose a deadline.'), 'error');
      return;
    }
    const current = parseGoalAmount(data.currentSaving || '0');
    if (current === null || current < 0) {
      if (typeof showToast === 'function') showToast(goalText('Tabungan sekarang harus berupa nominal valid minimal 0.', 'Enter valid current savings of zero or more.'), 'error');
      return;
    }

    addGoal({
      nama: data.nama.trim(),
      targetAmount: target,
      deadline: data.deadline,
      currentSaving: current,
    });

    form.reset();
    if (typeof showToast === 'function') showToast(goalText('Goal saving ditambahkan! 🎯', 'Savings goal added! 🎯'), 'success');
  };
}

// Expose globally
if (typeof window !== 'undefined') {
  window.renderGoals = renderGoals;
  window.setupGoalForm = setupGoalForm;
  window.addGoal = addGoal;
  window.deleteGoal = deleteGoal;
}
