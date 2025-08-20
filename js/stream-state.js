(function(){
  const ANALYTICS_MAP = {
    attempt: 'stream_attempt',
    start: 'stream_start',
    playing: 'stream_playing',
    stall: 'stream_stall',
    recover: 'stream_recovered',
    end: 'stream_end',
    error: 'stream_error',
    fallback: 'stream_fallback',
    retry: 'stream_retry',
    open_external: 'stream_fallback'
  };

  function createStreamStateBus(meta){
    const target = new EventTarget();
    const metrics = Object.assign({
      id: meta && meta.id,
      type: meta && meta.type,
      provider: meta && meta.provider,
      sourceUrl: meta && meta.sourceUrl,
      startedAt: Date.now(),
      attemptNo: meta && meta.attemptNo || 1
    });

    function emit(event, extra){
      const payload = Object.assign({}, metrics, extra || {});
      target.dispatchEvent(new CustomEvent(event, { detail: payload }));
      const evName = ANALYTICS_MAP[event];
      if (evName && typeof window.track === 'function') {
        window.track(evName, payload);
      }
    }

    return {
      meta: metrics,
      emit,
      on: (e, fn) => target.addEventListener(e, fn),
      off: (e, fn) => target.removeEventListener(e, fn)
    };
  }

  function attachStreamErrorOverlay(bus, container){
    if (!container || !bus) return;
    let overlay = container.querySelector('.stream-error-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'stream-error-overlay';
      overlay.innerHTML = '<p class="msg">Stream unavailable</p>' +
        '<div class="actions">' +
        '<button class="retry">Retry</button>' +
        '<button class="open-external">Open externally</button>' +
        '</div>';
      overlay.style.display = 'none';
      container.appendChild(overlay);
      const retryBtn = overlay.querySelector('.retry');
      const extBtn = overlay.querySelector('.open-external');
      retryBtn.addEventListener('click', () => {
        overlay.style.display = 'none';
        bus.emit('retry');
      });
      extBtn.addEventListener('click', () => {
        bus.emit('open_external');
      });
    }
    bus.on('error', () => { overlay.style.display = 'flex'; });
    bus.on('start', () => { overlay.style.display = 'none'; });
    bus.on('end', () => { overlay.style.display = 'none'; });
  }

  window.createStreamStateBus = createStreamStateBus;
  window.attachStreamErrorOverlay = attachStreamErrorOverlay;
})();
