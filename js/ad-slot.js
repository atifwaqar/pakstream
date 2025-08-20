(function () {
  const CONFIG = window.AD_CONFIG || {};
  const sizes = CONFIG.sizes || {};
  const enabled = CONFIG.enabled !== false && !localStorage.getItem('ads-disabled');

  function loadLib() {
    if (window._adLibLoading) return window._adLibLoading;
    window._adLibLoading = new Promise(function (resolve) {
      const s = document.createElement('script');
      s.src = CONFIG.libraryUrl || 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
      s.async = true;
      s.onload = resolve;
      document.head.appendChild(s);
    });
    return window._adLibLoading;
  }

  class Slot {
    constructor(el) {
      this.el = el;
      this.id = el.dataset.slotId;
      this.type = el.dataset.slotType;
      this.priority = el.dataset.priority || 'normal';
      const size = sizes[this.type] || { width: 300, height: 250 };
      this.height = size.height;
      el.style.minHeight = this.height + 'px';
      el.classList.add('ad-slot');
      const label = document.createElement('div');
      label.className = 'ad-label';
      label.textContent = 'Advertisement';
      el.prepend(label);

      if (enabled) {
        this.setup();
      } else {
        this.dispatch('ad_slot_blocked');
      }
    }

    setup() {
      const reduced = window.matchMedia('(prefers-reduced-data: reduce)').matches || (navigator.connection && navigator.connection.saveData);
      if (this.priority === 'low' && reduced) {
        window.addEventListener('scroll', () => this.observe(), { once: true, passive: true });
      } else {
        this.observe();
      }
    }

    observe() {
      this.observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            obs.disconnect();
            this.load();
          }
        });
      }, { rootMargin: '500px' });
      this.observer.observe(this.el);
    }

    load() {
      if (window.pakstreamConsent && window.pakstreamConsent.personalizedAds === false) {
        this.dispatch('ad_slot_blocked');
        return;
      }
      loadLib().then(() => {
        const iframe = document.createElement('iframe');
        iframe.width = '100%';
        iframe.height = this.height;
        iframe.title = 'Advertisement';
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        iframe.tabIndex = -1;
        iframe.src = 'about:blank';
        iframe.addEventListener('load', () => {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          if (doc) {
            doc.body.style.margin = '0';
            doc.body.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#ddd;color:#000;font-size:14px;font-family:sans-serif;">Ad slot</div>';
            this.dispatch('ad_slot_no_fill');
          }
        });
        this.el.appendChild(iframe);
        this.creative = iframe;
        this.trackViewability();
        iframe.addEventListener('click', () => this.dispatch('ad_slot_click'));
      });
    }

    trackViewability() {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.intersectionRatio >= 0.5) {
            setTimeout(() => {
              if (entry.intersectionRatio >= 0.5) {
                this.dispatch('ad_slot_viewable');
                obs.disconnect();
              }
            }, 1000);
          }
        });
      }, { threshold: [0.5] });
      obs.observe(this.el);
    }

    dispatch(name, detail = {}) {
      detail.slotId = this.id;
      detail.slotType = this.type;
      detail.priority = this.priority;
      detail.page = window.location.pathname;
      const max = document.body.scrollHeight - window.innerHeight;
      detail.scrollPercent = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
      document.dispatchEvent(new CustomEvent(name, { detail }));
    }
  }

  function initAdSlots() {
    if (!enabled) return;
    document.querySelectorAll('.ad-slot').forEach(el => new Slot(el));
  }

  window.initAdSlots = initAdSlots;
  document.addEventListener('DOMContentLoaded', initAdSlots);
})();
