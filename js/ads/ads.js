// Basic ad-slot scaffolding with CLS-safe placeholders
(function () {
  const Flags = window.PAKSTREAM?.Flags;
  const Cfg = window.PAKSTREAM?.AdsConfig;
  if (!Cfg) return;

  function applyReserveBox(slot) {
    // Read size from data attributes or named type
    const type = slot.dataset.adType || 'rectangle';
    const w = Number(slot.dataset.adWidth  || Cfg.SIZES[type]?.w || 300);
    const h = Number(slot.dataset.adHeight || Cfg.SIZES[type]?.h || 250);

    // Reserve space to prevent CLS
    slot.style.minWidth  = w > 1 ? w + 'px' : '';
    slot.style.minHeight = h > 1 ? h + 'px' : '';
    // Add a lightweight placeholder while empty
    if (!slot.querySelector('.ad-placeholder')) {
      const ph = document.createElement('div');
      ph.className = 'ad-placeholder';
      ph.textContent = slot.dataset.placeholder || 'Advertisement';
      slot.appendChild(ph);
    }
  }

  function init() {
    const slots = document.querySelectorAll('[data-ad-slot]');
    if (!slots.length) return;
    slots.forEach(applyReserveBox);

    // Only proceed with real init if flag is on
    if (!Flags?.isOn('adsEnabled')) return;

    // PLACEHOLDER: Where network-specific code would live (AdSense / GAM / etc.)
    // For now, just mark slots as "ready" to validate styling and layout safety.
    slots.forEach((slot) => {
      slot.classList.add('is-ready');
      // Example pseudo init: when you later integrate AdSense, replace this block.
      // DO NOT include third-party code yet.
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
