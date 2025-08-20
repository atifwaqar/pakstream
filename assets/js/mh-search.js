document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('mh-search');
  if (!container) return;
  const input = container.querySelector('input[type="search"]');
  const clearBtn = container.querySelector('.clear-btn');

  const emit = q => window.dispatchEvent(new CustomEvent('mh:search:changed', { detail: { q } }));

  let timer;
  input.addEventListener('input', () => {
    clearBtn.hidden = !input.value;
    clearTimeout(timer);
    timer = setTimeout(() => emit(input.value.trim()), 200);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.hidden = true;
    emit('');
    input.focus();
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      input.value = '';
      clearBtn.hidden = true;
      emit('');
    }
  });

  window.addEventListener('mh:search:changed', e => {
    const q = (e.detail && e.detail.q) || '';
    if (input.value !== q) {
      input.value = q;
    }
    clearBtn.hidden = !q;
    const params = new URLSearchParams(location.search);
    if (q) params.set('q', q); else params.delete('q');
    const newUrl = params.toString() ? `?${params}` : location.pathname;
    history.replaceState(null, '', newUrl);
  });

  const params = new URLSearchParams(location.search);
  const initial = params.get('q') || '';
  if (initial) emit(initial);
});
