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
    playBtn.addEventListener("click", (e) => { e.stopPropagation(); select(it, /*autoplay*/true); });

    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(playBtn);
    card.addEventListener("click", () => select(it, /*autoplay*/true));
    return card;
  }

  function renderList(filter="") {
    // Remove all channel-card children except the header block
    [...listEl.querySelectorAll(".channel-card")].forEach(n => n.remove());

    const q = filter.trim().toLowerCase();
    const list = items.filter(i => i.type === mode && (!q || i.name.toLowerCase().includes(q)));

    list.forEach(it => listEl.appendChild(makeChannelCard(it)));

    // Auto play the first item (like your existing pages)
    const deepKey = params.get("c");
    const startItem = deepKey ? list.find(x => x.key === deepKey) : list[0];
    if (startItem) select(startItem, /*autoplay*/true);
  }

  async function renderLatestVideosRSS(channelId) {
    videoList.innerHTML = "";
    if (!channelId) return;
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const xml = await fetch(rssUrl).then(r => r.text());
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
          audioWrap.innerHTML = "";
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
    audioWrap.innerHTML = "";

    if (mode === "radio") {
      const ep = radioEndpoint(item);
      if (ep) {
        playerIF.src = "about:blank";
        playerIF.style.display = "none";
        const audio = document.createElement("audio");
        audio.controls = true;
        audio.autoplay = true;
        audio.src = ep.url;
        audioWrap.appendChild(audio);
        audioWrap.style.display = "";
      } else {
        playerIF.src = "about:blank";
      }
    } else {
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
    }

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
