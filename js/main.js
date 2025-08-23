if (window.PAKSTREAM?.Flags?.isOn('newPalette')) {
  document.documentElement.classList.add('theme-new');
}

// Example: only render ad slots if ads are enabled
if (window.PAKSTREAM?.Flags?.isOn('adsEnabled')) {
  // initAds();
}

document.addEventListener('DOMContentLoaded', function () {
  var topBar = document.querySelector('.top-bar');
  var btn = document.querySelector('[data-nav-toggle]');
  var currentPath = window.location.pathname;
  var links = document.querySelectorAll('.nav-links a');
  links.forEach(function (link) {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  // Search form setup: use existing form if present, otherwise inject into top bar.
  var searchForm = document.getElementById('search-form');
  var input, results;

  if (!searchForm && topBar) {
    searchForm = document.createElement('form');
    searchForm.id = 'search-form';
    searchForm.className = 'search-form';
    searchForm.setAttribute('autocomplete', 'off');
    input = document.createElement('input');
    input.type = 'search';
    input.id = 'search-input';
    input.placeholder = 'Search anything...';
    input.setAttribute('aria-label', 'Search');
    input.setAttribute('autocomplete', 'off');
    searchForm.appendChild(input);
    results = document.createElement('div');
    results.id = 'search-results';
    results.className = 'search-results';
    searchForm.appendChild(results);

    var center = topBar.querySelector('.top-bar-center');
    if (center) {
      center.appendChild(searchForm);
    } else {
      topBar.appendChild(searchForm);
    }
  } else if (searchForm) {
    input = searchForm.querySelector('#search-input') || searchForm.querySelector('input[type="search"]');
    results = searchForm.querySelector('#search-results') || searchForm.querySelector('.search-results');
  }

  if (searchForm && input && results) {
    function activateSearch() {
      searchForm.classList.add('active');
    }

    function deactivateSearch() {
      searchForm.classList.remove('active');
    }

    input.addEventListener('focus', activateSearch);
    input.addEventListener('blur', deactivateSearch);

    var searchData = [];
    var loaded = false;
    function loadData() {
      if (loaded) return Promise.resolve(searchData);
      return fetch('/all_streams.json')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var items = Array.isArray(data.items) ? data.items : [];
          var typeToMode = { livetv: 'tv', tv: 'tv', radio: 'radio', freepress: 'freepress', creator: 'creator' };
          searchData = items.map(function (it) {
            var mode = typeToMode[it.type] || 'tv';
            var channelId = it.type === 'radio' && it.ids && it.ids.internal_id
              ? it.ids.internal_id
              : it.key;
            return {
              name: it.name,
              link: '/media-hub.html?c=' + encodeURIComponent(channelId) + '&m=' + mode
            };
          });
          loaded = true;
          return searchData;
        });
    }

    // Ensure the first interaction focuses the input without losing focus
    input.addEventListener('pointerdown', function (e) {
      if (document.activeElement !== input) {
        e.preventDefault();
        activateSearch();
        input.focus({ preventScroll: true });
      }
    });

    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      results.innerHTML = '';
      if (!q) return;
      loadData().then(function () {
        var matches = searchData.filter(item => item.name.toLowerCase().includes(q));
        matches.slice(0, 10).forEach(function (item) {
          var a = document.createElement('a');
          a.href = item.link;
          a.textContent = item.name;
          results.appendChild(a);
        });
      });
    });

    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim().toLowerCase();
      if (!q) return;
      loadData().then(function () {
        var matches = searchData.filter(item => item.name.toLowerCase().includes(q));
        if (matches.length > 0) {
          window.location.href = matches[0].link;
        }
      });
    });

    document.addEventListener('click', function (e) {
      if (!searchForm.contains(e.target)) {
        results.innerHTML = '';
        deactivateSearch();
      }
    });
  }

  var savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Maintain 16:9 aspect ratio for live-player iframes and radio players
  function resizeLivePlayers() {
    document.querySelectorAll('.live-player iframe').forEach(function (el) {
      var w = el.clientWidth;
      if (w > 0) el.style.height = (w * 9 / 16) + 'px';
    });

    document.querySelectorAll('.radio-player').forEach(function (el) {
      var w = el.clientWidth;
      if (w > 0) {
        el.style.height = (w * 9 / 16) + 'px';
        var overflow = el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
        el.classList.toggle('compact', overflow);
        var stationInfo = el.querySelector('.station-info');
        var controls = el.querySelector('.controls');
        if (controls) controls.style.setProperty('--btn-size', '40px');
        if (overflow && stationInfo && controls) {
          var availableHeight = el.clientHeight - stationInfo.offsetHeight;
          var availableWidth = el.clientWidth;
          var scaleH = availableHeight / controls.scrollHeight;
          var scaleW = availableWidth / controls.scrollWidth;
          var scale = Math.min(scaleH, scaleW, 1);
          if (scale < 1) {
            controls.style.setProperty('--btn-size', (40 * scale) + 'px');
          }
        }
      }
    });
  }
  window.addEventListener('resize', resizeLivePlayers);
  window.resizeLivePlayers = resizeLivePlayers;
  resizeLivePlayers();

  // Limit iframe height so internal content can scroll
  function resizeMediaHubEmbeds() {
    document.querySelectorAll('.media-hub-embed').forEach(function (iframe) {
      try {
        var doc = iframe.contentWindow.document;
        var scrollHeight = Math.max(
          doc.body.scrollHeight,
          doc.documentElement.scrollHeight,
        );
        var maxHeight = 210;
        var h = Math.min(scrollHeight, maxHeight);
        iframe.style.height = h + 'px';
      } catch (e) {
        // Ignore cross-origin frames
      }
    });
  }
  window.addEventListener('resize', resizeMediaHubEmbeds);
  document.querySelectorAll('.media-hub-embed').forEach(function (iframe) {
    iframe.setAttribute('scrolling', 'auto');
    iframe.addEventListener('load', resizeMediaHubEmbeds);
  });
  resizeMediaHubEmbeds();

  var scroller = document.querySelector('.station-scroller .scroller-track');
  if (scroller) {
    fetch('/all_streams.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var items = Array.isArray(data.items) ? data.items : [];
        var typeToMode = { livetv: 'tv', tv: 'tv', radio: 'radio', freepress: 'freepress', creator: 'creator' };
        items.forEach(function (it) {
          if (it.status && it.status.active && it.media && it.media.thumbnail_url && !it.media.thumbnail_url.includes('default_radio.png')) {
            var mode = typeToMode[it.type] || 'tv';
            var channelId = it.type === 'radio' && it.ids && it.ids.internal_id
              ? it.ids.internal_id
              : it.key;
            var a = document.createElement('a');
            a.href = '/media-hub.html?c=' + encodeURIComponent(channelId) + '&m=' + mode;
            a.title = it.name || '';
            a.setAttribute('role', 'listitem');
            a.setAttribute('aria-label', it.name || '');
            var img = document.createElement('img');
            img.src = it.media.thumbnail_url;
            img.alt = it.name || '';
            img.className = 'channel-thumb';
            a.appendChild(img);
            scroller.appendChild(a);
          }
        });
        scroller.innerHTML += scroller.innerHTML;
        initStationScroller();
        initStationScrollerControls();
      })
      .catch(function (err) {
        console.error('Failed to load station logos', err);
      });
  }

  function initStationScroller() {
    var wrap = document.querySelector('.station-scroller');
    var track = wrap.querySelector('.scroller-track');
    var prev = wrap.querySelector('.scroll-btn.prev');
    var next = wrap.querySelector('.scroll-btn.next');
    var base = 0.3;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      base = 0;
    }
    var direction = -1;
    var speed = base * direction;
    var offset = 0;
    var trackWidth = track.scrollWidth / 2;

    window.setScrollSpeed = function (v) {
      base = v;
      speed = base * direction;
    };

    function normalize() {
      if (offset <= -trackWidth) offset += trackWidth;
      if (offset >= 0) offset -= trackWidth;
    }

    window.addEventListener('resize', function () {
      trackWidth = track.scrollWidth / 2;
      normalize();
    });

    function frame() {
      offset += speed;
      normalize();
      track.style.transform = 'translateX(' + offset + 'px)';
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    prev && prev.addEventListener('click', function () {
      offset += 200;
      normalize();
      direction = 1;
      speed = base * direction;
    });
    next && next.addEventListener('click', function () {
      offset -= 200;
      normalize();
      direction = -1;
      speed = base * direction;
    });
  }

  function initStationScrollerControls() {
    const wrap = document.querySelector('.station-scroller-wrap');
    const scroller = wrap?.querySelector('.station-scroller');
    const toggleBtn = wrap?.querySelector('.scroller-toggle');
    if (!wrap || !scroller || !toggleBtn) return;

    let paused = false;
    const SPEED_ACTIVE = 0.3;
    const SPEED_PAUSED = 0;

    function applySpeed() {
      const v = paused ? SPEED_PAUSED : SPEED_ACTIVE;
      if (typeof setScrollSpeed === 'function') setScrollSpeed(v);
      else scroller.dataset.speed = String(v);
    }

    function setPaused(next) {
      paused = next;
      applySpeed();
      toggleBtn.setAttribute('aria-pressed', String(paused));
      toggleBtn.textContent = paused ? 'Resume' : 'Pause';
      toggleBtn.setAttribute('aria-label', paused ? 'Resume scrolling' : 'Pause scrolling');
    }

    toggleBtn.addEventListener('click', () => setPaused(!paused));
    scroller.addEventListener('mouseenter', () => setPaused(true));
    scroller.addEventListener('mouseleave', () => setPaused(false));
    scroller.addEventListener('focusin', () => setPaused(true));
    scroller.addEventListener('focusout', () => setPaused(false));
    scroller.addEventListener('touchstart', () => setPaused(true), { passive: true });
    scroller.addEventListener('touchend', () => setPaused(false), { passive: true });
    scroller.addEventListener('touchcancel', () => setPaused(false), { passive: true });
    scroller.addEventListener('keydown', function (e) {
      if (e.code === 'Space') {
        e.preventDefault();
        setPaused(!paused);
      }
    });

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setPaused(prefersReduced);
  }

  if ('IntersectionObserver' in window) {
    const lazyElements = document.querySelectorAll('img[data-src], iframe[data-src]');
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.src = el.dataset.src;
          el.removeAttribute('data-src');
          obs.unobserve(el);
        }
      });
    });
    lazyElements.forEach(el => observer.observe(el));
  } else {
    document.querySelectorAll('img[data-src], iframe[data-src]').forEach(el => {
      el.src = el.dataset.src;
      el.removeAttribute('data-src');
    });
  }
});

