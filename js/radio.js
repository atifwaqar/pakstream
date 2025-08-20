// js/radio.js
(function () {
  const SS = window.PAKSTREAM && window.PAKSTREAM.StreamState;
  if (!SS) return;
  const doc = document;

  function wireRadio(el) {
    const id = el.dataset.playerId || ('radio-' + Math.random().toString(36).slice(2));
    el.dataset.playerId = id;
    const container = el.closest('[data-radio-container]') || el.parentElement;

    const api = {
      type: 'radio',
      el,
      play() { try { el.play(); } catch {} container?.classList.add('is-playing'); },
      pause() { try { el.pause(); } catch {} container?.classList.remove('is-playing'); }
    };
    const unregister = SS.register(id, api);

    el.addEventListener('play', () => SS.play(id));
    el.addEventListener('pause', () => {
      if (SS.getCurrentId() === id) { /* keep current unless another starts */ }
      container?.classList.remove('is-playing');
    });
    el.addEventListener('ended', () => {
      if (SS.getCurrentId() === id) SS.stopAll(null);
    });

    // Cleanup on removal
    const obs = new MutationObserver(() => {
      if (!doc.contains(el)) { unregister(); obs.disconnect(); }
    });
    obs.observe(doc, { childList: true, subtree: true });
  }

  function init() {
    doc.querySelectorAll('audio[data-radio], [data-radio] audio').forEach(wireRadio);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
