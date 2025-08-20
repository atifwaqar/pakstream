(function () {
  // Toggle diagnostics with Ctrl+Alt+D
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'd') {
      const flags = (window.__PAKSTREAM_FLAGS = window.__PAKSTREAM_FLAGS || {});
      const current = !!flags.debugDiagnostics;
      const next = !current;
      flags.debugDiagnostics = next;
      if (window.PAKSTREAM?.Flags?.set) {
        window.PAKSTREAM.Flags.set('debugDiagnostics', next);
      }
      console.clear();
      console.log(`🔧 PakStream Diagnostics ${next ? 'ENABLED' : 'DISABLED'}`);
      if (next && window.PAKSTREAM?.Diagnostics?.run) {
        window.PAKSTREAM.Diagnostics.run();
      }
    }
  });

  const F = (window.PAKSTREAM && window.PAKSTREAM.Flags) || { isOn: () => false };

  function run() {
    const out = [];
    const ok = (k, pass, extra = '') => out.push({ k, pass, extra });

    // Check critical hooks
    ok('document readyState', /interactive|complete/.test(document.readyState));
    ok('manifest link', !!document.querySelector('link[rel="manifest"]'));
    ok('service worker support', 'serviceWorker' in navigator);

    // Overlay/menu hooks (harmless if missing)
    ok('[data-overlay] exists', !!document.querySelector('[data-overlay]'));
    ok('[data-nav-toggle] exists', !!document.querySelector('[data-nav-toggle]'));
    ok('#site-nav exists', !!document.getElementById('site-nav'));

    // Stream modules (harmless if not yet added)
    ok('StreamState loaded', !!(window.PAKSTREAM && window.PAKSTREAM.StreamState));
    ok('ErrorOverlay loaded', !!(window.PAKSTREAM && window.PAKSTREAM.ErrorOverlay));

    // PWA registration check
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(regs => {
          ok('SW registered', regs && regs.length > 0, regs.map(r => r.scope).join(', '));
          dump();
        })
        .catch(() => dump());
    } else {
      dump();
    }

    function dump() {
      const pass = out.filter(x => x.pass).length;
      const fail = out.length - pass;
      const style = (p) => p ? 'color: #2e7d32' : 'color: #c62828';
      console.groupCollapsed('%cPakStream Diagnostics%c  pass:' + pass + '  fail:' + fail, 'font-weight:700', '');
      out.forEach(({ k, pass, extra }) => console.log('%c' + (pass ? '\u2713\uFE0E ' : '\u2717\uFE0E ') + k, style(pass), extra || ''));
      console.groupEnd();
    }
  }

  window.PAKSTREAM = window.PAKSTREAM || {};
  window.PAKSTREAM.Diagnostics = { run };

  if (F.isOn('debugDiagnostics')) run();
})();