// Unified menu + overlay controller
(function () {
  const doc = document;
  const html = doc.documentElement;
  const btn = doc.querySelector('[data-nav-toggle]');
  const nav = doc.getElementById('site-nav');
  const overlay = doc.querySelector('[data-overlay]');
  if (!btn || !nav || !overlay) return;

  let lastFocus = null;

  function openMenu() {
    if (html.classList.contains('is-menu-open')) return;
    lastFocus = doc.activeElement;
    html.classList.add('is-menu-open');
    btn.setAttribute('aria-expanded', 'true');
    overlay.hidden = false;
    overlay.classList.add('is-active');
    // Focus first focusable in nav, fallback to nav
    const focusable = nav.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
    (focusable || nav).focus({ preventScroll: true });
  }

  function closeMenu() {
    if (!html.classList.contains('is-menu-open')) return;
    html.classList.remove('is-menu-open');
    btn.setAttribute('aria-expanded', 'false');
    overlay.classList.remove('is-active');
    // Delay to avoid flicker before hiding
    setTimeout(() => { overlay.hidden = true; }, 200);
    // Restore focus
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus({ preventScroll: true });
    } else {
      btn.focus({ preventScroll: true });
    }
  }

  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    expanded ? closeMenu() : openMenu();
  });

  overlay.addEventListener('click', closeMenu);

  // Close on ESC anywhere
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  // Close on focus leaving nav via tabbing (basic containment)
  nav.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = nav.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && doc.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && doc.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  // Optional: close when a nav link is clicked (good for single-page sections)
  nav.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.closest('a')) closeMenu();
  });
})();

(function(){
  var loaded=false;
  function loadAds(){
    if(loaded) return;
    loaded=true;
    var s=document.createElement('script');
    s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5427964157655690';
    s.async=true;
    s.crossOrigin='anonymous';
    document.head.appendChild(s);
  }
  function onUserInteraction(){
    loadAds();
    window.removeEventListener('scroll', onUserInteraction);
    window.removeEventListener('mousemove', onUserInteraction);
    window.removeEventListener('touchstart', onUserInteraction);
  }
  window.addEventListener('scroll', onUserInteraction, {once:true});
  window.addEventListener('mousemove', onUserInteraction, {once:true});
  window.addEventListener('touchstart', onUserInteraction, {once:true});
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function (err) {
      console.error('Service worker registration failed', err);
    });
  });
}
