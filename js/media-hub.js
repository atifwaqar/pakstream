document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  let mode = params.get("m") || "tv";

  // DOM
  const listEl    = document.querySelector(".channel-list");
  const playerIF  = document.getElementById("playerFrame");
  const audioWrap = document.getElementById("audioWrap");
  const videoList = document.getElementById("videoList");
  const details   = document.querySelector(".details-list");
  const tabs      = document.querySelectorAll(".tab-btn");
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

  function renderList(filter="") {
    listEl.innerHTML = "";
    const q = filter.trim().toLowerCase();
    const list = items.filter(i => i.type === mode && (!q || i.name.toLowerCase().includes(q)));

    list.forEach(it => {
      const card = document.createElement("div");
      card.className = "channel-card";
      card.dataset.key = it.key;

      const img = document.createElement("img");
      img.className = "channel-thumb";
      img.src = thumbOf(it);
      img.alt = "";

      const span = document.createElement("span");
      span.className = "channel-name";
      span.textContent = it.name;

      const playBtn = document.createElement("button");
      playBtn.className = "play-btn material-symbols-outlined";
      playBtn.setAttribute("aria-label","Play");
      playBtn.textContent = "play_arrow";
      playBtn.addEventListener("click", (e) => { e.stopPropagation(); select(it); });

      card.appendChild(img);
      card.appendChild(span);
      card.appendChild(playBtn);
      card.addEventListener("click", () => select(it));
      listEl.appendChild(card);
    });

    // Auto-select (or deep link)
    const key = params.get("c");
    const startItem = key ? list.find(x => x.key === key) : list[0];
    if (startItem) select(startItem);
  }

  function select(item) {
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
      let src = "";
      const emb = ytEmbed(item);
      if (emb) {
        src = emb.url;
      } else if (item.ids?.youtube_channel_id) {
        const upl = uploadsId(item.ids.youtube_channel_id);
        src = upl
          ? `https://www.youtube.com/embed/videoseries?list=${upl}`
          : `https://www.youtube.com/embed/live_stream?channel=${item.ids.youtube_channel_id}`;
      }
      playerIF.src = src || "about:blank";
    }

    // About panel
    if (item.aboutHtml) {
      details.innerHTML = item.aboutHtml;
      details.style.display = "";
      if (toggleDetailsBtn) toggleDetailsBtn.style.display = "";
    } else {
      details.innerHTML = "";
      details.style.display = "none";
      if (toggleDetailsBtn) toggleDetailsBtn.style.display = "none";
    }

    // “Up Next”: other items in current mode
    const others = items.filter(x => x.type === mode && x.key !== item.key).slice(0, 16);
    others.forEach(o => {
      const row = document.createElement("div");
      row.className = "video-item";

      const img = document.createElement("img");
      img.className = "video-thumb";
      img.src = thumbOf(o);
      img.alt = "";

      const meta = document.createElement("div");
      meta.className = "video-meta";
      meta.innerHTML = `<strong>${o.name}</strong>`;

      row.appendChild(img);
      row.appendChild(meta);
      row.addEventListener("click", () => select(o));
      videoList.appendChild(row);
    });
  }

  // Tabs
  tabs.forEach(t => t.addEventListener("click", () => {
    mode = t.dataset.mode;
    setActiveTab();
    renderList();
  }));

  setActiveTab();
  renderList();
});
