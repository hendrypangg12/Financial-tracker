// Module: Jual / POS / Cart

// Helper: berapa qty produk ini sudah masuk cart
function cartQty(productId) {
  const item = (state.cart || []).find(c => c.productId === productId);
  return item ? item.qty : 0;
}

// State filter kategori aktif (default 'all')
let activeKategoriFilter = 'all';

function renderCategoryTabs() {
  const wrap = document.getElementById('pos-category-tabs');
  if (!wrap) return;

  // Hitung jumlah produk per kategori (yang stoknya > 0)
  const counts = { all: state.products.length };
  for (const p of state.products) {
    const k = p.kategori || 'Lain-lain';
    counts[k] = (counts[k] || 0) + 1;
  }

  // Sort kategori dari list state.kategori, plus "Lain-lain" kalau ada
  const kategoriList = [...(state.kategori || [])];
  if (counts['Lain-lain']) kategoriList.push('Lain-lain');

  wrap.innerHTML = `
    <button class="pos-cat-tab ${activeKategoriFilter === 'all' ? 'active' : ''}" data-kat="all">
      📦 Semua <small>(${counts.all || 0})</small>
    </button>
    ${kategoriList.map(k => `
      <button class="pos-cat-tab ${activeKategoriFilter === k ? 'active' : ''}" data-kat="${escapeHtml(k)}">
        ${escapeHtml(k)} <small>(${counts[k] || 0})</small>
      </button>
    `).join('')}
  `;

  wrap.querySelectorAll('.pos-cat-tab').forEach(btn => btn.onclick = () => {
    activeKategoriFilter = btn.dataset.kat;
    renderCategoryTabs();
    renderPOSProducts();
  });
}

function renderPOSProducts() {
  const search = (document.getElementById('pos-search')?.value || '').toLowerCase();
  let list = [...state.products];

  // Filter kategori (kalau bukan "all")
  if (activeKategoriFilter && activeKategoriFilter !== 'all') {
    list = list.filter(p => (p.kategori || 'Lain-lain') === activeKategoriFilter);
  }

  if (search) {
    list = list.filter(p =>
      (p.nama || '').toLowerCase().includes(search) ||
      (p.sku || '').toLowerCase().includes(search) ||
      (p.kategori || '').toLowerCase().includes(search)
    );
  }
  list.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));
  list = list.slice(0, 60); // limit display

  const grid = document.getElementById('pos-product-grid');
  if (!list.length) {
    grid.innerHTML = '<div class="empty">' + (search ? 'Tidak ditemukan' : 'Belum ada barang. Tambah di tab Stok dulu.') + '</div>';
    return;
  }
  grid.innerHTML = list.map(p => {
    const inCart = cartQty(p.id);
    const sisa = p.stok - inCart;
    const photo = p.fotoUrl
      ? `<img class="pphoto" src="${p.fotoUrl}" alt="" loading="lazy" />`
      : `<div class="pphoto pphoto-empty">📦</div>`;
    const cartBadge = inCart > 0 ? `<div class="pcart-badge">${inCart}</div>` : '';
    const stokColor = sisa <= 0 ? 'pstok-zero' : (sisa <= (p.minStok || 5) ? 'pstok-low' : '');
    return `
    <div class="product-card ${sisa <= 0 ? 'out-of-stock' : ''}" data-pid="${p.id}">
      ${cartBadge}
      ${photo}
      <div class="pname">${escapeHtml(p.nama)}</div>
      <div class="pprice">${formatRupiah(p.hargaJual)}</div>
      <div class="pstok ${stokColor}">Sisa: ${sisa} ${escapeHtml(p.satuan || 'pcs')}${inCart > 0 ? ` <small>(cart: ${inCart})</small>` : ''}</div>
    </div>
  `;
  }).join('');
  grid.querySelectorAll('.product-card').forEach(card => {
    card.onclick = () => {
      const id = card.dataset.pid;
      const p = getProduct(id);
      if (!p) return;
      const sisa = p.stok - cartQty(p.id);
      if (sisa <= 0) { showToast('Stok habis!', 'error'); return; }
      // Animasi bounce — tambah class adding, hapus setelah 300ms
      card.classList.add('adding');
      setTimeout(() => card.classList.remove('adding'), 300);
      addToCart(p);
    };
  });
}

