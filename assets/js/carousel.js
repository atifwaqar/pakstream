(function () {
  const root = document.getElementById('ps-carousel');
  if (!root) return;
  const track = root.querySelector('.ps-carousel__track');
  const prevBtn = root.querySelector('.ps-carousel__prev');
  const nextBtn = root.querySelector('.ps-carousel__next');
  const pauseBtn = root.querySelector('.ps-carousel__pause');
  const status = root.querySelector('.ps-carousel__status');

  let slides = [];
  let index = 0;
  const INTERVAL = 5000;
  let timer = null;
  let hover = false;
  let focusIn = false;
  let userPaused = false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) root.classList.add('ps-no-motion');
  userPaused = reduceMotion || localStorage.getItem('ps-carousel-paused') === 'true';

  function updatePauseBtn() {
    pauseBtn.setAttribute('aria-pressed', String(userPaused));
    pauseBtn.textContent = userPaused ? 'Play' : 'Pause';
    pauseBtn.setAttribute('aria-label', userPaused ? 'Start autoplay' : 'Pause autoplay');
  }

  function announce() {
    if (!slides.length) return;
    const label = slides[index].getAttribute('aria-label') || '';
    status.textContent = label + ' (' + (index + 1) + '/' + slides.length + ')';
  }

  function updateSlides() {
    slides.forEach((s, i) => {
      s.setAttribute('tabindex', i === index ? '0' : '-1');
      const parent = s.closest('.ps-carousel__slide');
      parent && parent.classList.toggle('is-active', i === index);
    });
    track.style.transform = 'translateX(' + (-100 * index) + '%)';
    announce();
  }

  function goTo(i) {
    if (!slides.length) return;
    const wasFocused = root.contains(document.activeElement);
    index = (i + slides.length) % slides.length;
    updateSlides();
    if (wasFocused) slides[index].focus();
  }

  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  function stopAutoplay() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startAutoplay() {
    stopAutoplay();
    timer = setInterval(next, INTERVAL);
  }

  function refreshAutoplay() {
    if (!userPaused && !hover && !focusIn && !document.hidden) {
      startAutoplay();
    } else {
      stopAutoplay();
    }
    updatePauseBtn();
  }

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  pauseBtn.addEventListener('click', () => {
    userPaused = !userPaused;
    localStorage.setItem('ps-carousel-paused', String(userPaused));
    refreshAutoplay();
  });

  root.addEventListener('mouseenter', () => { hover = true; refreshAutoplay(); });
  root.addEventListener('mouseleave', () => { hover = false; refreshAutoplay(); });

  root.addEventListener('focusin', () => { focusIn = true; refreshAutoplay(); });
  root.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!root.contains(document.activeElement)) {
        focusIn = false;
        refreshAutoplay();
      }
    }, 0);
  });

  document.addEventListener('visibilitychange', refreshAutoplay);

  root.addEventListener('keydown', (e) => {
    if (!root.contains(document.activeElement)) return;
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        next();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        prev();
        break;
      case 'Home':
        e.preventDefault();
        goTo(0);
        break;
      case 'End':
        e.preventDefault();
        goTo(slides.length - 1);
        break;
    }
  });

  let startX = null;
  track.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    hover = true;
    refreshAutoplay();
  }, { passive: true });
  track.addEventListener('touchend', (e) => {
    if (startX !== null) {
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 40) {
        diff > 0 ? prev() : next();
      }
    }
    startX = null;
    hover = false;
    refreshAutoplay();
  }, { passive: true });

  fetch('/all_streams.json')
    .then(r => r.json())
    .then(data => {
      const items = Array.isArray(data.items) ? data.items : [];
      const typeToMode = { livetv: 'tv', tv: 'tv', radio: 'radio', freepress: 'freepress', creator: 'creator' };
      items.forEach(it => {
        if (it.status && it.status.active && it.media && it.media.logo_url && !it.media.logo_url.includes('default_radio.png')) {
          const mode = typeToMode[it.type] || 'tv';
          const channelId = it.type === 'radio' && it.ids && it.ids.internal_id ? it.ids.internal_id : it.key;
          const li = document.createElement('li');
          li.className = 'ps-carousel__slide';
          const a = document.createElement('a');
          a.href = '/media-hub.html?c=' + encodeURIComponent(channelId) + '&m=' + mode;
          a.setAttribute('aria-label', it.name || '');
          a.setAttribute('tabindex', '-1');
          const img = document.createElement('img');
          img.src = it.media.logo_url;
          img.alt = it.name || '';
          img.width = 120;
          img.height = 90;
          a.appendChild(img);
          li.appendChild(a);
          track.appendChild(li);
        }
      });
      slides = Array.from(track.querySelectorAll('.ps-carousel__slide a'));
      updateSlides();
      refreshAutoplay();
    })
    .catch(err => {
      console.error('Failed to load carousel items', err);
    });
})();
