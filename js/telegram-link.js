// Hubungkan Telegram → tarik transaksi dari bot @beruangpang2_bot ke app.
// Pairing: user /mulai di bot → dapat kode → masukin di sini → app simpan pullToken.
// Auto-pull: tiap buka app + berkala, tarik inbox dari worker → masuk transaksi.

const TG_BOT_USERNAME = "beruangpang2_bot";
const TG_BOT_URL = "https://t.me/" + TG_BOT_USERNAME;
const TG_PAIR_ENDPOINT = "https://berstock-bot.hendrypangg12.workers.dev/api/beruang-pair";
const TG_PULL_ENDPOINT = "https://berstock-bot.hendrypangg12.workers.dev/api/beruang-pull";
const TG_BILLS_PUSH_ENDPOINT = "https://berstock-bot.hendrypangg12.workers.dev/api/beruang-bills-push";

function tgEmail() {
  return (typeof currentUser !== "undefined" && currentUser && currentUser.email) || "";
}
function tgKey() { return "beruang-tg:" + (tgEmail() || "local"); }
function tgState() { try { return JSON.parse(localStorage.getItem(tgKey()) || "null"); } catch (_) { return null; } }
function tgSetState(s) { try { localStorage.setItem(tgKey(), JSON.stringify(s)); } catch (_) {} }
function tgIsLinked() { const s = tgState(); return !!(s && s.pullToken && s.linked); }
function tgUnsetState() { try { localStorage.removeItem(tgKey()); } catch (_) {} }

async function linkTelegram(code) {
  const email = tgEmail();
  if (!email) { if (typeof showToast === "function") showToast("Login dulu ya bos", "error"); return; }
  code = String(code).replace(/\D/g, "").trim();
  if (code.length < 4) { if (typeof showToast === "function") showToast("Kode gak valid", "error"); return; }
  const prev = tgState();
  const pullToken = (prev && prev.pullToken) || ("pt_" + Math.random().toString(36).slice(2) + Date.now().toString(36));
  try {
    const res = await fetch(TG_PAIR_ENDPOINT, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, email, pullToken }),
    });
    const data = await res.json();
    if (data && data.ok) {
      tgSetState({ pullToken, linked: true });
      if (typeof showToast === "function") showToast("Telegram tersambung! 🐻", "success");
      pullTelegramInbox();
      resetBillsPushCache();
      pushBillsToBotNow(); // langsung kirim bills supaya bot bisa notif
      renderTgModal(); // refresh modal ke state linked
    } else {
      if (typeof showToast === "function") showToast(data && data.error ? data.error : "Gagal menyambung", "error");
    }
  } catch (e) {
    if (typeof showToast === "function") showToast("Koneksi error, coba lagi", "error");
  }
}

async function pullTelegramInbox() {
  if (!tgIsLinked()) return;
  const s = tgState();
  const email = tgEmail();
  try {
    const res = await fetch(TG_PULL_ENDPOINT, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, pullToken: s.pullToken }),
    });
    const data = await res.json();
    if (data && data.ok && Array.isArray(data.items) && data.items.length) {
      let n = 0;
      data.items.forEach((it) => {
        if (!it || !it.jumlah) return;
        if ((state.transactions || []).some((t) => t.id === it.id)) return; // anti-dobel
        addTransaction({
          id: it.id, tanggal: it.tanggal, jenis: it.jenis, jumlah: Number(it.jumlah) || 0,
          deskripsi: it.deskripsi, subKategori: it.subKategori, kategori: it.kategori, alokasi: it.alokasi || "",
        });
        n++;
      });
      if (n) {
        if (typeof renderAll === "function") renderAll();
        if (typeof showToast === "function") showToast(`${n} transaksi dari Telegram masuk 🐻`, "success");
      }
    }
  } catch (e) { /* offline, abaikan */ }
}

// ====== Modal "Hubungkan Telegram" ======
function tgModalSetup() {
  const close = document.getElementById("tg-modal-close");
  if (close && !close.__bound) {
    close.__bound = true;
    close.addEventListener("click", closeTgModal);
  }
  const modal = document.getElementById("modal-tg-link");
  if (modal && !modal.__bound) {
    modal.__bound = true;
    modal.addEventListener("click", (e) => { if (e.target === modal) closeTgModal(); });
  }
}

function openTgModal() {
  tgModalSetup();
  const modal = document.getElementById("modal-tg-link");
  if (!modal) return;
  modal.hidden = false;
  modal.style.display = "";
  renderTgModal();
}

function closeTgModal() {
  const modal = document.getElementById("modal-tg-link");
  if (!modal) return;
  modal.hidden = true;
  modal.style.display = "none";
}

