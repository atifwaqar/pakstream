document.addEventListener('DOMContentLoaded', function () {
  var navToggle = document.getElementById('nav-toggle');
  var nav = document.querySelector('nav');
  var label = document.querySelector('.nav-toggle-label');
  if (!navToggle || !nav || !label) return;

  var currentPath = window.location.pathname.replace(/\/$/, '/index.html');
  var links = document.querySelectorAll('.nav-links a');
  links.forEach(function (link) {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });

  var topBar = document.querySelector('.top-bar');
  var homePaths = ['/index.html', '/index.html'];
  if (topBar && label && homePaths.indexOf(currentPath) === -1) {
    var backBtn = document.createElement('a');
    backBtn.href = '/index.html';
    backBtn.className = 'back-button';
    backBtn.textContent = '←';
    backBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/index.html';
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
});
