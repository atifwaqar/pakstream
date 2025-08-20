(function(){
  const events = {
    start: new Event('session:start'),
    pause: new Event('session:pause'),
    resume: new Event('session:resume'),
    end: new Event('session:end')
  };

  function dispatch(type){
    document.dispatchEvent(events[type]);
  }

  let bound = false;
  function init(){
    attachWhenReady();
  }

  function attachWhenReady(){
    if(bound) return;
    bound = true;
    const playHandler = e => {
      const el = e.target;
      if(!el.matches('video, audio#radio-player')) return;
      attach(el);
    };
    document.addEventListener('play', playHandler, true);

    const iframe = document.querySelector('iframe#playerFrame');
    if(iframe){
      const handle = ()=>{
        if(iframe.src && iframe.src !== 'about:blank') attach(iframe);
      };
      handle();
      iframe.addEventListener('load', handle);
    }
  }

  function attach(media){
    const container = media.closest('#player-container') || media;
    const isRadio = media.tagName.toLowerCase() === 'audio';

    const mini = document.getElementById('mini-player') || (()=>{
      const el = document.createElement('div');
      el.id = 'mini-player';
      el.setAttribute('role','region');
      el.setAttribute('aria-label','Mini player');
      el.innerHTML = `
        <div class="mini-media"></div>
        <div class="mini-title"></div>
        <div class="mini-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="mini-bar"></div></div>
        <div class="mini-controls">
          <button class="mini-play" aria-label="Play/Pause">⏯</button>
          <button class="mini-mute" aria-label="Mute">🔇</button>
          <button class="mini-pip" aria-label="Picture-in-Picture" hidden>🗖</button>
          <button class="mini-expand" aria-label="Expand">⬆️</button>
          <button class="mini-close" aria-label="Close">✕</button>
        </div>`;
      document.body.appendChild(el);
      return el;
    })();

    const miniMedia = mini.querySelector('.mini-media');
    const playBtn = mini.querySelector('.mini-play');
    const muteBtn = mini.querySelector('.mini-mute');
    const pipBtn = mini.querySelector('.mini-pip');
    const expandBtn = mini.querySelector('.mini-expand');
    const closeBtn = mini.querySelector('.mini-close');
    const titleEl = mini.querySelector('.mini-title');
    const progress = mini.querySelector('.mini-progress');
    const bar = mini.querySelector('.mini-bar');

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
      placeholder.style.display='block';
      placeholder.style.width = container.offsetWidth + 'px';
      placeholder.style.height = container.offsetHeight + 'px';
      container.parentNode.insertBefore(placeholder, container);
      miniMedia.appendChild(container);
      container.style.width = '100%';
      container.style.height = '100%';
      if(isRadio) mini.classList.add('mini-radio');
      placeMini();
      mini.style.display='block';
      docked = true;
      dispatch('start');
      console.log('mini_player_shown', {reason});
      window.addEventListener('scroll', onScroll, {passive:true});
    }

    function undock(){
      if(!docked) return;
      placeholder.parentNode.insertBefore(container, placeholder);
      placeholder.remove();
      mini.style.display='none';
      docked = false;
      dispatch('end');
      console.log('mini_player_hidden');
      window.removeEventListener('scroll', onScroll);
    }

    function onScroll(){
      if(docked && isInViewport(placeholder)) undock();
    }

    const obs = new IntersectionObserver(entries=>{
      const e = entries[0];
      if(!docked && e.intersectionRatio < 0.2 && !isInViewport(container)) dock('scroll');
    }, {threshold:[0,0.25]});

    function startObserver(){
      obs.observe(container);
    }

    if(media.tagName.toLowerCase() === 'iframe'){
      if(media.src && media.src !== 'about:blank') startObserver();
      media.addEventListener('load',()=>{
        if(media.src && media.src !== 'about:blank') startObserver();
      });
    } else {
      media.addEventListener('play', function onPlay(){
        startObserver();
        media.removeEventListener('play', onPlay);
      });
    }

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
      return r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
    }

    document.addEventListener('keydown', e=>{
      if(e.key === 'Escape' && docked){ undock(); }
    });

    titleEl.textContent = media.getAttribute('title') || document.title;

    if(!isRadio && media.tagName.toLowerCase()==='video'){
      media.addEventListener('timeupdate', ()=>{
        if(media.duration){
          const p = (media.currentTime/media.duration)*100;
          bar.style.width = p + '%';
          progress.setAttribute('aria-valuenow', p.toFixed(0));
        }
      });
    } else {
      progress.style.display='none';
    }

    media.addEventListener('playing', ()=>{ dispatch('resume'); });
    media.addEventListener('pause', ()=>{ dispatch('pause'); });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
