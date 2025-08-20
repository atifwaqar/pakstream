document.addEventListener('DOMContentLoaded', function () {
  var navToggle = document.getElementById('nav-toggle');
  var nav = document.querySelector('nav');
  var label = document.querySelector('.nav-toggle-label');
  var topBar = document.querySelector('.top-bar');
  var themeToggle = document.getElementById('theme-toggle');
  var overlay = document.querySelector('.nav-overlay');
  if (!navToggle || !nav || !label) return;
  var touchStartX = null;
  var touchStartY = null;

  function updateScrollLock() {
    var navOpen = navToggle && navToggle.checked;
    var channelOpen = document.querySelector('.channel-list.open');
    var detailsOpen = document.querySelector('.details-list.open');
    var sideOpen = window.innerWidth <= 768 && (channelOpen || detailsOpen);
    var anyOpen = navOpen || sideOpen;
    document.body.classList.toggle('no-scroll', anyOpen);
    if (overlay) overlay.classList.toggle('active', anyOpen);
  }
  window.updateScrollLock = updateScrollLock;

  var currentPath = window.location.pathname;
  var links = document.querySelectorAll('.nav-links a');
  links.forEach(function (link) {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  var homePaths = ['/', '/'];
  if (topBar && label && homePaths.indexOf(currentPath) === -1) {
    var backBtn = document.createElement('a');
    backBtn.href = '/';
    backBtn.className = 'back-button';
    backBtn.textContent = '←';
    backBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    });
    topBar.insertBefore(backBtn, label.nextSibling);
  }

  // Add top-bar search on all pages, including the media hub.
  if (topBar) {
    var themeBtn = themeToggle;
    var logoTitle = document.querySelector('.logo-title');
    var searchForm = document.createElement('form');
    searchForm.id = 'search-form';
    searchForm.className = 'search-form';
    searchForm.setAttribute('autocomplete', 'off');
    var input = document.createElement('input');
    input.type = 'search';
    input.id = 'search-input';
    input.placeholder = 'Search...';
    input.setAttribute('aria-label', 'Search');
    input.setAttribute('autocomplete', 'off');
    searchForm.appendChild(input);

    input.addEventListener('focus', function () {
      searchForm.classList.add('active');
      if (logoTitle) logoTitle.setAttribute('hidden', '');
    });

    input.addEventListener('blur', function () {
      searchForm.classList.remove('active');
      if (logoTitle) logoTitle.removeAttribute('hidden');
    });

    var results = document.createElement('div');
    results.id = 'search-results';
    results.className = 'search-results';
    searchForm.appendChild(results);

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
      }
    });

    if (themeBtn) {
      topBar.insertBefore(searchForm, themeBtn);
    } else {
      topBar.appendChild(searchForm);
    }
  }

  label.addEventListener('click', function (e) {
    e.preventDefault();
    navToggle.checked = !navToggle.checked;
    updateScrollLock();
  });

  document.addEventListener('click', function (e) {
    if (navToggle.checked && !nav.contains(e.target) && !label.contains(e.target)) {
      navToggle.checked = false;
      updateScrollLock();
    }
  });

  if (overlay) {
    overlay.addEventListener('click', function (e) {
      e.preventDefault();
      if (navToggle) navToggle.checked = false;
      updateScrollLock();
    });
  }

  document.addEventListener('touchstart', function (e) {
    if (!navToggle.checked) return;
    var t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  });

  document.addEventListener('touchend', function (e) {
    if (!navToggle.checked || touchStartX === null) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchStartX;
    var dy = Math.abs(t.clientY - touchStartY);
    if (dx < -50 && dy < 30) {
      navToggle.checked = false;
      updateScrollLock();
    }
    touchStartX = null;
    touchStartY = null;
  });

  if (themeToggle) {
    var savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  updateScrollLock();

  // Maintain 16:9 aspect ratio for any live-player iframes
  function resizeLivePlayers() {
    document.querySelectorAll('.live-player iframe').forEach(function (iframe) {
      var w = iframe.clientWidth;
      if (w > 0) iframe.style.height = (w * 9 / 16) + 'px';
    });
  }
  window.addEventListener('resize', resizeLivePlayers);
  window.resizeLivePlayers = resizeLivePlayers;
  resizeLivePlayers();

  var scroller = document.querySelector('.station-scroller .scroller-track');
  if (scroller) {
    fetch('/all_streams.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var items = Array.isArray(data.items) ? data.items : [];
        var typeToMode = { livetv: 'tv', tv: 'tv', radio: 'radio', freepress: 'freepress', creator: 'creator' };
        items.forEach(function (it) {
          if (it.status && it.status.active && it.media && it.media.logo_url && !it.media.logo_url.includes('default_radio.png')) {
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
            img.src = it.media.logo_url;
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
