(function(){
  const HISTORY_KEY = 'pakstream.user.history.v1';
  const HISTORY_ENABLED_KEY = 'pakstream.user.history.enabled';
  const TRENDING_KEY = 'pakstream.trending.signals.v1';

  function load(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){
      return fallback;
    }
  }
  function save(key, val){
    try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){}
  }

  const historyService = {
    enabled(){
      try{ return localStorage.getItem(HISTORY_ENABLED_KEY) !== '0'; }
      catch(e){ return false; }
    },
    get(){
      return this.enabled() ? load(HISTORY_KEY, []) : [];
    },
    add(item){
      if(!this.enabled()) return;
      const list = load(HISTORY_KEY, []);
      const id = item.id;
      const idx = list.findIndex(it => it.id === id && it.type === item.type);
      if(idx >= 0) list.splice(idx,1);
      item.lastPlayedAt = new Date().toISOString();
      list.unshift(item);
      if(list.length > 30) list.length = 30;
      save(HISTORY_KEY, list);
    },
    clear(){
      try{ localStorage.removeItem(HISTORY_KEY); }catch(e){}
    }
  };

  const trendingService = {
    _signals(){ return load(TRENDING_KEY, {}); },
    _save(sig){ save(TRENDING_KEY, sig); },
    recordClick(item){
      const sig = this._signals();
      const id = item.id;
      const now = new Date().toISOString();
      sig[id] = sig[id] || {clicks:0, firstSeen:now, lastSeen:now, type:item.type};
      sig[id].clicks += 1;
      sig[id].lastSeen = now;
      sig[id].type = item.type || sig[id].type;
      this._save(sig);
    },
    clear(){ try{ localStorage.removeItem(TRENDING_KEY); }catch(e){} },
    getRanking(items){
      const sig = this._signals();
      const map = {};
      items.forEach(it => { map[it.key] = it; });
      const now = Date.now();
      const scored = Object.keys(sig).map(id => {
        const s = sig[id];
        const it = map[id];
        if(!it) return null;
        const isNew = s.firstSeen && (now - new Date(s.firstSeen).getTime() < 7*86400*1000) ? 1 : 0;
        const isLive = it.status && it.status.active ? 1 : 0;
        const score = 3*(s.clicks||0) + 2*isNew + 1*isLive;
        return {item:it, score};
      }).filter(Boolean);
      scored.sort((a,b) => b.score - a.score);
      return scored.map(x => x.item);
    }
  };

  window.historyService = historyService;
  window.trendingService = trendingService;

  function thumbOf(it){ return it.media && (it.media.thumbnail_url || it.media.logo_url) || '/assets/avatar-fallback.png'; }
  function displayName(it){ return it.name || it.title || it.key || 'Untitled'; }

  document.addEventListener('DOMContentLoaded', function(){
    const rails = document.querySelectorAll('.lazy-rail');
    if('IntersectionObserver' in window){
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if(e.isIntersecting){
            renderRail(e.target.id);
            obs.unobserve(e.target);
          }
        });
      });
      rails.forEach(r => obs.observe(r));
    } else {
      rails.forEach(r => renderRail(r.id));
    }

    document.addEventListener('click', function(ev){
      const link = ev.target.closest('a[data-trend-id]');
      if(link){
        trendingService.recordClick({id:link.getAttribute('data-trend-id'), type:link.getAttribute('data-trend-type')});
      }
    });
  });

  function renderRail(id){
    if(id === 'continue-rail') return renderContinue();
    if(id === 'trending-rail') return renderTrending();
  }

  function renderContinue(){
    const container = document.getElementById('continue-rail');
    if(!container) return;
    const list = historyService.get().slice(0,10);
    if(list.length === 0){ container.remove(); return; }
    container.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'rail-header';
    const title = document.createElement('h2');
    title.textContent = 'Continue Watching and Listening';
    title.setAttribute('aria-label', 'Continue Watching and Listening');
    const clear = document.createElement('button');
    clear.textContent = 'Clear history';
    clear.className = 'clear-btn';
    clear.addEventListener('click', () => {
      if(confirm('Clear local history?')){ historyService.clear(); container.remove(); }
    });
    header.appendChild(title);
    header.appendChild(clear);
    const rail = document.createElement('div');
    rail.className = 'rail-cards';
    list.forEach(it => {
      const a = document.createElement('a');
      a.className = 'rail-card';
      a.href = it.url;
      a.setAttribute('data-trend-id', it.id);
      a.setAttribute('data-trend-type', it.type);
      const img = document.createElement('img');
      img.src = it.poster;
      img.alt = it.title;
      a.appendChild(img);
      const name = document.createElement('div');
      name.className = 'rail-title';
      name.textContent = it.title;
      a.appendChild(name);
      if(it.progressSeconds && it.durationSeconds){
        const perc = Math.min(100, Math.floor((it.progressSeconds/it.durationSeconds)*100));
        const bar = document.createElement('div');
        bar.className = 'rail-progress';
        const inner = document.createElement('div');
        inner.className = 'rail-progress-inner';
        inner.style.width = perc + '%';
        bar.appendChild(inner);
        bar.setAttribute('aria-valuenow', String(perc));
        bar.setAttribute('aria-label', 'Watched ' + perc + '%');
        a.appendChild(bar);
      }
      rail.appendChild(a);
    });
    container.appendChild(header);
    container.appendChild(rail);
  }

  function renderTrending(){
    const container = document.getElementById('trending-rail');
    if(!container) return;
    container.innerHTML = '';
    fetch('/all_streams.json').then(r=>r.json()).then(data => {
      const items = trendingService.getRanking(data.items || []).slice(0,12);
      if(items.length < 3){ container.remove(); return; }
      const title = document.createElement('h2');
      title.textContent = 'Trending Now';
      title.setAttribute('aria-label', 'Trending Now');
      const rail = document.createElement('div');
      rail.className = 'rail-cards';
      items.forEach(it => {
        const mode = (it.category || it.type || '').toLowerCase();
        const id = it.ids && it.ids.internal_id ? it.ids.internal_id : it.key;
        const url = '/media-hub.html?c=' + encodeURIComponent(id) + '&m=' + mode;
        const a = document.createElement('a');
        a.className = 'rail-card';
        a.href = url;
        a.setAttribute('data-trend-id', id);
        a.setAttribute('data-trend-type', mode);
        const img = document.createElement('img');
        img.src = thumbOf(it);
        img.alt = displayName(it);
        a.appendChild(img);
        const name = document.createElement('div');
        name.className = 'rail-title';
        name.textContent = displayName(it);
        a.appendChild(name);
        rail.appendChild(a);
      });
      container.appendChild(title);
      container.appendChild(rail);
    }).catch(() => container.remove());
  }
})();
