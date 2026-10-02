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
  async function verify(p){const r=await fetch(API+'/api/google-play/verify',{method:'POST',headers:await authenticatedHeaders(),body:JSON.stringify({productId:p.productId,purchaseToken:p.purchaseToken})});const x=await r.json().catch(()=>({}));if(!r.ok||x.entitlementApplied!==true)throw new Error(x.error||'Aktivasi paket gagal.');const profile=await refreshUserProfile();applyFreshProfile(profile);return x;}
  // Setelah paket aktif: gambar ulang header, label paket & kunci fitur Pro tanpa perlu buka ulang app.
  function applyFreshProfile(profile=currentProfile){try{if(typeof updateUserMenu==='function')updateUserMenu(currentUser,profile);if(typeof setupProGating==='function')setupProGating(profile);if(typeof renderAll==='function')renderAll();}catch(e){console.warn('Tampilan paket belum diperbarui:',e.message);}}
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
  function hasActivePlaySubscription(profile){
    return !!(profile?.googlePlaySubscriptionLedger?.entries?.some(entry=>
      entry.status==='active'&&Date.parse(entry.providerExpiry)>Date.now())
      ||(profile?.activatedBy==='google-play-subscription'&&typeof isPro==='function'&&isPro(profile)));
  }
  function purchaseGuardReason(profile,productId){
    if(!profile)return 'Status akun belum terbaca. Muat ulang sebelum membeli.';
    const active=typeof isPro==='function'&&isPro(profile);
    if(hasActivePlaySubscription(profile))return 'Langganan Google Play masih aktif. Paket tambahan dapat tumpang tindih; kelola langganan yang ada dulu.';
    if(!active)return '';
    if(['lifetime','pro'].includes(profile.plan))return 'Akun ini sudah memiliki akses tanpa batas waktu.';
    if(productId!=='beruang_access_7d')return 'Paket saat ini masih aktif. Langganan baru ditagih segera dan tidak menambah sisa hari paket ini. Pilih setelah paket berakhir.';
    return '';
  }
  async function renderPaywall(){
    const el=document.getElementById('paywall-screen');el.hidden=false;window.trackOnce?.('paywall_view');
    el.innerHTML='<main class="play-paywall"><h1>Paket &amp; pembayaran</h1><p id="play-plan-status"></p><div id="play-products">Memuat paket…</div><p>30 hari dan 1 tahun ditagih otomatis setiap periode sampai dibatalkan. Kelola langganan Google Play kapan saja. Paket 7 hari hanya dibayar sekali.</p><a id="play-manage" href="https://play.google.com/store/account/subscriptions?package=id.berstock.beruang" hidden>Kelola langganan di Google Play</a><p><button id="play-restore" type="button">Pulihkan pembelian</button></p><p><button id="play-export" type="button">Unduh backup data</button></p><p><button id="play-logout" type="button">Keluar akun</button></p></main>';
    const profile=typeof currentProfile==='undefined'?null:currentProfile;
    const active=profile&&typeof isPro==='function'&&isPro(profile);
    const names={free_trial:'Uji Coba Gratis',trial:'Akses 7 Hari',starter:'Akses 7 Hari',monthly:'Pro Bulanan',annual:'Pro Tahunan',lifetime:'Lifetime',pro:'Pro'};
    const date=profile?.expiresAt?new Date(profile.expiresAt):null;
    const end=date&&!Number.isNaN(date.getTime())?new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric'}).format(date):'';
    const status=document.getElementById('play-plan-status');
    const activeSubscription=hasActivePlaySubscription(profile);
    status.textContent=activeSubscription?`Paket saat ini: ${names[profile.plan]||'Pro'} · aktif${end?` sampai ${end}`:''}. Kelola langganan Google Play sebelum membeli paket lain.`:
      active&&['lifetime','pro'].includes(profile.plan)?'Akun ini sudah memiliki akses tanpa batas waktu. Pembelian paket tambahan tidak diperlukan.':
      active?`Paket saat ini: ${names[profile.plan]||'Pro'} · aktif${end?` sampai ${end}`:''}. Akses 7 Hari dapat ditambahkan; langganan baru tersedia setelah paket ini berakhir.`:
      'Belum ada paket aktif. Pilih paket di bawah; harga akan mengikuti yang ditampilkan Google Play.';
    const manage=document.getElementById('play-manage');
    manage.hidden=!activeSubscription;
    try{
      const rows=(await billing.getProducts({productIds:IDS})).products||[],container=document.getElementById('play-products');container.replaceChildren();
      for(const p of rows){
        const button=document.createElement('button');button.className='play-plan';button.dataset.playProduct=p.productId;button.type='button';
        const blocked=purchaseGuardReason(profile,p.productId);button.disabled=!!blocked;
        if(blocked)button.title=blocked;
        const title=document.createElement('strong');title.textContent=LABELS[p.productId]||'Paket BerUang';
        const price=document.createElement('span');price.textContent=`${p.price}${p.productType==='SUBS'?(p.productId==='beruang_monthly_subscription'?' / bulan':' / tahun'):''}`;
        button.append(title,price);container.append(button);
        if(blocked){const note=document.createElement('small');note.className='play-plan-note';note.textContent=blocked;container.append(note);}
      }
      if(!rows.length)container.textContent='Paket belum tersedia untuk akun penguji ini.';
    }catch(e){document.getElementById('play-products').textContent='Paket belum dapat dimuat: '+e.message;}
  }
  const originalScreen=window.showScreen;window.showScreen=function(which){if(which==='paywall'&&production){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));renderPaywall();syncOwnedSubscriptions();return;}const result=originalScreen(which);if(which==='app'){window.updateUserMenu?.(currentUser,currentProfile);window.renderAll?.();syncOwnedSubscriptions();}return result;};
  window.loginGoogle=async()=>{if(!nativeGoogleAuth)throw new Error('Login Google belum dikonfigurasi di versi aplikasi ini.');const result=await nativeGoogleAuth.signInWithGoogle({skipNativeAuth:true});const idToken=result?.credential?.idToken;if(!idToken)throw new Error('Google tidak mengembalikan token login. Coba lagi.');const credential=firebase.auth.GoogleAuthProvider.credential(idToken);await fbAuth.signInWithCredential(credential);};window.createPaymentInvoice=async()=>{throw new Error('Pembelian menggunakan Google Play.');};window.openPaymentModal=()=>window.showScreen('paywall');window.handlePostPaymentRedirect=async()=>{};window.showProGate=()=>window.showScreen('paywall');window.isAdmin=()=>false;
  window.saveNativeBackup=async(data,filename)=>{const fs=window.Capacitor.registerPlugin('Filesystem'),share=window.Capacitor.registerPlugin('Share'),name=filename.replace(/[^a-zA-Z0-9._-]/g,'_'),json=JSON.stringify(data,null,2);await fs.writeFile({path:'backups/'+name,data:json,directory:'DATA',encoding:'utf8',recursive:true});const file=await fs.writeFile({path:'backups/'+name,data:json,directory:'CACHE',encoding:'utf8',recursive:true});await share.share({title:'Backup BerUang',files:[file.uri],dialogTitle:'Simpan backup BerUang'});};
  window.exportData=async()=>{try{await window.saveNativeBackup({...syncData(state),exportedAt:new Date().toISOString()},'beruang-'+Date.now()+'.json');}catch(e){showToast('Backup belum diekspor: '+e.message,'error');}};
  const originalFetch=window.fetch.bind(window);window.fetch=function(input,init){const target=new URL(typeof input==='string'?input:input.url,location.href);if(/\/api\/(create-invoice|verify-payment)/.test(target.pathname))return Promise.reject(new Error('Gunakan Google Play.'));return originalFetch(input,init);};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncOwnedSubscriptions();});
  window.addEventListener?.('pageshow',()=>syncOwnedSubscriptions());
  document.addEventListener('click',async event=>{const plan=event.target.closest('[data-play-product]');if(plan){const blocked=purchaseGuardReason(currentProfile,plan.dataset.playProduct);if(blocked){showToast(blocked,'info');return;}plan.disabled=true;window.trackOnce?.('checkout_click');try{const p=await billing.purchase({productId:plan.dataset.playProduct,obfuscatedAccountId:await hash(currentUser.uid)});await verify(p);window.trackOnce?.('paid');showToast('Paket aktif. Terima kasih!','success');window.showScreen('app');}catch(e){showToast(e.message,'error');}finally{plan.disabled=false;}return;}if(event.target.closest('#play-restore')){try{const rows=(await billing.restorePurchases()).purchases||[];for(const p of rows)await verify(p);showToast(rows.length?'Pembelian dipulihkan.':'Tidak ada pembelian yang perlu dipulihkan.','success');}catch(e){showToast(e.message,'error');}}if(event.target.closest('#play-export')&&typeof window.exportData==='function')window.exportData();if(event.target.closest('#play-logout'))logout();});
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
