(function(){
  const API_KEY='AIzaSyDYVIpMttgcSxeadCGKBSj1HOt-foiHgOM';
  const ONE_YEAR=365*24*60*60*1000;
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

    Promise.all([
      fetch('/channels.json').then(r=>r.json()).catch(()=>[]),
      fetch('/freepress_channels.json').then(r=>r.json()).then(d=>d.channels||[]).catch(()=>[]),
      fetch('/radio_channels.json').then(r=>r.json()).then(d=>d.channels||[]).catch(()=>[]),
      fetch('/creators_channels.json').then(r=>r.json()).catch(()=>[])
    ]).then(([tv,fp,radio,creators])=>{
      items=[
        ...tv.map(mapTV),
        ...fp.map(mapFP),
        ...radio.map(mapRadio),
        ...creators.map(mapCreator)
      ];
      buildUI();
    });

    function mapTV(ch){return{key:ch.id,name:ch.name,type:'tv',thumb:ch['thumbnail-url'],ids:{youtube_channel_id:ch['channel-id']},src:ch.src};}
    function mapFP(ch){return{key:ch.key,name:ch.name,type:'freepress',thumb:ch['thumbnail-url'],ids:{youtube_channel_id:ch.id},about_html:ch.about,profiles:ch.profiles};}
    function mapRadio(ch){return{key:ch.id,name:ch.name,type:'radio',thumb:ch['thumbnail-url'],endpoints:[{url:ch.src}]};}
    function mapCreator(ch){return{key:ch.key||ch.id,name:ch.name,type:'creators',thumb:ch['thumbnail-url'],ids:{youtube_channel_id:ch.id}};}

    function buildUI(){
      container.innerHTML=`
        <nav class="mode-switcher"></nav>
        <section class="youtube-section">
          <div class="channel-list"></div>
          <div class="video-section">
            <button class="channel-toggle" id="toggle-channels" onclick="toggleChannelList()" aria-label="Toggle channel list">
              <span class="material-symbols-outlined icon">chevron_left</span>
              <span class="label" data-default="Channels">Channels</span>
            </button>
            <div class="live-player"></div>
            <div id="stream-list" class="video-list"></div>
          </div>
          <div class="details-container">
            <button class="details-toggle" id="toggle-details" onclick="toggleDetailsList()" aria-label="Toggle details">
              <span class="material-symbols-outlined icon">chevron_right</span>
              <span class="label" data-default="About">About</span>
            </button>
            <div class="details-list"></div>
          </div>
        </section>`;
      renderModeSwitcher();
      renderList();
      const initial=items.find(it=>it.key===selectedKey&&it.type===mode)||items.find(it=>it.type===mode);
      if(initial) selectItem(initial);
    }

    function renderModeSwitcher(){
      const nav=container.querySelector('.mode-switcher');
      nav.innerHTML=modes.map(m=>`<button data-mode="${m}" class="${m===mode?'active':''}">${labelFor(m)}</button>`).join('');
      nav.addEventListener('click',e=>{
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
      const listEl=container.querySelector('.channel-list');
      const list=items.filter(it=>it.type===mode);
      listEl.innerHTML=list.map(it=>`
        <div class="channel-card" data-key="${it.key}">
          <img class="channel-thumb" src="${it.thumb||''}" alt="${it.name} thumbnail">
          <span class="channel-name">${it.name}</span>
        </div>`).join('');
      listEl.onclick=e=>{
        const card=e.target.closest('.channel-card');
        if(!card) return;
        const item=items.find(it=>it.key===card.dataset.key);
        if(item) selectItem(item);
      };
      updateListSelection();
      list.forEach(it=>{if(!it.thumb&&it.ids&&it.ids.youtube_channel_id){fetchThumb(it.ids.youtube_channel_id).then(url=>{const img=listEl.querySelector(`.channel-card[data-key="${it.key}"] img`);if(img) img.src=url;});}});
    }

    function fetchThumb(channelId){
      const cacheKey=`yt_thumb_${channelId}`;
      const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');
      if(cached&&(Date.now()-cached.t)<ONE_YEAR) return Promise.resolve(cached.url);
      const url=`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&fields=items/snippet/thumbnails/default/url&key=${API_KEY}`;
      return fetch(url).then(r=>r.json()).then(d=>{const u=d.items?.[0]?.snippet?.thumbnails?.default?.url||'';if(u)localStorage.setItem(cacheKey,JSON.stringify({t:Date.now(),url:u}));return u;}).catch(()=> '');
    }

    function selectItem(item){
      selectedKey=item.key;
      renderPlayer(item);
      renderAbout(item);
      renderUpNext(item);
      updateListSelection();
      updateURL();
    }

    function updateListSelection(){
      container.querySelectorAll('.channel-card').forEach(el=>{
        el.classList.toggle('active',el.dataset.key===selectedKey);
      });
    }

    function renderPlayer(item){
      const playerEl=container.querySelector('.live-player');
      if(item.type==='radio'){
        const src=item.endpoints?.[0]?.url||'';
        playerEl.innerHTML=src?`<audio controls autoplay src="${src}"></audio>`:'<p>No stream</p>';
      } else {
        const channelId=item.ids?.youtube_channel_id;
        let src='';
        if(videoId) src=`https://www.youtube.com/embed/${videoId}?autoplay=1`;
        else if(channelId) src=`https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=1`;
        playerEl.innerHTML=src?`<iframe allowfullscreen loading="lazy" src="${src}"></iframe>`:'<p>No video</p>';
      }
    }

    function renderAbout(item){
      const aboutEl=container.querySelector('.details-list');
      const toggleBtn=container.querySelector('.details-toggle');
      if(item.about_html){
        aboutEl.innerHTML=item.about_html;
        if(toggleBtn) toggleBtn.style.display='';
      } else {
        aboutEl.innerHTML='';
        if(toggleBtn) toggleBtn.style.display='none';
      }
    }

    function renderUpNext(item){
      const listEl=container.querySelector('#stream-list');
      if(item.type==='radio'){
        const related=items.filter(it=>it.type==='radio'&&it.key!==item.key).slice(0,5);
        listEl.innerHTML=related.map(r=>`
          <div class="video-item" data-key="${r.key}">
            <img src="${r.thumb||''}" alt="${r.name}">
            <div class="video-details"><div class="video-title">${r.name}</div></div>
          </div>`).join('');
        listEl.onclick=e=>{const el=e.target.closest('.video-item');if(!el)return;const next=items.find(it=>it.key===el.dataset.key);if(next) selectItem(next);};
      } else {
        const channelId=item.ids?.youtube_channel_id;
        if(!channelId){listEl.innerHTML='';return;}
        fetchChannelVideos(channelId).then(videos=>{
          listEl.innerHTML=videos.map(v=>`
            <div class="video-item" data-video="${v.videoId}">
              <img src="${v.thumb}" alt="${v.title}">
              <div class="video-details"><div class="video-title">${v.title}</div></div>
            </div>`).join('');
        });
        listEl.onclick=e=>{const el=e.target.closest('.video-item');if(!el)return;videoId=el.dataset.video;renderPlayer(item);updateURL();setActiveStream(el);};
      }
    }

    function setActiveStream(el){
      container.querySelectorAll('#stream-list .video-item').forEach(it=>it.classList.remove('active'));
      el.classList.add('active');
    }

    function fetchChannelVideos(channelId){
      const feed=`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      return fetch(feed).then(r=>r.text()).then(text=>{
        const xml=new DOMParser().parseFromString(text,'application/xml');
        return Array.from(xml.getElementsByTagName('entry')).slice(0,10).map(e=>{
          const id=e.getElementsByTagName('yt:videoId')[0]?.textContent||e.getElementsByTagName('yt:videoid')[0]?.textContent||'';
          const title=e.getElementsByTagName('title')[0]?.textContent||'';
          const thumb=e.getElementsByTagName('media:thumbnail')[0]?.getAttribute('url')||'';
          return{videoId:id,title,thumb};
        });
      }).catch(()=>[]);
    }

    function updateURL(){
      const p=new URLSearchParams();
      p.set('m',mode);
      if(selectedKey) p.set('c',selectedKey);
      if(videoId) p.set('v',videoId);
      const newUrl=`${location.pathname}?${p.toString()}`;
      history.replaceState(null,'',newUrl);
    }
  }
  window.initMediaHub=initMediaHub;
})();

