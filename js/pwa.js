(() => {
  if (!('serviceWorker' in navigator)) return;

  const FLAGS = window.__PAKSTREAM_FLAGS || {};
  const SW_PATH = '/sw.js';

  // Console helper to unregister and clear caches
  window.PAKSTREAM_SW_RESET = async function () {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    console.log('[pwa] service workers unregistered and caches cleared');
  };

  if (!FLAGS.sw) {
    // If a SW exists but flag is off, unregister it (dev convenience)
    navigator.serviceWorker.getRegistrations().then(regs => {
      if (regs.length && FLAGS.swDebug) console.log('[pwa] flag off → unregister existing SW');
      regs.forEach(r => r.unregister());
    });
    return;
  }

  // Register the minimal SW
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(SW_PATH)
      .then(reg => {
        if (FLAGS.swDebug) console.log('[pwa] registered', reg);
      })
      .catch(err => {
        console.warn('[pwa] registration failed', err);
      });
  });
})();

