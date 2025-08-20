// js/now-playing.js
(function () {
  const SS = window.PAKSTREAM?.StreamState;
  if (!SS) return;

  function applyBadge(container, on) {
    if (!container) return;
    let badge = container.querySelector('.ps-now-playing');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'ps-now-playing';
      badge.innerHTML = '<span class="dot" aria-hidden="true"></span><span class="txt">Now Playing</span>';
      container.appendChild(badge);
    }
    container.classList.toggle('has-now-playing', !!on);
    badge.hidden = !on;
  }

  // On change, toggle badge on the active container; remove from others
  SS.onChange(({ currentId }) => {
    document.querySelectorAll('[data-stream-container]').forEach(cont => {
      const el = cont.querySelector('[data-radio], [data-youtube]');
      const id = el?.dataset.playerId;
      applyBadge(cont, id && id === currentId);
    });
  });

  // When first loaded, clear all badges
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-stream-container]').forEach(cont => applyBadge(cont, false));
  });
})();
