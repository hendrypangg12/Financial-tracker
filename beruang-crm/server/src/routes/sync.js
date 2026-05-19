// Sync customer data dari BerBisnis POS (via Berstock bot Cloudflare Worker)
//
// Flow:
//   1. Owner Beruang CRM set tenant_id + api_key (dari Berstock bot)
//   2. Klik "Sync from BerBisnis" atau auto-sync cron
//   3. Beruang CRM call POST {BERSTOCK_WORKER}/api/pull → terima sales[]
//   4. Aggregate sales → customers (group by nama+telepon)
//   5. Upsert ke contacts table dengan external_id sebagai unique key

import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ============================================================
// GET /api/sync/config — Get current sync configuration
// ============================================================
router.get('/config', (req, res) => {
  const row = db.prepare(
    'SELECT user_id, tenant_id, berstock_worker_url, last_sync_at, last_sync_status, last_sync_count, auto_sync, auto_sync_interval_hours, telegram_chat_id, updated_at FROM berbisnis_sync WHERE user_id = ?'
  ).get(req.userId);
  if (!row) {
    return res.json({
      configured: false,
      berstock_worker_url: 'https://berstock-bot.hendrypangg12.workers.dev',
      auto_sync: 1,
      auto_sync_interval_hours: 6,
    });
  }
  res.json({ configured: true, ...row, api_key_set: true });
});

// ============================================================
// PUT /api/sync/config — Save tenant_id + api_key
// ============================================================
router.put('/config', (req, res) => {
  const {
    tenant_id,
    api_key,
    berstock_worker_url,
    auto_sync,
    auto_sync_interval_hours,
    telegram_chat_id,
  } = req.body || {};

  if (!tenant_id) return res.status(400).json({ error: 'tenant_id wajib diisi' });

  const existing = db.prepare(
    'SELECT user_id FROM berbisnis_sync WHERE user_id = ?'
  ).get(req.userId);

  if (existing) {
    db.prepare(`
      UPDATE berbisnis_sync SET
        tenant_id = ?,
        api_key = COALESCE(?, api_key),
        berstock_worker_url = COALESCE(?, berstock_worker_url),
        auto_sync = COALESCE(?, auto_sync),
        auto_sync_interval_hours = COALESCE(?, auto_sync_interval_hours),
        telegram_chat_id = COALESCE(?, telegram_chat_id),
        updated_at = datetime('now')
      WHERE user_id = ?
    `).run(
      tenant_id,
      api_key || null,
      berstock_worker_url || null,
      typeof auto_sync === 'number' ? auto_sync : null,
      typeof auto_sync_interval_hours === 'number' ? auto_sync_interval_hours : null,
      telegram_chat_id || null,
      req.userId
    );
  } else {
    if (!api_key) return res.status(400).json({ error: 'api_key wajib untuk first setup' });
    db.prepare(`
      INSERT INTO berbisnis_sync
        (user_id, tenant_id, api_key, berstock_worker_url, auto_sync, auto_sync_interval_hours, telegram_chat_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.userId,
      tenant_id,
      api_key,
      berstock_worker_url || 'https://berstock-bot.hendrypangg12.workers.dev',
      typeof auto_sync === 'number' ? auto_sync : 1,
      typeof auto_sync_interval_hours === 'number' ? auto_sync_interval_hours : 6,
      telegram_chat_id || null
    );
  }
  res.json({ ok: true });
});

// ============================================================
// POST /api/sync/pull — Trigger manual sync from BerBisnis
// ============================================================
router.post('/pull', async (req, res) => {
  const config = db.prepare(
    'SELECT * FROM berbisnis_sync WHERE user_id = ?'
  ).get(req.userId);

  if (!config || !config.tenant_id || !config.api_key) {
    return res.status(400).json({
      error: 'Konfigurasi sync belum di-set. Buka Settings → Sync from BerBisnis.',
    });
  }

  const workerUrl = config.berstock_worker_url || 'https://berstock-bot.hendrypangg12.workers.dev';
  const pullUrl = `${workerUrl}/api/pull?tenant_id=${encodeURIComponent(config.tenant_id)}&api_key=${encodeURIComponent(config.api_key)}`;

  let result;
  try {
    const resp = await fetch(pullUrl, { method: 'GET' });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Berstock worker error ${resp.status}: ${errText.slice(0, 200)}`);
    }
    result = await resp.json();
  } catch (err) {
    db.prepare(`
      UPDATE berbisnis_sync SET last_sync_at = datetime('now'), last_sync_status = ?, last_sync_count = 0
      WHERE user_id = ?
    `).run(`error: ${err.message}`, req.userId);
    return res.status(502).json({ error: `Gagal pull dari Berstock: ${err.message}` });
  }

  if (!result?.ok || !result?.data?.sales) {
    return res.status(502).json({ error: 'Format response Berstock tidak valid' });
  }

  // Aggregate customers dari sales (mengikuti pattern BerBisnis aggregateCustomers)
  const customers = aggregateCustomersFromSales(result.data.sales);

  // Upsert ke contacts table
  const upsertStats = upsertCustomers(req.userId, customers);

  // Update sync timestamp
  db.prepare(`
    UPDATE berbisnis_sync SET
      last_sync_at = datetime('now'),
      last_sync_status = 'success',
      last_sync_count = ?
    WHERE user_id = ?
  `).run(customers.length, req.userId);

  res.json({
    ok: true,
    bizName: result.bizName,
    pulled_sales: result.counts?.sales || 0,
    aggregated_customers: customers.length,
    ...upsertStats,
  });
});

