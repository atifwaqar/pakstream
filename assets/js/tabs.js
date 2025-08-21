
// Dynamic tabs renderer: pulls categories from your runtime or local data.
(function(){
  async function loadCategories(){
    // 1) Runtime candidates
    const candidates = [
      ['Storefront.getCategories', () => window.Storefront && typeof Storefront.getCategories === 'function' && Storefront.getCategories()],
      ['Storefront.getAllCategories', () => window.Storefront && typeof Storefront.getAllCategories === 'function' && Storefront.getAllCategories()],
      ['Storefront.getTaxonomy', () => window.Storefront && typeof Storefront.getTaxonomy === 'function' && Storefront.getTaxonomy()],
      ['Storefront.listCategories', () => window.Storefront && typeof Storefront.listCategories === 'function' && Storefront.listCategories()],
    ];
    for (const [name,fn] of candidates){
      try{
        const r = await fn();
        if (Array.isArray(r) && r.length) return r;
        if (r && Array.isArray(r.categories) && r.categories.length) return r.categories;
      }catch(e){ /* keep trying */ }
    }

    // 2) Globals
    const globals = ['CATEGORIES','__CATEGORIES__','categories'];
    for (const k of globals){
      if (Array.isArray(window[k]) && window[k].length) return window[k];
      if (window[k] && Array.isArray(window[k].categories)) return window[k].categories;
    }
    if (window.data && Array.isArray(window.data.categories)) return window.data.categories;

    // 3) Local JSON
    try{
      const resp = await fetch('/assets/data/categories.json', { credentials:'same-origin' });
      if (resp.ok){
        const json = await resp.json();
        if (Array.isArray(json)) return json;
        if (Array.isArray(json.categories)) return json.categories;
      }
    }catch(e){}

    return [];
  }

  function normalize(c){
    const name = c.name || c.title || c.label || 'Category';
    const slug = c.slug || c.handle || (name||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    const url  = c.url || c.href || `/c/${slug}/`;
    const parent = c.parent_id ?? c.parent ?? c.parentId ?? null;
    const order = c.order ?? c.position ?? c.sort ?? 0;
    return { id: c.id || slug, name, slug, url, parent, order };
  }

  function isTopLevel(c){
    // treat null/undefined/0/'' as top-level
    return c.parent == null || c.parent === 0 || c.parent === '' || c.parent === 'root';
  }

  function uniqueBy(arr, key){
    const seen = new Set(); const out = [];
    for (const item of arr){
      const k = item[key];
      if (seen.has(k)) continue;
      seen.add(k); out.push(item);
    }
    return out;
  }

  function renderTabs(cats){
    const nav = document.querySelector('.bnz-tabs');
    if (!nav) return;

    // Build list
    const path = location.pathname.replace(/\/+$/,'/') || '/';
    function active(href){
      try{
        const u = new URL(href, location.origin);
        return path === u.pathname || path.startsWith(u.pathname);
      }catch{ return false; }
    }

    // optional "All" tab pointing to home (matches reference)
    const allTab = { id:'__all', name:'Beauty', url: '/', order: -1, parent:null };
    const tops = cats.filter(isTopLevel).map(normalize);
    const uniq = uniqueBy(tops, 'slug').sort((a,b)=> (a.order||0) - (b.order||0) || a.name.localeCompare(b.name));

    // Limit to 6–8 like the reference; you can increase if needed.
    const limited = uniq.slice(0, 8);
    const items = [allTab, ...limited];

    // Render
    nav.innerHTML = items.map(it => `
      <a class="bnz-tabs__item ${active(it.url) ? 'is-active' : ''}" href="${it.url}">
        ${it.name}
      </a>
    `).join('');
  }

  document.addEventListener('DOMContentLoaded', async function(){
    try{
      const raw = await loadCategories();
      if (raw && raw.length){
        renderTabs(raw);
      } else {
        // keep existing markup if present
        // or provide a minimal fallback
        const nav = document.querySelector('.bnz-tabs');
        if (nav && !nav.children.length){
          nav.innerHTML = `
            <a class="bnz-tabs__item is-active" href="/">Beauty</a>
          `;
        }
      }
    }catch(e){
      console.warn('tabs render error', e);
    }
  });
})();
