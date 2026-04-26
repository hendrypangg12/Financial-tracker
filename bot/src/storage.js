// Cloudflare KV wrapper untuk multi-tenant data.
//
// KV namespaces:
// - BOT_DATA  : data bisnis per tenant
//     key: tenant:{id}:data  → JSON {products, sales, settings, kategori}
//     key: tenant:{id}:meta  → JSON {bizName, apiKey, plan, createdAt, lastSync, ownerName, allowedChats:[]}
//
// - BOT_AUTH  : mapping Telegram chat → tenant
//     key: chat:{chat_id}    → tenant_id (string)
//     key: tenant:{id}:limits → JSON {monthQueries, monthCostUsd, lastReset}

// =============================================================================
// TENANT META & DATA
// =============================================================================

export async function getTenantMeta(env, tenantId) {
  const raw = await env.BOT_DATA.get(`tenant:${tenantId}:meta`);
  return raw ? JSON.parse(raw) : null;
}

export async function setTenantMeta(env, tenantId, meta) {
  await env.BOT_DATA.put(`tenant:${tenantId}:meta`, JSON.stringify(meta));
}

export async function getTenantData(env, tenantId) {
  const raw = await env.BOT_DATA.get(`tenant:${tenantId}:data`);
  return raw ? JSON.parse(raw) : { products: [], sales: [], settings: {}, kategori: [] };
}

export async function setTenantData(env, tenantId, data) {
  // Cap data size — 25MB hard limit per KV value, kita batasi 5MB defensively
  const json = JSON.stringify(data);
  if (json.length > 5_000_000) throw new Error("Data terlalu besar (max 5MB)");
  await env.BOT_DATA.put(`tenant:${tenantId}:data`, json);
}

// =============================================================================
// CHAT ↔ TENANT MAPPING
// =============================================================================

export async function getTenantIdByChat(env, chatId) {
  return await env.BOT_AUTH.get(`chat:${chatId}`);
}

export async function bindChatToTenant(env, chatId, tenantId) {
  await env.BOT_AUTH.put(`chat:${chatId}`, tenantId);
  // Update juga di meta supaya bisa list chat ID per tenant
  const meta = await getTenantMeta(env, tenantId);
  if (meta) {
    meta.allowedChats = Array.from(new Set([...(meta.allowedChats || []), chatId]));
    await setTenantMeta(env, tenantId, meta);
  }
}

export async function unbindChat(env, chatId) {
  const tenantId = await getTenantIdByChat(env, chatId);
  await env.BOT_AUTH.delete(`chat:${chatId}`);
  if (tenantId) {
    const meta = await getTenantMeta(env, tenantId);
    if (meta) {
      meta.allowedChats = (meta.allowedChats || []).filter(c => c !== chatId);
      await setTenantMeta(env, tenantId, meta);
    }
  }
}

// =============================================================================
// USAGE TRACKING (untuk monitoring cost & throttling)
// =============================================================================

export async function recordUsage(env, tenantId, usage) {
  const key = `tenant:${tenantId}:limits`;
  const raw = await env.BOT_AUTH.get(key);
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let stats = raw ? JSON.parse(raw) : { monthKey, queries: 0, costUsd: 0 };
  if (stats.monthKey !== monthKey) {
    stats = { monthKey, queries: 0, costUsd: 0 };
  }

  // Sonnet 4.6 pricing (per 1M tokens)
  const PRICE_INPUT = 3.0;
  const PRICE_OUTPUT = 15.0;
  const PRICE_CACHE_WRITE = 3.75;  // 1.25× input
  const PRICE_CACHE_READ = 0.30;   // 0.1× input

  const cost =
    (usage.input_tokens / 1_000_000) * PRICE_INPUT +
    (usage.output_tokens / 1_000_000) * PRICE_OUTPUT +
    (usage.cache_creation_input_tokens / 1_000_000) * PRICE_CACHE_WRITE +
    (usage.cache_read_input_tokens / 1_000_000) * PRICE_CACHE_READ;

  stats.queries += 1;
  stats.costUsd += cost;

  await env.BOT_AUTH.put(key, JSON.stringify(stats));
  return stats;
}

export async function getUsageStats(env, tenantId) {
  const raw = await env.BOT_AUTH.get(`tenant:${tenantId}:limits`);
  return raw ? JSON.parse(raw) : null;
}

// =============================================================================
// HELPERS
// =============================================================================

export function generateApiKey() {
  // 32-char random hex
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function generateTenantId() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const id = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `tnt_${id}`;
}
