(function () {
  if (document.getElementById('suite-launcher')) return;

  var products = [
    { name: 'BerUang', note: 'Keuangan pribadi', status: 'Aplikasi aktif', icon: '🐻', href: '/app.html', tone: 'live' },
    { name: 'BerBisnis', note: 'Kasir, stok, dan profit UMKM', status: 'Trial 3 hari', icon: '🏪', href: '/tokountung/app.html', tone: 'trial' },
    { name: 'Berstock AI', note: 'Asisten stok lewat Telegram', status: 'Info produk', icon: '🤖', href: '/landing-berstock.html', tone: 'preview' },
    { name: 'BerSatu', note: 'Command center multi-agent', status: 'Demo interaktif', icon: '✦', href: '/bersatu-demo.html', tone: 'demo' }
  ];

  var style = document.createElement('style');
  style.textContent = `
    .suite-launcher{position:fixed;right:18px;bottom:18px;z-index:9998;font-family:Inter,system-ui,sans-serif}
    .suite-launcher *{box-sizing:border-box}
    .suite-launcher__button{display:flex;align-items:center;gap:9px;border:1px solid rgba(212,175,55,.5);border-radius:999px;padding:11px 16px;background:#101b31;color:#fff;box-shadow:0 14px 40px rgba(10,22,40,.3);font:700 13px/1 Inter,system-ui,sans-serif;cursor:pointer;transition:transform .2s,box-shadow .2s}
    .suite-launcher__button:hover{transform:translateY(-2px);box-shadow:0 18px 45px rgba(10,22,40,.38)}
    .suite-launcher__mark{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#f4d06f,#b8892d);color:#182238;font-size:15px}
    .suite-launcher__panel{position:absolute;right:0;bottom:58px;width:min(356px,calc(100vw - 28px));padding:14px;border:1px solid rgba(201,163,82,.35);border-radius:20px;background:rgba(255,252,246,.98);box-shadow:0 24px 70px rgba(10,22,40,.28);color:#30261e;transform-origin:bottom right;animation:suite-in .22s ease-out}
    .suite-launcher__panel[hidden]{display:none}
    .suite-launcher__head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:5px 5px 12px}
    .suite-launcher__head strong{display:block;font-size:15px}.suite-launcher__head small{display:block;margin-top:4px;color:#786b60;font-size:11px}
    .suite-launcher__close{border:0;background:#eee8df;color:#4b4038;width:30px;height:30px;border-radius:50%;font-size:19px;cursor:pointer}
    .suite-launcher__grid{display:grid;gap:8px}
    .suite-launcher__item{display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:10px;padding:11px;border:1px solid #e9dfd2;border-radius:14px;background:#fff;color:inherit;text-decoration:none;transition:transform .18s,border-color .18s,box-shadow .18s}
    .suite-launcher__item:hover{transform:translateX(-3px);border-color:#c9a352;box-shadow:0 8px 24px rgba(65,43,35,.09)}
    .suite-launcher__icon{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:#f5ecde;font-size:22px}
    .suite-launcher__copy b{display:block;font-size:13px}.suite-launcher__copy span{display:block;margin-top:3px;color:#75685e;font-size:10.5px}
    .suite-launcher__status{padding:5px 7px;border-radius:999px;background:#eaf8f0;color:#187447;font-size:9px;font-weight:800;white-space:nowrap}
    .suite-launcher__status--trial{background:#fff4d7;color:#8a6214}.suite-launcher__status--preview{background:#eef0f5;color:#596170}.suite-launcher__status--demo{background:#f1e8ff;color:#7140a6}
    @keyframes suite-in{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
    @media(max-width:520px){.suite-launcher{right:12px;bottom:12px}.suite-launcher__button{padding:9px 12px}.suite-launcher__button-label{display:none}.suite-launcher__panel{bottom:52px}.suite-launcher__item{grid-template-columns:38px 1fr auto}.suite-launcher__icon{width:38px;height:38px}}
    @media(prefers-reduced-motion:reduce){.suite-launcher *, .suite-launcher *::before,.suite-launcher *::after{animation:none!important;transition:none!important}}
  `;
  document.head.appendChild(style);

  var root = document.createElement('aside');
  root.className = 'suite-launcher';
  root.id = 'suite-launcher';
  root.setAttribute('aria-label', 'Pilihan aplikasi Berstock');
  root.innerHTML = `
    <div class="suite-launcher__panel" id="suite-launcher-panel" hidden>
      <div class="suite-launcher__head"><div><strong>Coba ekosistem Berstock</strong><small>Status tiap produk ditampilkan apa adanya.</small></div><button class="suite-launcher__close" type="button" aria-label="Tutup">×</button></div>
      <div class="suite-launcher__grid">${products.map(function (p) { return `<a class="suite-launcher__item" href="${p.href}"><span class="suite-launcher__icon">${p.icon}</span><span class="suite-launcher__copy"><b>${p.name}</b><span>${p.note}</span></span><span class="suite-launcher__status suite-launcher__status--${p.tone}">${p.status}</span></a>`; }).join('')}</div>
    </div>
    <button class="suite-launcher__button" type="button" aria-expanded="false" aria-controls="suite-launcher-panel"><span class="suite-launcher__mark">✦</span><span class="suite-launcher__button-label">Coba aplikasi lain</span></button>`;
  document.body.appendChild(root);

  var button = root.querySelector('.suite-launcher__button');
  var panel = root.querySelector('.suite-launcher__panel');
  var close = root.querySelector('.suite-launcher__close');
  function setOpen(open) { panel.hidden = !open; button.setAttribute('aria-expanded', String(open)); }
  button.addEventListener('click', function () { setOpen(panel.hidden); });
  close.addEventListener('click', function () { setOpen(false); button.focus(); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') setOpen(false); });
  document.addEventListener('click', function (event) { if (!root.contains(event.target)) setOpen(false); });
})();
