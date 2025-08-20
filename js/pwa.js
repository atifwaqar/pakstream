(function () {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });

  // Surface an install prompt when the PWA meets installability criteria.
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();

    const btn = document.createElement("button");
    btn.id = "pwa-install";
    btn.textContent = "Install PakStream";
    btn.style.position = "fixed";
    btn.style.bottom = "1rem";
    btn.style.right = "1rem";
    btn.style.padding = "0.5rem 1rem";
    btn.style.zIndex = "10000";
    document.body.appendChild(btn);

    btn.addEventListener(
      "click",
      async () => {
        btn.disabled = true;
        await event.prompt();
        btn.remove();
      },
      { once: true }
    );
  });
})();

