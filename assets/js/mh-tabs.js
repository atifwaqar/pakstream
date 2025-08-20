(function(){
  function initTabs(){
    const tablist = document.getElementById('mh-tabs');
    if(!tablist) return;
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    if(!tabs.length) return;
    // Determine starting tab from URL or default to first
    const params = new URLSearchParams(location.search);
    let current = params.get('tab') || tabs.find(t=>t.getAttribute('aria-selected')==='true')?.dataset.tab || tabs[0].dataset.tab;

    function activate(tab, updateUrl=true){
      if(!tab) return;
      tabs.forEach(t => {
        const selected = t === tab;
        t.classList.toggle('active', selected);
        t.setAttribute('aria-selected', selected ? 'true' : 'false');
        t.tabIndex = selected ? 0 : -1;
      });
      current = tab.dataset.tab;
      if(updateUrl){
        const p = new URLSearchParams(location.search);
        if(current && current !== 'all') p.set('tab', current); else p.delete('tab');
        const qs = p.toString();
        history.replaceState(null, '', qs ? '?' + qs : location.pathname);
      }
      const ev = new CustomEvent('mh:tabs:changed', {detail:{tab:current}});
      document.dispatchEvent(ev);
    }

    // Click activation
    tablist.addEventListener('click', e => {
      const tab = e.target.closest('[role="tab"]');
      if(tab) activate(tab);
    });

    // Keyboard navigation
    tablist.addEventListener('keydown', e => {
      const index = tabs.indexOf(document.activeElement);
      if(index === -1) return;
      let newIndex = null;
      switch(e.key){
        case 'ArrowRight':
          newIndex = (index + 1) % tabs.length; break;
        case 'ArrowLeft':
          newIndex = (index - 1 + tabs.length) % tabs.length; break;
        case 'Home':
          newIndex = 0; break;
        case 'End':
          newIndex = tabs.length - 1; break;
        case 'Enter':
        case ' ':
          activate(tabs[index]);
          return;
        default:
          return;
      }
      tabs[newIndex].focus();
      e.preventDefault();
    });

    // External requests to change tab
    document.addEventListener('mh:tabs:set', e => {
      const name = e.detail && e.detail.tab;
      const target = tabs.find(t => t.dataset.tab === name);
      if(target) activate(target);
    });

    // Initial activation
    const first = tabs.find(t=>t.dataset.tab===current) || tabs[0];
    activate(first, true);
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Defer initial event so other listeners can attach
    setTimeout(initTabs, 0);
  });
})();

