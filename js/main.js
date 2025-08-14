document.addEventListener('DOMContentLoaded', function () {
  var navToggle = document.getElementById('nav-toggle');
  var nav = document.querySelector('nav');
  var label = document.querySelector('.nav-toggle-label');
  if (!navToggle || !nav || !label) return;

  var currentPath = window.location.pathname;
  var links = document.querySelectorAll('.nav-links a');
  links.forEach(function (link) {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  var topBar = document.querySelector('.top-bar');
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

  label.addEventListener('click', function (e) {
    e.preventDefault();
    navToggle.checked = !navToggle.checked;
  });

  document.addEventListener('click', function (e) {
    if (navToggle.checked && !nav.contains(e.target) && !label.contains(e.target)) {
      navToggle.checked = false;
    }
  });

  var themeToggle = document.getElementById('theme-toggle');
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

  var banner = document.querySelector('.hero-banner');
  if (banner) {
    var layers = banner.querySelectorAll('[data-depth]');
    banner.addEventListener('mousemove', function (e) {
      var rect = banner.getBoundingClientRect();
      var x = e.clientX - rect.left - rect.width / 2;
      var y = e.clientY - rect.top - rect.height / 2;
      layers.forEach(function (layer) {
        var depth = parseFloat(layer.dataset.depth) || 0;
        layer.style.transform = 'translate(' + x * depth + 'px,' + y * depth + 'px)';
      });
    });
    banner.addEventListener('mouseleave', function () {
      layers.forEach(function (layer) {
        layer.style.transform = '';
      });
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
