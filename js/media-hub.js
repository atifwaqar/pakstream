document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  const STORAGE_KEY = 'pakstream.mh.state';
  function loadState(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }catch(e){ return {}; }
  }
  function saveState(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){}
  }
  const state = {
    tab: 'all',
    topics: [],
    languages: [],
    regions: [],
    live: false,
    sort: 'trending',
    q: ''
  };
  if (params.toString()) {
    state.tab = params.get('tab') || params.get('m') || 'all';
    state.topics = (params.get('topic') || '').split(',').filter(Boolean);
    state.languages = (params.get('lang') || '').split(',').filter(Boolean);
    state.regions = (params.get('region') || '').split(',').filter(Boolean);
    state.live = params.get('live') === '1';
    state.sort = params.get('sort') || 'trending';
    state.q = params.get('q') || '';
  } else {
    Object.assign(state, loadState());
  }
  let mode = state.tab;
  let isMuted = params.get("muted") === "1";
  let muteParam = isMuted ? "&mute=1" : "";

  // DOM
  const leftRail  = document.getElementById("left-rail");
  const listEl    = leftRail; // left menu is the list container
  const playerIF  = document.getElementById("playerFrame");
  const audioWrap = document.getElementById("audioWrap");
  const videoList = document.getElementById("videoList");
  const details   = document.querySelector(".details-list");
  const tabs      = document.querySelectorAll(".tab-btn");
  const searchEl  = document.getElementById("mh-search-input");
  const topicFilter  = document.getElementById('topic-filter');
  const langFilter   = document.getElementById('lang-filter');
  const regionFilter = document.getElementById('region-filter');
  const liveFilter   = document.getElementById('live-filter');
  const sortSelect   = document.getElementById('sort-select');
  const resetBtn     = document.getElementById('reset-filters');
  const selectedFiltersEl = document.getElementById('selected-filters');
  const resultsCountEl = document.getElementById('results-count');
  const toggleDetailsBtn = document.getElementById("toggle-details");
  const mediaHubSection = document.querySelector(".media-hub-section");

  // Radio player elements
  const radioContainer = document.getElementById("player-container");
  const mainPlayer = document.getElementById("radio-player");
  if (mainPlayer && isMuted) mainPlayer.muted = true;
  const currentLabel = document.getElementById("current-station");
  const stationLogo = document.getElementById("station-logo");
  const liveBadge = document.getElementById("live-badge");
  const notLiveBadge = document.getElementById("not-live-badge");
  const favBtn = document.getElementById("favorite-btn");
  const prevBtn = document.getElementById("prev-btn");
  const playPauseBtn = document.getElementById("play-pause-btn");
  const playPauseLabel = playPauseBtn ? playPauseBtn.querySelector(".label") : null;
  const nextBtn = document.getElementById("next-btn");
  const muteBtn = document.getElementById("mute-btn");
  const shareBtn = document.getElementById("share-btn");
  const livePlayerEl = document.querySelector(".live-player");

  if (playerIF) {
    playerIF.addEventListener('load', () => {
      try {
        playerIF.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
      } catch (e) {}
    });
  }

  window.setMuted = function(muted) {
    isMuted = muted;
    muteParam = muted ? '&mute=1' : '';
    if (mainPlayer) mainPlayer.muted = muted;
    // Update mute icon to reflect the current state when muting is triggered
    if (muteBtn) {
      muteBtn.textContent = muted ? 'volume_off' : 'volume_up';
    }
    if (playerIF && playerIF.contentWindow) {
      playerIF.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: muted ? 'mute' : 'unMute', args: [] }),
        '*'
      );
      if (!muted) {
        playerIF.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          '*'
        );
      }
    }
  };

  window.setPlaying = function(playing) {
    if (playerIF && playerIF.contentWindow) {
      playerIF.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: playing ? 'playVideo' : 'pauseVideo', args: [] }),
        '*'
      );
    }
    if (mainPlayer) {
      if (playing) mainPlayer.play().catch(() => {});
      else mainPlayer.pause();
    }
  };

  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'media-hub-set-muted') {
      window.setMuted(!!event.data.muted);
    } else if (event.data && event.data.type === 'media-hub-set-playing') {
      window.setPlaying(!!event.data.playing);
    } else if (playerIF && event.source === playerIF.contentWindow) {
      let data;
      try { data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch (e) {}
      if (data && data.event === 'onStateChange') {
        if (data.info === 1) {
          if (currentStreamBus) {
            if (!streamStarted) { currentStreamBus.emit('start'); streamStarted = true; }
            currentStreamBus.emit('playing');
          }
        } else if (data.info === 0) {
          if (currentStreamBus) currentStreamBus.emit('end');
          streamStarted = false;
        }
      } else if (data && data.event === 'onError') {
        if (currentStreamBus) currentStreamBus.emit('error', { errorCode: data.info });
      }
    }
  });

  const favKeys = { tv: "tvFavorites", freepress: "ytFavorites", creator: "ytFavorites", radio: "radioFavorites" };
  let favorites;
  if (mode === "all") {
    const tvFavs = JSON.parse(localStorage.getItem(favKeys.tv) || "[]");
    const ytFavs = JSON.parse(localStorage.getItem(favKeys.freepress) || "[]");
    const radioFavs = JSON.parse(localStorage.getItem(favKeys.radio) || "[]");
    favorites = [...tvFavs, ...ytFavs, ...radioFavs];
  } else {
    favorites = JSON.parse(localStorage.getItem(favKeys[mode]) || "[]");
  }
  const defaultLogo = "/images/default_radio.png";

  let currentAudio = null;
  let resumeHandler = null;
  let pendingBtn = null;
  let currentBtn = null;
  let currentVideoKey = null;
  let currentVideoChannelId = null;

  let currentStreamBus = null;
  let streamStarted = false;

  let rssAbortController = null;
  let detailsAbortController = null;

  function abortPendingRequests() {
    if (rssAbortController) {
      rssAbortController.abort();
      rssAbortController = null;
    }
    if (detailsAbortController) {
      detailsAbortController.abort();
      detailsAbortController = null;
    }
  }

  // Load data
  const res = await fetch("/all_streams.json");
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];

  // ===== Helpers =====
  const thumbOf = it => it.media?.thumbnail_url || it.media?.logo_url || "/assets/avatar-fallback.png";
  const ytEmbed = it => (it.endpoints||[]).find(e => e.kind === "embed" && e.provider === "youtube");
  const radioEndpoint = it => (it.endpoints||[]).find(e => (e.kind==="stream"||e.kind==="audio") && e.url);
  const uploadsId = cid => cid && cid.startsWith("UC") ? "UU" + cid.slice(2) : null;
  const ytThumb = vid => `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
  const displayName = it => it.name || it.title || it.key || "Untitled";
  const modeOfItem = it => {
    if (it.category === "radio" || it.type === "radio" || /radio/i.test(it.platform || "")) return "radio";
    if (it.category === "freepress" || it.type === "freepress" || /freepress|journalist|news/i.test(it.tags || "")) return "freepress";
    if (it.category === "creator" || it.type === "creator" || /creator|vlog|podcast/i.test(it.tags || "")) return "creator";
    return "tv";
  };

  function deriveTopic(it){
    const name = displayName(it).toLowerCase();
    if(/news|press/.test(name)) return 'news';
    if(/sport/.test(name)) return 'sports';
    if(/music|fm/.test(name)) return 'music';
    if(/talk|podcast/.test(name)) return 'talk';
    return 'general';
  }
  function deriveLanguage(it){
    const name = displayName(it).toLowerCase();
    if(/english/.test(name)) return 'en';
    if(/urdu/.test(name)) return 'ur';
    return 'both';
  }
  function deriveRegion(it){
    return 'pakistan';
  }
  function deriveLive(it){
    if(it.type === 'radio' || it.category === 'radio') return true;
    if(it.status && typeof it.status.active === 'boolean') return it.status.active;
    const emb = ytEmbed(it);
    return emb ? /live/i.test(emb.url||'') : false;
  }
  const topicSet = new Set();
  const langSet = new Set();
  const regionSet = new Set();
  items.forEach(it => {
    it.topic = deriveTopic(it);
    it.language = deriveLanguage(it);
    it.region = deriveRegion(it);
    it.isLive = deriveLive(it);
    topicSet.add(it.topic);
    langSet.add(it.language);
    regionSet.add(it.region);
  });

  function populateSelect(sel, values){
    if(!sel) return;
    sel.innerHTML = '';
    values.sort().forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v.charAt(0).toUpperCase() + v.slice(1);
      sel.appendChild(opt);
    });
  }
  populateSelect(topicFilter, Array.from(topicSet));
  populateSelect(langFilter, Array.from(langSet));
  populateSelect(regionFilter, Array.from(regionSet));

  function timeAgo(dateString) {
    const seconds = (Date.now() - new Date(dateString)) / 1000;
    const intervals = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 }
    ];
    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count >= 1) return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
  }

  function renderProfiles(list) {
    const icons = {
      youtube: { url: 'https://img.icons8.com/color/48/000000/youtube-play.png', label: 'YouTube' },
      instagram: { url: 'https://img.icons8.com/fluency/48/000000/instagram-new.png', label: 'Instagram' },
      twitter: { url: 'https://img.icons8.com/ios-filled/50/FFFFFF/twitterx.png', label: 'X (Twitter)' },
      facebook: { url: 'https://img.icons8.com/color/48/000000/facebook-new.png', label: 'Facebook' },
      linkedin: { url: 'https://img.icons8.com/fluency/48/000000/linkedin.png', label: 'LinkedIn' },
      website: { url: 'https://img.icons8.com/ios-filled/50/000000/domain.png', label: 'Website' },
      tiktok: { url: 'https://img.icons8.com/color/48/000000/tiktok--v1.png', label: 'TikTok' }
    };
    const items = list.map(url => {
      let type = 'website';
      if (/youtu/.test(url)) type = 'youtube';
      else if (/instagram/.test(url)) type = 'instagram';
      else if (/twitter|x\.com/.test(url)) type = 'twitter';
      else if (/facebook/.test(url)) type = 'facebook';
      else if (/linkedin/.test(url)) type = 'linkedin';
      else if (/tiktok/.test(url)) type = 'tiktok';
      const { url: icon, label } = icons[type] || { url: '', label: type.charAt(0).toUpperCase() + type.slice(1) };
      const img = icon ? `<img src='${icon}' alt='${label}'>` : '';
      return `<a class='profile' href='${url}' target='_blank' rel='noopener'><div class='profile-icon'>${img}</div><span>${label}</span></a>`;
    }).join('');
    return `<h3>Profiles</h3><div class='profiles'>${items}</div>`;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function getSupportCode(slug) {
    const key = `ps-code-${slug}`;
    let code = sessionStorage.getItem(key);
    if (!code) {
      const digits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      code = `PS-${slug}-${digits}`;
      sessionStorage.setItem(key, code);
    }
    return code;
  }

  function renderSupportSection(item) {
    if (!item || !item.key || !item.name) return '';
    const slug = item.key;
    const name = escapeHtml(item.name);
    const code = getSupportCode(slug);
    return `
    <div class="support-section">
      <button class="support-toggle" aria-expanded="false">☕ Support this creator</button>
      <div class="support-panel" hidden>
        <h3>Support ${name}</h3>
        <p>100% of your tip goes to ${name}.</p>
        <div class="support-code">
          <code id="support-code-${slug}">${code}</code>
          <button class="copy-btn" data-code-id="support-code-${slug}" aria-label="Copy attribution code">Copy</button>
        </div>
        <p class="support-instruction">Paste this code in the Buy Me a Coffee message so we can route your tip to ${name}.</p>
        <a class="coffee-btn" href="https://buymeacoffee.com/pakstream" target="_blank" rel="noopener">Buy ${name} coffee</a>
      </div>
    </div>`;
  }

  function attachSupportHandlers(container) {
    const toggle = container.querySelector('.support-toggle');
    const panel = container.querySelector('.support-panel');
    if (toggle && panel) {
      const toggleFn = () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        panel.hidden = expanded;
      };
      toggle.addEventListener('click', toggleFn);
      toggle.addEventListener('keydown', e => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          toggleFn();
        }
      });
    }
    const copyBtn = container.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const id = copyBtn.getAttribute('data-code-id');
        const codeEl = container.querySelector(`#${id}`);
        if (codeEl) {
          navigator.clipboard.writeText(codeEl.textContent.trim()).then(() => {
            const original = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => (copyBtn.textContent = original), 2000);
          });
        }
      });
    }
  }

  function updateDetails(item) {
    if (!details || !toggleDetailsBtn) return;
    const label = toggleDetailsBtn.querySelector('.label');
    let html = '';
    if (item) {
      if (item.details_html) {
        html = item.details_html;
      } else {
        if (item.about) html += item.about;
        if (item.profiles && item.profiles.length) {
          html += renderProfiles(item.profiles);
        }
      }
    }
  const supportHtml = renderSupportSection(item);
  if (supportHtml) html = supportHtml + html;
    if (html) {
      details.innerHTML = html;
      attachSupportHandlers(details);
      details.style.display = '';
      toggleDetailsBtn.style.display = '';
      if (label) label.textContent = label.dataset.default || 'About';
    } else {
      details.classList.remove('open');
      details.innerHTML = '';
      details.style.display = 'none';
      toggleDetailsBtn.style.display = 'none';
      if (label) label.textContent = label.dataset.default || 'About';
    }
  }

  function setActiveVideo(clickedItem) {
    document.querySelectorAll('#videoList .video-item').forEach(item => item.classList.remove('active'));
    if (clickedItem) clickedItem.classList.add('active');
  }

  async function fetchVideoDetails(videoId, signal) {
    const resp = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`, { signal });
    if (!resp.ok) throw new Error('Failed to load video details');
    return resp.json();
  }
  // One place for UI updates (tabs, player visibility, details toggle, favorites cache)
  function updateActiveUI() {
    tabs.forEach(t => {
      const isActive = t.dataset.mode === mode;
      t.classList.toggle("active", isActive);
      t.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    const videoPlaying = playerIF && playerIF.src && playerIF.src !== "about:blank";
    if (currentAudio || (!videoPlaying && mode === "radio")) {
      if (playerIF) playerIF.style.display = "none";
      if (audioWrap) audioWrap.style.display = "";
    } else {
      if (playerIF) playerIF.style.display = "";
      if (audioWrap) audioWrap.style.display = "none";
      if (window.resizeLivePlayers) window.resizeLivePlayers();
    }

    const hasDetails = details && details.innerHTML.trim().length > 0;
    if (details) details.style.display = hasDetails ? "" : "none";
    if (toggleDetailsBtn) toggleDetailsBtn.style.display = hasDetails ? "" : "none";
    if (mediaHubSection) mediaHubSection.classList.toggle("no-details", !hasDetails);

    if (mode === 'favorites') {
      favorites = [];
    } else if (mode === 'all') {
      const tvFavs = JSON.parse(localStorage.getItem(favKeys.tv) || '[]');
      const ytFavs = JSON.parse(localStorage.getItem(favKeys.freepress) || '[]');
      const radioFavs = JSON.parse(localStorage.getItem(favKeys.radio) || '[]');
      favorites = [...tvFavs, ...ytFavs, ...radioFavs];
    } else {
      favorites = JSON.parse(localStorage.getItem(favKeys[mode]) || '[]');
    }
    updateFavoritesUI();
  }

  // Build card
  function makeChannelCard(it, itemMode = mode) {
    const card = document.createElement("div");
    card.className = "channel-card";
    card.dataset.key = it.key;
    card.dataset.mode = itemMode;
    card.dataset.active = it.status?.active === false ? "false" : "true";
    if (it.status?.active === false) card.classList.add("inactive");

    const img = document.createElement("img");
    img.className = "channel-thumb";
    img.src = thumbOf(it);
    img.alt = displayName(it);

    const name = document.createElement("span");
    name.className = "channel-name";
    name.textContent = displayName(it);

    const playBtn = document.createElement("button");
    playBtn.className = "play-btn material-symbols-outlined";
    playBtn.setAttribute("aria-label","Play");
    playBtn.innerHTML = '<span class="material-symbols-outlined label">play_arrow</span><span class="spinner"></span>';

    const favButton = document.createElement("button");
    favButton.className = "fav-btn material-symbols-outlined";
    favButton.setAttribute("aria-label","Toggle favorite");
    favButton.textContent = "favorite_border";

    favButton.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(itemMode === "radio" ? (it.ids?.internal_id || it.key) : it.key, itemMode);
    });

    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(playBtn);
    card.appendChild(favButton);

    if (itemMode === "radio") {
      const ep = radioEndpoint(it);
      const audio = document.createElement("audio");
      audio.id = it.ids?.internal_id || it.key;
      audio.preload = "none";
      if (ep) audio.src = ep.url;
      audio.dataset.logo = thumbOf(it);

      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!ep) return;
        playRadio(playBtn, audio, displayName(it), audio.dataset.logo, it);
      });
      card.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        playBtn.click();
      });
      card.appendChild(audio);
    } else {
      playBtn.addEventListener("click", (e) => { e.stopPropagation(); select(it, true); });
      card.addEventListener("click", () => select(it, true));
    }

    return card;
  }

  function updateFavoritesUI() {
    if (!listEl) return;
    const cards = Array.from(listEl.querySelectorAll('.channel-card'));

    if (muteBtn) {
      muteBtn.textContent = mainPlayer && mainPlayer.muted ? 'volume_off' : 'volume_up';
    }

    if (mode === 'favorites') {
      const activeFavFrag = document.createDocumentFragment();
      const inactiveFavFrag = document.createDocumentFragment();
      cards.forEach(card => {
        const cardMode = card.dataset.mode || 'tv';
        const favArr = JSON.parse(localStorage.getItem(favKeys[cardMode]) || '[]');
        const id = cardMode === 'radio' ? (card.querySelector('audio')?.id) : card.dataset.key;
        if (!id) return;
        const on = favArr.includes(id);
        const inactive = card.dataset.active === 'false';
        card.classList.toggle('favorite', on);
        const btn = card.querySelector('.fav-btn');
        if (btn) btn.textContent = on ? 'favorite' : 'favorite_border';
        if (!on) { card.remove(); return; }
        if (inactive) inactiveFavFrag.appendChild(card);
        else activeFavFrag.appendChild(card);
      });
      listEl.appendChild(activeFavFrag);
      listEl.appendChild(inactiveFavFrag);
      if (currentAudio && favBtn) {
        const radioFavs = JSON.parse(localStorage.getItem(favKeys['radio']) || '[]');
        const isFav = radioFavs.includes(currentAudio.id);
        favBtn.textContent = isFav ? 'favorite' : 'favorite_border';
        favBtn.classList.toggle('favorited', isFav);
        favBtn.disabled = false;
        if (muteBtn) muteBtn.disabled = false;
      } else if (muteBtn) {
        muteBtn.disabled = true;
      }
      if (playPauseBtn) playPauseBtn.disabled = false;
      const hasStations = listEl.querySelectorAll('.channel-card audio').length > 0;
      if (prevBtn && nextBtn) prevBtn.disabled = nextBtn.disabled = !hasStations;
      return;
    }

    const activeFavFrag = document.createDocumentFragment();
    const activeOtherFrag = document.createDocumentFragment();
    const inactiveFavFrag = document.createDocumentFragment();
    const inactiveOtherFrag = document.createDocumentFragment();

    cards.forEach(card => {
      const cardMode = card.dataset.mode || mode;
      const id = cardMode === 'radio' ? (card.querySelector('audio')?.id) : card.dataset.key;
      if (!id) return;
      const on = favorites.includes(id);
      const inactive = card.dataset.active === 'false';
      card.classList.toggle('favorite', on);
      const btn = card.querySelector('.fav-btn');
      if (btn) btn.textContent = on ? 'favorite' : 'favorite_border';
      if (inactive) {
        (on ? inactiveFavFrag : inactiveOtherFrag).appendChild(card);
      } else {
        (on ? activeFavFrag : activeOtherFrag).appendChild(card);
      }
    });

    listEl.appendChild(activeFavFrag);
    listEl.appendChild(activeOtherFrag);
    listEl.appendChild(inactiveFavFrag);
    listEl.appendChild(inactiveOtherFrag);

    if (mode === 'radio' || currentAudio) {
      if (currentAudio && favBtn) {
        const radioFavs = JSON.parse(localStorage.getItem(favKeys['radio']) || '[]');
        const isFav = radioFavs.includes(currentAudio.id);
        favBtn.textContent = isFav ? 'favorite' : 'favorite_border';
        favBtn.classList.toggle('favorited', isFav);
        favBtn.disabled = false;
        if (muteBtn) muteBtn.disabled = false;
      } else if (muteBtn) {
        muteBtn.disabled = true;
      }
      if (playPauseBtn) playPauseBtn.disabled = false;
    } else if (muteBtn) {
      muteBtn.disabled = true;
      if (playPauseBtn) playPauseBtn.disabled = true;
      if (favBtn) favBtn.disabled = true;
    }
    const hasStations = listEl.querySelectorAll('.channel-card audio').length > 0;
    if (prevBtn && nextBtn) prevBtn.disabled = nextBtn.disabled = !hasStations;
  }

    function toggleFavorite(id, itemMode = mode) {
      const storeKey = favKeys[itemMode];
      if (!storeKey) return;
      const favArr = JSON.parse(localStorage.getItem(storeKey) || '[]');
      const idx = favArr.indexOf(id);
      if (idx >= 0) favArr.splice(idx, 1); else favArr.push(id);
      localStorage.setItem(storeKey, JSON.stringify(favArr));
      if (mode === 'all') {
        const tvFavs = JSON.parse(localStorage.getItem(favKeys.tv) || '[]');
        const ytFavs = JSON.parse(localStorage.getItem(favKeys.freepress) || '[]');
        const radioFavs = JSON.parse(localStorage.getItem(favKeys.radio) || '[]');
        favorites = [...tvFavs, ...ytFavs, ...radioFavs];
      } else if (itemMode === mode) {
        favorites = favArr;
      }
      updateFavoritesUI();
      renderList();
    }

  // Filter items for current mode (robust when 'category' is missing)
  function filteredByState() {
    let arr = items.slice();
    if (mode === 'radio') {
      arr = arr.filter(i => i.category === 'radio' || i.type === 'radio' || /radio/i.test(i.platform || ''));
    } else if (mode === 'tv') {
      arr = arr.filter(i => i.type === 'livetv' || i.type === 'tv' || i.category === 'tv');
    } else if (mode === 'creator') {
      arr = arr.filter(i => i.category === 'creator' || i.type === 'creator' || /creator|vlog|podcast/i.test(i.tags || ''));
    }
    const q = (state.q || '').toLowerCase().trim();
    if(q){
      arr = arr.filter(i => {
        const dn = displayName(i).toLowerCase();
        const k = (i.key || '').toLowerCase();
        const tags = (i.tags || '').toLowerCase();
        return dn.includes(q) || k.includes(q) || tags.includes(q);
      });
    }
    if(state.topics.length) arr = arr.filter(i => state.topics.includes(i.topic));
    if(state.languages.length) arr = arr.filter(i => state.languages.includes(i.language));
    if(state.regions.length) arr = arr.filter(i => state.regions.includes(i.region));
    if(state.live) arr = arr.filter(i => i.isLive);
    if(state.sort === 'trending' && window.trendingService){
      const ranked = window.trendingService.getRanking(arr);
      const ids = new Set(ranked.map(r => r.key));
      const rest = arr.filter(i => !ids.has(i.key));
      arr = ranked.concat(rest.sort((a,b)=>displayName(a).localeCompare(displayName(b))));
    } else if(state.sort === 'recent'){
      arr.sort((a,b)=> new Date(b.firstSeen||0) - new Date(a.firstSeen||0));
    } else if(state.sort === 'played' && window.historyService){
      const hist = window.historyService.get();
      arr.sort((a,b)=>{
        const ai = hist.findIndex(h=>h.id===a.key);
        const bi = hist.findIndex(h=>h.id===b.key);
        if(ai===-1 && bi===-1) return displayName(a).localeCompare(displayName(b));
        if(ai===-1) return 1;
        if(bi===-1) return -1;
        return ai - bi;
      });
    } else {
      arr.sort((a,b)=>displayName(a).localeCompare(displayName(b)));
    }
    return arr;
  }

  function renderFilterChips(target){
    if(!target) return;
    target.innerHTML = '';
    let any = false;
    function addChip(label, value, removeFn){
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = label + ': ' + value + ' ';
      const btn = document.createElement('button');
      btn.setAttribute('aria-label','Remove '+label+': '+value);
      btn.textContent = '×';
      btn.addEventListener('click', function(){ removeFn(); if(window.analytics) analytics('empty_state_action',{action:'remove_filter'}); });
      chip.appendChild(btn);
      target.appendChild(chip);
      any = true;
    }
    state.topics.forEach(v => addChip('Topic', v, () => { state.topics = state.topics.filter(x=>x!==v); updateState(); }));
    state.languages.forEach(v => addChip('Lang', v, () => { state.languages = state.languages.filter(x=>x!==v); updateState(); }));
    state.regions.forEach(v => addChip('Region', v, () => { state.regions = state.regions.filter(x=>x!==v); updateState(); }));
    if(state.live) addChip('Live','Yes', () => { state.live = false; updateState(); });
    if(state.q) addChip('Search', state.q, () => { state.q=''; updateState(); });
    if(any){
      const clear = document.createElement('button');
      clear.className = 'btn';
      clear.textContent = 'Clear all';
      clear.addEventListener('click', function(){
        state.tab = 'all';
        state.topics = [];
        state.languages = [];
        state.regions = [];
        state.live = false;
        state.sort = 'trending';
        state.q = '';
        updateState();
        if(window.analytics) analytics('empty_state_action',{action:'clear_all'});
      });
      target.appendChild(clear);
    }
  }

  function renderList() {
    if (!listEl) return;
    let arr = filteredByState();
    listEl.querySelectorAll('.channel-card, .empty-state').forEach(el => el.remove());
    if(arr.length === 0){
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<h2 id="no-results" tabindex="-1">No results found</h2><p>The filters are too specific.</p>';
      const chipWrap = document.createElement('div');
      chipWrap.className = 'chips';
      empty.appendChild(chipWrap);
      renderFilterChips(chipWrap);
      const sugg = document.createElement('div');
      sugg.className = 'suggestions';
      const intl = document.createElement('button');
      intl.className = 'btn';
      intl.textContent = 'Include International';
      intl.addEventListener('click', function(){ state.regions = []; updateState(); if(window.analytics) analytics('empty_state_action',{action:'suggestion_click'}); });
      const nonlive = document.createElement('button');
      nonlive.className = 'btn';
      nonlive.textContent = 'Show non-live';
      nonlive.addEventListener('click', function(){ state.live = false; updateState(); if(window.analytics) analytics('empty_state_action',{action:'suggestion_click'}); });
      const allLang = document.createElement('button');
      allLang.className = 'btn';
      allLang.textContent = 'All languages';
      allLang.addEventListener('click', function(){ state.languages = []; updateState(); if(window.analytics) analytics('empty_state_action',{action:'suggestion_click'}); });
      sugg.appendChild(intl);
      sugg.appendChild(nonlive);
      sugg.appendChild(allLang);
      empty.appendChild(sugg);
      const trend = document.createElement('div');
      trend.className = 'trending-cards';
      if(window.trendingService){
        const tItems = window.trendingService.getRanking(items).slice(0,6);
        tItems.forEach(it => {
          const id = (it.ids && it.ids.internal_id) ? it.ids.internal_id : it.key;
          const modeIt = modeOfItem(it);
          const a = document.createElement('a');
          a.href = '/media-hub.html?c=' + encodeURIComponent(id) + '&m=' + modeIt;
          a.className = 'btn';
          a.textContent = displayName(it);
          a.addEventListener('click', function(){ if(window.analytics) analytics('empty_state_action',{action:'suggestion_click'}); });
          trend.appendChild(a);
        });
      }
      empty.appendChild(trend);
      const cats = document.createElement('div');
      cats.className = 'nf-cats';
      ['news','music','talk','drama','sports'].forEach(cat => {
        const a = document.createElement('a');
        a.href = '/media-hub.html?topic=' + cat;
        a.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        a.className = 'chip';
        a.addEventListener('click', function(){ if(window.analytics) analytics('empty_state_action',{action:'suggestion_click'}); });
        cats.appendChild(a);
      });
      empty.appendChild(cats);
      const report = document.createElement('p');
      const rlink = document.createElement('a');
      rlink.href = '/contact.html#missing';
      rlink.textContent = 'Report missing channel';
      report.appendChild(rlink);
      empty.appendChild(report);
      listEl.appendChild(empty);
      const first = empty.querySelector('button, a');
      if(first) first.focus(); else document.getElementById('no-results')?.focus();
      if(resultsCountEl) resultsCountEl.textContent = '0 results. Showing suggestions.';
      if(window.analytics) analytics('empty_state_view',{context:'hub'});
    } else {
      const frag = document.createDocumentFragment();
      arr.forEach(it => {
        const im = mode === 'all' ? modeOfItem(it) : mode;
        frag.appendChild(makeChannelCard(it, im));
      });
      listEl.appendChild(frag);
      if(resultsCountEl) resultsCountEl.textContent = arr.length + ' results';
    }
    renderFilterChips(selectedFiltersEl);

    const initialKey = currentVideoKey || params.get('c');
    if (mode === 'radio') {
      if (!currentAudio) {
        if (initialKey) {
          const target = arr.find(it => it.key === initialKey || it.ids?.internal_id === initialKey);
          if (target) {
            const card = listEl.querySelector(`.channel-card[data-key="${target.key}"]`);
            const btn = card ? card.querySelector('.play-btn') : null;
            const audio = card ? card.querySelector('audio') : null;
            if (btn && audio) {
              playRadio(btn, audio, displayName(target), thumbOf(target), target);
            }
          }
        } else if (arr.length) {
          const first = arr[0];
          const card = listEl.querySelector(`.channel-card[data-key="${first.key}"]`);
          const btn = card ? card.querySelector('.play-btn') : null;
          const audio = card ? card.querySelector('audio') : null;
          if (btn && audio) {
            playRadio(btn, audio, displayName(first), thumbOf(first), first);
          }
        }
      }
    } else {
      let handled = false;
      if (initialKey) {
        const match = arr.find(it => it.key === initialKey || it.ids?.internal_id === initialKey);
        if (match) {
          if ((mode === 'favorites' || mode === 'all') && modeOfItem(match) === 'radio') {
            const card = listEl.querySelector(`.channel-card[data-key="${match.key}"]`);
            const btn = card ? card.querySelector('.play-btn') : null;
            const audio = card ? card.querySelector('audio') : null;
            const matchId = match.ids?.internal_id || match.key;
            if (currentAudio && currentAudio.id === matchId) {
              document.querySelectorAll('.channel-card').forEach(c => c.classList.toggle('active', c.dataset.key === match.key));
              handled = true;
            } else if (btn && audio) {
              playRadio(btn, audio, displayName(match), thumbOf(match), match);
              handled = true;
            }
          } else {
            select(match, false);
            handled = true;
          }
        }
      }
      if (!handled && playerIF && (playerIF.src === '' || playerIF.src === 'about:blank') && !currentAudio && arr.length) {
        const chosen = arr[0];
        if (!((mode === 'favorites' || mode === 'all') && modeOfItem(chosen) === 'radio')) {
          select(chosen, false);
        }
      }
    }

    updateFavoritesUI();
  }

  // ---- CORS-safe RSS loader ----
// Quiet, proxy-only RSS loader (no direct YouTube fetch → no CORS error)
async function renderLatestVideosRSS(channelId) {
  abortPendingRequests();
  if (!videoList) return;
  videoList.innerHTML = "";
  currentVideoChannelId = channelId;
  if (!channelId) return;

  rssAbortController = new AbortController();
  const signal = rssAbortController.signal;

  try {
    const feed = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    // Primary proxy (fast, generous CORS)
    const proxy1 = `https://r.jina.ai/http://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    // Secondary proxy (fallback)
    const proxy2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(feed)}`;

    let xml = "";
    try {
      xml = await fetch(proxy1, { cache: "no-store", signal }).then(r => r.text());
      // r.jina.ai may return non-XML (markdown/JSON); ensure we have XML, otherwise fallback
      if (!xml || !xml.trim().startsWith("<")) throw new Error("Proxy1 bad shape");
    } catch {
      xml = await fetch(proxy2, { cache: "no-store", signal }).then(r => r.text());
    }

    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const entries = [...doc.querySelectorAll("entry")].slice(0, 10);
    if (currentVideoChannelId !== channelId || !entries.length) return;

    detailsAbortController = new AbortController();
    const detailsSignal = detailsAbortController.signal;

    entries.forEach(en => {
      const vid = en.querySelector("yt\\:videoId, videoId")?.textContent;
      const title = en.querySelector("title")?.textContent || "Video";
      const published = en.querySelector("published")?.textContent || "";
      if (!vid) return;

      const row = document.createElement("div");
      row.className = "video-item";

      const img = document.createElement("img");
      img.className = "video-thumb";
      img.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
      img.alt = "";

      const detailsWrap = document.createElement("div");
      detailsWrap.className = "video-details";

      const titleEl = document.createElement("div");
      titleEl.className = "video-title";
      titleEl.textContent = title;

      const meta = document.createElement("div");
      meta.className = "video-meta";
      meta.textContent = `Loading views…${published ? " • " + timeAgo(published) : ""}`;

      detailsWrap.appendChild(titleEl);
      detailsWrap.appendChild(meta);

      row.appendChild(img);
      row.appendChild(detailsWrap);
      row.addEventListener("click", () => {
        if (playerIF) {
          playerIF.style.display = "";
          playerIF.src = `https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&rel=0&enablejsapi=1${muteParam}`;
          if (window.resizeLivePlayers) window.resizeLivePlayers();
        }
        if (audioWrap) audioWrap.style.display = "none";
        if (details && toggleDetailsBtn && details.innerHTML.trim().length) {
          toggleDetailsBtn.style.display = "";
        }
        setActiveVideo(row);
      });

      videoList.appendChild(row);

      fetchVideoDetails(vid, detailsSignal).then(info => {
        const viewsText = info.view_count ? `${Number(info.view_count).toLocaleString()} views` : null;
        meta.textContent = viewsText
          ? `${viewsText}${published ? " • " + timeAgo(published) : ""}`
          : `${published ? timeAgo(published) : ""}`;
      }).catch(() => {
        meta.textContent = `${published ? timeAgo(published) : ""}`;
      });
    });
  } catch (e) {
    // Keep list empty if proxies fail; no console noise
  }
}


  // ---- Selection for TV/FreePress/Creator ----
  function select(item, autoplay=false) {
    abortPendingRequests();
    const isSame = currentVideoKey === item.key;
    document.querySelectorAll(".channel-card").forEach(c => c.classList.toggle("active", c.dataset.key === item.key));
    if (isSame) return;

    currentVideoKey = item.key;
    syncURL();

    if (videoList) videoList.innerHTML = "";
    currentVideoChannelId = null;
    if (playerIF) playerIF.style.display = "";
    if (audioWrap) audioWrap.style.display = "none";

    // stop any radio that might be playing
    if (mainPlayer) {
      mainPlayer.pause();
      mainPlayer.currentTime = 0;
      mainPlayer.src = "";
    }
    if (currentAudio) currentAudio = null;
    if (pendingBtn) { const b = pendingBtn; pendingBtn = null; resetButton(b); }
    if (currentBtn) { const b = currentBtn; currentBtn = null; resetButton(b); }

    const emb = ytEmbed(item);
    let src = "";
    if (emb) {
      src = emb.url.includes("?")
        ? `${emb.url}&autoplay=1&enablejsapi=1${muteParam}`
        : `${emb.url}?autoplay=1&enablejsapi=1${muteParam}`;
    } else if (item.ids?.youtube_channel_id) {
      const upl = uploadsId(item.ids.youtube_channel_id);
      src = upl
        ? `https://www.youtube-nocookie.com/embed/videoseries?list=${upl}&autoplay=1&rel=0&enablejsapi=1${muteParam}`
        : `https://www.youtube-nocookie.com/embed/live_stream?channel=${item.ids.youtube_channel_id}&autoplay=1&rel=0&enablejsapi=1${muteParam}`;
    }

    const m = modeOfItem(item);
    if (currentStreamBus) currentStreamBus.emit('end');
    currentStreamBus = createStreamStateBus({ id: item.key, type: m, provider: 'youtube', sourceUrl: src });
    attachStreamErrorOverlay(currentStreamBus, livePlayerEl);
    streamStarted = false;
    currentStreamBus.emit('attempt');
    let startTimeout = setTimeout(() => {
      if (currentStreamBus) currentStreamBus.emit('error', { errorCode: 'start_timeout' });
    }, 12000);
    currentStreamBus.on('start', () => { clearTimeout(startTimeout); });
    currentStreamBus.on('retry', () => {
      currentStreamBus.meta.attemptNo++;
      if (playerIF) playerIF.src = src;
      startTimeout = setTimeout(() => {
        if (currentStreamBus) currentStreamBus.emit('error', { errorCode: 'start_timeout' });
      }, 12000);
      currentStreamBus.emit('attempt');
    });
    currentStreamBus.on('open_external', () => { window.open(src, '_blank'); });

    if (playerIF) playerIF.src = src || "about:blank";
    if (playerIF && window.resizeLivePlayers) window.resizeLivePlayers();

    if (item.ids?.youtube_channel_id) {
      renderLatestVideosRSS(item.ids.youtube_channel_id);
    }
    updateDetails(item);

    if (window.innerWidth <= 768) {
      const list = document.querySelector('.channel-list');
      if (list) list.classList.remove('open');
      const label = document.querySelector('#toggle-channels .label');
      if (label) label.textContent = label.dataset.default || label.textContent;
      if (typeof window.updateScrollLock === 'function') window.updateScrollLock();
    }

    updateActiveUI();

    if (window.historyService) {
      const m = modeOfItem(item);
      window.historyService.add({
        id: item.key,
        type: m,
        title: displayName(item),
        url: '/media-hub.html?c=' + encodeURIComponent(item.key) + '&m=' + m,
        poster: thumbOf(item)
      });
    }
    if (window.trendingService) {
      window.trendingService.recordClick({ id: item.key, type: modeOfItem(item) });
    }
  }

  // ---- Radio playback ----
  function resetButton(btn) {
    btn.classList.remove('loading');
    const lbl = btn.querySelector('.label');
    if (lbl) {
      lbl.textContent = (currentBtn === btn) ? 'stop' : 'play_arrow';
    }
  }

  function playRadio(btn, audio, name, logoUrl, item) {
    if (!audio) return;

    if (currentStreamBus) currentStreamBus.emit('end');
    currentStreamBus = createStreamStateBus({
      id: audio.id || item.key,
      type: 'radio',
      provider: audio.provider || 'hls',
      sourceUrl: audio.src
    });
    attachStreamErrorOverlay(currentStreamBus, livePlayerEl);
    streamStarted = false;
    currentStreamBus.emit('attempt');
    let startTimeout = setTimeout(() => {
      if (currentStreamBus) currentStreamBus.emit('error', { errorCode: 'start_timeout' });
    }, 12000);
    currentStreamBus.on('start', () => { clearTimeout(startTimeout); });
    currentStreamBus.on('retry', () => {
      currentStreamBus.meta.attemptNo++;
      if (mainPlayer) {
        mainPlayer.load();
        const p = mainPlayer.play();
        if (p && p.catch) p.catch(()=>{});
      }
      startTimeout = setTimeout(() => {
        if (currentStreamBus) currentStreamBus.emit('error', { errorCode: 'start_timeout' });
      }, 12000);
      currentStreamBus.emit('attempt');
    });
    currentStreamBus.on('open_external', () => { window.open(audio.src, '_blank'); });

    abortPendingRequests();
    currentVideoKey = null;

    // Ensure any previously displayed video list is cleared when
    // switching to a radio stream, since radio channels don't have
    // associated video playlists.
    if (videoList) videoList.innerHTML = "";
    currentVideoChannelId = null;

    // stop previous
    if (currentAudio && currentAudio !== audio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    if (playerIF) {
      playerIF.src = "about:blank";
      playerIF.style.display = "none";
    }
    if (audioWrap) audioWrap.style.display = "";

    if (stationLogo) stationLogo.src = logoUrl || defaultLogo;
    if (liveBadge) liveBadge.hidden = true;
    if (notLiveBadge) notLiveBadge.hidden = false;
    updateDetails(item);

    if (window.historyService) {
      const id = item.ids?.internal_id || item.key;
      window.historyService.add({
        id,
        type: 'radio',
        title: name,
        url: '/media-hub.html?m=radio&c=' + encodeURIComponent(id),
        poster: logoUrl || thumbOf(item)
      });
    }
    if (window.trendingService) {
      const id = item.ids?.internal_id || item.key;
      window.trendingService.recordClick({ id, type: 'radio' });
    }

    if (mainPlayer) {
      mainPlayer.src = audio.src;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: name,
          artwork: [{ src: stationLogo ? stationLogo.src : logoUrl || defaultLogo }]
        });
      }
      mainPlayer.load();
      const playPromise = mainPlayer.play();
      if (playPromise !== undefined) {
        pendingBtn = btn;
        btn.classList.add('loading');
        if (playPauseBtn) playPauseBtn.classList.add('loading');
        playPromise.catch(() => {
          // require user interaction
          resumeHandler = () => {
            const p2 = mainPlayer.play();
            if (p2 && p2.catch) p2.catch(()=>{});
            document.removeEventListener('click', resumeHandler);
            document.removeEventListener('touchstart', resumeHandler);
            resumeHandler = null;
          };
          document.addEventListener('click', resumeHandler, { once: true });
          document.addEventListener('touchstart', resumeHandler, { once: true });
        });
      }
    }

    currentAudio = audio;
    if (currentLabel) currentLabel.textContent = name;
    currentVideoKey = audio.id;
    syncURL();

    if (window.innerWidth <= 768) {
      const list = document.querySelector('.channel-list');
      if (list) list.classList.remove('open');
      const label = document.querySelector('#toggle-channels .label');
      if (label) label.textContent = label.dataset.default || label.textContent;
      if (typeof window.updateScrollLock === 'function') window.updateScrollLock();
    }
    updateFavoritesUI();
    updateActiveUI();
  }

  // Player state hooks
  if (mainPlayer) {
    mainPlayer.addEventListener('playing', () => {
      if (playPauseLabel) playPauseLabel.textContent = 'pause';
      if (playPauseBtn) {
        playPauseBtn.classList.remove('loading');
        playPauseBtn.setAttribute('aria-label', 'Pause');
      }
      if (liveBadge) liveBadge.hidden = false;
      if (notLiveBadge) notLiveBadge.hidden = true;
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      if (pendingBtn) {
        if (currentBtn && currentBtn !== pendingBtn) resetButton(currentBtn);
        pendingBtn.classList.remove('loading');
        const lbl = pendingBtn.querySelector('.label'); if (lbl) lbl.textContent = 'stop';
        pendingBtn.setAttribute('aria-label', 'Stop');
        currentBtn = pendingBtn;
        pendingBtn = null;
      }
      if (currentStreamBus) {
        if (!streamStarted) { currentStreamBus.emit('start'); streamStarted = true; }
        currentStreamBus.emit('playing');
      }
    });

    mainPlayer.addEventListener('pause', () => {
      if (playPauseLabel) playPauseLabel.textContent = 'play_arrow';
      if (playPauseBtn) playPauseBtn.setAttribute('aria-label', 'Play');
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      if (currentBtn) {
        const lbl = currentBtn.querySelector('.label'); if (lbl) lbl.textContent = 'play_arrow';
        currentBtn.setAttribute('aria-label', 'Play');
      }
    });

    mainPlayer.addEventListener('ended', () => {
      if (playPauseLabel) playPauseLabel.textContent = 'play_arrow';
      if (playPauseBtn) playPauseBtn.setAttribute('aria-label', 'Play');
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
      if (currentBtn) resetButton(currentBtn);
      if (currentStreamBus) currentStreamBus.emit('end');
      streamStarted = false;
    });

    mainPlayer.addEventListener('error', () => {
      if (currentStreamBus) {
        const err = mainPlayer.error || {};
        currentStreamBus.emit('error', { errorCode: err.code, errorDetail: err.message });
      }
    });

    mainPlayer.addEventListener('stalled', () => {
      if (currentStreamBus) currentStreamBus.emit('stall');
    });
  }

  // Favorites + share + controls
    if (favBtn) {
      favBtn.addEventListener('click', () => {
        if (!currentAudio) return;
        const id = currentAudio.id;
        const storeKey = favKeys['radio'];
        const favArr = JSON.parse(localStorage.getItem(storeKey) || '[]');
        const idx = favArr.indexOf(id);
        if (idx >= 0) favArr.splice(idx, 1); else favArr.push(id);
        localStorage.setItem(storeKey, JSON.stringify(favArr));
        if (mode === 'radio') favorites = favArr;
        updateFavoritesUI();
        renderList();
      });
    }
  if (playPauseBtn) {
    playPauseBtn.addEventListener("click", () => {
      if (!mainPlayer) return;
      if (mainPlayer.paused) mainPlayer.play().catch(()=>{});
      else mainPlayer.pause();
    });
  }
  if (prevBtn) prevBtn.addEventListener("click", () => stepStation(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => stepStation(1));
  if (muteBtn) muteBtn.addEventListener("click", () => {
    if (!mainPlayer) return;
    mainPlayer.muted = !mainPlayer.muted;
    muteBtn.textContent = mainPlayer.muted ? 'volume_off' : 'volume_up';
  });
  if (shareBtn) shareBtn.addEventListener("click", async () => {
    const shareData = {
      title: 'PakStream Radio',
      text: currentLabel ? currentLabel.textContent : 'Listen on PakStream',
      url: location.href
    };
    if (navigator.share) {
      navigator.share(shareData).catch(()=>{});
    } else if (navigator.clipboard) {
      try { await navigator.clipboard.writeText(shareData.url); alert('Page URL copied'); } catch { window.prompt('Copy this URL', shareData.url); }
    } else {
      window.prompt('Copy this URL', shareData.url);
    }
  });

  function stepStation(offset) {
    if (!listEl) return;
    const audios = Array.from(listEl.querySelectorAll('.channel-card audio'));
    if (audios.length === 0) return;
    const currentId = currentAudio ? currentAudio.id : null;
    let idx = currentId ? audios.findIndex(a => a.id === currentId) : -1;
    if (idx === -1) idx = offset > 0 ? 0 : audios.length - 1;
    else idx = (idx + offset + audios.length) % audios.length;
    const audio = audios[idx];
    const card = audio.closest('.channel-card');
    const key = card?.dataset.key;
    const item = items.find(i => i.key === key);
    if (!item) return;
    playRadio(card.querySelector('.play-btn'), audio, displayName(item), thumbOf(item), item);
  }

  // Tabs + Search
  function syncURL(){
    const p = new URLSearchParams();
    p.set('tab', state.tab);
    if(state.topics.length) p.set('topic', state.topics.join(','));
    if(state.languages.length) p.set('lang', state.languages.join(','));
    if(state.regions.length) p.set('region', state.regions.join(','));
    if(state.live) p.set('live','1');
    if(state.sort && state.sort !== 'trending') p.set('sort', state.sort);
    if(state.q) p.set('q', state.q);
    history.replaceState(null,'','?'+p.toString());
  }

  function updateControlsFromState(){
    if(topicFilter) Array.from(topicFilter.options).forEach(o => o.selected = state.topics.includes(o.value));
    if(langFilter) Array.from(langFilter.options).forEach(o => o.selected = state.languages.includes(o.value));
    if(regionFilter) Array.from(regionFilter.options).forEach(o => o.selected = state.regions.includes(o.value));
    if(liveFilter) liveFilter.checked = state.live;
    if(sortSelect) sortSelect.value = state.sort;
    if(searchEl) searchEl.value = state.q;
  }

  function updateState(){
    mode = state.tab;
    updateControlsFromState();
    renderList();
    syncURL();
    saveState();
    updateActiveUI();
  }

  tabs.forEach(t => t.addEventListener('click', () => { state.tab = t.dataset.mode; updateState(); }));
  if(topicFilter) topicFilter.addEventListener('change', () => { state.topics = Array.from(topicFilter.selectedOptions).map(o=>o.value); updateState(); });
  if(langFilter) langFilter.addEventListener('change', () => { state.languages = Array.from(langFilter.selectedOptions).map(o=>o.value); updateState(); });
  if(regionFilter) regionFilter.addEventListener('change', () => { state.regions = Array.from(regionFilter.selectedOptions).map(o=>o.value); updateState(); });
  if(liveFilter) liveFilter.addEventListener('change', () => { state.live = liveFilter.checked; updateState(); });
  if(sortSelect) sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; updateState(); });
  if(searchEl) searchEl.addEventListener('input', e => { state.q = e.target.value; updateState(); });
  if(resetBtn) resetBtn.addEventListener('click', () => {
    state.tab = 'all';
    state.topics = [];
    state.languages = [];
    state.regions = [];
    state.live = false;
    state.sort = 'trending';
    state.q = '';
    updateState();
  });

  updateState();
});
