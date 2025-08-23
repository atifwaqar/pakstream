(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach(card => {
      const mode = card.dataset.m;
      const channel = card.dataset.c;
      card.addEventListener('click', () => {
        if (!mode) return;
        let url = `/media-hub.html?m=${encodeURIComponent(mode)}`;
        if (channel) {
          url += `&c=${encodeURIComponent(channel)}`;
        }
        window.location.href = url;
      });
    });

    window.addEventListener('message', e => {
      if (e.data?.type === 'media-hub-height') {
        const iframe = Array.from(document.querySelectorAll('.feature-card iframe'))
          .find(f => f.contentWindow === e.source);
        if (iframe) {
          iframe.style.height = `${e.data.height}px`;
        }
      }
    });
    const sendMuteMessage = (iframe, muted) => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'media-hub-set-muted', muted }, '*');
      }
    };
    const sendPlayMessage = (iframe, playing) => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'media-hub-set-playing', playing }, '*');
      }
    };

    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches && navigator.maxTouchPoints === 0;
    const isLaptop = canHover && window.matchMedia('(min-width: 1024px)').matches;

    if (canHover) {
      let freepressCard = null;
      let fpIframe = null;
      if (isLaptop) {
        freepressCard = document.querySelector('.feature-card[data-m="freepress"]');
        if (freepressCard) {
          fpIframe = freepressCard.querySelector('iframe');
          if (fpIframe) {
            const unmute = () => sendMuteMessage(fpIframe, false);
            fpIframe.addEventListener('load', unmute);
            unmute();
          }
        }
      }

      const cardArray = Array.from(cards);
      cardArray.forEach(card => {
        const iframe = card.querySelector('iframe');
        if (!iframe) return;
        const isFreepress = isLaptop && card === freepressCard;
        sendPlayMessage(iframe, isFreepress);
        card.addEventListener('mouseenter', () => {
          cardArray.forEach(c => {
            const ifr = c.querySelector('iframe');
            if (!ifr) return;
            const isCurrent = c === card;
            sendMuteMessage(ifr, !isCurrent);
            sendPlayMessage(ifr, isCurrent);
          });
        });
        card.addEventListener('mouseleave', () => {
          sendMuteMessage(iframe, true);
          sendPlayMessage(iframe, false);
        });
      });
    } else {
      const items = Array.from(cards)
        .map(card => ({ card, iframe: card.querySelector('iframe') }))
        .filter(({ iframe }) => !!iframe);

      const update = () => {
        const center = window.innerHeight / 2;
        let activeIndex = -1;
        let minDist = Infinity;

        items.forEach(({ card }, idx) => {
          const rect = card.getBoundingClientRect();
          const visible = rect.bottom > 0 && rect.top < window.innerHeight;
          if (!visible) return;
          const cardCenter = (rect.top + rect.bottom) / 2;
          const dist = Math.abs(cardCenter - center);
          if (dist < minDist) {
            minDist = dist;
            activeIndex = idx;
          }
        });

        items.forEach(({ iframe }, idx) => {
          const playing = idx === activeIndex;
          sendMuteMessage(iframe, !playing);
          sendPlayMessage(iframe, playing);
        });
      };

      ['scroll', 'resize'].forEach(evt =>
        window.addEventListener(evt, update, { passive: true })
      );

      items.forEach(({ iframe }) => {
        iframe.addEventListener('load', update);
      });

      update();
    }
  });
})();
