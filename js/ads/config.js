// Feature flags: merge into existing flags object if present
window.__PAKSTREAM_FLAGS = Object.assign({
  ads: false,            // default off (safe)
  adsDebug: false        // optional debug logging
}, window.__PAKSTREAM_FLAGS || {});

// Preset mapping for convenience
window.__PAKSTREAM_AD_PRESETS = {
  homepage_top:   { size: '728x90',  responsive: true },
  homepage_mid:   { size: '336x280', responsive: true },
  homepage_bottom:{ size: '300x250', responsive: true },
  sidebar_top:    { size: '300x250', responsive: true },
  hub_inline:     { size: '320x100', responsive: true }
};
