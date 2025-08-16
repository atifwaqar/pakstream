document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  let mode = params.get("m") || "tv";

  // DOM
  const leftRail  = document.getElementById("left-rail");
  const listEl    = leftRail; // we append cards into the left rail (which contains .channel-list)
  const playerIF  = document.getElementById("playerFrame");
  const audioWrap = document.getElementById("audioWrap");
  const videoList = document.getElementById("videoList");
  const details   = document.querySelector(".details-list");
  const tabs      = document.querySelectorAll(".tab-btn");
  const searchEl  = document.getElementById("mh-search-input");
  const toggleDetailsBtn = document.getElementById("toggle-details");

  // Radio player elements
  const radioPlayer = document.getElementById("radio-player");
  const currentLabel = document.getElementById("current-station");
  const playPauseBtn = document.getElementById("play-pause-btn");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const muteBtn = document.getElementById("mute-btn");
  const shareBtn = document.getElementById("share-btn");

  const favKeys = { tv: "tvFavorites", freepress: "ytFavorites", creator: "ytFavorites", radio: "radioFavorites" };
  let favorites = JSON.parse(localStorage.getItem(favKeys[mode]) || "[]");
  const defaultLogo = "/images/default_radio.png";

  let currentAudio = null;
  let resumeHandler = null;

  // Data
  const res = await fetch("/all_streams.json");
  const data = await res.json();
  const items = data.items || [];

  // Helpers
  const thumbOf = it => it.media?.thumbnail_url || it.media?.logo_url || "/assets/avatar-fallback.png";
  const ytEmbed = it => (it.endpoints||[]).find(e => e.kind === "embed" && e.provider === "youtube");
  const radioEndpoint = it => (it.endpoints||[]).find(e => (e.kind==="stream"||e.kind==="audio") && e.url);
  const uploadsId = cid => cid && cid.startsWith("UC") ? "UU" + cid.slice(2) : null;
  const ytThumb = vid => `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  // ---- UI state (single function, no duplicates) ----
  function updateActiveUI() {
    // Tabs visual + aria
    tabs.forEach(t => {
      const isActive = t.dataset.mode === mode;
      t.classList.toggle("active", isActive);
      t.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    // Player vs Radio controls
    if (mode === "radio") {
      if (playerIF) playerIF.style.display = "none";
      if (audioWrap) audioWrap.style.display = "";
      if (details) details.style.display = "none";
      if (toggleDetailsBtn) toggleDetailsBtn.style.display = "none";
    } else {
      if (playerIF) playerIF.style.display = "";
      if (audioWrap) audioWrap.style.display = "none";
      if (details) {
        const hasDetails = details.innerHTML.trim().length > 0;
        details.style.display = hasDetails ? "" : "none";
      }
      if (toggleDetailsBtn) {
        const hasDetails = details && details.innerHTML.trim().length > 0;
        toggleDetailsBtn.style.display = hasDetails ? "" : "none";
      }
    }

    // Refresh favorites cache per mode
    favorites = JSON.parse(localStorage.getItem(favKeys[mode]) || "[]");
    updateFavoritesUI();
  }

  // ---- Channel card ----
  function makeChannelCard(it) {
    const card = document.createElement("div");
    card.className = "channel-card";
    card.dataset.key = it.key;

    const img = document.createElement("img");
    img.className = "channel-thumb";
    img.src = thumbOf(it);
    img.alt = it.title || "";

    const name = document.createElement("span");
    name.className = "channel-name";
    name.textContent = it.title || it.key;

    const playBtn = document.createElement("button");
    playBtn.className = "play-btn material-symbols-outlined";
    playBtn.setAttribute("aria-label", "Play");
    playBtn.textContent = "play_arrow";

    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(playBtn);

    const favButton = document.createElement("button");
    favButton.className = "fav-btn material-symbols-outlined";
    favButton.setAttribute("aria-label","Toggle favorite");
    favButton.textContent = "favorite_border";
    favButton.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(it.key);
    });
    card.appendChild(favButton);

    if (mode === "radio") {
      const ep = radioEndpoint(it);
      const audio = document.createElement("audio");
      audio.preload = "none";
      if (ep) {
        audio.src = ep.url;
        audio.id = it.key;
      }
      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!ep) return;
        selectRadio(audio, it.title || it.key, it.media?.logo_url || defaultLogo);
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
    document.querySelectorAll(".channel-card").forEach(c => {
      const key = c.dataset.key;
      const btn = c.querySelector(".fav-btn");
      if (!btn) return;
      const on = favorites.includes(key);
      btn.textContent = on ? "favorite" : "favorite_border";
      c.classList.toggle("favorite", on);
    });
  }

  function toggleFavorite(key) {
    const idx = favorites.indexOf(key);
    if (idx >= 0) favorites.splice(idx, 1);
    else favorites.push(key);
    localStorage.setItem(favKeys[mode], JSON.stringify(favorites));
    updateFavoritesUI();
  }

  function renderList(filter="") {
    if (!listEl) return;
    // Remove existing cards
    const existing = listEl.querySelectorAll(".channel-card");
    existing.forEach(el => el.remove());

    // Filter by mode
    let arr = items.filter(i => {
      if (mode === "tv") return i.category === "tv";
      if (mode === "freepress") return i.category === "freepress";
      if (mode === "creator") return i.category === "creator";
      if (mode === "radio") return i.category === "radio";
      return false;
    });

    // Search
    const q = (filter || "").toLowerCase().trim();
    if (q) arr = arr.filter(i => (i.title||"").toLowerCase().includes(q) || (i.key||"").toLowerCase().includes(q));

    // Sort favorites first, then by title
    arr.sort((a,b) => {
      const af = favorites.includes(a.key) ? 0 : 1;
      const bf = favorites.includes(b.key) ? 0 : 1;
      if (af !== bf) return af - bf;
      return (a.title||"").localeCompare(b.title||"");
    });

    // Render
    const frag = document.createDocumentFragment();
    arr.forEach(it => frag.appendChild(makeChannelCard(it)));
    listEl.appendChild(frag);

    // Auto-select first item for non-radio if player empty
    if (mode !== "radio" && playerIF && (playerIF.src === "" || playerIF.src === "about:blank") && arr.length) {
      select(arr[0], false);
    }
    updateFavoritesUI();
  }

  // ---- CORS-safe RSS loader ----
  async function renderLatestVideosRSS(channelId) {
    if (!videoList) return;
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
        try {
          const proxyFeed = `https://api.allorigins.win/raw?url=${encodeURIComponent(directFeed)}`;
          xml = await fetch(proxyFeed).then(r => r.text());
        } catch {
          const proxy2 = `https://r.jina.ai/http://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
          xml = await fetch(proxy2).then(r => r.text());
        }
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
          if (playerIF) {
            playerIF.style.display = "";
            playerIF.src = `https://www.youtube.com/embed/${vid}?autoplay=1&rel=0`;
          }
          if (audioWrap) audioWrap.style.display = "none";
          if (details && toggleDetailsBtn) {
            if (details.innerHTML.trim().length) toggleDetailsBtn.style.display = "";
          }
        });

        videoList.appendChild(row);
      });
    } catch {
      // keep list empty silently
    }
  }

  // ---- Selection for TV/FreePress/Creator ----
  function select(item, autoplay=false) {
    // Highlight
    document.querySelectorAll(".channel-card").forEach(c => c.classList.toggle("active", c.dataset.key === item.key));

    // URL
    params.set("m", mode);
    params.set("c", item.key);
    history.replaceState(null, "", "?" + params.toString());

    // Reset
    if (videoList) videoList.innerHTML = "";
    if (details) details.innerHTML = "";
    if (playerIF) playerIF.style.display = "";
    if (audioWrap) audioWrap.style.display = "none";

    // Prefer explicit YouTube embed; else uploads playlist; else live
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
    if (playerIF) playerIF.src = src || "about:blank";

    // Latest videos under player
    if (item.ids?.youtube_channel_id) {
      renderLatestVideosRSS(item.ids.youtube_channel_id);
    }

    // Details
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

    updateActiveUI();
  }

  // ---- Radio selection ----
  function selectRadio(audio, name, logoUrl) {
    if (!audio) return;

    if (currentAudio && currentAudio !== audio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    if (playerIF) playerIF.style.display = "none";
    if (audioWrap) audioWrap.style.display = "";

    const stationLogo = document.getElementById("station-logo");
    const liveBadge = document.getElementById("live-badge");
    const notLiveBadge = document.getElementById("not-live-badge");

    if (stationLogo) stationLogo.src = logoUrl || defaultLogo;
    if (liveBadge) liveBadge.hidden = false;
    if (notLiveBadge) notLiveBadge.hidden = true;

    audio.play().catch(() => {
      // mobile autoplay gate
      resumeHandler = () => { audio.play().catch(()=>{}); };
      document.addEventListener('touchstart', resumeHandler, { once: true });
    });

    currentAudio = audio;
    if (currentLabel) currentLabel.textContent = name;

    params.set('m', 'radio');
    params.set('c', audio.id);
    history.replaceState(null, '', '?' + params.toString());

    // Close left menu on mobile if your code supports it
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
    const card = audio.closest('.channel-card');
    const key = card?.dataset.key;
    const item = items.find(i => i.key === key);
    if (!item) return;
    selectRadio(audio, item.title || item.key, item.media?.logo_url || defaultLogo);
  }

  // ---- Radio UI buttons ----
  if (playPauseBtn) {
    playPauseBtn.addEventListener("click", () => {
      if (!currentAudio) return;
      if (currentAudio.paused) currentAudio.play().catch(()=>{});
      else currentAudio.pause();
    });
  }
  if (prevBtn) prevBtn.addEventListener("click", () => playStation(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => playStation(1));
  if (muteBtn) muteBtn.addEventListener("click", () => {
    if (!currentAudio) return;
    currentAudio.muted = !currentAudio.muted;
  });
  if (shareBtn) shareBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      shareBtn.textContent = "check";
      setTimeout(() => shareBtn.textContent = "share", 1200);
    } catch {}
  });

  // ---- Tabs + Search ----
  tabs.forEach(t => t.addEventListener("click", () => {
    mode = t.dataset.mode;
    updateActiveUI();
    renderList(searchEl ? (searchEl.value || "") : "");
  }));
  if (searchEl) searchEl.addEventListener("input", e => renderList(e.target.value));

  // ---- Init ----
  updateActiveUI();
  renderList(searchEl ? (searchEl.value || "") : "");
});
