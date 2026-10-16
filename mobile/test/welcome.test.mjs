import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const [html, i18nSource, authSource, ruvySource, appSource, css] = await Promise.all(
  ['app.html', 'js/i18n.js', 'js/auth.js', 'js/ruvy.js', 'js/app.js', 'ruvy.css']
    .map(file => readFile(new URL('../../' + file, import.meta.url), 'utf8')),
);

// Parse the real markup so removed controls, changed selectors, or translating a
// container that owns form inputs fail the same navigation checks as the browser.
function documentFixture() {
  const listeners = new Map();
  const decode = value => value.replace(/&(amp|quot|apos|lt|gt|#39);/g, (_, name) => ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', '#39': "'" })[name]);
  let root, document;
  const descendants = node => node.childNodes.flatMap(child => child.nodeType === 1 ? [child, ...descendants(child)] : []);
  const matches = (node, selector) => {
    const tag = selector.match(/^[\w-]+/)?.[0];
    if (tag && tag !== node.tagName) return false;
    const id = selector.match(/#([\w-]+)/)?.[1];
    if (id && node.attributes.id !== id) return false;
    if ([...selector.matchAll(/\.([\w-]+)/g)].some(([, name]) => !node.classList.contains(name))) return false;
    return [...selector.matchAll(/\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]/g)].every(([, key, a, b, c]) =>
      node.hasAttribute(key) && (a === undefined && b === undefined && c === undefined || node.getAttribute(key) === (a ?? b ?? c)));
  };
  const queryAll = (node, selector) => descendants(node).filter(candidate => selector.split(',').some(part => {
    const parts = part.trim().split(/\s+/);
    if (!matches(candidate, parts.pop())) return false;
    let parent = candidate.parentElement;
    while (parts.length) {
      const wanted = parts.pop();
      while (parent && !matches(parent, wanted)) parent = parent.parentElement;
      if (!parent) return false;
      parent = parent.parentElement;
    }
    return true;
  }));
  function element(tagName, attributes = {}) {
    const events = new Map();
    const node = {
      nodeType: 1, tagName, attributes, dataset: {}, childNodes: [], parentElement: null,
      style: {}, value: attributes.value || '', checked: 'checked' in attributes, disabled: false, scrollTop: 0,
      hasAttribute: name => Object.hasOwn(attributes, name), getAttribute: name => attributes[name] ?? null,
      setAttribute: (name, value) => { attributes[name] = String(value); },
      removeAttribute: name => { delete attributes[name]; },
      querySelectorAll: selector => queryAll(node, selector), querySelector: selector => queryAll(node, selector)[0] || null,
      closest(selector) { for (let current = node; current; current = current.parentElement) if (selector.split(',').some(part => matches(current, part.trim()))) return current; return null; },
      click() { return node.onclick?.({ target: node, preventDefault() {}, stopPropagation() {} }); },
      focus(options) { document.activeElement = node; node.focusOptions = options; },
      addEventListener(name, callback) { if (!events.has(name)) events.set(name, []); events.get(name).push(callback); },
      dispatch(name, properties = {}) { for (const callback of events.get(name) || []) callback({ target: node, ...properties }); },
    };
    for (const [key, value] of Object.entries(attributes)) if (key.startsWith('data-')) node.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    const classes = () => new Set((attributes.class || '').split(/\s+/).filter(Boolean));
    const changeClasses = callback => { const values = classes(); callback(values); attributes.class = [...values].join(' '); };
    node.classList = {
      contains: value => classes().has(value), add: value => changeClasses(values => values.add(value)),
      remove: value => changeClasses(values => values.delete(value)),
      toggle(value, force) { const chosen = force ?? !classes().has(value); changeClasses(values => chosen ? values.add(value) : values.delete(value)); return chosen; },
    };
    Object.defineProperties(node, {
      hidden: { get: () => 'hidden' in attributes, set: value => { if (value) attributes.hidden = ''; else delete attributes.hidden; } },
      isConnected: { get() { let current = node; while (current.parentElement) current = current.parentElement; return current === root; } },
      textContent: {
        get: () => node.childNodes.map(child => child.textContent).join(''),
        set(value) { for (const child of node.childNodes) child.parentElement = null; node.childNodes = [text(String(value), node)]; },
      },
    });
    return node;
  }
  const text = (textContent, parentElement) => ({ nodeType: 3, textContent, parentElement, get isConnected() { return !!this.parentElement?.isConnected; } });
  root = element('#document');
  const stack = [root];
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  for (const token of html.matchAll(/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>|[^<]+/gi)) {
    const value = token[0];
    if (value.startsWith('<!')) continue;
    if (!value.startsWith('<')) { stack.at(-1).childNodes.push(text(decode(value), stack.at(-1))); continue; }
    const tag = value.match(/^<\/?([\w-]+)/)[1].toLowerCase();
    if (value.startsWith('</')) { const index = stack.findLastIndex(node => node.tagName === tag); if (index > 0) stack.length = index; continue; }
    const attributes = Object.fromEntries([...value.replace(/^<[\w-]+/, '').replace(/\/?\s*>$/, '').matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(([, key, a, b, c]) => [key, decode(a ?? b ?? c ?? '')]));
    const node = element(tag, attributes); node.parentElement = stack.at(-1); node.parentElement.childNodes.push(node);
    if (!voidTags.has(tag) && !value.endsWith('/>')) stack.push(node);
  }
  document = {
    hidden: false, visibilityState: 'visible', activeElement: null,
    documentElement: descendants(root).find(node => node.tagName === 'html'), body: descendants(root).find(node => node.tagName === 'body'),
    getElementById: id => descendants(root).find(node => node.attributes.id === id) || null,
    querySelectorAll: selector => queryAll(root, selector), querySelector: selector => queryAll(root, selector)[0] || null,
    addEventListener(name, callback) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(callback); },
    dispatch(name) { for (const callback of listeners.get(name) || []) callback({}); },
    createTreeWalker() {
      const texts = node => node.childNodes.flatMap(child => child.nodeType === 3 ? [child] : texts(child));
      const nodes = texts(root); let index = -1;
      return { currentNode: null, nextNode() { this.currentNode = nodes[++index]; return !!this.currentNode; } };
    },
  };
  return document;
}

function app({ cache = new Map(), storageUnavailable = false, language = 'id', reducedMotion = false } = {}) {
  const document = documentFixture(), timers = new Map(), warnings = [];
  let sequence = 0, authListener, reloads = 0, osReducedMotion = reducedMotion;
  const profile = { plan: 'monthly', expiresAt: '2099-01-01T00:00:00.000Z' };
  const context = vm.createContext({
    document, NodeFilter: { SHOW_TEXT: 4 }, console: { ...console, warn: (...args) => warnings.push(args) }, Intl, Date,
    currentUser: null, currentProfile: null, currentClaims: {}, authGeneration: 0, authReady: false, fbDb: null,
    navigator: { userAgent: 'Welcome tests', language: 'id-ID' },
    localStorage: {
      getItem(key) { if (storageUnavailable) throw new Error('Storage blocked'); return cache.get(key) ?? null; },
      setItem(key, value) { if (storageUnavailable) throw new Error('Storage blocked'); cache.set(key, String(value)); },
      removeItem(key) { if (storageUnavailable) throw new Error('Storage blocked'); cache.delete(key); },
    },
    getAppLanguage: () => cache.get('beruang_ui_language') || language,
    preferenceMessage: (id, en) => (cache.get('beruang_ui_language') || language) === 'en' ? en : id,
    matchMedia: query => ({ matches: query === '(prefers-reduced-motion: reduce)' && osReducedMotion }),
    setTimeout(callback) { const id = ++sequence; timers.set(id, callback); return id; }, clearTimeout: id => timers.delete(id),
    setInterval: () => 1, clearInterval() {}, addEventListener() {},
    location: { href: 'https://localhost/app.html', search: '', reload: () => { reloads++; } },
    fetch() { throw new Error('Welcome tests must not send network requests'); },
    FormData: class { constructor(form) { this.form = form; } get(name) { return this.form.querySelector('[name="' + name + '"]')?.value ?? null; } },
    fbAuth: { onAuthStateChanged(callback) { authListener = callback; return () => {}; }, signOut: async () => {} },
  });
  context.window = context;
  vm.runInContext(i18nSource, context);
  // Keep the real auth functions and listener; VM globals stand in for its six
  // module-level state variables so tests can observe session transitions.
  vm.runInContext(authSource.slice(authSource.indexOf('// Listener utama')), context);
  vm.runInContext(ruvySource.replace(/\binitRuvy\(\);\s*$/, ''), context);
  context.renderRuvy = () => {}; // Account dashboard rendering is outside this screen test.
  context.initRuvy();
  vm.runInContext(appSource, context);
  Object.assign(context, {
    ensureUserProfile: async () => profile, loadFromCloud: async () => true,
    selectUserStorage() {}, loadState() {}, init() {}, setupWelcomeBanner() {},
    startCloudListener() {}, stopCloudListener() {}, startAutoSync() {}, stopAutoSync() {},
    watchAccessExpiry() {}, updateUserMenu() {}, setupProGating() {}, handlePostPaymentRedirect: async () => {},
  });
  document.dispatch('DOMContentLoaded');
  return {
    context, document, cache, timers, warnings, el: id => document.getElementById(id), reloads: () => reloads,
    auth: user => authListener(user), user: () => ({ uid: 'returning-user', email: 'user@example.test', getIdTokenResult: async () => ({ claims: {} }) }),
    setReducedMotion: value => { osReducedMotion = value; },
    setVisible(value) { document.hidden = !value; document.visibilityState = value ? 'visible' : 'hidden'; document.dispatch('visibilitychange'); },
    finishTimers() { const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback()); },
  };
}

test('first unauthenticated visit shows welcome; Get started opens the existing registration form', async () => {
  const h = app();
  assert.equal(h.el('login-screen').hidden, true, 'initialization waits for the auth result');
  await h.auth(null);
  assert.equal(h.el('login-screen').hidden, false);
  assert.equal(h.el('ruvy-welcome-panel').hidden, false);
  assert.equal(h.el('ruvy-auth-panel').hidden, true);
  assert.equal(h.context.currentUser, null);
  for (const id of ['ruvy-get-started', 'ruvy-welcome-sign-in', 'ruvy-auth-back', 'ruvy-welcome-robot']) assert.equal(h.el(id).getAttribute('type'), 'button');
  h.el('ruvy-get-started').click();
  assert.equal(h.el('ruvy-welcome-panel').hidden, true);
  assert.equal(h.el('ruvy-auth-panel').hidden, false);
  assert.equal(h.el('form-register').hidden, false);
  assert.equal(h.el('form-login').hidden, true);
  assert.equal(h.document.activeElement.dataset.authTab, 'register', 'opening the form does not focus a keyboard input');
  assert.equal(h.context.hasSeenRuvyWelcome(), true);
});

test('returning-user link opens login, and back preserves entered registration fields', async () => {
  const h = app(); await h.auth(null);
  h.el('ruvy-welcome-sign-in').click();
  assert.equal(h.el('form-login').hidden, false);
  assert.equal(h.el('ruvy-auth-panel').hidden, false);
  h.el('ruvy-auth-back').click();
  assert.equal(h.el('ruvy-welcome-panel').hidden, false);
  assert.equal(h.document.activeElement, h.el('ruvy-get-started'));
  h.el('ruvy-get-started').click();
  const email = h.el('form-register').querySelector('[name="email"]'); email.value = 'draft@example.test';
  h.el('ruvy-auth-back').click(); h.el('ruvy-get-started').click();
  assert.equal(h.el('form-register').querySelector('[name="email"]'), email);
  assert.equal(email.value, 'draft@example.test');
});

test('device welcome choice survives reload and logout without modifying account state', async () => {
  const h = app(); await h.auth(null); h.el('ruvy-get-started').click();
  const reload = app({ cache: h.cache }); await reload.auth(null);
  assert.equal(reload.el('ruvy-welcome-panel').hidden, true);
  assert.equal(reload.el('form-login').hidden, false);
  await h.auth(h.user());
  assert.equal(h.el('login-screen').hidden, true);
  await h.context.logout();
  assert.equal(h.reloads(), 1);
  assert.equal(h.context.currentUser, null);
  const afterLogout = app({ cache: h.cache }); await afterLogout.auth(null);
  assert.equal(afterLogout.el('ruvy-auth-panel').hidden, false);
  assert.equal(afterLogout.el('form-login').hidden, false);
});

test('blocked localStorage uses memory for later login entries in the same page', async () => {
  const h = app({ storageUnavailable: true }); await h.auth(null);
  assert.equal(h.el('ruvy-welcome-panel').hidden, false);
  h.el('ruvy-get-started').click();
  assert.equal(h.context.hasSeenRuvyWelcome(), true);
  h.context.showScreen('loading'); h.context.showScreen('login');
  assert.equal(h.el('ruvy-welcome-panel').hidden, true);
  assert.equal(h.el('ruvy-auth-panel').hidden, false);
  assert.equal(h.el('form-login').hidden, false);
  assert.equal(h.cache.size, 0);
});

test('recognized sessions bypass welcome and an account-load failure exposes the auth error', async () => {
  const signedIn = app(); await signedIn.auth(signedIn.user());
  assert.equal(signedIn.el('login-screen').hidden, true);
  assert.equal(signedIn.document.body.classList.contains('app-locked'), false);
  assert.equal(signedIn.context.hasSeenRuvyWelcome(), false, 'a session bypass does not falsely mark onboarding accepted');
  assert.equal(signedIn.el('ruvy-welcome-robot').classList.contains('waving'), false);
  const failed = app(); failed.context.loadFromCloud = async () => { throw new Error('Temporary cloud error'); };
  await failed.auth(failed.user());
  assert.equal(failed.el('login-screen').hidden, false);
  assert.equal(failed.el('ruvy-auth-panel').hidden, false);
  assert.equal(failed.el('ruvy-welcome-panel').hidden, true);
  assert.equal(failed.el('auth-error').hidden, false);
  assert.match(failed.el('auth-error').textContent, /Akun belum dapat dimuat/);
  assert.ok(failed.warnings.some(parts => parts.includes('Temporary cloud error')));
});

test('same-screen retries, language changes, and greeting timers preserve the chosen form, fields, and error', async () => {
  const h = app(); await h.auth(null);
  h.el('ruvy-welcome-robot').click(); h.el('ruvy-get-started').click();
  const form = h.el('form-register'), email = form.querySelector('[name="email"]'), password = form.querySelector('[name="password"]');
  email.value = 'keep@example.test'; password.value = 'test-password';
  h.context.showAuthError('Keep this error'); h.context.showScreen('login');
  for (const lang of ['en', 'id']) { h.el('login-language').value = lang; h.el('login-language').onchange(); }
  h.finishTimers();
  assert.equal(h.el('ruvy-auth-panel').hidden, false);
  assert.equal(h.el('form-register'), form);
  assert.equal(form.hidden, false);
  assert.equal(email.value, 'keep@example.test'); assert.equal(password.value, 'test-password');
  assert.equal(h.el('auth-error').hidden, false); assert.equal(h.el('auth-error').textContent, 'Keep this error');
  assert.equal(typeof form.onsubmit, 'function');
  assert.equal(h.el('ruvy-get-started').textContent, 'Mulai');
});

test('welcome wave ends or cancels cleanly and stops when the auth panel is opened', async () => {
  const h = app(); await h.auth(null); const robot = h.el('ruvy-welcome-robot');
  assert.equal(robot.classList.contains('waving'), true);
  robot.dispatch('animationend', { animationName: 'unrelated-animation' }); assert.equal(robot.classList.contains('waving'), true);
  robot.dispatch('animationend', { animationName: 'ruvy-wave' }); assert.equal(robot.classList.contains('waving'), false);
  robot.click(); robot.dispatch('animationcancel', { animationName: 'ruvy-wave' }); assert.equal(robot.classList.contains('waving'), false);
  robot.click(); h.el('ruvy-get-started').click(); assert.equal(robot.classList.contains('waving'), false);
  h.context.waveRuvyWelcome(); assert.equal(robot.classList.contains('waving'), false, 'a hidden welcome panel cannot start another wave');
});

test('reduced motion and page visibility pause welcome animation without disabling the greeting', async () => {
  const h = app({ reducedMotion: true, language: 'en' }); await h.auth(null); const robot = h.el('ruvy-welcome-robot');
  robot.click(); assert.equal(robot.classList.contains('waving'), false); assert.equal(h.el('ruvy-welcome-greeting').textContent, 'Nice to meet you!');
  h.setReducedMotion(false);
  const reduce = h.el('ruvy-reduce-motion'); reduce.checked = true; reduce.onchange(); robot.click();
  assert.equal(robot.classList.contains('waving'), false);
  reduce.checked = false; reduce.onchange(); h.setVisible(false); robot.click();
  assert.equal(robot.classList.contains('waving'), false); assert.equal(h.document.body.classList.contains('ruvy-paused'), true);
  h.setVisible(true); assert.equal(h.document.body.classList.contains('ruvy-paused'), false);
  robot.click(); assert.equal(robot.classList.contains('waving'), true);
  h.context.showScreen('loading'); robot.dispatch('animationcancel', { animationName: 'ruvy-wave' }); robot.click();
  assert.equal(robot.classList.contains('waving'), false, 'a hidden login screen cannot animate');
  assert.match(css, /#ruvy-welcome-panel\[hidden\] \.ruvy-robot \*\{animation-play-state:paused!important\}/);
  assert.match(css, /#login-screen\[hidden\] #ruvy-welcome-robot \*\{animation-play-state:paused!important\}/);
  assert.match(css, /\.ruvy-paused \.ruvy-robot \*[^}]*animation-play-state:paused!important/);
  assert.match(css, /\.ruvy-reduce-motion \.ruvy-robot \*\{animation:none!important\}/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*animation:none!important/);
});

test('a new account with its active signup trial enters the app without a payment screen', async () => {
  const h = app({ language: 'en' });
  h.context.ensureUserProfile = async () => ({ plan: 'free_trial', expiresAt: new Date(Date.now() + 2 * 86400000).toISOString() });
  await h.auth(h.user());
  assert.equal(h.el('paywall-screen').hidden, true);
  assert.equal(h.el('startup-screen').hidden, true);
  assert.equal(h.document.body.classList.contains('app-locked'), false);
});

test('a failed new-account bootstrap keeps a localized retry screen instead of checkout', async () => {
  const h = app({ language: 'en' });
  h.context.ensureUserProfile = async () => { throw Object.assign(new Error('offline'), { code: 'account/profile-unavailable' }); };
  await h.auth(h.user());
  assert.equal(h.el('startup-screen').hidden, false);
  assert.equal(h.el('paywall-screen').hidden, true);
  assert.equal(h.el('login-screen').hidden, true);
  assert.match(h.el('account-load-status').textContent, /Check your connection and reload/);
  assert.doesNotMatch(h.el('account-load-status').textContent, /buy|subscribe|payment/i);
});
