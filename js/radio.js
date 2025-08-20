(() => {
  if (window.__RADIO_WIRED__) return;
  window.__RADIO_WIRED__ = true;

  const qs  = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const on  = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  // Registry of managed <audio> elements
  const audioSet = new Set();
  let current = null;

  // Optional UI helpers (no-op if not present)
  function setPlayingUI(root, isPlaying) {
    try {
      const playBtn  = qs('[data-audio-play]', root);
      const pauseBtn = qs('[data-audio-pause]', root);
      const stateEl  = qs('[data-audio-state]', root);
      if (playBtn)  playBtn.hidden  = isPlaying;
      if (pauseBtn) pauseBtn.hidden = !isPlaying;
      if (stateEl)  stateEl.textContent = isPlaying ? 'Playing' : 'Paused';
      root?.classList?.toggle('is-playing', !!isPlaying);
    } catch {}
  }

  function pauseAll(except = null) {
    for (const a of audioSet) {
      if (a !== except) {
        try { a.pause(); } catch {}
        setPlayingUI(a.closest('[data-audio-item]') || a.parentElement, false);
      }
    }
    if (except == null) current = null;
  }

  // Expose a global, safe-to-call pause hook for other modules (e.g., YouTube)
  window.PAKSTREAM_PAUSE_ALL_AUDIO = () => pauseAll(null);

  function initAudio(root = document) {
    const items = qsa('audio[data-radio], [data-audio-item] audio', root);
    if (items.length === 0) return;

    items.forEach(audio => {
      // Guard against double-binding
      if (audio.__wired) return;
      audio.__wired = true;

      // Keep reference
      audioSet.add(audio);

      // Ensure attributes for reliable mobile playback
      audio.setAttribute('preload', audio.getAttribute('preload') || 'none');
      audio.setAttribute('playsinline', 'true');
      // If cross-origin, allow CORS-friendly loads (depends on source headers)
      if (!audio.hasAttribute('crossorigin')) {
        audio.setAttribute('crossorigin', 'anonymous');
      }

      // Optional play/pause UI buttons near each item
      const container = audio.closest('[data-audio-item]') || audio.parentElement;
      const playBtn  = qs('[data-audio-play]', container);
      const pauseBtn = qs('[data-audio-pause]', container);

      on(playBtn, 'click', (e) => {
        e.preventDefault();
        // Pause any other audio and any video players
        pauseAll(audio);
        try { window.__YT_WIRED__ && window.PAKSTREAM_PAUSE_ALL_YT && window.PAKSTREAM_PAUSE_ALL_YT(); } catch {}

        audio.play().then(() => {
          current = audio;
          setPlayingUI(container, true);
        }).catch(() => {
          // Autoplay blocked; show paused state
          setPlayingUI(container, false);
        });
      });

      on(pauseBtn, 'click', (e) => {
        e.preventDefault();
        audio.pause();
        setPlayingUI(container, false);
        if (current === audio) current = null;
      });

      // Keep UI in sync with native events
      on(audio, 'play',  () => { pauseAll(audio); setPlayingUI(container, true); current = audio; });
      on(audio, 'pause', () => { setPlayingUI(container, false); if (current === audio) current = null; });
      on(audio, 'ended', () => { setPlayingUI(container, false); if (current === audio) current = null; });

      // Click-to-toggle on container if you prefer (optional)
      // on(container, 'click', (e) => { if (e.target.closest('button, a, input, textarea')) return;
      //   if (audio.paused) playBtn?.click(); else pauseBtn?.click();
      // });
    });
  }

  // Pause on tab hide
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') pauseAll(null);
  });

  // Pause on custom Media Hub navigation events (emit these in your hub JS)
  window.addEventListener('pakstream:tabchange', () => pauseAll(null));
  window.addEventListener('pakstream:routestart', () => pauseAll(null));

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAudio(document), { once: true });
  } else {
    initAudio(document);
  }

  // Safe to re-run after dynamic renders
  window.addEventListener('pakstream:rerender', () => initAudio(document));

})();
