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

window.PAKSTREAM_MH_SEARCH = (function () {
  const { qs, on, emit } = __mh;

  function init({ root, search }) {
    if (!root || !search) return;
    if (search.__wired) return;
    search.__wired = true;

    const input = qs('input[type="search"], input[data-mh-search]', search);
    if (!input) return;

    let t = 0;
    on(input, 'input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        emit('pakstream:hub:rerender', { q: input.value.trim() });
      }, 150);
    });
  }

  return { init };
})();

