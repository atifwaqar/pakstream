(function () {
  const KEY = 'pak-consent';

  function save(consent) {
    localStorage.setItem(KEY, JSON.stringify(consent));
    window.pakstreamConsent = consent;
  }

  function openDialog() {
    if (document.getElementById('consent-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'consent-overlay';
    overlay.className = 'consent-overlay';
    overlay.innerHTML = `
      <div class="consent-dialog" role="dialog" aria-modal="true" aria-labelledby="consent-title" tabindex="-1">
        <h2 id="consent-title">Privacy & Ads</h2>
        <p>We use cookies and local storage to personalise ads. You can accept or reject.</p>
        <div class="consent-actions">
          <button id="consent-accept">Accept all</button>
          <button id="consent-reject">Reject all</button>
          <button id="consent-manage">Manage choices</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const dialog = overlay.querySelector('.consent-dialog');
    dialog.focus();

    function close() {
      overlay.remove();
    }
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    overlay.querySelector('#consent-accept').addEventListener('click', () => {
      save({ personalizedAds: true });
      close();
      window.initAdSlots && window.initAdSlots();
    });
    overlay.querySelector('#consent-reject').addEventListener('click', () => {
      save({ personalizedAds: false });
      close();
    });
    overlay.querySelector('#consent-manage').addEventListener('click', () => {
      // For now manage behaves same as reopen; keeping placeholder
      close();
      openDialog();
    });
  }

  function init() {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      window.pakstreamConsent = JSON.parse(stored);
    } else {
      openDialog();
    }
    document.querySelectorAll('[data-open-consent]').forEach(el => {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openDialog();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  window.openConsentSettings = openDialog;
})();
