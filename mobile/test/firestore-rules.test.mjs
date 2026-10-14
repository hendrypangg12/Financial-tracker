import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFile } from 'node:fs/promises';
import { doc, getDoc, getDocFromServer, setDoc, updateDoc, runTransaction } from 'firebase/firestore';
import vm from 'node:vm';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  test('Firestore rules emulator is explicitly required', { skip: true }, () => {});
} else {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  const rules = await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8');
  const env = await initializeTestEnvironment({
    projectId: 'beruang-rules-test',
    firestore: { host, port: Number(port), rules },
  });
  await env.clearFirestore();
  after(() => env.cleanup());
  const profile = { email: 'u@example.com', displayName: 'U', photoURL: '', createdAt: '2026-01-01T00:00:00.000Z', plan: 'pending', expiresAt: '2026-01-01T00:00:00.000Z' };
  const data = { transactions: [], hutangs: [], assets: [], recurring: [], goals: [], userName: '', categories: {}, target: 0, startingBalance: null, _updatedAt: '2026-01-01T00:00:00.000Z', _updatedBy: 'device-a' };
  async function seedProfile(uid = 'u', email = 'u@example.com') {
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), `users/${uid}/meta/profile`), { ...profile, email });
    });
  }

  test('client cannot create a profile or grant entitlement; owner can edit identity only', async () => {
    const db = env.authenticatedContext('u', { email: 'u@example.com' }).firestore();
    await assertFails(setDoc(doc(db, 'users/u/meta/profile'), profile));
    await seedProfile();
    await assertSucceeds(getDoc(doc(db, 'users/u/meta/profile')));
    await assertSucceeds(updateDoc(doc(db, 'users/u/meta/profile'), { displayName: 'Updated' }));
    await assertFails(updateDoc(doc(db, 'users/u/meta/profile'), { plan: 'annual', expiresAt: '2099-01-01T00:00:00.000Z' }));
    const attacker = env.authenticatedContext('attacker', { email: 'u@example.com' }).firestore();
    await assertFails(getDoc(doc(attacker, 'users/u/meta/profile')));
  });

  test('owner data sync accepts the real schema but rejects unknown authority fields', async () => {
    const db = env.authenticatedContext('u', { email: 'u@example.com' }).firestore();
    await assertSucceeds(setDoc(doc(db, 'users/u/data/main'), data));
    await assertSucceeds(setDoc(doc(db, 'users/u/data/main'), { ...data, startingBalance: { amount: 1500000, date: '2026-09-28', completed: true, completedAt: '2026-09-28T01:00:00.000Z' } }));
    await assertFails(setDoc(doc(db, 'users/u/data/main'), { ...data, startingBalance: { amount: -1, date: '2026-09-28', completed: true } }));
    await assertFails(setDoc(doc(db, 'users/u/data/main'), { ...data, plan: 'annual' }));
    await assertFails(setDoc(doc(db, 'users/u/verifiedPaymentReceipts/fake'), { paid: true }));
  });

  test('custom-claim admin can update entitlement while email alone cannot', async () => {
    await seedProfile();
    const emailOnly = env.authenticatedContext('staff', { email: 'admin@example.com' }).firestore();
    await assertFails(updateDoc(doc(emailOnly, 'users/u/meta/profile'), { displayName: 'No' }));
    const admin = env.authenticatedContext('staff', { email: 'staff@example.com', admin: true }).firestore();
    await assertSucceeds(updateDoc(doc(admin, 'users/u/meta/profile'), { plan: 'annual', expiresAt: '2099-01-01T00:00:00.000Z' }));
  });

  test('shared BerBisnis document remains owner-accessible', async () => {
    const db = env.authenticatedContext('u', { email: 'u@example.com' }).firestore();
    await assertSucceeds(setDoc(doc(db, 'users/u/meta/berbisnis-profile'), { active: true }));
  });

  test('wallet fields are owner-only, additive to legacy IDR, and cannot carry entitlement', async () => {
    const db = env.authenticatedContext('wallet-owner').firestore();
    const ref = doc(db, 'users/wallet-owner/data/main');
    const walletFields = { preferences: { language:'en',currency:'IDR' }, wallets:[{id:'w_usd',name:'USD wallet',currency:'USD'}], walletData:{w_usd:{transactions:[]}} };
    await assertSucceeds(setDoc(ref,{...data,...walletFields}));
    // An older client's merge of legacy fields cannot erase the separate wallets.
    await assertSucceeds(setDoc(ref,{...data,transactions:[{id:'legacy-idr',jumlah:25000}]},{merge:true}));
    assert.equal((await getDoc(ref)).data().wallets[0].currency,'USD');
    await assertFails(setDoc(ref,{...data,...walletFields,preferences:{language:'en',currency:'USD'}}));
    await assertFails(setDoc(ref,{...data,...walletFields,walletData:[]}));
    await assertFails(setDoc(ref,{...data,...walletFields,preferences:{language:'en',currency:'IDR',plan:'pro'}}));
    const other=env.authenticatedContext('wallet-attacker').firestore();
    await assertFails(getDoc(doc(other,'users/wallet-owner/data/main')));
  });

  test('two actual Firestore clients merge independent offline wallet edits without losing cents', async () => {
    const source=await readFile(new URL('../../js/sync.js',import.meta.url),'utf8');
    const initial={...data,preferences:{language:'en',currency:'IDR'},wallets:[{id:'w_usd',name:'USD',currency:'USD',currencyLocked:true}],walletData:{w_usd:{transactions:[],hutangs:[],assets:[],recurring:[],goals:[],target:0,startingBalance:{amount:10,date:'2026-10-01',completed:true}}}};
    await env.withSecurityRulesDisabled(context=>setDoc(doc(context.firestore(),'users/wallet-sync/data/main'),initial));
    const makeClient=()=>{
      const db=env.authenticatedContext('wallet-sync').firestore();
      const ref=doc(db,'users/wallet-sync/data/main');
      const snap=value=>({exists:value.exists(),data:()=>value.data()});
      const wrapper={ref,get:async()=>snap(await getDocFromServer(ref))};
      const api={collection:()=>({doc:()=>({collection:()=>({doc:()=>wrapper})})}),runTransaction:fn=>runTransaction(db,tx=>fn({get:async r=>snap(await tx.get(r.ref)),set:(r,value,options)=>tx.set(r.ref,JSON.parse(JSON.stringify(value)),JSON.parse(JSON.stringify(options)))}))};
      const cache=new Map();
      const context=vm.createContext({state:{},currentUser:{uid:'wallet-sync'},fbDb:api,storageKey:()=> 'local-wallet',localStorage:{getItem:key=>cache.get(key)??null,setItem:(key,value)=>cache.set(key,value)},document:{getElementById:()=>null,addEventListener(){}},window:{addEventListener(){}},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},console});
      vm.runInContext(source,context);
      return {context,run:code=>vm.runInContext(code,context)};
    };
    const a=makeClient(),b=makeClient();
    assert.equal(await a.run('loadFromCloud()'),true);assert.equal(await b.run('loadFromCloud()'),true);
    a.context.state.walletData.w_usd.transactions.push({id:'device-a',jumlah:0.1});
    b.context.state.walletData.w_usd.transactions.push({id:'device-b',jumlah:0.2});
    assert.equal(await a.run('pushToCloudImmediate()'),true);assert.equal(await b.run('pushToCloudImmediate()'),true);
    const db=env.authenticatedContext('wallet-sync').firestore();
    const cloud=(await getDoc(doc(db,'users/wallet-sync/data/main'))).data();
    assert.deepEqual(cloud.walletData.w_usd.transactions.map(row=>row.jumlah),[0.1,0.2]);
    assert.equal(cloud.transactions.length,0);
  });

  test('deletion tombstone blocks stale owner clients', async () => {
    await seedProfile();
    await env.withSecurityRulesDisabled(async context => setDoc(doc(context.firestore(), 'accountDeletions/u'), { status: 'pending' }));
    const db = env.authenticatedContext('u', { email: 'u@example.com' }).firestore();
    await assertFails(getDoc(doc(db, 'users/u/data/main')));
    await assertFails(updateDoc(doc(db, 'users/u/meta/profile'), { displayName: 'Late write' }));
  });
}
