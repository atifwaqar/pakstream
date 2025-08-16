/* media-hub.js
 * Drop-in replacement.
 * - Loads latest YouTube videos for a channel via RSS without CORS issues.
 * - Designed for GitHub Pages (no backend).
 */

(() => {
  // ====== Config ======
  const USE_PROXY_FIRST = true; // set to false if you want to attempt direct YouTube fetch first (will log CORS errors)
  const MAX_VIDEOS = 10;

  // ====== DOM ======
  const videoList = document.getElementById("videoList");        // <div id="videoList"></div>
  const channelList = document.getElementById("channelList");    // your left menu container (cards)
  const mainPlayer = document.getElementById("mainPlayer");      // main <iframe> or <div> showing selected video

  // Defensive: if critical nodes are missing, bail early (prevents runtime errors)
  if (!videoList) console.warn("[media-hub] #videoList not found");
  if (!channelList) console.warn("[media-hub] #channelList not found");
  if (!mainPlayer) console.warn("[media-hub] #mainPlayer not found");

  // ====== Example state (replace with your real data loader) ======
  // Each item should contain at least: { title, ids: { youtube_channel_id } , live_embed_url? }
  let items = []; // populated by your existing bootstrapping code
  let selectedKey = null;

  // If your app already sets `items` and selects something, you can remove these demo helpers.
  function bootstrapItemsIfEmpty() {
    if (items && items.length) return;
    // Minimal demo item; in your app, you already have a real array
    items = [{
      key: "default",
      title: "Sample Channel",
      ids: { youtube_channel_id: "UCaszgR2TH3qNw_CxLHAd2SQ" },
      live_embed_url: null
    }];
    selectedKey = "default";
  }

  function getSelectedItem() {
    if (!selectedKey) return items?.[0] || null;
    return items.find(i => i.key === selectedKey) || items?.[0] || null;
  }

  // ====== Utilities ======
  function setMainPlayerToVideoId(videoId) {
    if (!mainPlayer || !videoId) return;
    // YouTube embed URL for a specific video
    const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    if (mainPlayer.tagName === "IFRAME") {
      mainPlayer.src = src;
    } else {
      mainPlayer.innerHTML = `<iframe width="100%" height="100%" src="${src}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    }
  }

  function setMainPlayerToLiveChannel(channelId) {
    if (!mainPlayer || !channelId) return;
    const src = `https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=1&rel=0`;
    if (mainPlayer.tagName === "IFRAME") {
      mainPlayer.src = src;
    } else {
      mainPlayer.innerHTML = `<iframe width="100%" height="100%" src="${src}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    }
  }

  function createVideoListItem({ title, videoId, published }) {
    const li = document.createElement("li");
    li.className = "video-list-item";
    li.innerHTML = `
      <button class="video-row" data-video="${videoId}" aria-label="Play ${escapeHtml(title)}">
        <span class="video-title">${escapeHtml(title)}</span>
        <span class="video-date">${escapeHtml(published)}</span>
      </button>
    `;
    li.querySelector("button").addEventListener("click", () => {
      setMainPlayerToVideoId(videoId);
    });
    return li;
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  // ====== RSS fetchers (CORS-safe) ======
  async function fetchYoutubeRssXML(channelId) {
    const direct = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const proxied1 = `https://api.allorigins.win/raw?url=${encodeURIComponent(direct)}`;
    const proxied2 = `https://r.jina.ai/http://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

    if (USE_PROXY_FIRST) {
      // proxy → proxy2 → direct (optional)
      try {
        return await (await fetch(proxied1)).text();
      } catch {
        try {
          return await (await fetch(proxied2)).text();
        } catch {
          // Last attempt (will CORS-error in console if requested from browser)
          const r = await fetch(direct);
          if (!r.ok) throw new Error(`YouTube RSS status ${r.status}`);
          return await r.text();
        }
      }
    } else {
      // direct → proxy → proxy2
      try {
        const r = await fetch(direct);
        if (!r.ok) throw new Error(`YouTube RSS status ${r.status}`);
        return await r.text();
      } catch {
        try {
          return await (await fetch(proxied1)).text();
        } catch {
          return await (await fetch(proxied2)).text();
        }
      }
    }
  }

  function parseYoutubeRss(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    const entries = Array.from(doc.querySelectorAll("entry"));
    return entries.slice(0, MAX_VIDEOS).map(e => {
      const title = e.querySelector("title")?.textContent?.trim() || "Untitled";
      // Prefer media:group > yt:videoId if present, else parse from link
      const videoId = e.querySelector("yt\\:videoId, videoId")?.textContent?.trim()
        || (e.querySelector("link")?.getAttribute("href") || "").split("v=").pop();
      const published = e.querySelector("published")?.textContent?.substring(0, 10) || "";
      return { title, videoId, published };
    }).filter(v => v.videoId);
  }

  // ====== CORE: Render latest videos list for selected channel ======
  async function renderLatestVideosRSS(channelId) {
    if (!videoList) return;
    videoList.innerHTML = "";
    if (!channelId) return;

    try {
      const xml = await fetchYoutubeRssXML(channelId);
      const videos = parseYoutubeRss(xml);

      const ul = document.createElement("ul");
      ul.className = "video-list";
      videos.forEach(v => ul.appendChild(createVideoListItem(v)));
      videoList.appendChild(ul);

      // If main player is empty, auto-play the most recent
      if (videos.length) {
        setMainPlayerToVideoId(videos[0].videoId);
      }
    } catch (err) {
      console.error("[media-hub] RSS load failed:", err);
      // Leave list empty silently
    }
  }

  // ====== Selection handling (left menu → pick a channel/item) ======
  function select(item) {
    if (!item) return;

    selectedKey = item.key || null;

    // Prefer explicit live embed if you store it; else show channel's live
    if (item.live_embed_url) {
      if (mainPlayer) {
        const src = item.live_embed_url.includes("autoplay")
          ? item.live_embed_url
          : `${item.live_embed_url}${item.live_embed_url.includes("?") ? "&" : "?"}autoplay=1`;
        if (mainPlayer.tagName === "IFRAME") {
          mainPlayer.src = src;
        } else {
          mainPlayer.innerHTML = `<iframe width="100%" height="100%" src="${src}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        }
      }
    } else if (item?.ids?.youtube_channel_id) {
      // Show YouTube LIVE for channel while list loads
      setMainPlayerToLiveChannel(item.ids.youtube_channel_id);
    }

    // Fire-and-forget: load latest videos list
    renderLatestVideosRSS(item?.ids?.youtube_channel_id || null);
  }

  // ====== List rendering (left pane) – wire up clicks ======
  function renderList() {
    if (!channelList || !Array.isArray(items)) return;
    channelList.innerHTML = "";

    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "channel-card";
      card.setAttribute("data-key", item.key || "");
      card.innerHTML = `
        <button class="play-btn" aria-label="Open ${escapeHtml(item.title || "Channel")}">
          <span class="channel-name">${escapeHtml(item.title || "Untitled")}</span>
        </button>
      `;
      card.querySelector(".play-btn").addEventListener("click", () => select(item));
      channelList.appendChild(card);
    });

    // Auto-select if nothing selected yet
    select(getSelectedItem());
  }

  // ====== Boot ======
  document.addEventListener("DOMContentLoaded", () => {
    bootstrapItemsIfEmpty(); // remove if your app already fills `items` and `selectedKey`
    renderList();
  });

  // ====== Public API (optional) ======
  // Expose minimal hooks if other scripts need them
  window.MediaHub = {
    setItems(newItems = [], defaultKey = null) {
      items = Array.isArray(newItems) ? newItems : [];
      selectedKey = defaultKey;
      renderList();
    },
    selectKey(key) {
      const found = items.find(i => i.key === key);
      if (found) select(found);
    }
  };
})();
