// Berstock — Cloudflare Worker entry point.
// Routes:
//   POST /webhook          — Telegram bot webhook (validated via X-Telegram-Bot-Api-Secret-Token)
//   POST /api/sync         — BerBisnis web app push data (validated via tenant api_key)
//   POST /api/provision    — Bikin tenant baru (admin only, validated via X-Admin-Key)
//   GET  /api/health       — Healthcheck
//   GET  /                 — Landing/info

import { sendMessage, sendTyping, parseUpdate } from "./telegram.js";
import { askClaude } from "./claude.js";
import { handleAdvise } from "./advise.js";
import {
  getTenantMeta, setTenantMeta, getTenantData, setTenantData,
  getTenantIdByChat, bindChatToTenant, unbindChat,
  recordUsage, getUsageStats,
  generateApiKey, generateTenantId,
  listAllTenantIds,
} from "./storage.js";

export default {
  // Cron handler — Daily Digest jam 7 pagi WIB (00:00 UTC)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendDailyDigestToAllTenants(env));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight — browser kirim OPTIONS sebelum POST application/json
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    try {
      switch (url.pathname) {
        case "/webhook":   return await handleTelegramWebhook(request, env, ctx);
        case "/api/sync":  return await handleSync(request, env);
        case "/api/pull":  return await handlePull(request, env);
        case "/api/provision": return await handleProvision(request, env);
        case "/api/lead":  return await handleLead(request, env);
        case "/api/advise": return await handleAdvise(request, env);
        case "/api/health": return jsonResponse({ ok: true, bot: env.BOT_NAME || "Berstock" });
        case "/":          return htmlResponse(landingPage(env));
        default:           return new Response("Not Found", { status: 404 });
      }
    } catch (err) {
      console.error("Unhandled error:", err);
      return jsonResponse({ error: err.message }, 500);
    }
  },
};

// =============================================================================
// TELEGRAM WEBHOOK
// =============================================================================

