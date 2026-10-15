import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const names=['preferences','data','utils','storage','wallets','parser','dashboard','ai-advisor','sync'];
const sources=await Promise.all(names.map(name=>readFile(new URL('../../js/'+name+'.js',import.meta.url),'utf8')));
function app() {
  const cache=new Map();
  const context=vm.createContext({ Intl, Date, console, navigator:{language:'en-US'}, currentUser:{uid:'wallet-test'}, currentProfile:null, fbDb:null,
    localStorage:{getItem:key=>cache.get(key)??null,setItem:(key,value)=>cache.set(key,value),removeItem:key=>cache.delete(key)},
    document:{addEventListener(){},getElementById:()=>null},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){} });
  context.window=context; context.addEventListener=()=>{};
  vm.runInContext(sources.join('\n'),context);
  vm.runInContext("state.preferences={language:'en',currency:'IDR'}; state.selectedMonth=9;state.selectedYear=2026;",context);
  return {run:code=>vm.runInContext(code,context),cache,context};
}
const tx=(id,amount,kind='pengeluaran')=>({id,jumlah:amount,jenis:kind,tanggal:'2026-10-14',deskripsi:id,kategori:'Konsumsi Makan',subKategori:'Minuman/jajan'});
test('new currency wallets preserve the original IDR ledger and scope every monetary summary',()=>{
  const h=app();h.context.old=tx('old-rupiah',25000);
  h.run("state.transactions=[old];state.startingBalance={amount:100000,date:'2026-10-01',completed:true};");
  const id=h.run("createWallet({name:'Travel',currency:'USD',amount:10,date:'2026-10-01'}).id");
  h.context.newTx=tx('usd-coffee',1.25);h.run('addTransaction(newTx)');
  assert.equal(h.run('getAccountCurrency()'),'USD');
  assert.equal(h.run('getTransactionsFor(9,2026).length'),1);
  assert.equal(h.run('walletBalance(getActiveWalletId())'),8.75);
  assert.equal(h.run('balanceThrough(9,2026)'),8.75);
  assert.equal(h.run('state.transactions[0].jumlah'),25000);
  assert.equal(h.run('state.walletData['+JSON.stringify(id)+'].transactions[0].jumlah'),1.25);
  h.run("selectWallet('legacy')");assert.equal(h.run('getAccountCurrency()'),'IDR');assert.equal(h.run('balanceThrough(9,2026)'),75000);
});
test('minor-unit arithmetic avoids floating-point balance drift and excludes opening funds from income',()=>{
  const h=app();h.run("createWallet({name:'Daily',currency:'USD',amount:3.1,date:'2026-10-01'})");
  h.context.income=tx('tiny-income',0.2,'pemasukan');h.context.expense=tx('tiny-expense',0.3);
  h.run('addTransaction(income);addTransaction(expense)');
  assert.equal(h.run('walletBalance(getActiveWalletId())'),3);
  assert.equal(h.run("sumBy(getCashflowTransactionsFor(9,2026),'pemasukan')"),0.2);
  assert.equal(h.run("parseChat('coffee USD 0.25').jumlah"),0.25);
  assert.match(h.run("parseChat('kopi Rp25000').error"),/currency/i);
});
test('currency cannot be relabelled after financial history, including deleted history',()=>{
  const h=app();h.run("createWallet({name:'Dollar',currency:'USD',amount:0})");
  h.context.row=tx('spend',1.25);h.run('addTransaction(row);deleteTransaction(row.id)');
  assert.equal(h.run("updateWallet(getActiveWalletId(),{name:'Travel',currency:'EUR'}).ok"),false);
  assert.equal(h.run('getAccountCurrency()'),'USD');
  assert.equal(h.run("updateWallet(getActiveWalletId(),{name:'Travel',currency:'USD'}).ok"),true);
});
test('zero-history wallets can choose a new currency; invalid currencies, precision and dates are rejected',()=>{
  const h=app();h.run("createWallet({name:'Empty',currency:'USD',amount:0})");
  assert.equal(h.run("updateWallet(getActiveWalletId(),{name:'Empty',currency:'JPY'}).ok"),true);
  assert.equal(h.run("createWallet({name:'Bad',currency:'USD',amount:1.234}).ok"),false);
  assert.equal(h.run("createWallet({name:'Bad',currency:'XYZ',amount:0}).ok"),false);
  assert.equal(h.run("createWallet({name:'Bad',currency:'USD',date:'2026-02-30'}).ok"),false);
  assert.equal(h.run("createWallet({name:'Kuwait',currency:'KWD',amount:1.234}).ok"),true);
  assert.equal(h.run("parseMoneyNumber('1.234','','KWD')"),1.234);
});
test('account switches clear foreign ledgers and restore only that UID cache',()=>{
  const h=app();h.run("selectUserStorage('alice');createWallet({name:'Alice USD',currency:'USD',amount:20})");
  h.run("selectUserStorage('bob');loadState()");assert.equal(h.run('getWallets().length'),1);assert.equal(h.run('getAccountCurrency()'),'IDR');
  h.run("selectUserStorage('alice');loadState()");assert.equal(h.run('getWallets().length'),2);assert.equal(h.run('getAccountCurrency()'),'USD');
  assert.equal(h.run('walletBalance(getActiveWalletId())'),20);
});
test('AI receives only the selected wallet records and explicit currency',()=>{
  const h=app();h.context.old=tx('LEGACY_PRIVATE_IDR',5000000,'pemasukan');h.run('state.transactions=[old]');
  h.run("createWallet({name:'Travel',currency:'EUR',amount:0,date:'2026-10-01'})");
  h.context.row=tx('EUR_ONLY',12.5);h.run('addTransaction(row)');
  const context=h.run('buildAdvisorContext()');
  assert.equal(context.currency,'EUR');assert.equal(context.wallet.name,'Travel');
  assert.match(JSON.stringify(context),/EUR_ONLY/);assert.doesNotMatch(JSON.stringify(context),/LEGACY_PRIVATE_IDR|5000000/);
});
test('independent offline edits in the same wallet converge while competing edits require recovery',()=>{
  const h=app();h.run("createWallet({name:'USD',currency:'USD',amount:0})");
  h.context.base=h.run('JSON.parse(JSON.stringify(syncData(state)))');
  h.run('local=JSON.parse(JSON.stringify(base));remote=JSON.parse(JSON.stringify(base));');
  const id=h.run('getActiveWalletId()');h.context.id=id;h.context.a=tx('local',0.1);h.context.b=tx('remote',0.2);
  h.run('local.walletData[id].transactions.push(a);remote.walletData[id].transactions.push(b)');
  const merged=h.run('mergeSyncData(base,local,remote)');assert.equal(merged.conflicts.length,0);assert.equal(merged.data.walletData[id].transactions.length,2);
  h.context.base=merged.data;h.run('local=JSON.parse(JSON.stringify(base));remote=JSON.parse(JSON.stringify(base));local.walletData[id].transactions[0].jumlah=0.3;remote.walletData[id].transactions[0].jumlah=0.4;');
  assert.equal(h.run('mergeSyncData(base,local,remote).conflicts.length'),1);
});
test('invalid wallet backup fails before replacing existing account data',async()=>{
  const h=app();h.context.FileReader=class {readAsText(file){this.result=file;this.onload();}};
  h.run("state.transactions=[{id:'keep',jumlah:5000}]");
  h.context.bad=JSON.stringify({transactions:[],wallets:[{id:'w_bad',name:'Bad',currency:'USD'}],walletData:{w_bad:{transactions:[]}}});
  await assert.rejects(h.run('importData(bad)'),/Invalid wallet ledger/);
  assert.equal(h.run('state.transactions[0].id'),'keep');
});
test('legacy category renames update foreign wallet history without translating custom names',()=>{
  const h=app();h.run("createCustomCategory('pengeluaran','My coffee');createWallet({name:'USD',currency:'USD',amount:0})");
  h.context.row={...tx('coffee',2.5),kategori:'My coffee'};h.run('addTransaction(row)');
  assert.equal(h.run("renameCustomCategory('pengeluaran','My coffee','My café').ok"),true);
  assert.equal(h.run('getFinancialState().transactions[0].kategori'),'My café');
});
test('chat entry naming a wallet records into that wallet and strips the wallet phrase',()=>{
  const h=app();h.run("state.preferences={language:'id',currency:'IDR'}");
  const gopay=h.run("createWallet({name:'GoPay',currency:'IDR',amount:100000,date:'2026-10-01'}).id");
  h.run("selectWallet('legacy')");
  let out=h.run("parseChatForWallet('bakso 25rb dari dompet utama')");
  assert.equal(out.wallet.id,'legacy');assert.equal(out.parsed.jumlah,25000);assert.equal(out.parsed.deskripsi,'bakso');
  out=h.run("parseChatForWallet('bensin 50rb pakai gopay')");
  assert.equal(out.wallet.id,gopay);assert.equal(out.parsed.deskripsi,'bensin');
  h.context.p=out.parsed;h.run('addTransaction(p,'+JSON.stringify(gopay)+')');
  assert.equal(h.run('walletBalance('+JSON.stringify(gopay)+')'),50000);
  assert.equal(h.run('getActiveWalletId()'),'legacy');
  out=h.run("parseChatForWallet('bakso 25rb')");assert.equal(out.wallet.id,'legacy');assert.equal(out.parsed.deskripsi,'bakso');
  h.run("createWallet({name:'Makan',currency:'IDR',amount:0})");h.run("selectWallet('legacy')");
  out=h.run("parseChatForWallet('makan siang 25rb')");assert.equal(out.wallet.id,'legacy');
  assert.match(h.run("parseChatForWallet('kopi 20rb dari gopay ke dompet utama').error"),/satu dompet/);
  const usd=h.run("createWallet({name:'Travel',currency:'USD',amount:10,date:'2026-10-01'}).id");h.run("selectWallet('legacy')");
  out=h.run("parseChatForWallet('coffee 2.50 via travel')");assert.equal(out.wallet.id,usd);assert.equal(out.parsed.jumlah,2.5);
  assert.equal(h.run('getAccountCurrency()'),'IDR');
});
test('money inputs re-group while typing past four digits',()=>{
  const h=app();h.run("state.preferences={language:'id',currency:'IDR'}");
  let v='';for(const ch of '1500000'){v=h.run('formatMoneyInput('+JSON.stringify(v+ch)+')');}
  assert.equal(v,'1.500.000');assert.equal(h.run('parseMoneyInput('+JSON.stringify(v)+')'),1500000);
  assert.equal(h.run('formatMoneyInput(25000)'),'25.000');
  assert.equal(h.run("formatMoneyInput('')"),'');
  assert.match(h.run('formatShort(1500000)'),/1,5/);
});
test('manual transfer moves balance between wallets without counting as income or expense',()=>{
  const h=app();h.run("state.preferences={language:'id',currency:'IDR'};state.startingBalance={amount:1000000,date:'2026-10-01',completed:true}");
  const gopay=h.run("createWallet({name:'GoPay',currency:'IDR',amount:0,date:'2026-10-01'}).id");
  const usd=h.run("createWallet({name:'Travel',currency:'USD',amount:0,date:'2026-10-01'}).id");
  h.run("selectWallet('legacy')");
  let r=h.run(`createTransfer({fromId:'legacy',toId:${JSON.stringify(gopay)},amountOut:250000,date:'2026-10-14'})`);
  assert.equal(r.ok,true);
  assert.equal(h.run("walletBalance('legacy')"),750000);
  assert.equal(h.run('walletBalance('+JSON.stringify(gopay)+')'),250000);
  assert.equal(h.run("getCashflowTransactionsFor(9,2026).length"),0);
  r=h.run(`createTransfer({fromId:'legacy',toId:${JSON.stringify(usd)},amountOut:160000,amountIn:10,date:'2026-10-14'})`);
  assert.equal(r.ok,true);assert.equal(h.run('walletBalance('+JSON.stringify(usd)+')'),10);
  assert.equal(h.run(`createTransfer({fromId:'legacy',toId:${JSON.stringify(usd)},amountOut:1000,amountIn:1.234})`).ok,false);
  assert.equal(h.run("createTransfer({fromId:'legacy',toId:'legacy',amountOut:1000}).ok"),false);
  const id=h.run("state.transactions.find(t=>t.transferPeer==="+JSON.stringify(gopay)+").id");
  h.run('deleteTransaction('+JSON.stringify(id)+')');
  assert.equal(h.run('walletBalance('+JSON.stringify(gopay)+')'),0);
  assert.equal(h.run("walletBalance('legacy')"),840000);
  h.run('validateWalletState(state)');
});
