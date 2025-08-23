(function () {
  const channelList = document.querySelector(".channel-list");
  const channelToggleBtn = document.getElementById("toggle-channels");
  const detailsList = document.querySelector(".details-list");
  const detailsContainer = document.querySelector(".details-container");
  const detailsToggleBtn = document.getElementById("toggle-details");
  const channelSection = channelList?.closest(
    ".youtube-section, .media-hub-section",
  );

  let overlay = document.getElementById("mh-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "mh-overlay";
    overlay.className = "site-overlay";
    document.body.appendChild(overlay);
  }

  overlay.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (channelList?.classList.contains("open")) {
      channelList.classList.remove("open");
      if (removeChannelFocusTrap) removeChannelFocusTrap();
      channelToggleBtn?.focus();
    }
    if (detailsList?.classList.contains("open")) {
      detailsList.classList.remove("open");
      if (removeDetailsFocusTrap) removeDetailsFocusTrap();
      detailsToggleBtn?.focus();
    }
    if (typeof updateScrollLock === "function") updateScrollLock();
  });
  overlay.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
    },
    { passive: false },
  );
  overlay.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
    },
    { passive: false },
  );

  function updateScrollLock() {
    const locked =
      (channelList && channelList.classList.contains("open")) ||
      (detailsList && detailsList.classList.contains("open"));
    document.body.classList.toggle("no-scroll", locked);
    overlay.classList.toggle("is-active", locked);
  }
  window.updateScrollLock = updateScrollLock;


  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function trapFocus(container) {
    const focusableEls = Array.from(
      container.querySelectorAll(FOCUSABLE_SELECTOR),
    ).filter((el) => el.offsetParent !== null);
    if (!focusableEls.length) return () => {};
    const firstEl = focusableEls[0];
    const lastEl = focusableEls[focusableEls.length - 1];
    const focusTarget =
      focusableEls.find(
        (el) =>
          el.tagName !== "INPUT" &&
          el.tagName !== "TEXTAREA" &&
          el.tagName !== "SELECT",
      ) || firstEl;
    function handleKeydown(e) {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
    container.addEventListener("keydown", handleKeydown);
    focusTarget.focus();
    return () => container.removeEventListener("keydown", handleKeydown);
  }

  let removeChannelFocusTrap = null;
  let removeDetailsFocusTrap = null;

  function toggleChannelList() {
    if (!channelList || !channelToggleBtn) return;
    if (window.innerWidth <= 768) {
      const opening = !channelList.classList.contains("open");
      channelList.classList.toggle("open");
      if (typeof updateScrollLock === "function") updateScrollLock();
      if (opening) {
        removeChannelFocusTrap = trapFocus(channelList);
      } else if (removeChannelFocusTrap) {
        removeChannelFocusTrap();
        channelToggleBtn.focus();
      }
    } else {
      channelList.classList.toggle("collapsed");
      const collapsed = channelList.classList.contains("collapsed");
      if (channelSection)
        channelSection.classList.toggle("channels-collapsed", collapsed);
      localStorage.setItem("channelListCollapsed", collapsed);
    }
  }
  window.toggleChannelList = toggleChannelList;

  document.addEventListener("click", (e) => {
    if (
      channelList &&
      channelToggleBtn &&
      channelList.classList.contains("open") &&
      !channelList.contains(e.target) &&
      !channelToggleBtn.contains(e.target)
    ) {
      if (!e.target.closest(".top-bar")) {
        e.preventDefault();
        e.stopPropagation();
      }
      channelList.classList.remove("open");
      if (typeof updateScrollLock === "function") updateScrollLock();
      if (removeChannelFocusTrap) removeChannelFocusTrap();
      channelToggleBtn.focus();
    }
  });

  if (channelList) {
    channelList.addEventListener("click", (e) => {
      if (window.innerWidth > 768) return;
      if (e.target.closest(".channel-card")) {
        channelList.classList.remove("open");
        if (typeof updateScrollLock === "function") updateScrollLock();
        if (removeChannelFocusTrap) removeChannelFocusTrap();
        channelToggleBtn.focus();
      }
    });

    let touchStartX = null;
    let touchFromModeTabs = false;
    channelList.addEventListener("touchstart", (e) => {
      if (!channelList.classList.contains("open")) return;
      touchStartX = e.touches[0].clientX;
      // If the gesture started inside the horizontal mode tabs, ignore it for closing
      touchFromModeTabs = e.target.closest(".mode-tabs") !== null;
    });
    channelList.addEventListener("touchend", (e) => {
      if (touchStartX === null) return;
      const touchEndX = e.changedTouches[0].clientX;
      if (!touchFromModeTabs && touchStartX - touchEndX > 50) {
        channelList.classList.remove("open");
        if (typeof updateScrollLock === "function") updateScrollLock();
        if (removeChannelFocusTrap) removeChannelFocusTrap();
        channelToggleBtn.focus();
      }
      touchStartX = null;
      touchFromModeTabs = false;
    });

    let openStartX = null;
    document.addEventListener("touchstart", (e) => {
      if (channelList.classList.contains("open")) return;
      openStartX = e.touches[0].clientX;
    });
    document.addEventListener(
      "touchmove",
      (e) => {
        if (openStartX === null) return;
        const currentX = e.touches[0].clientX;
        if (openStartX < 50 && currentX - openStartX > 10) {
          e.preventDefault();
        }
      },
      { passive: false },
    );
    document.addEventListener("touchend", (e) => {
      if (channelList.classList.contains("open")) return;
      if (openStartX === null) return;
      const touchEndX = e.changedTouches[0].clientX;
      if (touchEndX - openStartX > 50 && openStartX < 50) {
        channelList.classList.add("open");
        if (typeof updateScrollLock === "function") updateScrollLock();
        removeChannelFocusTrap = trapFocus(channelList);
      }
      openStartX = null;
    });
  }

  function toggleDetailsList() {
    if (!detailsList || !detailsToggleBtn) return;
      if (window.innerWidth <= 1080) {
        if (detailsToggleBtn.style.display === "none") return;
        const opening = !detailsList.classList.contains("open");
        detailsList.classList.toggle("open");
        if (typeof updateScrollLock === "function") updateScrollLock();
        if (opening) {
          removeDetailsFocusTrap = trapFocus(detailsList);
        } else if (removeDetailsFocusTrap) {
          removeDetailsFocusTrap();
          detailsToggleBtn.focus();
        }
      } else {
        if (!detailsContainer) return;
        detailsContainer.classList.toggle("collapsed");
        const collapsed = detailsContainer.classList.contains("collapsed");
        if (channelSection)
          channelSection.classList.toggle("details-collapsed", collapsed);
      localStorage.setItem("detailsListCollapsed", collapsed);
    }
  }
  window.toggleDetailsList = toggleDetailsList;

  document.addEventListener("click", (e) => {
    if (
      detailsList &&
      detailsToggleBtn &&
      detailsList.classList.contains("open") &&
      !detailsList.contains(e.target) &&
      !detailsToggleBtn.contains(e.target)
    ) {
      if (!e.target.closest(".top-bar")) {
        e.preventDefault();
        e.stopPropagation();
      }
      detailsList.classList.remove("open");
      if (typeof updateScrollLock === "function") updateScrollLock();
      if (removeDetailsFocusTrap) removeDetailsFocusTrap();
      detailsToggleBtn.focus();
    }
  });

  if (detailsList && detailsToggleBtn) {
    let detailsTouchStartX = null;
    detailsList.addEventListener("touchstart", (e) => {
      if (!detailsList.classList.contains("open")) return;
      detailsTouchStartX = e.touches[0].clientX;
    });
    detailsList.addEventListener("touchend", (e) => {
      if (detailsTouchStartX === null) return;
      const touchEndX = e.changedTouches[0].clientX;
      if (touchEndX - detailsTouchStartX > 50) {
          detailsList.classList.remove("open");
          if (typeof updateScrollLock === "function") updateScrollLock();
          if (removeDetailsFocusTrap) removeDetailsFocusTrap();
          detailsToggleBtn.focus();
        }
        detailsTouchStartX = null;
      });

    let detailsOpenStartX = null;
    document.addEventListener("touchstart", (e) => {
      if (detailsList.classList.contains("open")) return;
      if (detailsToggleBtn.style.display === "none") return;
      detailsOpenStartX = e.touches[0].clientX;
    });
    document.addEventListener(
      "touchmove",
      (e) => {
        if (detailsOpenStartX === null) return;
        if (detailsToggleBtn.style.display === "none") return;
        const currentX = e.touches[0].clientX;
        if (
          detailsOpenStartX > window.innerWidth - 50 &&
          detailsOpenStartX - currentX > 10
        ) {
          e.preventDefault();
        }
      },
      { passive: false },
    );
    document.addEventListener("touchend", (e) => {
      if (detailsList.classList.contains("open")) return;
      if (detailsOpenStartX === null) return;
      if (detailsToggleBtn.style.display === "none") return;
      const touchEndX = e.changedTouches[0].clientX;
      if (
        detailsOpenStartX > window.innerWidth - 50 &&
        detailsOpenStartX - touchEndX > 50
      ) {
          detailsList.classList.add("open");
          if (typeof updateScrollLock === "function") updateScrollLock();
          removeDetailsFocusTrap = trapFocus(detailsList);
        }
        detailsOpenStartX = null;
      });
  }

  (function () {
    if (channelList) {
      if (localStorage.getItem("channelListCollapsed") === "true") {
        channelList.classList.add("collapsed");
        if (channelSection) channelSection.classList.add("channels-collapsed");
      }
    }
    if (detailsContainer && detailsToggleBtn) {
      const collapsedPref = localStorage.getItem("detailsListCollapsed");
      if (collapsedPref === null || collapsedPref === "true") {
        detailsContainer.classList.add("collapsed");
        if (channelSection) channelSection.classList.add("details-collapsed");
      }
    }
  })();
})();
