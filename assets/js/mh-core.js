// assets/js/mh-core.js
(function () {
  if (window.PAKSTREAM?.MHCore) return;

  async function loadStreams() {
    // Preferred: global data module
    if (window.PAKSTREAM?.DATA?.getAllStreams) {
      try { 
        const arr = await window.PAKSTREAM.DATA.getAllStreams();
        return normalize(arr);
      } catch (e) {}
    }
    // Fallback: static JSON
    try {
      const res = await fetch('/all_streams.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      return normalize(json.items || json.streams || json || []);
    } catch (e) {
      console.warn('[MH] load fallback failed', e);
      return [];
    }
  }

  function normalize(items) {
    return (items || []).map((x, i) => ({
      id: x.id || x.key || `s-${i}`,
      title: x.title || x.name || 'Untitled',
      type: (x.type || x.kind || 'radio').toLowerCase(),
      country: x.country || x.lang || '',
      tags: x.tags || x.categories || [],
      thumb: x.thumb || x.logo || x.image || '',
      url: x.url || x.stream_url || x.src || '',
      yt: x.youtube_id || x.yt || null
    })).filter(x => x.url || x.yt);
  }

  function fuzzyIncludes(hay, needle) {
    if (!needle) return true;
    hay = (hay || '').toString().toLowerCase();
    needle = needle.toLowerCase().trim();
    return hay.includes(needle);
  }

  window.PAKSTREAM = window.PAKSTREAM || {};
  window.PAKSTREAM.MHCore = { loadStreams, fuzzyIncludes };
})();
