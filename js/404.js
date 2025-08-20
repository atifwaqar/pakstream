document.addEventListener('DOMContentLoaded', function(){
  var title = document.getElementById('nf-title');
  if(title) title.focus();
  if(window.analytics) analytics('page_404_view');

  // recently visited
  if(window.historyService){
    var recent = window.historyService.get().slice(0,5);
    var rc = document.getElementById('nf-recent');
    if(rc && recent.length){
      var h2 = document.createElement('h3');
      h2.textContent = 'Recently visited';
      rc.appendChild(h2);
      var ul2 = document.createElement('ul');
      recent.forEach(function(it){
        var li2 = document.createElement('li');
        var a2 = document.createElement('a');
        a2.href = it.url;
        a2.textContent = it.title;
        a2.setAttribute('data-analytics','suggestion');
        li2.appendChild(a2);
        ul2.appendChild(li2);
      });
      rc.appendChild(ul2);
    }
  }

  document.addEventListener('click', function(ev){
    var a = ev.target.closest('[data-analytics]');
    if(a && window.analytics){
      var action = a.getAttribute('data-analytics');
      analytics('page_404_action', {action: action});
    }
  });
});
