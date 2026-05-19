# Cekat CRM — BerBisnis CRM Integration

> Status: 🚧 **MIGRATION IN PROGRESS** (19 Mei 2026)
>
> Project ini di-migrate dari repo `hendrypangg12/Claude` (branch `claude/new-session-8fl5o`)
> ke monorepo `hendrypangg12/Financial-tracker` biar bisa integrate langsung dengan
> BerBisnis POS + Berstock Telegram Bot.

---

## 🎯 VISI

Cekat CRM = **layer engagement otomatis** untuk owner UMKM yang udah pake BerBisnis POS.

**3 Killer Features (confirmed bos 19 Mei 2026):**

1. **💰 Loyalty Follow-up** — Thank you + cross-sell otomatis untuk customer yang sudah beli
2. **💸 Outstanding Reminder** — Reminder utang otomatis (polite, friendly)
3. **🔄 Win-back Campaign** — Follow-up customer loyal yang lama gak balik

Semua suggestion AI **harus di-approve owner via Berstock Telegram Bot** sebelum dikirim.
Owner tetap in control, AI cuma assist.

---

## 🏗️ ARSITEKTUR

```
[BerBisnis POS] → customer data → [Cekat CRM]
                                       │
                                       ▼
                                [AI Agent Haiku]
                                       │
                                       ▼ suggestion
                          [Berstock Telegram Bot]
                                       │
                                       ▼ owner approve
                              [Twilio WhatsApp]
                                       │
                                       ▼
                                  [Customer]
```

## 🛠️ TECH STACK

- **Frontend:** Vite + React
- **Backend:** Node.js + Express + SQLite
- **AI:** Claude Haiku 4.5
- **WhatsApp:** Twilio Sandbox/Production
- **Integration:** REST API + webhook

## 📁 STRUKTUR

```
cekat-crm/
├── README.md                  ← (this file)
├── client/                    ← React frontend (Vite)
│   └── src/
└── server/                    ← Express backend
    └── src/
        ├── routes/
        ├── lib/
        └── middleware/
```

## 🔌 INTEGRATION ENDPOINTS (planned)

| Endpoint | Purpose | Source |
|---|---|---|
| `POST /api/sync/berbisnis` | Receive customer data from BerBisnis | Cekat CRM |
| `POST /api/ai-suggest/trigger` | Trigger AI scan → suggestion | Cekat CRM |
| `POST /webhook/telegram-approve` | Owner approve via Berstock bot | Berstock |
| `POST /api/messages/send-bulk` | Send WA after approval | Cekat CRM |
| `POST /webhook/twilio` | Receive customer reply | Twilio |

## 📋 STATUS MIGRATION

- [x] Folder scaffold
- [ ] Database schema (Batch 2 pending)
- [ ] Server source code (Batch 2-3 pending)
- [ ] Client source code (Batch 3-4 pending)
- [ ] Twilio integration (Batch 3 pending)
- [ ] BerBisnis sync integration (after migrate)
- [ ] Berstock approval flow (after migrate)
- [ ] AI Agent BerBisnis-aware (after migrate)

---

## 🐻 SOURCE

Original work: branch `claude/new-session-8fl5o` di repo `hendrypangg12/Claude`
(1933+ baris kode, dibangun di session Claude Code lain pada 18-19 Mei 2026).

Migration triggered by need for tight integration with BerBisnis + Berstock ecosystem.

---

## 🔗 RELATED

- **BerBisnis POS:** `/tokountung/` (existing in this monorepo)
- **Berstock Bot:** `/bot/` (existing in this monorepo)
- **BerUang Personal:** `/app.html` (existing in this monorepo)
