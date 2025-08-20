document.addEventListener('DOMContentLoaded', function(){
  fetch('/config.json?ts=' + Date.now(), {cache:'no-store'}).then(function(r){return r.json();}).then(function(cfg){
    if(!cfg || !cfg.maintenance) return;
    if(sessionStorage.getItem('ps-maint-dismiss') === '1') return;
    var banner = document.getElementById('maintenance-banner');
    if(!banner) return;
    banner.innerHTML = '<span class="msg">PakStream is upgrading.</span> <a href="/maintenance.html" data-analytics="follow_status">Learn more</a> <button type="button" id="mt-dismiss">Dismiss</button>';
    banner.hidden = false;
    document.body.classList.add('maintenance-on');
    if(window.analytics) analytics('maintenance_banner_view');
    var dismiss = document.getElementById('mt-dismiss');
    dismiss.addEventListener('click', function(){
      banner.hidden = true;
      sessionStorage.setItem('ps-maint-dismiss', '1');
      document.body.classList.remove('maintenance-on');
      if(window.analytics) analytics('maintenance_action',{action:'dismiss'});
    });
    banner.addEventListener('click', function(ev){
      var link = ev.target.closest('[data-analytics="follow_status"]');
      if(link && window.analytics) analytics('maintenance_action',{action:'follow_status'});
    });
  }).catch(function(){});
});
