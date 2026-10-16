/* Native-only adapter. Access is granted only after server verification. */
(() => {
  'use strict';
  const production=window.__BERUANG_STORE_BUILD__===true, API='https://berstock-bot.hendrypangg12.workers.dev';
  document.body?.classList.add(production ? 'ruvy-store-build' : 'ruvy-test-build');
  const nativeText=value=>typeof window.t==='function'?window.t(value):value;
  const nativeHtml=value=>value.split(/(<[^>]*>)/g).map(part=>part.startsWith('<')?part:nativeText(part.replace(/&amp;/g,'&'))).join('');
  const english=()=>typeof window.getAppLanguage==='function'&&window.getAppLanguage()==='en';
  const message=(id,en)=>english()?en:id;
  // Paket dijual: Bulanan (uji coba gratis 3 hari untuk pelanggan baru) & Tahunan. 7-Day Pass tidak dijual lagi;
  // pembelian lama tetap dipulihkan lewat restorePurchases + verifikasi server.
  const IDS=['beruang_monthly_subscription','beruang_annual_subscription'];
  const LABELS={beruang_monthly_subscription:'Pro 30 Hari · berulang otomatis',beruang_annual_subscription:'Pro 1 Tahun · berulang otomatis'};
  // registerPlugin berasal dari @capacitor/core (vendor/capacitor.js). Bridge native saja hanya menyediakan
  // Capacitor.Plugins, jadi tetap ada jalur cadangan supaya adapter ini tidak mati dan paywall tidak kosong.
  const plugin=name=>{const cap=window.Capacitor;if(!cap)return undefined;return typeof cap.registerPlugin==='function'?cap.registerPlugin(name):cap.Plugins?.[name];};
  const billing=plugin('PlayBilling');
  const nativeGoogleAuth=window.Capacitor?.isNativePlatform?.()?plugin('FirebaseAuthentication'):null;
  if(nativeGoogleAuth)document.body?.classList.add('native-google-auth');
  const syncedEntitlementAt=new Map(),entitlementSyncInFlight=new Map(),ENTITLEMENT_SYNC_INTERVAL=6*60*60*1000;
  async function hash(v){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');}
  async function verify(p){const r=await fetch(API+'/api/google-play/verify',{method:'POST',headers:await authenticatedHeaders(),body:JSON.stringify({productId:p.productId,purchaseToken:p.purchaseToken})});const x=await r.json().catch(()=>({}));if(!r.ok||x.entitlementApplied!==true)throw new Error(x.error||'Aktivasi paket gagal.');const refreshed=await refreshUserProfile();const profile=refreshed===undefined&&typeof currentProfile!=='undefined'?currentProfile:refreshed;if(!profile||(typeof isPro==='function'&&!isPro(profile)))throw new Error('Pembayaran tercatat, tetapi paket akun belum terlihat. Coba Pulihkan pembelian.');applyFreshProfile(profile);return x;}
  // Setelah paket aktif: gambar ulang header, label paket & kunci fitur Pro tanpa perlu buka ulang app.
  function applyFreshProfile(profile){try{if(typeof updateUserMenu==='function')updateUserMenu(currentUser,profile);if(typeof setupProGating==='function')setupProGating(profile);if(typeof renderAll==='function')renderAll();}catch(e){console.warn('Tampilan paket belum diperbarui:',e.message);}}
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
    if(!profile)return message('Status akun belum terbaca. Muat ulang sebelum membeli.','Your account could not be loaded. Reload before purchasing.');
    const active=typeof isPro==='function'&&isPro(profile);
    if(hasActivePlaySubscription(profile))return message('Langganan Google Play masih aktif. Paket tambahan dapat tumpang tindih; kelola langganan yang ada dulu.','Your Google Play subscription is active. Manage it before purchasing an overlapping plan.');
    if(!active)return '';
    if(['lifetime','pro'].includes(profile.plan))return message('Akun ini sudah memiliki akses tanpa batas waktu.','This account already has unlimited access.');
    if(profile.plan==='free_trial')return '';
    if(productId!=='beruang_access_7d')return message('Paket saat ini masih aktif. Langganan baru ditagih segera dan tidak menambah sisa hari paket ini. Pilih setelah paket berakhir.','Your current plan is still active. A new subscription is charged immediately and does not extend this plan. Choose after your plan ends.');
    return '';
  }
  async function renderPaywall(){
    const el=document.getElementById('paywall-screen');el.hidden=false;window.trackOnce?.('paywall_view');
    el.innerHTML=nativeHtml('<main class="play-paywall"><h1>Paket &amp; pembayaran</h1><p id="play-plan-status"></p><div id="play-products">Memuat paket…</div><p>30 hari dan 1 tahun ditagih otomatis setiap periode sampai dibatalkan. Kelola langganan Google Play kapan saja. Uji coba gratis hanya untuk pelanggan baru; batalkan sebelum uji coba berakhir agar tidak ditagih.</p><a id="play-manage" href="https://play.google.com/store/account/subscriptions?package=id.berstock.beruang" hidden>Kelola langganan di Google Play</a><p><button id="play-restore" type="button">Pulihkan pembelian</button></p><p><button id="play-export" type="button">Unduh backup data</button></p><p><button id="play-logout" type="button">Keluar akun</button></p></main>');
    const profile=typeof currentProfile==='undefined'?null:currentProfile;
    const active=profile&&typeof isPro==='function'&&isPro(profile);
    const language=document.createElement('select');language.id='play-language';language.setAttribute('aria-label','Language / Bahasa');
    for(const [value,label] of [['en','English'],['id','Bahasa Indonesia']]){const option=document.createElement('option');option.value=value;option.textContent=label;language.append(option);}
    language.value=english()?'en':'id';
    language.onchange=()=>{
      if(typeof setAccountPreferences==='function')setAccountPreferences({language:language.value});
      else if(typeof setDeviceLanguage==='function'){setDeviceLanguage(language.value);window.applyAppLanguage?.();}
      renderPaywall();
    };
    el.querySelector('main').prepend(language);
    if(active){const back=document.createElement('button');back.type='button';back.id='play-back';back.textContent=message('Kembali ke aplikasi','Back to app');back.onclick=()=>window.showScreen('app');el.querySelector('main').prepend(back);}
    const names={free_trial:'Uji Coba Gratis',trial:'Akses 7 Hari',starter:'Akses 7 Hari',monthly:'Pro Bulanan',annual:'Pro Tahunan',lifetime:'Lifetime',pro:'Pro'};
    const date=profile?.expiresAt?new Date(profile.expiresAt):null;
    const end=date&&!Number.isNaN(date.getTime())?new Intl.DateTimeFormat(english()?'en-US':'id-ID',{day:'numeric',month:'long',year:'numeric'}).format(date):'';
    const status=document.getElementById('play-plan-status');
    const activeSubscription=hasActivePlaySubscription(profile);
    status.textContent=activeSubscription?`Paket saat ini: ${names[profile.plan]||'Pro'} · aktif${end?` sampai ${end}`:''}. Kelola langganan Google Play sebelum membeli paket lain.`:
      active&&['lifetime','pro'].includes(profile.plan)?'Akun ini sudah memiliki akses tanpa batas waktu. Pembelian paket tambahan tidak diperlukan.':
      active&&profile.plan==='free_trial'?`Uji coba aplikasi gratis · aktif${end?` sampai ${end}`:''}. Jelajahi aplikasi tanpa pembayaran selama masa uji coba 2 hari. Berlangganan hanya jika ingin melanjutkan setelahnya. Google Play mengonfirmasi uji coba langganan yang tersedia dan tanggal tagihan pertama; sisa uji coba aplikasi tidak menambah masa langganan.`:
      active?`Paket saat ini: ${names[profile.plan]||'Pro'} · aktif${end?` sampai ${end}`:''}. Langganan baru tersedia setelah paket ini berakhir.`:
      !profile?'Status akun belum dapat dibaca. Muat ulang sebelum memilih pembayaran.':
      'Masa aktif akun sudah habis. Pilih paket untuk melanjutkan; catatan Anda tetap tersimpan. Harga ditampilkan oleh Google Play.';
    if(english()) {
      const plan=nativeText(names[profile?.plan]||'Pro');
      const until=end?' until '+end:'';
      status.textContent=activeSubscription?`Current plan: ${plan} · active${until}. Manage your Google Play subscription before buying another plan.`:
        active&&['lifetime','pro'].includes(profile.plan)?'This account already has unlimited access. No additional plan is needed.':
        active&&profile.plan==='free_trial'?`Free app trial · active${until}. Explore the app without payment during your 2-day trial. Subscribe only if you want to continue afterwards. Google Play confirms any available subscription trial and first charge date; unused app trial days are not added to the subscription.`:
        active?`Current plan: ${plan} · active${until}. A new subscription is available after this plan expires.`:
        !profile?'Your account could not be loaded. Reload before choosing a payment.':
        'Your access has ended. Choose a plan to continue; your records remain saved. Google Play displays the price before purchase.';
    }
    const manage=document.getElementById('play-manage');
    manage.hidden=!activeSubscription;
    try{
      const rows=(await billing.getProducts({productIds:IDS})).products||[],container=document.getElementById('play-products');container.replaceChildren();
      for(const p of rows){
        const button=document.createElement('button');button.className='play-plan';button.dataset.playProduct=p.productId;button.type='button';
        const blocked=purchaseGuardReason(profile,p.productId);button.disabled=!!blocked;
        if(blocked)button.title=blocked;
        const title=document.createElement('strong');title.textContent=nativeText(LABELS[p.productId]||'Ruvy Pro');
        const period=p.productType==='SUBS'?(p.productId==='beruang_monthly_subscription'?(english()?' / month':' / bulan'):(english()?' / year':' / tahun')):'';
        const trialDays=Number(p.freeTrialDays)||0;
        const price=document.createElement('span');
        price.textContent=trialDays>0?(english()?`Free for ${trialDays} days, then ${p.price}${period}`:`Gratis ${trialDays} hari, lalu ${p.price}${period}`):`${p.price}${period}`;
        button.append(title,price);container.append(button);
        if(blocked){const note=document.createElement('small');note.className='play-plan-note';note.textContent=blocked;container.append(note);}
      }
      if(!rows.length)container.textContent=nativeText('Paket belum tersedia untuk akun penguji ini.');
    }catch(e){document.getElementById('play-products').textContent=message('Paket belum dapat dimuat. Coba muat ulang atau periksa koneksi.','Plans could not be loaded. Reload or check your connection.');}
  }
  const originalScreen=window.showScreen;window.showScreen=function(which){if(which==='paywall'&&production){document.body?.classList.add('app-locked');for(const id of ['startup-screen','login-screen','user-menu']){const node=document.getElementById(id);if(node)node.hidden=true;}document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));renderPaywall();syncOwnedSubscriptions();return;}const result=originalScreen(which);if(which==='app')syncOwnedSubscriptions();return result;};
  window.loginGoogle=async()=>{if(!nativeGoogleAuth)throw new Error('Login Google belum dikonfigurasi di versi aplikasi ini.');const result=await nativeGoogleAuth.signInWithGoogle({skipNativeAuth:true});const idToken=result?.credential?.idToken;if(!idToken)throw new Error('Google tidak mengembalikan token login. Coba lagi.');const credential=firebase.auth.GoogleAuthProvider.credential(idToken);await fbAuth.signInWithCredential(credential);};window.createPaymentInvoice=async()=>{throw new Error('Pembelian menggunakan Google Play.');};window.openPaymentModal=()=>window.showScreen('paywall');window.handlePostPaymentRedirect=async()=>{};window.showProGate=()=>window.showScreen('paywall');window.isAdmin=()=>false;
  window.saveNativeBackup=async(data,filename)=>{const fs=plugin('Filesystem'),share=plugin('Share'),name=filename.replace(/[^a-zA-Z0-9._-]/g,'_'),json=JSON.stringify(data,null,2);await fs.writeFile({path:'backups/'+name,data:json,directory:'DATA',encoding:'utf8',recursive:true});const file=await fs.writeFile({path:'backups/'+name,data:json,directory:'CACHE',encoding:'utf8',recursive:true});await share.share({title:'Backup Ruvy',files:[file.uri],dialogTitle:'Simpan backup Ruvy'});};
  window.exportData=async()=>{try{await window.saveNativeBackup({...syncData(state),exportedAt:new Date().toISOString()},'beruang-'+Date.now()+'.json');}catch(e){showToast('Backup belum diekspor: '+e.message,'error');}};
  const originalFetch=window.fetch.bind(window);window.fetch=function(input,init){const target=new URL(typeof input==='string'?input:input.url,location.href);if(/\/api\/(create-invoice|verify-payment)/.test(target.pathname))return Promise.reject(new Error('Gunakan Google Play.'));return originalFetch(input,init);};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncOwnedSubscriptions();});
  window.addEventListener?.('pageshow',()=>syncOwnedSubscriptions());
  document.addEventListener('click',async event=>{const plan=event.target.closest('[data-play-product]');if(plan){const blocked=purchaseGuardReason(currentProfile,plan.dataset.playProduct);if(blocked){showToast(blocked,'info');return;}plan.disabled=true;window.trackOnce?.('checkout_click');try{const p=await billing.purchase({productId:plan.dataset.playProduct,obfuscatedAccountId:await hash(currentUser.uid)});await verify(p);window.trackOnce?.('paid');showToast(message('Paket aktif. Terima kasih!','Your plan is active. Thank you!'),'success');window.showScreen('app');}catch(e){showToast(e.message,'error');}finally{plan.disabled=false;}return;}if(event.target.closest('#play-restore')){try{const rows=(await billing.restorePurchases()).purchases||[];for(const p of rows)await verify(p);showToast(rows.length?message('Pembelian dipulihkan.','Purchases restored.'):message('Tidak ada pembelian yang perlu dipulihkan.','No purchases to restore.'),'success');}catch(e){showToast(e.message,'error');}}if(event.target.closest('#play-export')&&typeof window.exportData==='function')window.exportData();if(event.target.closest('#play-logout'))logout();});
  // Minta rating Play Store lewat dialog resmi Google (In-App Review). Tidak bertanya "suka atau tidak" dulu
  // (dilarang kebijakan Google). Syarat: ≥10 transaksi, ≥3 hari sejak pertama dibuka, maks 1x per 120 hari.
  const REVIEW_KEY='beruang-review-asked-at',FIRST_OPEN_KEY='beruang-first-open-at',DAY=86400000;
  try{if(!localStorage.getItem(FIRST_OPEN_KEY))localStorage.setItem(FIRST_OPEN_KEY,String(Date.now()));}catch{}
  window.maybeAskReview=async()=>{
    try{
      if(!window.Capacitor?.isNativePlatform?.())return false;
      const review=plugin('InAppReview');
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
  document.addEventListener('DOMContentLoaded',()=>{if(production)return;const b=document.createElement('aside');b.className='mobile-test-banner';b.textContent='Ruvy Uji · Gunakan akun khusus tes';document.body.prepend(b);});
})();
