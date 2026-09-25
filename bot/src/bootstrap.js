import { requireUser, HttpError } from './auth.js';
import { firestoreAdmin, documentId, isContention } from './firebase-admin.js';

const json = (body, status=200) => new Response(JSON.stringify(body), { status, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'} });
export async function handleAccountBootstrap(request, env) {
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    const user = await requireUser(request, env), body = await request.json().catch(() => ({}));
    const db = firestoreAdmin(env), path = `users/${documentId(user.uid)}/meta/profile`;
    for (let attempt=0; attempt<3; attempt++) {
      const existing = await db.get(path); if (existing) return json({ok:true,created:false});
      const now = new Date(), profile = { email:user.email, displayName:String(body.displayName||user.email.split('@')[0]||'User').slice(0,200),
        photoURL:String(body.photoURL||'').slice(0,2048), createdAt:now.toISOString(), plan:'free_trial',
        expiresAt:new Date(now.getTime()+2*86400000).toISOString(), activatedAt:now.toISOString(), activatedBy:'account-bootstrap' };
      try { await db.commit([db.write(path,profile,null)]); return json({ok:true,created:true,expiresAt:profile.expiresAt}); }
      catch(error) { if(!isContention(error)) throw error; }
    }
    return json({ok:true,created:false});
  } catch(error) { return json({error:error.message||'Profil gagal dibuat.'},error.status||500); }
}
