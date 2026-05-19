// Halaman: Integrasi BerBisnis POS
// Owner setup tenant_id + api_key dari Berstock bot, lalu sync customer data.

import { useEffect, useState } from 'react';
import { api } from '../api.js';

function fmtRp(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso + (iso.includes('Z') ? '' : 'Z')).toLocaleString('id-ID', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function BerBisnis() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState(null);

  // Form state
  const [form, setForm] = useState({
    tenant_id: '',
    api_key: '',
    telegram_chat_id: '',
    auto_sync: 1,
    auto_sync_interval_hours: 6,
  });

  async function load() {
    setLoading(true);
    try {
      const cfg = await api('/sync/config');
      setConfig(cfg);
      if (cfg.configured) {
        setForm({
          tenant_id: cfg.tenant_id || '',
          api_key: '', // never show actual key
          telegram_chat_id: cfg.telegram_chat_id || '',
          auto_sync: cfg.auto_sync ?? 1,
          auto_sync_interval_hours: cfg.auto_sync_interval_hours || 6,
        });
      }

      const st = await api('/sync/customers/stats');
      setStats(st);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveConfig() {
    if (!form.tenant_id.trim()) {
      setMessage({ type: 'error', text: 'Tenant ID wajib diisi' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const body = {
        tenant_id: form.tenant_id.trim(),
        telegram_chat_id: form.telegram_chat_id.trim() || null,
        auto_sync: form.auto_sync ? 1 : 0,
        auto_sync_interval_hours: parseInt(form.auto_sync_interval_hours, 10) || 6,
      };
      if (form.api_key?.trim()) body.api_key = form.api_key.trim();

      await api('/sync/config', { method: 'PUT', body });
      setMessage({ type: 'success', text: '✅ Konfigurasi tersimpan' });
      setForm((f) => ({ ...f, api_key: '' })); // clear key field after save
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    setMessage(null);
    try {
      const result = await api('/sync/pull', { method: 'POST' });
      setMessage({
        type: 'success',
        text: `✅ Sync berhasil! ${result.aggregated_customers} customer ter-aggregate dari ${result.pulled_sales} sales. Inserted: ${result.inserted}, Updated: ${result.updated}.`,
      });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: '❌ ' + err.message });
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <div className="card">Memuat konfigurasi...</div>;

  return (
    <>
      <h2>🏪 Integrasi BerBisnis POS</h2>
      <p style={{ color: 'var(--muted)', marginTop: -10 }}>
        Sync data customer dari BerBisnis POS biar AI Agent bisa kasih saran follow-up
        (loyalty, outstanding reminder, win-back) berdasarkan history transaksi real.
      </p>

      {message && (
        <div
          className="card"
          style={{
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            borderColor: message.type === 'success' ? '#86efac' : '#fca5a5',
            color: message.type === 'success' ? '#166534' : '#991b1b',
          }}
        >
          {message.text}
        </div>
      )}

      {/* === Customer Stats from BerBisnis === */}
      {stats && stats.total > 0 && (
        <div className="card">
          <h3 style={{ margin: '0 0 12px' }}>📊 Customer Stats (synced)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <StatBox label="Total Customer" value={stats.total} />
            <StatBox label="💎 Loyal" value={stats.loyal || 0} color="#0891b2" />
            <StatBox label="⚠️ At Risk" value={stats.at_risk || 0} color="#d97706" />
            <StatBox label="😴 Churned" value={stats.churned || 0} color="#dc2626" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
            <StatBox label="Total Revenue" value={fmtRp(stats.total_revenue)} />
            <StatBox label="Outstanding" value={fmtRp(stats.total_outstanding)} color="#dc2626" />
            <StatBox label="Total Transaksi" value={stats.total_transactions || 0} />
          </div>
        </div>
      )}

      {/* === Sync Status === */}
      {config?.configured && (
        <div className="card">
          <h3 style={{ margin: '0 0 12px' }}>🔄 Status Sync</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>Last sync</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{fmtDate(config.last_sync_at)}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {config.last_sync_status === 'success'
                  ? `✓ ${config.last_sync_count} customers synced`
                  : config.last_sync_status || 'belum pernah'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <button className="primary" onClick={syncNow} disabled={syncing}>
                {syncing ? '⏳ Syncing...' : '🔄 Sync Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === Config Form === */}
      <div className="card">
        <h3 style={{ margin: '0 0 12px' }}>⚙️ Konfigurasi Tenant</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: -6 }}>
          Dapatkan <strong>tenant_id</strong> + <strong>api_key</strong> dari admin Berstock
          (contact via <a href="https://wa.me/6282124848924" target="_blank" rel="noopener">WA</a>).
        </p>

        <div className="form-group">
          <label>
            Tenant ID
            <input
              type="text"
              value={form.tenant_id}
              onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
              placeholder="tnt_xxxxxxxx"
            />
          </label>
        </div>

        <div className="form-group">
          <label>
            API Key {config?.configured && <span style={{ color: 'var(--muted)', fontSize: 11 }}>(kosongkan kalau gak mau ganti)</span>}
            <input
              type="password"
              value={form.api_key}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              placeholder={config?.configured ? '••••••••• (tersimpan)' : 'API key dari Berstock'}
              autoComplete="new-password"
            />
          </label>
        </div>

        <div className="form-group">
          <label>
            Telegram Chat ID <span style={{ color: 'var(--muted)', fontSize: 11 }}>(untuk approval notifikasi)</span>
            <input
              type="text"
              value={form.telegram_chat_id}
              onChange={(e) => setForm({ ...form, telegram_chat_id: e.target.value })}
              placeholder="123456789 (cek dari @BerstockBot via /start)"
            />
          </label>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={!!form.auto_sync}
              onChange={(e) => setForm({ ...form, auto_sync: e.target.checked ? 1 : 0 })}
            />
            Auto-sync setiap
          </label>
          <input
            type="number"
            min="1"
            max="24"
            style={{ width: 60 }}
            value={form.auto_sync_interval_hours}
            onChange={(e) => setForm({ ...form, auto_sync_interval_hours: e.target.value })}
          />
          <span>jam</span>
        </div>

        <div style={{ marginTop: 16 }}>
          <button className="primary" onClick={saveConfig} disabled={saving}>
            {saving ? 'Menyimpan...' : '💾 Simpan Konfigurasi'}
          </button>
        </div>
      </div>

      {/* === Help === */}
      <div className="card" style={{ background: '#fef9c3', borderColor: '#fde047' }}>
        <h3 style={{ margin: '0 0 8px' }}>💡 Cara Setup</h3>
        <ol style={{ margin: 0, paddingLeft: 22, fontSize: 14, lineHeight: 1.7 }}>
          <li>Pastikan kamu udah punya BerBisnis POS aktif (subscribe Pro)</li>
          <li>Minta <code>tenant_id</code> + <code>api_key</code> ke admin Berstock</li>
          <li>(Opsional) Buat Telegram chat ID:
            <ul>
              <li>Buka <a href="https://t.me/BerstockBot" target="_blank" rel="noopener">@BerstockBot</a></li>
              <li>Kirim <code>/start &lt;tenant_id&gt;</code></li>
              <li>Bot kasih chat_id kamu</li>
            </ul>
          </li>
          <li>Klik "Simpan" lalu "Sync Now"</li>
          <li>Buka <strong>AI Suggestions</strong> tab → klik "Scan" untuk generate saran follow-up</li>
        </ol>
      </div>
    </>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      padding: 12,
      background: '#f8fafc',
      borderRadius: 8,
      border: '1px solid #e2e8f0',
    }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--text)', marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}
