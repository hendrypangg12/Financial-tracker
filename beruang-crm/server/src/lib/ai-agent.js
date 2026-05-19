import Anthropic from '@anthropic-ai/sdk';
import db from '../db.js';

export function shouldAIRespond(userId) {
  const s = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId);
  if (!s || !s.working_hours_enabled) return true;

  // Working hours enabled = AI only responds OUTSIDE work hours
  // (humans handle during work hours)
  const now = new Date();
  // Convert to Asia/Jakarta time (WIB, UTC+7)
  const wibMs = now.getTime() + (now.getTimezoneOffset() + 7 * 60) * 60_000;
  const wib = new Date(wibMs);
  const day = wib.getDay();
  const hhmm = wib.toTimeString().slice(0, 5);

  const workDays = (s.work_days || '1,2,3,4,5').split(',').map((d) => parseInt(d, 10));
  const isWorkDay = workDays.includes(day);
  const inWorkHours = isWorkDay && hhmm >= s.work_start && hhmm < s.work_end;

  return !inWorkHours;
}

export async function generateAIReply(userId, conversationId) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return '[AI belum aktif — admin perlu mengisi ANTHROPIC_API_KEY di server/.env]';
  }

  const knowledge = db.prepare('SELECT content FROM knowledge WHERE user_id = ?').get(userId);
  const settings = db.prepare('SELECT business_name, ai_tone FROM settings WHERE user_id = ?').get(userId);
  const recentMessages = db.prepare(`
    SELECT sender, body FROM messages
    WHERE conversation_id = ?
    ORDER BY id DESC LIMIT 20
  `).all(conversationId).reverse();

  const toneInstruction = {
    friendly: 'Pakai gaya bahasa ramah dan santai, sapaan "kak". Boleh pakai emoji sesekali.',
    formal: 'Pakai gaya bahasa formal dan profesional, sapaan "Bapak/Ibu". Hindari singkatan dan emoji.',
    playful: 'Pakai gaya bahasa santai, hangat, dengan sedikit humor. Pakai emoji untuk membuat suasana enak.',
    concise: 'Jawab sangat singkat dan to the point. Maksimal 2 kalimat per balasan kecuali harus menjelaskan detail.',
  }[settings?.ai_tone || 'friendly'];

  const systemBlocks = [
    {
      type: 'text',
      text: [
        `Kamu adalah AI customer service untuk ${settings?.business_name || 'bisnis ini'}.`,
        'Jawab menggunakan Bahasa Indonesia yang natural.',
        toneInstruction,
        'Jika tidak tahu jawabannya, akui jujur dan tawarkan untuk diteruskan ke admin manusia.',
        'Jangan mengarang harga, jadwal, atau kebijakan yang tidak ada di knowledge base.',
        '',
        'KNOWLEDGE BASE / SOP BISNIS:',
        knowledge?.content?.trim() || '(Belum ada knowledge base. Beritahu pelanggan bahwa admin akan segera membantu.)',
      ].join('\n'),
      cache_control: { type: 'ephemeral' },
    },
  ];

  const formatted = recentMessages.map((m) => ({
    role: m.sender === 'customer' ? 'user' : 'assistant',
    content: m.body,
  }));

  if (formatted.length === 0 || formatted[formatted.length - 1].role !== 'user') {
    return null;
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    system: systemBlocks,
    messages: formatted,
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock?.text || null;
}

// ============================================================
// BerBisnis Integration — AI Suggestion Generator (3 use cases)
// ============================================================

const SUGGESTION_PERSONAS = {
  loyalty: {
    label: 'Loyalty / Thank You',
    instruction: [
      'Tujuan: kirim ucapan terima kasih + suggest cross-sell ringan.',
      'Tone: hangat, apresiatif, gak hard sell.',
      'Format: 2-3 kalimat, akhiri dengan call-to-action ringan (mis. "Kalau perlu apa-apa lagi, kabarin ya").',
      'JANGAN: minta review, sebut diskon angka spesifik, atau template generic copy-paste.',
    ],
  },
  outstanding: {
    label: 'Outstanding Reminder',
    instruction: [
      'Tujuan: ingatkan pelanggan soal tagihan tempo dengan ramah.',
      'Tone: polite + friendly, jangan terkesan menagih kasar.',
      'Format: 3-4 kalimat. Mulai dengan sapaan, sebut tagihan + tanggal pembelian, tanya kapan bisa transfer, akhiri dengan "tetap senang berbisnis".',
      'JANGAN: pakai ALL CAPS, ancaman, atau bahasa yang bikin pelanggan malu.',
    ],
  },
  winback: {
    label: 'Win-back Campaign',
    instruction: [
      'Tujuan: pancing pelanggan loyal yang lama gak balik untuk visit lagi.',
      'Tone: "we miss you" — peduli, bukan needy.',
      'Format: 3-4 kalimat. Sapaan personal (sebut nama), notice gentle "udah lama gak ketemu", tawarkan something baru/spesial buat dia.',
      'JANGAN: terdengar memohon. Posisi diri sebagai bisnis yang masih ada kalau dia balik.',
    ],
  },
};

/**
 * Generate AI suggestion untuk 3 trigger BerBisnis.
 *
 * @param {Object} args
 * @param {string} args.triggerType  - 'loyalty' | 'outstanding' | 'winback'
 * @param {Object} args.contact      - Contact row dari DB (name, phone, total_spent, dll)
 * @param {Object} args.settings     - User settings (business_name, ai_tone)
 * @param {string} args.knowledge    - Knowledge base content
 * @returns {Promise<{message: string, reason: string}>}
 */
