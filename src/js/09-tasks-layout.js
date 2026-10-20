/* Tasks layout: unsorted note under the add bar, quote as footer */
(function(){
  'use strict';
  var $=function(id){return document.getElementById(id)};
  function place(){
    var wrap=document.querySelector('#view-tasks .tasks-wrap'),add=wrap&&wrap.querySelector('.add-form');
    var un=$('ux-unsorted'),strip=$('tracy-strip-tasks');
    if(!wrap||!add||!un||!strip)return false;
    if(un.previousElementSibling!==add)add.insertAdjacentElement('afterend',un);
    if(strip.parentNode!==wrap)wrap.appendChild(strip);
    else if(wrap.lastElementChild!==strip)wrap.appendChild(strip);
    return true;
  }
  var tries=0,iv=setInterval(function(){if(place()||++tries>80)clearInterval(iv)},150);
  var old=window.renderTasks;
  if(typeof old==='function'&&!old.__tasksLayoutWrapped){var w=function(){var r=old.apply(this,arguments);try{place()}catch(e){}return r};w.__tasksLayoutWrapped=1;w.__ux=old.__ux;w.__tasksBannerWrapped=old.__tasksBannerWrapped;window.renderTasks=w}
})();
