(function(){
  function lockLandscape() {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(function(){});
    }
  }
  function unlockOrientation() {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  }
  function handleChange() {
    if (document.fullscreenElement) {
      lockLandscape();
    } else {
      unlockOrientation();
    }
  }
  ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange','MSFullscreenChange'].forEach(function(evt){document.addEventListener(evt, handleChange);});
})();
