(function(){
  let video, plyr, wrap, controls,
      centerBtn, backBtn, fwdBtn, toolbarPlay, fsBtn, progress,
      hideTimer;

  function syncButtons(){
    const playing = !video.paused;
    centerBtn.textContent = playing ? '❚❚' : '▶';
    toolbarPlay.textContent = playing ? '❚❚' : '▶';
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
    }
  }

  function seek(e){ video.currentTime = parseFloat(e.target.value); }

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

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', updateProgress);
    video.addEventListener('play', syncButtons);
    video.addEventListener('pause', syncButtons);

    document.addEventListener('mousemove', showControls);
    document.addEventListener('keydown', showControls);

    showControls();
    syncButtons();
  }

  window.initVlcFullscreen = init;
  window.togglePlay = togglePlay;
  window.skipBack = skipBack;
  window.skipForward = skipForward;
  window.toggleFullscreen = toggleFullscreen;
})();
