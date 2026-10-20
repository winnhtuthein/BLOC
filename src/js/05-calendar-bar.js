/* calendar toolbar behaviour */
(function(){
  'use strict';
  var $=function(id){return document.getElementById(id)};

  /* Reminders button: icon + short state label (called from syncNotifBtn) */
  var LABELS={on:'Reminders on',ask:'Enable reminders',denied:'Reminders blocked',unsupported:'Reminders unavailable'};
  var TIPS={
    on:'Reminders are on. They only fire while this BLOC tab is open. Click to send a test.',
    ask:'Click to allow notifications. Reminders only fire while this BLOC tab is open.',
    denied:'Notifications are blocked for this site. Allow them in your browser’s site settings, then reload.',
    unsupported:'This browser does not support notifications.'};
  window.paintNotifButton=function(b,state){
    b.dataset.state=state;
    b.title=TIPS[state]||'';
    b.setAttribute('aria-label',LABELS[state]);
    b.innerHTML='<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-bell"/></svg><span class="lbl-opt">'+LABELS[state]+'</span>';
  };

  /* Jump to now: scroll the grid to the current-time line; if today is not on screen, go to today first */
  window.calJumpNow=function(){
    try{
      if(viewMode==='month'){calGoToday();return;}
      var iso=isoDate(bocNow());
      if(!document.querySelector('.cal-col[data-date="'+iso+'"]')){calGoToday();return;}
      var wrap=$('cal-grid-wrap');if(!wrap)return;
      var n=bocNow(),mins=n.getHours()*60+n.getMinutes();
      var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
      wrap.scrollTo({top:Math.max(0,minToY(mins)-160),behavior:reduce?'auto':'smooth'});
    }catch(e){}
  };

  /* Called at the end of every calRender */
  window.syncCalendarBar=function(){
    var b=$('cal-now-btn');
    if(b)b.hidden=(typeof viewMode!=='undefined'&&viewMode==='month');
  };

  /* Canvas styling menu */
  function initCanvas(){
    var btn=$('cal-canvas-btn'),menu=$('cal-canvas-menu');if(!btn||!menu||btn.dataset.v6)return;
    btn.dataset.v6='1';
    function set(open){menu.classList.toggle('open',open);btn.setAttribute('aria-expanded',open?'true':'false');}
    btn.addEventListener('click',function(e){e.stopPropagation();set(!menu.classList.contains('open'));
      if(menu.classList.contains('open')){var f=menu.querySelector('button');if(f&&e.detail===0)f.focus();}});
    menu.addEventListener('click',function(e){if(e.target.closest('button'))set(false);});
    document.addEventListener('click',function(e){if(!e.target.closest('.cal-canvas-wrap'))set(false);});
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&menu.classList.contains('open')){set(false);btn.focus();}});
  }

  /* Streak is a read-only stat */
  function initStreak(){var s=$('streak-badge');if(s){s.setAttribute('role','status');s.removeAttribute('onclick');}}

  function init(){initCanvas();initStreak();window.syncCalendarBar();
    try{if(typeof syncNotifBtn==='function')syncNotifBtn();}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
