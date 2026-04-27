// Claude Usage Proxy — Cloudflare Worker
// Proxy Anthropic Admin API supaya admin key gak ke-expose di browser.
//
// Endpoint:
//   GET /usage?starting_at=...&ending_at=...&bucket_width=1d&group_by=model,api_key_id
//   GET /cost?starting_at=...&ending_at=...&group_by=description
//   GET /health
//
// Auth: header `X-Dashboard-Key` harus match secret DASHBOARD_KEY.

const ADMIN_BASE = "https://api.anthropic.com/v1/organizations";
const ANTHROPIC_VERSION = "2023-06-01";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/health") {
      return json({ ok: true, ts: new Date().toISOString() }, cors);
    }

    // Auth check
    const provided = request.headers.get("X-Dashboard-Key") || url.searchParams.get("key");
    if (!env.DASHBOARD_KEY || provided !== env.DASHBOARD_KEY) {
      return json({ error: "unauthorized" }, cors, 401);
    }

    if (!env.ANTHROPIC_ADMIN_KEY) {
      return json({ error: "ANTHROPIC_ADMIN_KEY belum di-set di worker" }, cors, 500);
    }

    try {
      if (url.pathname === "/usage") {
        return await proxyAdminApi(`${ADMIN_BASE}/usage_report/messages`, url.searchParams, env, cors);
      }
      if (url.pathname === "/cost") {
        return await proxyAdminApi(`${ADMIN_BASE}/cost_report`, url.searchParams, env, cors);
      }
      return json({ error: "not_found", hint: "Coba /usage, /cost, atau /health" }, cors, 404);
    } catch (err) {
      return json({ error: "proxy_error", message: String(err?.message || err) }, cors, 502);
    }
  },
};

async function proxyAdminApi(baseUrl, params, env, cors) {
  // Whitelist param yang boleh diteruskan supaya gak ada injeksi parameter aneh.
  const allowed = new Set([
    "starting_at",
    "ending_at",
    "bucket_width",
    "limit",
    "page",
    "group_by",
    "models",
    "api_key_ids",
    "workspace_ids",
    "service_tiers",
    "context_window",
    "inference_geos",
    "speeds",
    "account_ids",
    "service_account_ids",
  ]);

  const upstream = new URL(baseUrl);
  for (const [k, v] of params.entries()) {
    if (k === "key") continue;
    if (!allowed.has(k)) continue;
    upstream.searchParams.append(k, v);
  }

  const res = await fetch(upstream.toString(), {
    method: "GET",
    headers: {
      "X-Api-Key": env.ANTHROPIC_ADMIN_KEY,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json",
    },
  });

  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: {
      ...cors,
      "Content-Type": res.headers.get("Content-Type") || "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function corsHeaders(origin, env) {
  const allowList = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allow = allowList.includes(origin) ? origin : allowList[0] || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "X-Dashboard-Key, Content-Type",
    "Vary": "Origin",
  };
}

function json(obj, extraHeaders = {}, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}
