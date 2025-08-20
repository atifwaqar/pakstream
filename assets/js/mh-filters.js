(function(){
  document.addEventListener('DOMContentLoaded', function(){
    const container = document.getElementById('mh-filters');
    if(!container) return;

    container.innerHTML = `
      <label class="mh-live"><input type="checkbox" id="mh-filter-live" /> <span>Live Now</span></label>
      <div class="mh-sort" role="radiogroup" aria-label="Sort results">
        <button type="button" role="radio" aria-checked="false" data-sort="alpha">A \u2192 Z</button>
        <button type="button" role="radio" aria-checked="false" data-sort="recent">Most Recent</button>
        <button type="button" role="radio" aria-checked="false" data-sort="played">Recently Played</button>
      </div>
      <button type="button" id="mh-filter-reset">Reset</button>
    `;

    const liveEl = container.querySelector('#mh-filter-live');
    const sortButtons = Array.from(container.querySelectorAll('.mh-sort button'));
    const resetBtn = container.querySelector('#mh-filter-reset');

    const state = {
      liveNow: false,
      sort: 'alpha'
    };

    const params = new URLSearchParams(location.search);
    state.liveNow = params.get('live') === '1';
    const sortParam = params.get('sort');
    if(sortParam && ['alpha','recent','played'].includes(sortParam)) state.sort = sortParam;

    function render(){
      liveEl.checked = state.liveNow;
      sortButtons.forEach((btn, i) => {
        const active = btn.dataset.sort === state.sort;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-checked', active);
        btn.setAttribute('tabindex', active ? '0' : '-1');
      });
    }

    function syncURL(){
      const p = new URLSearchParams(location.search);
      if(state.liveNow) p.set('live','1'); else p.delete('live');
      if(state.sort && state.sort !== 'alpha') p.set('sort', state.sort); else p.delete('sort');
      const query = p.toString();
      const newUrl = query ? `?${query}` : location.pathname;
      history.replaceState(null, '', newUrl);
    }

    function emit(){
      syncURL();
      window.dispatchEvent(new CustomEvent('mh:filters:changed', {
        detail: { liveNow: state.liveNow, sort: state.sort }
      }));
    }

    liveEl.addEventListener('change', () => {
      state.liveNow = liveEl.checked;
      render();
      emit();
    });

    function selectSort(btn){
      state.sort = btn.dataset.sort;
      render();
      emit();
    }

    sortButtons.forEach((btn, idx) => {
      btn.addEventListener('click', () => selectSort(btn));
      btn.addEventListener('keydown', e => {
        const { key } = e;
        if(key === ' ' || key === 'Enter'){
          e.preventDefault();
          selectSort(btn);
        } else if(key === 'ArrowRight' || key === 'ArrowDown'){
          e.preventDefault();
          const next = sortButtons[(idx + 1) % sortButtons.length];
          selectSort(next);
          next.focus();
        } else if(key === 'ArrowLeft' || key === 'ArrowUp'){
          e.preventDefault();
          const prev = sortButtons[(idx - 1 + sortButtons.length) % sortButtons.length];
          selectSort(prev);
          prev.focus();
        }
      });
    });

    resetBtn.addEventListener('click', () => {
      state.liveNow = false;
      state.sort = 'alpha';
      render();
      emit();
    });

    render();
    emit();
  });
})();
