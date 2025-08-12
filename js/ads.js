(function(){
  function loadAds(){
    var s=document.createElement('script');
    s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5427964157655690';
    s.async=true;
    s.crossOrigin='anonymous';
    document.head.appendChild(s);
  }
  if(window.requestIdleCallback){
    requestIdleCallback(loadAds);
  }else{
    window.addEventListener('load', loadAds);
  }
})();
