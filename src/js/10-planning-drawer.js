/* one "Planning" button on the date line. Click it: a small drawer with Habits, Fit Check, My energy. */
(function(){
  'use strict';
  var $=function(id){return document.getElementById(id)};
  var SV='<svg class="i" viewBox="0 0 24 24" aria-hidden="true">';
  var R=13,C=2*Math.PI*R;
  var ICON={
    plan:SV+'<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>',
    chev:SV+'<path d="M6 9l6 6 6-6"/></svg>',
    arrow:SV+'<path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    fit:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M16.2 7.8l-2.1 6.3-6.3 2.1 2.1-6.3z"/></svg>',
    energy:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>'
  };
  function ring(done,due,complete){
    var f=due>0?Math.min(1,done/due):0;
    var ic=complete?'<path d="M10.5 16.5l3.6 3.6 7.4-8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
                   :'<svg x="8.5" y="8.5" width="15" height="15" viewBox="0 0 24 24"><use href="#i-sprout"/></svg>';
    return '<svg class="planning-ring" viewBox="0 0 32 32" aria-hidden="true"><circle class="planning-ring-bg" cx="16" cy="16" r="'+R+'"/>'+
      '<circle class="planning-ring-fg" cx="16" cy="16" r="'+R+'" stroke-dasharray="'+(f*C).toFixed(2)+' '+C.toFixed(2)+'" transform="rotate(-90 16 16)"/><g class="planning-ring-ic">'+ic+'</g></svg>';
  }
  function habitInfo(){
    try{
      if(typeof habitsEnabled==='function'&&habitsEnabled()&&habits.some(function(h){return !h.draft}))return todaySummary();
    }catch(e){}
    return null;
  }

  function build(){
    var dbar=document.querySelector('#view-tasks .date-bar'),tb=document.querySelector('.task-toolbar');
    if(!dbar||!tb)return false;
    if($('planning-bar'))return true;
    var bar=document.createElement('div');bar.id='planning-bar';bar.className='planning-bar focus-hide';
    bar.innerHTML='<button type="button" id="planning-btn" class="planning-btn" aria-haspopup="true" aria-expanded="false" aria-controls="planning-drawer">'+
        '<span class="planning-btn-ic">'+ICON.plan+'</span><span class="planning-btn-t">Planning</span><span id="planning-badge" class="planning-badge" hidden></span><span class="planning-btn-chev">'+ICON.chev+'</span></button>'+
      '<div id="planning-drawer" class="planning-drawer" role="menu" hidden></div>'+
      '<div class="planning-src" hidden></div>';
    bar.querySelector('.planning-src').appendChild(tb);   /* the real Fit Check / energy buttons live here, unseen */
    dbar.insertBefore(bar,dbar.querySelector('.filter-seg[aria-label="Filter tasks"]')||null);
    $('planning-btn').onclick=function(e){e.stopPropagation();toggle()};
    document.addEventListener('click',function(e){var b=$('planning-bar');if(b&&!b.contains(e.target))close()},true);
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('planning-drawer').hidden){close();$('planning-btn').focus()}});
    paint();return true;
  }
  function open(){paint();$('planning-drawer').hidden=false;$('planning-btn').setAttribute('aria-expanded','true');$('planning-bar').classList.add('planning-open');
    var f=$('planning-drawer').querySelector('button');if(f&&document.activeElement===$('planning-btn')){}}
  function close(){var d=$('planning-drawer');if(!d)return;d.hidden=true;$('planning-btn').setAttribute('aria-expanded','false');$('planning-bar').classList.remove('planning-open')}
  function toggle(){$('planning-drawer').hidden?open():close()}

  function row(cls,icon,title,sub,right,fn){
    var b=document.createElement('button');b.type='button';b.className='planning-row '+cls;b.setAttribute('role','menuitem');
    b.innerHTML='<span class="planning-row-ic">'+icon+'</span><span class="planning-row-txt"><span class="planning-row-t">'+title+'</span><span class="planning-row-s">'+sub+'</span></span>'+(right?'<span class="planning-row-r">'+right+'</span>':'');
    b.onclick=function(){close();fn()};return b;
  }
  function paint(){
    var d=$('planning-drawer'),badge=$('planning-badge');if(!d)return;
    var t=habitInfo(),left=t&&t.due>0?t.due-t.done:0;
    badge.hidden=!(left>0);badge.textContent=left>0?String(left):'';
    $('planning-btn').title='';
    d.innerHTML='';
    if(t){
      var state=t.due===0?'rest':(t.done>=t.due?'done':'todo');
      var sub=state==='rest'?'Nothing due today':(state==='done'?'All '+t.due+' done. Nice work.':t.done+' of '+t.due+' done · '+left+' to go');
      d.appendChild(row('planning-hrow planning-'+state,ring(t.done,t.due,state==='done'),'Habits today',sub,state==='done'?'':'Check in'+ICON.arrow,
        function(){try{showView('habits')}catch(e){var n=$('nav-habits');if(n)n.click()}}));
    }
    var fit=document.querySelector('.planning-src .tt-fit'),en=$('energy-btn');
    d.appendChild(row('','<span class="planning-circ">'+ICON.fit+'</span>','Fit Check','Will today’s list fit your time?','',function(){if(fit)fit.click()}));
    d.appendChild(row('','<span class="planning-circ">'+ICON.energy+'</span>','My energy today','Tell BLOC how you feel. It can trim your list.','',function(){if(en)en.click()}));
  }
  window.syncPlanningDrawer=function(){try{if(!$('planning-bar'))build();else{var tb=document.querySelector('.task-toolbar');if(tb&&!tb.closest('.planning-src'))$('planning-bar').querySelector('.planning-src').appendChild(tb);var b=$('planning-bar'),seg=b.parentNode.querySelector('.filter-seg[aria-label="Filter tasks"]');if(seg&&b.nextElementSibling!==seg)b.parentNode.insertBefore(b,seg);paint()}}catch(e){}};

  var tries=0,iv=setInterval(function(){if(build()||++tries>100)clearInterval(iv)},150);
  var debounce=function(f,ms){var t;return function(){clearTimeout(t);t=setTimeout(f,ms)}};
  var d=debounce(window.syncPlanningDrawer,200);
  document.addEventListener('click',d,true);document.addEventListener('visibilitychange',d);window.addEventListener('focus',d);
  var old=window.renderTasks;
  if(typeof old==='function'&&!old.__planningDrawerWrapped){var w=function(){var r=old.apply(this,arguments);try{window.syncPlanningDrawer()}catch(e){}return r};w.__planningDrawerWrapped=1;w.__ux=old.__ux;w.__tasksBannerWrapped=old.__tasksBannerWrapped;w.__tasksLayoutWrapped=old.__tasksLayoutWrapped;window.renderTasks=w}
})();
