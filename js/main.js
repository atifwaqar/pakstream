document.addEventListener('DOMContentLoaded', function () {
  var navToggle = document.getElementById('nav-toggle');
  var nav = document.querySelector('nav');
  var label = document.querySelector('.nav-toggle-label');
  var topBar = document.querySelector('.top-bar');
  var themeToggle = document.getElementById('theme-toggle');
  if (!navToggle || !nav || !label) return;
  var touchStartX = null;
  var touchStartY = null;

  function updateScrollLock() {
    var navOpen = navToggle && navToggle.checked;
    var sideOpen = document.querySelector('.channel-list.open, .details-list.open');
    document.body.classList.toggle('no-scroll', navOpen || !!sideOpen);
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

  if (topBar) {
    var themeBtn = themeToggle;
    var logoTitle = document.querySelector('.logo-title');
    var searchForm = document.createElement('form');
    searchForm.id = 'search-form';
    searchForm.className = 'search-form';
    var input = document.createElement('input');
    input.type = 'search';
    input.id = 'search-input';
    input.placeholder = 'Search...';
    input.setAttribute('aria-label', 'Search');
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
      var sources = [
        { url: '/channels.json', map: c => ({ name: c.name, link: '/livetv.html?tvchannel=' + c.id }) },
        { url: '/freepress_channels.json', map: c => ({ name: c.name, link: '/freepress.html?newsanchor=' + c.key }) },
        { url: '/radio_channels.json', map: c => ({ name: c.name, link: '/radio.html?station=' + c.id }) }
      ];
      return Promise.all(
        sources.map(s =>
          fetch(s.url)
            .then(r => r.json())
            .then(data => (Array.isArray(data) ? data : data.channels || []).map(s.map))
        )
      ).then(res => {
        searchData = res.flat();
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
