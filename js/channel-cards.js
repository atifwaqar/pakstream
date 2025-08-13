document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.channel-list .channel-card').forEach(card => {
    const name = card.querySelector('.channel-name');
    const audio = card.querySelector('audio');
    let fav = card.querySelector('.fav-btn');
    let play = card.querySelector('.play-btn');

    // Add logo
    if (!card.querySelector('.channel-logo')) {
      const logoUrl = card.dataset.logo || audio?.dataset.logo || '';
      const logo = document.createElement('div');
      logo.className = 'channel-logo';
      logo.style.backgroundImage = logoUrl
        ? `url('${logoUrl}'), var(--logo-placeholder)`
        : 'var(--logo-placeholder)';
      card.insertBefore(logo, name);
    }

    // Add play button if missing
    if (!play) {
      play = document.createElement('button');
      play.className = 'play-btn';
      play.setAttribute('aria-label', 'Play');
      const icon = document.createElement('span');
      icon.className = 'material-icons';
      icon.textContent = 'play_arrow';
      play.appendChild(icon);
      const ref = fav || audio;
      card.insertBefore(play, ref);
      if (typeof showStream === 'function' && card.dataset.id) {
        play.addEventListener('click', e => {
          e.stopPropagation();
          toggleChannel(card.dataset.id, play);
        });
      } else if (typeof handleChannelClick === 'function' && card.dataset.channelId) {
        play.addEventListener('click', e => {
          e.stopPropagation();
          toggleFreePress(card);
        });
      }
    }

    // Add favorite button if missing
    if (!fav) {
      fav = document.createElement('button');
      fav.className = 'fav-btn material-icons';
      fav.setAttribute('aria-label', 'Toggle favorite');
      fav.textContent = 'favorite_border';
      if (typeof toggleFavorite === 'function') {
        if (audio) {
          fav.addEventListener('click', e => toggleFavorite(e, audio.id));
        } else if (card.dataset.id) {
          fav.addEventListener('click', e => toggleFavorite(e, card.dataset.id));
        } else {
          fav.addEventListener('click', e => toggleFavorite(e));
        }
      }
      card.insertBefore(fav, audio);
    }
    if (card.classList.contains('active')) {
      const icon = card.querySelector('.play-btn .material-icons');
      if (icon) icon.textContent = 'stop';
    }
  });
  if (typeof updateFavoritesUI === 'function') {
    updateFavoritesUI();
  }
});
