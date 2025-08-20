// js/youtube.js
(function () {
  const SS = window.PAKSTREAM && window.PAKSTREAM.StreamState;
  if (!SS) return;

  const YT_IFRAME_SRC = 'https://www.youtube.com/iframe_api';
  let apiReady = false, pending = [];

  function loadYT() {
    if (window.YT && window.YT.Player) { apiReady = true; flush(); return; }
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) return;
    const s = document.createElement('script');
    s.src = YT_IFRAME_SRC; s.async = true;
    document.head.appendChild(s);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      apiReady = true;
      try { if (typeof prev === 'function') prev(); } catch {}
      flush();
    };
  }
  function flush() { pending.splice(0).forEach(fn => { try { fn(); } catch {} }); }

  function ensureHttps(u) {
    if (!u) return '';
    if (u.startsWith('//')) return 'https:' + u;
    if (u.startsWith('http://')) return u.replace(/^http:/, 'https:');
    return u;
  }
  function setParam(url, k, v) {
    const u = new URL(url, location.origin);
    u.searchParams.set(k, v);
    return u.toString();
  }
  function hasParam(url, k) {
    try { return new URL(url, location.origin).searchParams.has(k); } catch { return false; }
  }
  function isYTEmbed(url) {
    try {
      const u = new URL(url, location.origin);
      return /(^|\.)youtube\.com$/.test(u.hostname) || /(^|\.)youtube-nocookie\.com$/.test(u.hostname);
    } catch { return false; }
  }

  function normalizeSrc(iframe) {
    // Support lazy-load pattern: <iframe data-src="..."> without src
    let src = iframe.getAttribute('src');
    const dataSrc = iframe.getAttribute('data-src');
    if ((!src || src === 'about:blank' || src === 'about:') && dataSrc) {
      src = dataSrc;
      iframe.setAttribute('src', dataSrc); // promote
    }

    // If still missing, try from data-video-id
    if (!src || src === 'about:blank' || src === 'about:') {
      const vid = iframe.dataset.videoId || iframe.getAttribute('data-video-id');
      if (vid) {
        src = `https://www.youtube.com/embed/${vid}`;
        iframe.setAttribute('src', src);
      }
    }
    if (!src) return null;

    src = ensureHttps(src);

    // If not a YT embed yet, bail (we won’t wire non-YT iframes)
    if (!isYTEmbed(src)) return null;

    // Force embed path (in case it’s a watch URL)
    try {
      const u = new URL(src, location.origin);
      // Convert watch?v=ID to embed/ID
      if (u.pathname === '/watch' && u.searchParams.get('v')) {
        src = `https://${u.hostname}/embed/${u.searchParams.get('v')}`;
      }
    } catch {}

    // Required params
    if (!hasParam(src, 'enablejsapi')) src = setParam(src, 'enablejsapi', '1');
    // Strongly recommended
    src = setParam(src, 'playsinline', '1');
    src = setParam(src, 'rel', '0');
    src = setParam(src, 'modestbranding', '1');

    // Critical: origin must be your site origin (prevents about: postMessage issues)
    const origin = location.origin || (location.protocol + '//' + location.host);
    src = setParam(src, 'origin', origin);

    // Apply back to iframe if changed
    if (iframe.getAttribute('src') !== src) {
      iframe.setAttribute('src', src);
    }

    return src;
  }

  function wireYT(iframe) {
    if (!iframe || iframe.__ytWired) return;
    iframe.__ytWired = true;

    // Ensure it’s focusable for a11y
    if (!iframe.hasAttribute('title')) iframe.setAttribute('title', 'YouTube video');

    const validSrc = normalizeSrc(iframe);
    if (!validSrc) { iframe.__ytWired = false; return; } // not a usable YT src

    const id = iframe.dataset.playerId || ('yt-' + Math.random().toString(36).slice(2));
    iframe.dataset.playerId = id;
    const container = iframe.closest('[data-youtube-container]') || iframe.parentElement;

    function makePlayer() {
      let destroyed = false;
      const player = new YT.Player(iframe, {
        events: {
          onStateChange: (e) => {
            if (destroyed) return;
            // Hide any previous error overlay once the player state changes
            try { window.PAKSTREAM?.ErrorOverlay?.hide(container); } catch {}
            // 1 = playing, 2 = paused, 0 = ended
            if (e.data === 1) { SS.play(id); container?.classList.add('is-playing'); }
            if (e.data === 2) { container?.classList.remove('is-playing'); }
            if (e.data === 0) { container?.classList.remove('is-playing'); if (SS.getCurrentId() === id) SS.stopAll(null); }
          },
          onError: () => {
            try {
              window.PAKSTREAM?.ErrorOverlay?.show(container, {
                onRetry: () => {
                  try {
                    // Force a clean reload with correct params intact
                    const src = iframe.getAttribute('src');
                    iframe.setAttribute('src', src);
                  } catch {}
                }
              });
            } catch {}
          }
        }
      });

      // Cleanup when node removed
      const obs = new MutationObserver(() => {
        if (!document.contains(iframe)) {
          destroyed = true;
          try { player.destroy(); } catch {}
          obs.disconnect();
        }
      });
      obs.observe(document, { childList: true, subtree: true });
    }

    if (apiReady) makePlayer(); else pending.push(makePlayer);
  }

  function init() {
    const iframes = document.querySelectorAll('iframe[data-youtube], [data-youtube] iframe');
    if (!iframes.length) return;
    loadYT();
    iframes.forEach(wireYT);

    // For pages that lazy-set data-src later, observe and (re)wire when src appears
    const ro = new MutationObserver((mut) => {
      mut.forEach(m => {
        if (m.type === 'attributes' && m.attributeName === 'src') {
          const el = m.target;
          if (el && el.tagName === 'IFRAME' && (el.dataset.youtube !== undefined || el.closest('[data-youtube]'))) {
            // If it wasn’t wired (or was unwired), try again
            if (!el.__ytWired) wireYT(el);
          }
        }
      });
    });
    iframes.forEach(el => ro.observe(el, { attributes: true, attributeFilter: ['src'] }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();


// PWA patch: ensure YouTube iframes include enablejsapi=1 & origin to avoid postMessage errors
(function(){
  try {
    const origin = location.origin;
    const iframes = document.querySelectorAll('iframe[src*="youtube.com"],iframe[src*="youtube-nocookie.com"]');
    iframes.forEach((f) => {
      try {
        const u = new URL(f.src, origin);
        if (!u.searchParams.get('enablejsapi')) u.searchParams.set('enablejsapi', '1');
        if (!u.searchParams.get('origin')) u.searchParams.set('origin', origin);
        f.src = u.toString();
      } catch(_) { /* ignore */ }
    });
  } catch(_) { /* ignore */ }
})();
