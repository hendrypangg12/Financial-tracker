// Module: Onboarding Tour — first-time user spotlight
// Activate sekali per user (sessionStorage), 5 step intro

const ONBOARDING_KEY = 'berbisnis-onboarding-done';

const ONBOARDING_STEPS = [
  {
    title: '🐻 Selamat Datang di BerBisnis Pro!',
    body: 'Yuk tour 1 menit kenalan sama fitur utama. Semua bisa di-skip kapan aja.',
    target: null, // welcome screen, no spotlight
  },
  {
    title: '📦 Tab Stok',
    body: 'Tambah produk dengan foto, kategori, harga modal & jual. AI otomatis hitung HPP weighted average.',
    target: '[data-tab="stok"]',
  },
  {
    title: '💳 Tab Kasir',
    body: 'Cari produk → klik kartu → masuk cart → bayar. Cepat & visual.',
    target: '[data-tab="jual"]',
  },
  {
    title: '💰 Tab Piutang',
    body: 'Track pelanggan tempo (belum bayar). Otomatis dari setiap transaksi pakai metode "Tempo".',
    target: '[data-tab="piutang"]',
  },
  {
    title: '📥 Tab PO Supplier',
    body: 'Catat PO ke supplier — track hutang + foto faktur. Stok auto-tambah saat barang masuk.',
    target: '[data-tab="restock"]',
  },
  {
    title: '🤖 Bonus: AI Bot Telegram',
    body: 'Connect ke Berstock AI Bot di tab Pengaturan. Tanya stok/sales lewat Telegram, AI jawab 5 detik!',
    target: '[data-tab="pengaturan"]',
  },
];

let currentStep = 0;

function startOnboarding() {
  if (localStorage.getItem(ONBOARDING_KEY) === '1') return;
  currentStep = 0;
  showOnboardingStep();
}

function showOnboardingStep() {
  removeOnboardingOverlay();

  const step = ONBOARDING_STEPS[currentStep];
  if (!step) { finishOnboarding(); return; }

  const isLast = currentStep === ONBOARDING_STEPS.length - 1;
  const isFirst = currentStep === 0;

  // Spotlight target element kalau ada
  let spotlightStyle = '';
  if (step.target) {
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      const padding = 8;
      spotlightStyle = `
        top: ${rect.top - padding}px;
        left: ${rect.left - padding}px;
        width: ${rect.width + padding * 2}px;
        height: ${rect.height + padding * 2}px;
      `;
    }
  }

  const overlay = document.createElement('div');
  overlay.className = 'onb-overlay';
  overlay.id = 'onb-overlay';
  overlay.innerHTML = `
    ${step.target && spotlightStyle ? `<div class="onb-spotlight" style="${spotlightStyle}"></div>` : ''}
    <div class="onb-card">
      <div class="onb-progress">
        ${ONBOARDING_STEPS.map((_, i) => `<span class="${i === currentStep ? 'active' : (i < currentStep ? 'done' : '')}"></span>`).join('')}
      </div>
      <div class="onb-step-num">Step ${currentStep + 1} / ${ONBOARDING_STEPS.length}</div>
      <h2 class="onb-title">${step.title}</h2>
      <p class="onb-body">${step.body}</p>
      <div class="onb-actions">
        ${!isFirst ? '<button class="btn btn-ghost" id="onb-prev">← Kembali</button>' : '<button class="btn btn-ghost" id="onb-skip">Lewati Tour</button>'}
        <button class="btn btn-primary" id="onb-next">${isLast ? 'Selesai 🎉' : 'Lanjut →'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('onb-next').onclick = () => {
    currentStep++;
    if (currentStep >= ONBOARDING_STEPS.length) finishOnboarding();
    else showOnboardingStep();
  };
  const prevBtn = document.getElementById('onb-prev');
  if (prevBtn) prevBtn.onclick = () => { currentStep--; showOnboardingStep(); };
  const skipBtn = document.getElementById('onb-skip');
  if (skipBtn) skipBtn.onclick = finishOnboarding;
}

function removeOnboardingOverlay() {
  const ov = document.getElementById('onb-overlay');
  if (ov) ov.remove();
}

function finishOnboarding() {
  removeOnboardingOverlay();
  localStorage.setItem(ONBOARDING_KEY, '1');
  if (typeof showToast === 'function') {
    showToast('🎉 Tour selesai! Selamat berkarya bos!', 'success');
  }
}

// Restart tour (kalau user mau ulang dari menu pengaturan)
function restartOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
  startOnboarding();
}
