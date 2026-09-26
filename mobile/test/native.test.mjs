import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const source=await readFile(new URL('../src/runtime.js',import.meta.url),'utf8');
function sandbox(plugins={}) {
  const calls=[];
  const context={ URL, location:{href:'https://localhost/'}, document:{body:{classList:{add:name=>calls.push(['class',name])}},addEventListener(){}}, showToast:(...args)=>calls.push(['toast',...args]), showScreen:name=>calls.push(['screen',name]), fetch:async()=>{calls.push(['fetch']);return 'ok';}, syncData:value=>value, state:{transactions:[]}, Capacitor:{ isNativePlatform:()=>true, registerPlugin:name=>plugins[name] } };
  context.window=context;
  vm.runInNewContext(source,context);
  return {context,calls};
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
test('Play paywall separates the one-time 7-day pass from recurring subscriptions',()=>{
  assert.match(source,/beruang_access_7d/);
  assert.match(source,/beruang_monthly_subscription/);
  assert.match(source,/beruang_annual_subscription/);
  assert.match(source,/ditagih otomatis setiap periode sampai dibatalkan/);
  assert.match(source,/Paket 7 hari hanya dibayar sekali/);
  assert.match(source,/restorePurchases\(\)/);
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
  for (const file of manifest.files) {
    assert.doesNotMatch(file.path,/^bot\/|admin\.js|\.keystore$|\.jks$/);
    const content=await readFile(new URL(file.path,base));
    assert.equal(createHash('sha256').update(content).digest('hex'),file.sha256);
  }
  const sync=await readFile(new URL('js/sync.js',base),'utf8');
  assert.match(sync,/await window\.saveNativeBackup\(backup/);
  assert.doesNotMatch(sync,/link\.download/);
});
