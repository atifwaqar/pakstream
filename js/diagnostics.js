(() => {
  if (window.__DIAG_WIRED__) return;
  window.__DIAG_WIRED__ = true;

  const log = (ok, msg) => {
    const styleOk  = 'color: #2E7D32; font-weight: bold';
    const styleBad = 'color: #C62828; font-weight: bold';
    const styleWarn= 'color: #FB8C00; font-weight: bold';
    if (ok === true)   console.log('%c\u2714 PASS%c ' + msg, styleOk, '');
    else if (ok === false) console.log('%c\u2718 FAIL%c ' + msg, styleBad, '');
    else               console.log('%c\u26A0 WARN%c ' + msg, styleWarn, '');
  };

  function checkNav() {
    const opener = document.querySelector('#nav-toggle, .nav-toggle');
    const menu   = document.querySelector('#primary-navigation, .primary-navigation');
    if (opener && menu) log(true, 'Nav elements present');
    else log(false, 'Nav toggle or menu missing');
  }

  function checkOverlay() {
    const overlay = document.querySelector('.nav-overlay, .error-overlay, .stream-error-overlay');
    if (!overlay) return log('warn', 'No overlay element found (ok on some pages)');
    const hiddenByDefault = window.getComputedStyle(overlay).display === 'none';
    log(hiddenByDefault, 'Overlay hidden by default');
  }

  function checkYouTube() {
    if (window.__YT_WIRED__) log(true, 'YouTube init wired');
    else log('warn', 'YouTube module not initialized (ok if no YT embeds)');
  }

  function checkAudio() {
    if (window.__RADIO_WIRED__) log(true, 'Radio/audio init wired');
    else log('warn', 'Radio/audio module not initialized (ok if no audio)');
  }

  function checkMediaHub() {
    const hub = document.querySelector('.media-hub');
    if (!hub) return log('warn', 'Media Hub not present on this page');
    const list = hub.querySelector('.mh-list');
    if (list) log(true, 'Media Hub containers present');
    else log(false, 'Media Hub list missing');
  }

  async function checkDataCounts() {
    if (!window.PAKSTREAM_DATA) return log('warn', 'Data loader not present');
    const data = await window.PAKSTREAM_DATA.getAllStreams();
    if (!data) return log(false, 'all_streams.json missing or invalid');
    const { counts } = data;
    log(true, `Data counts: radio=${counts.radio||0}, tv=${counts.tv||0}, creators=${counts.creators||0}, freepress=${counts.freepress||0}`);
  }

  async function runChecks() {
    console.groupCollapsed('%cPakStream Sanity Checklist', 'color:#1E88E5;font-weight:bold');
    checkNav();
    checkOverlay();
    checkYouTube();
    checkAudio();
    checkMediaHub();
    await checkDataCounts();
    console.groupEnd();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runChecks, { once: true });
  } else {
    runChecks();
  }
})();
