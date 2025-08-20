(() => {
  if (window.__NAV_WIRED__) return;
  window.__NAV_WIRED__ = true;

  // ===== Configurable selectors =====
  const SEL = {
    opener: '#nav-toggle, .nav-toggle, .nav-toggle-button',
    menu:   '#primary-navigation, .primary-navigation, nav[aria-label="Primary"]',
    overlay: '.nav-overlay, .overlay.nav-overlay',
    close:  '.nav-close, .menu-close, [data-nav-close]'
  };

  const DESKTOP_BP = 1024; // px

  // ===== Utilities =====
  const qs  = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const on  = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  const body = document.body;
  const opener = qs(SEL.opener);
  const menu   = qs(SEL.menu);
  const overlay = qs(SEL.overlay) || createOverlay();
  const closeBtns = qsa(SEL.close, menu);

  if (!opener || !menu || !overlay) return;

  opener.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-hidden', 'true');

  // ===== Focus helpers =====
  const FOCUSABLE = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex^="-"])'
  ].join(',');

  let openerWasFocused = false;

  function firstFocusable(root) {
    return qs(FOCUSABLE, root) || root;
  }

  function trapFocus(e) {
    if (!menu.classList.contains('is-open')) return;
    if (e.key !== 'Tab') return;
    const f = qsa(FOCUSABLE, menu).filter(el => el.offsetParent !== null);
    if (f.length === 0) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  // ===== Overlay factory (if missing) =====
  function createOverlay() {
    const el = document.createElement('div');
    el.className = 'nav-overlay';
    el.setAttribute('hidden', '');
    document.body.appendChild(el);
    return el;
  }

  // ===== Open/Close =====
  function openNav() {
    menu.classList.add('is-open');
    overlay.classList.add('is-visible');
    overlay.removeAttribute('hidden');
    body.classList.add('scroll-locked');
    opener.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
    openerWasFocused = (document.activeElement === opener);
    const target = firstFocusable(menu);
    setTimeout(() => target.focus({preventScroll:true}), 0);
    if (typeof window.updateScrollLock === 'function') window.updateScrollLock();
  }

  function closeNav() {
    menu.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    overlay.setAttribute('hidden', '');
    body.classList.remove('scroll-locked');
    opener.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    if (openerWasFocused) {
      setTimeout(() => opener.focus({preventScroll:true}), 0);
    }
    if (typeof window.updateScrollLock === 'function') window.updateScrollLock();
  }

  function toggleNav() {
    if (menu.classList.contains('is-open')) closeNav();
    else openNav();
  }

  // ===== Events =====
  on(opener, 'click', (e) => { e.preventDefault(); toggleNav(); });
  on(overlay, 'click', closeNav);
  closeBtns.forEach(btn => on(btn, 'click', closeNav));

  on(document, 'keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      e.preventDefault(); closeNav();
    } else {
      trapFocus(e);
    }
  });

  qsa('a[href]', menu).forEach(a => {
    on(a, 'click', () => {
      closeNav();
    });
  });

  let resizeTimer = 0;
  on(window, 'resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth >= DESKTOP_BP) closeNav();
    }, 100);
  });

  on(document, 'visibilitychange', () => {
    if (document.visibilityState === 'hidden') closeNav();
  });
  on(window, 'popstate', () => closeNav());

})();

document.addEventListener('DOMContentLoaded', function () {
  var navLabel = document.querySelector('.nav-toggle-label');
  var topBar = document.querySelector('.top-bar');
  var themeToggle = document.getElementById('theme-toggle');
  var navigation = document.getElementById('primary-navigation');

  function updateScrollLock() {
    var menu = document.querySelector('#primary-navigation, .primary-navigation, nav[aria-label="Primary"]');
    var navOpen = menu && menu.classList.contains('is-open');
    var channelOpen = document.querySelector('.channel-list.open');
    var detailsOpen = document.querySelector('.details-list.open');
    var sideOpen = window.innerWidth <= 768 && (channelOpen || detailsOpen);
    var anyOpen = navOpen || sideOpen;
    document.body.classList.toggle('scroll-locked', anyOpen);
  }
  window.updateScrollLock = updateScrollLock;

  var currentPath = window.location.pathname;
  var links = navigation ? navigation.querySelectorAll('.nav-links a') : [];
  links.forEach(function (link) {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  var homePaths = ['/', '/'];
  if (topBar && navLabel && homePaths.indexOf(currentPath) === -1) {
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
    topBar.insertBefore(backBtn, navLabel.nextSibling);
  }

  // Add top-bar search on all pages, including the media hub.
  if (topBar) {
    var themeBtn = themeToggle;
    var logoTitle = document.querySelector('.logo');
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
        if(matches.length === 0){
          var empty = document.createElement('div');
          empty.className = 'empty-state';
          empty.innerHTML = '<p>No results found</p>';
          var sugg = document.createElement('div');
          sugg.className = 'suggestions';
          ['news','music','talk','drama','sports'].forEach(function(cat){
            var a = document.createElement('a');
            a.href = '/media-hub.html?topic=' + cat;
            a.textContent = cat.charAt(0).toUpperCase()+cat.slice(1);
            a.className = 'chip';
            a.addEventListener('click', function(){ if(window.analytics) analytics('empty_state_action',{action:'suggestion_click'}); });
            sugg.appendChild(a);
          });
          empty.appendChild(sugg);
          results.appendChild(empty);
          if(window.analytics) analytics('empty_state_view',{context:'search'});
          return;
        }
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

    if (navigation && themeBtn) {
      navigation.insertBefore(searchForm, themeBtn);
    } else if (navigation) {
      navigation.appendChild(searchForm);
    }
  }


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
