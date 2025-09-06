/* assets/js/vlc-fullscreen.js */
(function () {
  let video, plyr, wrap, controls,
      centerBtn, backBtn, fwdBtn, toolbarPlay, fsBtn, progress,
      hideTimer,
      lastArrow, arrowCount = 0, arrowTimer;

  /* ===== Icons (unchanged) ===== */
  const playIcon = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>';
  const fsEnterIcon = '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm12-9h-5v2h3v3h2V5zM7 7h3V5H5v5h2V7zm10 7v3h-3v2h5v-5h-2z"/></svg>';
  const fsExitIcon = '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm11 3h3v-3h2v5h-5v-2zM8 5H5v3H3V3h5v2zm11-2h-5v2h3v3h2V3z"/></svg>';

  /* ===== Helpers ===== */
  function syncButtons() {
    const playing = !video.paused;
    const icon = playing ? pauseIcon : playIcon;
    centerBtn.innerHTML = icon;
    toolbarPlay.innerHTML = icon;
  }

  function togglePlay() {
    if (video.paused) { plyr.play(); } else { plyr.pause(); }
  }

  function skipBack()  { video.currentTime = Math.max(0, (video.currentTime || 0) - 10); }
  function skipForward(){ video.currentTime = Math.min((video.currentTime || 0) + 10, video.duration || Infinity); }

  function updateProgress() {
    if (!isNaN(video.duration)) {
      progress.max = video.duration;
      progress.value = video.currentTime;
      const percent = (video.currentTime / video.duration) * 100;
      progress.style.setProperty('--progress', percent + '%');
    }
  }

  function seek(e) {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      video.currentTime = val;
      const max = video.duration || 1;
      const percent = (val / max) * 100;
      progress.style.setProperty('--progress', percent + '%');
    }
  }

  /* ===== Fullscreen detection (robust) ===== */
  function getFullscreenElement() {
    return document.fullscreenElement ||
           document.webkitFullscreenElement ||
           document.mozFullScreenElement ||
           document.msFullscreenElement ||
           (video && video.webkitDisplayingFullscreen ? video : null);
  }

  function isFullscreen() {
    return !!getFullscreenElement();
  }

  function syncFsIcon() {
    fsBtn.innerHTML = isFullscreen() ? fsExitIcon : fsEnterIcon;
  }

  /* ===== Enter/Exit Fullscreen (safe on laptop) ===== */
  function isDesktopLike() {
    const ua = (navigator.userAgent || '').toLowerCase();
    return ua.includes('mac') || ua.includes('win') || ua.includes('linux');
  }

  function isTvOrMobileLike() {
    const ua = (navigator.userAgent || '').toLowerCase();
    return /(tizen|smarttv|samsungbrowser|samsung tv|web0s|android|iphone|ipad|ipod)/i.test(ua);
  }

  function requestFsOn(el) {
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    if (el.msRequestFullscreen) return el.msRequestFullscreen();
    // Only try video.webkitEnterFullscreen on TV/mobile-like devices; avoid on laptops (black screen issue)
    if (!isDesktopLike() && el === video && typeof video.webkitEnterFullscreen === 'function') {
      try { return video.webkitEnterFullscreen(); } catch (_) {}
    }
  }

  function exitFs() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    if (document.msExitFullscreen) return document.msExitFullscreen();
    if (video && typeof video.webkitExitFullscreen === 'function') {
      try { return video.webkitExitFullscreen(); } catch (_) {}
    }
  }

  function toggleFullscreen() {
    // Prefer making the <video> fullscreen on TVs for better key routing
    const preferVideo = isTvOrMobileLike();
    const target = preferVideo ? video : (video.requestFullscreen ? video : wrap);
    if (isFullscreen()) {
      exitFs();
    } else {
      requestFsOn(target || wrap || document.documentElement);
    }
  }

  function showControls() {
    controls.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => controls.classList.remove('show'), 2000);
  }

  /* ===== Arrow seek with acceleration ===== */
  function resetArrowSeek() {
    lastArrow = null;
    arrowCount = 0;
    clearTimeout(arrowTimer);
  }

  function ensureFocusForTv() {
    // TVs often only deliver remote keys to the focused element
    if (!wrap.hasAttribute('tabindex')) wrap.setAttribute('tabindex', '-1');
    const target = (video && typeof video.focus === 'function') ? video : wrap;
    try { target.focus({ preventScroll: true }); } catch (_) { try { target.focus(); } catch (__) {} }
  }

  function onEnterFullscreenUI() {
    // Hide cursor only in fullscreen
    document.documentElement.style.cursor = 'none';
    ensureFocusForTv();
    resetArrowSeek();
  }

  function onExitFullscreenUI() {
    document.documentElement.style.cursor = '';
    resetArrowSeek();
  }

  function handleFsChange() {
    syncFsIcon();
    if (isFullscreen()) {
      onEnterFullscreenUI();
      // Some Samsungs steal focus during FS transition
      setTimeout(ensureFocusForTv, 0);
    } else {
      onExitFullscreenUI();
    }
  }

  function stepSeek(dir /* 'left' | 'right' */) {
    const amount = Math.max(1, arrowCount) * 10; // 10s, 20s, 30s...
    if (dir === 'right') {
      video.currentTime = Math.min((video.currentTime || 0) + amount, video.duration || Infinity);
    } else {
      video.currentTime = Math.max(0, (video.currentTime || 0) - amount);
    }
    showControls();
  }

  function isLeftRightKey(e) {
    // Normalize keys across legacy WebKit/TV browsers
    const k = (e.key || e.code || '').toLowerCase();
    const id = (e.keyIdentifier || '').toLowerCase(); // e.g., "Left", "Right" on old WebKit
    const kc = e.keyCode || e.which;
    const isLeft  = k === 'arrowleft' || k === 'left' || id === 'left'  || kc === 37;
    const isRight = k === 'arrowright'|| k === 'right'|| id === 'right' || kc === 39;
    return { isLeft, isRight };
  }

  function isFKey(e) {
    const k = (e.key || e.code || '').toLowerCase();
    const kc = e.keyCode || e.which;
    // 'f' or 'KeyF'
    return k === 'f' || k === 'keyf' || kc === 70;
  }

  function handleArrowCore(e) {
    const { isLeft, isRight } = isLeftRightKey(e);
    if (!isLeft && !isRight) return;

    if (!isFullscreen()) return;

    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();

    const dir = isRight ? 'right' : 'left';
    if (lastArrow === dir) {
      arrowCount++;
    } else {
      arrowCount = 1;
      lastArrow = dir;
    }

    stepSeek(dir);

    clearTimeout(arrowTimer);
    arrowTimer = setTimeout(resetArrowSeek, 1000);
    return false;
  }

  function handleKey(e) {
    // Exit/enter fullscreen with 'f'
    if (isFKey(e)) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (isFullscreen()) exitFs(); else toggleFullscreen();
      return false;
    }
    // Arrow seek
    return handleArrowCore(e);
  }

  /* ===== Init & wiring ===== */
  function init(opts) {
    video = opts.video; plyr = opts.plyr; wrap = opts.wrap;
    plyr.togglePlay = togglePlay;

    controls = document.getElementById('fsControls');
    centerBtn = document.getElementById('centerPlay');
    backBtn = document.getElementById('skipBack');
    fwdBtn = document.getElementById('skipForward');
    toolbarPlay = document.getElementById('toolbarPlay');
    fsBtn = document.getElementById('fsToggle');
    progress = document.getElementById('progress');

    // Click handlers
    centerBtn.addEventListener('click', togglePlay);
    toolbarPlay.addEventListener('click', togglePlay);
    backBtn.addEventListener('click', () => stepSeek('left'));
    fwdBtn.addEventListener('click', () => stepSeek('right'));
    fsBtn.addEventListener('click', toggleFullscreen);
    progress.addEventListener('input', seek);

    // Fullscreen change events (vendor variants)
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange']
      .forEach(evt => document.addEventListener(evt, handleFsChange));

    // Video state
    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', updateProgress);
    video.addEventListener('play', syncButtons);
    video.addEventListener('pause', syncButtons);

    // Keep controls visible during interaction
    document.addEventListener('mousemove', showControls);
    document.addEventListener('keydown', showControls);

    // Key events — listen on multiple targets AND in capture phase for TVs
    const optsCapture = { capture: true };
    const keyHandler = (e) => handleKey(e);
    window.addEventListener('keydown', keyHandler, optsCapture);
    document.addEventListener('keydown', keyHandler, optsCapture);
    document.body && document.body.addEventListener('keydown', keyHandler, optsCapture);
    wrap && wrap.addEventListener('keydown', keyHandler, optsCapture);
    video.addEventListener('keydown', keyHandler, optsCapture);

    // Some firmwares only fire keyup
    window.addEventListener('keyup', keyHandler, optsCapture);
    document.addEventListener('keyup', keyHandler, optsCapture);
    document.body && document.body.addEventListener('keyup', keyHandler, optsCapture);
    wrap && wrap.addEventListener('keyup', keyHandler, optsCapture);
    video.addEventListener('keyup', keyHandler, optsCapture);

    // Initial UI
    syncButtons();
    syncFsIcon();
    showControls();
  }

  /* ===== Public API (unchanged) ===== */
  window.initVlcFullscreen = init;
  window.togglePlay = togglePlay;
  window.skipBack = skipBack;
  window.skipForward = skipForward;
  window.toggleFullscreen = toggleFullscreen;
})();
