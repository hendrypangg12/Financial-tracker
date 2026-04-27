// Module: Jual / POS / Cart
function renderPOSProducts() {
  const search = (document.getElementById('pos-search')?.value || '').toLowerCase();
  let list = [...state.products];
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
    const photo = p.fotoUrl
      ? `<img class="pphoto" src="${p.fotoUrl}" alt="" loading="lazy" />`
      : `<div class="pphoto pphoto-empty">📦</div>`;
    return `
    <div class="product-card ${p.stok <= 0 ? 'out-of-stock' : ''}" data-pid="${p.id}">
      ${photo}
      <div class="pname">${escapeHtml(p.nama)}</div>
      <div class="pprice">${formatRupiah(p.hargaJual)}</div>
      <div class="pstok">Stok: ${p.stok} ${escapeHtml(p.satuan || 'pcs')}</div>
    </div>
  `;
  }).join('');
  grid.querySelectorAll('.product-card').forEach(card => {
    card.onclick = () => {
      const id = card.dataset.pid;
      const p = getProduct(id);
      if (!p || p.stok <= 0) { showToast('Stok habis!', 'error'); return; }
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
  });
  ul.querySelectorAll('input[data-i]').forEach(inp => inp.onchange = () => {
    const i = +inp.dataset.i;
    let q = Math.min(+inp.value || 1, state.cart[i].maxStok);
    q = Math.max(q, 1);
    state.cart[i].qty = q;
    renderCart();
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
  openModal('modal-checkout');
  setTimeout(() => form.querySelector('[name="bayar"]').select(), 100);
}

function setupCheckoutForm() {
  const form = document.getElementById('form-checkout');
  const bayarInput = form.querySelector('[name="bayar"]');
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
    const bayar = +fd.get('bayar');
    if (bayar < total) { showToast('Pembayaran kurang!', 'error'); return; }
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
      })),
      subtotal, diskon, total,
      bayar,
      kembalian: bayar - total,
      metode: fd.get('metode'),
      pelanggan: fd.get('pelanggan') || 'Anonim',
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
