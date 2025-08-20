// js/ui/toast.js
(function () {
  if (window.PAKSTREAM?.Toast) return;

  function ensureHost() {
    let host = document.querySelector('.ps-toast-host');
    if (host) return host;
    host = document.createElement('div');
    host.className = 'ps-toast-host';
    document.body.appendChild(host);
    return host;
  }

  function show(message, { timeout = 2500 } = {}) {
    const host = ensureHost();
    const el = document.createElement('div');
    el.className = 'ps-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.textContent = message;
    host.appendChild(el);

    requestAnimationFrame(() => el.classList.add('is-in'));
    const t = setTimeout(() => hide(el), timeout);

    el.addEventListener('click', () => {
      clearTimeout(t);
      hide(el);
    });
  }

  function hide(el) {
    el.classList.remove('is-in');
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 220);
  }

  window.PAKSTREAM = window.PAKSTREAM || {};
  window.PAKSTREAM.Toast = { show };
})();
