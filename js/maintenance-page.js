// js/maintenance-page.js
(function () {
  const $ = (s) => document.querySelector(s);
  const p = new URLSearchParams(location.search);
  const from = p.get('from');
  if (from) {
    const el = $('#origin');
    if (el) el.textContent = 'Original page: ' + decodeURIComponent(from);
  }
  const retry = $('#retry');
  if (retry) {
    retry.addEventListener('click', () => {
      // Retry original page if known, else home; add ?live=1 to bypass gate
      const target = from ? decodeURIComponent(from) : '/';
      const url = target.includes('?') ? target + '&live=1' : target + '?live=1';
      location.href = url;
    });
  }
})();
