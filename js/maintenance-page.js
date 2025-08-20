document.addEventListener('DOMContentLoaded', function(){
  var title = document.getElementById('mt-title');
  if(title) title.focus();
  if(window.analytics) analytics('maintenance_page_view');
  var retry = document.getElementById('mt-retry');
  if(retry){
    retry.addEventListener('click', function(){
      if(window.analytics) analytics('maintenance_action',{action:'retry'});
      location.reload();
    });
  }
  document.addEventListener('click', function(ev){
    var link = ev.target.closest('[data-analytics="follow_status"]');
    if(link && window.analytics) analytics('maintenance_action',{action:'follow_status'});
    var home = ev.target.closest('[data-analytics="home"]');
    var hub = ev.target.closest('[data-analytics="media_hub"]');
    if((home || hub) && window.analytics) analytics('maintenance_action',{action:(home?'home':'media_hub')});
  });
});
