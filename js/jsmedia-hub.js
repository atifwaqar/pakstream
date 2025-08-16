document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  let mode = params.get("m") || "tv";

  const response = await fetch("all_streams.json");
  const allData = await response.json();

  const channelList = document.getElementById("mh-channel-list");
  const playerArea = document.getElementById("mh-player-area");
  const aboutPanel = document.getElementById("mh-about");

  function renderList() {
    channelList.innerHTML = "";
    const filtered = allData.channels.filter(c => c.type === mode);
    filtered.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item.name;
      li.addEventListener("click", () => selectItem(item));
      channelList.appendChild(li);
    });
  }

  function selectItem(item) {
    playerArea.innerHTML = `<div>Player for <b>${item.name}</b></div>`;
    aboutPanel.innerHTML = item.aboutHtml || "";
    params.set("c", item.key);
    params.set("m", mode);
    history.replaceState(null, "", "?" + params.toString());
  }

  document.querySelectorAll(".mh-mode-switcher button").forEach(btn => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode;
      renderList();
      aboutPanel.innerHTML = "";
      playerArea.innerHTML = `<div>Select a channel in ${mode}</div>`;
    });
  });

  renderList();
});
