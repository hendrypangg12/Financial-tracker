import { HttpError } from './auth.js';

// Cloudflare Workers use Google's documented service-account OAuth flow.
// Supply this JSON through a Worker secret, never wrangler.toml or browser code.
const tokenCache = new WeakMap();
const encoder = new TextEncoder();
const b64url = value => btoa(typeof value === 'string' ? value : String.fromCharCode(...value))
  .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

export function serviceAccount(env) {
  let account;
  try { account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON || ''); } catch {}
  if (!account?.private_key || !account.client_email || account.project_id !== env.FIREBASE_PROJECT_ID) {
    throw new HttpError(503, 'Layanan akun belum dikonfigurasi.');
  }
  return account;
}

export async function adminToken(env) {
  const account = serviceAccount(env);
  const cached = tokenCache.get(env);
  if (cached && cached.expiresAt > Date.now() + 60000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  let key;
  try {
    const pem = account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
    key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), c => c.charCodeAt(0)),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  } catch { throw new HttpError(503, 'Kredensial layanan akun tidak valid.'); }
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(header + '.' + claims));
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: header + '.' + claims + '.' + b64url(new Uint8Array(signature)) }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok || typeof result.access_token !== 'string') throw new HttpError(503, 'Layanan akun sedang tidak tersedia.');
  tokenCache.set(env, { token: result.access_token, expiresAt: Date.now() + Math.min(Number(result.expires_in) || 3600, 3600) * 1000 });
  return result.access_token;
}

export function documentId(value) {
  if (typeof value !== 'string' || !value || value.length > 200 || /[/\x00-\x1f]/.test(value) || value === '.' || value === '..') {
    throw new HttpError(400, 'Referensi tidak valid.');
  }
  return value;
}

export function encodeValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  return { mapValue: { fields: encodeFields(value) } };
}
export function encodeFields(value) { return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).map(([k, v]) => [k, encodeValue(v)])); }
export function decodeValue(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields);
  return null;
}
export function decodeFields(fields = {}) { return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decodeValue(v)])); }

export function firestoreAdmin(env) {
  serviceAccount(env); // Fail closed before any external side effect.
  const root = `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
  const name = path => `${root}/${path}`;
  async function request(path, options = {}) {
    const response = await fetch('https://firestore.googleapis.com/v1/' + path, {
      ...options, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await adminToken(env) },
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new HttpError(503, 'Penyimpanan akun sedang tidak tersedia.');
      error.code = data.error?.status; error.providerStatus = response.status;
      throw error;
    }
    return data;
  }
  return {
    name, request,
    async get(path) {
      try {
        const doc = await request(name(path).split('/').map(encodeURIComponent).join('/'));
        return { name: doc.name, data: decodeFields(doc.fields), updateTime: doc.updateTime };
      } catch (error) { if (error.providerStatus === 404) return null; throw error; }
    },
    write(path, data, existing, merge = false) {
      return { update: { name: name(path), fields: encodeFields(data) },
        ...(merge ? { updateMask: { fieldPaths: Object.keys(data) } } : {}),
        ...(existing === undefined ? {} : { currentDocument: existing ? { updateTime: existing.updateTime } : { exists: false } }) };
    },
    commit(writes) { return request(root + ':commit', { method: 'POST', body: JSON.stringify({ writes }) }); },
    async list(path, options = {}) {
      const params = new URLSearchParams({ pageSize: '100', ...options });
      const result = await request(name(path) + '?' + params);
      return { documents: (result.documents || []).map(doc => ({ name: doc.name, data: decodeFields(doc.fields), updateTime: doc.updateTime })), nextPageToken: result.nextPageToken };
    },
  };
}

export function isContention(error) { return ['ABORTED', 'FAILED_PRECONDITION', 'ALREADY_EXISTS'].includes(error.code); }
