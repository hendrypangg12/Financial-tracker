# Beruang CRM ↔ BerBisnis + Berstock Integration

> Built: 19 Mei 2026 (Day 17 BerUang launch period)
> Status: ✅ **CODE COMPLETE** — siap test setelah deploy

---

## 🎯 OVERVIEW

Beruang CRM sekarang **terintegrasi penuh** dengan ekosistem BerSatu Suite:

```
┌─────────────────┐         ┌──────────────────┐
│  BerBisnis POS  │  sync   │   Beruang CRM      │
│  (tokountung/)  │ ──────► │   (beruang-crm/)   │
│                 │ customer│                  │
│  • Sales        │ data    │  • Contact list  │
│  • Customer 360 │         │  • AI Suggestion │
└─────────────────┘         │  • WA Outreach   │
                            └────────┬─────────┘
                                     │
                                     │ notify via
                                     ▼
                            ┌──────────────────┐
                            │ Berstock Bot     │
                            │ (bot/)           │
                            │                  │
                            │ • Telegram push  │
                            │ • Approve button │
                            │ • Reject button  │
                            └────────┬─────────┘
                                     │
                                     │ approve callback
                                     ▼
                            ┌──────────────────┐
                            │ Twilio WhatsApp  │
                            │  → Customer 📱   │
                            └──────────────────┘
```

---

## 🔄 DATA FLOW

### **1. Customer Sync (BerBisnis → Beruang CRM)**

Owner di Beruang CRM klik "Sync from BerBisnis" (atau auto-sync setiap 6 jam):

```
Beruang CRM Backend
   │
   │  GET {BERSTOCK_WORKER}/api/pull?tenant_id=X&api_key=Y
   ▼
Berstock Bot Worker
   │  Returns: { data: { sales: [...] } }
   ▼
Beruang CRM aggregateCustomers()
   │  Group by nama+telepon, sum total_belanja, dll
   ▼
Upsert ke contacts table
   │  external_id = "berbisnis:nama|telp"
   │  customer_status, loyalty_score auto-computed
   ▼
Stats dashboard updated
```

### **2. AI Suggestion Generation**

Owner klik "Scan" (atau cron daily):

```
POST /api/ai-suggestions/scan
   │
   ▼
scanCustomersForTriggers(userId)
   │  Detect: loyalty (5+ trx, recent), outstanding (>7 hari),
   │          winback (3+ trx, 30-90 hari inactive)
   ▼
Generate AI message via Claude Haiku 4.5
   │  Custom prompt per trigger_type
   │  Knowledge base + customer context
   ▼
Save ke ai_suggestions table (status: pending)
   │
   ▼
Push notification ke Berstock Telegram
   │  POST {BERSTOCK_WORKER}/api/notify-suggestion
   │  Body: { chat_id, suggestion: { id, message, ... } }
```

### **3. Owner Approval via Telegram**

Owner terima notif Telegram dengan inline buttons:

```
🐻 @BerstockBot:

💸 Outstanding Reminder

Customer: Pak Budi (08123...)
Alasan: Outstanding Rp 500rb, 12 hari overdue

Saran pesan:
```
Halo Pak Budi 👋
Sekedar reminder ramah, ada tagihan...
```

[✅ Approve] [❌ Reject] [✏️ Edit di Beruang CRM]
```

**Owner tap "✅ Approve":**
```
Telegram callback_query
   │
   ▼
Berstock bot handleCrmCallback()
   │
   ▼
POST {BERUANG_CRM_API}/api/ai-suggestions/{id}/approve
   │
   ▼
Beruang CRM:
   1. Mark suggestion as 'approved'
   2. Send WA via Twilio
   3. Save outbound message ke conversations
   ▼
Telegram edit message: "✅ Approved & Sent"
```

---

## ⚙️ CONFIG REQUIRED

### **Beruang CRM** (`server/.env`)

```bash
# Existing
PORT=3001
JWT_SECRET=<random-32-char>
ANTHROPIC_API_KEY=sk-ant-...
CLIENT_ORIGIN=http://localhost:5173

# Twilio (untuk send WA)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# BerBisnis + Berstock integration
BERSTOCK_BRIDGE_KEY=<shared-secret>     # ⚠️ SAMA dengan BERUANG_CRM_BRIDGE_KEY di Berstock bot
BERUANG_CRM_PUBLIC_URL=https://beruang-crm.berstock.id
```

### **Berstock Bot Worker** (Cloudflare secrets)

```bash
# Existing
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=<bot-token>
TELEGRAM_WEBHOOK_SECRET=<random>
ADMIN_KEY=<admin-only>

# NEW: Beruang CRM bridge
BERUANG_CRM_BRIDGE_KEY=<shared-secret>         # ⚠️ SAMA dengan BERSTOCK_BRIDGE_KEY di Beruang CRM
BERUANG_CRM_API_URL=https://beruang-crm.berstock.id  # URL Beruang CRM API
```

---

## 🚀 SETUP PER USER

Setelah deploy, tiap owner UMKM perlu:

1. **Daftar di Beruang CRM** (`/register`)
2. **Buka Settings → Integration BerBisnis**
3. **Isi:**
   - `tenant_id` (dari Berstock bot — provision oleh admin)
   - `api_key` (paired dengan tenant_id)
   - `telegram_chat_id` (kirim `/start` ke @BerstockBot dulu)
