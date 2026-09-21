// Firebase validates the ID token; never trust the email/uid in a request body.
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function requireUser(request, env) {
  const match = /^Bearer (\S+)$/.exec(request.headers.get('Authorization') || '');
  if (!match) throw new HttpError(401, 'Silakan login kembali.');
  if (!env.FIREBASE_WEB_API_KEY || !env.FIREBASE_PROJECT_ID) {
    throw new HttpError(503, 'Verifikasi akun belum dikonfigurasi.');
  }
  const token = match[1];
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token }),
  });
  if (response.status >= 500 || response.status === 429) throw new HttpError(503, 'Verifikasi akun sedang tidak tersedia.');
  if (!response.ok) throw new HttpError(401, 'Sesi tidak valid. Silakan login kembali.');
  const account = (await response.json()).users?.[0];
  if (!account?.localId || account.disabled) throw new HttpError(401, 'Akun tidak aktif.');
  return { uid: account.localId, email: account.email || '', token };
}

export async function hasProAccess(user, env) {
  // This read obeys Firestore rules. Subscription fields must be admin-only writes.
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents/users/${encodeURIComponent(user.uid)}/meta/profile`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${user.token}` } });
  if (response.status === 404) return false;
  if (!response.ok) throw new HttpError(503, 'Status langganan belum bisa diperiksa.');
  const fields = (await response.json()).fields || {};
  const plan = fields.plan?.stringValue;
  if (plan === 'lifetime' || plan === 'pro') return true;
  return ['trial', 'monthly', 'annual', 'starter'].includes(plan)
    && Date.parse(fields.expiresAt?.stringValue || '') > Date.now();
}
