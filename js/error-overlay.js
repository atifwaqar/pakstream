(function () {
  if (window.PAKSTREAM?.ErrorOverlay) return;

  function h(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v);
    });
    children.forEach(c => el.appendChild(c));
    return el;
  }

  function ensureOverlay(container) {
    let overlay = container.querySelector('[data-error-overlay]');
    if (overlay) return overlay;
    overlay = h('div', { class: 'ps-error-overlay', 'data-error-overlay': '' }, [
      h('div', { class: 'ps-error-card' }, [
        h('div', { class: 'ps-error-title', text: 'Stream unavailable' }),
        h('div', { class: 'ps-error-msg', text: 'We couldn\u2019t load this stream. You can try again.' }),
        h('div', { class: 'ps-error-actions' }, [
          h('button', { type: 'button', class: 'ps-error-retry', 'data-error-retry': '', text: 'Retry' })
        ])
      ])
    ]);
    container.appendChild(overlay);
    return overlay;
  }

  function show(container, { onRetry } = {}) {
    const overlay = ensureOverlay(container);
    overlay.hidden = false;
    overlay.classList.add('is-visible');
    const btn = overlay.querySelector('[data-error-retry]');
    if (onRetry) {
      btn.onclick = () => {
        hide(container);
        try { onRetry(); } catch {}
      };
    } else {
      btn.onclick = () => hide(container);
    }
  }

  function hide(container) {
    const overlay = container.querySelector('[data-error-overlay]');
    if (!overlay) return;
    overlay.classList.remove('is-visible');
    // keep overlay in DOM for reuse; just hide
    overlay.hidden = true;
  }

  // Simple watchdog for iframes that don\u2019t fire onerror
  function armIframeTimeout(iframe, ms, onTimeout) {
    const container = iframe.closest('[data-stream-container]') || iframe.parentElement;
    let done = false;
    function mark() { done = true; }
    iframe.addEventListener('load', mark, { once: true });
    setTimeout(() => { if (!done) onTimeout?.(container); }, ms);
  }

  window.PAKSTREAM = window.PAKSTREAM || {};
  window.PAKSTREAM.ErrorOverlay = { show, hide, armIframeTimeout };
})();
