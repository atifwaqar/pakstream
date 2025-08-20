// js/maintenance.js
(function () {
  // Allow bypass: ?live=1 on URL
  const params = new URLSearchParams(location.search);
  if (params.get('live') === '1') return;

  const flags = (window.__PAKSTREAM_FLAGS || {});
  const on = !!flags.maintenance;

  // Don't redirect from the maintenance page itself
  const isMaintenancePage = /\/maintenance\.html$/i.test(location.pathname);

  if (on && !isMaintenancePage) {
    const from = encodeURIComponent(location.pathname + location.search + location.hash);
    location.replace('/maintenance.html?from=' + from);
  }
})();
