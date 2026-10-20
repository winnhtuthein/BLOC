/* refinement layer (runs after the app) */
(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
function click(id){var e=$(id);if(e)e.click()}
function ready(f){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',f):f()}
ready(function(){setTimeout(init,50)});
function init(){
  header();vocab();quickCapture();tasksLean();a11y();phoneNav();
  document.body.classList.remove('nav-tight');new MutationObserver(function(){if(document.body.classList.contains('nav-tight'))document.body.classList.remove('nav-tight')}).observe(document.body,{attributes:true,attributeFilter:['class']});
  var mo=new MutationObserver(debounce(function(){a11y();vocab();phoneNav()},120));
  mo.observe(document.body,{childList:true,subtree:true});
}
function debounce(f,ms){var t;return function(){clearTimeout(t);t=setTimeout(f,ms)}}

window.uxPickEnergy=function(b){
  document.querySelectorAll('.welcome-energy .energy-btn').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');x.style.outline=x===b?'2px solid var(--amber)':''});
  var l=document.querySelector('.we-lbl');if(l)l.textContent='Energy saved — tap Let\u2019s go when you\u2019re ready';
};
/* 1. Header: + Add and one More menu */
function header(){
  var right=document.querySelector('.hdr-right');if(!right||$('ux-more'))return;
  var add=document.createElement('button');add.type='button';add.className='ux-add';add.id='ux-add';
  add.innerHTML='<span aria-hidden="true">+</span><span class="ux-add-t">Add</span>';add.setAttribute('aria-label','Add a task');
  add.onclick=function(){typeof openQuickCapture==='function'&&openQuickCapture()};
  var wrap=document.createElement('div');wrap.className='ux-more-wrap';wrap.id='ux-more';
  wrap.innerHTML='<button type="button" class="ux-more-btn" id="ux-more-btn" aria-haspopup="menu" aria-expanded="false" aria-label="More"><span aria-hidden="true">⋯</span> <span class="ux-more-t">More</span></button>'+
  '<div class="ux-menu" id="ux-menu" role="menu">'+
  '<div class="ux-lbl">Layout</div><div class="ux-seg" role="group" aria-label="Layout"><button type="button" id="ux-simple">Simple</button><button type="button" id="ux-all">All tools</button></div><hr>'+
  '<div class="ux-tabs-sec"><div class="ux-lbl">More tabs</div><button type="button" role="menuitem" data-v="weekly">Weekly</button><button type="button" role="menuitem" data-v="notes">Notes</button><button type="button" role="menuitem" data-v="library">Library</button><hr></div>'+
  '<button type="button" role="menuitem" data-c="guide-btn">Take the tour</button>'+
  '<button type="button" role="menuitem" data-c="rulebook-btn">Rulebook (how A–E works)</button>'+
  '<button type="button" role="menuitem" data-c="log-btn">Session log</button>'+
  '<button type="button" role="menuitem" data-f="openThemeModal">Theme</button>'+
  '<button type="button" role="menuitem" data-c="kbd-hint-trigger">Keyboard shortcuts</button><hr>'+
  '<button type="button" role="menuitem" data-c="settings-gear-btn">Settings</button></div>';
  right.appendChild(add);right.appendChild(wrap);
  var btn=$('ux-more-btn'),menu=$('ux-menu');
  function set(o){menu.classList.toggle('open',o);btn.setAttribute('aria-expanded',o)}
  btn.onclick=function(e){e.stopPropagation();set(!menu.classList.contains('open'));if(menu.classList.contains('open')){syncSeg();var f=menu.querySelector('button');f&&f.focus()}};
  document.addEventListener('click',function(e){if(!wrap.contains(e.target))set(false)});
  menu.addEventListener('keydown',function(e){if(e.key==='Escape'){set(false);btn.focus()}});
  menu.addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;
    if(b.id==='ux-simple'){setViewMode(true);syncSeg();return}
    if(b.id==='ux-all'){setViewMode(false);syncSeg();return}
    set(false);
    if(b.dataset.c)setTimeout(function(){click(b.dataset.c)},0);
    if(b.dataset.v)setTimeout(function(){showView(b.dataset.v)},0);
    if(b.dataset.f&&window[b.dataset.f])window[b.dataset.f]();
  });
  function syncSeg(){var calm=typeof focusModeOn!=='undefined'&&focusModeOn;$('ux-simple').setAttribute('aria-pressed',!!calm);$('ux-all').setAttribute('aria-pressed',!calm)}
  window.addEventListener('keydown',function(e){if(e.key==='Escape')set(false)});
}

