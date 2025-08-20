(() => {
  // Avoid redefining across modules
  if (window.__mh) return;

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

  window.__mh = { qs, qsa, on, required, emptyState, clearContainer, emit };
})();

window.PAKSTREAM_MH_CHANNELS = (function () {
  const { qs, qsa, on, required, emptyState, clearContainer } = window.__mh;

  // Adjust to your actual data source(s)
  const DATA_URL = '/channels.json'; // or read from a data-* attribute on root

  let cache = null; // basic in-memory cache

  async function fetchData() {
    if (cache) return cache;
    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      cache = data;
      return data;
    } catch (e) {
      console.warn('[MediaHub] fetch failed', e);
      return null;
    }
  }

  function renderList(listEl, items) {
    if (!listEl) return;
    clearContainer(listEl);

    if (!items || !Array.isArray(items) || items.length === 0) {
      emptyState(listEl, 'No channels to show yet.');
      return;
    }

    // Idempotent: simple render
    const frag = document.createDocumentFragment();
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'mh-item';
      el.innerHTML = `
        <button class="mh-play" data-audio-play aria-label="Play ${item.name}"></button>
        <div class="mh-meta">
          <div class="mh-name">${item.name ?? 'Unknown'}</div>
          <div class="mh-desc">${item.desc ?? ''}</div>
        </div>
      `;
      // You can attach data attributes for stream URLs, etc.
      // el.dataset.stream = item.stream;
      frag.appendChild(el);
    });
    listEl.appendChild(frag);
  }

  function filterItems(data, opts) {
    if (!data || !Array.isArray(data.items)) return [];
    const q = (opts?.q || '').toLowerCase();
    const tab = opts?.tab || null;

    let items = data.items;
    if (tab) {
      items = items.filter(x => (x.category || '').toLowerCase() === tab.toLowerCase());
    }
    if (q) {
      items = items.filter(x => (x.name || '').toLowerCase().includes(q) ||
                                (x.desc || '').toLowerCase().includes(q));
    }
    return items;
  }

  function init({ root, list /* video, audio optional */ }) {
    if (!root) return;
    if (!list) {
      console.warn('[MediaHub] missing list container (.mh-list)');
      return;
    }
    if (list.__wired) return;
    list.__wired = true;

    let lastOpts = {};

    async function rerender(opts = {}) {
      lastOpts = { ...lastOpts, ...opts };
      const data = await fetchData();

      // If fetch failed, render a friendly state
      if (!data) {
        emptyState(list, 'Could not load channels. Please try again later.');
        return;
      }

      const tabName = lastOpts.name || lastOpts.tab || null;
      const q = lastOpts.q || '';
      const items = filterItems(data, { tab: tabName, q });
      renderList(list, items);
    }

    // Initial render
    rerender();

    // React to events
    document.addEventListener('pakstream:hub:tabchange', (e) => {
      rerender({ tab: e.detail?.name });
    });
    document.addEventListener('pakstream:hub:rerender', (e) => {
      rerender({ ...e.detail });
    });
  }

  return { init };
})();

