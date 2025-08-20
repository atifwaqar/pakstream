(() => {
  // Gate for dev only (adjust hostname as you like)
  const DEV = location.hostname.includes('localhost') || location.hostname.includes('127.0.0.1') || location.hostname.endsWith('.test');
  if (!DEV) return;
  if (window.__CONTRAST_WIRED__) return;
  window.__CONTRAST_WIRED__ = true;

  // Utils
  function parseColor(rgb) {
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] };
  }
  function srgbToLin(c) {
    c /= 255;
    return (c <= 0.03928) ? (c / 12.92) : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function luminance({r,g,b}) {
    const R = srgbToLin(r), G = srgbToLin(g), B = srgbToLin(b);
    return 0.2126*R + 0.7152*G + 0.0722*B;
  }
  function contrastRatio(fg, bg) {
    const L1 = luminance(fg), L2 = luminance(bg);
    const lighter = Math.max(L1, L2), darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
  }
  function isLarge(el) {
    const cs = getComputedStyle(el);
    const fz = parseFloat(cs.fontSize) || 16;
    const fw = parseInt(cs.fontWeight || '400', 10);
    return fz >= 18 || (fz >= 14 && fw >= 700);
  }

  function getBackgroundColor(el) {
    let node = el;
    while (node) {
      const cs = getComputedStyle(node);
      const bg = parseColor(cs.backgroundColor);
      if (bg && bg.a > 0) return bg;
      node = node.parentElement;
    }
    // fallback to white
    return { r:255, g:255, b:255, a:1 };
  }

  function scan() {
    const bad = [];
    const nodes = document.body.querySelectorAll('p, span, a, li, h1, h2, h3, h4, h5, h6, button, .chip, .badge');
    nodes.forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || el.offsetParent === null) return;
      const fg = parseColor(cs.color);
      if (!fg) return;
      const bg = getBackgroundColor(el);
      const ratio = contrastRatio(fg, bg);
      const needs = isLarge(el) ? 3.0 : 4.5;
      if (ratio < needs) {
        bad.push({ el, ratio: +ratio.toFixed(2), needs, text: (el.textContent || '').trim().slice(0,80) });
      }
    });
    console.groupCollapsed('%cContrast check', 'color:#1E88E5;font-weight:bold');
    if (bad.length === 0) {
      console.log('%c✔ All checked elements meet AA contrast', 'color:#2E7D32;font-weight:bold');
    } else {
      bad.sort((a,b) => a.ratio - b.ratio);
      bad.forEach(({el, ratio, needs, text}) => {
        console.log('%c✘ ' + ratio + ' (needs ' + needs + '):', 'color:#C62828;font-weight:bold', el, 'text:', text);
      });
    }
    console.groupEnd();
  }

  function run() {
    // delay a tick to allow theme class to apply
    setTimeout(scan, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
  window.addEventListener('pakstream:rerender', run);
})();
