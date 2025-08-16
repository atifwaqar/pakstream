(function(){
  function initMediaHub(defaultMode){
    const container=document.getElementById('media-hub');
    if(!container) return;
    const modes=['tv','freepress','radio','creators'];
    const params=new URLSearchParams(location.search);
    let mode=params.get('m')||defaultMode||'tv';
    if(!modes.includes(mode)) mode=defaultMode||'tv';
    let selectedKey=params.get('c');
    let videoId=params.get('v');
    let items=[];
    fetch('/all_streams.json').then(r=>r.json()).then(data=>{items=data.items||[];buildUI();});
    function buildUI(){
      container.innerHTML='<div class="mh"><div class="mh-left"><div class="mh-list"></div></div><div class="mh-center"><div class="mh-mode"></div><div class="mh-player"></div></div><div class="mh-right"><div class="mh-about"></div></div></div>';
      renderModeSwitcher();
      renderList();
      const initial=items.find(it=>it.key===selectedKey&&it.type===mode)||items.find(it=>it.type===mode);
      if(initial) selectItem(initial);
    }
    function renderModeSwitcher(){
      const modeEl=container.querySelector('.mh-mode');
      modeEl.innerHTML=modes.map(m=>`<button data-mode="${m}" class="mode-btn${m===mode?' active':''}">${labelFor(m)}</button>`).join('');
      modeEl.addEventListener('click',e=>{
        const btn=e.target.closest('button[data-mode]');
        if(!btn) return;
        const newMode=btn.dataset.mode;
        if(newMode===mode) return;
        mode=newMode;videoId=null;updateURL();renderList();
        const first=items.find(it=>it.type===mode);if(first) selectItem(first);
        });
    }
    function labelFor(m){switch(m){case'tv':return'Live TV';case'freepress':return'Free Press';case'radio':return'Radio';case'creators':return'Creators';default:return m;}}
    function renderList(){
      const listEl=container.querySelector('.mh-list');
      const list=items.filter(it=>it.type===mode);
      listEl.innerHTML=list.map(it=>`<div class="mh-item" data-key="${it.key}"><img src="${getThumb(it)}" alt=""><span>${it.name}</span></div>`).join('');
      listEl.onclick=e=>{const el=e.target.closest('.mh-item');if(!el) return;const item=items.find(it=>it.key===el.dataset.key);if(item) selectItem(item);};
      updateListSelection();
    }
    function getThumb(it){return (it.media&& (it.media.logo_url||it.media.thumbnail_url))||'';}
    function selectItem(item){selectedKey=item.key;renderPlayer(item);renderAbout(item);updateListSelection();updateURL();}
    function updateListSelection(){container.querySelectorAll('.mh-item').forEach(el=>{el.classList.toggle('active',el.dataset.key===selectedKey);});}
    function renderPlayer(item){const playerEl=container.querySelector('.mh-player');if(item.type==='radio'){const ep=(item.endpoints||[])[0];const src=ep&& (ep.url||ep.src);playerEl.innerHTML=src?`<audio controls autoplay src="${src}"></audio>`:'<p>No stream</p>';}
      else{const channelId=item.ids&&item.ids.youtube_channel_id;let src='';if(videoId) src=`https://www.youtube.com/embed/${videoId}?autoplay=1`;else if(channelId) src=`https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=1`;playerEl.innerHTML=src?`<iframe allowfullscreen loading="lazy" src="${src}"></iframe>`:'<p>No video</p>';}}
    function renderAbout(item){const aboutEl=container.querySelector('.mh-about');if(item.about_html){aboutEl.innerHTML=item.about_html;aboutEl.style.display='block';}else{aboutEl.innerHTML='';aboutEl.style.display='none';}}
    function updateURL(){const p=new URLSearchParams();p.set('m',mode);if(selectedKey) p.set('c',selectedKey);if(videoId) p.set('v',videoId);const newUrl=`${location.pathname}?${p.toString()}`;history.replaceState(null,'',newUrl);}  }
  window.initMediaHub=initMediaHub;
})();
