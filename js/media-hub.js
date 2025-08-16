document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  let mode = params.get("m") || "tv";

  const response = await fetch("all_streams.json");
  const data = await response.json();
  const items = data.items || [];

  const channelList = document.getElementById("mh-channel-list");
  const playerArea = document.getElementById("mh-player-area");
  const aboutPanel = document.getElementById("mh-about");
  const upNextArea = document.getElementById("mh-upnext");
  const searchInput = document.getElementById("mh-search-input");

  function renderList(filter = "") {
    channelList.innerHTML = "";
    const filtered = items.filter(c => c.type === mode && c.name.toLowerCase().includes(filter.toLowerCase()));
    filtered.forEach(item => {
      const li = document.createElement("li");
      li.classList.add("mh-list-item");
      const thumb = item.media?.thumbnail_url || item.media?.logo_url;
      if (thumb) {
        const img = document.createElement("img");
        img.src = thumb;
        li.appendChild(img);
      }
      li.appendChild(document.createTextNode(item.name));
      li.addEventListener("click", () => selectItem(item));
      channelList.appendChild(li);
    });
  }

  function selectItem(item) {
    params.set("c", item.key);
    params.set("m", mode);
    history.replaceState(null, "", "?" + params.toString());

    playerArea.innerHTML = "";
    upNextArea.innerHTML = "";
    aboutPanel.innerHTML = "";

    if (item.type === "radio") {
      const endpoint = item.endpoints?.find(e => e.kind === "stream");
      if (endpoint) {
        const audio = document.createElement("audio");
        audio.controls = true;
        audio.autoplay = true;
        audio.src = endpoint.url;
        playerArea.appendChild(audio);
      } else {
        playerArea.innerHTML = "<div>No radio stream found</div>";
      }
    } else {
      const embed = item.endpoints?.find(e => e.kind === "embed");
      if (embed) {
        const iframe = document.createElement("iframe");
        iframe.width = "100%";
        iframe.height = "500";
        iframe.src = embed.url;
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        playerArea.appendChild(iframe);
      } else if (item.ids?.youtube_channel_id) {
        const iframe = document.createElement("iframe");
        iframe.width = "100%";
        iframe.height = "500";
        iframe.src = `https://www.youtube.com/embed/live_stream?channel=${item.ids.youtube_channel_id}&autoplay=1`;
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        playerArea.appendChild(iframe);
      } else {
        playerArea.innerHTML = "<div>No video available</div>";
      }
    }

    if (item.aboutHtml) {
      aboutPanel.innerHTML = item.aboutHtml;
    } else if (item.notes) {
      aboutPanel.innerHTML = `<p>${item.notes}</p>`;
    }
  }

  document.querySelectorAll(".mh-mode-switcher button").forEach(btn => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode;
      renderList();
      playerArea.innerHTML = `<div>Select a channel in ${mode}</div>`;
      upNextArea.innerHTML = "";
      aboutPanel.innerHTML = "";
    });
  });

  searchInput.addEventListener("input", e => renderList(e.target.value));

  // Initial render
  renderList();
  const initKey = params.get("c");
  if (initKey) {
    const match = items.find(c => c.key === initKey);
    if (match) selectItem(match);
  }
});
