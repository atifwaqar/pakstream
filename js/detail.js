function track(name, data) {
  try { console.log('track', name, data); } catch {}
}

function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function adapt(item, routeType) {
  const slug = item.key || slugify(item.name);
  const type = item.type || (routeType === 'creator' ? 'creator' : (item.platform === 'audio' ? 'radio' : 'tv'));
  const provider = item.endpoints && item.endpoints[0] ? item.endpoints[0].provider || '' : '';
  const urlExternal = item.url || (item.endpoints && item.endpoints[0] ? item.endpoints[0].url : '');
  const logo = item.media && item.media.logo_url ? item.media.logo_url : '/images/default_radio.png';
  const descriptionHTML = item.description || '';
  return {
    id: (item.ids && item.ids.internal_id) || slug,
    slug,
    type,
    title: item.name || '',
    descriptionHTML,
    language: item.language || '',
    region: item.region || '',
    tags: item.tags || [],
    provider,
    poster: (item.media && item.media.poster_url) || logo,
    logo,
    isLive: !!(item.status && item.status.live),
    isNew: !!(item.status && item.status.new),
    isTrending: !!(item.status && item.status.trending),
    urlCanonical: location.origin + '/' + routeType + '/' + slug,
    urlExternal,
    latestItems: item.latest || []
  };
}

function mountPlayer(data) {
  const area = document.getElementById('playerArea');
  if (area.dataset.loaded) return;
  const iframe = document.createElement('iframe');
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture; web-share';
  iframe.loading = 'lazy';
  iframe.title = data.title + ' player';
  const mode = data.type === 'radio' ? 'radio' : (data.type === 'creator' ? 'creator' : 'tv');
  iframe.src = '/media-hub-embed.html?m=' + mode + '&c=' + encodeURIComponent(data.id);
  area.appendChild(iframe);
  area.hidden = false;
  area.dataset.loaded = '1';
}

function render(data) {
  document.getElementById('heroLogo').src = data.logo;
  document.getElementById('heroLogo').alt = data.title + ' logo';
  document.getElementById('heroTitle').textContent = data.title;
  document.getElementById('primaryAction').textContent = data.type === 'radio' ? 'Listen' : 'Watch Live';
  document.getElementById('primaryAction').addEventListener('click', () => {
    mountPlayer(data);
    track('detail_primary_action_click', { id: data.id, type: data.type });
  });

  const canonical = document.getElementById('canonicalLink');
  canonical.href = data.urlCanonical;
  document.getElementById('pageTitle').textContent = data.title + ' - PakStream';
  const desc = data.descriptionHTML.replace(/<[^>]+>/g, '').slice(0, 160);
  document.getElementById('metaDesc').content = desc;
  document.getElementById('ogTitle').content = data.title;
  document.getElementById('ogDesc').content = desc;
  document.getElementById('ogImage').content = data.poster;
  document.getElementById('ogUrl').content = data.urlCanonical;
  document.getElementById('twTitle').content = data.title;
  document.getElementById('twDesc').content = desc;
  document.getElementById('twImage').content = data.poster;
  document.getElementById('reportLink').href = 'mailto:contact@pakstream.com?subject=' + encodeURIComponent('Broken stream: ' + data.title);

  const about = document.getElementById('aboutSection');
  if (data.descriptionHTML) {
    about.hidden = false;
    document.getElementById('aboutContent').innerHTML = data.descriptionHTML;
  }

  const latest = document.getElementById('latestSection');
  if (data.latestItems && data.latestItems.length) {
    latest.hidden = false;
    const list = document.getElementById('latestList');
    data.latestItems.forEach(it => {
      const a = document.createElement('a');
      a.className = 'latest-item';
      a.href = it.url || '#';
      a.textContent = it.title;
      list.appendChild(a);
    });
  }

  const externalBtn = document.getElementById('externalBtn');
  if (data.urlExternal) {
    externalBtn.href = data.urlExternal;
  } else {
    externalBtn.style.display = 'none';
  }

  const favBtn = document.getElementById('favBtn');
  const favorites = JSON.parse(localStorage.getItem('psFavs') || '[]');
  const setFavUI = () => {
    favBtn.querySelector('.material-symbols-outlined').textContent = favorites.includes(data.id) ? 'favorite' : 'favorite_border';
    favBtn.setAttribute('aria-label', (favorites.includes(data.id) ? 'Remove ' : 'Add ') + data.title + ' to favorites');
  };
  setFavUI();
  favBtn.addEventListener('click', () => {
    const idx = favorites.indexOf(data.id);
    if (idx >= 0) favorites.splice(idx, 1); else favorites.push(data.id);
    localStorage.setItem('psFavs', JSON.stringify(favorites));
    setFavUI();
    track('detail_favorite_toggle', { id: data.id });
  });

  document.getElementById('shareBtn').addEventListener('click', () => {
    const shareData = { title: data.title, url: data.urlCanonical };
    if (navigator.share) {
      navigator.share(shareData);
    } else {
      prompt('Copy link', data.urlCanonical);
    }
    track('detail_share', { id: data.id });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const parts = location.pathname.split('/').filter(Boolean);
  const routeType = parts[0] || 'channel';
  const slug = parts[1] || '';
  try {
    const res = await fetch('/all_streams.json');
    const json = await res.json();
    const item = json.items.find(it => it.key === slug);
    if (!item) {
      document.getElementById('heroTitle').textContent = 'Not found';
      return;
    }
    const data = adapt(item, routeType);
    render(data);
    track('detail_impression', { type: data.type, id: data.id, source: new URLSearchParams(location.search).get('src') || 'direct' });
  } catch (e) {
    document.getElementById('heroTitle').textContent = 'Error loading';
  }
});