4. **Klik "Sync Now"** → import customer dari BerBisnis
5. **Klik "Scan Suggestions"** → AI generate suggestion + push notif Telegram

---

## 📊 NEW ENDPOINTS

### Beruang CRM (semua perlu JWT auth):

```
GET    /api/sync/config              Get sync config current user
PUT    /api/sync/config              Update tenant_id, api_key, dll
POST   /api/sync/pull                Trigger manual sync dari BerBisnis
GET    /api/sync/customers/stats     Stats (total, loyal, at_risk, dll)

GET    /api/ai-suggestions           List suggestions (?status=pending)
POST   /api/ai-suggestions/scan      Scan triggers + generate AI message
PUT    /api/ai-suggestions/:id       Edit message sebelum approve
POST   /api/ai-suggestions/:id/approve  Approve + send WA
POST   /api/ai-suggestions/:id/reject   Reject
GET    /api/ai-suggestions/stats     Stats per trigger type
```

### Berstock Bot Worker:

```
POST   /api/notify-suggestion        Push notif ke Telegram (called by Beruang CRM)
                                     Auth: Bearer BERUANG_CRM_BRIDGE_KEY

(Plus existing /webhook handler udah extended dengan callback support)
```

---

## 🗄️ NEW DATABASE TABLES (Beruang CRM)

### `contacts` (extended)
```sql
-- New columns (additive, gak break existing):
external_id          TEXT       -- "berbisnis:nama|telp"
total_spent          INTEGER    -- total Rp belanja kumulatif
total_outstanding    INTEGER    -- tempo belum lunas
transaction_count    INTEGER    -- jumlah trx
last_purchase_date   TEXT       -- ISO date
customer_status      TEXT       -- 'loyal' | 'active' | 'at_risk' | 'churned'
loyalty_score        INTEGER    -- 0-100 (auto-computed)
avg_transaction      INTEGER    -- rata-rata per trx
source               TEXT       -- 'manual' | 'berbisnis'
```

### `berbisnis_sync` (new)
```sql
user_id              INTEGER PK
tenant_id            TEXT
api_key              TEXT
berstock_worker_url  TEXT (default berstock-bot.hendrypangg12.workers.dev)
last_sync_at         TEXT
last_sync_status     TEXT
last_sync_count      INTEGER
auto_sync            INTEGER (0/1)
auto_sync_interval_hours  INTEGER (default 6)
telegram_chat_id     TEXT
```

### `ai_suggestions` (new)
```sql
id                   INTEGER PK
user_id              INTEGER
contact_id           INTEGER
trigger_type         TEXT ('loyalty'|'outstanding'|'winback'|'manual')
trigger_reason       TEXT
suggested_message    TEXT (AI-generated)
context_snapshot     TEXT (JSON)
status               TEXT ('pending'|'approved'|'rejected'|'sent'|'failed')
telegram_message_id  TEXT
edited_message       TEXT (kalau owner edit sebelum approve)
error_message        TEXT (kalau send WA gagal)
created_at           TEXT
decided_at           TEXT
sent_at              TEXT
```

---

## 💰 COST ESTIMATE

Per active user (asumsi 50 customer di BerBisnis):

| Item | Cost/bulan |
|---|---|
| Sync (gratis, dari Berstock worker) | Rp 0 |
| AI suggestion (Haiku 4.5, ~30 scan/bulan × 10 customer/scan) | Rp 5.000 - 15.000 |
| Twilio WA Sandbox (gratis, max 1000 msg/bulan) | Rp 0 |
| Twilio WA Production (Rp 700-1500 per msg outbound) | Rp 50.000 - 200.000 (kalau aktif) |
| **Total** | **~Rp 100.000/user/bulan** |

Recommended Pro tier pricing: **Rp 200rb-500rb/bln** untuk break-even + margin.

---

## ⚠️ NEXT TODO BEFORE LIVE

1. **Deploy Beruang CRM** ke server publik (Railway / Render / VPS):
   - Frontend: Vite build → static hosting
   - Backend: Express + SQLite (persistent volume)
   - Domain: beruang-crm.berstock.id?

2. **Set env vars di Berstock bot (Cloudflare)**:
   ```bash
   wrangler secret put BERUANG_CRM_BRIDGE_KEY     # shared secret
   wrangler secret put BERUANG_CRM_API_URL        # URL Beruang CRM backend
   wrangler deploy
   ```

3. **Set env vars di Beruang CRM server (.env)**:
   ```bash
   BERSTOCK_BRIDGE_KEY=<sama dengan BERUANG_CRM_BRIDGE_KEY>
   BERUANG_CRM_PUBLIC_URL=https://beruang-crm.berstock.id
   ```

4. **UI work (TODO)**:
   - [ ] Settings page: form integrasi BerBisnis (tenant_id, api_key, telegram_chat_id)
   - [ ] Dashboard widget: customer stats from BerBisnis
   - [ ] AI Suggestions page: list pending + approve/reject UI
   - [ ] Sync history log

5. **Test end-to-end** dengan tenant PT SPC (sudah ada di Berstock bot).
