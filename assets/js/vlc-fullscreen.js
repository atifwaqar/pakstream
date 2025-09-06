(function(){
  let video, plyr, wrap, controls,
      centerBtn, backBtn, fwdBtn, toolbarPlay, fsBtn, progress,
      hideTimer,
      lastArrow, arrowCount = 0, arrowTimer;

  const playIcon = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>';
  const fsEnterIcon = '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm12-9h-5v2h3v3h2V5zM7 7h3V5H5v5h2V7zm10 7v3h-3v2h5v-5h-2z"/></svg>';
  const fsExitIcon = '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm11 3h3v-3h2v5h-5v-2zM8 5H5v3H3V3h5v2zm11-2h-5v2h3v3h2V3z"/></svg>';

  function syncButtons(){
    const playing = !video.paused;
    const icon = playing ? pauseIcon : playIcon;
    centerBtn.innerHTML = icon;
    toolbarPlay.innerHTML = icon;
  }

  function togglePlay(){
    if(video.paused){ plyr.play(); } else { plyr.pause(); }
  }

  function skipBack(){ video.currentTime = Math.max(0, video.currentTime - 10); }
  function skipForward(){ video.currentTime = Math.min(video.currentTime + 10, video.duration || Infinity); }

  function updateProgress(){
    if(!isNaN(video.duration)){
      progress.max = video.duration;
      progress.value = video.currentTime;
      const percent = (video.currentTime / video.duration) * 100;
      progress.style.setProperty('--progress', percent + '%');
    }
  }

  function seek(e){
    const val = parseFloat(e.target.value);
    video.currentTime = val;
    const percent = (val / progress.max) * 100;
    progress.style.setProperty('--progress', percent + '%');
  }

  function syncFsIcon(){
    fsBtn.innerHTML = document.fullscreenElement ? fsExitIcon : fsEnterIcon;
  }

  function toggleFullscreen(){
    if(document.fullscreenElement){ document.exitFullscreen(); }
    else if(wrap.requestFullscreen){ wrap.requestFullscreen(); }
  }

  function showControls(){
    controls.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(()=>controls.classList.remove('show'),2000);
  }

  function isFullscreen(){
    return document.fullscreenElement || document.webkitFullscreenElement ||
      document.mozFullScreenElement || document.msFullscreenElement;
  }

  function resetArrowSeek(){
    lastArrow = null;
    arrowCount = 0;
    clearTimeout(arrowTimer);
  }

  function ensureFocusForTv() {
    // TVs often only deliver remote keys to the focused element
    if (!wrap.hasAttribute('tabindex')) wrap.setAttribute('tabindex', '-1');
    // Prefer focusing the video; fallback to wrapper
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

  function lockLandscape() {
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      } else if (screen.lockOrientation) {
        screen.lockOrientation('landscape');
      }
    } catch (_) {}
  }

  function unlockOrientation() {
    try {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      } else if (screen.unlockOrientation) {
        screen.unlockOrientation();
      }
    } catch (_) {}
  }

  function handleFsChange() {
    syncFsIcon();
    if (isFullscreen()) {
      lockLandscape();
      onEnterFullscreenUI();
      // Some Samsungs steal focus during FS transition
      setTimeout(ensureFocusForTv, 0);
    } else {
      unlockOrientation();
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

  function handleArrowCore(e) {
    // Normalize keys across TV browsers
    const k = (e.key || e.code || '').toLowerCase();
    const kc = e.keyCode;
    const isLeft  = k === 'arrowleft'  || k === 'left'  || kc === 37;
    const isRight = k === 'arrowright' || k === 'right' || kc === 39;
    if (!isLeft && !isRight) return;

    if (!isFullscreen()) return;

    // Prevent the browser from moving the virtual cursor / focusing other elements
    if (typeof e.preventDefault === 'function') e.preventDefault();

    const dir = isRight ? 'right' : 'left';
    if(lastArrow === dir){
      arrowCount++;
    } else {
      arrowCount = 1;
      lastArrow = dir;
    }
    const seek = arrowCount * 10;
    if(isRight){
      video.currentTime = Math.min(video.currentTime + seek, video.duration || Infinity);
    } else {
      video.currentTime = Math.max(0, video.currentTime - seek);
    }
    clearTimeout(arrowTimer);
    arrowTimer = setTimeout(resetArrowSeek,1000);
  }

  function init(opts){
    video = opts.video; plyr = opts.plyr; wrap = opts.wrap;
    plyr.togglePlay = togglePlay;
    controls = document.getElementById('fsControls');
    centerBtn = document.getElementById('centerPlay');
    backBtn = document.getElementById('skipBack');
    fwdBtn = document.getElementById('skipForward');
    toolbarPlay = document.getElementById('toolbarPlay');
    fsBtn = document.getElementById('fsToggle');
    progress = document.getElementById('progress');

    centerBtn.addEventListener('click', togglePlay);
    toolbarPlay.addEventListener('click', togglePlay);
    backBtn.addEventListener('click', skipBack);
    fwdBtn.addEventListener('click', skipForward);
    fsBtn.addEventListener('click', toggleFullscreen);
    progress.addEventListener('input', seek);
    document.addEventListener('fullscreenchange', syncFsIcon);
    ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange','msfullscreenchange'].forEach(evt=>{
      document.addEventListener(evt, resetArrowSeek);
    });

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', updateProgress);
    video.addEventListener('play', syncButtons);
    video.addEventListener('pause', syncButtons);

    document.addEventListener('mousemove', showControls);
    document.addEventListener('keydown', showControls);
    document.addEventListener('keydown', handleArrowKeys);

    syncButtons();
    syncFsIcon();
    showControls();
  }

  window.initVlcFullscreen = init;
  window.togglePlay = togglePlay;
  window.skipBack = skipBack;
  window.skipForward = skipForward;
  window.toggleFullscreen = toggleFullscreen;
})();
