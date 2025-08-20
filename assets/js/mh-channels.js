// assets/js/mh-channels.js
(function () {
  const Core = window.PAKSTREAM?.MHCore;
  if (!Core) return;

  function cardHTML(item) {
    const isYT = !!item.yt;
    const media = isYT
      ? `<div class="mh-media" data-stream-container data-youtube-container>
           <iframe data-youtube src="https://www.youtube.com/embed/${item.yt}?enablejsapi=1"
                   allow="autoplay; encrypted-media" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
         </div>`
      : `<div class="mh-media" data-stream-container data-radio-container>
           <audio data-radio preload="none" src="${item.url}"></audio>
           <button class="mh-play" type="button" data-mh-play>Play</button>
         </div>`;

    const tags = (item.tags || []).slice(0, 3).map(t => `<span class="mh-tag">${t}</span>`).join('');

    const searchBlob = [item.title, item.country, ...(item.tags || [])].join(' ');
    const thumb = item.thumb ? `<img class="mh-thumb" src="${item.thumb}" alt="${item.title}">` : '';

    return `<article class="mh-card" data-mh-card data-search="${searchBlob}">
      <div class="mh-head">
        ${thumb}
        <div class="mh-meta">
          <h3 class="mh-title">${item.title}</h3>
          ${item.country ? `<div class="mh-sub">${item.country}</div>` : ''}
          ${tags ? `<div class="mh-tags">${tags}</div>` : ''}
        </div>
      </div>
      ${media}
    </article>`;
  }

  function wireInteractions(container) {
    container.querySelectorAll('[data-mh-play]').forEach(btn => {
      btn.addEventListener('click', () => {
        const audio = btn.closest('[data-radio-container]')?.querySelector('audio[data-radio]');
        if (audio) { try { audio.play(); } catch {} }
      });
    });
  }

  async function render(root) {
    const list = root.querySelector('[data-mh-list]');
    if (!list) return;
    list.innerHTML = '<div class="mh-empty">Loading…</div>';

    const data = await Core.loadStreams();
    if (!data.length) { list.innerHTML = '<div class="mh-empty">No channels available.</div>'; return; }

    const html = data.map(cardHTML).join('');
    list.innerHTML = html;
    wireInteractions(list);
  }

  function init(root) {
    if (!root || root.__mhChannels) return;
    root.__mhChannels = true;
    render(root);
  }

  function auto() {
    document.querySelectorAll('[data-mh]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', auto);
  } else { auto(); }
})();
