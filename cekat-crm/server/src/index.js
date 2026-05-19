import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import contactsRoutes from './routes/contacts.js';
import conversationsRoutes from './routes/conversations.js';
import knowledgeRoutes from './routes/knowledge.js';
import settingsRoutes from './routes/settings.js';
import quickRepliesRoutes from './routes/quick-replies.js';
import analyticsRoutes from './routes/analytics.js';
import twilioWebhookRoutes from './routes/twilio-webhook.js';
import syncRoutes from './routes/sync.js';
import aiSuggestionsRoutes from './routes/ai-suggestions.js';
import './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// === CORS — di production, allow same-origin; di dev, allow Vite (5173) ===
const corsOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin,
  credentials: true,
}));

// Twilio webhooks send application/x-www-form-urlencoded
app.use('/api/webhooks/twilio', express.urlencoded({ extended: false }), twilioWebhookRoutes);

// All other routes use JSON
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/contacts', requireAuth, contactsRoutes);
app.use('/api/conversations', requireAuth, conversationsRoutes);
app.use('/api/knowledge', requireAuth, knowledgeRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/quick-replies', requireAuth, quickRepliesRoutes);
app.use('/api/analytics', requireAuth, analyticsRoutes);
app.use('/api/sync', requireAuth, syncRoutes);
app.use('/api/ai-suggestions', requireAuth, aiSuggestionsRoutes);

// === PRODUCTION: Serve built client (SPA) ===
// Cari folder client/dist relatif ke __dirname (server/src/)
const clientDist = join(__dirname, '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback — all non-API routes serve index.html (biar React Router jalan)
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
  console.log(`Serving static frontend from: ${clientDist}`);
} else {
  console.log(`Client dist not found at ${clientDist} — running in dev mode (frontend via Vite at :5173)`);
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`BerBisnis server listening on http://localhost:${port}`);
});
