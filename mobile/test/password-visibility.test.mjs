import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const [html, source] = await Promise.all(['app.html', 'js/password-visibility.js']
  .map(file => readFile(new URL('../../' + file, import.meta.url), 'utf8')));

function fixture(language = 'en') {
  const elements = new Map(), observers = [], events = new Map();
  const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)(?:="([^"]*)")?/g)]
    .map(([, key, value]) => [key, value ?? '']));
  function node(attrs) {
    const callbacks = new Map();
    return {
      attrs, dataset: {}, value: '', name: attrs.name, type: attrs.type,
      selectionStart: 0, selectionEnd: 0, selectionDirection: 'none',
      getAttribute: name => attrs[name] ?? null,
      addEventListener(name, callback) { if (!callbacks.has(name)) callbacks.set(name, []); callbacks.get(name).push(callback); },
      dispatch(name) { for (const callback of callbacks.get(name) || []) callback({ target: this }); },
      setSelectionRange(start, end, direction) { this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction; },
    };
  }
  for (const [tag] of html.matchAll(/<input\b[^>]*>/g)) {
    const attrs = attributes(tag); if (attrs.id) elements.set(attrs.id, node(attrs));
  }
  const buttons = [...html.matchAll(/<button\b[^>]*data-password-toggle[^>]*>/g)].map(([tag]) => {
    const attrs = attributes(tag), button = node(attrs);
    button.dataset.passwordToggle = attrs['data-password-toggle'];
    elements.set(attrs['aria-labelledby'], { textContent: '' });
    return button;
  });
  const forms = ['form-login', 'form-register'].map(id => node({ id }));
  const document = {
    readyState: 'complete', hidden: false, documentElement: { lang: language },
    getElementById: id => elements.get(id),
    querySelectorAll: selector => selector === '[data-password-toggle]' ? buttons : forms,
    addEventListener(name, callback) { if (!events.has(name)) events.set(name, []); events.get(name).push(callback); },
    dispatch(name, target = {}) { for (const callback of events.get(name) || []) callback({ target }); },
  };
  vm.runInNewContext(source, {
    document, getAppLanguage: () => document.documentElement.lang,
    MutationObserver: class {
      constructor(callback) { observers.push(callback); }
      observe(target, options) { assert.equal(target, document.documentElement); assert.deepEqual([...options.attributeFilter], ['lang']); }
    },
  });
  return {
    document, buttons, forms, input: id => elements.get(id),
    label: button => elements.get(button.attrs['aria-labelledby']).textContent,
    changeLanguage(value) { document.documentElement.lang = value; observers.forEach(callback => callback()); },
  };
}

test('all three real auth password controls have independent non-submitting visibility buttons', () => {
  const h = fixture();
  assert.match(html, /<script src="js\/password-visibility\.js\?v=\d+"><\/script>/);
  assert.equal(h.buttons.length, 3);
  assert.deepEqual(h.buttons.map(button => button.dataset.passwordToggle), ['login-password', 'register-password', 'register-password-confirm']);
  h.buttons.forEach(button => {
    const input = h.input(button.dataset.passwordToggle);
    assert.equal(button.type, 'button');
    assert.equal(button.attrs['aria-controls'], input.attrs.id);
    assert.equal(input.type, 'password');
    assert.equal(h.label(button), input.name === 'password2' ? 'Show confirmation password' : 'Show password');
    assert.equal(input.attrs.required, '');
    assert.equal(input.attrs.minlength, '6');
    assert.equal(input.attrs.autocomplete, input.attrs.id === 'login-password' ? 'current-password' : 'new-password');
  });
});

test('reveal and conceal preserve the input, value, cursor and other password fields', () => {
  const h = fixture(), button = h.buttons[1], input = h.input('register-password');
  input.value = 'Synthetic-test-value'; input.setSelectionRange(3, 8, 'forward');
  button.dispatch('click');
  assert.equal(h.input('register-password'), input);
  assert.equal(input.type, 'text');
  assert.equal(input.value, 'Synthetic-test-value');
  assert.deepEqual([input.selectionStart, input.selectionEnd, input.selectionDirection], [3, 8, 'forward']);
  assert.equal(h.input('login-password').type, 'password');
  assert.equal(h.input('register-password-confirm').type, 'password');
  assert.equal(h.label(button), 'Hide password');
  button.dispatch('click');
  assert.equal(input.type, 'password');
  assert.equal(input.value, 'Synthetic-test-value');
  assert.equal(h.label(button), 'Show password');
});

test('English and Indonesian labels stay correct when language changes while visible', () => {
  const h = fixture('id'), button = h.buttons[2];
  assert.equal(h.label(button), 'Tampilkan konfirmasi password');
  button.dispatch('click');
  assert.equal(h.label(button), 'Sembunyikan konfirmasi password');
  h.changeLanguage('en');
  assert.equal(h.label(button), 'Hide confirmation password');
  assert.equal(h.input('register-password-confirm').type, 'text');
  button.dispatch('click');
  assert.equal(h.label(button), 'Show confirmation password');
  h.changeLanguage('id');
  assert.equal(h.label(button), 'Tampilkan konfirmasi password');
});

test('changing auth screen or leaving the app hides visible passwords without losing edits', () => {
  const h = fixture(), input = h.input('login-password');
  input.value = 'Synthetic-test-value'; h.buttons[0].dispatch('click');
  h.document.dispatch('click', { closest: () => ({}) });
  assert.equal(input.type, 'password'); assert.equal(input.value, 'Synthetic-test-value');
  h.buttons[0].dispatch('click'); h.document.hidden = true; h.document.dispatch('visibilitychange');
  assert.equal(input.type, 'password'); assert.equal(input.value, 'Synthetic-test-value');
});

test('submitting or resetting the form conceals the existing fields and leaves submitted values intact', () => {
  const h = fixture(), input = h.input('register-password');
  input.value = 'Synthetic-test-value'; h.buttons[1].dispatch('click');
  h.forms[1].dispatch('submit');
  assert.equal(input.type, 'password'); assert.equal(input.value, 'Synthetic-test-value');
  h.buttons[1].dispatch('click'); h.forms[1].dispatch('reset');
  assert.equal(input.type, 'password');
});
