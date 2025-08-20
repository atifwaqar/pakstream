// js/stream-state.js
(function () {
  if (window.PAKSTREAM && window.PAKSTREAM.StreamState) return;
  const listeners = new Set();
  const players = new Map(); // id -> { type, play, pause, el }
  let currentId = null;

  function notify() {
    listeners.forEach(fn => { try { fn({ currentId }); } catch {} });
  }
  function register(id, api) {
    players.set(id, api);
    return () => players.delete(id);
  }
  function stopAll(exceptId) {
    players.forEach((api, id) => {
      if (id !== exceptId) { try { api.pause(); } catch {} }
    });
    if (exceptId == null) currentId = null;
    notify();
  }
  function play(id) {
    if (!players.has(id)) return;
    stopAll(id);
    currentId = id;
    try { players.get(id).play(); } catch {}
    notify();
  }
  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  window.PAKSTREAM = window.PAKSTREAM || {};
  window.PAKSTREAM.StreamState = { register, stopAll, play, onChange, getCurrentId: () => currentId };
  // Optional global stop for debugging
  window.PAKSTREAM.stopAll = () => stopAll(null);
})();
