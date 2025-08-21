
(function(){
  async function loadAllProducts(){
    // 1) Runtime methods (best)
    try{
      if (window.Storefront && typeof Storefront.getAllProducts === 'function'){
        const r = await Storefront.getAllProducts();
        if (Array.isArray(r) && r.length) return r;
      }
    }catch(e){}
    try{
      if (window.Storefront && typeof Storefront.getAll === 'function'){
        const r = await Storefront.getAll();
        if (Array.isArray(r) && r.length) return r;
      }
    }catch(e){}
    try{
      if (window.Storefront && typeof Storefront.getProducts === 'function'){
        const r = await Storefront.getProducts();
        if (Array.isArray(r) && r.length) return r;
      }
    }catch(e){}

    // 2) Global variables used by older builds
    const globals = [
      'ALL_PRODUCTS','__ALL_PRODUCTS__','PRODUCTS','__PRODUCTS__','products','catalog','CATALOG'
    ];
    for (var i=0;i<globals.length;i++){
      var key = globals[i];
      if (Array.isArray(window[key]) && window[key].length) return window[key];
    }

    // 3) Look for a window.data.products shape
    if (window.data && Array.isArray(window.data.products) && window.data.products.length){
      return window.data.products;
    }

    // 4) Try a conventional data file
    try{
      const resp = await fetch('/assets/data/products.json', { credentials:'same-origin' });
      if (resp.ok){
        const json = await resp.json();
        // accept raw array or {products:[]}
        if (Array.isArray(json)) return json;
        if (Array.isArray(json.products)) return json.products;
      }
    }catch(e){}

    // 5) Fallback empty
    return [];
  }

  function renderGrid(items){
    var grid = document.getElementById('home-grid');
    if (!grid) return;
    grid.innerHTML = items.map(function(p){ 
      try { return window.ProductCard.renderProductCard(p); }
      catch(e){ console.warn('render error', e, p); return ''; }
    }).join('');
  }

  function updateProgress(viewed, total){
    var wrap = document.getElementById('home-progress');
    if(!wrap) return;
    wrap.hidden = false;
    var pct = total ? Math.min(100, Math.round((viewed/total)*100)) : 0;
    document.getElementById('viewed-count').textContent = viewed;
    document.getElementById('total-count').textContent = total;
    document.getElementById('progress-bar').style.width = pct + '%';
  }

  document.addEventListener('DOMContentLoaded', async function(){
    var page = 0, size = 24;
    var all = await loadAllProducts();
    var btn = document.getElementById('load-more');
    function draw(){
      var slice = all.slice(0, (page+1)*size);
      renderGrid(slice);
      updateProgress(slice.length, all.length);
      if (slice.length >= all.length && btn) btn.disabled = true;
    }
    if (btn){ btn.addEventListener('click', function(){ page++; draw(); }); }
    draw();
    // Expose for debugging
    window.__homeFeed = { all: all, next: function(){ page++; draw(); } };
  });
})();
