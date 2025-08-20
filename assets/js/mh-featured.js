(function () {
  const Core = window.PAKSTREAM?.MHCore;
  if (!Core) return;

  async function hydrateFeatured() {
    const wrap = document.querySelector('[data-crs][data-crs-auto]');
    if (!wrap) return;
    const track = wrap.querySelector('[data-crs-track]');
    if (!track) return;

    const data = await Core.loadStreams();
    const pick = data.slice(0, 10); // simple top-10; replace with your own selection
    const html = pick.map(item => `
      <div class="ps-crs-item" data-crs-item>
        <article class="mh-card" data-mh-card data-search="${(item.title||'')+ ' ' + (item.country||'')}">
          <div class="mh-head">
            ${item.thumb ? `<img class="mh-thumb" src="${item.thumb}" alt="${item.title}">` : ''}
            <div class="mh-meta">
              <h3 class="mh-title">${item.title}</h3>
              ${item.country ? `<div class="mh-sub">${item.country}</div>` : ''}
            </div>
          </div>
          <div class="mh-media" data-stream-container ${item.yt ? 'data-youtube-container' : 'data-radio-container'}>
            ${item.yt
              ? `<iframe data-youtube src="https://www.youtube.com/embed/${item.yt}?enablejsapi=1" allow="autoplay; encrypted-media" loading="lazy"></iframe>`
              : `<audio data-radio preload="none" src="${item.url}"></audio><button class="mh-play" type="button" data-mh-play>Play</button>`
            }
          </div>
        </article>
      </div>
    `).join('');
    track.innerHTML = html;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateFeatured);
  } else { hydrateFeatured(); }
})();

