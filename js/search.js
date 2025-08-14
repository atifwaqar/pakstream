document.addEventListener('DOMContentLoaded', function () {
  const params = new URLSearchParams(window.location.search);
  const query = (params.get('q') || '').trim();
  const container = document.getElementById('search-results');
  if (!container) return;
  if (!query) {
    container.textContent = 'Please enter a search term.';
    return;
  }
  const sources = [
    { url: '/channels.json', type: 'tv', link: c => `/livetv.html?tvchannel=${c.id}` },
    { url: '/freepress_channels.json', type: 'freepress', link: c => `/freepress.html?newsanchor=${c.key}` },
    { url: '/radio_channels.json', type: 'radio', link: c => `/radio.html?station=${c.id}` }
  ];
  Promise.all(sources.map(src => fetch(src.url)
    .then(res => res.json())
    .then(data => ({ type: src.type, link: src.link, data }))
  )).then(results => {
    const term = query.toLowerCase();
    const matches = [];
    results.forEach(group => {
      group.data.forEach(item => {
        const name = item.name || '';
        if (name.toLowerCase().includes(term)) {
          matches.push({ name, url: group.link(item), type: group.type });
        }
      });
    });
    if (matches.length === 0) {
      container.textContent = 'No results found.';
      return;
    }
    const ul = document.createElement('ul');
    matches.forEach(m => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = m.url;
      a.textContent = `${m.name} (${m.type})`;
      li.appendChild(a);
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }).catch(() => {
    container.textContent = 'Error fetching search data.';
  });
});
