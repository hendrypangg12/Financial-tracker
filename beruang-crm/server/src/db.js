import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Database path:
// - Default: ../data.db (relative to src/, jadi server/data.db)
// - Production (Railway): set DATABASE_PATH=/data/data.db (mount persistent volume)
const dbPath = process.env.DATABASE_PATH
  ? (isAbsolute(process.env.DATABASE_PATH)
      ? process.env.DATABASE_PATH
      : join(__dirname, '..', process.env.DATABASE_PATH))
  : join(__dirname, '..', 'data.db');

// Ensure parent dir exists (penting kalau volume baru di-mount kosong)
try {
  mkdirSync(dirname(dbPath), { recursive: true });
} catch {}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log(`[db] SQLite ready at: ${dbPath}`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    tag TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    channel TEXT DEFAULT 'simulator',
    ai_enabled INTEGER DEFAULT 1,
    status TEXT DEFAULT 'open',
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender TEXT NOT NULL CHECK(sender IN ('customer','agent','ai')),
    body TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    content TEXT NOT NULL DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    user_id INTEGER PRIMARY KEY,
    working_hours_enabled INTEGER DEFAULT 0,
    work_start TEXT DEFAULT '09:00',
    work_end TEXT DEFAULT '17:00',
    work_days TEXT DEFAULT '1,2,3,4,5',
    business_name TEXT DEFAULT '',
    greeting TEXT DEFAULT '',
    ai_tone TEXT DEFAULT 'friendly',
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quick_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- ===== BERBISNIS INTEGRATION TABLES =====

  -- Konfigurasi sync per user dengan tenant Berstock bot
  CREATE TABLE IF NOT EXISTS berbisnis_sync (
    user_id INTEGER PRIMARY KEY,
    tenant_id TEXT,
    api_key TEXT,
    berstock_worker_url TEXT DEFAULT 'https://berstock-bot.hendrypangg12.workers.dev',
    last_sync_at TEXT,
    last_sync_status TEXT,
    last_sync_count INTEGER DEFAULT 0,
    auto_sync INTEGER DEFAULT 1,
    auto_sync_interval_hours INTEGER DEFAULT 6,
    telegram_chat_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- AI-generated suggestions menunggu approval owner
  CREATE TABLE IF NOT EXISTS ai_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    trigger_type TEXT NOT NULL CHECK(trigger_type IN ('loyalty','outstanding','winback','manual')),
    trigger_reason TEXT,
    suggested_message TEXT NOT NULL,
    context_snapshot TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','sent','failed')),
    telegram_message_id TEXT,
    edited_message TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    decided_at TEXT,
    sent_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_status
    ON ai_suggestions(user_id, status);

  CREATE INDEX IF NOT EXISTS idx_ai_suggestions_contact
    ON ai_suggestions(contact_id);
`);

// ===== MIGRATIONS for existing DB files =====

const convCols = db.prepare('PRAGMA table_info(conversations)').all();
if (!convCols.some((c) => c.name === 'status')) {
  db.exec("ALTER TABLE conversations ADD COLUMN status TEXT DEFAULT 'open'");
}

const settingsCols = db.prepare('PRAGMA table_info(settings)').all();
if (settingsCols.length > 0 && !settingsCols.some((c) => c.name === 'ai_tone')) {
  db.exec("ALTER TABLE settings ADD COLUMN ai_tone TEXT DEFAULT 'friendly'");
}

// ===== BerBisnis integration migration — additive columns ke contacts =====
const contactCols = db.prepare('PRAGMA table_info(contacts)').all();
const wantedContactCols = [
  ['external_id', "TEXT"],
  ['total_spent', "INTEGER DEFAULT 0"],
  ['total_outstanding', "INTEGER DEFAULT 0"],
  ['transaction_count', "INTEGER DEFAULT 0"],
  ['last_purchase_date', "TEXT"],
  ['customer_status', "TEXT DEFAULT 'active'"],
  ['loyalty_score', "INTEGER DEFAULT 0"],
  ['avg_transaction', "INTEGER DEFAULT 0"],
  ['source', "TEXT DEFAULT 'manual'"],
];
for (const [col, type] of wantedContactCols) {
  if (!contactCols.some((c) => c.name === col)) {
    db.exec(`ALTER TABLE contacts ADD COLUMN ${col} ${type}`);
  }
}

// Index untuk external_id biar sync cepat
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_contacts_external_id ON contacts(user_id, external_id)"
);

export default db;