function addToCart(product) {
  const existing = state.cart.find(c => c.productId === product.id);
  if (existing) {
    if (existing.qty >= product.stok) {
      showToast('Stok tidak cukup', 'error');
      return;
    }
    existing.qty++;
  } else {
    state.cart.push({
      productId: product.id,
      nama: product.nama,
      sku: product.sku,
      qty: 1,
      hargaJual: product.hargaJual,
      hargaModal: product.hargaModal,
      satuan: product.satuan,
      maxStok: product.stok,
    });
  }
  renderCart();
  renderPOSProducts(); // refresh stok display di card
  showToast(`+ ${product.nama}`, 'success');
}

function renderCart() {
  const ul = document.getElementById('cart-list');
  if (!state.cart.length) {
    ul.innerHTML = '<li class="empty">Keranjang kosong</li>';
    document.getElementById('cart-subtotal').textContent = 'Rp 0';
    document.getElementById('cart-total').textContent = 'Rp 0';
    document.getElementById('btn-checkout').disabled = true;
    return;
  }
  ul.innerHTML = state.cart.map((it, i) => `
    <li class="cart-item">
      <div>
        <div class="cart-item-name">${escapeHtml(it.nama)}</div>
        <div class="cart-item-meta">${formatRupiah(it.hargaJual)} × ${it.qty} ${escapeHtml(it.satuan || 'pcs')}</div>
      </div>
      <div class="cart-qty">
        <button data-act="dec" data-i="${i}">−</button>
        <input type="number" min="1" max="${it.maxStok}" value="${it.qty}" data-i="${i}" />
        <button data-act="inc" data-i="${i}">+</button>
      </div>
      <div>
        <b>${formatRupiah(it.hargaJual * it.qty)}</b>
        <button class="btn btn-small btn-danger" data-act="rm" data-i="${i}" style="margin-left:6px">×</button>
      </div>
    </li>
  `).join('');
  // Bind actions
  ul.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    const act = b.dataset.act;
    if (act === 'inc') {
      if (state.cart[i].qty < state.cart[i].maxStok) state.cart[i].qty++;
      else showToast('Stok tidak cukup', 'error');
    }
    else if (act === 'dec') {
      if (state.cart[i].qty > 1) state.cart[i].qty--;
    }
    else if (act === 'rm') state.cart.splice(i, 1);
    renderCart();
    renderPOSProducts();
  });
  ul.querySelectorAll('input[data-i]').forEach(inp => inp.onchange = () => {
    const i = +inp.dataset.i;
    let q = Math.min(+inp.value || 1, state.cart[i].maxStok);
    q = Math.max(q, 1);
    state.cart[i].qty = q;
    renderCart();
    renderPOSProducts();
  });
  // Summary
  const subtotal = state.cart.reduce((s, it) => s + (it.hargaJual * it.qty), 0);
  const diskon = +document.getElementById('cart-diskon').value || 0;
  const total = Math.max(0, subtotal - diskon);
  document.getElementById('cart-subtotal').textContent = formatRupiah(subtotal);
  document.getElementById('cart-total').textContent = formatRupiah(total);
  document.getElementById('btn-checkout').disabled = total <= 0;
}

function clearCart() {
  state.cart = [];
  document.getElementById('cart-diskon').value = 0;
  renderCart();
}

function openCheckoutModal() {
  if (!state.cart.length) return;
  const subtotal = state.cart.reduce((s, it) => s + (it.hargaJual * it.qty), 0);
  const diskon = +document.getElementById('cart-diskon').value || 0;
  const total = Math.max(0, subtotal - diskon);
  document.getElementById('checkout-summary').innerHTML = `
    <div class="bep-row"><span>Item</span><b>${state.cart.length}</b></div>
    <div class="bep-row"><span>Subtotal</span><b>${formatRupiah(subtotal)}</b></div>
    <div class="bep-row"><span>Diskon</span><b>-${formatRupiah(diskon)}</b></div>
    <div class="bep-row" style="font-size:18px;color:var(--primary)"><span>TOTAL</span><b>${formatRupiah(total)}</b></div>
  `;
  const form = document.getElementById('form-checkout');
  form.reset();
  form.querySelector('[name="bayar"]').value = total;
  document.getElementById('kembalian-preview').textContent = 'Kembalian: Rp 0';
  if (typeof refreshCustomerDatalist === 'function') refreshCustomerDatalist('checkout-pelanggan-list');
  openModal('modal-checkout');
  setTimeout(() => form.querySelector('[name="bayar"]').select(), 100);
}

