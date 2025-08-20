// js/youtube.js
(function () {
  const SS = window.PAKSTREAM && window.PAKSTREAM.StreamState;
  if (!SS) return;
  const YT_IFRAME_SRC = 'https://www.youtube.com/iframe_api';
  let apiReady = false, pending = [];

  function loadYT() {
    if (window.YT && window.YT.Player) { apiReady = true; flush(); return; }
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) return;
    const s = document.createElement('script'); s.src = YT_IFRAME_SRC; s.async = true;
    document.head.appendChild(s);
    window.onYouTubeIframeAPIReady = function () { apiReady = true; flush(); };
  }
  function flush() { pending.splice(0).forEach(fn => fn()); }

  function wireYT(iframe) {
    const id = iframe.dataset.playerId || ('yt-' + Math.random().toString(36).slice(2));
    iframe.dataset.playerId = id;
    const container = iframe.closest('[data-youtube-container]') || iframe.parentElement;

    function makePlayer() {
      const player = new YT.Player(iframe, {
        events: {
          onStateChange: (e) => {
            // 1 = playing, 2 = paused, 0 = ended
            if (e.data === 1) { SS.play(id); container?.classList.add('is-playing'); }
            if (e.data === 2) { container?.classList.remove('is-playing'); }
            if (e.data === 0) { container?.classList.remove('is-playing'); if (SS.getCurrentId() === id) SS.stopAll(null); }
          }
        }
      });
      const api = {
        type: 'youtube',
        el: iframe,
        play() { try { player.playVideo(); } catch {} container?.classList.add('is-playing'); },
        pause() { try { player.pauseVideo(); } catch {} container?.classList.remove('is-playing'); }
      };
      const unregister = SS.register(id, api);
      // Cleanup when removed
      const obs = new MutationObserver(() => {
        if (!document.contains(iframe)) { unregister(); obs.disconnect(); try { player.destroy(); } catch {} }
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
