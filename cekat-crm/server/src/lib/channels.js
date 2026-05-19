// Channel send dispatcher. Currently routes WhatsApp messages back via Twilio.
// Falls back to no-op for the 'simulator' channel.
import twilio from 'twilio';

let twilioClient = null;
function getTwilio() {
  if (twilioClient) return twilioClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  twilioClient = twilio(sid, token);
  return twilioClient;
}

export function isTwilioConfigured() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM
  );
}

export async function sendToChannel(conversation, body) {
  if (conversation.channel !== 'whatsapp') return;
  const client = getTwilio();
  if (!client) {
    console.warn('[channels] Twilio not configured — skipping WhatsApp send');
    return;
  }
  // Look up contact phone
  // Imported lazily to avoid circular deps in test scenarios
  const db = (await import('../db.js')).default;
  const contact = db.prepare('SELECT phone FROM contacts WHERE id = ?').get(conversation.contact_id);
  if (!contact?.phone) {
    console.warn('[channels] Contact has no phone — cannot send WhatsApp');
    return;
  }
  const to = contact.phone.startsWith('whatsapp:')
    ? contact.phone
    : `whatsapp:+${contact.phone.replace(/^\+/, '')}`;
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to,
    body,
  });
}

/**
 * Kirim WhatsApp ke nomor langsung (tanpa conversation context).
 * Dipakai oleh AI Suggestions approval flow.
 *
 * @param {Object} args
 * @param {number} args.userId  - User ID Cekat CRM (untuk audit)
 * @param {string} args.contactPhone - Nomor telepon (E.164 atau "08xxxx")
 * @param {string} args.message - Pesan WA
 */
export async function sendOutboundMessage({ userId, contactPhone, message }) {
  if (!contactPhone) throw new Error('contactPhone required');
  if (!message?.trim()) throw new Error('message required');

  const client = getTwilio();
  if (!client) {
    // Mode dev / Twilio belum di-config → log only, anggap "sent" simulator
    console.log(`[sendOutboundMessage SIMULATOR user=${userId}] To: ${contactPhone}\n${message}`);
    return { simulated: true };
  }

  // Normalize ke E.164 + prefix whatsapp:
  let clean = contactPhone.replace(/\D/g, '');
  // Tambah country code Indonesia kalau diawali 0
  if (clean.startsWith('0')) clean = '62' + clean.slice(1);
  const to = `whatsapp:+${clean}`;

  const result = await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to,
    body: message,
  });

  return { sid: result.sid, status: result.status };
}
