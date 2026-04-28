// Berstock — Cloudflare Worker entry point.
// Routes:
//   POST /webhook          — Telegram bot webhook (validated via X-Telegram-Bot-Api-Secret-Token)
//   POST /api/sync         — BerBisnis web app push data (validated via tenant api_key)
//   POST /api/provision    — Bikin tenant baru (admin only, validated via X-Admin-Key)
//   GET  /api/health       — Healthcheck
//   GET  /                 — Landing/info

import { sendMessage, sendTyping, parseUpdate } from "./telegram.js";
import { askClaude } from "./claude.js";
import {
  getTenantMeta, setTenantMeta, getTenantData, setTenantData,
  getTenantIdByChat, bindChatToTenant, unbindChat,
  recordUsage, getUsageStats,
  generateApiKey, generateTenantId,
} from "./storage.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      switch (url.pathname) {
        case "/webhook":   return await handleTelegramWebhook(request, env, ctx);
        case "/api/sync":  return await handleSync(request, env);
        case "/api/pull":  return await handlePull(request, env);
        case "/api/provision": return await handleProvision(request, env);
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
