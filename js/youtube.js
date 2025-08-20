(() => {
  if (window.__YT_WIRED__) return;
  window.__YT_WIRED__ = true;

  const YT_API_SRC = "https://www.youtube.com/iframe_api";
  const qs  = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // Global registry of players
  const players = new Set();
  let currentPlaying = null;

  // ---- 1) Load IFrame API once (idempotent) ----
  function loadYTAPI() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (document.querySelector('script[data-yt-api]')) {
      // If the script exists but YT not ready yet, wait for onYouTubeIframeAPIReady
      return waitForYTReady();
    }
    const s = document.createElement('script');
    s.src = YT_API_SRC;
    s.async = true;
    s.defer = true;
    s.setAttribute('data-yt-api', '1');
    document.head.appendChild(s);
    return waitForYTReady();
  }

  function waitForYTReady() {
    return new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof prev === 'function') prev();
        resolve(window.YT);
      };
    });
  }

  // ---- 2) Utilities ----
  function ensureEnableJsApi(url) {
    try {
      const u = new URL(url, location.href);
      if (!u.searchParams.has('enablejsapi')) u.searchParams.set('enablejsapi', '1');
      if (!u.searchParams.has('playsinline')) u.searchParams.set('playsinline', '1');
      // modestbranding to reduce chrome; not required but nice
      if (!u.searchParams.has('modestbranding')) u.searchParams.set('modestbranding', '1');
      return u.toString();
    } catch {
      return url;
    }
  }

  function pauseAllExcept(player) {
    for (const p of players) {
      if (p !== player) {
        try { p.pauseVideo && p.pauseVideo(); } catch {}
      }
    }
  }

  function markPlaying(player) {
    currentPlaying = player;
    pauseAllExcept(player);
  }

  function markStopped(player) {
    if (currentPlaying === player) currentPlaying = null;
  }

  // ---- 3) Upgrade or create players ----
  async function initYT() {
    const containers = qsa('.yt-player[data-video-id]');
    const iframes = qsa('iframe.yt-iframe');

    if (containers.length === 0 && iframes.length === 0) {
      // Nothing to do
      return;
    }

    const YT = await loadYTAPI();

    // A) Convert containers into API players
    containers.forEach(container => {
      const videoId = container.getAttribute('data-video-id');
      if (!videoId) return;

      // Guard against double mount
      if (container.__ytMounted) return;
      container.__ytMounted = true;

      const player = new YT.Player(container, {
        videoId,
        playerVars: {
          autoplay: 0,
          rel: 0,
          playsinline: 1,
          modestbranding: 1
        },
        events: {
          onReady: (e) => {
            // Click-through should already work; make sure iframe allows interaction
            const iframe = container.querySelector('iframe');
            if (iframe) {
              iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share');
              iframe.setAttribute('title', iframe.getAttribute('title') || 'YouTube video');
              iframe.setAttribute('allowfullscreen', '');
              iframe.setAttribute('playsinline', '1');
              // Defensive: remove any accidental pointer-events:none
              iframe.style.pointerEvents = 'auto';
            }
          },
          onStateChange: (e) => {
            const YTState = window.YT.PlayerState;
            if (!YTState) return;
            if (e.data === YTState.PLAYING) {
              markPlaying(e.target);
            } else if (e.data === YTState.PAUSED || e.data === YTState.ENDED) {
              markStopped(e.target);
            }
          }
        }
        });

        players.add(player);

        try {
          const iframeEl = player.getIframe();
          window.PAKSTREAM?.ErrorOverlay?.armIframeTimeout(iframeEl, 6000, (container) => {
            window.PAKSTREAM?.ErrorOverlay?.show(container, {
              onRetry: () => {
                try {
                  const src = iframeEl.getAttribute('src');
                  iframeEl.setAttribute('src', src);
                } catch {}
              }
            });
          });
        } catch {}
      });

      // B) Upgrade existing iframes to API players (if not already)
      iframes.forEach(iframe => {
      if (iframe.__ytMounted) return;
      iframe.__ytMounted = true;

      // Ensure enablejsapi & playsinline
      iframe.src = ensureEnableJsApi(iframe.src);

      // Create API player bound to the iframe
      const parent = iframe.parentElement || document.body;
      const placeholder = document.createElement('div');
      parent.insertBefore(placeholder, iframe);
      // Move iframe into placeholder so the API can control it
      placeholder.appendChild(iframe);

      const player = new YT.Player(placeholder, {
        events: {
          onReady: (e) => {
            // defensive attributes
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share');
            iframe.setAttribute('title', iframe.getAttribute('title') || 'YouTube video');
            iframe.setAttribute('allowfullscreen', '');
            iframe.setAttribute('playsinline', '1');
            iframe.style.pointerEvents = 'auto';
          },
          onStateChange: (e) => {
            const YTState = window.YT.PlayerState;
            if (!YTState) return;
            if (e.data === YTState.PLAYING) {
              markPlaying(e.target);
            } else if (e.data === YTState.PAUSED || e.data === YTState.ENDED) {
              markStopped(e.target);
            }
          }
        }
        });

        players.add(player);

        try {
          const iframeEl = iframe?.tagName ? iframe : player.getIframe();
          window.PAKSTREAM?.ErrorOverlay?.armIframeTimeout(iframeEl, 6000, (container) => {
            window.PAKSTREAM?.ErrorOverlay?.show(container, {
              onRetry: () => {
                try {
                  const src = iframeEl.getAttribute('src');
                  iframeEl.setAttribute('src', src);
                } catch {}
              }
            });
          });
        } catch {}
      });

    // Global safety: pause all when the tab is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        for (const p of players) {
          try { p.pauseVideo && p.pauseVideo(); } catch {}
        }
      }
    });
  }

  // ---- 4) Initialize on DOM ready (idempotent) ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initYT, { once: true });
  } else {
    initYT();
  }

  // Optional: re-run on page-specific events if your router swaps content
  window.addEventListener('pakstream:rerender', () => initYT());

})();
