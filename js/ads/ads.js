(() => {
  if (window.__ADS_WIRED__) return;
  window.__ADS_WIRED__ = true;

  const FLAGS = window.__PAKSTREAM_FLAGS || {};
  const PRESETS = window.__PAKSTREAM_AD_PRESETS || {};
  const log = (...a) => FLAGS.adsDebug && console.log('[ads]', ...a);

  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function reserve(el) {
    // Inject a reserved child only once
    if (el.__reserved) return;
    const box = document.createElement('div');
    box.className = 'ad-reserved';
    box.textContent = el.getAttribute('data-placeholder') || 'Advertisement';
    el.appendChild(box);
    el.__reserved = true;
  }

  function applyPreset(el) {
    const preset = el.getAttribute('data-ad-preset');
    if (!preset || !PRESETS[preset]) return;
    const { size } = PRESETS[preset];
    if (size && !el.getAttribute('data-ad-size')) {
      el.setAttribute('data-ad-size', size);
    }
  }

  function hydrate(el) {
    if (el.__hydrated) return;
    el.__hydrated = true;

    // For now, place a lightweight placeholder creative (no network calls)
    const inner = document.createElement('div');
    inner.style.width = '100%';
    inner.style.height = '100%';
    inner.style.display = 'flex';
    inner.style.alignItems = 'center';
    inner.style.justifyContent = 'center';
    inner.style.font = '600 12px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    inner.style.background = 'transparent';
    inner.textContent = 'Ad Placeholder';

    // Replace reserved child
    el.innerHTML = '';
    el.appendChild(inner);
    log('hydrated', el);
  }

  function initAds(root=document) {
    const slots = qsa('.ad-slot', root);
    if (slots.length === 0) return;

    // Always reserve to prevent CLS, even when ads are disabled
    slots.forEach(el => { applyPreset(el); reserve(el); });

    if (!FLAGS.ads) {
      log('ads disabled; reserved only');
      return;
    }

    // Lazy hydrate using IntersectionObserver
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          hydrate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px', threshold: [0.5] });

    slots.forEach(el => io.observe(el));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAds(document), { once: true });
  } else {
    initAds(document);
  }
  window.addEventListener('pakstream:rerender', () => initAds(document));
})();
