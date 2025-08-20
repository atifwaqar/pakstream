(() => {
  if (window.__FLAGS_PANEL_WIRED__) return;
  window.__FLAGS_PANEL_WIRED__ = true;

  // Ensure flags object exists
  window.__PAKSTREAM_FLAGS = Object.assign({
    ads: false,
    adsDebug: false,
    sw: false,
    swDebug: false,
    newPalette: false
  }, window.__PAKSTREAM_FLAGS || {});

  const FLAGS = window.__PAKSTREAM_FLAGS;

  // Utilities
  const emitRerender = () => window.dispatchEvent(new Event('pakstream:rerender'));
  const saveState = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const readState = (k, d=null) => { try { const v = localStorage.getItem(k); return v==null?d:v; } catch { return d; } };

  // Build panel
  const el = document.createElement('div');
  el.className = 'pak-flags';
  el.innerHTML = `
    <header>
      <div>Dev Flags <span class="pill">Ctrl+Shift+D</span></div>
      <button type="button" data-close>✕</button>
    </header>
    <div class="body" role="region" aria-label="Developer Flags"></div>
  `;
  document.body.appendChild(el);

  const body = el.querySelector('.body');

  function makeRow(key, value) {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <label>${key}</label>
      <input type="checkbox" ${value ? 'checked' : ''} data-flag="${key}">
    `;
    return row;
  }

  function render() {
    body.innerHTML = '';
    const flags = Object.keys(FLAGS).sort();
    flags.forEach(k => body.appendChild(makeRow(k, !!FLAGS[k])));

    const btns = document.createElement('div');
    btns.className = 'btns';
    const btnReset = document.createElement('button');
    btnReset.textContent = 'Reset SW & Caches';
    btnReset.addEventListener('click', async () => {
      if (typeof window.PAKSTREAM_SW_RESET === 'function') {
        await window.PAKSTREAM_SW_RESET();
      } else {
        console.log('[dev] PAKSTREAM_SW_RESET not available');
      }
    });
    const btnReload = document.createElement('button');
    btnReload.textContent = 'Reload';
    btnReload.addEventListener('click', () => location.reload());
    btns.append(btnReset, btnReload);

    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'Changes apply immediately. Some flags may require reload.';

    body.append(btns, hint);
  }

  function bind() {
    body.addEventListener('change', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement)) return;
      const key = t.getAttribute('data-flag');
      if (!key) return;
      FLAGS[key] = !!t.checked;
      try { console.log('[dev] flag', key, '→', FLAGS[key]); } catch {}
      emitRerender();
      saveState('pak_flags_'+key, String(FLAGS[key]));
    });

    // Close button
    el.querySelector('[data-close]').addEventListener('click', () => toggle(false));

    // Dragging
    let dragging = false, sx=0, sy=0, ox=0, oy=0;
    const header = el.querySelector('header');
    header.addEventListener('mousedown', (e) => {
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      const r = el.getBoundingClientRect();
      ox = r.left; oy = r.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      el.style.left = Math.max(8, ox + dx) + 'px';
      el.style.top  = Math.max(8, oy + dy) + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', () => dragging = false);
  }

  function restoreFlagState() {
    Object.keys(FLAGS).forEach(k => {
      const v = readState('pak_flags_'+k);
      if (v === null) return;
      FLAGS[k] = (v === 'true');
    });
  }

  function toggle(show) {
    if (typeof show === 'undefined') {
      el.classList.toggle('is-open');
    } else {
      el.classList.toggle('is-open', !!show);
    }
    saveState('pak_flags_panel_open', el.classList.contains('is-open') ? '1' : '0');
    if (el.classList.contains('is-open')) render();
  }

// Keyboard shortcut: Ctrl+Alt+D
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.altKey && (e.key.toLowerCase() === 'd')) {
    e.preventDefault();
    toggle();
  }
});


  // Initial
  restoreFlagState();
  bind();

  // Restore open/closed state
  if (readState('pak_flags_panel_open') === '1') {
    toggle(true);
  }
})();
