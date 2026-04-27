// Telegram Bot API helpers — kirim/terima pesan via webhook.

const TG_API = "https://api.telegram.org/bot";

/**
 * Kirim pesan ke chat Telegram.
 */
export async function sendMessage(token, chatId, text, opts = {}) {
  const url = `${TG_API}${token}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: truncateForTelegram(text),
    parse_mode: opts.parse_mode || "Markdown",
    disable_web_page_preview: true,
    ...opts,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("Telegram sendMessage failed:", res.status, errText);
    // Fallback: try without Markdown (mungkin ada char yang break parser)
    if (opts.parse_mode !== null && body.parse_mode === "Markdown") {
      return sendMessage(token, chatId, text, { ...opts, parse_mode: null });
    }
  }
  return res.ok;
}

/**
 * Kirim "typing..." indicator (chat action).
 */
export async function sendTyping(token, chatId) {
  const url = `${TG_API}${token}/sendChatAction`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  }).catch(() => {});
}

/**
 * Parse Telegram webhook update payload.
 * @returns {{chatId, userId, username, text, isCommand, command, args}|null}
 */
export function parseUpdate(update) {
  const msg = update?.message || update?.edited_message;
  if (!msg) return null;

  const text = msg.text || "";
  const chatId = msg.chat?.id;
  const userId = msg.from?.id;
  const username = msg.from?.username || msg.from?.first_name || "unknown";

  // Detect command (e.g. /start tnt_abc123)
  let isCommand = false, command = null, args = "";
  if (text.startsWith("/")) {
    isCommand = true;
    const space = text.indexOf(" ");
    if (space === -1) { command = text.slice(1); args = ""; }
    else { command = text.slice(1, space); args = text.slice(space + 1).trim(); }
    // Strip bot mention if present (e.g. /start@BerstockBot)
    const at = command.indexOf("@");
    if (at >= 0) command = command.slice(0, at);
  }

  return { chatId, userId, username, text, isCommand, command, args };
}

/**
 * Telegram message limit ~4096 chars. Cut dengan elegant.
 */
function truncateForTelegram(text) {
  if (!text) return "(kosong)";
  if (text.length <= 4000) return text;
  return text.slice(0, 3950) + "\n\n_(...dipotong, terlalu panjang untuk Telegram)_";
}

/**
 * Set webhook URL ke Telegram (dipakai sekali saat setup).
 */
export async function setWebhook(token, webhookUrl, secret) {
  const url = `${TG_API}${token}/setWebhook`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message"],
    }),
  });
  return res.json();
}

/**
 * Get bot info (untuk verifikasi token valid).
 */
export async function getBotInfo(token) {
  const res = await fetch(`${TG_API}${token}/getMe`);
  return res.json();
}
