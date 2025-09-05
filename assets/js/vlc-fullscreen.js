(function(){
  let video, plyr, wrap, controls,
      centerBtn, backBtn, fwdBtn, toolbarPlay, fsBtn, progress,
      hideTimer,
      lastArrow, arrowCount = 0, arrowTimer;
  
  const playIcon = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>';
  const fsEnterIcon = '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm12-9h-5v2h3v3h2V5zM7 7h3V5H5v5h2V7zm10 7v3h-3v2h5v-5h-2z"/></svg>';
  const fsExitIcon = '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm11 3h3v-3h2v5h-5v-2zM8 5H5v3H3V3h5v2zm11-2h-5v2h3v3h2V3z"/></svg>';

  function getFullscreenElement(){
    return document.fullscreenElement ||
           document.webkitFullscreenElement ||
           document.mozFullScreenElement ||
           document.msFullscreenElement ||
           (video && video.webkitDisplayingFullscreen ? video : null);
  }

  function isFullscreen(){
    return !!getFullscreenElement();
  }

  function resetArrowSeek(){
    lastArrow = null;
    arrowCount = 0;
    clearTimeout(arrowTimer);
  }

  function stepSeek(dir /* 'left' | 'right' */){
    // increase by 10s per quick press
    const seek = arrowCount * 10;
    if (dir === 'right') {
      video.currentTime = Math.min(
        (video.currentTime || 0) + seek,
        video.duration || Infinity
      );
    } else {
      video.currentTime = Math.max(0, (video.currentTime || 0) - seek);
    }
    // keep controls visible briefly after seek
    showControls();
  }

  function handleArrow(e){
    // Normalize keys for Samsung / legacy
    const k = (e.key || e.code || '').toLowerCase();
    const kc = e.keyCode;
    const isLeft  = k === 'arrowleft'  || k === 'left'  || kc === 37;
    const isRight = k === 'arrowright' || k === 'right' || kc === 39;
    if(!isLeft && !isRight) return;

    if(!isFullscreen()) return;

    // If video/wrap is focused, prevent the browser from moving the mouse cursor
    if (typeof e.preventDefault === 'function') e.preventDefault();

    const dir = isRight ? 'right' : 'left';
    if (lastArrow === dir){
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

  // Focus helpers to ensure keys reach us in FS
  function ensureFocusForTv(){
    // Make the wrapper focusable (once)
    if (!wrap.hasAttribute('tabindex')) wrap.setAttribute('tabindex', '-1');
    // Prefer focusing the video if possible, TVs often route remote keys to the focused element
    (video.focus ? video : wrap).focus({preventScroll:true});
  }

  function onEnterFullscreenUI(){
    // Hide cursor only in FS
    document.documentElement.style.cursor = 'none';
    ensureFocusForTv();
    resetArrowSeek();
  }

  function onExitFullscreenUI(){
    document.documentElement.style.cursor = '';
    resetArrowSeek();
  }

  function syncFsIcon(){
    fsBtn.innerHTML = isFullscreen() ? fsExitIcon : fsEnterIcon;
  }

  function toggleFullscreen(){
    // Prefer making the VIDEO go fullscreen on TVs
    const target = video.requestFullscreen ? video : (wrap.requestFullscreen ? wrap : video);
    if (isFullscreen()){
      document.exitFullscreen && document.exitFullscreen();
      // Some Samsungs need this as well:
      if (video.webkitExitFullscreen) try { video.webkitExitFullscreen(); } catch(_) {}
    } else {
      if (target.requestFullscreen) target.requestFullscreen();
      else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
      else if (target.msRequestFullscreen) target.msRequestFullscreen();
      // As a fallback for some Samsung browsers:
      else if (video.webkitEnterFullscreen) try { video.webkitEnterFullscreen(); } catch(_) {}
    }
  }

  function showControls(){
    controls.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(()=>controls.classList.remove('show'), 2000);
  }

  function handleFsChange(){
    syncFsIcon();
    if (isFullscreen()) onEnterFullscreenUI();
    else onExitFullscreenUI();
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
    backBtn.addEventListener('click', ()=> stepSeek('left'));
    fwdBtn.addEventListener('click', ()=> stepSeek('right'));
    fsBtn.addEventListener('click', toggleFullscreen);
    progress.addEventListener('input', function(e){
      const val = parseFloat(e.target.value);
      video.currentTime = val;
      const percent = (val / (video.duration || 1)) * 100;
      progress.style.setProperty('--progress', percent + '%');
    });

    // FS change hooks (add vendor variants)
    ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange','MSFullscreenChange']
      .forEach(evt => document.addEventListener(evt, handleFsChange));

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', updateProgress);
    video.addEventListener('play', syncButtons);
    video.addEventListener('pause', syncButtons);

    // Keep controls visible when navigating
    document.addEventListener('mousemove', showControls);
    document.addEventListener('keydown', showControls);

    // IMPORTANT: listen on multiple targets for TVs
    // Some Samsungs fire key events on window or video in FS
    const keyHandler = (e)=>handleArrow(e);
    window.addEventListener('keydown', keyHandler);
    document.addEventListener('keydown', keyHandler);
    video.addEventListener('keydown', keyHandler);

    // Some remotes fire on keyup only
    window.addEventListener('keyup', keyHandler);
    document.addEventListener('keyup', keyHandler);
    video.addEventListener('keyup', keyHandler);

    // Initial UI
    syncButtons();
    syncFsIcon();
    showControls();
  }

  // expose
  window.initVlcFullscreen = init;
  window.togglePlay = togglePlay;
  window.toggleFullscreen = toggleFullscreen;
})();
