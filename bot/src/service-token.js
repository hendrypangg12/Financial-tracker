import { HttpError } from './auth.js';
const cache = new Map(), enc = new TextEncoder();
const b64 = value => btoa(typeof value === 'string' ? value : String.fromCharCode(...value)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
export async function scopedServiceToken(env, secretName, scope) {
  let account; try { account = JSON.parse(env[secretName] || ''); } catch {}
  if (!account?.private_key || !account.client_email) throw new HttpError(503, 'Google Play belum dikonfigurasi.');
  const keyName = account.client_email + '|' + scope, hit = cache.get(keyName); if (hit?.expiresAt > Date.now() + 60000) return hit.token;
  const now = Math.floor(Date.now()/1000), header = b64(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const claims = b64(JSON.stringify({iss:account.client_email,scope,aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}));
  const pem = account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'');
  let key; try { key = await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']); }
  catch { throw new HttpError(503, 'Kredensial Google Play tidak valid.'); }
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,enc.encode(header+'.'+claims));
  const response = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:header+'.'+claims+'.'+b64(new Uint8Array(signature))}),signal:AbortSignal.timeout(15000)});
  const result = await response.json(); if (!response.ok || !result.access_token) throw new HttpError(503,'Google Play sedang tidak tersedia.');
  cache.set(keyName,{token:result.access_token,expiresAt:Date.now()+(Number(result.expires_in)||3600)*1000}); return result.access_token;
}
