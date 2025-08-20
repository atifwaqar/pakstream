// Per-slot default sizes and settings for ads
(function () {
  window.PAKSTREAM = window.PAKSTREAM || {};
  // Per-slot default sizes (mobile-first; can be overridden via data attributes)
  const SIZES = {
    banner:      { w: 320, h: 50 },   // small mobile banner
    leaderboard: { w: 728, h: 90 },   // desktop top banner
    rectangle:   { w: 300, h: 250 },  // sidebar/content block
    skyscraper:  { w: 300, h: 600 },  // tall sidebar
    fluid:       { w: 1,   h: 1   }   // responsive (height controlled by CSS)
  };
  window.PAKSTREAM.AdsConfig = { SIZES };
})();
