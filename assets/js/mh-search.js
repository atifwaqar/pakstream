// assets/js/mh-search.js
(function () {
  const Core = window.PAKSTREAM?.MHCore;
  if (!Core) return;

  function init(root) {
    if (!root || root.__mhSearch) return;
    root.__mhSearch = true;
    const input = root.querySelector('[data-mh-search-input]');
    const list = root.querySelector('[data-mh-list]');
    if (!input || !list) return;

    function filterCards(q) {
      const cards = list.querySelectorAll('[data-mh-card]');
      const query = (q || '').trim().toLowerCase();
      cards.forEach(card => {
        const text = (card.dataset.search || card.textContent || '').toLowerCase();
        const show = !query || text.includes(query);
        card.style.display = show ? '' : 'none';
      });
    }

    input.addEventListener('input', (e) => filterCards(e.target.value));
  }

  function auto() {
    document.querySelectorAll('[data-mh]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', auto);
  } else { auto(); }
})();
