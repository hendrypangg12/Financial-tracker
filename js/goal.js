// ============================================================
// AI GOAL PLANNER — set target nabung, AI bantu plan
// ============================================================
// State: state.goals[] — array of goal objects
// Goal struct: { id, nama, targetAmount, deadline, currentSaving,
//                aiPlan, monthlyTarget, createdAt, updatedAt, status }
// AI: pakai endpoint /api/advise yang udah live (reuse Beruang Akuntan)

const GOAL_AI_ENDPOINT = "https://berstock-bot.hendrypangg12.workers.dev/api/advise";

// ============ DATA ============

function getGoals() {
  return state.goals || [];
}

function addGoal(g) {
  if (!state.goals) state.goals = [];
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
  state.goals.push(goal);
  saveState();
  renderGoals();
  return goal;
}

function deleteGoal(id) {
  state.goals = (state.goals || []).filter(g => g.id !== id);
  saveState();
  renderGoals();
}

function updateGoalSaving(id, newSaving) {
  const g = (state.goals || []).find(x => x.id === id);
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
  const d = new Date(deadline);
  if (isNaN(d)) return 1;
  const ms = d.getTime() - now.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24 * 30)));
}

function computeMonthlyTarget(goal) {
  const target = Number(goal.targetAmount) || 0;
  const current = Number(goal.currentSaving) || 0;
  const remaining = Math.max(0, target - current);
  const months = computeMonthsLeft(goal.deadline);
  return Math.ceil(remaining / months);
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
    const txs = (state.transactions || []).filter(t => {
      if (!t.tanggal) return false;
      const td = new Date(t.tanggal);
      return td.getMonth() === m && td.getFullYear() === y && t.jenis === jenis;
    });
    const sum = txs.reduce((s, t) => s + (Number(t.jumlah) || 0), 0);
    if (sum > 0) {
      total += sum;
      monthsWithData++;
    }
  }
  return monthsWithData > 0 ? Math.round(total / monthsWithData) : 0;
}

function getTopExpenseCategories(limit) {
  const byCat = {};
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  for (const t of (state.transactions || [])) {
    if (t.jenis !== 'pengeluaran') continue;
    if (new Date(t.tanggal) < sixMonthsAgo) continue;
    const cat = (t.kategori || 'Lainnya').trim();
    byCat[cat] = (byCat[cat] || 0) + (Number(t.jumlah) || 0);
  }
  return Object.entries(byCat)
    .map(([kategori, total]) => ({ kategori, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit || 3);
}

// ============ AI PLAN GENERATION ============

async function generateAIPlan(goal) {
  if (!goal) return null;

  const recentIncome = computeMonthlyAvg('pemasukan');
  const recentExpense = computeMonthlyAvg('pengeluaran');
  const topCats = getTopExpenseCategories(3);
  const monthlyTarget = computeMonthlyTarget(goal);
  const monthsLeft = computeMonthsLeft(goal.deadline);

  const catSummary = topCats.length > 0
    ? topCats.map(c => `${c.kategori} (Rp ${c.total.toLocaleString('id-ID')})`).join(', ')
    : 'belum ada data';

  const question = `Saya butuh plan saving untuk goal ini:

Goal: ${goal.nama}
Target: Rp ${Number(goal.targetAmount).toLocaleString('id-ID')}
Deadline: ${goal.deadline} (${monthsLeft} bulan dari sekarang)
Saving sekarang: Rp ${Number(goal.currentSaving).toLocaleString('id-ID')}
Butuh nabung: Rp ${monthlyTarget.toLocaleString('id-ID')}/bulan

Pola keuangan saya 3 bulan terakhir:
- Income rata-rata: Rp ${recentIncome.toLocaleString('id-ID')}/bulan
- Expense rata-rata: Rp ${recentExpense.toLocaleString('id-ID')}/bulan
- Top expense (6 bulan): ${catSummary}

Sebagai Akuntan AI, kasih plan saving lengkap dengan:
1. Realistis atau enggak? (YA / SUSAH / GAK MUNGKIN) — kasih reasoning singkat
2. 3 saran konkret cut/optimize spending biar cukup nabung
3. Total potential saving per bulan kalau saran dijalanin
4. 1 kalimat encouraging closing

Format: bahasa casual Indonesia, max 150 kata, pakai emoji.`;

  const email = (typeof currentUser !== "undefined" && currentUser?.email) || "anonymous@local";

  try {
    const res = await fetch(GOAL_AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, question, context: { source: 'goal-planner' } }),
    });
    if (!res.ok) throw new Error(`Gateway HTTP ${res.status}`);
    const data = await res.json();
    if (data.reply) return data.reply;
    if (data.error) throw new Error(data.error);
    return null;
  } catch (e) {
    console.error('[goal-ai]', e);
    return null;
  }
}