// ============================================================
// HELPER: Aggregate customers dari array sales BerBisnis
// ============================================================
function aggregateCustomersFromSales(sales) {
  const map = new Map();

  for (const sale of sales) {
    const nama = (sale.pelanggan || 'Anonim').trim();
    if (nama.toLowerCase() === 'anonim' || !nama) continue;
    const telp = (sale.pelangganTelepon || '').replace(/\D/g, '');
    const key = telp ? `${nama.toLowerCase()}|${telp}` : nama.toLowerCase();

    if (!map.has(key)) {
      map.set(key, {
        external_id: `berbisnis:${key}`,
        name: nama,
        phone: telp || null,
        address: sale.pelangganAlamat || null,
        total_spent: 0,
        total_outstanding: 0,
        transaction_count: 0,
        last_purchase_date: null,
        sales_count: 0,
      });
    }

    const c = map.get(key);
    c.total_spent += sale.total || 0;
    c.transaction_count += 1;
    if (sale.metode === 'tempo' && !sale.lunas) {
      c.total_outstanding += sale.total || 0;
    }
    // Track last purchase date
    const saleDate = sale.tanggal || sale.created_at;
    if (saleDate && (!c.last_purchase_date || saleDate > c.last_purchase_date)) {
      c.last_purchase_date = saleDate;
    }
  }

  // Compute derived metrics
  const today = new Date().toISOString().slice(0, 10);
  return Array.from(map.values()).map((c) => {
    const avgTrx = c.transaction_count > 0 ? Math.round(c.total_spent / c.transaction_count) : 0;
    const daysSinceLastBuy = c.last_purchase_date
      ? Math.floor((new Date(today) - new Date(c.last_purchase_date)) / 86400000)
      : 9999;

    let status = 'active';
    let loyaltyScore = 0;
    if (c.transaction_count >= 10 && daysSinceLastBuy <= 14) {
      status = 'loyal';
      loyaltyScore = 90;
    } else if (c.transaction_count >= 5 && daysSinceLastBuy <= 30) {
      status = 'active';
      loyaltyScore = 70;
    } else if (c.transaction_count >= 3 && daysSinceLastBuy > 30) {
      status = 'at_risk';
      loyaltyScore = 50;
    } else if (daysSinceLastBuy > 60 && c.transaction_count >= 3) {
      status = 'churned';
      loyaltyScore = 30;
    }

    return { ...c, avg_transaction: avgTrx, customer_status: status, loyalty_score: loyaltyScore };
  });
}

// ============================================================
// HELPER: Upsert customers — update existing, insert new
// ============================================================
function upsertCustomers(userId, customers) {
  const findStmt = db.prepare(
    'SELECT id, phone FROM contacts WHERE user_id = ? AND external_id = ?'
  );
  const insertStmt = db.prepare(`
    INSERT INTO contacts (
      user_id, name, phone, notes, external_id,
      total_spent, total_outstanding, transaction_count,
      last_purchase_date, customer_status, loyalty_score,
      avg_transaction, source, tag
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'berbisnis', ?)
  `);
  const updateStmt = db.prepare(`
    UPDATE contacts SET
      name = ?,
      phone = COALESCE(?, phone),
      total_spent = ?,
      total_outstanding = ?,
      transaction_count = ?,
      last_purchase_date = ?,
      customer_status = ?,
      loyalty_score = ?,
      avg_transaction = ?,
      tag = ?
    WHERE id = ?
  `);

  let inserted = 0;
  let updated = 0;

  const txn = db.transaction(() => {
    for (const c of customers) {
      const existing = findStmt.get(userId, c.external_id);
      const tag = c.customer_status; // tag = status untuk filter di UI

      if (existing) {
        updateStmt.run(
          c.name,
          c.phone,
          c.total_spent,
          c.total_outstanding,
          c.transaction_count,
          c.last_purchase_date,
          c.customer_status,
          c.loyalty_score,
          c.avg_transaction,
          tag,
          existing.id
        );
        updated++;
      } else {
        insertStmt.run(
          userId,
          c.name,
          c.phone,
          c.address ? `Alamat: ${c.address}` : null,
          c.external_id,
          c.total_spent,
          c.total_outstanding,
          c.transaction_count,
          c.last_purchase_date,
          c.customer_status,
          c.loyalty_score,
          c.avg_transaction,
          tag
        );
        inserted++;
      }
    }
  });

  txn();
  return { inserted, updated };
}

// ============================================================
// GET /api/sync/customers/stats — Quick aggregate stats untuk dashboard
// ============================================================
router.get('/customers/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN customer_status = 'loyal' THEN 1 ELSE 0 END) as loyal,
      SUM(CASE WHEN customer_status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN customer_status = 'at_risk' THEN 1 ELSE 0 END) as at_risk,
      SUM(CASE WHEN customer_status = 'churned' THEN 1 ELSE 0 END) as churned,
      SUM(total_spent) as total_revenue,
      SUM(total_outstanding) as total_outstanding,
      SUM(transaction_count) as total_transactions
    FROM contacts
    WHERE user_id = ? AND source = 'berbisnis'
  `).get(req.userId);
  res.json(stats);
});

export default router;
