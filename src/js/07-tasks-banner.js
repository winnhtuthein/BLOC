/* Tasks banner */
(function(){
  'use strict';
  var $=function(id){return document.getElementById(id)};

  function build(){
    var strip=$('tracy-strip-tasks'),ins=$('tracy-insight-tasks'),tb=document.querySelector('#view-tasks .task-toolbar');
    if(!strip||!tb||$('tasks-banner'))return !!$('tasks-banner');
    var banner=document.createElement('div');banner.id='tasks-banner';banner.className='tasks-banner focus-hide';
    var card=document.createElement('div');card.className='tasks-card';banner.appendChild(card);
    strip.parentNode.insertBefore(banner,strip);
    card.appendChild(strip);if(ins)card.appendChild(ins);card.appendChild(tb);
    var lbl=document.createElement('span');lbl.className='tasks-tools-lbl';lbl.textContent='Planning tools';tb.insertBefore(lbl,tb.firstChild);
    var hide=document.createElement('button');hide.type='button';hide.className='tasks-hide';hide.textContent='Hide ▴';
    hide.setAttribute('aria-label','Hide planning tools');
    hide.onclick=function(){var t=$('ux-tools-toggle');if(t)t.click();setTimeout(sync,0);};
    tb.appendChild(hide);
    var t=$('ux-tools-toggle');if(t)t.addEventListener('click',function(){setTimeout(sync,0);});
    new MutationObserver(sync).observe(strip,{childList:true,subtree:true,characterData:true});
    sync();return true;
  }
  /* hide the card entirely when it would be an empty box (no quote and tools closed) */
  function sync(){
    var b=$('tasks-banner');if(!b)return;
    var strip=$('tracy-strip-tasks'),tb=b.querySelector('.task-toolbar');
    var hasQuote=!!(strip&&strip.textContent.trim());
    var toolsOpen=!!(tb&&tb.style.display!=='none');
    b.hidden=!(hasQuote||toolsOpen);
  }
  window.syncTasksBanner=sync;

  var tries=0,iv=setInterval(function(){if((build()&&$('ux-tools-toggle'))||++tries>80)clearInterval(iv);},150);
  var old=window.renderTasks;
  if(typeof old==='function'&&!old.__tasksBannerWrapped){var w=function(){var r=old.apply(this,arguments);try{sync()}catch(e){}return r};w.__tasksBannerWrapped=1;w.__ux=old.__ux;window.renderTasks=w}
})();