// ============ UI RENDER ============

function escGoal(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatDateID(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatRpGoal(n) {
  return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
}

function renderGoals() {
  const container = document.getElementById('goal-list');
  if (!container) return;

  const goals = getGoals();
  if (goals.length === 0) {
    container.innerHTML = `
      <div class="goal-empty">
        <div class="goal-empty-emoji">🎯</div>
        <h3>Belum ada goal saving</h3>
        <p>Set target nabung pertama lu — Beruang AI bantu buat plan konkret.</p>
        <p style="font-size:12px;color:var(--ink-soft);margin-top:8px;">
          Contoh: beli iPhone, DP rumah, liburan Bali, dana darurat
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
          <button class="goal-delete" data-id="${escGoal(g.id)}" aria-label="Hapus" title="Hapus goal">×</button>
        </div>
        <div class="goal-amounts">
          <div class="goal-amt-box">
            <div class="goal-amt-label">Target</div>
            <div class="goal-amt-value">${formatRpGoal(g.targetAmount)}</div>
          </div>
          <div class="goal-amt-box">
            <div class="goal-amt-label">Sekarang</div>
            <div class="goal-amt-value goal-amt-current">${formatRpGoal(g.currentSaving)}</div>
          </div>
        </div>
        <div class="goal-progress-wrap">
          <div class="goal-progress-bar">
            <div class="goal-progress-fill" style="width:${progress}%"></div>
          </div>
          <div class="goal-progress-label">${progress}% · sisa ${formatRpGoal(remaining)}</div>
        </div>
        <div class="goal-meta">
          <div class="goal-meta-row">
            <span class="goal-meta-ic">📅</span>
            <span>Deadline: <b>${formatDateID(g.deadline)}</b> (${monthsLeft} bulan lagi)</span>
          </div>
          <div class="goal-meta-row">
            <span class="goal-meta-ic">💰</span>
            <span>Nabung: <b>${formatRpGoal(monthly)}/bulan</b></span>
          </div>
        </div>
        ${g.aiPlan ? `
          <div class="goal-ai-plan">
            <div class="goal-ai-header">
              <span class="goal-ai-emoji">🐻</span>
              <span>Beruang AI Plan</span>
              <button class="goal-ai-regen" data-id="${escGoal(g.id)}" title="Generate ulang">↻</button>
            </div>
            <div class="goal-ai-body">${escGoal(g.aiPlan).replace(/\n/g, '<br>')}</div>
          </div>
        ` : `
          <button class="btn btn-primary goal-gen-btn" data-id="${escGoal(g.id)}">
            ✨ Generate Plan AI
          </button>
        `}
        <button class="btn btn-ghost goal-update-btn" data-id="${escGoal(g.id)}">
          📝 Update saving sekarang
        </button>
      </div>
    `;
  }).join('');

  // Wire actions
  container.querySelectorAll('.goal-delete').forEach(btn => {
    btn.onclick = () => {
      const goal = state.goals.find(g => g.id === btn.dataset.id);
      if (!goal) return;
      if (confirm(`Hapus goal "${goal.nama}"?`)) deleteGoal(btn.dataset.id);
    };
  });

  container.querySelectorAll('.goal-gen-btn, .goal-ai-regen').forEach(btn => {
    btn.onclick = async () => {
      const goal = state.goals.find(g => g.id === btn.dataset.id);
      if (!goal) return;

      // Check Pro status (Goal Planner is Pro feature, free user get 1 plan/month)
      const userIsPro = typeof isPro === 'function' && isPro(currentProfile);
      const freeQuotaKey = `goal-ai-free-${new Date().getFullYear()}-${new Date().getMonth()}`;
      const freeUsedThisMonth = parseInt(localStorage.getItem(freeQuotaKey) || '0', 10);
      if (!userIsPro && freeUsedThisMonth >= 1) {
        if (typeof showToast === 'function') {
          showToast('Free quota habis bulan ini (1 plan/bulan). Upgrade Pro untuk unlimited.', 'error');
        }
        if (typeof showScreen === 'function') showScreen('paywall');
        return;
      }

      const orig = btn.textContent;
      btn.disabled = true;
      btn.textContent = '⏳ AI lagi mikir...';

      const plan = await generateAIPlan(goal);
      if (plan) {
        goal.aiPlan = plan;
        goal.aiPlanGeneratedAt = new Date().toISOString();
        if (!userIsPro) {
          localStorage.setItem(freeQuotaKey, String(freeUsedThisMonth + 1));
        }
        saveState();
        renderGoals();
        if (typeof showToast === 'function') showToast('Plan AI ready! 🎯', 'success');
      } else {
        btn.disabled = false;
        btn.textContent = orig;
        if (typeof showToast === 'function') showToast('AI lagi sibuk, coba lagi nanti', 'error');
      }
    };
  });

  container.querySelectorAll('.goal-update-btn').forEach(btn => {
    btn.onclick = () => {
      const goal = state.goals.find(g => g.id === btn.dataset.id);
      if (!goal) return;
      const input = prompt(
        `Saving sekarang untuk "${goal.nama}":\n\nSaat ini: ${formatRpGoal(goal.currentSaving)}\nTarget: ${formatRpGoal(goal.targetAmount)}\n\nMasukkan nominal baru (angka aja):`,
        String(goal.currentSaving)
      );
      if (input === null) return;
      const num = Number(String(input).replace(/[^\d]/g, ''));
      if (!isNaN(num) && num >= 0) {
        updateGoalSaving(goal.id, num);
        if (typeof showToast === 'function') showToast('Saving updated! 💰', 'success');
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
    deadlineInput.min = minDate.toISOString().split('T')[0];
  }

  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    if (!data.nama || !data.nama.trim()) {
      if (typeof showToast === 'function') showToast('Nama goal wajib diisi', 'error');
      return;
    }
    const target = Number(String(data.targetAmount || '').replace(/[^\d]/g, ''));
    if (!target || target <= 0) {
      if (typeof showToast === 'function') showToast('Target amount harus lebih dari 0', 'error');
      return;
    }
    if (!data.deadline) {
      if (typeof showToast === 'function') showToast('Deadline wajib diisi', 'error');
      return;
    }
    const current = Number(String(data.currentSaving || '0').replace(/[^\d]/g, ''));

    addGoal({
      nama: data.nama.trim(),
      targetAmount: target,
      deadline: data.deadline,
      currentSaving: current,
    });

    form.reset();
    if (typeof showToast === 'function') showToast('Goal saving ditambahkan! 🎯', 'success');
  };
}

// Expose globally
if (typeof window !== 'undefined') {
  window.renderGoals = renderGoals;
  window.setupGoalForm = setupGoalForm;
  window.addGoal = addGoal;
  window.deleteGoal = deleteGoal;
}