async function handleTelegramWebhook(request, env, ctx) {
  // Validasi secret token (Telegram mengirim ini di header)
  const incomingSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (incomingSecret !== env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const update = await request.json();
  const parsed = parseUpdate(update);
  if (!parsed) return jsonResponse({ ok: true, skipped: "no_message" });

  const { chatId, text, isCommand, command, args } = parsed;
  const token = env.TELEGRAM_BOT_TOKEN;

  // Handle commands
  if (isCommand) {
    return await handleCommand(env, token, chatId, command, args);
  }

  // Pesan biasa → cek apakah chat sudah terdaftar ke tenant
  const tenantId = await getTenantIdByChat(env, chatId);
  if (!tenantId) {
    await sendMessage(token, chatId,
      `Halo! 👋 Saya *Berstock*, asisten AI untuk monitoring stok & sales toko Anda.\n\n` +
      `Untuk mulai, kirim:\n\`/start <KODE_TENANT_ANDA>\`\n\n` +
      `Belum punya kode? Hubungi admin Anda atau daftar di sini:\n` +
      `https://wa.me/6282124848924`);
    return jsonResponse({ ok: true });
  }

  // Eksekusi async di background — jawab Telegram cepat (within 30s timeout)
  ctx.waitUntil(processQuery(env, token, chatId, tenantId, text));
  return jsonResponse({ ok: true });
}

async function handleCommand(env, token, chatId, command, args) {
  switch (command) {
    case "start": {
      if (!args) {
        await sendMessage(token, chatId,
          `Halo! 👋 Saya *Berstock*.\n\n` +
          `Untuk hubungkan ke toko Anda:\n\`/start <KODE_TENANT>\`\n\n` +
          `Contoh: \`/start tnt_a1b2c3\``);
        return jsonResponse({ ok: true });
      }
      const tenantId = args.trim();
      const meta = await getTenantMeta(env, tenantId);
      if (!meta) {
        await sendMessage(token, chatId, `❌ Kode tenant tidak ditemukan. Cek lagi ya bos.`);
        return jsonResponse({ ok: true });
      }
      await bindChatToTenant(env, chatId, tenantId);
      await sendMessage(token, chatId,
        `✅ Terhubung dengan *${meta.bizName}*!\n\n` +
        `Sekarang Anda bisa tanya apa saja tentang toko. Coba:\n` +
        `• _"Sales hari ini gimana?"_\n` +
        `• _"Stok yang habis apa?"_\n` +
        `• _"Apa yang harus saya restock?"_\n` +
        `• _"Best seller minggu ini?"_`);
      return jsonResponse({ ok: true });
    }

    case "help":
      await sendMessage(token, chatId,
        `*🤖 Berstock — AI Agent Stok*\n\n` +
        `Tanya apa saja tentang stok, sales, dan profit toko Anda. Contoh:\n\n` +
        `📊 *Penjualan*\n` +
        `• Sales hari ini berapa?\n` +
        `• Profit minggu ini gimana?\n` +
        `• Best seller bulan ini apa?\n\n` +
        `📦 *Stok*\n` +
        `• Stok apa yang habis?\n` +
        `• Apa yang harus saya restock?\n` +
        `• Indomie sisa berapa?\n\n` +
        `🐢 *Slow Moving*\n` +
        `• Barang apa yang ga laku 30 hari?\n` +
        `• Modal mati di mana saja?\n\n` +
        `*Commands:*\n` +
        `/status — info usage bulan ini\n` +
        `/unlink — putuskan dari tenant\n` +
        `/help — tampilkan ini`);
      return jsonResponse({ ok: true });

    case "status": {
      const tenantId = await getTenantIdByChat(env, chatId);
      if (!tenantId) {
        await sendMessage(token, chatId, `Belum terhubung. Pakai /start <kode_tenant>.`);
        return jsonResponse({ ok: true });
      }
      const meta = await getTenantMeta(env, tenantId);
      const stats = await getUsageStats(env, tenantId);
      const lastSync = meta.lastSync ? new Date(meta.lastSync).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "belum pernah";
      await sendMessage(token, chatId,
        `📊 *Status Berstock*\n\n` +
        `🏪 Bisnis: *${meta.bizName}*\n` +
        `🪪 Plan: ${meta.plan || "Pro"}\n` +
        `🔄 Last sync: ${lastSync}\n` +
        `💬 Query bulan ini: ${stats?.queries || 0}\n` +
        `💰 Cost API: $${(stats?.costUsd || 0).toFixed(3)}`);
      return jsonResponse({ ok: true });
    }

    case "unlink": {
      await unbindChat(env, chatId);
      await sendMessage(token, chatId, `✅ Sudah terputus. Pakai /start lagi untuk hubungkan kembali.`);
      return jsonResponse({ ok: true });
    }

    default:
      await sendMessage(token, chatId, `Command tidak dikenal. Pakai /help untuk lihat daftar.`);
      return jsonResponse({ ok: true });
  }
}

async function processQuery(env, token, chatId, tenantId, userText) {
  try {
    await sendTyping(token, chatId);

    const meta = await getTenantMeta(env, tenantId);
    const data = await getTenantData(env, tenantId);

    // Cek data umur — kalau >24 jam, kasih warning
    const dataStale = meta.lastSync && (Date.now() - new Date(meta.lastSync).getTime() > 24 * 60 * 60 * 1000);

    const result = await askClaude({
      apiKey: env.ANTHROPIC_API_KEY,
      userMessage: userText,
      tenantData: data,
      bizName: meta.bizName || "Toko Anda",
    });

    let reply = result.text;
    if (dataStale) {
      reply += `\n\n_⚠️ Data terakhir di-sync >24 jam lalu. Buka BerBisnis → Pengaturan → Sync ke Cloud._`;
    }

    await sendMessage(token, chatId, reply);
    await recordUsage(env, tenantId, result.usage);

  } catch (err) {
    console.error("processQuery error:", err);
    await sendMessage(token, chatId,
      `Maaf bos, ada error nih: \`${err.message}\`\nCoba tanya lagi atau hubungi admin.`);
  }
}

// =============================================================================
// SYNC ENDPOINT (BerBisnis web app push data ke sini)
// =============================================================================

async function handleSync(request, env) {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const payload = await request.json().catch(() => null);
  if (!payload) return jsonResponse({ error: "Invalid JSON" }, 400);

  const { tenant_id, api_key, data } = payload;
  if (!tenant_id || !api_key || !data) {
    return jsonResponse({ error: "Missing tenant_id, api_key, or data" }, 400);
  }

  const meta = await getTenantMeta(env, tenant_id);
  if (!meta) return jsonResponse({ error: "Tenant not found" }, 404);
  if (meta.apiKey !== api_key) return jsonResponse({ error: "Invalid API key" }, 401);

  // Validasi shape minimal
  if (!Array.isArray(data.products)) {
    return jsonResponse({ error: "data.products must be an array" }, 400);
  }

  await setTenantData(env, tenant_id, {
    products: data.products || [],
    sales: data.sales || [],
    settings: data.settings || {},
    kategori: data.kategori || [],
  });

  meta.lastSync = new Date().toISOString();
  await setTenantMeta(env, tenant_id, meta);

  return jsonResponse({
    ok: true,
    syncedAt: meta.lastSync,
    counts: {
      products: data.products.length,
      sales: (data.sales || []).length,
    },
  });
}

// =============================================================================
// PULL ENDPOINT (BerBisnis web app TARIK data dari cloud, untuk restore di device baru)
// =============================================================================

async function handlePull(request, env) {
  const url = new URL(request.url);
  const tenant_id = url.searchParams.get("tenant_id");
  const api_key = url.searchParams.get("api_key");

  if (!tenant_id || !api_key) {
    return jsonResponse({ error: "Missing tenant_id or api_key" }, 400);
  }

  const meta = await getTenantMeta(env, tenant_id);
  if (!meta) return jsonResponse({ error: "Tenant not found" }, 404);
  if (meta.apiKey !== api_key) return jsonResponse({ error: "Invalid API key" }, 401);

  const data = await getTenantData(env, tenant_id);

  return jsonResponse({
    ok: true,
    bizName: meta.bizName,
    lastSync: meta.lastSync,
    data: {
      products: data.products || [],
      sales: data.sales || [],
      settings: data.settings || {},
      kategori: data.kategori || [],
    },
    counts: {
      products: (data.products || []).length,
      sales: (data.sales || []).length,
    },
  });
}

// =============================================================================
// PROVISION ENDPOINT (admin-only — bikin tenant baru)
// =============================================================================

async function handleProvision(request, env) {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const adminKey = request.headers.get("X-Admin-Key");
  if (adminKey !== env.ADMIN_KEY) return new Response("Unauthorized", { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { bizName, ownerName, plan = "Pro" } = body;
  if (!bizName) return jsonResponse({ error: "bizName required" }, 400);

  const tenantId = generateTenantId();
  const apiKey = generateApiKey();

  const meta = {
    bizName,
    ownerName: ownerName || "",
    apiKey,
    plan,
    createdAt: new Date().toISOString(),
    lastSync: null,
    allowedChats: [],
  };

  await setTenantMeta(env, tenantId, meta);
  await setTenantData(env, tenantId, { products: [], sales: [], settings: {}, kategori: [] });

  return jsonResponse({
    ok: true,
    tenant_id: tenantId,
    api_key: apiKey,
    instructions: {
      step1: `Berikan ke owner: kode tenant = ${tenantId}`,
      step2: `Owner ketik di bot Telegram: /start ${tenantId}`,
      step3: `Setting di BerBisnis web (Pengaturan → Cloud Sync): tenant_id + api_key`,
    },
  });
}

// =============================================================================
// LEAD CAPTURE — Notif Telegram saat ada lead masuk dari berstock.id
// =============================================================================

async function handleLead(request, env) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const { nama, wa, usaha, intent, flow_history, source } = body;

  // Basic validation
  if (!nama || !wa) {
    return jsonResponse({ error: "nama & wa required" }, 400);
  }

  // Build notif message
  const flowPath = Array.isArray(flow_history) ? flow_history.slice(-5).join(" → ") : "";
  const ts = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  const msg = `🎯 *LEAD BARU dari berstock.id*

👤 Nama: *${escapeMd(nama)}*
📱 WA: \`${escapeMd(wa)}\`
🏪 Usaha: *${escapeMd(usaha || "tidak diisi")}*
🎬 Intent: ${escapeMd(intent || "general")}
🛤️ Path: _${escapeMd(flowPath || "direct")}_
🌐 Source: ${escapeMd(source || "berstock.id")}
⏰ ${escapeMd(ts)} WIB

💬 [Chat WA Sekarang](https://wa.me/${wa.replace(/\D/g, "")})`;

  // Send to owner Telegram (admin chat ID)
  const ADMIN_CHAT_ID = env.ADMIN_TELEGRAM_CHAT_ID;
  if (!ADMIN_CHAT_ID) {
    console.warn("ADMIN_TELEGRAM_CHAT_ID not set, lead saved but not notified");
  } else {
    try {
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: msg,
          parse_mode: "Markdown",
          disable_web_page_preview: false,
        }),
      });
    } catch (e) {
      console.error("Failed to send Telegram notif:", e);
    }
  }

  // Save to KV for record-keeping (optional)
  try {
    const leadKey = `lead:${Date.now()}:${wa.replace(/\D/g, "")}`;
    await env.BOT_DATA.put(leadKey, JSON.stringify({
      nama, wa, usaha, intent, flow_history, source, ts,
    }), { expirationTtl: 60 * 60 * 24 * 90 }); // 90 hari
  } catch (e) {
    console.error("Failed to save lead to KV:", e);
  }

  return jsonResponse({ ok: true, message: "Lead notified" });
}

