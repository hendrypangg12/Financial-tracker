/* Native-only adapter. Access is granted only after server verification. */
(() => {
  'use strict';
  const production=window.__BERUANG_STORE_BUILD__===true, API='https://berstock-bot.hendrypangg12.workers.dev';
  const IDS=['beruang_access_7d','beruang_monthly_subscription','beruang_annual_subscription'];
  const LABELS={beruang_access_7d:'Akses 7 Hari · sekali bayar',beruang_monthly_subscription:'Pro 30 Hari · berulang otomatis',beruang_annual_subscription:'Pro 1 Tahun · berulang otomatis'};
  const billing=window.Capacitor?.registerPlugin('PlayBilling');
  const nativeGoogleAuth=window.Capacitor?.isNativePlatform?.()?window.Capacitor.registerPlugin('FirebaseAuthentication'):null;
  if(nativeGoogleAuth)document.body?.classList.add('native-google-auth');
  const syncedEntitlementAt=new Map(),entitlementSyncInFlight=new Map(),ENTITLEMENT_SYNC_INTERVAL=6*60*60*1000;
  async function hash(v){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');}
  async function verify(p){const r=await fetch(API+'/api/google-play/verify',{method:'POST',headers:await authenticatedHeaders(),body:JSON.stringify({productId:p.productId,purchaseToken:p.purchaseToken})});const x=await r.json().catch(()=>({}));if(!r.ok||x.entitlementApplied!==true)throw new Error(x.error||'Aktivasi paket gagal.');await refreshUserProfile();applyFreshProfile();return x;}
  // Setelah paket aktif: gambar ulang header, label paket & kunci fitur Pro tanpa perlu buka ulang app.
  function applyFreshProfile(){try{if(typeof updateUserMenu==='function')updateUserMenu(currentUser,currentProfile);if(typeof setupProGating==='function')setupProGating(currentProfile);if(typeof renderAll==='function')renderAll();}catch(e){console.warn('Tampilan paket belum diperbarui:',e.message);}}
  async function syncOwnedSubscriptions(force=false){
    const uid=typeof currentUser==='undefined'?'':currentUser?.uid;
    if(!production||!billing||!uid)return;
    const pending=entitlementSyncInFlight.get(uid);if(pending)return pending;
    if(!force&&Date.now()-(syncedEntitlementAt.get(uid)||0)<ENTITLEMENT_SYNC_INTERVAL)return;
    const task=(async()=>{
      let recovered=false,complete=true;
      try{
        const rows=(await billing.restorePurchases()).purchases||[];
        for(const p of rows)if(p.productId==='beruang_monthly_subscription'||p.productId==='beruang_annual_subscription'){
          try{await verify(p);recovered=true;}
          catch(e){complete=false;console.warn('Status langganan belum tersinkron:',e.message);}
        }
        if(complete)syncedEntitlementAt.set(uid,Date.now());
        if(recovered&&document.getElementById('paywall-screen')?.hidden===false)window.showScreen('app');
      }catch(e){console.warn('Sinkronisasi langganan Google Play tertunda:',e.message);}
      finally{entitlementSyncInFlight.delete(uid);}
    })();
    entitlementSyncInFlight.set(uid,task);return task;
  }
  async function renderPaywall(){const el=document.getElementById('paywall-screen');el.hidden=false;window.trackOnce?.('paywall_view');el.innerHTML='<main class="play-paywall"><h1>Lanjutkan dengan BerUang</h1><p>Uji coba gratis 2 hari telah berakhir. Pilih paket dan tinjau harga sebelum membayar.</p><div id="play-products">Memuat paket…</div><p>30 hari dan 1 tahun ditagih otomatis setiap periode sampai dibatalkan. Kelola atau batalkan langganan kapan saja melalui Google Play. Paket 7 hari hanya dibayar sekali.</p><button id="play-restore" type="button">Pulihkan pembelian</button><p><button id="play-export" type="button">Unduh backup data</button></p><p><button id="play-logout" type="button">Keluar akun</button></p></main>';try{const rows=(await billing.getProducts({productIds:IDS})).products||[];document.getElementById('play-products').innerHTML=rows.map(p=>`<button class="play-plan" data-play-product="${p.productId}" type="button"><strong>${LABELS[p.productId]}</strong><span>${p.price}${p.productType==='SUBS'?(p.productId==='beruang_monthly_subscription'?' / bulan':' / tahun'):''}</span></button>`).join('')||'<p>Paket belum tersedia untuk akun penguji ini.</p>';}catch(e){document.getElementById('play-products').textContent='Paket belum dapat dimuat: '+e.message;}}
  const originalScreen=window.showScreen;window.showScreen=function(which){if(which==='paywall'&&production){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));renderPaywall();syncOwnedSubscriptions();return;}const result=originalScreen(which);if(which==='app')syncOwnedSubscriptions();return result;};
  window.loginGoogle=async()=>{if(!nativeGoogleAuth)throw new Error('Login Google belum dikonfigurasi di versi aplikasi ini.');const result=await nativeGoogleAuth.signInWithGoogle({skipNativeAuth:true});const idToken=result?.credential?.idToken;if(!idToken)throw new Error('Google tidak mengembalikan token login. Coba lagi.');const credential=firebase.auth.GoogleAuthProvider.credential(idToken);await fbAuth.signInWithCredential(credential);};window.createPaymentInvoice=async()=>{throw new Error('Pembelian menggunakan Google Play.');};window.openPaymentModal=()=>window.showScreen('paywall');window.handlePostPaymentRedirect=async()=>{};window.showProGate=()=>window.showScreen('paywall');window.isAdmin=()=>false;
  window.saveNativeBackup=async(data,filename)=>{const fs=window.Capacitor.registerPlugin('Filesystem'),share=window.Capacitor.registerPlugin('Share'),name=filename.replace(/[^a-zA-Z0-9._-]/g,'_'),json=JSON.stringify(data,null,2);await fs.writeFile({path:'backups/'+name,data:json,directory:'DATA',encoding:'utf8',recursive:true});const file=await fs.writeFile({path:'backups/'+name,data:json,directory:'CACHE',encoding:'utf8',recursive:true});await share.share({title:'Backup BerUang',files:[file.uri],dialogTitle:'Simpan backup BerUang'});};
  window.exportData=async()=>{try{await window.saveNativeBackup({...syncData(state),exportedAt:new Date().toISOString()},'beruang-'+Date.now()+'.json');}catch(e){showToast('Backup belum diekspor: '+e.message,'error');}};
  const originalFetch=window.fetch.bind(window);window.fetch=function(input,init){const target=new URL(typeof input==='string'?input:input.url,location.href);if(/\/api\/(create-invoice|verify-payment)/.test(target.pathname))return Promise.reject(new Error('Gunakan Google Play.'));return originalFetch(input,init);};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncOwnedSubscriptions();});
  window.addEventListener?.('pageshow',()=>syncOwnedSubscriptions());
  document.addEventListener('click',async event=>{const plan=event.target.closest('[data-play-product]');if(plan){plan.disabled=true;window.trackOnce?.('checkout_click');try{const p=await billing.purchase({productId:plan.dataset.playProduct,obfuscatedAccountId:await hash(currentUser.uid)});await verify(p);window.trackOnce?.('paid');showToast('Paket aktif. Terima kasih!','success');window.showScreen('app');}catch(e){showToast(e.message,'error');}finally{plan.disabled=false;}return;}if(event.target.closest('#play-restore')){try{const rows=(await billing.restorePurchases()).purchases||[];for(const p of rows)await verify(p);showToast(rows.length?'Pembelian dipulihkan.':'Tidak ada pembelian yang perlu dipulihkan.','success');}catch(e){showToast(e.message,'error');}}if(event.target.closest('#play-export')&&typeof window.exportData==='function')window.exportData();if(event.target.closest('#play-logout'))logout();});
  // Minta rating Play Store lewat dialog resmi Google (In-App Review). Tidak bertanya "suka atau tidak" dulu
  // (dilarang kebijakan Google). Syarat: ≥10 transaksi, ≥3 hari sejak pertama dibuka, maks 1x per 120 hari.
  const REVIEW_KEY='beruang-review-asked-at',FIRST_OPEN_KEY='beruang-first-open-at',DAY=86400000;
  try{if(!localStorage.getItem(FIRST_OPEN_KEY))localStorage.setItem(FIRST_OPEN_KEY,String(Date.now()));}catch{}
  window.maybeAskReview=async()=>{
    try{
      if(!window.Capacitor?.isNativePlatform?.())return false;
      const review=window.Capacitor.registerPlugin('InAppReview');
      const tx=((typeof state!=='undefined'&&state.transactions)||[]).filter(t=>t.kategori!=='Saldo Awal').length;
      const first=Number(localStorage.getItem(FIRST_OPEN_KEY))||Date.now(),last=Number(localStorage.getItem(REVIEW_KEY))||0;
      if(tx<10||Date.now()-first<3*DAY||Date.now()-last<120*DAY)return false;
      if(document.getElementById('paywall-screen')?.hidden===false)return false;
      localStorage.setItem(REVIEW_KEY,String(Date.now()));
      window.trackOnce?.('review_prompt');
      await review.requestReview();
      return true;
    }catch(e){console.warn('In-app review tidak tersedia:',e?.message);return false;}
  };
  document.addEventListener('DOMContentLoaded',()=>{if(production)return;const b=document.createElement('aside');b.className='mobile-test-banner';b.textContent='BerUang Uji · Gunakan akun khusus tes';document.body.prepend(b);});
})();
