(function(){
  let video, plyr, wrap, controls,
      centerBtn, backBtn, fwdBtn, toolbarPlay, fsBtn, progress,
      hideTimer;

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

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', updateProgress);
    video.addEventListener('play', syncButtons);
    video.addEventListener('pause', syncButtons);

    document.addEventListener('mousemove', showControls);
    document.addEventListener('keydown', showControls);

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
