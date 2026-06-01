// =============================================================================
// PAYMENT GATEWAY (Xendit) — siap diisi credentials setelah Xendit approved
// =============================================================================
//
// Setup env vars (wrangler secret put):
//   XENDIT_SECRET_KEY  : Secret key dari Xendit dashboard (Settings > API Keys)
//   XENDIT_WEBHOOK_TOKEN : Token dari Xendit dashboard webhook setting
//
// Flow:
//   1. Frontend POST /api/create-invoice {uid, paket, amount, externalId, successUrl, failureUrl}
//      → Worker call Xendit API → return {checkoutUrl, invoiceId}
//      → Worker simpan {externalId → {uid, paket, status:'pending'}} di KV
//   2. User bayar di Xendit checkout (QRIS / VA / e-wallet)
//   3. Xendit webhook hit /api/xendit-webhook dengan invoice paid event
//      → Worker validate token, update KV {status:'paid', paidAt}
//   4. User redirect kembali ke app dengan ?payment=success&ref=externalId
//      → Frontend GET /api/verify-payment?ref=externalId
//      → Worker baca KV → return {status, paket, uid}
//      → Frontend update Firestore (activate subscription)
//
// KV namespace: BOT_DATA (existing)
// Key prefix:   payment:<externalId>  TTL 7 hari

const PAYMENT_KV_PREFIX = "payment:";
const PAYMENT_KV_TTL = 7 * 24 * 3600; // 7 hari

// Paket config untuk validasi server-side (mirror PACKAGE_CONFIG di js/auth.js)
const PACKAGE_AMOUNTS = {
  trial:   { amount: 10000,  days: 7,   label: "Coba 7 Hari" },
  monthly: { amount: 50000,  days: 30,  label: "Bulanan" },
  annual:  { amount: 299000, days: 365, label: "Tahunan" },
};

function corsJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// POST /api/create-invoice
export async function handleCreateInvoice(request, env) {
  if (request.method !== "POST") return corsJson({ error: "Method not allowed" }, 405);

  let body;
  try { body = await request.json(); }
  catch { return corsJson({ error: "Invalid JSON" }, 400); }

  const { product, uid, email, paket, amount, externalId, successUrl, failureUrl } = body;

  if (!product || product !== "beruang") return corsJson({ error: "Invalid product" }, 400);
  if (!uid || !email || !paket || !externalId) return corsJson({ error: "Missing fields" }, 400);

  const cfg = PACKAGE_AMOUNTS[paket];
  if (!cfg) return corsJson({ error: `Invalid paket: ${paket}` }, 400);

  // Server-side validate amount cocok config (anti tamper)
  if (Number(amount) !== cfg.amount) {
    return corsJson({ error: `Amount mismatch: expected ${cfg.amount}, got ${amount}` }, 400);
  }

  // Cek Xendit credentials
  if (!env.XENDIT_SECRET_KEY) {
    return corsJson({
      error: "Payment gateway belum aktif (XENDIT_SECRET_KEY belum di-set). Hubungi admin via WA.",
      fallback: "wa",
    }, 503);
  }

  // Call Xendit Create Invoice API
  // https://developers.xendit.co/api-reference/#create-invoice
  const xenditPayload = {
    external_id: externalId,
    amount: cfg.amount,
    payer_email: email,
    description: `BerUang Pro — ${cfg.label}`,
    success_redirect_url: successUrl,
    failure_redirect_url: failureUrl,
    invoice_duration: 86400, // 24 jam expiry
    currency: "IDR",
    items: [{
      name: `BerUang Pro · ${cfg.label}`,
      quantity: 1,
      price: cfg.amount,
      category: "Digital",
    }],
  };

  const auth = btoa(`${env.XENDIT_SECRET_KEY}:`);
  let xenditRes;
  try {
    xenditRes = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify(xenditPayload),
    });
  } catch (err) {
    console.error("[xendit] network error:", err);
    return corsJson({ error: "Xendit unreachable" }, 502);
  }

  const xenditData = await xenditRes.json().catch(() => ({}));
  if (!xenditRes.ok || !xenditData.invoice_url) {
    console.error("[xendit] error response:", xenditRes.status, xenditData);
    return corsJson({ error: xenditData.message || "Xendit error", details: xenditData }, 502);
  }

  // Simpan record di KV untuk verify nanti
  const record = {
    uid,
    email,
    paket,
    amount: cfg.amount,
    externalId,
    invoiceId: xenditData.id,
    invoiceUrl: xenditData.invoice_url,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await env.BOT_DATA.put(
    PAYMENT_KV_PREFIX + externalId,
    JSON.stringify(record),
    { expirationTtl: PAYMENT_KV_TTL }
  );

  return corsJson({
    ok: true,
    checkoutUrl: xenditData.invoice_url,
    invoiceId: xenditData.id,
    externalId,
  });
}

