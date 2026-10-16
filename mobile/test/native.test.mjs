import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const source=await readFile(new URL('../src/runtime.js',import.meta.url),'utf8');
function sandbox(plugins={},production=false) {
  const calls=[];
  const listeners={};
  const context={ URL, __BERUANG_STORE_BUILD__:production, location:{href:'https://localhost/'}, document:{hidden:false,body:{classList:{add:name=>calls.push(['class',name])}},addEventListener:(name,fn)=>listeners[name]=fn,getElementById:()=>null,querySelectorAll:()=>[]},addEventListener:(name,fn)=>listeners['window:'+name]=fn, showToast:(...args)=>calls.push(['toast',...args]), showScreen:name=>calls.push(['screen',name]), fetch:async()=>{calls.push(['fetch']);return 'ok';}, syncData:value=>value, state:{transactions:[]}, Capacitor:{ isNativePlatform:()=>true, registerPlugin:name=>plugins[name] } };
  context.window=context;
  vm.runInNewContext(source,context);
  return {context,calls,listeners};
}
test('native build blocks website payment APIs while normal account flow is preserved',async()=>{
  const {context,calls}=sandbox();
  await assert.rejects(context.createPaymentInvoice(), /Pembelian/);
  await assert.rejects(context.fetch('https://backend.test/api/create-invoice'), /Google Play/);
  await assert.rejects(context.fetch({url:'https://backend.test/api/verify-payment?ref=test'}), /Google Play/);
  context.showScreen('paywall'); context.showScreen('app');
  assert.equal(calls.some(x=>x[0]==='screen'&&x[1]==='paywall'),true);
  assert.equal(calls.some(x=>x[0]==='screen'&&x[1]==='app'),true);
  assert.equal(await context.fetch('https://firebase.test/sync'),'ok');
  await assert.rejects(context.loginGoogle(), /belum (dikonfigurasi|tersedia)/);
  assert.equal(context.isAdmin(),false);
});
test('native Google sign-in exchanges the native ID token for the existing Firebase JS session',async()=>{
  const calls=[];
  const {context}=sandbox({FirebaseAuthentication:{signInWithGoogle:async options=>{calls.push(['google',options]);return{credential:{idToken:'google-id-token'}};}}});
  context.firebase={auth:{GoogleAuthProvider:{credential:idToken=>({idToken})}}};
  context.fbAuth={signInWithCredential:async credential=>calls.push(['firebase',credential])};
  await context.loginGoogle();
  assert.deepEqual(JSON.parse(JSON.stringify(calls)),[['google',{skipNativeAuth:true}],['firebase',{idToken:'google-id-token'}]]);
});
test('runtime survives a bare native bridge that has Capacitor.Plugins but no registerPlugin',async()=>{
  const calls=[];
  const context={ URL, __BERUANG_STORE_BUILD__:true, location:{href:'https://localhost/'}, document:{hidden:false,body:{classList:{add:()=>{}}},addEventListener:()=>{},getElementById:()=>null,querySelectorAll:()=>[]},addEventListener:()=>{}, showScreen:()=>{}, fetch:async()=>'ok', Capacitor:{ isNativePlatform:()=>true, Plugins:{FirebaseAuthentication:{signInWithGoogle:async()=>{calls.push('google');return{credential:{idToken:'t'}};}}} } };
  context.window=context;
  context.firebase={auth:{GoogleAuthProvider:{credential:idToken=>({idToken})}}};
  context.fbAuth={signInWithCredential:async()=>calls.push('firebase')};
  vm.runInNewContext(source,context);
  await context.loginGoogle();
  assert.deepEqual(calls,['google','firebase']);
});
test('staged bundle loads @capacitor/core before the runtime and never ships an empty paywall',async()=>{
  const stage=await readFile(new URL('../scripts/stage-web.mjs',import.meta.url),'utf8');
  assert.match(stage,/<script src="vendor\/capacitor\.js"><\/script>\\n<script src="mobile-runtime\.js">/);
  assert.doesNotMatch(stage,/<div id="paywall-screen" hidden><\/div>/);
});
test('Play paywall sells only auto-renewing plans and explains the free trial',()=>{
  assert.match(source,/const IDS=\['beruang_monthly_subscription','beruang_annual_subscription'\]/);
  assert.doesNotMatch(source,/const IDS=\[[^\]]*beruang_access_7d/);
  assert.match(source,/ditagih otomatis setiap periode sampai dibatalkan/);
  assert.match(source,/Uji coba gratis hanya untuk pelanggan baru/);
  assert.match(source,/Gratis \$\{trialDays\} hari, lalu/);
  assert.match(source,/restorePurchases\(\)/);
});
test('billing plugin prefers the 3-day free-trial offer and falls back to the plain base plan',async()=>{
  const java=await readFile(new URL('../android/app/src/main/java/id/berstock/beruang/dev/PlayBillingPlugin.java',import.meta.url),'utf8');
  assert.match(java,/FREE_TRIAL_OFFER_ID = "free-trial-3d"/);
  assert.match(java,/candidate.getOfferId\(\) == null/);
  assert.match(java,/row.put\("freeTrialDays"/);
});
test('Play paywall prevents a second charged plan from overlapping active access',async()=>{
  const products=[
    {productId:'beruang_access_7d',productType:'INAPP',price:'Rp 10.000'},
    {productId:'beruang_monthly_subscription',productType:'SUBS',price:'Rp 50.000'},
    {productId:'beruang_annual_subscription',productType:'SUBS',price:'Rp 299.000'},
  ];
  let purchases=0;
  const billing={getProducts:async()=>({products}),restorePurchases:async()=>({purchases:[]}),purchase:async()=>{purchases++;}};
  const createNode=tag=>({tag,children:[],dataset:{},disabled:false,setAttribute(name,value){this[name]=value;},querySelector(){return this;},prepend(...items){this.children.unshift(...items);},append(...items){this.children.push(...items);},replaceChildren(){this.children=[];}});
  const render=async profile=>{
    const {context,listeners,calls}=sandbox({PlayBilling:billing},true);
    const elements={
      'paywall-screen':createNode('main'),
      'play-plan-status':createNode('p'),
      'play-manage':createNode('a'),
      'play-products':createNode('div'),
    };
    context.document.getElementById=id=>elements[id]||null;
    context.document.createElement=createNode;
    context.currentUser={uid:'user-1'};
    context.currentProfile=profile;
    context.isPro=value=>value&&(['lifetime','pro'].includes(value.plan)||Date.parse(value.expiresAt)>Date.now());
    context.showScreen('paywall');
    await new Promise(resolve=>setTimeout(resolve,10));
    const buttons=elements['play-products'].children.filter(node=>node.tag==='button');
    return {context,listeners,calls,elements,buttons};
  };
  const expiresAt=new Date(Date.now()+7*86400000).toISOString();
  const freeTrial=Object.freeze({plan:'free_trial',activatedBy:'account-bootstrap',expiresAt});
  const upgrade=await render(freeTrial);
  assert.deepEqual(upgrade.buttons.map(button=>button.disabled),[false,false,false]);
  assert.match(upgrade.elements['play-plan-status'].textContent,/Uji coba aplikasi gratis/);
  assert.match(upgrade.elements['play-plan-status'].textContent,/tanpa pembayaran.*2 hari/);
  assert.match(upgrade.elements['play-plan-status'].textContent,/Google Play.*uji coba.*tanggal tagihan pertama/);
  assert.doesNotMatch(upgrade.elements['play-plan-status'].textContent,/setelah paket ini berakhir/);
  assert.equal(upgrade.context.currentProfile,freeTrial,'rendering upgrade does not change the existing entitlement');
  for(const plan of ['trial','starter','monthly','annual']){
    const pass=await render({plan,activatedBy:'google-play',expiresAt});
    assert.deepEqual(pass.buttons.map(button=>button.disabled),[false,true,true],`${plan} paid access remains protected`);
  }
  for(const plan of ['lifetime','pro']){
    const permanent=await render({plan,expiresAt});
    assert.deepEqual(permanent.buttons.map(button=>button.disabled),[true,true,true],`${plan} cannot buy another plan`);
  }
  const subscription=await render({plan:'monthly',activatedBy:'google-play-subscription',expiresAt});
  assert.deepEqual(subscription.buttons.map(button=>button.disabled),[true,true,true]);
  assert.equal(subscription.elements['play-manage'].hidden,false);
  const independentSubscription=await render({plan:'free_trial',expiresAt,googlePlaySubscriptionLedger:{entries:[{status:'active',providerExpiry:expiresAt}]}});
  assert.deepEqual(independentSubscription.buttons.map(button=>button.disabled),[true,true,true],'an active subscription overrides the free-trial upgrade exception');
  const expired=await render({plan:'trial',activatedBy:'google-play',expiresAt:'2020-01-01T00:00:00.000Z'});
  assert.deepEqual(expired.buttons.map(button=>button.disabled),[false,false,false]);
  // Profile can change after rendering; the click handler checks the current profile again.
  expired.context.currentProfile={plan:'monthly',activatedBy:'google-play-subscription',expiresAt};
  const clicked=expired.buttons[0];
  await expired.listeners.click({target:{closest:selector=>selector==='[data-play-product]'?clicked:null}});
  assert.equal(purchases,0);
  assert.ok(expired.calls.some(row=>row[0]==='toast'&&row[1].includes('tumpang tindih')));
});

test('free-trial upgrades to monthly and annual still require server-applied entitlement',async()=>{
  for(const productId of ['beruang_monthly_subscription','beruang_annual_subscription']){
    for(const accepted of [false,true]){
      const operations=[];
      const trial=Object.freeze({plan:'free_trial',activatedBy:'account-bootstrap',expiresAt:new Date(Date.now()+2*86400000).toISOString()});
      const paid={plan:productId==='beruang_monthly_subscription'?'monthly':'annual',expiresAt:'2099-01-01T00:00:00.000Z'};
      const purchase={productId,purchaseToken:'subscription-test-token'};
      const billing={purchase:async options=>{operations.push(['purchase',options]);return purchase;},restorePurchases:async()=>({purchases:[]})};
      const {context,listeners,calls}=sandbox({PlayBilling:billing},true);
      context.currentUser={uid:'trial-user'};
      context.currentProfile=trial;
      context.isPro=profile=>Date.parse(profile?.expiresAt)>Date.now();
      context.crypto=globalThis.crypto;
      context.TextEncoder=TextEncoder;
      context.authenticatedHeaders=async()=>({Authorization:'Bearer test'});
      context.fetch=async(url,options)=>{
        operations.push(['verify',url,JSON.parse(options.body)]);
        assert.equal(context.currentProfile,trial,'checkout does not grant paid access before server confirmation');
        return {ok:true,json:async()=>accepted?{entitlementApplied:true}:{entitlementApplied:false,error:'Entitlement belum diterapkan.'}};
      };
      context.refreshUserProfile=async()=>{operations.push(['refresh']);context.currentProfile=paid;return paid;};
      context.setupProGating=profile=>operations.push(['gating',profile]);
      const button={dataset:{playProduct:productId},disabled:false};
      await listeners.click({target:{closest:selector=>selector==='[data-play-product]'?button:null}});
      assert.equal(operations[0][0],'purchase',`${productId} checkout is allowed from a free trial`);
      assert.equal(operations[0][1].productId,productId);
      assert.equal(operations[0][1].obfuscatedAccountId,createHash('sha256').update('trial-user').digest('hex'));
      assert.deepEqual(operations[1],['verify','https://berstock-bot.hendrypangg12.workers.dev/api/google-play/verify',purchase]);
      assert.equal(context.currentProfile,accepted?paid:trial);
      assert.equal(operations.some(operation=>operation[0]==='refresh'),accepted);
      assert.equal(operations.some(operation=>operation[0]==='gating'),accepted);
      assert.equal(calls.some(call=>call[0]==='toast'&&call[2]==='success'),accepted);
      assert.equal(calls.some(call=>call[0]==='toast'&&call[2]==='error'),!accepted);
    }
  }
});
test('subscription restore retries after a verification failure and refreshes again after six hours',async()=>{
  let restores=0,verified=0,now=Date.now(),failFirst=true;
  const billing={restorePurchases:async()=>{restores++;return{purchases:[{productId:'beruang_monthly_subscription',purchaseToken:'token'}]};}};
  const {context,listeners}=sandbox({PlayBilling:billing},true);
  context.currentUser={uid:'u'};context.authenticatedHeaders=async()=>({});context.refreshUserProfile=async()=>({plan:'monthly',expiresAt:'2099-01-01T00:00:00.000Z'});
  context.Date={now:()=>now};
  context.fetch=async()=>{verified++;return{ok:!failFirst,json:async()=>failFirst?{error:'temporary'}:{entitlementApplied:true}};};
  const settle=()=>new Promise(resolve=>setTimeout(resolve,10));
  context.showScreen('app');await settle();
  assert.equal(restores,1);assert.equal(verified,1);
  failFirst=false;listeners.visibilitychange();await settle();
  assert.equal(restores,2);assert.equal(verified,2);
  listeners.visibilitychange();await settle();
  assert.equal(restores,2);
  now+=6*60*60*1000+1;listeners.visibilitychange();await settle();
  assert.equal(restores,3);assert.equal(verified,3);
});
test('verified Play entitlement updates the visible package and menu only after server confirmation',async()=>{
  const profile={plan:'monthly',expiresAt:'2026-10-29T00:00:00.000Z'};
  const billing={restorePurchases:async()=>({purchases:[{productId:'beruang_monthly_subscription',purchaseToken:'subscription-token'}]})};
  const run=async accepted=>{
    const {context,calls,listeners}=sandbox({PlayBilling:billing},true);
    context.currentUser={uid:'user-1',email:'user@example.com'};
    context.authenticatedHeaders=async()=>({Authorization:'Bearer test'});
    context.fetch=async()=>({ok:accepted,json:async()=>accepted?{entitlementApplied:true}:{error:'Pembayaran belum dapat diverifikasi.'}});
    context.refreshUserProfile=async()=>{calls.push(['profile']);return profile;};
    context.setupProGating=value=>calls.push(['gating',value]);
    context.updateUserMenu=(user,value)=>calls.push(['menu',user.uid,value]);
    listeners.visibilitychange();
    await new Promise(resolve=>setTimeout(resolve,10));
    return calls;
  };
  const success=await run(true);
  assert.deepEqual(success.filter(row=>['profile','gating','menu'].includes(row[0])).map(row=>row[0]),['profile','menu','gating']);
  assert.equal(success.find(row=>row[0]==='gating')[1],profile);
  assert.equal(success.find(row=>row[0]==='menu')[2],profile);
  const failure=await run(false);
  assert.equal(failure.some(row=>['profile','gating','menu'].includes(row[0])),false);
});
test('native backup is durably written before share, using safe filenames',async()=>{
  const operations=[];
  const {context}=sandbox({Filesystem:{writeFile:async o=>{operations.push(o);return{uri:'file:///backup.json'};}},Share:{share:async o=>operations.push(o)}});
  await context.saveNativeBackup({transactions:[{amount:42}]},'../../backup.json');
  assert.equal(operations.length,3);
  assert.equal(operations[0].directory,'DATA');
  assert.equal(operations[1].directory,'CACHE');
  assert.equal(operations[0].path.includes('../'),false);
  assert.equal(JSON.parse(operations[0].data).transactions[0].amount,42);
  assert.deepEqual(Array.from(operations[2].files),['file:///backup.json']);
});
test('backup failure stops share instead of pretending recovery succeeded',async()=>{
  let shared=false;
  const {context}=sandbox({Filesystem:{writeFile:async()=>{throw new Error('Disk full');}},Share:{share:async()=>{shared=true;}}});
  await assert.rejects(context.saveNativeBackup({},'backup.json'),/Disk full/);
  assert.equal(shared,false);
});
test('bundle contains local frontend only, with payment and admin surfaces excluded',async()=>{
  const base=new URL('../www/',import.meta.url);
  const html=await readFile(new URL('index.html',base),'utf8');
  assert.doesNotMatch(html, /<script[^>]+src="https?:/);
  assert.doesNotMatch(html, /id="payment-modal"|js\/admin\.js|signing\.keystore/);
  const manifest=JSON.parse(await readFile(new URL('bundle-manifest.json',base),'utf8'));
  const packagedPaths=new Set(manifest.files.map(file=>file.path));
  for (const page of ['privacy.html','terms.html','privacy-en.html','terms-en.html']) {
    const legal=await readFile(new URL(page,base),'utf8');
    const pageUrl=new URL(page,'https://localhost/');
    for (const [,,href] of legal.matchAll(/\shref\s*=\s*(["'])(.*?)\1/g)) {
      const target=new URL(href,pageUrl);
      if (target.origin===pageUrl.origin) {
        assert.ok(packagedPaths.has(decodeURIComponent(target.pathname.slice(1))),`${page}: ${href} must resolve to a packaged file`);
      }
    }
  }
  for (const file of manifest.files) {
    assert.doesNotMatch(file.path,/^bot\/|admin\.js|\.keystore$|\.jks$/);
    const content=await readFile(new URL(file.path,base));
    assert.equal(createHash('sha256').update(content).digest('hex'),file.sha256);
  }
  const sync=await readFile(new URL('js/sync.js',base),'utf8');
  assert.match(sync,/await window\.saveNativeBackup\(backup/);
  assert.doesNotMatch(sync,/link\.download/);
});
test('in-app review asks only after 10 real transactions, 3 days of use, and at most once per 120 days',async()=>{
  let asked=0;
  const store={};
  const {context}=sandbox({InAppReview:{requestReview:async()=>{asked++;}}});
  context.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v);}};
  // localStorage dipasang setelah runtime jalan → set waktu buka pertama secara manual
  const day=86400000;
  store['beruang-first-open-at']=String(Date.now()-4*day);
  context.state={transactions:Array.from({length:9},()=>({kategori:'Makan'}))};
  assert.equal(await context.maybeAskReview(),false);
  context.state.transactions.push({kategori:'Saldo Awal'});
  assert.equal(await context.maybeAskReview(),false,'saldo awal tidak dihitung');
  context.state.transactions.push({kategori:'Transport'});
  assert.equal(await context.maybeAskReview(),true);
  assert.equal(asked,1);
  assert.equal(await context.maybeAskReview(),false,'tidak diminta dua kali');
  store['beruang-review-asked-at']='0';store['beruang-first-open-at']=String(Date.now()-day);
  assert.equal(await context.maybeAskReview(),false,'belum 3 hari');
});
test('after a verified purchase the header, plan label and Pro gating are redrawn immediately',async()=>{
  const calls=[];
  const billing={purchase:async()=>({productId:'beruang_access_7d',purchaseToken:'t'}),restorePurchases:async()=>({purchases:[]})};
  const {context,listeners}=sandbox({PlayBilling:billing},true);
  context.currentUser={uid:'u'};context.currentProfile={plan:'free_trial'};
  context.authenticatedHeaders=async()=>({});
  context.refreshUserProfile=async()=>{context.currentProfile={plan:'trial',expiresAt:'2099-01-01'};};
  context.updateUserMenu=(u,p)=>calls.push(['menu',p.plan]);
  context.setupProGating=p=>calls.push(['gating',p.plan]);
  context.renderAll=()=>calls.push(['render']);
  context.crypto=globalThis.crypto;context.TextEncoder=TextEncoder;
  context.fetch=async()=>({ok:true,json:async()=>({entitlementApplied:true})});
  const button={dataset:{playProduct:'beruang_access_7d'},disabled:false};
  await listeners.click({target:{closest:sel=>sel==='[data-play-product]'?button:null}});
  assert.deepEqual(calls.filter(c=>c[0]!=='render'),[['menu','trial'],['gating','trial']]);
  assert.ok(calls.some(c=>c[0]==='render'));
});
