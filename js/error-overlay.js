(function(){
  window.showStreamError = function(container, opts){
    if(!container) return;
    var overlay = document.createElement('div');
    overlay.className = 'error-overlay';
    var msg = document.createElement('p');
    msg.textContent = "This stream isn't responding";
    overlay.appendChild(msg);
    var actions = document.createElement('div');
    var retry = document.createElement('button');
    retry.className = 'btn';
    retry.textContent = 'Retry';
    retry.addEventListener('click', function(){
      if(opts && opts.onRetry) opts.onRetry();
      overlay.remove();
    });
    actions.appendChild(retry);
    if(opts && opts.onAlt){
      var alt = document.createElement('button');
      alt.className = 'btn';
      alt.textContent = 'Try another source';
      alt.addEventListener('click', opts.onAlt);
      actions.appendChild(alt);
    }
    if(opts && opts.youtube){
      var yt = document.createElement('a');
      yt.className = 'btn';
      yt.textContent = 'Open on YouTube';
      yt.href = opts.youtube;
      yt.target = '_blank';
      yt.rel = 'noopener';
      actions.appendChild(yt);
    }
    var rep = document.createElement('a');
    rep.className = 'btn';
    rep.textContent = 'Report';
    rep.href = '/contact.html';
    actions.appendChild(rep);
    overlay.appendChild(actions);
    if(opts && Array.isArray(opts.suggestions) && opts.suggestions.length){
      var sugg = document.createElement('div');
      sugg.className = 'trending-cards';
      opts.suggestions.forEach(function(it){
        var a = document.createElement('a');
        a.href = it.url;
        a.className = 'btn';
        a.textContent = it.title;
        sugg.appendChild(a);
      });
      overlay.appendChild(sugg);
    }
    container.style.position = 'relative';
    container.appendChild(overlay);
    var first = overlay.querySelector('button, a');
    if(first) first.focus();
    return overlay;
  };
})();
