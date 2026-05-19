// Halaman: AI Suggestions
// List pending suggestions (loyalty/outstanding/winback) + approve/edit/reject

import { useEffect, useState } from 'react';
import { api } from '../api.js';

const TRIGGER_LABELS = {
  loyalty: { emoji: '💰', label: 'Loyalty Follow-up', color: '#0891b2' },
  outstanding: { emoji: '💸', label: 'Outstanding Reminder', color: '#dc2626' },
  winback: { emoji: '🔄', label: 'Win-back Campaign', color: '#d97706' },
  manual: { emoji: '✍️', label: 'Manual', color: '#64748b' },
};

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

export default function AISuggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeStatus, setActiveStatus] = useState('pending');
  const [editingId, setEditingId] = useState(null);
  const [editedText, setEditedText] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [list, st] = await Promise.all([
        api(`/ai-suggestions?status=${activeStatus}`),
        api('/ai-suggestions/stats'),
      ]);
      setSuggestions(list);
      setStats(st);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [activeStatus]);

  async function scan() {
    setScanning(true);
    setMessage(null);
    try {
      const result = await api('/ai-suggestions/scan', { method: 'POST', body: { maxPerScan: 10 } });
      if (result.generated > 0) {
        setMessage({
          type: 'success',
          text: `✅ ${result.generated} suggestion baru ke-generate (skip ${result.skipped_already_pending} sudah pending)`,
        });
      } else {
        setMessage({
          type: 'info',
          text: result.message || 'Tidak ada customer yang memenuhi syarat trigger saat ini.',
        });
      }
      load();
    } catch (err) {
      setMessage({ type: 'error', text: '❌ ' + err.message });
    } finally {
      setScanning(false);
    }
  }

  async function approve(id) {
    setMessage(null);
    try {
      await api(`/ai-suggestions/${id}/approve`, { method: 'POST' });
      setMessage({ type: 'success', text: '✅ Pesan ke-approve & terkirim' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: '❌ ' + err.message });
    }
  }

  async function reject(id) {
    if (!confirm('Yakin reject suggestion ini?')) return;
    try {
      await api(`/ai-suggestions/${id}/reject`, { method: 'POST' });
      setMessage({ type: 'info', text: 'Suggestion di-reject' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  async function saveEdit(id) {
    if (!editedText.trim()) return;
    try {
      await api(`/ai-suggestions/${id}`, {
        method: 'PUT',
        body: { edited_message: editedText },
      });
      setEditingId(null);
      setEditedText('');
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  return (
    <>
      <h2>🤖 AI Suggestions</h2>
      <p style={{ color: 'var(--muted)', marginTop: -10 }}>
        AI Agent analisa customer data BerBisnis & kasih saran follow-up otomatis.
        Kamu approve/reject sebelum dikirim ke customer via WhatsApp.
      </p>

      {/* === Stats === */}
      {stats && (
        <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          <StatBox label="⏳ Pending" value={stats.pending || 0} active={activeStatus === 'pending'} onClick={() => setActiveStatus('pending')} />
          <StatBox label="✅ Sent" value={stats.approved || 0} active={activeStatus === 'sent'} onClick={() => setActiveStatus('sent')} />
          <StatBox label="❌ Rejected" value={stats.rejected || 0} active={activeStatus === 'rejected'} onClick={() => setActiveStatus('rejected')} />
          <StatBox label="💸 Outstanding" value={stats.sent_outstanding || 0} color="#dc2626" />
          <StatBox label="💰 Loyalty" value={stats.sent_loyalty || 0} color="#0891b2" />
        </div>
      )}

      {/* === Scan button === */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>Scan BerBisnis Customers</strong>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>
            Cek customer yang memenuhi syarat trigger (loyal, utang, lama gak balik)
          </div>
        </div>
        <button className="primary" onClick={scan} disabled={scanning}>
          {scanning ? '⏳ Scanning...' : '🔍 Scan Now'}
        </button>
      </div>

      {message && (
        <div
          className="card"
          style={{
            background: message.type === 'success' ? '#dcfce7' : message.type === 'error' ? '#fee2e2' : '#dbeafe',
            borderColor: message.type === 'success' ? '#86efac' : message.type === 'error' ? '#fca5a5' : '#93c5fd',
            color: message.type === 'success' ? '#166534' : message.type === 'error' ? '#991b1b' : '#1e3a8a',
          }}
        >
          {message.text}
        </div>
      )}

      {/* === Suggestions List === */}
      {loading ? (
        <div className="card">Memuat...</div>
      ) : suggestions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          {activeStatus === 'pending'
            ? '🎉 Tidak ada suggestion pending. Klik "Scan Now" buat generate baru.'
            : `Belum ada history status "${activeStatus}".`}
        </div>
      ) : (
        suggestions.map((s) => {
          const trigger = TRIGGER_LABELS[s.trigger_type] || TRIGGER_LABELS.manual;
          const isEditing = editingId === s.id;
          const messageText = s.edited_message || s.suggested_message;

          return (
            <div key={s.id} className="card" style={{ borderLeftWidth: 4, borderLeftColor: trigger.color }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: trigger.color, textTransform: 'uppercase' }}>
                    {trigger.emoji} {trigger.label}
                  </div>
                  <h3 style={{ margin: '4px 0' }}>
                    {s.contact_name}{' '}
                    {s.contact_phone && (
                      <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}>· {s.contact_phone}</span>
                    )}
                  </h3>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>
                  {fmtDate(s.created_at)}
                </div>
              </div>

              {/* Customer Metrics */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
                margin: '12px 0', padding: 10,
                background: '#f8fafc', borderRadius: 6, fontSize: 12,
              }}>
                <div>
                  <div style={{ color: 'var(--muted)' }}>Total Belanja</div>
                  <div style={{ fontWeight: 600 }}>{fmtRp(s.total_spent)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted)' }}>Transaksi</div>
                  <div style={{ fontWeight: 600 }}>{s.transaction_count}x</div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted)' }}>Outstanding</div>
                  <div style={{ fontWeight: 600, color: s.total_outstanding > 0 ? '#dc2626' : 'inherit' }}>
                    {fmtRp(s.total_outstanding)}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted)' }}>Status</div>
                  <div style={{ fontWeight: 600 }}>{s.customer_status}</div>
                </div>
              </div>

              {/* Reason */}
              {s.trigger_reason && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontStyle: 'italic' }}>
                  Alasan: {s.trigger_reason}
                </div>
              )}

              {/* Message */}
              {isEditing ? (
                <textarea
                  rows={5}
                  style={{ width: '100%', fontSize: 14 }}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                />
              ) : (
                <div style={{
                  padding: 12,
                  background: '#fafafa',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  whiteSpace: 'pre-wrap',
                  fontSize: 14,
                  lineHeight: 1.6,
                }}>
                  {messageText}
                </div>
              )}

              {/* Status badge */}
              {s.status !== 'pending' && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: s.status === 'sent' ? '#dcfce7' : s.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                    color: s.status === 'sent' ? '#166534' : s.status === 'rejected' ? '#991b1b' : '#92400e',
                  }}>
                    {s.status.toUpperCase()}
                  </span>
                  {s.sent_at && <span style={{ marginLeft: 8, color: 'var(--muted)' }}>Sent: {fmtDate(s.sent_at)}</span>}
                </div>
              )}

              {/* Actions */}
              {s.status === 'pending' && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  {isEditing ? (
                    <>
                      <button className="primary" onClick={() => saveEdit(s.id)}>💾 Save Edit</button>
                      <button onClick={() => { setEditingId(null); setEditedText(''); }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button
                        className="primary"
                        style={{ background: '#16a34a' }}
                        onClick={() => approve(s.id)}
                      >
                        ✅ Approve & Send
                      </button>
                      <button onClick={() => { setEditingId(s.id); setEditedText(messageText); }}>
                        ✏️ Edit
                      </button>
                      <button
                        style={{ background: '#fee2e2', color: '#991b1b' }}
                        onClick={() => reject(s.id)}
                      >
                        ❌ Reject
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}

function StatBox({ label, value, color, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 12,
        background: active ? '#dbeafe' : '#f8fafc',
        border: active ? '2px solid #3b82f6' : '1px solid #e2e8f0',
        borderRadius: 8,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--text)', marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}
