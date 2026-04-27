// Wrapper Claude API dengan tool use loop + prompt caching.
// Pakai Anthropic SDK official. Model: Sonnet 4.6 (chat-grade, cost-efficient).

import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./prompt.js";
import { TOOLS, executeTool } from "./tools.js";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2048;        // Telegram = pendek; 2K cukup
const MAX_TOOL_ITERATIONS = 5;  // safety cap supaya ga infinite loop

/**
 * Tanya Claude dengan akses ke tools. Loop sampai Claude selesai (end_turn).
 *
 * @param {Object} args
 * @param {string} args.apiKey       - Anthropic API key
 * @param {string} args.userMessage  - Pertanyaan owner dari Telegram
 * @param {Object} args.tenantData   - Snapshot data BerBisnis (products, sales, settings)
 * @param {string} args.bizName      - Nama bisnis untuk konteks
 * @returns {Promise<{text: string, usage: object, iterations: number}>}
 */
export async function askClaude({ apiKey, userMessage, tenantData, bizName }) {
  const client = new Anthropic({ apiKey });

  // Tanggal & nama bisnis di-inject ke USER message bukan system prompt,
  // supaya prompt cache (system + tools) tetap hit byte-for-byte.
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "Asia/Jakarta",
  });
  const enrichedUserMsg = `[Bisnis: ${bizName}] [Hari ini: ${today}]\n\n${userMessage}`;

  const messages = [{ role: "user", content: enrichedUserMsg }];
  let totalUsage = {
    input_tokens: 0, output_tokens: 0,
    cache_creation_input_tokens: 0, cache_read_input_tokens: 0,
  };
  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" }, // cache system + tools (5 min TTL)
        },
      ],
      tools: TOOLS,
      messages,
    });

    // Akumulasi usage untuk cost tracking
    if (response.usage) {
      totalUsage.input_tokens += response.usage.input_tokens || 0;
      totalUsage.output_tokens += response.usage.output_tokens || 0;
      totalUsage.cache_creation_input_tokens += response.usage.cache_creation_input_tokens || 0;
      totalUsage.cache_read_input_tokens += response.usage.cache_read_input_tokens || 0;
    }

    // Selesai? Ambil text response dan return
    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find(b => b.type === "text");
      return {
        text: textBlock?.text || "Maaf bos, ada error nih. Coba tanya lagi ya.",
        usage: totalUsage,
        iterations,
      };
    }

    // Tool use? Eksekusi semua tool_use blocks dan loop
    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(b => b.type === "tool_use");

      // Append assistant turn (preserve full content including tool_use blocks)
      messages.push({ role: "assistant", content: response.content });

      // Eksekusi tools (paralel kalau memungkinkan)
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (tu) => {
          try {
            const result = await executeTool(tu.name, tu.input || {}, tenantData);
            return {
              type: "tool_result",
              tool_use_id: tu.id,
              content: JSON.stringify(result),
            };
          } catch (err) {
            return {
              type: "tool_result",
              tool_use_id: tu.id,
              content: JSON.stringify({ error: err.message }),
              is_error: true,
            };
          }
        })
      );

      // Append user turn dengan tool_result(s)
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Stop reason lain (max_tokens, refusal) — bail out
    const fallback = response.content.find(b => b.type === "text")?.text;
    return {
      text: fallback || "Maaf bos, jawaban kepotong. Coba tanya lebih spesifik ya.",
      usage: totalUsage,
      iterations,
    };
  }

  // Iterasi habis — bisa terjadi kalau Claude looping panggil tool terus
  return {
    text: "Maaf bos, butuh waktu lebih lama dari biasanya. Coba pecah pertanyaan jadi lebih spesifik.",
    usage: totalUsage,
    iterations,
  };
}
