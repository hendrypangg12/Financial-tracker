import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const sources = await Promise.all(['preferences', 'data', 'utils', 'storage', 'sync', 'i18n'].map(name =>
  readFile(new URL(`../../js/${name}.js`, import.meta.url), 'utf8')));
function app(deviceLanguage = 'en-US') {
  const cache = new Map();
  const context = vm.createContext({ console, navigator: { language: deviceLanguage }, currentUser: null, Intl, Date, addEventListener() {},
    document: { body: null, documentElement: {}, addEventListener() {}, querySelectorAll: () => [], getElementById: () => null },
    localStorage: { getItem: key => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value) },
  }); context.window = context;
  sources.forEach(source => vm.runInContext(source, context));
  // Keep actual account-scoped storage; background network is outside this test.
  context.pushToCloud = () => {};
  return { context, cache, run: source => vm.runInContext(source, context) };
}

test('English displayed at deliberate login overrides old Indonesian account preference without changing wallet records', () => {
  const h = app();
  h.run("rememberLoginLanguage(); currentUser={uid:'a'}; beginLoginLanguageSession('a'); selectUserStorage('a');");
  h.run("applyCloud({preferences:{language:'id',currency:'IDR',mainWalletName:'BCA'},transactions:[{id:'tx-1',deskripsi:'bakso',jumlah:25000}],startingBalance:{amount:50000,date:'2026-10-01',completed:true}})");
  assert.equal(h.run('getAppLanguage()'), 'en', 'cloud loading does not flash the old language');
  const records = h.run('JSON.stringify({transactions:state.transactions,startingBalance:state.startingBalance})');
  h.run("applyLoginLanguagePreference('a')");
  assert.equal(h.run('state.preferences.language'), 'en');
  assert.equal(h.run('state.preferences.mainWalletName'), 'BCA');
  assert.equal(h.run('JSON.stringify({transactions:state.transactions,startingBalance:state.startingBalance})'), records);
  assert.equal(JSON.parse(h.cache.get(h.run('storageKey()'))).preferences.language, 'en');
  assert.equal(h.run('syncData(state).preferences.language'), 'en', 'normal account sync carries the selected language');
  h.run("state.preferences.language='id'; applyLoginLanguagePreference('a')");
  assert.equal(h.run('getAppLanguage()'), 'id', 'login choice is consumed once, so later synced or settings choices still work');
});

test('a restored session without a new login choice honors its cloud language on another device', () => {
  const h = app('en-US');
  h.run("currentUser={uid:'returning'}; beginLoginLanguageSession('returning'); selectUserStorage('returning'); applyCloud({preferences:{language:'id',currency:'IDR'}}); applyLoginLanguagePreference('returning')");
  assert.equal(h.run('getAppLanguage()'), 'id');
});

test('login language is bound to the intended account and cannot modify another account', () => {
  const h = app();
  h.run("rememberLoginLanguage('en'); currentUser={uid:'a'}; beginLoginLanguageSession('a'); selectUserStorage('a');");
  h.run("currentUser={uid:'b'}; beginLoginLanguageSession('b'); selectUserStorage('b'); state.preferences.language='id'; applyLoginLanguagePreference('a'); applyLoginLanguagePreference('b')");
  assert.equal(h.run('getAppLanguage()'), 'id');
  assert.equal(h.cache.has(h.run('storageKey()')), false);
});

test('an explicit Indonesian choice remains effective even if browser storage is blocked', () => {
  const h = app('en-US');
  h.context.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  h.run("setDeviceLanguage('id'); rememberLoginLanguage(); currentUser={uid:'a'}; beginLoginLanguageSession('a');");
  assert.equal(h.run('getAppLanguage()'), 'id');
});