function escapeMd(s) {
  if (!s) return "";
  return String(s).replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

// =============================================================================
// HELPERS
// =============================================================================

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
    },
  });
}

function htmlResponse(html) {
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function landingPage(env) {
  return `<!doctype html><meta charset="utf-8"><title>${env.BOT_NAME || "Berstock"}</title>
<style>body{font-family:system-ui;max-width:640px;margin:60px auto;padding:0 20px;color:#1a2238;line-height:1.6}
h1{color:#1e3a5f}.code{background:#f4f4f4;padding:2px 8px;border-radius:4px;font-family:ui-monospace,monospace}</style>
<h1>🤖 ${env.BOT_NAME || "Berstock"} — API Worker</h1>
<p>AI Agent Stok untuk UMKM Indonesia. Endpoint aktif:</p>
<ul>
  <li><span class="code">POST /webhook</span> — Telegram webhook</li>
  <li><span class="code">POST /api/sync</span> — Push data dari BerBisnis</li>
  <li><span class="code">POST /api/provision</span> — Bikin tenant baru (admin)</li>
  <li><span class="code">GET /api/health</span> — Healthcheck</li>
</ul>
<p>Owner toko: hubungi admin untuk kode aktivasi.<br>
Demo & info: <a href="https://wa.me/6282124848924">WhatsApp</a></p>`;
}

// =============================================================================
// DAILY DIGEST — auto-send tiap pagi (cron 00:00 UTC = 07:00 WIB)
// =============================================================================

async function sendDailyDigestToAllTenants(env) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) { console.warn("No TELEGRAM_BOT_TOKEN, skip digest"); return; }

  const tenantIds = await listAllTenantIds(env);
  console.log(`[DailyDigest] Processing ${tenantIds.length} tenants...`);

  let sent = 0, errors = 0;
  for (const tenantId of tenantIds) {
    try {
      const meta = await getTenantMeta(env, tenantId);
      if (!meta) continue;

      // Skip kalau opt-out (digest_off di meta) atau gak ada chat
      if (meta.digestOff === true) continue;
      const chats = meta.allowedChats || [];
      if (!chats.length) continue;

      // Skip kalau plan trial atau expired (only paid)
      // (untuk MVP, kirim ke semua dulu)

      const data = await getTenantData(env, tenantId);
      const digest = generateDigestMessage(meta, data);

      // Kirim ke semua chat yang terdaftar untuk tenant ini
      for (const chatId of chats) {
        try {
          await sendMessage(token, chatId, digest, { parse_mode: "Markdown" });
          sent++;
        } catch (e) {
          console.warn(`Failed send digest to chat ${chatId}:`, e.message);
        }
      }
    } catch (e) {
      console.warn(`Digest failed for tenant ${tenantId}:`, e.message);
      errors++;
    }
  }
  console.log(`[DailyDigest] Done. Sent: ${sent}, Errors: ${errors}`);
}

