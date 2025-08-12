(function(){
  var loaded=false;
  function loadAds(){
    if(loaded) return;
    loaded=true;
    var s=document.createElement('script');
    s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5427964157655690';
    s.async=true;
    s.crossOrigin='anonymous';
    document.head.appendChild(s);
  }
  function onUserInteraction(){
    loadAds();
    window.removeEventListener('scroll', onUserInteraction);
    window.removeEventListener('mousemove', onUserInteraction);
    window.removeEventListener('touchstart', onUserInteraction);
  }
  window.addEventListener('scroll', onUserInteraction, {once:true});
  window.addEventListener('mousemove', onUserInteraction, {once:true});
  window.addEventListener('touchstart', onUserInteraction, {once:true});
})();
