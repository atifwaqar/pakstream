(() => {
  if (window.__DATA_WIRED__) return;
  window.__DATA_WIRED__ = true;

  const DATA_URL = '/all_streams.json'; // adjust if you place it elsewhere

  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }

  function validateItem(it) {
    if (!isObj(it)) return false;
    const okKind = ['radio','tv','creator','freepress'].includes(it.kind);
    return Boolean(it.id && it.name && okKind);
  }

  function validateAll(data) {
    if (!isObj(data)) return { ok: false, reason: 'not object' };
    const { schema_version, version, generated_utc, counts, items } = data;
    if (typeof schema_version !== 'number') return { ok:false, reason:'schema_version' };
    if (typeof version !== 'number') return { ok:false, reason:'version' };
    if (typeof generated_utc !== 'string') return { ok:false, reason:'generated_utc' };
    if (!isObj(counts)) return { ok:false, reason:'counts' };
    if (!Array.isArray(items)) return { ok:false, reason:'items' };
    const bad = items.find(x => !validateItem(x));
    if (bad) return { ok:false, reason:'item-invalid', item: bad };
    return { ok: true };
  }

  let cache = null;

  async function getAllStreams() {
    if (cache) return cache;
    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      const v = validateAll(data);
      if (!v.ok) {
        console.warn('[data] invalid all_streams.json:', v.reason, v.item || '');
        return null;
      }
      cache = data;
      return data;
    } catch (e) {
      console.warn('[data] fetch failed', e);
      return null;
    }
  }

  // Public API
  window.PAKSTREAM_DATA = {
    getAllStreams,
    // quick helpers
    async getItems(filter = {}) {
      const data = await getAllStreams();
      if (!data) return [];
      const { items } = data;
      const q = (filter.q || '').toLowerCase();
      const kind = filter.kind || null;
      let res = items;
      if (kind) res = res.filter(x => x.kind === kind);
      if (q) {
        res = res.filter(x =>
          (x.name || '').toLowerCase().includes(q) ||
          (x.desc || '').toLowerCase().includes(q) ||
          (Array.isArray(x.tags) ? x.tags.join(' ').toLowerCase() : '').includes(q)
        );
      }
      return res;
    }
  };
})();
