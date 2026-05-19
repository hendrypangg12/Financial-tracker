// AI Suggestions — 3 use case BerBisnis integration:
//   1. Loyalty follow-up
//   2. Outstanding reminder
//   3. Win-back campaign
//
// Flow:
//   POST /scan   → detect triggers + generate AI message + save to ai_suggestions
//   GET  /       → list pending suggestions
//   POST /:id/approve → mark approved + send via WA (Twilio)
//   POST /:id/reject  → mark rejected
//   PUT  /:id    → edit message before approve

import { Router } from 'express';
import db from '../db.js';
import { generateBerBisnisSuggestion, scanCustomersForTriggers } from '../lib/ai-agent.js';
import { sendOutboundMessage } from '../lib/channels.js';

const router = Router();

// ============================================================
// GET /api/ai-suggestions
// Query: ?status=pending&limit=50
// ============================================================
router.get('/', (req, res) => {
  const status = req.query.status || 'pending';
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

  const rows = db.prepare(`
    SELECT
      s.id, s.contact_id, s.trigger_type, s.trigger_reason,
      s.suggested_message, s.edited_message, s.status,
      s.telegram_message_id, s.created_at, s.decided_at, s.sent_at,
      c.name as contact_name, c.phone as contact_phone,
      c.total_spent, c.total_outstanding, c.transaction_count,
      c.last_purchase_date, c.customer_status, c.loyalty_score
    FROM ai_suggestions s
    JOIN contacts c ON c.id = s.contact_id
    WHERE s.user_id = ? AND s.status = ?
    ORDER BY s.created_at DESC
    LIMIT ?
  `).all(req.userId, status, limit);

  res.json(rows);
});

// ============================================================
// POST /api/ai-suggestions/scan
// Detect customers yang memenuhi syarat trigger + generate AI message
// ============================================================
router.post('/scan', async (req, res) => {
  const { maxPerScan = 10 } = req.body || {};

  // Pre-fetch settings + knowledge sekali (avoid N+1 query)
  const settings = db.prepare('SELECT business_name, ai_tone FROM settings WHERE user_id = ?').get(req.userId);
  const kb = db.prepare('SELECT content FROM knowledge WHERE user_id = ?').get(req.userId);
  const knowledge = kb?.content || '';

  const triggers = scanCustomersForTriggers(req.userId).slice(0, maxPerScan);

  if (triggers.length === 0) {
    return res.json({ ok: true, scanned: 0, message: 'Belum ada customer yang memenuhi syarat trigger.' });
  }

  // Skip customer yang udah ada pending suggestion (avoid spam)
  const existingPending = db.prepare(`
    SELECT contact_id FROM ai_suggestions
    WHERE user_id = ? AND status = 'pending'
  `).all(req.userId);
  const pendingContactIds = new Set(existingPending.map((r) => r.contact_id));

  const filteredTriggers = triggers.filter((t) => !pendingContactIds.has(t.contact_id));

  const insertStmt = db.prepare(`
    INSERT INTO ai_suggestions (
      user_id, contact_id, trigger_type, trigger_reason,
      suggested_message, context_snapshot, status
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `);

  let generated = 0;
  let errors = 0;

  for (const t of filteredTriggers) {
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?').get(t.contact_id, req.userId);
    if (!contact) continue;

    try {
      const { message, reason } = await generateBerBisnisSuggestion({
        triggerType: t.trigger_type,
        contact,
        settings,
        knowledge,
      });

      if (!message) {
        errors++;
        continue;
      }

      const info = insertStmt.run(
        req.userId,
        contact.id,
        t.trigger_type,
        reason,
        message,
        JSON.stringify({
          contact_snapshot: {
            total_spent: contact.total_spent,
            total_outstanding: contact.total_outstanding,
            transaction_count: contact.transaction_count,
            last_purchase_date: contact.last_purchase_date,
            customer_status: contact.customer_status,
          },
          generated_at: new Date().toISOString(),
        })
      );

      // Push notification ke Berstock bot Telegram (fire & forget)
      notifyOwnerViaTelegram({
        userId: req.userId,
        suggestionId: info.lastInsertRowid,
        triggerType: t.trigger_type,
        contact,
        message,
        reason,
      }).catch((err) => console.error('Telegram notify error:', err));

      generated++;
    } catch (err) {
      console.error('AI suggestion error:', err);
      errors++;
    }
  }

  res.json({
    ok: true,
    scanned: triggers.length,
    skipped_already_pending: pendingContactIds.size,
    generated,
    errors,
  });
});

// ============================================================
// PUT /api/ai-suggestions/:id — edit message sebelum approve
// ============================================================
router.put('/:id', (req, res) => {
  const { edited_message } = req.body || {};
  if (!edited_message?.trim()) {
    return res.status(400).json({ error: 'edited_message required' });
  }
  const result = db.prepare(`
    UPDATE ai_suggestions SET edited_message = ?
    WHERE id = ? AND user_id = ? AND status = 'pending'
  `).run(edited_message.trim(), req.params.id, req.userId);
  if (!result.changes) return res.status(404).json({ error: 'Suggestion tidak ditemukan / sudah di-handle' });
  res.json({ ok: true });
});

