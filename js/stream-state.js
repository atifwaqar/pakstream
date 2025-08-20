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
        // Manual retry resets attempt counter
        bus.emit('retry', { manual: true });
      });
      extBtn.addEventListener('click', () => {
        bus.emit('open_external');
      });
    }
    bus.on('error', () => { overlay.style.display = 'flex'; });
    bus.on('start', () => { overlay.style.display = 'none'; });
    bus.on('end', () => { overlay.style.display = 'none'; });
  }

  // ---- Reliability helpers ----
  const CB_KEY = 'stream.circuit';

  function isCircuitOpen(id, url){
    try {
      const map = JSON.parse(localStorage.getItem(CB_KEY) || '{}');
      const key = id + '|' + url;
      const ts = map[key];
      if (!ts) return false;
      return Date.now() - ts < 15 * 60 * 1000; // 15 minutes
    } catch(e){
      return false;
    }
  }

  function markCircuit(meta){
    try {
      const map = JSON.parse(localStorage.getItem(CB_KEY) || '{}');
      const key = meta.id + '|' + meta.sourceUrl;
      map[key] = Date.now();
      localStorage.setItem(CB_KEY, JSON.stringify(map));
    } catch(e){ }
  }

  function initStreamAutoRetry(bus, opts){
    if (!bus) return;
    const maxAttempts = (opts && opts.maxAttempts) || 4;
    const base = (opts && opts.baseDelay) || 2000;
    let retryTimer = null;

    function schedule(reason){
      if (bus.meta.attemptNo >= maxAttempts){
        markCircuit(bus.meta);
        return;
      }
      const delay = Math.min(base * Math.pow(2, bus.meta.attemptNo - 1), base * Math.pow(2, maxAttempts - 1));
      const jitter = Math.random() * 1000;
      retryTimer = setTimeout(() => {
        bus.emit('retry', { reason });
      }, delay + jitter);
    }

    bus.on('attempt', () => {
      if (isCircuitOpen(bus.meta.id, bus.meta.sourceUrl)) {
        bus.emit('error', { errorCode: 'circuit_open' });
      }
    });

    bus.on('error', () => schedule('error'));
    bus.on('stall', () => schedule('stall'));
    bus.on('recover', () => { if (retryTimer) clearTimeout(retryTimer); });
    bus.on('start', () => { if (retryTimer) clearTimeout(retryTimer); });
    bus.on('end', () => { if (retryTimer) clearTimeout(retryTimer); });
  }

  function watchMediaStalls(media, bus, opts){
    if (!media || !bus) return;
    const limit = (opts && opts.stallMs) || 8000;
    let timer, stalled = false;
    function reset(){
      if (timer) clearTimeout(timer);
      if (stalled) { bus.emit('recover'); stalled = false; }
      timer = setTimeout(() => {
        if (media.readyState < 2) { stalled = true; bus.emit('stall', { reason: 'timeupdate' }); }
      }, limit);
    }
    media.addEventListener('timeupdate', reset);
    media.addEventListener('playing', reset);
    media.addEventListener('stalled', () => { stalled = true; bus.emit('stall', { reason: 'stalled' }); reset(); });
    bus.on('end', () => { if (timer) clearTimeout(timer); });
    bus.on('error', () => { if (timer) clearTimeout(timer); });
  }

  window.createStreamStateBus = createStreamStateBus;
  window.attachStreamErrorOverlay = attachStreamErrorOverlay;
  window.initStreamAutoRetry = initStreamAutoRetry;
  window.watchMediaStalls = watchMediaStalls;
})();
