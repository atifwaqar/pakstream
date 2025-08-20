window.PAKSTREAM_MH_CHANNELS = (function () {
  const { qs, qsa, on, required, emptyState, clearContainer } = window.__mh;

  async function fetchData() {
    // Load once from all_streams.json
    return await window.PAKSTREAM_DATA.getAllStreams();
  }

  function filterItems(data, opts) {
    if (!data || !Array.isArray(data.items)) return [];
    const q = (opts?.q || '').toLowerCase();
    const tab = opts?.tab || null;

    let items = data.items;

    // If your tabs are kinds, map tab name to kind here
    const kindByTab = { radio: 'radio', tv: 'tv', creators: 'creator', freepress: 'freepress' };
    const kind = kindByTab[tab] || null;

    if (kind) items = items.filter(x => x.kind === kind);
    if (q) {
      items = items.filter(x =>
        (x.name || '').toLowerCase().includes(q) ||
        (x.desc || '').toLowerCase().includes(q) ||
        (Array.isArray(x.tags) ? x.tags.join(' ').toLowerCase() : '').includes(q)
      );
    }
    return items;
  }

  function renderList(listEl, items) {
    if (!listEl) return;
    clearContainer(listEl);

    if (!items || !items.length) {
      emptyState(listEl, 'No channels to show yet.');
      return;
    }

    const frag = document.createDocumentFragment();
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'mh-item';
      el.innerHTML = `
        <button class="mh-play" data-audio-play aria-label="Play ${item.name}"></button>
        <div class="mh-meta">
          <div class="mh-name">${item.name}</div>
          <div class="mh-desc">${item.desc || ''}</div>
        </div>
      `;
      // If radio/tv stream exists, you can stash it here
      if (item.stream) el.dataset.stream = item.stream;
      frag.appendChild(el);
    });
    listEl.appendChild(frag);
  }

  function init({ root, list }) {
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
      if (!data) {
        emptyState(list, 'Could not load channels. Please try again later.');
        return;
      }
      const tabName = lastOpts.name || lastOpts.tab || null;
      const q = lastOpts.q || '';
      const items = filterItems(data, { tab: tabName, q });
      renderList(list, items);
    }

    rerender();

    document.addEventListener('pakstream:hub:tabchange', (e) => {
      rerender({ tab: e.detail?.name });
    });
    document.addEventListener('pakstream:hub:rerender', (e) => {
      rerender({ ...e.detail });
    });
  }

  return { init };
})();
