(function () {
  const LIST_KEY = 'mh.channels.open';
  const FAV_KEY = 'mh.favorites';
  const LAST_KEY = 'mh.lastPlayed';
  const RECENT_KEY = 'mh.recentlyPlayed';
  const ITEM_HEIGHT = 56;
  const BUFFER = 10;

  const listWrapper = document.getElementById('mh-channels');
  if (!listWrapper) return;
  const inner = listWrapper.querySelector('.mh-channels-inner');
  const toggleBtn = document.getElementById('mh-channels-toggle');
  const detailsPanel = document.getElementById('mh-details');
  const detailsToggle = document.getElementById('mh-details-toggle');

  // Backdrop for mobile slide-over
  const backdrop = document.createElement('div');
  backdrop.id = 'mh-channels-backdrop';
  document.body.appendChild(backdrop);
  backdrop.addEventListener('click', () => setOpen(false));

  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  function setOpen(open) {
    if (isMobile()) {
      listWrapper.classList.toggle('open', open);
      backdrop.classList.toggle('show', open);
      document.body.classList.toggle('no-scroll', open);
    } else {
      listWrapper.classList.toggle('collapsed', !open);
      try { localStorage.setItem(LIST_KEY, open ? '1' : '0'); } catch (e) {}
    }
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', open);
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const open = isMobile() ? !listWrapper.classList.contains('open') : listWrapper.classList.contains('collapsed');
      setOpen(open);
    });
  }
  // Restore state
  const stored = (() => { try { return localStorage.getItem(LIST_KEY); } catch (e) { return null; }})();
  if (!isMobile()) {
    setOpen(stored !== '0');
  }

  // ===== Data =====
  let allItems = [];
  let filtered = [];
  let favorites = [];
  try { favorites = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch (e) {}

  function displayName(it){ return it.name || it.title || it.key || 'Untitled'; }
  function modeOf(it){
    if (it.type === 'radio') return 'radio';
    if (it.type === 'creator') return 'creator';
    if (it.type === 'freepress') return 'freepress';
    return 'tv';
  }

  async function load(){
    try {
      const res = await fetch('/all_streams.json');
      const data = await res.json();
      allItems = Array.isArray(data.items) ? data.items : [];
      filtered = allItems.slice();
      render();
    } catch (e) {
      console.error('Failed to load channels', e);
    }
  }
  load();

  // ===== Virtualization =====
  function render(){
    if (!inner) return;
    const scrollTop = listWrapper.scrollTop;
    const viewportH = listWrapper.clientHeight;
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
    const end = Math.min(filtered.length, Math.ceil((scrollTop + viewportH) / ITEM_HEIGHT) + BUFFER);
    inner.innerHTML = '';
    inner.style.paddingTop = start * ITEM_HEIGHT + 'px';
    inner.style.paddingBottom = (filtered.length - end) * ITEM_HEIGHT + 'px';
    for (let i=start; i<end; i++) {
      const it = filtered[i];
      const el = document.createElement('div');
      el.className = 'mh-channel-item';
      el.tabIndex = 0;
      el.dataset.index = i;
      const fav = favorites.includes(it.key);
      const live = it.type === 'livetv' || it.type === 'radio';
      el.innerHTML = `
        <span class="status ${live ? 'live' : 'not-live'}">${live ? 'Live' : 'Not live'}</span>
        <span class="title">${displayName(it)}</span>
        <button class="fav-btn" aria-pressed="${fav}">${fav ? '★' : '☆'}</button>`;
      el.addEventListener('click', evt => {
        if (evt.target.closest('.fav-btn')) {
          toggleFavorite(it.key);
          evt.stopPropagation();
          render();
        } else {
          select(it);
        }
      });
      el.addEventListener('keydown', evt => {
        if (evt.key === 'Enter' || evt.key === ' ') {
          evt.preventDefault();
          select(it);
        } else if (evt.key === 'ArrowDown') {
          evt.preventDefault();
          focusIndex(Math.min(filtered.length-1, i+1));
        } else if (evt.key === 'ArrowUp') {
          evt.preventDefault();
          focusIndex(Math.max(0, i-1));
        }
      });
      inner.appendChild(el);
    }
  }
  listWrapper.addEventListener('scroll', () => render());

  function focusIndex(i){
    const top = i * ITEM_HEIGHT;
    if (top < listWrapper.scrollTop) listWrapper.scrollTop = top;
    if (top > listWrapper.scrollTop + listWrapper.clientHeight - ITEM_HEIGHT) {
      listWrapper.scrollTop = top - listWrapper.clientHeight + ITEM_HEIGHT;
    }
    render();
    const el = inner.querySelector(`.mh-channel-item[data-index="${i}"]`);
    if (el) el.focus();
  }

  function toggleFavorite(key){
    const idx = favorites.indexOf(key);
    if (idx >= 0) favorites.splice(idx,1); else favorites.push(key);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); } catch (e) {}
  }

  function select(item){
    try { localStorage.setItem(LAST_KEY, item.key); } catch (e) {}
    try {
      let recents = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      recents = [item.key, ...recents.filter(k=>k!==item.key)].slice(0,20);
      localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
    } catch(e){}
    populateDetails(item);
    document.dispatchEvent(new CustomEvent('mh:channel:selected', {detail:item}));
  }

  function populateDetails(item){
    if (!detailsPanel) return;
    detailsPanel.innerHTML = `<h2 class="mh-details-title">${displayName(item)}</h2>`;
    detailsPanel.hidden = false;
    if (detailsToggle) detailsToggle.hidden = false;
  }

  // Details toggle (mobile)
  function setDetailsOpen(open){
    if (!detailsPanel) return;
    if (isMobile()) {
      detailsPanel.classList.toggle('open', open);
      document.body.classList.toggle('no-scroll', open);
    }
  }
  if (detailsToggle) {
    detailsToggle.addEventListener('click', () => {
      const open = !detailsPanel.classList.contains('open');
      setDetailsOpen(open);
    });
  }

  // ===== Filtering =====
  const filterState = { q:'', tab:'all' };
  function applyFilters(){
    filtered = allItems.filter(it => {
      if (filterState.tab && filterState.tab !== 'all' && modeOf(it) !== filterState.tab) return false;
      if (filterState.q && !displayName(it).toLowerCase().includes(filterState.q.toLowerCase())) return false;
      return true;
    });
    render();
  }

  document.addEventListener('mh:filters:changed', e => { Object.assign(filterState, e.detail||{}); applyFilters(); });
  document.addEventListener('mh:search:changed', e => { filterState.q = (e.detail && e.detail.q) || ''; applyFilters(); });
  document.addEventListener('mh:tabs:changed', e => { filterState.tab = (e.detail && e.detail.tab) || 'all'; applyFilters(); });
})();
