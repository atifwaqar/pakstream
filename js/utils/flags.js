(function () {
  const defaults = {
    newPalette: false,
    adsEnabled: false,
    mediaHubV2: false,
    debugDiagnostics: false
  };

  // Merge defaults with any pre-set global flags (e.g., from inline script)
  const globalFlags = (window.__PAKSTREAM_FLAGS && typeof window.__PAKSTREAM_FLAGS === 'object')
    ? window.__PAKSTREAM_FLAGS
    : {};

  const flags = Object.assign({}, defaults, globalFlags);

  function isOn(name) { return !!flags[name]; }
  function set(name, value) { flags[name] = !!value; }
  function all() { return Object.assign({}, flags); }

  window.PAKSTREAM = window.PAKSTREAM || {};
  window.PAKSTREAM.Flags = { isOn, set, all };
})();