/* 5. Vocabulary */
function vocab(){
  var sb=$('streak-badge');
  if(sb){sb.title='Days in a row with at least one completed focus block';
    sb.childNodes.forEach(function(n){if(n.nodeType===3&&/\bday\b/.test(n.nodeValue))n.nodeValue=' day focus streak'})}
  var tg=$('logo-tagline-txt');if(tg&&tg.textContent==='MASTER YOUR DAY')tg.textContent='Plan your day';
  document.querySelectorAll('.ms-opt,#focus-mode-btn button').forEach(function(b){
    b.childNodes.forEach(function(n){if(n.nodeType===3){n.nodeValue=n.nodeValue.replace(/\bCalm\b/i,'Simple').replace(/\bFull\b/i,'All tools')}})});
  var d=document.body.querySelectorAll('.data-hint,.dm-hint,[id*="data-menu"] small');
  d.forEach(function(e){if(/nothing is synced anywhere/i.test(e.textContent)&&typeof fullSyncOn==='function'&&fullSyncOn())e.textContent='Your data is backed up to your account and synced across your devices.'});
  document.querySelectorAll('.btm-btn').forEach(function(b){});
}

/* 2. Quick Capture: plain-language labels */
function quickCapture(){
  var s=$('qc-type');if(!s)return;
  var L={A:'A — Must do',B:'B — Should do',C:'C — Nice to do',D:'D — Delegate',E:'E — Eliminate'};
  Array.prototype.forEach.call(s.options,function(o){if(L[o.value])o.textContent=L[o.value]});
  s.setAttribute('aria-label','Task priority');
}

/* 4. Tasks: only show planning tools once there are 5+ open tasks (or user opts in) */
function tasksLean(){
  var tb=document.querySelector('#view-tasks .task-toolbar'),seg=document.querySelector('#view-tasks .filter-seg');
  if(!tb||!seg||$('ux-tools-toggle'))return;
  var KEY='bloc_planning_tools_v1',pref=null;
  try{var s=localStorage.getItem(KEY);if(s==='1')pref=true;else if(s==='0')pref=false;}catch(e){}
  var wrap=document.createElement('div');wrap.className='filter-seg tools-seg';wrap.setAttribute('role','group');wrap.setAttribute('aria-label','Planning tools');
  var b=document.createElement('button');b.type='button';b.id='ux-tools-toggle';b.className='seg-btn';
  b.title='Planning tools: check whether today fits your time, and tell BLOC your energy level';
  wrap.appendChild(b);seg.parentNode.insertBefore(wrap,seg.nextSibling);
  function openCount(){try{return tasks.filter(function(t){return !t.done}).length}catch(e){return 0}}
  function isOpen(){return pref!==null?pref:openCount()>=5;}
  function apply(){
    var open=isOpen();
    document.body.classList.toggle('ux-lean',!open);
    tb.style.display=open?'':'none';
    b.setAttribute('aria-pressed',open?'true':'false');
    b.textContent='Planning tools '+(open?'\u25B4':'\u25BE');
  }
  b.onclick=function(){pref=!isOpen();try{localStorage.setItem(KEY,pref?'1':'0');}catch(e){}apply();};
  apply();
  var old=window.renderTasks;
  if(typeof old==='function'&&!old.__ux){var w=function(){var r=old.apply(this,arguments);try{apply()}catch(e){}return r};w.__ux=1;window.renderTasks=w}
}

