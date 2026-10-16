// Toggle the existing input's type so autofill, validation and form values remain intact.
(function () {
  function language() {
    if (typeof getAppLanguage === 'function') return getAppLanguage();
    return document.documentElement.lang === 'en' ? 'en' : 'id';
  }

  function inputFor(button) {
    return document.getElementById(button.dataset.passwordToggle);
  }

  function updateLabel(button, input) {
    const visible = input.type === 'text';
    const confirmation = input.name === 'password2';
    const text = language() === 'en'
      ? (visible ? 'Hide ' : 'Show ') + (confirmation ? 'confirmation password' : 'password')
      : (visible ? 'Sembunyikan ' : 'Tampilkan ') + (confirmation ? 'konfirmasi password' : 'password');
    const label = document.getElementById(button.getAttribute('aria-labelledby'));
    if (label) label.textContent = text;
    button.dataset.passwordVisible = String(visible);
  }

  function setVisible(button, input, visible) {
    // Switching type must not replace the input or discard an in-progress edit.
    const start = input.selectionStart, end = input.selectionEnd, direction = input.selectionDirection;
    input.type = visible ? 'text' : 'password';
    if (typeof start === 'number' && typeof input.setSelectionRange === 'function') {
      try { input.setSelectionRange(start, end, direction); } catch (_) { /* Older WebViews may reject selection changes. */ }
    }
    updateLabel(button, input);
  }

  function init() {
    const buttons = [...document.querySelectorAll('[data-password-toggle]')];
    function refresh() {
      buttons.forEach(button => { const input = inputFor(button); if (input) updateLabel(button, input); });
    }
    function conceal() {
      buttons.forEach(button => { const input = inputFor(button); if (input) setVisible(button, input, false); });
    }
    buttons.forEach(button => {
      const input = inputFor(button);
      if (!input) return;
      setVisible(button, input, false);
      button.addEventListener('click', () => setVisible(button, input, input.type !== 'text'));
    });
    // Labels follow the selected language even when it changes while a password is visible.
    if (typeof MutationObserver === 'function') {
      new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) conceal(); });
    document.addEventListener('click', event => {
      if (event.target.closest?.('[data-auth-tab],#ruvy-auth-back,#ruvy-get-started,#ruvy-welcome-sign-in')) conceal();
    });
    document.querySelectorAll('#form-login,#form-register').forEach(form => {
      form.addEventListener('submit', conceal, true);
      form.addEventListener('reset', conceal);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
