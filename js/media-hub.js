document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  if (!params.has("m")) {
    params.set("m", "all");
    history.replaceState(null, "", `${location.pathname}?${params}`);
  }
  let mode = params.get("m") || "all"; // default, will auto-correct based on data
  const isMuted = params.get("muted") === "1";
  const muteParam = isMuted ? "&mute=1" : "";

  // DOM
  const leftRail  = document.getElementById("left-rail");
  const listEl    = leftRail; // left menu is the list container
  const playerIF  = document.getElementById("playerFrame");
  const audioWrap = document.getElementById("audioWrap");
  const videoList = document.getElementById("videoList");
  const details   = document.querySelector(".details-list");
  const tabs      = document.querySelectorAll(".tab-btn");
  const searchEl  = document.getElementById("mh-search-input");
  const toggleDetailsBtn = document.getElementById("toggle-details");
  const mediaHubSection = document.querySelector(".media-hub-section");

  // Handle top navigation submenu on the media hub page
  const dropdown = document.querySelector('.nav-links .dropdown');
  const topLink = dropdown ? dropdown.querySelector('a[href*="media-hub.html"]') : null;
  if (topLink && topLink.pathname === location.pathname) {
    topLink.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        // On small screens, go directly to the main Media Hub with the
        // "All" tab selected and the channel list visible.
        e.preventDefault();
        const allTab = document.querySelector('.tab-btn[data-mode="all"]');
        if (allTab) allTab.click();
        const list = document.querySelector('.channel-list');
        if (list && !list.classList.contains('open') && typeof window.toggleChannelList === 'function') {
          window.toggleChannelList();
        }
        dropdown.classList.remove('open');
      } else {
        // Only toggle the submenu, don't navigate
        e.preventDefault();
        dropdown.classList.toggle('open');
      }
    });
  }

  const topLinks = dropdown ? dropdown.querySelectorAll('.dropdown-content a[href*="media-hub.html"]') : [];
  topLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      // Always close the submenu first
      dropdown.classList.remove('open');

      if (link.pathname === location.pathname) {
        e.preventDefault();
        const newMode = new URL(link.href, location.origin).searchParams.get('m');
        const tab = Array.from(tabs).find(t => t.dataset.mode === newMode);
        if (tab) tab.click();

        if (window.innerWidth <= 768) {
          const list = document.querySelector('.channel-list');
          if (list && !list.classList.contains('open') && typeof window.toggleChannelList === 'function') {
            window.toggleChannelList();
          }
        }
      }
    });
  });

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

  window.setMuted = function(muted) {
    if (mainPlayer) mainPlayer.muted = muted;
    if (playerIF && playerIF.contentWindow) {
      playerIF.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: muted ? 'mute' : 'unMute', args: [] }),
        '*'
      );
    }
  };

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

  async function fetchVideoDetails(videoId) {
    const resp = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    if (!resp.ok) throw new Error('Failed to load video details');
    return resp.json();
  }

  // Determine which modes are available based on current data
  function modeHasItems(m) {
    const list = filteredByMode(m, "");
    return list.length > 0;
  }
  function detectAvailableMode() {
    const pref = ["tv", "freepress", "creator", "radio"];
    for (const m of pref) {
      if (modeHasItems(m)) return m;
    }
    // if nothing matches, but we have any items at all, just pick radio if present by type/name heuristic
    if (items.some(i => i.type === "radio")) return "radio";
    return "tv";
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
      if (details) details.style.display = "none";
      if (toggleDetailsBtn) toggleDetailsBtn.style.display = "none";
      if (mediaHubSection) mediaHubSection.classList.add("no-details");
    } else {
      if (playerIF) playerIF.style.display = "";
      if (audioWrap) audioWrap.style.display = "none";
      const hasDetails = details && details.innerHTML.trim().length > 0;
      if (details) details.style.display = hasDetails ? "" : "none";
      if (toggleDetailsBtn) toggleDetailsBtn.style.display = hasDetails ? "" : "none";
       if (mediaHubSection) mediaHubSection.classList.toggle("no-details", !hasDetails);
      if (window.resizeLivePlayers) window.resizeLivePlayers();
    }

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
        playRadio(playBtn, audio, displayName(it), audio.dataset.logo);
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
      if (mode === 'favorites') renderList(searchEl ? (searchEl.value || '') : '');
      else updateFavoritesUI();
    }

  // Filter items for current mode (robust when 'category' is missing)
  function filteredByMode(m, filterText) {
    let arr = items.slice();

    // Primary filter by mode
    if (m === "favorites") {
      const tvFavs = JSON.parse(localStorage.getItem(favKeys.tv) || '[]');
      const ytFavs = JSON.parse(localStorage.getItem(favKeys.freepress) || '[]');
      const radioFavs = JSON.parse(localStorage.getItem(favKeys.radio) || '[]');
      arr = arr.filter(i => {
        const im = modeOfItem(i);
        const id = im === 'radio' ? (i.ids?.internal_id || i.key) : i.key;
        if (im === 'radio') return radioFavs.includes(id);
        if (im === 'tv') return tvFavs.includes(id);
        if (im === 'freepress' || im === 'creator') return ytFavs.includes(id);
        return false;
      });
    } else if (m === "radio") {
      arr = arr.filter(i => i.category === "radio" || i.type === "radio" || /radio/i.test(i.platform || ""));
    } else if (m === "tv") {
      arr = arr.filter(i =>
        i.type === "livetv" ||
        i.type === "tv" ||
        i.category === "tv"
      );
    } else if (m === "freepress") {
      arr = arr.filter(i =>
        i.category === "freepress" ||
        i.type === "freepress" ||
        /freepress|journalist|news/i.test(i.tags || "")
      );
    } else if (m === "creator") {
      arr = arr.filter(i =>
        i.category === "creator" ||
        i.type === "creator" ||
        /creator|vlog|podcast/i.test(i.tags || "")
      );
    }

    // Search
    const q = (filterText || "").toLowerCase().trim();
    if (q) {
      arr = arr.filter(i => {
        const dn = displayName(i).toLowerCase();
        const k = (i.key || "").toLowerCase();
        return dn.includes(q) || k.includes(q);
      });
    }

    // Sort
    if (m === 'favorites') {
      arr.sort((a,b) => {
        const aInactive = a.status?.active === false ? 1 : 0;
        const bInactive = b.status?.active === false ? 1 : 0;
        if (aInactive !== bInactive) return aInactive - bInactive;
        return displayName(a).localeCompare(displayName(b));
      });
    } else {
      arr.sort((a,b) => {
        const am = m === 'all' ? modeOfItem(a) : m;
        const bm = m === 'all' ? modeOfItem(b) : m;
        const aid = am === "radio" ? (a.ids?.internal_id || a.key) : a.key;
        const bid = bm === "radio" ? (b.ids?.internal_id || b.key) : b.key;
        const af = favorites.includes(aid) ? 0 : 1;
        const bf = favorites.includes(bid) ? 0 : 1;
        if (af !== bf) return af - bf;
        const aInactive = a.status?.active === false ? 1 : 0;
        const bInactive = b.status?.active === false ? 1 : 0;
        if (aInactive !== bInactive) return aInactive - bInactive;
        return displayName(a).localeCompare(displayName(b));
      });
    }

    return arr;
  }

  function renderList(filterText="") {
    if (!listEl) return;

    // Get items; if none for current mode, auto-switch to an available mode
    // Only auto-switch when not actively filtering to avoid jumping tabs during search
    let arr = filteredByMode(mode, filterText);
    if (!filterText && arr.length === 0 && mode !== 'favorites') {
      mode = detectAvailableMode();
      params.set("m", mode);
      history.replaceState(null, "", "?" + params.toString());
      updateActiveUI();
      arr = filteredByMode(mode, filterText);
    }

    // Clear & render
    listEl.querySelectorAll(".channel-card").forEach(el => el.remove());
    const frag = document.createDocumentFragment();
    arr.forEach(it => {
      const im = (mode === 'favorites' || mode === 'all') ? modeOfItem(it) : mode;
      frag.appendChild(makeChannelCard(it, im));
    });
    listEl.appendChild(frag);

    const initialKey = params.get('c');
    if (mode === 'radio') {
      if (!currentAudio) {
        if (initialKey) {
          const target = arr.find(it => (it.ids?.internal_id || it.key) === initialKey);
          if (target) {
            const card = listEl.querySelector(`.channel-card[data-key="${target.key}"]`);
            const btn = card ? card.querySelector('.play-btn') : null;
            const audio = card ? card.querySelector('audio') : null;
            if (btn && audio) {
              playRadio(btn, audio, displayName(target), thumbOf(target));
            }
          }
        } else if (arr.length) {
          const first = arr[0];
          const card = listEl.querySelector(`.channel-card[data-key="${first.key}"]`);
          const btn = card ? card.querySelector('.play-btn') : null;
          const audio = card ? card.querySelector('audio') : null;
          if (btn && audio) {
            playRadio(btn, audio, displayName(first), thumbOf(first));
          }
        }
      }
    } else {
      let handled = false;
      if (initialKey) {
        const match = arr.find(it => (it.ids?.internal_id || it.key) === initialKey);
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
              playRadio(btn, audio, displayName(match), thumbOf(match));
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
  if (!videoList) return;
  videoList.innerHTML = "";
  currentVideoChannelId = channelId;
  if (!channelId) return;

  try {
    const feed = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    // Primary proxy (fast, generous CORS)
    const proxy1 = `https://r.jina.ai/http://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    // Secondary proxy (fallback)
    const proxy2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(feed)}`;

    let xml = "";
    try {
      xml = await fetch(proxy1, { cache: "no-store" }).then(r => r.text());
      // r.jina.ai may return non-XML (markdown/JSON); ensure we have XML, otherwise fallback
      if (!xml || !xml.trim().startsWith("<")) throw new Error("Proxy1 bad shape");
    } catch {
      xml = await fetch(proxy2, { cache: "no-store" }).then(r => r.text());
    }

    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const entries = [...doc.querySelectorAll("entry")].slice(0, 10);
    if (currentVideoChannelId !== channelId || !entries.length) return;

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
          playerIF.src = `https://www.youtube.com/embed/${vid}?autoplay=1&rel=0&enablejsapi=1${muteParam}`;
          if (window.resizeLivePlayers) window.resizeLivePlayers();
        }
        if (audioWrap) audioWrap.style.display = "none";
        if (details && toggleDetailsBtn && details.innerHTML.trim().length) {
          toggleDetailsBtn.style.display = "";
        }
      });

      videoList.appendChild(row);

      fetchVideoDetails(vid).then(info => {
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
    const isSame = currentVideoKey === item.key;
    document.querySelectorAll(".channel-card").forEach(c => c.classList.toggle("active", c.dataset.key === item.key));
    if (isSame) return;

    currentVideoKey = item.key;
    params.set("m", mode);
    params.set("c", item.key);
    history.replaceState(null, "", "?" + params.toString());

    if (videoList) videoList.innerHTML = "";
    currentVideoChannelId = null;
    if (details) details.innerHTML = "";
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
        ? `https://www.youtube.com/embed/videoseries?list=${upl}&autoplay=1&rel=0&enablejsapi=1${muteParam}`
        : `https://www.youtube.com/embed/live_stream?channel=${item.ids.youtube_channel_id}&autoplay=1&rel=0&enablejsapi=1${muteParam}`;
    }
    if (playerIF) playerIF.src = src || "about:blank";
    if (playerIF && window.resizeLivePlayers) window.resizeLivePlayers();

    if (item.ids?.youtube_channel_id) {
      renderLatestVideosRSS(item.ids.youtube_channel_id);
    }

    if (details) {
      if (item.details_html) {
        details.innerHTML = item.details_html;
        details.style.display = "";
        if (toggleDetailsBtn) toggleDetailsBtn.style.display = "";
      } else {
        details.innerHTML = "";
        details.style.display = "none";
        if (toggleDetailsBtn) toggleDetailsBtn.style.display = "none";
      }
    }

    if (window.innerWidth <= 768) {
      const list = document.querySelector('.channel-list');
      if (list) list.classList.remove('open');
      const label = document.querySelector('#toggle-channels .label');
      if (label) label.textContent = label.dataset.default || label.textContent;
      if (typeof window.updateScrollLock === 'function') window.updateScrollLock();
    }

    updateActiveUI();
  }

  // ---- Radio playback ----
  function resetButton(btn) {
    btn.classList.remove('loading');
    const lbl = btn.querySelector('.label');
    if (lbl) {
      lbl.textContent = (currentBtn === btn) ? 'stop' : 'play_arrow';
    }
  }

  function playRadio(btn, audio, name, logoUrl) {
    if (!audio) return;

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

      params.set('m', mode === 'favorites' ? 'favorites' : mode);
    params.set('c', audio.id);
    history.replaceState(null, '', '?' + params.toString());

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
        if (mode === 'favorites') renderList(searchEl ? (searchEl.value || '') : '');
        updateFavoritesUI();
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
    playRadio(card.querySelector('.play-btn'), audio, displayName(item), thumbOf(item));
  }

  // Tabs + Search
  tabs.forEach(t => t.addEventListener("click", () => {
    mode = t.dataset.mode;
    params.set("m", mode);
    history.replaceState(null, "", "?" + params.toString());
    updateActiveUI();
    renderList(searchEl ? (searchEl.value || "") : "");
  }));
  if (searchEl) {
    searchEl.addEventListener("input", e => renderList(e.target.value));
    searchEl.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        renderList(searchEl.value);
        const firstCard = listEl.querySelector('.channel-card');
        if (firstCard) {
          firstCard.click();
          searchEl.value = '';
          renderList('');
        }
      }
    });
  }

  // ===== Init =====
  // If current mode has no items, switch to first available
    if (mode !== 'favorites' && !modeHasItems(mode)) {
      mode = detectAvailableMode();
      params.set("m", mode);
      history.replaceState(null, "", "?" + params.toString());
    }
  updateActiveUI();
  renderList(searchEl ? (searchEl.value || "") : "");
});