/* 6. Accessibility: roles, keys, focus traps */
function a11y(){
  document.querySelectorAll('[onclick]').forEach(function(e){
    var t=e.tagName;if(/^(BUTTON|A|INPUT|SELECT|TEXTAREA|SUMMARY|LABEL)$/.test(t))return;
    if(e.getAttribute('role'))return;
    if(e.classList.contains('t-chk')){e.setAttribute('role','checkbox');e.setAttribute('aria-checked',e.classList.contains('done')||e.classList.contains('on')||e.classList.contains('checked')?'true':'false');if(!e.getAttribute('aria-label'))e.setAttribute('aria-label','Mark task done')}
    else e.setAttribute('role','button');
    if(!e.hasAttribute('tabindex'))e.tabIndex=0;
    if(e.classList.contains('panel-close')&&!e.getAttribute('aria-label'))e.setAttribute('aria-label','Close panel');
  });
  document.querySelectorAll('.side-panel,.overlay,#quick-capture').forEach(function(p){
    if(!p.getAttribute('role'))p.setAttribute('role','dialog');
    p.setAttribute('aria-modal','true');
    var t=p.querySelector('.panel-title,.modal-title,h2,h3');
    if(t&&!p.getAttribute('aria-label'))p.setAttribute('aria-label',t.textContent.trim().slice(0,60));
  });
}
document.addEventListener('keydown',function(e){
  var el=e.target;
  if((e.key==='Enter'||e.key===' ')&&el&&el.getAttribute&&/^(button|checkbox)$/.test(el.getAttribute('role')||'')&&!/^(BUTTON|A|INPUT)$/.test(el.tagName)){e.preventDefault();el.click()}
  if(e.key==='Tab'){
    var open=document.querySelectorAll('.side-panel.open,.overlay.open,#quick-capture.open,.modal-overlay.open');
    var d=open[open.length-1];if(!d)return;
    var f=[].filter.call(d.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'),function(x){return !x.disabled&&x.offsetParent!==null});
    if(!f.length)return;
    var first=f[0],last=f[f.length-1];
    if(!d.contains(document.activeElement)){first.focus();e.preventDefault()}
    else if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault()}
    else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault()}
  }
},true);
/* restore focus after a dialog closes */
(function(){var last=null;
  document.addEventListener('click',function(e){var b=e.target.closest('button,[role=button]');if(b&&!b.closest('.side-panel,.overlay'))last=b},true);
  new MutationObserver(function(ms){ms.forEach(function(m){if(m.attributeName==='class'&&m.oldValue&&/\bopen\b/.test(m.oldValue)&&!m.target.classList.contains('open')&&last&&document.contains(last)&&/side-panel|overlay|quick-capture/.test(m.target.className+m.target.id))setTimeout(function(){last.focus()},30)})})
   .observe(document.documentElement,{attributes:true,attributeOldValue:true,subtree:true,attributeFilter:['class']});
})();

/* 3. Phone nav: 4 tabs + More sheet */
function phoneNav(){
  var nav=$('hdr-nav');if(!nav)return;
  var mq=window.matchMedia('(max-width:640px)');
  document.body.classList.toggle('ux-phone',mq.matches);
  var btns=[].slice.call(nav.querySelectorAll('.nav-btn[data-navkey]'));
  var keep=['tasks','focus','calendar','habits'];
  btns.forEach(function(b,i){b.classList.toggle('ux-overflow',keep.indexOf(b.dataset.navkey)<0)});
  var over=btns.filter(function(b){return keep.indexOf(b.dataset.navkey)<0});
  var more=$('ux-tabmore');
  if(!more){
    more=document.createElement('button');more.type='button';more.id='ux-tabmore';more.className='ux-tabmore nav-btn';
    more.innerHTML='<span aria-hidden="true" style="font-size:20px;line-height:1">⋯</span><span>More</span>';
    more.setAttribute('aria-haspopup','dialog');
    var sheet=document.createElement('div');sheet.id='ux-sheet';sheet.className='ux-sheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','More tabs');
    document.body.appendChild(sheet);
    more.onclick=function(e){e.stopPropagation();sheet.classList.toggle('open')};
    document.addEventListener('click',function(e){if(!sheet.contains(e.target))sheet.classList.remove('open')});
    nav.appendChild(more);
  }
  var sheet=$('ux-sheet');sheet.innerHTML='';
  over.forEach(function(b){var l=b.querySelector('.nav-lbl');var s=document.createElement('button');s.type='button';s.textContent=l?l.textContent:b.dataset.navkey;
    s.onclick=function(){sheet.classList.remove('open');b.click()};sheet.appendChild(s)});
  more.style.display=mq.matches?'':'none';
}

/* 8. Habits today strip on Tasks */
function habitsToday(){
  var wrap=document.querySelector('#view-tasks .tasks-wrap');if(!wrap||$('ux-habits-today'))return;
  var s=document.createElement('div');s.id='ux-habits-today';s.style.display='none';wrap.parentNode.insertBefore(s,wrap);
  function paint(){
    try{
      if(typeof habitsEnabled!=='undefined'&&!habitsEnabled){s.style.display='none';return}
      var src=document.getElementById('nav-habits');if(!src){s.style.display='none';return}
      s.style.display='flex';s.innerHTML='<span>Habits today:</span><button type="button" class="ux-hchip">Open check-in</button>';
      s.querySelector('button').onclick=function(){src.click()};
    }catch(e){s.style.display='none'}
  }
  paint();
}
})();