function setupCheckoutForm() {
  const form = document.getElementById('form-checkout');
  const bayarInput = form.querySelector('[name="bayar"]');

  // Toggle field "Jatuh Tempo" + "Bayar" tergantung metode
  const metodeSel = document.getElementById('checkout-metode');
  const labelTempo = document.getElementById('label-jatuh-tempo');
  const labelBayar = bayarInput.closest('label');
  const kembalianPreview = document.getElementById('kembalian-preview');
  const tagihanInfo = document.getElementById('tagihan-info');

  if (metodeSel) {
    const toggleTempo = () => {
      const isTempo = metodeSel.value === 'tempo';

      // Field Jatuh Tempo — muncul cuma saat tempo
      if (labelTempo) {
        labelTempo.hidden = !isTempo;
        if (isTempo) {
          const inp = labelTempo.querySelector('input');
          if (inp && !inp.value) {
            const d = new Date();
            d.setDate(d.getDate() + 30);
            inp.value = d.toISOString().slice(0, 10);
          }
        }
      }

      // Bayar field — sembunyikan saat tempo (customer belum bayar)
      if (labelBayar) labelBayar.hidden = isTempo;
      if (kembalianPreview) kembalianPreview.hidden = isTempo;
      if (tagihanInfo) tagihanInfo.hidden = !isTempo;

      // Saat tempo, set bayar = 0 supaya tidak kena validasi "Pembayaran kurang"
      if (isTempo) {
        bayarInput.required = false;
        bayarInput.value = 0;
      } else {
        bayarInput.required = true;
      }
    };
    metodeSel.addEventListener('change', toggleTempo);
    toggleTempo();
  }

  bayarInput.addEventListener('input', () => {
    const subtotal = state.cart.reduce((s, it) => s + (it.hargaJual * it.qty), 0);
    const diskon = +document.getElementById('cart-diskon').value || 0;
    const total = Math.max(0, subtotal - diskon);
    const bayar = +bayarInput.value || 0;
    const kembalian = bayar - total;
    document.getElementById('kembalian-preview').textContent =
      kembalian >= 0 ? `Kembalian: ${formatRupiah(kembalian)}` : `⚠️ Kurang: ${formatRupiah(-kembalian)}`;
  });

  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const subtotal = state.cart.reduce((s, it) => s + (it.hargaJual * it.qty), 0);
    const diskon = +document.getElementById('cart-diskon').value || 0;
    const total = Math.max(0, subtotal - diskon);
    const isTempo = fd.get('metode') === 'tempo';
    const bayar = isTempo ? 0 : +fd.get('bayar');
    if (!isTempo && bayar < total) { showToast('Pembayaran kurang!', 'error'); return; }
    if (isTempo && !fd.get('jatuhTempo')) { showToast('Pilih tanggal jatuh tempo dulu!', 'error'); return; }
    const profit = state.cart.reduce((s, it) => s + (it.hargaJual - it.hargaModal) * it.qty, 0) - diskon;
    const sale = {
      tanggal: todayISO(),
      waktu: nowTime(),
      nomor: nextInvoiceNumber(state.sales),
      items: state.cart.map(c => ({
        productId: c.productId,
        nama: c.nama,
        qty: c.qty,
        hargaJual: c.hargaJual,
        hargaModal: c.hargaModal,
        satuan: c.satuan || 'pcs',
      })),
      subtotal, diskon, total,
      bayar,
      kembalian: isTempo ? 0 : (bayar - total),
      metode: fd.get('metode'),
      pelanggan: fd.get('pelanggan') || 'Anonim',
      pelangganAlamat: fd.get('pelangganAlamat') || '',
      pelangganTelepon: fd.get('pelangganTelepon') || '',
      jatuhTempo: fd.get('jatuhTempo') || '',
      profit,
    };
    addSale(sale);
    showToast(`✅ Transaksi ${sale.nomor} tersimpan`, 'success');
    closeModal('modal-checkout');
    // Show receipt
    showReceipt(sale);
    clearCart();
    renderPOSProducts();
    renderDashboard();
  };
}
