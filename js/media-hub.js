document.addEventListener("DOMContentLoaded", async () => {
  // state
  const params = new URLSearchParams(location.search);
  let mode = params.get("m") || "tv";
  const res = await fetch("all_streams.json");
  const data = await res.json();
  const items = data.items || [];

  // dom
  const tabs = document.querySelectorAll(".tab-btn");
  const listEl = document.getElementById("mh-channel-list");
  const playerEl = document.getElementById("mh-player-area");
  const aboutEl  = document.getElementById("mh-about");
  const upnextEl = document.getElementById("mh-upnext");
  const searchEl = document.getElementById("mh-search-input");

  // helpers
  const setActiveTab = () => tabs.forEach(t => t.classList.toggle("active", t.dataset.mode === mode));
  const ytUploadsFromChannel = (cid)=> cid?.startsWith("UC") ? "UU"+cid.slice(2) : null;
  const thumbOf = (it)=> it.media?.thumbnail_url || it.media?.logo_url || "";
  const radioEndpoint = (it)=> (it.endpoints||[]).find(e => (e.kind==="stream"||e.kind==="audio") && e.url);
  const ytEmbed = (it)=> (it.endpoints||[]).find(e => e.kind==="embed" && e.provider==="youtube");

  function renderList(filter="") {
    listEl.innerHTML = "";
    const q = filter.trim().toLowerCase();
    const dataInMode = items.filter(i => i.type === mode && (!q || i.name.toLowerCase().includes(q)));

    dataInMode.forEach(it => {
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

      card.appendChild(img);
      card.appendChild(name);
      card.addEventListener("click", () => selectItem(it));
      listEl.appendChild(card);
    });

    // auto-select (or deep link)
    const key = params.get("c");
    const pick = key ? dataInMode.find(x => x.key === key) : dataInMode[0];
    if (pick) selectItem(pick);
  }

  function selectItem(item) {
    // active highlight
    document.querySelectorAll(".channel-card").forEach(c => c.classList.toggle("active", c.dataset.key === item.key));

    // URL
    params.set("m", mode);
    params.set("c", item.key);
    history.replaceState(null, "", "?"+params.toString());

    // clear
    playerEl.innerHTML = "";
    upnextEl.innerHTML = "";
    aboutEl.innerHTML = "";

    if (mode === "radio") {
      const ep = radioEndpoint(item);
      if (ep) {
        const wrap = document.createElement("div");
        wrap.className = "audio-wrap";
        const audio = document.createElement("audio");
        audio.controls = true;
        audio.autoplay = true;
        audio.src = ep.url;
        wrap.appendChild(audio);
        playerEl.appendChild(wrap);
      } else {
        playerEl.textContent = "No radio stream available.";
      }
    } else {
      // YouTube: explicit embed > uploads playlist > live_stream
      const emb = ytEmbed(item);
      let src = emb?.url || "";
      if (!src && item.ids?.youtube_channel_id) {
        const upl = ytUploadsFromChannel(item.ids.youtube_channel_id);
        src = upl
          ? `https://www.youtube.com/embed/videoseries?list=${upl}`
          : `https://www.youtube.com/embed/live_stream?channel=${item.ids.youtube_channel_id}`;
      }
      if (src) {
        const iframe = document.createElement("iframe");
        iframe.width = "100%";
        iframe.height = "560";
        iframe.src = src;
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;
        iframe.loading = "lazy";
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        playerEl.appendChild(iframe);
      } else {
        playerEl.textContent = "No video available.";
      }
      // (Optional) simple "Up next" placeholder from endpoints if present later
    }

    // About / profiles
    if (item.aboutHtml) {
      // already sanitized markup you store
      aboutEl.innerHTML = item.aboutHtml;
    } else {
      aboutEl.innerHTML =
        `<div class="detail-item">PakStream curates independent Pakistani voices.</div>
         <div class="detail-item">Opinions belong to their creators.</div>`;
    }
  }

  // events
  tabs.forEach(t => t.addEventListener("click", () => {
    mode = t.dataset.mode;
    setActiveTab();
    renderList(searchEl.value || "");
  }));
  searchEl.addEventListener("input", e => renderList(e.target.value));

  // init
  setActiveTab();
  renderList(searchEl.value || "");
});