export async function generateBerBisnisSuggestion({ triggerType, contact, settings, knowledge }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      message: `[AI belum aktif — admin perlu set ANTHROPIC_API_KEY di server/.env]`,
      reason: 'No API key',
    };
  }

  const persona = SUGGESTION_PERSONAS[triggerType];
  if (!persona) throw new Error(`Unknown triggerType: ${triggerType}`);

  const toneInstruction = {
    friendly: 'Bahasa ramah-santai, sapaan "kak". Emoji sesekali boleh.',
    formal: 'Bahasa formal, sapaan "Bapak/Ibu". Hindari emoji.',
    playful: 'Bahasa hangat dengan sedikit humor. Emoji untuk warna.',
    concise: 'Singkat-padat, max 2 kalimat.',
  }[settings?.ai_tone || 'friendly'];

  const formatRp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
  const daysSince = contact.last_purchase_date
    ? Math.floor((Date.now() - new Date(contact.last_purchase_date).getTime()) / 86400000)
    : null;

  const contactContext = [
    `Nama: ${contact.name}`,
    contact.phone ? `Telepon: ${contact.phone}` : null,
    `Total belanja kumulatif: ${formatRp(contact.total_spent)}`,
    `Jumlah transaksi: ${contact.transaction_count || 0}`,
    contact.avg_transaction ? `Rata-rata transaksi: ${formatRp(contact.avg_transaction)}` : null,
    contact.last_purchase_date ? `Last purchase: ${contact.last_purchase_date} (${daysSince} hari lalu)` : null,
    contact.total_outstanding > 0 ? `Outstanding (tempo belum lunas): ${formatRp(contact.total_outstanding)}` : null,
    `Status: ${contact.customer_status || 'active'}`,
    `Loyalty score: ${contact.loyalty_score || 0}/100`,
  ].filter(Boolean).join('\n');

  const systemBlocks = [
    {
      type: 'text',
      text: [
        `Kamu adalah AI marketing assistant untuk ${settings?.business_name || 'UMKM Indonesia'}.`,
        `Tugas: bikin 1 pesan WhatsApp yang akan dikirim ke pelanggan.`,
        '',
        `TIPE PESAN: ${persona.label}`,
        ...persona.instruction.map((s) => `- ${s}`),
        '',
        `GAYA BAHASA: ${toneInstruction}`,
        '',
        'KETENTUAN UMUM:',
        '- WAJIB Bahasa Indonesia natural',
        '- Sebut NAMA pelanggan (kalau pas)',
        '- JANGAN sebut angka spesifik yang bisa di-misquote (kecuali outstanding)',
        '- JANGAN pakai signature/tanda tangan toko (akan auto-append)',
        '- Output langsung pesannya saja, tanpa preamble "Berikut pesan:"',
        '',
        'KNOWLEDGE BASE BISNIS (untuk context jenis usaha):',
        knowledge?.trim() || '(Tidak ada knowledge base. Asumsikan UMKM general.)',
      ].join('\n'),
      cache_control: { type: 'ephemeral' },
    },
  ];

  const userMsg = [
    'Data pelanggan:',
    contactContext,
    '',
    `Generate pesan ${persona.label} buat pelanggan di atas. Output: hanya teks pesan, tanpa quote/preamble.`,
  ].join('\n');

  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    system: systemBlocks,
    messages: [{ role: 'user', content: userMsg }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const message = textBlock?.text?.trim() || null;

  // Build reason string untuk audit
  let reason;
  if (triggerType === 'loyalty') {
    reason = `Loyal customer: ${contact.transaction_count} trx, total ${formatRp(contact.total_spent)}, last ${daysSince}d ago`;
  } else if (triggerType === 'outstanding') {
    reason = `Outstanding ${formatRp(contact.total_outstanding)}, last purchase ${daysSince}d ago`;
  } else if (triggerType === 'winback') {
    reason = `Loyal lama gak balik: ${contact.transaction_count} trx but ${daysSince} days inactive`;
  }

  return { message, reason };
}

/**
 * Detect customer yang memenuhi syarat untuk masing-masing trigger.
 * Return array of { contact_id, trigger_type } siap di-process.
 */
export function scanCustomersForTriggers(userId) {
  const contacts = db.prepare(`
    SELECT id, name, phone, total_spent, total_outstanding, transaction_count,
           last_purchase_date, customer_status, loyalty_score, avg_transaction
    FROM contacts
    WHERE user_id = ? AND source = 'berbisnis'
  `).all(userId);

  const triggers = [];
  const today = new Date();

  for (const c of contacts) {
    const daysSince = c.last_purchase_date
      ? Math.floor((today - new Date(c.last_purchase_date)) / 86400000)
      : null;

    // Skip kalau gak ada nomor (gak bisa kirim WA)
    if (!c.phone) continue;

    // === LOYALTY: customer baru achieve milestone (5x, 10x, 25x) atau weekly buyer ===
    if (c.transaction_count >= 5 && daysSince !== null && daysSince <= 3) {
      // Recently bought + repeat customer = good moment untuk apresiasi
      triggers.push({ contact_id: c.id, trigger_type: 'loyalty', priority: 70 });
      continue; // 1 trigger per customer per scan
    }

    // === OUTSTANDING: punya utang tempo > 7 hari ===
    if (c.total_outstanding > 0 && daysSince !== null && daysSince >= 7) {
      triggers.push({ contact_id: c.id, trigger_type: 'outstanding', priority: 90 });
      continue;
    }

    // === WIN-BACK: loyal sebelumnya tapi lama gak balik ===
    if (c.transaction_count >= 3 && daysSince !== null && daysSince >= 30 && daysSince <= 90) {
      triggers.push({ contact_id: c.id, trigger_type: 'winback', priority: 60 });
      continue;
    }
  }

  // Sort by priority (outstanding highest)
  triggers.sort((a, b) => b.priority - a.priority);

  return triggers;
}
