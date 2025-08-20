(function(){
  let activeSession = null;
  const events = {
    start: new Event('session:start'),
    pause: new Event('session:pause'),
    resume: new Event('session:resume'),
    end: new Event('session:end')
  };

  function dispatch(type){
    document.dispatchEvent(events[type]);
  }

  function setup(){
    const media = document.querySelector('video, iframe[id="playerIF"], audio#radio-player');
    if(!media) return;
    const container = media.closest('#player-container') || media.parentElement;
    const isRadio = media.tagName.toLowerCase() === 'audio';

    const mini = document.createElement('div');
    mini.id = 'mini-player';
    mini.setAttribute('role','region');
    mini.setAttribute('aria-label','Mini player');
    mini.innerHTML = `
      <div class="mini-media"></div>
      <div class="mini-title"></div>
      <div class="mini-controls">
        <button class="mini-play" aria-label="Play/Pause">⏯</button>
        <button class="mini-mute" aria-label="Mute">🔇</button>
        <button class="mini-pip" aria-label="Picture-in-Picture" hidden>🗖</button>
        <button class="mini-expand" aria-label="Expand">⬆️</button>
        <button class="mini-close" aria-label="Close">✕</button>
      </div>`;
    document.body.appendChild(mini);

    const miniMedia = mini.querySelector('.mini-media');
    const playBtn = mini.querySelector('.mini-play');
    const muteBtn = mini.querySelector('.mini-mute');
    const pipBtn = mini.querySelector('.mini-pip');
    const expandBtn = mini.querySelector('.mini-expand');
    const closeBtn = mini.querySelector('.mini-close');
    const titleEl = mini.querySelector('.mini-title');

    const dockBtn = document.createElement('button');
    dockBtn.textContent = 'Dock';
    dockBtn.className = 'dock-btn';
    dockBtn.setAttribute('aria-label','Dock mini-player');
    container.appendChild(dockBtn);

    const placeholder = document.createElement('div');
    let docked = false;

    function placeMini(){
      const ads = Array.from(document.querySelectorAll('.ad-container')).find(el=>{
        const style = window.getComputedStyle(el);
        if(style.position !== 'fixed') return false;
        const r = el.getBoundingClientRect();
        return r.bottom >= window.innerHeight - 50;
      });
      if(ads){ mini.style.right='auto'; mini.style.left='16px'; }
      else { mini.style.left='auto'; mini.style.right='16px'; }
    }

    function dock(reason){
      if(docked) return;
      placeholder.style.display='none';
      container.parentNode.insertBefore(placeholder, container);
      miniMedia.appendChild(container);
      if(isRadio) mini.classList.add('mini-radio');
      placeMini();
      mini.style.display='block';
      docked = true;
      dispatch('start');
      console.log('mini_player_shown', {reason});
    }

    function undock(){
      if(!docked) return;
      placeholder.parentNode.insertBefore(container, placeholder);
      placeholder.remove();
      mini.style.display='none';
      docked = false;
      dispatch('end');
      console.log('mini_player_hidden');
    }

    const obs = new IntersectionObserver(entries=>{
      const e = entries[0];
      if(e.intersectionRatio < 0.2) dock('scroll');
      else undock();
    }, {threshold:[0,0.2]});
    obs.observe(container);

    playBtn.addEventListener('click', ()=>{
      if(media.paused) { media.play(); dispatch('resume'); console.log('mini_player_action',{action:'play'}); }
      else { media.pause(); dispatch('pause'); console.log('mini_player_action',{action:'pause'}); }
    });

    muteBtn.addEventListener('click', ()=>{
      media.muted = !media.muted;
      muteBtn.textContent = media.muted ? '🔈' : '🔇';
      console.log('mini_player_action',{action:media.muted?'mute':'unmute'});
    });

    expandBtn.addEventListener('click', ()=>{ undock(); window.scrollTo({top:0,behavior:'smooth'}); console.log('mini_player_action',{action:'expand'});});

    closeBtn.addEventListener('click', ()=>{ undock(); console.log('mini_player_action',{action:'close'});});

    dockBtn.addEventListener('click', ()=>dock('manual'));

    if(media.requestPictureInPicture){
      pipBtn.hidden = false;
      pipBtn.addEventListener('click', async ()=>{
        try{
          if(document.pictureInPictureElement){
            await document.exitPictureInPicture();
            console.log('mini_player_action',{action:'pip_exit'});
          }else{
            await media.requestPictureInPicture();
            console.log('mini_player_action',{action:'pip_enter'});
          }
        }catch(e){}
      });
      media.addEventListener('enterpictureinpicture', ()=>{ mini.style.display='none'; });
      media.addEventListener('leavepictureinpicture', ()=>{ if(!isInViewport(container)) mini.style.display='block'; });
    }

    function isInViewport(el){
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight;
    }

    document.addEventListener('keydown', e=>{
      if(e.key === 'Escape' && docked){ undock(); }
    });

    titleEl.textContent = document.title;

    media.addEventListener('playing', ()=>{ dispatch('resume'); });
    media.addEventListener('pause', ()=>{ dispatch('pause'); });
  }

  document.addEventListener('DOMContentLoaded', setup);
})();
