document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  let mode = params.get("m") || "tv";

  // DOM
  const leftRail  = document.getElementById("left-rail");
  const listEl    = leftRail; // we append cards into .channel-list (left rail)
  const playerIF  = document.getElementById("playerFrame");
  const audioWrap = document.getElementById("audioWrap");
  const videoList = document.getElementById("videoList");
  const details   = document.querySelector(".details-list");
  const tabs      = document.querySelectorAll(".tab-btn");
  const searchEl  = document.getElementById("mh-search-input");
  const toggleDetailsBtn = document.getElementById("toggle-details");

  // Radio player elements
  const radioContainer = document.getElementById("player-container");
  const mainPlayer = document.getElementById("radio-player");
  const currentLabel = document.getElementById("current-station");
  const stationLogo = document.getElementById("station-logo");
  const liveBadge = document.getElementById("live-badge");
  const notLiveBadge = document.getElementById("not-live-badge");
  const favBtn = document.getElementById("favorite-btn");
  const prevBtn = document.getElementById("prev-btn");
  const playPauseBtn = document.getElementById("play-pause-btn");
  const playPauseLabel = playPauseBtn.querySelector(".label");
  const nextBtn = document.getElementById("next-btn");
  const muteBtn = document.getElementById("mute-btn");
  const shareBtn = document.getElementById("share-btn");
  const favKeys = { tv: "tvFavorites", freepress: "ytFavorites", creator: "ytFavorites", radio: "radioFavorites" };
  let favorites = JSON.parse(localStorage.getItem(favKeys[mode]) || "[]");
  const defaultLogo = "/images/default_radio.png";

  let playButtons = [];
  let currentBtn = null;
  let pendingBtn = null;
  let resumeHandler = null;
  let currentAudio = null;

  // Data
  const res = await fetch("/all_streams.json");
  const data = await res.json();
  const items = data.items || [];

  // Helpers
  const setActiveTab = () => tabs.forEach(t => t.classList.toggle("active", t.dataset.mode === mode));
  const thumbOf = it => it.media?.thumbnail_url || it.media?.logo_url || "/assets/avatar-fallback.png";
  const ytEmbed = it => (it.endpoints||[]).find(e => e.kind === "embed" && e.provider === "youtube");
  const radioEndpoint = it => (it.endpoints||[]).find(e => (e.kind==="stream"||e.kind==="audio") && e.url);
  const uploadsId = cid => cid && cid.startsWith("UC") ? "UU" + cid.slice(2) : null;
  const ytThumb = vid => `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

  // Build a single channel card (same visual style as your site)
  function makeChannelCard(it) {
    const card = document.createElement("div");
    card.className = "channel-card";
    card.dataset.key = it.key;

    const img = document.createElement("img");
    img.className = "channel-thumb";
    img.src = thumbOf(it);
    img.alt = "";

    const name = document.createElement("span");
    name.className = "channel-name";
    name.textContent = it.name;

    const playBtn = document.createElement("button");
    playBtn.className = "play-btn material-symbols-outlined";
    playBtn.setAttribute("aria-label","Play");
    playBtn.textContent = "play_arrow";

    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(playBtn);

    if (mode === "radio") {
      playBtn.innerHTML = '<span class="material-symbols-outlined label">play_arrow</span><span class="spinner"></span>';
      playBtn.classList.remove("material-symbols-outlined");
      playBtn.setAttribute("type","button");

      const favButton = document.createElement("button");
      favButton.className = "fav-btn material-symbols-outlined";
      favButton.setAttribute("aria-label","Toggle favorite");
      favButton.textContent = "favorite_border";

      const audio = document.createElement("audio");
      audio.id = it.ids?.internal_id || it.key;
      audio.preload = "none";
      const ep = radioEndpoint(it);
      if (ep) audio.src = ep.url;
      audio.dataset.logo = thumbOf(it);

      favButton.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(audio.id);
      });

      playBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const nameText = it.name;
        if (playBtn === currentBtn) {
          stopStation();
        } else {
          resetButton(currentBtn);
          loadStation(audio, nameText, playBtn);
        }
      });

      card.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        playBtn.click();
      });

      card.appendChild(favButton);
      card.appendChild(audio);
    } else {
      const favButton = document.createElement("button");
      favButton.className = "fav-btn material-symbols-outlined";
      favButton.setAttribute("aria-label","Toggle favorite");
      favButton.textContent = "favorite_border";

      favButton.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(it.key);
      });

      playBtn.addEventListener("click", (e) => { e.stopPropagation(); select(it, /*autoplay*/true); });
      card.addEventListener("click", () => select(it, /*autoplay*/true));

      card.appendChild(favButton);
    }

    return card;
  }

  function renderList(filter="") {
    // Remove existing cards
    [...listEl.querySelectorAll(".channel-card")].forEach(n => n.remove());

    favorites = JSON.parse(localStorage.getItem(favKeys[mode]) || "[]");

    const q = filter.trim().toLowerCase();
    const list = items.filter(i => i.type === mode && (!q || i.name.toLowerCase().includes(q)));

    list.forEach(it => listEl.appendChild(makeChannelCard(it)));

    if (mode === "radio") {
      playerIF.style.display = "none";
      audioWrap.style.display = "";
      playButtons = Array.from(listEl.querySelectorAll(".play-btn"));
      updateFavoritesUI();
      const deepKey = params.get("c");
      const initial = deepKey ? listEl.querySelector(`audio[id="${deepKey}"]`) : listEl.querySelector(".channel-card audio");
      if (initial) {
        const btn = initial.parentElement.querySelector(".play-btn");
        const name = initial.closest(".channel-card").querySelector(".channel-name").textContent;
        resetButton(currentBtn);
        loadStation(initial, name, btn);
      } else {
        stopStation();
      }
    } else {
      audioWrap.style.display = "none";
      playerIF.style.display = "";
      updateFavoritesUI();
      const deepKey = params.get("c");
      const startItem = deepKey ? list.find(x => x.key === deepKey) : list[0];
      if (startItem) select(startItem, /*autoplay*/true);
    }
  }

  function updateFavoritesUI() {
    const cards = Array.from(listEl.querySelectorAll('.channel-card'));
    const favFragment = document.createDocumentFragment();
    const otherFragment = document.createDocumentFragment();

    cards.forEach(card => {
      const id = mode === 'radio' ? card.querySelector('audio')?.id : card.dataset.key;
      if (!id) return;
      const isFav = favorites.includes(id);
      card.classList.toggle('favorite', isFav);
      const btn = card.querySelector('.fav-btn');
      if (btn) btn.textContent = isFav ? 'favorite' : 'favorite_border';
      (isFav ? favFragment : otherFragment).appendChild(card);
    });

    listEl.appendChild(favFragment);
    listEl.appendChild(otherFragment);

    if (mode === 'radio') {
      if (currentAudio) {
        const isFav = favorites.includes(currentAudio.id);
        favBtn.textContent = isFav ? 'favorite' : 'favorite_border';
        favBtn.classList.toggle('favorited', isFav);
        favBtn.disabled = false;
        playPauseBtn.disabled = false;
        muteBtn.disabled = false;
      } else {
        favBtn.textContent = 'favorite_border';
        favBtn.classList.remove('favorited');
        favBtn.disabled = true;
        playPauseBtn.disabled = true;
        muteBtn.disabled = true;
      }

      const hasStations = playButtons.length > 0;
      prevBtn.disabled = nextBtn.disabled = !hasStations;

      playPauseLabel.textContent = mainPlayer.paused ? 'play_arrow' : 'pause';
      playPauseBtn.setAttribute('aria-label', mainPlayer.paused ? 'Play' : 'Pause');
      muteBtn.textContent = mainPlayer.muted ? 'volume_off' : 'volume_up';
    }
  }

  function toggleFavorite(id) {
    const idx = favorites.indexOf(id);
    if (idx >= 0) favorites.splice(idx, 1); else favorites.push(id);
    localStorage.setItem(favKeys[mode], JSON.stringify(favorites));
    updateFavoritesUI();
  }

  function resetButton(btn) {
    if (!btn) return;
    btn.classList.remove('loading');
    const label = btn.querySelector('.label');
    if (label) label.textContent = 'play_arrow';
    btn.setAttribute('aria-label', 'Play');
  }

  function stopStation() {
    if (!mainPlayer.src) {
      currentAudio = null;
      currentBtn = null;
      pendingBtn = null;
      updateFavoritesUI();
      return;
    }
    mainPlayer.pause();
    mainPlayer.removeAttribute('src');
    mainPlayer.load();
    currentLabel.textContent = 'Select a station';
    stationLogo.src = defaultLogo;
    stationLogo.hidden = false;
    liveBadge.hidden = true;
    notLiveBadge.hidden = false;
    resetButton(currentBtn);
    currentBtn = null;
    pendingBtn = null;
    currentAudio = null;
    document.querySelectorAll('.channel-card').forEach(card => card.classList.remove('active'));
    params.delete('c');
    history.replaceState(null, '', '?' + params.toString());
    updateFavoritesUI();
  }

  function loadStation(audio, name, btn) {
    if (resumeHandler) {
      document.removeEventListener('click', resumeHandler);
      document.removeEventListener('touchstart', resumeHandler);
      resumeHandler = null;
    }
    pendingBtn = btn;
    document.querySelectorAll('.channel-card').forEach(card => card.classList.remove('active'));
    btn.closest('.channel-card').classList.add('active');
    btn.classList.add('loading');
    playPauseBtn.classList.add('loading');
    stationLogo.onerror = () => {
      stationLogo.onerror = null;
      stationLogo.src = defaultLogo;
    };
    stationLogo.src = audio.dataset.logo || defaultLogo;
    stationLogo.hidden = false;
    liveBadge.hidden = true;
    notLiveBadge.hidden = false;
    mainPlayer.src = audio.src;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: name,
        artwork: [{ src: stationLogo.src }]
      });
    }
    mainPlayer.load();
    const playPromise = mainPlayer.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        resetButton(btn);
        playPauseBtn.classList.remove('loading');
        resumeHandler = () => {
          btn.classList.add('loading');
          playPauseBtn.classList.add('loading');
          const pp = mainPlayer.play();
          if (pp !== undefined) {
            pp.catch(() => {
              resetButton(btn);
              pendingBtn = null;
            });
          }
          document.removeEventListener('click', resumeHandler);
          document.removeEventListener('touchstart', resumeHandler);
          resumeHandler = null;
        };
        document.addEventListener('click', resumeHandler, { once: true });
        document.addEventListener('touchstart', resumeHandler, { once: true });
      });
    }
    currentAudio = audio;
    currentLabel.textContent = name;
    params.set('m', 'radio');
    params.set('c', audio.id);
    history.replaceState(null, '', '?' + params.toString());

    if (window.innerWidth <= 768) {
      const list = document.querySelector('.channel-list');
      list.classList.remove('open');
      const label = document.querySelector('#toggle-channels .label');
      if (label) label.textContent = label.dataset.default || label.textContent;
      if (typeof updateScrollLock === 'function') updateScrollLock();
    }
    updateFavoritesUI();
  }

  function playStation(offset) {
    const audios = Array.from(listEl.querySelectorAll('.channel-card audio'));
    if (audios.length === 0) return;
    const currentId = currentAudio ? currentAudio.id : null;
    let idx = currentId ? audios.findIndex(a => a.id === currentId) : -1;
    if (idx === -1) {
      idx = offset > 0 ? 0 : audios.length - 1;
    } else {
      idx = (idx + offset + audios.length) % audios.length;
    }
    const audio = audios[idx];
    const name = audio.closest('.channel-card').querySelector('.channel-name').textContent;
    const btn = audio.parentElement.querySelector('.play-btn');
    resetButton(currentBtn);
    loadStation(audio, name, btn);
  }

  // Radio control events
  favBtn.addEventListener('click', () => {
    if (!currentAudio) return;
    toggleFavorite(currentAudio.id);
  });

  prevBtn.addEventListener('click', () => playStation(-1));
  nextBtn.addEventListener('click', () => playStation(1));

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('previoustrack', () => playStation(-1));
    navigator.mediaSession.setActionHandler('nexttrack', () => playStation(1));
  }

  playPauseBtn.addEventListener('click', () => {
    if (mainPlayer.paused) {
      const label = currentBtn?.querySelector('.label');
      if (label) label.textContent = 'stop';
      currentBtn?.setAttribute('aria-label', 'Stop');
      playPauseBtn.classList.add('loading');
      currentBtn?.classList.add('loading');
      mainPlayer.play();
    } else {
      mainPlayer.pause();
    }
  });

  muteBtn.addEventListener('click', () => {
    mainPlayer.muted = !mainPlayer.muted;
    muteBtn.textContent = mainPlayer.muted ? 'volume_off' : 'volume_up';
  });

  shareBtn.addEventListener('click', () => {
    const shareData = {
      title: document.title,
      url: window.location.href
    };
    if (navigator.share) {
      navigator.share(shareData).catch(err => console.error('Share failed', err));
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareData.url).then(() => {
        alert('Page URL copied to clipboard');
      }, () => {
        window.prompt('Copy this URL', shareData.url);
      });
    } else {
      window.prompt('Copy this URL', shareData.url);
    }
  });

  mainPlayer.addEventListener('playing', () => {
    playPauseLabel.textContent = 'pause';
    playPauseBtn.classList.remove('loading');
    playPauseBtn.setAttribute('aria-label', 'Pause');
    liveBadge.hidden = false;
    notLiveBadge.hidden = true;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
    if (pendingBtn) {
      if (currentBtn && currentBtn !== pendingBtn) {
        resetButton(currentBtn);
      }
      pendingBtn.classList.remove('loading');
      pendingBtn.querySelector('.label').textContent = 'stop';
      pendingBtn.setAttribute('aria-label', 'Stop');
      currentBtn = pendingBtn;
      pendingBtn = null;
    } else if (currentBtn) {
      currentBtn.classList.remove('loading');
      currentBtn.querySelector('.label').textContent = 'stop';
      currentBtn.setAttribute('aria-label', 'Stop');
    }
  });

  mainPlayer.addEventListener('waiting', () => {
    liveBadge.hidden = true;
    notLiveBadge.hidden = false;
    playPauseBtn.classList.add('loading');
    const targetBtn = pendingBtn || currentBtn;
    targetBtn?.classList.add('loading');
  });

  mainPlayer.addEventListener('pause', () => {
    if (!mainPlayer.src) return;
    resetButton(currentBtn);
    playPauseLabel.textContent = 'play_arrow';
    playPauseBtn.classList.remove('loading');
    playPauseBtn.setAttribute('aria-label', 'Play');
    liveBadge.hidden = true;
    notLiveBadge.hidden = false;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  });

  mainPlayer.addEventListener('error', () => {
    resetButton(pendingBtn || currentBtn);
    playPauseBtn.classList.remove('loading');
    playPauseLabel.textContent = 'play_arrow';
    playPauseBtn.setAttribute('aria-label', 'Play');
    currentBtn = null;
    pendingBtn = null;
    currentAudio = null;
    liveBadge.hidden = true;
    notLiveBadge.hidden = false;
    stationLogo.src = defaultLogo;
    updateFavoritesUI();
  });

  async function renderLatestVideosRSS(channelId) {
    videoList.innerHTML = "";
    if (!channelId) return;
    try {
      const directFeed = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      let xml = "";
      try {
        const resp = await fetch(directFeed);
        if (!resp.ok) throw new Error("Bad status");
        xml = await resp.text();
      } catch (_) {
        const proxyFeed = `https://api.allorigins.win/raw?url=${encodeURIComponent(directFeed)}`;
        xml = await fetch(proxyFeed).then(r => r.text());
      }
      const doc = new DOMParser().parseFromString(xml, "text/xml");
      const entries = [...doc.querySelectorAll("entry")].slice(0, 10);
      if (!entries.length) return;

      entries.forEach(en => {
        const vid = en.querySelector("yt\\:videoId, videoId")?.textContent;
        const title = en.querySelector("title")?.textContent || "Video";
        if (!vid) return;

        const row = document.createElement("div");
        row.className = "video-item";

        const img = document.createElement("img");
        img.className = "video-thumb";
        img.src = ytThumb(vid);
        img.alt = "";

        const meta = document.createElement("div");
        meta.className = "video-meta";
        meta.textContent = title;

        row.appendChild(img);
        row.appendChild(meta);
        row.addEventListener("click", () => {
          playerIF.style.display = "";
          audioWrap.style.display = "none";
          playerIF.src = `https://www.youtube.com/embed/${vid}?autoplay=1&rel=0`;
          // lock details button visible
          if (details.innerHTML.trim().length) toggleDetailsBtn.style.display = "";
        });

        videoList.appendChild(row);
      });
    } catch (e) {
      // If RSS fails (rare), keep list empty silently
    }
  }

  function select(item, autoplay=false) {
    // Highlight
    document.querySelectorAll(".channel-card").forEach(c => c.classList.toggle("active", c.dataset.key === item.key));

    // URL
    params.set("m", mode);
    params.set("c", item.key);
    history.replaceState(null, "", "?" + params.toString());

    // Reset
    videoList.innerHTML = "";
    details.innerHTML = "";
    playerIF.style.display = "";
    audioWrap.style.display = "none";

    // YouTube embed preference: explicit embed > uploads playlist > live
    const emb = ytEmbed(item);
    let src = "";
    if (emb) {
      src = emb.url.includes("?") ? `${emb.url}&autoplay=1` : `${emb.url}?autoplay=1`;
    } else if (item.ids?.youtube_channel_id) {
      const upl = uploadsId(item.ids.youtube_channel_id);
      src = upl
        ? `https://www.youtube.com/embed/videoseries?list=${upl}&autoplay=1&rel=0`
        : `https://www.youtube.com/embed/live_stream?channel=${item.ids.youtube_channel_id}&autoplay=1&rel=0`;
    }
    playerIF.src = src || "about:blank";
    // Latest videos below via RSS:
    renderLatestVideosRSS(item.ids?.youtube_channel_id || null);

    // About panel
    if (item.aboutHtml) {
      details.innerHTML = item.aboutHtml;
      details.style.display = "";
      toggleDetailsBtn.style.display = "";
    } else {
      details.innerHTML = "";
      details.style.display = "none";
      toggleDetailsBtn.style.display = "none";
    }

    // Ensure rails swipe behavior & screen lock rely on your existing scripts
    // (leftmenu.js/main.js handle open/close, body locking and tap outside)
  }

  // Tabs + Search
  tabs.forEach(t => t.addEventListener("click", () => {
    mode = t.dataset.mode;
    setActiveTab();
    renderList(searchEl.value || "");
  }));
  searchEl.addEventListener("input", e => renderList(e.target.value));

  // Init
  setActiveTab();
  renderList(searchEl.value || "");
});