/* ===== Part 2: Settings, optional A–E, first-run ===== */
(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function ready(f){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',f):f()}
ready(function(){setTimeout(function(){readSettings();unsorted();firstRun()},80)});

/* Settings: search, Basics/Advanced, AI opt-in, restore defaults */
function readSettings(){
  var panel=$('settings-panel');if(!panel||$('ux-set-search'))return;
  var g0=$('set-theme-grid'),card=g0&&g0.closest('.set-card');
  if(card){
    var d=document.createElement('details');d.className='set-acc';d.id='ux-appearance';
    d.innerHTML='<summary><span class="set-acc-ico"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-palette"/></svg></span><span class="set-acc-txt"><span class="set-acc-title">Appearance</span><span class="set-acc-sub">Theme and reading style</span></span></summary><div class="set-acc-body"></div>';
    d.querySelector('.set-acc-body').appendChild(g0);
    card.parentNode.replaceChild(d,card);
  }
  var sub=panel.querySelector('.panel-sub');
  var box=document.createElement('div');box.style.cssText='margin:10px 0 6px';
  box.innerHTML='<input id="ux-set-search" type="search" class="settings-input" placeholder="Search settings…" aria-label="Search settings" style="width:100%">'+
   '<div class="toggle-row" style="margin-top:10px"><div><div class="toggle-row-lbl">Show advanced settings</div><span class="toggle-row-sub">Voice, AI, buttons, library and Focus options</span></div><label class="toggle-switch"><input type="checkbox" id="ux-adv"><span class="tsw-track"><span class="tsw-thumb"></span></span></label></div>';
  sub.parentNode.insertBefore(box,sub.nextSibling);
  var ADV=/Voice|AI &|Buttons|Library|Focus Mode/i;
  var accs=[].slice.call(panel.querySelectorAll('details.set-acc'));
  accs.forEach(function(a){var t=a.querySelector('.set-acc-title');a.dataset.uxAdv=(t&&ADV.test(t.textContent))?'1':'0'});
  var adv=$('ux-adv');adv.checked=lsGet('bloc_ux_adv')==='1';
  function apply(){
    var q=$('ux-set-search').value.trim().toLowerCase();
    accs.forEach(function(a){
      var hit=!q||a.textContent.toLowerCase().indexOf(q)>=0;
      var show=q?hit:(a.dataset.uxAdv==='0'||adv.checked);
      a.style.display=show?'':'none';
      if(q&&hit)a.open=true;
    });
    panel.querySelectorAll('.set-card').forEach(function(c){c.style.display=(!q||c.textContent.toLowerCase().indexOf(q)>=0)?'':'none'});
    var rs=$('ux-restore');if(rs)rs.style.display=q?'none':'';
  }
  adv.onchange=function(){lsSet('bloc_ux_adv',adv.checked?'1':'0');apply()};
  $('ux-set-search').oninput=apply;
  /* AI keys behind an opt-in */
  var keyBtn=panel.querySelector('button[onclick*="baiOpenKeyManager"]');
  var field=keyBtn&&keyBtn.closest('.settings-field');
  if(field){
    var hasKey=false;try{hasKey=!!(baiGetKeyPrimary()||baiGetKeyBackup())}catch(e){}
    var on=hasKey||lsGet('bloc_ux_ai')==='1';
    var t=document.createElement('div');t.className='toggle-row';
    t.innerHTML='<div><div class="toggle-row-lbl">I want to use my own AI key</div><span class="toggle-row-sub">Optional. The Library assistant and Wojak\u2019s built-in answers work without one.</span></div><label class="toggle-switch"><input type="checkbox" id="ux-ai"><span class="tsw-track"><span class="tsw-thumb"></span></span></label>';
    field.parentNode.insertBefore(t,field);
    var cb=t.querySelector('input');cb.checked=on;field.style.display=on?'':'none';
    cb.onchange=function(){lsSet('bloc_ux_ai',cb.checked?'1':'0');field.style.display=cb.checked?'':'none'};
  }
  /* Restore recommended defaults (keeps name, time zone, AI keys) */
  var b=document.createElement('button');b.type='button';b.id='ux-restore';b.className='set-secondary';b.style.cssText='margin:18px 0 28px;width:100%';
  b.textContent='Restore recommended defaults';
  b.onclick=function(){
    if(!confirm('Restore recommended settings? Your name, time zone and AI keys are kept. Tasks and notes are not touched.'))return;
    var keep={};['userName','userNameSpeech','userProfile','timezone','timezoneConfirmed','timezoneManual'].forEach(function(k){keep[k]=appSettings[k]});
    appSettings=Object.assign({},DEFAULT_SETTINGS,keep);
    saveAppSettings();try{applyBranding();applyFloatingButtons();populateSettingsForm()}catch(e){}
    showToast('SETTINGS RESTORED');
  };
  panel.appendChild(b);
  apply();
}

/* Optional A–E: "Not sure yet" saves as B and is flagged for sorting later */
function unsorted(){
  ['new-type','qc-type'].forEach(function(id){
    var s=$(id);if(!s||s.querySelector('option[value=U]'))return;
    var o=document.createElement('option');o.value='U';o.textContent='Not sure yet (sort later)';
    s.insertBefore(o,s.firstChild);s.value='U';
  });
  function wrap(name,selId){
    var f=window[name];if(typeof f!=='function'||f.__ux)return;
    var w=function(){
      var s=$(selId),was=s.value,n=tasks.length;
      if(was==='U')s.value='B';
      var r=f.apply(this,arguments);
      s.value=(was==='U')?'U':s.value;
      if(was==='U'&&tasks.length>n){for(var i=n;i<tasks.length;i++)tasks[i].unsorted=true;saveT();renderTasks()}
      return r;
    };w.__ux=1;window[name]=w;
  }
  wrap('addTask','new-type');wrap('qcKeydown','qc-type');
  var tw=document.querySelector('#view-tasks .tasks-wrap');if(!tw||$('ux-unsorted'))return;
  var bar=document.createElement('div');bar.id='ux-unsorted';bar.style.cssText='display:none';
  bar.innerHTML='<span class="ux-unsorted-n" id="ux-unsorted-n">0</span><span class="ux-unsorted-t" id="ux-unsorted-t"></span><button type="button" class="ux-show-tools" id="ux-sort-go">Sort them \u2192</button>';
  tw.insertBefore(bar,tw.firstChild);
  var dlg=document.createElement('div');dlg.id='ux-sort';dlg.setAttribute('role','dialog');dlg.setAttribute('aria-modal','true');dlg.setAttribute('aria-label','Sort your tasks');
  dlg.style.cssText='display:none;position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,.55);align-items:center;justify-content:center;padding:16px';
  document.body.appendChild(dlg);
  var LET=[['A','Must do'],['B','Should do'],['C','Nice to do'],['D','Delegate'],['E','Eliminate']];
  function paintDlg(){
    var list=tasks.filter(function(t){return t.unsorted&&!t.done});
    if(!list.length){dlg.style.display='none';paintBar();return}
    var t=list[0];
    dlg.innerHTML='<div style="background:var(--surf);color:var(--txt);border:1px solid var(--bdr2);border-radius:12px;max-width:440px;width:100%;padding:20px;font:400 15px var(--sans)">'+
     '<div style="font-size:12px;color:var(--muted);margin-bottom:6px">'+list.length+' left to sort</div>'+
     '<div style="font:600 18px var(--sans);margin-bottom:10px;overflow-wrap:anywhere"></div>'+
     '<p style="margin:0 0 12px;color:var(--txt2)">What happens if this doesn\u2019t get done?</p><div id="ux-sort-btns" style="display:grid;gap:8px"></div>'+
     '<button type="button" id="ux-sort-x" class="ux-show-tools" style="margin-top:12px">Close</button></div>';
    dlg.firstChild.children[1].textContent=t.text;
    var hint={A:'Serious consequences',B:'Mild consequences',C:'Nothing bad happens',D:'Someone else can do it',E:'Not worth doing'};
    LET.forEach(function(l){var b=document.createElement('button');b.type='button';b.className='set-secondary';b.style.cssText='text-align:left;min-height:44px';b.style.setProperty('--c','var(--p'+l[0].toLowerCase()+')');var sl=document.createElement('span');sl.className='us-l';sl.textContent=l[0];var st=document.createElement('span');st.className='us-t';st.textContent=hint[l[0]];b.appendChild(sl);b.appendChild(st);b.setAttribute('aria-label',l[0]+' \u2014 '+hint[l[0]]);
      b.onclick=function(){
        if(l[0]==='A'&&tasks.filter(function(x){return x.type==='A'&&x.dateISO===t.dateISO&&!x.unsorted}).length>=3){showToast('MAX 3 A-TASKS');return}
        t.type=l[0];delete t.unsorted;saveT();renderTasks();paintDlg();};
      $('ux-sort-btns').appendChild(b)});
    $('ux-sort-x').onclick=function(){dlg.style.display='none'};
    dlg.style.display='flex';dlg.querySelector('button').focus();
  }
  function paintBar(){
    var n=tasks.filter(function(t){return t.unsorted&&!t.done}).length;
    bar.style.display=n?'flex':'none';
    $('ux-unsorted-n').textContent=n;$('ux-unsorted-t').textContent=(n===1?'task isn\u2019t':'tasks aren\u2019t')+' sorted yet';
  }
  $('ux-sort-go').onclick=paintDlg;
  var old=window.renderTasks;
  if(typeof old==='function'){var w=function(){var r=old.apply(this,arguments);try{paintBar()}catch(e){}return r};w.__ux=old.__ux;window.renderTasks=w}
  paintBar();
}

/* First run: show the "give every task a letter" card only after the first task exists */
function firstRun(){
  function f(){try{document.querySelectorAll('.rb-intro').forEach(function(e){e.style.display=(tasks.length&&!rbSeen())?'':'none'})}catch(e){}}
  f();new MutationObserver(function(){f()}).observe(document.body,{childList:true,subtree:true});
}
})();

