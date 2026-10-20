/* consolidation runtime */
(function(){
  'use strict';
  var $=function(id){return document.getElementById(id)};

  /* Move the existing sync card (ids, handlers and fsPaint all keep working) into Profile */
  function moveCard(){
    var card=$('set-acct-card'),host=$('pf-acct-host');
    if(!card||!host)return false;
    if(card.parentNode!==host){host.appendChild(card);card.classList.add('is-moved');}
    try{if(typeof fsPaint==='function')fsPaint();}catch(e){}
    return true;
  }
  window.onProfileShown=moveCard;
  var tries=0,t=setInterval(function(){if(moveCard()||++tries>60)clearInterval(t);},150);

  window.openProfilePanel=function(){
    try{if(typeof closeSettings==='function')closeSettings();}catch(e){}
    if(window.BLOC_ACCT&&BLOC_ACCT.openProfile)BLOC_ACCT.openProfile();else if(typeof showView==='function')showView('profile');
  };

  /* header Add is hidden while the Tasks view (with its own add bar) is open */
  function syncTasksClass(){var v=$('view-tasks');document.body.classList.toggle('on-tasks',!!(v&&v.classList.contains('active')));}
  window.syncViewClass=syncTasksClass;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',syncTasksClass);else syncTasksClass();
})();