// GET /api/verify-payment?ref=externalId
export async function handleVerifyPayment(request, env) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");
  if (!ref) return corsJson({ error: "Missing ref" }, 400);

  const raw = await env.BOT_DATA.get(PAYMENT_KV_PREFIX + ref);
  if (!raw) return corsJson({ error: "Invoice not found / expired", status: "not_found" }, 404);

  const record = JSON.parse(raw);

  // Kalau status masih pending di KV, double-check ke Xendit API (defensive)
  if (record.status === "pending" && env.XENDIT_SECRET_KEY && record.invoiceId) {
    try {
      const auth = btoa(`${env.XENDIT_SECRET_KEY}:`);
      const res = await fetch(`https://api.xendit.co/v2/invoices/${record.invoiceId}`, {
        headers: { "Authorization": `Basic ${auth}` },
      });
      const data = await res.json();
      if (data.status === "PAID" || data.status === "SETTLED") {
        record.status = "paid";
        record.paidAt = data.paid_at || new Date().toISOString();
        record.paymentMethod = data.payment_method || "unknown";
        await env.BOT_DATA.put(
          PAYMENT_KV_PREFIX + ref,
          JSON.stringify(record),
          { expirationTtl: PAYMENT_KV_TTL }
        );
      } else if (data.status === "EXPIRED") {
        record.status = "expired";
        await env.BOT_DATA.put(
          PAYMENT_KV_PREFIX + ref,
          JSON.stringify(record),
          { expirationTtl: PAYMENT_KV_TTL }
        );
      }
    } catch (err) {
      console.warn("[verify-payment] xendit poll failed:", err.message);
    }
  }

  return corsJson({
    status: record.status,
    paket: record.paket,
    uid: record.uid,
    paidAt: record.paidAt || null,
    paymentMethod: record.paymentMethod || null,
  });
}

// POST /api/xendit-webhook — Xendit kirim notif saat invoice paid/expired
// Set webhook URL di Xendit dashboard: https://berstock-bot.hendrypangg12.workers.dev/api/xendit-webhook
// Verification: Xendit kirim header `x-callback-token` = XENDIT_WEBHOOK_TOKEN
export async function handleXenditWebhook(request, env) {
  if (request.method !== "POST") return corsJson({ error: "Method not allowed" }, 405);

  // Validate webhook token (kalau di-set)
  if (env.XENDIT_WEBHOOK_TOKEN) {
    const incoming = request.headers.get("x-callback-token");
    if (incoming !== env.XENDIT_WEBHOOK_TOKEN) {
      console.warn("[xendit-webhook] invalid token:", incoming);
      return corsJson({ error: "Unauthorized" }, 401);
    }
  }

  let body;
  try { body = await request.json(); }
  catch { return corsJson({ error: "Invalid JSON" }, 400); }

  const externalId = body.external_id;
  const status = body.status; // 'PAID' | 'EXPIRED' | 'SETTLED'
  if (!externalId) return corsJson({ error: "Missing external_id" }, 400);

  const raw = await env.BOT_DATA.get(PAYMENT_KV_PREFIX + externalId);
  if (!raw) {
    // Bisa jadi invoice dari product lain (BerBisnis) — terima silent
    console.log("[xendit-webhook] external_id not in KV:", externalId);
    return corsJson({ ok: true, skipped: "not_in_kv" });
  }

  const record = JSON.parse(raw);

  if (status === "PAID" || status === "SETTLED") {
    record.status = "paid";
    record.paidAt = body.paid_at || new Date().toISOString();
    record.paymentMethod = body.payment_method || "unknown";
    record.xenditEvent = body;
  } else if (status === "EXPIRED") {
    record.status = "expired";
  } else {
    console.log("[xendit-webhook] unknown status:", status);
  }

  await env.BOT_DATA.put(
    PAYMENT_KV_PREFIX + externalId,
    JSON.stringify(record),
    { expirationTtl: PAYMENT_KV_TTL }
  );

  return corsJson({ ok: true, processed: status });
}
