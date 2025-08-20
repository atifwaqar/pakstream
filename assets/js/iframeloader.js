document.addEventListener('DOMContentLoaded', function () {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('#ps-feature-cards iframe[data-src]').forEach(function (iframe) {
      iframe.src = iframe.dataset.src;
    });
    return;
  }

  const observer = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        const iframe = entry.target;
        iframe.src = iframe.dataset.src;
        iframe.addEventListener('load', function () {
          const poster = iframe.parentElement.querySelector('.ps-card__poster');
          if (poster) poster.style.display = 'none';
        });
        obs.unobserve(iframe);
      }
    });
  }, { rootMargin: '200px 0px' });

  document.querySelectorAll('#ps-feature-cards iframe[data-src]').forEach(function (iframe) {
    observer.observe(iframe);
  });
});