/* ===== Part 3: Habits today, one theme home, quiet first launch ===== */
(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
function ready(f){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',f):f()}
ready(function(){setTimeout(function(){habitsStrip();themeHome();habitTips()},100)});
function debounce(f,ms){var t;return function(){clearTimeout(t);t=setTimeout(f,ms)}}

function habitsStrip(){
  var tw=document.querySelector('#view-tasks .tasks-wrap');if(!tw||$('ux-habits-today'))return;
  var s=document.createElement('button');s.type='button';s.id='ux-habits-today';
  s.style.cssText='display:none;align-items:center;gap:8px;width:100%;text-align:left;margin:0 0 12px;padding:10px 14px;border:1px solid var(--bdr2);border-radius:8px;background:var(--surf2);color:var(--txt);font:400 14px var(--sans);cursor:pointer';
  s.onclick=function(){showView('habits')};
  tw.insertBefore(s,tw.firstChild);
  function paint(){
    try{
      if(!habitsEnabled()||!habits.some(function(h){return !h.draft})){s.style.display='none';return}
      var t=todaySummary();
      s.style.display='flex';
      s.textContent=t.due===0?'Habits: resting today':'Habits today: '+t.done+' of '+t.due+' done'+(t.done===t.due?' \u2713':'')+' \u2014 open';
    }catch(e){s.style.display='none'}
  }
  var d=debounce(paint,200);
  document.addEventListener('click',d,true);document.addEventListener('visibilitychange',d);
  paint();
}

function habitTips(){
  var old=document.querySelector('div.hb-howto');if(!old)return;
  var d=document.createElement('details');d.className='hb-howto';
  d.innerHTML='<summary>Tips for making habits stick</summary><ul>'+
   '<li><b>Attach it to something you already do.</b> \u201cAfter I pour coffee, I stretch.\u201d</li>'+
   '<li><b>Make it tiny.</b> On a bad day the tiny version still counts.</li>'+
   '<li><b>Never miss twice.</b> One gap is fine; just do the smallest rep next time.</li>'+
   '<li><b>Plan for bad days.</b> Decide now what the tiny version is.</li></ul>'+
   '<a class="hb-howto-link" href="javascript:void(0)" onclick="showView(\'library\')">Read more in the Library</a>';
  old.parentNode.replaceChild(d,old);
}
/* One home for themes: Settings > Appearance */
function themeHome(){
  var b=document.querySelector('.btm-btn[onclick*="openThemeModal"]');if(b)b.style.display='none';
  var sel=$('set-theme'),grid=$('set-theme-grid');
  if(sel&&grid){
    var f=sel.closest('.settings-field');
    if(f){var l=f.querySelector('label');if(l)l.textContent='Reading style';grid.parentNode.appendChild(f)}
  }
  var m=document.querySelector('#ux-menu button[data-f="openThemeModal"]');
  if(m){m.removeAttribute('data-f');m.textContent='Theme & appearance';
    m.onclick=function(e){e.stopImmediatePropagation();document.getElementById('ux-menu').classList.remove('open');
      openSettings();try{fillFocusSettings()}catch(x){}
      setTimeout(function(){var a=$('ux-appearance');if(a)a.open=true;var g=$('set-theme-grid');g&&g.scrollIntoView({block:'center'})},250)}}
}
})();
