(function() {
  const channelList = document.querySelector('.channel-list');
  const channelToggleBtn = document.getElementById('toggle-channels');
  const detailsList = document.querySelector('.details-list');
  const detailsContainer = document.querySelector('.details-container');
  const detailsToggleBtn = document.getElementById('toggle-details');

  const channelLabelEl = channelToggleBtn?.querySelector('.label');
  const channelToggleDefaultText = channelLabelEl?.textContent || channelToggleBtn?.textContent || '';
  if (channelLabelEl) channelLabelEl.dataset.default = channelToggleDefaultText;
  const detailsLabelEl = detailsToggleBtn?.querySelector('.label');
  const detailsToggleDefaultText = detailsLabelEl?.textContent || 'About';
  if (detailsLabelEl) detailsLabelEl.dataset.default = detailsToggleDefaultText;

  function toggleChannelList() {
    if (!channelList || !channelToggleBtn) return;
    const icon = channelToggleBtn.querySelector('.icon');
    const label = channelToggleBtn.querySelector('.label');
    if (window.innerWidth <= 768) {
      channelList.classList.toggle('open');
      if (label) {
        label.textContent = channelList.classList.contains('open') ? `Close ${channelToggleDefaultText}` : channelToggleDefaultText;
      }
      if (typeof updateScrollLock === 'function') updateScrollLock();
    } else {
      channelList.classList.toggle('collapsed');
      const collapsed = channelList.classList.contains('collapsed');
      if (icon) icon.textContent = collapsed ? 'chevron_right' : 'chevron_left';
      localStorage.setItem('channelListCollapsed', collapsed);
    }
  }
  window.toggleChannelList = toggleChannelList;

  document.addEventListener('click', e => {
    if (channelList && channelToggleBtn && channelList.classList.contains('open') && !channelList.contains(e.target) && !channelToggleBtn.contains(e.target)) {
      channelList.classList.remove('open');
      const label = channelToggleBtn.querySelector('.label');
      if (label) label.textContent = channelToggleDefaultText;
      if (typeof updateScrollLock === 'function') updateScrollLock();
    }
  });

  if (channelList) {
    channelList.addEventListener('click', e => {
      if (window.innerWidth > 768) return;
      if (e.target.closest('.channel-card')) {
        channelList.classList.remove('open');
        const label = channelToggleBtn?.querySelector('.label');
        if (label) label.textContent = channelToggleDefaultText;
        if (typeof updateScrollLock === 'function') updateScrollLock();
      }
    });

    let touchStartX = null;
    let touchFromModeTabs = false;
    channelList.addEventListener('touchstart', e => {
      if (!channelList.classList.contains('open')) return;
      touchStartX = e.touches[0].clientX;
      // If the gesture started inside the horizontal mode tabs, ignore it for closing
      touchFromModeTabs = e.target.closest('.mode-tabs') !== null;
    });
    channelList.addEventListener('touchend', e => {
      if (touchStartX === null) return;
      const touchEndX = e.changedTouches[0].clientX;
      if (!touchFromModeTabs && touchStartX - touchEndX > 50) {
        channelList.classList.remove('open');
        const label = channelToggleBtn?.querySelector('.label');
        if (label) label.textContent = channelToggleDefaultText;
        if (typeof updateScrollLock === 'function') updateScrollLock();
      }
      touchStartX = null;
      touchFromModeTabs = false;
    });

    let openStartX = null;
    document.addEventListener('touchstart', e => {
      if (channelList.classList.contains('open')) return;
      openStartX = e.touches[0].clientX;
    });
    document.addEventListener('touchmove', e => {
      if (openStartX === null) return;
      const currentX = e.touches[0].clientX;
      if (openStartX < 50 && currentX - openStartX > 10) {
        e.preventDefault();
      }
    }, { passive: false });
    document.addEventListener('touchend', e => {
      if (channelList.classList.contains('open')) return;
      if (openStartX === null) return;
      const touchEndX = e.changedTouches[0].clientX;
      if (touchEndX - openStartX > 50 && openStartX < 50) {
        channelList.classList.add('open');
        const label = channelToggleBtn?.querySelector('.label');
        if (label) label.textContent = `Close ${channelToggleDefaultText}`;
        if (typeof updateScrollLock === 'function') updateScrollLock();
      }
      openStartX = null;
    });
  }

  function toggleDetailsList() {
    if (!detailsList || !detailsToggleBtn) return;
    const icon = detailsToggleBtn.querySelector('.icon');
    const label = detailsToggleBtn.querySelector('.label');
    if (window.innerWidth <= 768) {
      if (detailsToggleBtn.style.display === 'none') return;
      detailsList.classList.toggle('open');
      if (label) {
        label.textContent = detailsList.classList.contains('open') ? `Close ${detailsToggleDefaultText}` : detailsToggleDefaultText;
      }
      if (typeof updateScrollLock === 'function') updateScrollLock();
    } else {
      if (!detailsContainer) return;
      detailsContainer.classList.toggle('collapsed');
      const collapsed = detailsContainer.classList.contains('collapsed');
      if (icon) icon.textContent = collapsed ? 'chevron_left' : 'chevron_right';
      localStorage.setItem('detailsListCollapsed', collapsed);
    }
  }
  window.toggleDetailsList = toggleDetailsList;

  document.addEventListener('click', e => {
    if (detailsList && detailsToggleBtn && detailsList.classList.contains('open') && !detailsList.contains(e.target) && !detailsToggleBtn.contains(e.target)) {
      detailsList.classList.remove('open');
      const label = detailsToggleBtn.querySelector('.label');
      if (label) label.textContent = detailsToggleDefaultText;
      if (typeof updateScrollLock === 'function') updateScrollLock();
    }
  });

  if (detailsList && detailsToggleBtn) {
    let detailsTouchStartX = null;
    detailsList.addEventListener('touchstart', e => {
      if (!detailsList.classList.contains('open')) return;
      detailsTouchStartX = e.touches[0].clientX;
    });
    detailsList.addEventListener('touchend', e => {
      if (detailsTouchStartX === null) return;
      const touchEndX = e.changedTouches[0].clientX;
      if (touchEndX - detailsTouchStartX > 50) {
        detailsList.classList.remove('open');
        const label = detailsToggleBtn.querySelector('.label');
        if (label) label.textContent = detailsToggleDefaultText;
        if (typeof updateScrollLock === 'function') updateScrollLock();
      }
      detailsTouchStartX = null;
    });

    let detailsOpenStartX = null;
    document.addEventListener('touchstart', e => {
      if (detailsList.classList.contains('open')) return;
      if (detailsToggleBtn.style.display === 'none') return;
      detailsOpenStartX = e.touches[0].clientX;
    });
    document.addEventListener('touchmove', e => {
      if (detailsOpenStartX === null) return;
      if (detailsToggleBtn.style.display === 'none') return;
      const currentX = e.touches[0].clientX;
      if (detailsOpenStartX > window.innerWidth - 50 && detailsOpenStartX - currentX > 10) {
        e.preventDefault();
      }
    }, { passive: false });
    document.addEventListener('touchend', e => {
      if (detailsList.classList.contains('open')) return;
      if (detailsOpenStartX === null) return;
      if (detailsToggleBtn.style.display === 'none') return;
      const touchEndX = e.changedTouches[0].clientX;
      if (detailsOpenStartX > window.innerWidth - 50 && detailsOpenStartX - touchEndX > 50) {
        detailsList.classList.add('open');
        const label = detailsToggleBtn.querySelector('.label');
        if (label) label.textContent = `Close ${detailsToggleDefaultText}`;
        if (typeof updateScrollLock === 'function') updateScrollLock();
      }
      detailsOpenStartX = null;
    });
  }

  (function() {
    if (channelList) {
      const icon = channelToggleBtn?.querySelector('.icon');
      if (localStorage.getItem('channelListCollapsed') === 'true') {
        channelList.classList.add('collapsed');
        if (icon) icon.textContent = 'chevron_right';
      }
    }
    if (detailsContainer && detailsToggleBtn) {
      const icon = detailsToggleBtn.querySelector('.icon');
      if (localStorage.getItem('detailsListCollapsed') === 'true') {
        detailsContainer.classList.add('collapsed');
        if (icon) icon.textContent = 'chevron_left';
      }
    }
  })();
})();
