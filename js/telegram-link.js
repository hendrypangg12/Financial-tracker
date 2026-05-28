// Hubungkan Telegram → tarik transaksi dari bot @beruangpang2_bot ke app.
// Pairing: user /mulai di bot → dapat kode → masukin di sini → app simpan pullToken.
// Auto-pull: tiap buka app + berkala, tarik inbox dari worker → masuk transaksi.

const TG_PAIR_ENDPOINT = "https://berstock-bot.hendrypangg12.workers.dev/api/beruang-pair";
const TG_PULL_ENDPOINT = "https://berstock-bot.hendrypangg12.workers.dev/api/beruang-pull";

function tgEmail() {
  return (typeof currentUser !== "undefined" && currentUser && currentUser.email) || "";
}
function tgKey() { return "beruang-tg:" + (tgEmail() || "local"); }
function tgState() { try { return JSON.parse(localStorage.getItem(tgKey()) || "null"); } catch (_) { return null; } }
function tgSetState(s) { try { localStorage.setItem(tgKey(), JSON.stringify(s)); } catch (_) {} }
function tgIsLinked() { const s = tgState(); return !!(s && s.pullToken && s.linked); }

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

function openTelegramLink() {
  const linked = tgIsLinked();
  const msg = linked
    ? "Telegram udah tersambung ✅\nMau ganti akun? Masukin kode baru, atau Batal."
    : "Hubungkan Telegram:\n1. Buka @beruangpang2_bot, ketik /mulai\n2. Salin KODE-nya, tempel di sini:";
  const code = prompt(msg);
  if (code) linkTelegram(code);
}

window.openTelegramLink = openTelegramLink;
window.pullTelegramInbox = pullTelegramInbox;
window.tgIsLinked = tgIsLinked;