function renderTgModal() {
  const body = document.getElementById("tg-modal-body");
  if (!body) return;
  if (tgIsLinked()) {
    body.innerHTML = `
      <h3 style="margin-top:0">🤖 Telegram Tersambung ✅</h3>
      <p style="color:var(--muted);margin:8px 0 16px">Tinggal chat ke bot, transaksi otomatis masuk app.</p>
      <div style="background:#f1ece2;border-radius:12px;padding:12px 14px;margin-bottom:12px">
        <div style="font-weight:600;margin-bottom:6px;font-size:13px;color:var(--ink)">Cara pakai di Telegram:</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.8;color:var(--ink)">
          <div>• Ketik <b>bakso 25rb</b> → pengeluaran</div>
          <div>• Ketik <b>gaji 5jt masuk</b> → pemasukan</div>
          <div>• <b>📸 Kirim foto struk</b> → auto-baca AI</div>
          <div>• <b>bensin 50000</b>, <b>kopi 15rb</b>, dst.</div>
        </div>
      </div>
      <div style="background:#fff7e6;border:1px solid #f0d488;border-radius:12px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:var(--ink);line-height:1.5">
        🔔 <b>Bonus:</b> Tagihan rutin (kost/cicilan/langganan) yang kamu input di app akan otomatis dapat <b>notif H-3 &amp; hari H</b> via Telegram. Tap "Udah bayar" — langsung ke-catat.
      </div>
      <p style="color:var(--muted);font-size:12px;margin:0 0 14px">Nominal otomatis kebaca (rb = ribu, jt = juta). Foto struk pakai AI vision.</p>
      <div class="modal-actions" style="flex-wrap:wrap;gap:8px">
        <button type="button" class="btn btn-ghost" id="tg-btn-relink">🔄 Ganti Akun</button>
        <button type="button" class="btn btn-ghost" id="tg-btn-pull">⬇️ Tarik Sekarang</button>
        <a href="${TG_BOT_URL}" target="_blank" rel="noopener" class="btn btn-primary" style="text-decoration:none">📲 Buka Bot</a>
      </div>
    `;
    const r = document.getElementById("tg-btn-relink");
    if (r) r.addEventListener("click", () => renderTgModalForm(true));
    const p = document.getElementById("tg-btn-pull");
    if (p) p.addEventListener("click", async () => {
      if (typeof showToast === "function") showToast("Lagi narik dari Telegram...", "info");
      await pullTelegramInbox();
    });
  } else {
    renderTgModalForm(false);
  }
}

function renderTgModalForm(isRelink) {
  const body = document.getElementById("tg-modal-body");
  if (!body) return;
  body.innerHTML = `
    <h3 style="margin-top:0">🤖 Catat via Chat Telegram</h3>
    <p style="color:var(--muted);margin:6px 0 18px;font-size:14px">
      ${isRelink ? "Masukin kode baru buat ganti akun Telegram." : "Chat transaksi atau 📸 kirim foto struk — bot auto-catat. Sekali setup, selamanya jalan."}
    </p>

    <ol style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.7">
      <li>Tap <b>Buka Bot</b> di bawah → buka chat <code style="background:#f1ece2;padding:1px 6px;border-radius:4px;font-size:12px">@${TG_BOT_USERNAME}</code> di Telegram</li>
      <li>Tap tombol <b>Start</b> (atau ketik <code style="background:#f1ece2;padding:1px 6px;border-radius:4px;font-size:12px">/mulai</code>)</li>
      <li>Bot kasih <b>kode 6 digit</b> — copy</li>
      <li>Balik ke sini, paste di kotak bawah → tap <b>Sambungkan</b></li>
    </ol>

    <div style="margin:14px 0">
      <a href="${TG_BOT_URL}" target="_blank" rel="noopener" class="btn btn-primary" style="text-decoration:none;display:block;text-align:center;padding:12px;font-weight:600">
        📲 Buka @${TG_BOT_USERNAME}
      </a>
    </div>

    <label style="display:block;margin-top:14px">
      <span style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Kode dari bot:</span>
      <input type="text" inputmode="numeric" id="tg-code-input" maxlength="8" placeholder="6 digit angka"
        style="width:100%;padding:12px;font-size:18px;text-align:center;letter-spacing:4px;border:2px solid var(--border, #ddd);border-radius:10px;font-family:'JetBrains Mono',monospace" />
    </label>

    <div class="modal-actions" style="margin-top:14px">
      <button type="button" class="btn btn-ghost" id="tg-btn-cancel">Batal</button>
      <button type="button" class="btn btn-primary" id="tg-btn-submit">Sambungkan</button>
    </div>

    <p style="color:var(--muted);font-size:12px;margin:14px 0 0;line-height:1.5">
      💡 Kode berlaku 15 menit. Bot ini sama untuk semua user — pemisahan data otomatis lewat email akun + chat ID Telegram bos.
    </p>
  `;
  const input = document.getElementById("tg-code-input");
  if (input) {
    input.addEventListener("input", () => { input.value = input.value.replace(/\D/g, "").slice(0, 6); });
    input.focus();
  }
  document.getElementById("tg-btn-cancel").addEventListener("click", () => {
    if (isRelink && tgIsLinked()) renderTgModal(); else closeTgModal();
  });
  document.getElementById("tg-btn-submit").addEventListener("click", async () => {
    const code = (input && input.value || "").trim();
    if (!code) { if (typeof showToast === "function") showToast("Masukin kode dulu bos", "error"); return; }
    await linkTelegram(code);
  });
}

