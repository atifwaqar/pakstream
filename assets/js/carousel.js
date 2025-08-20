(function () {
  function init(root) {
    if (!root || root.__psCarousel) return;
    root.__psCarousel = true;

    const track = root.querySelector('[data-crs-track]');
    const prev  = root.querySelector('[data-crs-prev]');
    const next  = root.querySelector('[data-crs-next]');
    if (!track) return;

    // Make track scroll-snap if not already styled
    track.setAttribute('role', 'list');
    track.tabIndex = 0;

    function cardWidth() {
      const first = track.querySelector('[data-crs-item]');
      return first ? first.getBoundingClientRect().width : 320;
    }

    function scrollByCards(n = 1) {
      const dx = cardWidth() * n;
      track.scrollBy({ left: dx, behavior: 'smooth' });
    }

    function updateButtons() {
      const max = track.scrollWidth - track.clientWidth - 2; // fudge
      const x = track.scrollLeft;
      if (prev) prev.disabled = x <= 0;
      if (next) next.disabled = x >= max;
    }

    // Buttons
    prev && prev.addEventListener('click', () => scrollByCards(-1));
    next && next.addEventListener('click', () => scrollByCards(1));

    // Keyboard (on track)
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); scrollByCards(1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); scrollByCards(-1); }
      if (e.key === 'Home')       { e.preventDefault(); track.scrollTo({ left: 0, behavior: 'smooth' }); }
      if (e.key === 'End')        { e.preventDefault(); track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' }); }
    });

    // Touch drag / mouse drag (optional enhancement)
    let isDown = false, startX = 0, startScroll = 0;
    function startDrag(e) {
      isDown = true;
      startX = (e.touches ? e.touches[0].pageX : e.pageX);
      startScroll = track.scrollLeft;
      track.classList.add('is-dragging');
    }
    function moveDrag(e) {
      if (!isDown) return;
      const x = (e.touches ? e.touches[0].pageX : e.pageX);
      track.scrollLeft = startScroll - (x - startX);
    }
    function endDrag() {
      isDown = false;
      track.classList.remove('is-dragging');
    }
    track.addEventListener('mousedown', (e) => { if (e.button === 0) startDrag(e); });
    track.addEventListener('mousemove', moveDrag);
    track.addEventListener('mouseleave', endDrag);
    track.addEventListener('mouseup', endDrag);
    track.addEventListener('touchstart', startDrag, { passive: true });
    track.addEventListener('touchmove',  moveDrag,  { passive: true });
    track.addEventListener('touchend',   endDrag);

    // State sync
    track.addEventListener('scroll', updateButtons, { passive: true });
    window.addEventListener('resize', updateButtons);

    // Initial paint
    updateButtons();
  }

    function auto() {
    document.querySelectorAll('[data-crs]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', auto);
  } else { auto(); }
})();

