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

(() => {
  if (window.__MH_BOOT_WIRED__) return;
  window.__MH_BOOT_WIRED__ = true;

  const { qs, required, emit } = __mh;

  // Required top-level containers (adjust selectors to your DOM)
  const SEL = {
    root:   '.media-hub',
    tabs:   '.mh-tabs',
    search: '.mh-search',
    list:   '.mh-list',
    video:  '.mh-video',   // optional section
    audio:  '.mh-audio'    // optional section
  };

  function init() {
    const root   = required(qs(SEL.root), 'Media Hub root (.media-hub)');
    if (!root) return; // No hub on this page; safe no-op

    const tabs   = qs(SEL.tabs, root);
    const search = qs(SEL.search, root);
    const list   = qs(SEL.list, root);
    // Optional areas may be null; modules should no-op when missing
    const video  = qs(SEL.video, root);
    const audio  = qs(SEL.audio, root);

    // Sub-module init (each module must be idempotent)
    try { window.PAKSTREAM_MH_TABS?.init({ root, tabs }); } catch (e) { console.warn('[MediaHub] tabs init failed', e); }
    try { window.PAKSTREAM_MH_SEARCH?.init({ root, search }); } catch (e) { console.warn('[MediaHub] search init failed', e); }
    try { window.PAKSTREAM_MH_CHANNELS?.init({ root, list, video, audio }); } catch (e) { console.warn('[MediaHub] channels init failed', e); }

    emit('pakstream:hub:ready', { root });
  }

  // DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Allow external soft rerender (should be safe idempotent)
  window.addEventListener('pakstream:hub:rerender', init);
})();

