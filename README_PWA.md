# PakStream — PWA Enablement

This update makes PakStream installable and Lighthouse‑clean for the PWA audits, with minimal and safe caching.

## Added / Updated

- **manifest.webmanifest**: proper name/short_name, `/` scope & start URL, theme/background colors, description, maskable icons (192/256/384/512), and screenshots (wide & mobile).
- **sw.js**: tiny service worker with:
  - `CACHE_NAME = "pakstream-shell-v1"` (bump this to invalidate)
  - Precache a **small shell** (home, manifest, offline page, global CSS/JS, icons).
  - **Navigation**: network‑first with `/offline.html` fallback.
  - **Static assets**: stale‑while‑revalidate for `.css`, `.js`, images, fonts.
  - **Never caches** media streams (`.mp3`, `.aac`, `.m3u8`, `.mp4`, etc.) or **any cross‑origin** requests (YouTube, radio CDNs).
  - Uses `self.skipWaiting()` and `clients.claim()`.
- **/offline.html**: branded fallback page.
- **/js/pwa.js**: registers the service worker on `window.load`.
- **HTML head & body injections** across pages:
  - `<link rel="manifest" ...>`, `<meta name="theme-color" ...>`, iOS meta & touch icon.
  - `<script src="/js/pwa.js" defer></script>` before `</body>`.
- YouTube initializer patched to add `enablejsapi=1` & `origin` params. 
- **Icons & Screenshots**: generated clean maskable icons and mock screenshots if missing.

## Bumping the cache
Edit `sw.js` and change:
```js
const CACHE_NAME = "pakstream-shell-v1"; // e.g., pakstream-shell-v2
```
Commit & deploy; clients will update on next load.

## How to test
1. **Register/Offline**
   - Open DevTools → **Application** → Service Workers.
   - Ensure the worker is **activated**. Check **Offline** in the Network panel.
   - Refresh → you should see **/offline.html** for navigations.
2. **Installability**
   - In DevTools → **Application** → **Manifest**, confirm: no errors, icons show, screenshots listed.
   - Visit the site in a non‑Incognito window. Look for the **Install** icon in the address bar (Chrome) or use Chrome menu → *Install PakStream*.
3. **Playback**
   - With network **on**, verify radio/YouTube still play normally.
   - With network **off**, verify they do **not** start (by design).

## Notes
- Host: GitHub Pages. Scope and start URL are `/`.
- Media & third‑party embeds are **never cached**.
- Offline navigation shows `/offline.html`; back online restores normal behavior.