function generateDigestMessage(meta, data) {
  const bizName = meta.bizName || "Toko Anda";
  const products = data.products || [];
  const sales = data.sales || [];

  // Yesterday range (UTC adjusted: 00:00 UTC = 07:00 WIB, so yesterday WIB = 24h ago)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const ydayISO = yesterday.toISOString().slice(0, 10);
  const dayBeforeISO = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const ydaySales = sales.filter(s => s.tanggal === ydayISO);
  const dayBeforeSales = sales.filter(s => s.tanggal === dayBeforeISO);

  const ydayRevenue = ydaySales.reduce((a, s) => a + (s.total || 0), 0);
  const dayBeforeRevenue = dayBeforeSales.reduce((a, s) => a + (s.total || 0), 0);
  const change = dayBeforeRevenue > 0
    ? Math.round((ydayRevenue - dayBeforeRevenue) / dayBeforeRevenue * 100)
    : null;
  const changeStr = change !== null
    ? (change >= 0 ? `(↑ ${change}% vs hari sebelumnya)` : `(↓ ${Math.abs(change)}% vs hari sebelumnya)`)
    : "";

  const ydayProfit = ydaySales.reduce((a, s) => a + (s.profit || 0), 0);

  // Top seller kemarin
  const counts = {};
  for (const s of ydaySales) {
    for (const it of (s.items || [])) {
      counts[it.productId] = counts[it.productId] || { nama: it.nama, qty: 0, satuan: it.satuan || "pcs" };
      counts[it.productId].qty += it.qty || 0;
    }
  }
  const topSeller = Object.values(counts).sort((a, b) => b.qty - a.qty)[0];

  // Stok kritis hari ini
  const lowStock = products
    .filter(p => (p.stok || 0) <= (p.minStok || 5))
    .slice(0, 3);

  // Piutang overdue
  const today = new Date(); today.setHours(23, 59, 59, 999);
  const overdueSales = sales.filter(s => {
    if (s.metode !== "tempo" || s.lunas) return false;
    if (!s.jatuhTempo) return false;
    return new Date(s.jatuhTempo + "T23:59:59") < today;
  });
  const overdueAmount = overdueSales.reduce((a, s) => a + (s.total || 0), 0);

  // Jatuh tempo hari ini
  const todayISO = now.toISOString().slice(0, 10);
  const dueToday = sales.filter(s => {
    if (s.metode !== "tempo" || s.lunas) return false;
    return s.jatuhTempo === todayISO;
  });

  let msg = `🌅 *Selamat pagi bos!*\n_${bizName}_\n\n`;

  msg += `📊 *Recap kemarin:*\n`;
  if (ydaySales.length === 0) {
    msg += `_Belum ada transaksi kemarin._\n\n`;
  } else {
    msg += `💰 Omzet: *${formatRupiah(ydayRevenue)}* ${changeStr}\n`;
    msg += `📈 Profit: *${formatRupiah(ydayProfit)}*\n`;
    msg += `🛒 ${ydaySales.length} transaksi\n`;
    if (topSeller) msg += `🏆 Best seller: *${topSeller.nama}* (${topSeller.qty} ${topSeller.satuan})\n`;
    msg += `\n`;
  }

  msg += `🎯 *Hari ini perlu perhatian:*\n`;
  let hasAlert = false;
  if (dueToday.length > 0) {
    const total = dueToday.reduce((a, s) => a + (s.total || 0), 0);
    msg += `⏱️ ${dueToday.length} piutang jatuh tempo *hari ini* — ${formatRupiah(total)}\n`;
    hasAlert = true;
  }
  if (overdueSales.length > 0) {
    msg += `⚠️ ${overdueSales.length} piutang *overdue* — ${formatRupiah(overdueAmount)}\n`;
    hasAlert = true;
  }
  if (lowStock.length > 0) {
    msg += `📦 Stok kritis: ${lowStock.map(p => `${p.nama} (sisa ${p.stok})`).join(", ")}\n`;
    hasAlert = true;
  }
  if (!hasAlert) msg += `✨ Semua aman — fokus jualan aja bos! 🚀\n`;

  msg += `\n_Have a productive day!_ 🐻`;
  msg += `\n_Tanya apa aja ke saya: stok, sales, piutang, dll._`;

  return msg;
}

function formatRupiah(n) {
  return "Rp " + (Math.round(n) || 0).toLocaleString("id-ID");
}
