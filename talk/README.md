# Berstock Talk — Threads-style Microblog UMKM

> Komunitas owner UMKM Indonesia: post tips, share progress, cari pelanggan, saling follow.
> Khusus konten bisnis. Auth pakai akun BerUang/BerBisnis existing.

**Status:** 🟡 Fase 1 — dev mulai 8 Juni 2026 (paralel Play Store).

---

## 📐 Firestore Schema

```
/talk_users/{uid}
├── displayName       : string
├── photoUrl          : string?
├── bizName           : string?      ← dari profile BerBisnis
├── bizCategory       : enum (sembako | fnb | beauty | fashion | eskrim | jasa | lain)
├── bizCity           : string?
├── bio               : string (max 160)
├── verified          : boolean      ← true jika BerBisnis subs aktif
├── verifiedSince     : timestamp?
├── followerCount     : number       ← denormalized
├── followingCount    : number       ← denormalized
├── threadCount       : number       ← denormalized
├── createdAt         : timestamp
└── linkedApps        : ['beruang', 'berbisnis']?

/talk_threads/{threadId}
├── authorId          : string (uid)
├── authorName        : string       ← denorm
├── authorBizName     : string?      ← denorm
├── authorBizCategory : string?      ← denorm (untuk filter feed)
├── verified          : boolean      ← denorm
├── text              : string (max 500)
├── imageUrl          : string?
├── promoCard         : { tokoName, tokoCity, tokoUrl }?
├── hashtags          : string[]
├── createdAt         : timestamp
├── likeCount         : number
├── replyCount        : number
├── repostCount       : number
├── status            : 'active' | 'flagged' | 'deleted'
└── replyTo           : string?      ← parent threadId jika reply

/talk_threads/{threadId}/likes/{uid}
└── createdAt

/talk_users/{uid}/following/{targetUid}
└── createdAt

/talk_users/{uid}/followers/{followerUid}    ← denormalized
└── createdAt
```

### Index requirements
- `talk_threads` by `(authorBizCategory, createdAt desc)` — feed filter by industry
- `talk_threads` by `(status, createdAt desc)` — main feed
- `talk_threads` by `(authorId, createdAt desc)` — user profile threads
- `talk_threads` by `(hashtags array-contains, createdAt desc)` — hashtag page

---

## 🛠️ Roadmap eksekusi

### Fase 1 — Core (8-14 Juni)
- [ ] Setup folder `/talk/` + reuse Firebase config
- [ ] Auth integration: redirect ke BerUang login kalau belum login
- [ ] Schema Firestore + security rules
- [ ] Post thread (text only) + image upload
- [ ] Feed timeline (chronological, all posts)
- [ ] Like + Reply (basic)
- [ ] Profile page basic (displayName + bio + threadList)

### Fase 2 — Social (15-21 Juni)
- [ ] Follow/Unfollow
- [ ] "Ngikutin" tab (feed dari yg di-follow)
- [ ] Topic chip filter (Sembako/FnB/Beauty/dll)
- [ ] Hashtag link → page #hashtag
- [ ] Verified badge (auto-check BerBisnis subscription aktif)
- [ ] Cross-promote card (attach toko link di post)
- [ ] Auto-link mention `@username`

### Fase 3 — Growth (22-30 Juni)
- [ ] Push notif via FCM (like, reply, follow, mention)
- [ ] Embed di app BerUang & BerBisnis (tab "Komunitas")
- [ ] Trending hashtag (cron Cloudflare Worker hitung 24h)
- [ ] Deep link share (`berstock.id/talk/p/{threadId}`)
- [ ] Search user + thread + hashtag
- [ ] Open registration (waitlist → live)

---

## 🔐 Tier verifikasi

| Tier | Cara | Limit | Badge |
|---|---|---|---|
| **Basic** | Daftar dengan akun BerUang/BerBisnis | 10 post/hari, gak bisa promo card | — |
| **Verified ✓** | Punya BerBisnis Bulanan/Tahunan aktif | Unlimited post, promo card unlimited | 🟢 gold checkmark |
| **Sponsor** | Brand partner (paid) | Unlimited + boost slot | 💠 blue checkmark |

Auto-check verified: tiap login, Cloud Function cek `users/{uid}/meta/berbisnis-profile.status === 'active'` → update `talk_users/{uid}.verified`.

---

## 💰 Monetization plan (Fase 4+)

- **Free** — Post basic, follow, reply
- **Pro Rp 35rb/bln** (sama dengan BerUang Pro) — Boost post, analytics dashboard, AI Beruang comment di post user lain
- **Sponsor slot** — Trending hashtag sponsorship Rp 250rb/minggu, Pinned post home Rp 500rb/hari
- **Cross-promote add-on** — Free user 1 promo card/minggu, Pro unlimited

---

## ⚖️ Moderation

- **Auto-filter** — Cloudflare Worker dengan Claude API moderation (cek SARA/hate/NSFW) saat post create
- **Report button** — user bisa report post → masuk queue admin (di tab `/admin-talk.html`)
- **Auto-flag** — post dengan >5 report dalam 1 jam → status `flagged`, hide dari feed sampai admin review
- **Rate limit** — 10 post/hari basic, 50/hari verified (anti-spam)
- **Block list** — user bisa block user lain (gak liat post-nya)

---

## 📦 Files struktur

```
/talk/
├── README.md           ← spec (file ini)
├── index.html          ← landing / feed timeline (main page)
├── compose.html        ← form post baru
├── profile.html        ← user profile page (?uid=xxx)
├── hashtag.html        ← page #hashtag (?tag=xxx)
├── thread.html         ← single thread + replies (?id=xxx)
├── styles.css          ← shared styling
└── js/
    ├── firebase.js     ← init (reuse /js/firebase-config.js)
    ├── auth.js         ← login redirect + user state
    ├── feed.js         ← load + render feed
    ├── post.js         ← create post + image upload
    ├── reply.js        ← reply logic
    ├── follow.js       ← follow/unfollow
    ├── profile.js      ← profile render
    └── utils.js        ← format time, hashtag parser, dll
```

---

## 🎨 Brand

- **Nama:** Berstock Talk
- **URL:** berstock.id/talk/
- **Logo:** Logo beruang berdasi (Berstock) + suffix "Talk"
- **Warna:** Navy `#0a1628` + Gold `#d4af37` (consistent Berstock brand)
- **Tagline:** "Tempat ngobrol owner UMKM"
- **Mascot tone:** Profesional tapi tetap warm (Beruang Akuntan Gemoy)