// ============================================================
// POST /api/ai-suggestions/:id/approve — approve + send via WA
// ============================================================
router.post('/:id/approve', async (req, res) => {
  const suggestion = db.prepare(
    'SELECT * FROM ai_suggestions WHERE id = ? AND user_id = ? AND status = ?'
  ).get(req.params.id, req.userId, 'pending');
  if (!suggestion) return res.status(404).json({ error: 'Suggestion tidak ditemukan / sudah di-handle' });

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(suggestion.contact_id);
  if (!contact) return res.status(404).json({ error: 'Contact tidak ditemukan' });
  if (!contact.phone) return res.status(400).json({ error: 'Contact tidak punya nomor telepon' });

  const messageToSend = suggestion.edited_message || suggestion.suggested_message;

  // Buat (atau cari) conversation untuk contact ini
  let conversation = db.prepare(`
    SELECT id FROM conversations WHERE user_id = ? AND contact_id = ?
    ORDER BY id DESC LIMIT 1
  `).get(req.userId, contact.id);

  if (!conversation) {
    const newConv = db.prepare(`
      INSERT INTO conversations (user_id, contact_id, channel, ai_enabled, status)
      VALUES (?, ?, 'whatsapp', 0, 'open')
    `).run(req.userId, contact.id);
    conversation = { id: newConv.lastInsertRowid };
  }

  // Send via Twilio (kalau ada credential, otherwise log only)
  let sendStatus = 'sent';
  let errorMsg = null;
  try {
    await sendOutboundMessage({
      userId: req.userId,
      contactPhone: contact.phone,
      message: messageToSend,
    });
  } catch (err) {
    sendStatus = 'failed';
    errorMsg = err.message;
  }

  // Save message ke conversation (audit trail)
  db.prepare(`
    INSERT INTO messages (conversation_id, sender, body) VALUES (?, 'agent', ?)
  `).run(conversation.id, messageToSend);

  // Update suggestion
  db.prepare(`
    UPDATE ai_suggestions SET
      status = ?,
      decided_at = datetime('now'),
      sent_at = CASE WHEN ? = 'sent' THEN datetime('now') ELSE NULL END,
      error_message = ?
    WHERE id = ?
  `).run(sendStatus, sendStatus, errorMsg, suggestion.id);

  if (sendStatus === 'failed') {
    return res.status(502).json({ error: `Approve OK tapi send gagal: ${errorMsg}` });
  }

  res.json({ ok: true, conversation_id: conversation.id });
});

// ============================================================
// POST /api/ai-suggestions/:id/reject — reject suggestion
// ============================================================
router.post('/:id/reject', (req, res) => {
  const result = db.prepare(`
    UPDATE ai_suggestions SET status = 'rejected', decided_at = datetime('now')
    WHERE id = ? AND user_id = ? AND status = 'pending'
  `).run(req.params.id, req.userId);
  if (!result.changes) return res.status(404).json({ error: 'Suggestion tidak ditemukan / sudah di-handle' });
  res.json({ ok: true });
});

// ============================================================
// GET /api/ai-suggestions/stats — Quick stats
// ============================================================
router.get('/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'approved' OR status = 'sent' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN trigger_type = 'loyalty' AND (status = 'approved' OR status = 'sent') THEN 1 ELSE 0 END) as sent_loyalty,
      SUM(CASE WHEN trigger_type = 'outstanding' AND (status = 'approved' OR status = 'sent') THEN 1 ELSE 0 END) as sent_outstanding,
      SUM(CASE WHEN trigger_type = 'winback' AND (status = 'approved' OR status = 'sent') THEN 1 ELSE 0 END) as sent_winback
    FROM ai_suggestions
    WHERE user_id = ?
  `).get(req.userId);
  res.json(stats);
});

// ============================================================
// HELPER: Push notification ke Berstock Telegram bot
// ============================================================
async function notifyOwnerViaTelegram({ userId, suggestionId, triggerType, contact, message, reason }) {
  // Get sync config (contains telegram_chat_id + berstock_worker_url)
  const config = db.prepare(
    'SELECT telegram_chat_id, berstock_worker_url FROM berbisnis_sync WHERE user_id = ?'
  ).get(userId);

  if (!config?.telegram_chat_id) return; // owner belum link Telegram

  const workerUrl = config.berstock_worker_url || 'https://berstock-bot.hendrypangg12.workers.dev';
  const bridgeKey = process.env.BERSTOCK_BRIDGE_KEY || '';
  const cekatPublicUrl = process.env.CEKAT_PUBLIC_URL || ''; // e.g. https://crm.berstock.id

  const resp = await fetch(`${workerUrl}/api/notify-suggestion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bridgeKey}`,
    },
    body: JSON.stringify({
      chat_id: config.telegram_chat_id,
      suggestion: {
        id: suggestionId,
        trigger_type: triggerType,
        contact_name: contact.name,
        contact_phone: contact.phone,
        message,
        reason,
        cekat_url: cekatPublicUrl ? `${cekatPublicUrl}/inbox?suggestion=${suggestionId}` : undefined,
      },
    }),
  });

  if (resp.ok) {
    const data = await resp.json();
    if (data.telegram_message_id) {
      // Save Telegram message ID untuk later edit
      db.prepare(
        'UPDATE ai_suggestions SET telegram_message_id = ? WHERE id = ?'
      ).run(String(data.telegram_message_id), suggestionId);
    }
  } else {
    console.error('Telegram notify failed:', resp.status, await resp.text());
  }
}

export default router;
