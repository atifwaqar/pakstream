const __mh = (() => {
  // Avoid redefining across modules
  if (window.__PAKSTREAM_MH_UTILS__) return window.__PAKSTREAM_MH_UTILS__;

  const qs  = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const on  = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  function required(el, label) {
    if (!el) {
      console.warn(`[MediaHub] Missing required element: ${label}`);
      return null;
    }
    return el;
  }

  function emptyState(container, message) {
    if (!container) return;
    // Idempotent: don’t duplicate empty states
    if (container.__emptyRendered) return;
    container.innerHTML = `
      <div class="mh-empty" role="status" aria-live="polite">
        <p>${message}</p>
      </div>`;
    container.__emptyRendered = true;
  }

  function clearContainer(container) {
    if (!container) return;
    container.__emptyRendered = false;
    container.innerHTML = '';
  }

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  return (window.__PAKSTREAM_MH_UTILS__ = { qs, qsa, on, required, emptyState, clearContainer, emit });
})();

window.PAKSTREAM_MH_TABS = (function () {
  const { qs, qsa, on, required, emit } = __mh;

  function init({ root, tabs }) {
    if (!root) return;
    if (!tabs) return; // tabs optional
    if (tabs.__wired) return;
    tabs.__wired = true;

    const triggers = qsa('[data-mh-tab]', tabs);
    if (triggers.length === 0) return;

    function activate(name) {
      triggers.forEach(btn => {
        const isActive = btn.getAttribute('data-mh-tab') === name;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
        btn.tabIndex = isActive ? 0 : -1;
      });
      emit('pakstream:hub:tabchange', { name });
    }

    triggers.forEach(btn => {
      on(btn, 'click', (e) => {
        e.preventDefault();
        activate(btn.getAttribute('data-mh-tab'));
      });
      // Keyboard support
      on(btn, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate(btn.getAttribute('data-mh-tab'));
        }
      });
    });

    // Default to first if none active
    const active = triggers.find(b => b.classList.contains('is-active')) || triggers[0];
    if (active) activate(active.getAttribute('data-mh-tab'));
  }

  return { init };
})();

