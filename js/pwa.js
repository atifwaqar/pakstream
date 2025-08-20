(function () {
  let deferredPrompt = null;
  const installBtn = document.getElementById('install-btn');

  function showInstallUI() {
    if (installBtn) installBtn.hidden = false;
    document.querySelectorAll('#consent-install').forEach(btn => btn.hidden = false);
    document.dispatchEvent(new Event('pwa-install-available'));
    maybeShowBanner();
    window.dataLayer && window.dataLayer.push({ event: 'pwa_install_prompt_shown' });
  }

  function maybeShowBanner() {
    if (localStorage.getItem('pwa-banner-dismissed')) return;
    const banner = document.createElement('div');
    banner.id = 'install-banner';
    banner.className = 'install-banner';
    banner.innerHTML = '<span>Install PakStream?</span> <button id="banner-install">Install</button> <button id="banner-dismiss">Dismiss</button>';
    document.body.appendChild(banner);
    document.getElementById('banner-install').addEventListener('click', () => {
      promptInstall();
      dismiss();
    });
    document.getElementById('banner-dismiss').addEventListener('click', dismiss);
    function dismiss() {
      banner.remove();
      localStorage.setItem('pwa-banner-dismissed', 'yes');
    }
  }

  function promptInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(() => {
      deferredPrompt = null;
    });
  }
  window.promptInstall = promptInstall;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallUI();
  });

  if (installBtn) {
    installBtn.addEventListener('click', promptInstall);
  }

  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.hidden = true;
    window.dataLayer && window.dataLayer.push({ event: 'pwa_installed' });
  });

  // Service Worker registration and updates
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      if (reg.waiting) {
        showUpdateToast(reg);
        window.dataLayer && window.dataLayer.push({ event: 'sw_update_available' });
      }
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast(reg);
            window.dataLayer && window.dataLayer.push({ event: 'sw_update_available' });
          }
        });
      });
    });

    let refreshing;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
      window.dataLayer && window.dataLayer.push({ event: 'sw_updated' });
    });

    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'json-fallback') {
        showCacheLabel();
      }
    });
  }

  function showUpdateToast(reg) {
    const toast = document.createElement('div');
    toast.className = 'sw-toast';
    toast.innerHTML = '<span>Update available</span> <button id="sw-update">Reload</button>';
    document.body.appendChild(toast);
    document.getElementById('sw-update').addEventListener('click', () => {
      reg.waiting && reg.waiting.postMessage('skipWaiting');
      toast.remove();
    });
  }

  function updateOnline() {
    const offline = !navigator.onLine;
    document.querySelectorAll('button.play-pause-btn').forEach(btn => {
      if (offline) {
        if (!btn.dataset.offText) btn.dataset.offText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Connect to play';
      } else {
        btn.disabled = false;
        if (btn.dataset.offText) btn.textContent = btn.dataset.offText;
      }
    });
  }
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);
  document.addEventListener('DOMContentLoaded', updateOnline);

  if ((navigator.connection && navigator.connection.saveData) || window.matchMedia('(prefers-reduced-data: reduce)').matches) {
    document.querySelectorAll('link[rel="prefetch"]').forEach(l => l.remove());
  }

  function showCacheLabel() {
    let el = document.getElementById('cache-label');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cache-label';
      el.className = 'cache-label';
      el.textContent = 'from cache';
      document.body.appendChild(el);
    }
  }
})();