function openTelegramLink() { openTgModal(); }

// ====== PUSH BILLS ke bot (debounced) ======
// Dipanggil dari saveState(). Bot pakai data ini buat kirim notif H-3 + H-0.
let _billsPushTimer = null;
let _billsLastPayload = "";
function schedulePushBillsToBot() {
  if (!tgIsLinked()) return;
  clearTimeout(_billsPushTimer);
  _billsPushTimer = setTimeout(pushBillsToBotNow, 4000);
}

async function pushBillsToBotNow() {
  if (!tgIsLinked()) return;
  const email = tgEmail();
  const s = tgState();
  if (!email || !s || !s.pullToken) return;
  const bills = (typeof state !== "undefined" && Array.isArray(state.recurring)) ? state.recurring : [];
  // Hitung posted records dari transactions (untuk dedupe server-side)
  const posted = [];
  const seen = new Set();
  (state.transactions || []).forEach((t) => {
    if (!t || !t.recurringId || !t.recurringMonth) return;
    const k = t.recurringId + "|" + t.recurringMonth;
    if (seen.has(k)) return;
    seen.add(k);
    posted.push({ recurringId: t.recurringId, recurringMonth: t.recurringMonth });
  });
  const payload = JSON.stringify({ email, pullToken: s.pullToken, bills, posted: posted.slice(-200) });
  if (payload === _billsLastPayload) return; // skip kalau gak berubah
  try {
    const res = await fetch(TG_BILLS_PUSH_ENDPOINT, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: payload,
    });
    if (res.ok) _billsLastPayload = payload;
  } catch (e) { /* offline, biarin */ }
}

// Reset cache pas user login/logout
function resetBillsPushCache() { _billsLastPayload = ""; }

// ====== Promo banner di dashboard ======
// Tampil kalau user PUNYA tagihan rutin tapi BELUM connect Telegram.
// Dismiss = sembunyi 7 hari.
function tgPromoDismissKey() { return "beruang-tg-promo-dismiss:" + (tgEmail() || "local"); }
function tgPromoDismissed() {
  try {
    const ts = parseInt(localStorage.getItem(tgPromoDismissKey()) || "0", 10);
    if (!ts) return false;
    return (Date.now() - ts) < 7 * 24 * 3600 * 1000;
  } catch (_) { return false; }
}
function dismissTgPromo() {
  try { localStorage.setItem(tgPromoDismissKey(), String(Date.now())); } catch (_) {}
  renderTgBillPromo();
}

function renderTgBillPromo() {
  const el = document.getElementById("tg-bill-promo");
  if (!el) return;
  const hasBills = typeof state !== "undefined" && Array.isArray(state.recurring) && state.recurring.length > 0;
  if (!hasBills || tgIsLinked() || tgPromoDismissed()) {
    el.hidden = true; el.innerHTML = "";
    return;
  }
  const n = state.recurring.length;
  el.hidden = false;
  el.innerHTML = `
    <div class="panel" style="background:linear-gradient(135deg,#fff7e6 0%,#fceec6 100%);border:1px solid #f0d488;position:relative;">
      <button id="tg-promo-x" aria-label="Tutup" style="position:absolute;top:8px;right:8px;border:none;background:rgba(255,255,255,0.6);width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:14px;line-height:1;color:#8b5a2b;">×</button>
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <div style="font-size:32px;flex-shrink:0;">🔔</div>
        <div style="flex:1;min-width:200px;">
          <div style="font-weight:700;color:#4a3328;font-size:15px;margin-bottom:4px;">Gak lupa bayar tagihan lagi 🐻</div>
          <div style="font-size:13px;color:#6b4423;line-height:1.5;">
            Punya <b>${n}</b> tagihan rutin. Sambungkan Telegram &mdash; bot kirim notif <b>H-3 &amp; hari H</b>, tap "Udah bayar" langsung ke-catat.
          </div>
        </div>
        <button id="tg-promo-link" style="flex-shrink:0;border:none;background:#8b5a2b;color:#fff;font-weight:700;font-size:13px;padding:10px 16px;border-radius:10px;cursor:pointer;white-space:nowrap;">
          📲 Sambungkan
        </button>
      </div>
    </div>
  `;
  const x = document.getElementById("tg-promo-x");
  if (x) x.onclick = dismissTgPromo;
  const btn = document.getElementById("tg-promo-link");
  if (btn) btn.onclick = openTelegramLink;
}

window.openTelegramLink = openTelegramLink;
window.pullTelegramInbox = pullTelegramInbox;
window.tgIsLinked = tgIsLinked;
window.schedulePushBillsToBot = schedulePushBillsToBot;
window.pushBillsToBotNow = pushBillsToBotNow;
window.resetBillsPushCache = resetBillsPushCache;
window.renderTgBillPromo = renderTgBillPromo;
