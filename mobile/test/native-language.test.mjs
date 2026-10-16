import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const runtime = await readFile(new URL('../src/runtime.js', import.meta.url), 'utf8');
const translations = await readFile(new URL('../../js/i18n.js', import.meta.url), 'utf8');
function fixture(profile, initialLanguage = 'en') {
  let language = initialLanguage, purchases = 0;
  const screens = [], preferences = [];
  const node = tag => ({ tag, children: [], dataset: {}, hidden: false,
    setAttribute(name, value) { this[name] = value; }, querySelector() { return this; },
    append(...items) { this.children.push(...items); }, prepend(...items) { this.children.unshift(...items); },
    replaceChildren() { this.children = []; },
  });
  const elements = Object.fromEntries(['paywall-screen', 'play-plan-status', 'play-products', 'play-manage'].map(id => [id, node('div')]));
  const document = { documentElement: { lang: language }, body: null, addEventListener() {}, querySelectorAll: () => [],
    getElementById: id => elements[id] || null, createElement: node };
  const context = { document, getAppLanguage: () => language,
    setAccountPreferences(patch) { preferences.push(patch); language = patch.language; },
    currentUser: null, currentProfile: profile, isPro: p => !!p && Date.parse(p.expiresAt) > Date.now(),
    __BERUANG_STORE_BUILD__: true, URL, location: { href: 'https://localhost/' },
    addEventListener() {}, fetch: async () => { throw new Error('No provider call expected'); }, showScreen: screen => screens.push(screen),
    Capacitor: { registerPlugin: name => name === 'PlayBilling' ? {
      getProducts: async () => ({ products: [{ productId: 'beruang_monthly_subscription', productType: 'SUBS', price: '$3.00', freeTrialDays: 3 },
        { productId: 'beruang_annual_subscription', productType: 'SUBS', price: '$19.00' }] }),
      purchase: async () => { purchases++; }, restorePurchases: async () => ({ purchases: [] }),
    } : null },
  };
  context.window = context;
  vm.runInNewContext(translations, context);
  vm.runInNewContext(runtime, context);
  const settle = () => new Promise(resolve => setImmediate(resolve));
  return { context, elements, screens, preferences, purchases: () => purchases, settle,
    async open() { context.showScreen('paywall'); await settle(); },
    control: id => elements['paywall-screen'].children.find(item => item.id === id),
  };
}

test('English native payment UI keeps authored copy, product labels and prices in English', async () => {
  const h = fixture({ plan: 'free_trial', expiresAt: '2020-01-01' }); await h.open();
  assert.match(h.elements['paywall-screen'].innerHTML, /Plans & payments/);
  assert.match(h.elements['paywall-screen'].innerHTML, /Restore purchases/);
  assert.doesNotMatch(h.elements['paywall-screen'].innerHTML, /Paket|Pulihkan|Keluar akun|ditagih/);
  assert.match(h.elements['play-plan-status'].textContent, /Your access has ended/);
  const buttons = h.elements['play-products'].children;
  assert.equal(buttons[0].children[0].textContent, 'Monthly Pro · auto-renewing');
  assert.equal(buttons[0].children[1].textContent, 'Free for 3 days, then $3.00 / month');
  assert.equal(buttons[1].children[0].textContent, 'Yearly Pro · auto-renewing');
  assert.equal(buttons[1].children[1].textContent, '$19.00 / year');
  assert.equal(h.control('play-language').value, 'en');
  assert.equal(h.control('play-back'), undefined, 'expired access cannot bypass the lock');
  assert.equal(h.purchases(), 0);
});

test('active two-day app trial can return to the app without starting a Play checkout', async () => {
  const trial = Object.freeze({ plan: 'free_trial', expiresAt: new Date(Date.now() + 2 * 86400000).toISOString() });
  const h = fixture(trial); await h.open();
  assert.match(h.elements['play-plan-status'].textContent, /without payment.*2-day trial/);
  assert.equal(h.context.currentProfile, trial);
  const back = h.control('play-back'); assert.equal(back.textContent, 'Back to app'); back.onclick();
  assert.deepEqual(h.screens, ['app']);
  assert.equal(h.purchases(), 0);
});

test('locked users can change payment-screen language without signing out or changing access', async () => {
  const profile = Object.freeze({ plan: 'monthly', expiresAt: '2020-01-01' });
  const h = fixture(profile); await h.open();
  const picker = h.control('play-language'); picker.value = 'id'; picker.onchange(); await h.settle();
  assert.equal(h.preferences[0].language, 'id');
  assert.match(h.elements['play-plan-status'].textContent, /Masa aktif akun sudah habis/);
  assert.equal(h.elements['play-products'].children[0].children[0].textContent, 'Pro 30 Hari · berulang otomatis');
  assert.equal(h.context.currentProfile, profile);
  assert.equal(h.control('play-back'), undefined);
  assert.equal(h.purchases(), 0);
});

test('missing account status prevents purchases and offers a reload message in English', async () => {
  const h = fixture(null); await h.open();
  assert.match(h.elements['play-plan-status'].textContent, /Reload before choosing a payment/);
  assert.equal(h.elements['play-products'].children.filter(item => item.tag === 'button').every(button => button.disabled), true);
  assert.equal(h.purchases(), 0);
});
