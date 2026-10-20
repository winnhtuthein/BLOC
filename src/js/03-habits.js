/* redesigned Habits view.
   Overrides the render functions only. Data model, storage and every handler
   (logHabitDay, cycleDay, startHabitEdit, …) are the originals. */
(function(){
'use strict';
if(typeof rowHTML!=='function'||typeof renderHabits!=='function'||typeof habits==='undefined')return;

var esc=escHTML;
var SHIELD=typeof HB_SHIELD_PATH!=='undefined'?HB_SHIELD_PATH:'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z';

/* ---------- small svg helpers ---------- */
var I={
  check:'<svg viewBox="0 0 24 24" aria-hidden="true" class="hx-tick"><path d="M5.5 12.5l4.3 4.3L18.5 7.8" pathLength="1"/></svg>',
  plus:'<svg viewBox="0 0 24 24" aria-hidden="true" class="hx-i"><path d="M12 5v14M5 12h14"/></svg>',
  minus:'<svg viewBox="0 0 24 24" aria-hidden="true" class="hx-i"><path d="M7 12h10"/></svg>',
  shield:'<svg viewBox="0 0 24 24" aria-hidden="true" class="hx-i hx-i-fill"><path d="'+SHIELD+'"/></svg>'
};
function ico(n,c){return hico(n,c||n);}
function cap(s){s=String(s||'').toLowerCase();return s.charAt(0).toUpperCase()+s.slice(1);}
function isoWd(iso,len){return new Date(iso+'T00:00:00').toLocaleDateString('en-US',{weekday:len||'narrow'});}
function lastDays(n){
  var out=[],c=bocNow();
  for(var i=0;i<n;i++){out.unshift(isoDate(c));c=new Date(c.getTime()-86400000);}
  return out;
}
function freqLabel(h){
  if(!isWeekly(h))return 'Daily';
  var t=habitTarget(h);return t===1?'Weekly':t+'× a week';
}

/* ---------- day cell (7-day strip) ---------- */
function dayInfo(h,iso,today,everObs,sim){
  var d={cls:'unset',glyph:'',label:'before this habit started',edit:false};
  if(iso<h.startDateISO)return d;
  if(!everObs){
    if(iso===today){d.cls='pending';d.label='not started yet';}
    else d.label='not started yet';
    return d;
  }
  var st=dayStateOf(h,iso),isToday=iso===today;
  d.edit=!isToday;
  if(st==='observed'){
    var tiny=h.levels&&h.levels[iso]==='tiny';
    d.cls='done'+(tiny?' tiny':'');d.glyph=tiny?'':I.check;d.label=tiny?'done, tiny version':'done';
  }else if(st==='confirmed-rest'){d.cls='rest';d.glyph=ico('moon','rest');d.label='rest day';}
  else if(sim.covered[iso]){d.cls='covered';d.glyph=I.shield;d.label='covered by a streak shield';}
  else if(st==='missed'){d.cls='skipped';d.glyph=I.minus;d.label='skipped';}
  else if(isToday){d.cls='pending';d.label='not logged yet';}
  else if(isWeekly(h)){d.cls='off';d.label='no check-in';}
  else{d.cls='missed';d.label='missed';}
  return d;
}
function stripHTML(h){
  var today=isoDate(bocNow()),everObs=everDone(h);
  var sim=isWeekly(h)?{covered:{}}:habitSim(h);
  return '<div class="hx-strip" role="group" aria-label="Last 7 days">'+lastDays(7).map(function(iso){
    var d=dayInfo(h,iso,today,everObs,sim),isToday=iso===today;
    var name=isoWd(iso,'long')+(isToday?' (today)':'');
    var tip=name+' — '+d.label+(d.edit?'. Tap to change':'');
    var edit=d.edit?' role="button" tabindex="0" onclick="cycleDay(\''+h.id+'\',\''+iso+'\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();cycleDay(\''+h.id+'\',\''+iso+'\');}"':'';
    return '<span class="hx-d '+d.cls+(isToday?' is-today':'')+(d.edit?' is-edit':'')+'" title="'+esc(tip)+'" aria-label="'+esc(tip)+'"'+(d.edit?'':' role="img"')+edit+'>'+
      '<i class="hx-d-l">'+isoWd(iso)+'</i><b class="hx-d-c">'+d.glyph+'</b></span>';
  }).join('')+'</div>';
}

/* ---------- streak block ---------- */
function streakHTML(h,todayState,streak){
  var unit=habitUnit(h),started=everDone(h),today=isoDate(bocNow());
  var weekly=isWeekly(h),facts=[],head='';
  var best=Math.max(h.bestStreak||0,streak);
  if(weekly){
    var s=habitWeekStats(h,calWeekStart(bocNow()));
    var tgt=s.eff||habitTarget(h),pct=tgt?Math.min(100,Math.round(s.observed/tgt*100)):0;
    facts.push('<span class="hx-wk'+(s.met?' met':'')+'" title="Check-ins this week against your target"><span class="hx-wk-bar"><i style="width:'+pct+'%"></i></span>'+s.observed+' of '+tgt+' this week</span>');
  }
  if(!started){
    return '<div class="hx-streak-wrap"><div class="hx-streak is-new"><span class="hx-u">Your first check-in starts the streak</span></div>'+
      (facts.length?'<div class="hx-facts">'+facts.join('')+'</div>':'')+'</div>';
  }
  if(streak>0){
    var tier=streakTier(streak,unit);
    var rec=h.bestStreakDate===today&&todayState==='observed'&&streak===best;
    head='<div class="hx-streak tier-'+tier+'"><span class="hx-flame">'+ico('flame','flame')+'</span><b class="hx-n">'+streak+'</b><span class="hx-u">'+(weekly?'week':'day')+' streak</span>'+
      (rec?'<span class="hx-record" title="You just passed your previous best">'+ico('trophy','trophy')+'New record</span>':'')+'</div>';
    if(!rec&&best>streak)facts.push('<span>Best '+best+(weekly?' weeks':' days')+'</span>');
    else if(!rec&&best===streak&&best>=7)facts.push('<span class="hx-pb">Your best so far</span>');
  }else{
    head='<div class="hx-streak is-cold"><span class="hx-u">'+(weekly?'This week is a fresh start':'Today is a fresh rep')+'</span></div>';
    if(best>0)facts.push('<span>Best '+best+(weekly?' weeks':' days')+'</span>');
  }
  if(!weekly){
    var c=consistencyOf(h,14);
    if(c.n)facts.unshift('<span title="Days done, or covered by a shield, out of the last '+c.n+'">'+c.done+' of last '+c.n+' days</span>');
    var sim=habitSim(h);
    facts.push('<span class="hx-sh">'+shieldPipsHTML(sim.shields,sim.toNext)+'<span>'+(sim.shields>0?sim.shields+(sim.shields===1?' shield':' shields'):'Shield in '+sim.toNext+(sim.toNext===1?' day':' days'))+'</span></span>');
  }
  return '<div class="hx-streak-wrap">'+head+'<div class="hx-facts">'+facts.join('')+'</div></div>';
}

/* ---------- toolbar ---------- */
skipBtnHTML=function(h,todayState){
  var on=todayState==='confirmed-rest'||todayState==='missed';
  var title=on?'Skipped today — tap to undo':'Skip today — rest, sick or travel days keep your streak';
  return '<button type="button" class="hx-tool hx-skip wk-habit-skip-btn'+(on?' on':'')+'" onclick="habitSkipClick(event,\''+h.id+'\')" title="'+title+'" aria-label="'+(on?'Undo skip for today':'Skip today')+'" aria-haspopup="true" aria-pressed="'+on+'">'+ico('moon','rest')+'<span>'+(on?'Skipped':'Skip')+'</span></button>';
};

var _os=openHabitSkip;
openHabitSkip=function(id,btn){_os(id,btn);var hd=document.querySelector('#hb-skip-pop .hb-skip-hd');if(hd)hd.textContent='Skip today';};

/* ---------- cue ---------- */
function cueHTML(h,compact){
  if(!h.cue){
    if(compact)return '';
    return '<button type="button" class="hx-cue-add" onclick="startHabitEdit(\''+h.id+'\',\'cue\')" title="A specific trigger makes a habit far more likely to happen">'+I.plus+'<span>Add a cue</span><em>After I…  When I…  If… then</em></button>';
  }
  var t=HABIT_CUE_TYPES[cueKind(h)];
  var edit=compact?'':' role="button" tabindex="0" title="Edit trigger" aria-label="Edit trigger: '+esc(habitCueLine(h).replace('↳ ',''))+'" onclick="startHabitEdit(\''+h.id+'\',\'cue\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();startHabitEdit(\''+h.id+'\',\'cue\');}"';
  var lead=cueKind(h)==='ifthen'?'If':t.pre;
  return '<p class="hx-cue"'+edit+'><span class="hx-cue-k">'+esc(lead)+'</span> '+esc(h.cue)+'</p>';
}

/* ---------- habit card ---------- */
rowHTML=function(h,compact){
  if(!compact&&_habitEdit&&_habitEdit.id===h.id)return editorHTML();
  if(h.draft)return draftRowHTML(h);
  var today=isoDate(bocNow());
  var st=dayStateOf(h,today),streak=currentHabitStreak(h);
  var done=st==='observed',rest=st==='confirmed-rest',skipped=st==='missed';
  var tinyToday=h.levels&&h.levels[today]==='tiny';
  var isCel=!!(_habitCel&&_habitCel.id===h.id);
  var fresh=isCel&&(Date.now()-_habitCel.t<700);
  var started=everDone(h);
  var cls='hx-card'+(compact?' is-compact':'')+(done?' is-done':'')+(rest?' is-rest':'')+(skipped?' is-skipped':'')+(!started?' is-new':'')+(fresh?' hb-shine':'');

  var glyph=done?I.check:rest?ico('moon','rest'):skipped?I.minus:I.check;
  var cstate=done?'done':rest?'rest':skipped?'skipped':'open';
  var chkLabel=done?'Done today. Tap to unmark: ':'Mark done today: ';
  var check='<button type="button" class="hx-check '+cstate+(tinyToday&&done?' tiny':'')+(fresh&&done?' hb-pop':'')+'" role="checkbox" aria-checked="'+done+'" aria-label="'+esc(chkLabel+h.title)+'" onclick="logHabitDay(\''+h.id+'\',\'observed\')" title="'+(done?'Done today — tap to unmark':'Mark done today')+'">'+glyph+'</button>';

  var skipReason=(rest||skipped)&&h.reasons&&h.reasons[today]?h.reasons[today]:'';
  var tags='';
  if(done&&tinyToday)tags+='<span class="hx-tag ok" title="Done via the tiny version — still counts">'+ico('sparkle','spark')+'Tiny version</span>';
  if(skipReason)tags+='<span class="hx-tag" title="Why you skipped today">Skipped: '+esc(skipReason.toLowerCase())+'</span>';

  var name=compact
    ?'<span class="hx-name-t">'+esc(h.title)+'</span>'
    :'<span class="hx-name-t editable" role="button" tabindex="0" title="Edit habit" aria-label="Edit habit: '+esc(h.title)+'" onclick="startHabitEdit(\''+h.id+'\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();startHabitEdit(\''+h.id+'\');}">'+esc(h.title)+'</span>';

  var tools=compact
    ?skipBtnHTML(h,st)
    :skipBtnHTML(h,st)+
      '<button type="button" class="hx-tool icon wk-habit-edit-btn" onclick="startHabitEdit(\''+h.id+'\')" title="Edit — cue, tiny version, hard-day plan" aria-label="Edit habit">'+ico('edit','edit')+'</button>'+
      '<button type="button" class="hx-tool icon wk-habit-hist-btn" onclick="openHabitHistory(\''+h.id+'\')" title="Full history" aria-label="Open history">'+ico('chart','chart')+'</button>';

  var head='<div class="hx-head-row">'+check+
    '<div class="hx-body"><div class="hx-titlerow"><h3 class="hx-name" aria-label="'+esc(h.title)+'">'+name+'</h3>'+(!compact&&isWeekly(h)?'<span class="hx-freq">'+freqLabel(h)+'</span>':'')+tags+'</div>'+cueHTML(h,compact)+'</div>'+
    '<div class="hx-tools" role="group" aria-label="Actions for '+esc(h.title)+'">'+tools+'</div></div>';

  if(compact){
    var cs=started&&streak>0?'<div class="hx-mini"><span class="hx-flame">'+ico('flame','flame')+'</span><b>'+streak+'</b> '+(isWeekly(h)?'week':'day')+' streak</div>':'';
    return '<article data-hid="'+h.id+'" class="'+cls+'">'+head+cs+celebrationHTML(h,true)+'</article>';
  }

  var tinyBtn=(h.tiny&&st!=='observed')
    ?'<button type="button" class="hx-tiny wk-habit-tiny-btn" onclick="logHabitDay(\''+h.id+'\',\'observed\',\'tiny\')" title="Log the tiny version — it still counts">'+ico('sparkle','spark')+'<span>Tiny version</span><em>'+esc(h.tiny)+'</em></button>':'';
  var nudge=nudgeText(h,st);
  var extras='';
  if(h.identity)extras+='<p class="hx-identity" role="button" tabindex="0" onclick="startHabitEdit(\''+h.id+'\')" onkeydown="if(event.key===\'Enter\'){startHabitEdit(\''+h.id+'\')}" title="Edit">“'+esc(h.identity)+'”</p>';
  if(h.obstacle||h.fallback){
    extras+='<p class="hx-plan" title="Your if-then plan for when it gets hard"><b>On a hard day</b> If '+esc(h.obstacle||'it gets hard')+', '+esc(h.fallback||(h.tiny?'do the tiny version':'do the smallest version'))+'</p>';
  }
  if(!h.tiny&&!h.obstacle&&!h.identity&&everDoneOrOld(h)){
    extras+='<button type="button" class="hx-more-add" onclick="startHabitEdit(\''+h.id+'\',\'tiny\')" title="Name the smallest rep that still counts">'+I.plus+'Add a tiny version and a hard-day plan</button>';
  }
  return '<article data-hid="'+h.id+'" class="'+cls+'">'+head+
    celebrationHTML(h,false)+
    '<div class="hx-track">'+stripHTML(h)+streakHTML(h,st,streak)+'</div>'+
    (tinyBtn||shieldNoteHTML(h)||nudge?'<div class="hx-sub">'+tinyBtn+shieldNoteHTML(h)+(nudge?'<div class="hx-nudge">'+esc(nudge)+'</div>':'')+'</div>':'')+
    (extras?'<div class="hx-sub hx-extras">'+extras+'</div>':'')+
    '</article>';
};
/* keep the original's wording but in sentence case */
var _cel=celebrationHTML;
celebrationHTML=function(h,compact){return _cel(h,compact).replace('CELEBRATE WITH','Celebrate with');};

/* ---------- draft ---------- */
draftRowHTML=function(h){
  var hasCue=!!h.cue;
  return '<article data-hid="'+h.id+'" class="hx-card is-draft"><div class="hx-head-row">'+
    '<button type="button" class="hx-check open draft" onclick="startHabitEdit(\''+h.id+'\',\'cue\')" aria-label="Add a cue to start: '+esc(h.title)+'" title="Add a cue first — a habit needs one to start">'+I.check+'</button>'+
    '<div class="hx-body"><div class="hx-titlerow"><h3 class="hx-name" aria-label="'+esc(h.title)+'"><span class="hx-name-t editable" role="button" tabindex="0" onclick="startHabitEdit(\''+h.id+'\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();startHabitEdit(\''+h.id+'\');}">'+esc(h.title)+'</span></h3><span class="hx-freq dashed">Draft</span></div>'+
    '<p class="hx-draft-note">'+(hasCue?esc(habitCueLine(h).replace('↳ ',''))+' — ready when you are':'No cue yet. Drafts have no streak and don’t use one of your '+HABIT_MAX+' slots.')+'</p></div>'+
    '<div class="hx-tools"><button type="button" class="hx-go" onclick="'+(hasCue?'activateHabitDraft(\''+h.id+'\')':'startHabitEdit(\''+h.id+'\',\'cue\')')+'">'+(hasCue?'Start habit':'Add a cue')+'</button>'+
    '<button type="button" class="hx-tool icon" onclick="deleteHabit(\''+h.id+'\')" title="Delete draft" aria-label="Delete draft">'+ico('x','x')+'</button></div></div></article>';
};
draftsSection=function(){
  var d=habits.filter(function(h){return h.draft;});
  if(!d.length)return '';
  return '<div class="hb-slot-hd hx-slot"><span class="hx-slot-i">'+ico('clock','clock')+'</span>Drafts<em>need a cue to start</em></div>'+d.map(function(h){return rowHTML(h,false);}).join('');
};

/* ---------- editor: sentence case + delete lives here ---------- */
var _ed=editorHTML;
editorHTML=function(){
  var h=_ed(),id=_habitEdit&&_habitEdit.id;
  h=h.replace('>TRIGGER <','>Trigger <').replace('>WHEN IT GETS HARD <','>When it gets hard <')
     .replace('>CANCEL<','>Cancel<').replace('>SAVE<','>Save habit<')
     .replace('<span class="wk-habit-ed-spacer"></span>','<button type="button" class="hx-del" onclick="hxDelete(this,\''+id+'\')">Delete habit</button><span class="wk-habit-ed-spacer"></span>');
  return h;
};
window.hxDelete=function(btn,id){
  if(btn.dataset.armed){deleteHabit(id);return;}
  btn.dataset.armed='1';btn.classList.add('armed');btn.textContent='Delete for good?';
  setTimeout(function(){if(btn.isConnected){delete btn.dataset.armed;btn.classList.remove('armed');btn.textContent='Delete habit';}},3200);
};

/* ---------- hero: segmented ring + 7-day rail ---------- */
var _prevDone=null;
function liveHabits(){return habits.filter(function(h){return !h.draft;});}
function segState(h,today){
  var st=dayStateOf(h,today);
  if(st==='observed')return 'done';
  if(st==='confirmed-rest')return 'rest';
  if(isWeekly(h)){var s=habitWeekStats(h,calWeekStart(bocNow()));if(s.met||s.bridged)return 'met';}
  return 'open';
}
function ringHTML(sum){
  var list=liveHabits(),n=list.length||1,today=isoDate(bocNow());
  var size=124,sw=10,r=(size-sw)/2-2,C=2*Math.PI*r;
  var gap=n===1?0:sw+5,seg=Math.max(2,C/n-gap);
  var now={},arcs='';
  list.forEach(function(h,i){
    var s=segState(h,today);now[h.id]=s==='done';
    var fresh=_prevDone&&now[h.id]&&!_prevDone[h.id];
    arcs+='<circle class="hx-arc '+s+(fresh?' fresh':'')+'" cx="'+size/2+'" cy="'+size/2+'" r="'+r.toFixed(2)+'" fill="none" stroke-width="'+sw+'" stroke-linecap="round" '+
      'stroke-dasharray="'+seg.toFixed(2)+' '+(C-seg).toFixed(2)+'" stroke-dashoffset="'+(-(i*(seg+gap))-gap/2).toFixed(2)+'" transform="rotate(-90 '+size/2+' '+size/2+')" style="--seg:'+seg.toFixed(2)+'"/>';
  });
  _prevDone=now;
  var all=sum.due>0&&sum.done===sum.due;
  var center=sum.due===0
    ?'<span class="hx-ring-moon">'+ico('moon','rest')+'</span>'
    :all?'<span class="hx-ring-ok">'+I.check+'</span>'
    :'<b class="hx-ring-n">'+sum.done+'</b><span class="hx-ring-of">of '+sum.due+'</span>';
  return '<div class="hx-ring'+(all?' all':'')+'"><svg viewBox="0 0 '+size+' '+size+'" aria-hidden="true">'+arcs+'</svg><div class="hx-ring-c">'+center+'</div></div>';
}
function railHTML(){
  var list=liveHabits(),today=isoDate(bocNow());
  return '<ol class="hx-rail" aria-label="This past week, all habits">'+lastDays(7).map(function(iso){
    var due=0,done=0;
    list.forEach(function(h){
      if(iso<h.startDateISO)return;
      var st=dayStateOf(h,iso);
      if(st==='confirmed-rest')return;
      if(isWeekly(h)){if(st==='observed'){due++;done++;}return;}
      due++;if(st==='observed')done++;
    });
    var isToday=iso===today,pct=due?done/due:0;
    var r=11,C=2*Math.PI*r;
    var cls=(due&&done===due?'full':done?'part':'none')+(isToday?' is-today':'');
    var tip=isoWd(iso,'long')+(isToday?' (today)':'')+(due?': '+done+' of '+due+' done':': nothing due');
    return '<li class="hx-rd '+cls+'" title="'+esc(tip)+'" aria-label="'+esc(tip)+'"><i>'+isoWd(iso)+'</i>'+
      '<svg viewBox="0 0 28 28" aria-hidden="true"><circle class="t" cx="14" cy="14" r="'+r+'" fill="none" stroke-width="3.5"/>'+
      (done?'<circle class="f" cx="14" cy="14" r="'+r+'" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="'+(C*pct).toFixed(2)+' '+C.toFixed(2)+'" transform="rotate(-90 14 14)"/>':'')+
      (due&&done===due?'<path class="k" d="M9.5 14.2l3 3 6-6.4" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>':'')+
      '</svg></li>';
  }).join('')+'</ol>';
}
function heroHTML(sum){
  var left=sum.due-sum.done,anyTiny=habits.some(function(h){return h.tiny&&!h.draft&&dayStateOf(h,isoDate(bocNow()))!=='observed';});
  var hd,sub;
  if(sum.due===0){hd='Resting today';sub='Your streaks are safe.';}
  else if(left<=0){hd='All done for today';sub='Every rep is a vote for who you’re becoming.';}
  else{hd=left+' to go';sub=anyTiny?'Low on energy? A tiny version still counts.':'One small rep at a time.';}
  return '<div class="hx-hero-in">'+ringHTML(sum)+'<div class="hx-hero-r"><h2 class="hx-hero-h">'+hd+'</h2><p class="hx-hero-p">'+sub+'</p>'+railHTML()+'</div></div>';
}

/* ---------- starters ---------- */
starterChips=function(){
  var idx=HABIT_STARTERS.map(function(s,i){return i;}).filter(function(i){return !habits.some(function(h){return h.title===HABIT_STARTERS[i].title;});}).slice(0,4);
  if(!idx.length||activeHabitCount()>=HABIT_MAX)return '';
  return '<section class="hx-ideas" aria-labelledby="hx-ideas-h"><h2 class="hx-sec-h" id="hx-ideas-h">Start with an idea</h2>'+
    '<p class="hx-sec-p">Each one comes with a cue and a tiny version. Edit anything after you add it.</p>'+
    '<div class="hx-idea-grid">'+idx.map(function(i){
      var s=HABIT_STARTERS[i];
      return '<button type="button" class="hb-starter hx-idea" onclick="addHabitStarter('+i+')" title="'+esc(habitCueLine(s))+'">'+
        '<span class="hx-idea-plus">'+I.plus+'</span><span class="hx-idea-t">'+esc(s.title)+'</span>'+
        '<span class="hx-idea-c">'+esc(habitCueLine(s).replace('↳ ',''))+'</span></button>';
    }).join('')+'</div></section>';
};

/* ---------- keep keyboard focus across re-renders ---------- */
function focusKey(ae){
  if(!ae||!ae.closest||ae===document.body)return null;
  var scope=ae.closest('#view-habits,#focus-habits-panel'),card=ae.closest('[data-hid]');
  if(!scope||!card)return null;
  var cls=String(ae.className||'').split(' ')[0];if(!cls)return null;
  return {scope:scope.id,hid:card.getAttribute('data-hid'),cls:cls,i:[].indexOf.call(card.querySelectorAll('.'+cls),ae)};
}
function restoreFocus(k){
  if(!k)return;
  var scope=document.getElementById(k.scope);if(!scope)return;
  var card=scope.querySelector('[data-hid="'+k.hid+'"]');if(!card)return;
  var same=card.querySelectorAll('.'+k.cls),el=same[k.i]||same[0];
  if(el&&el.focus)el.focus({preventScroll:true});
}

/* ---------- page render ---------- */
renderHabits=function(){
  var _fk=focusKey(document.activeElement);
  syncEnabled();
  renderFocusHabits();
  var list=$('hb-list');if(!list)return;
  var view=$('view-habits'),onTab=view&&view.classList.contains('active');
  if(habitsEnabled()&&onTab)showHabitsIntro();
  var ae=document.activeElement;
  var focusId=(_habitEdit&&ae&&list.contains(ae)&&ae.id)?ae.id:null;
  var selFrom=focusId&&ae.selectionStart!=null&&ae.type!=='select-one'?ae.selectionStart:null;
  var selTo=focusId&&ae.selectionEnd!=null&&ae.type!=='select-one'?ae.selectionEnd:null;

  var sum=todaySummary(),sumEl=$('hb-summary'),has=liveHabits().length>0;
  if(sumEl){sumEl.style.display=has?'block':'none';sumEl.innerHTML=has?heroHTML(sum):'';sumEl.classList.toggle('all-done',has&&sum.due>0&&sum.done===sum.due);}
  var sub=$('hb-sub');
  if(sub)sub.textContent=bocNow().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

  if(!habits.length){
    list.innerHTML='<div class="hx-empty"><h2 class="hx-empty-h">Every habit starts with a cue</h2>'+
      '<p class="hx-empty-q"><span>After I</span> pour my coffee, <span>I</span> stretch for one minute.</p>'+
      '<p class="hx-empty-p">Pick something you already do and attach one small action to it. Start with a single habit. Small and honest beats ambitious and abandoned.</p>'+
      '<button type="button" class="hx-new big" onclick="openHabitBuilder()">'+I.plus+'<span>Build your first habit</span></button></div>';
  }else{
    var groups=HABIT_SLOTS.map(function(s){return{s:s,items:habits.filter(function(h){return !h.draft&&slotOf(h)===s.k;})};}).filter(function(g){return g.items.length;});
    var heads=groups.length>1||(groups.length===1&&groups[0].s.k!=='anytime');
    list.innerHTML=groups.map(function(g){
      return '<div class="hx-group">'+(heads?'<div class="hb-slot-hd hx-slot"><span class="hx-slot-i">'+g.s.ico+'</span>'+g.s.label+'</div>':'')+g.items.map(function(h){return rowHTML(h,false);}).join('')+'</div>';
    }).join('')+draftsSection();
  }

  var insights=habitInsights(),insEl=$('hb-insights');
  if(insEl){
    insEl.style.display=insights.length?'block':'none';
    insEl.innerHTML=insights.length?'<h2 class="hx-sec-h">What your data says</h2><p class="hx-sec-p">Patterns from the last 4 weeks.</p>'+
      insights.map(function(i){return '<div class="hb-insight hx-insight"><span class="hx-insight-i">'+i.ico+'</span><span>'+esc(i.txt)+'</span></div>';}).join(''):'';
  }

  var n=activeHabitCount(),full=n>=HABIT_MAX;
  var add=$('hb-add-row');if(add)add.style.display=(full||!habits.length)?'none':'';
  var capEl=$('hb-cap');
  if(capEl){
    var pips='';for(var k=0;k<HABIT_MAX;k++)pips+='<i class="'+(k<n?'on':'')+'"></i>';
    capEl.innerHTML=has?'<span class="hx-pips" aria-hidden="true">'+pips+'</span><span>'+n+' of '+HABIT_MAX+' habit slots'+(full?' used. Master these before adding more.':' used')+'</span>':'';
    capEl.className='hb-cap hx-slots';
  }
  var st=$('hb-starters-mount');if(st)st.innerHTML=starterChips();

  if(focusId){
    var el=$(focusId);
    if(el){el.focus();if(selFrom!=null&&el.setSelectionRange){try{el.setSelectionRange(selFrom,selTo);}catch(_){}}}
  }else if(_fk&&(!document.activeElement||document.activeElement===document.body))restoreFocus(_fk);
};

/* focus-panel list: same cards, compact */
var _rf=renderFocusHabits;
renderFocusHabits=function(){
  var mount=$('focus-habits-mount');if(!mount)return _rf();
  var live=liveHabits();
  if(!live.length){
    mount.innerHTML='<p class="hx-focus-empty">No habits yet.</p><button type="button" class="hx-new wide" onclick="closeFocusHabits();showView(\'habits\')">Set up habits</button>';
    return;
  }
  var sum=todaySummary();
  mount.innerHTML='<div class="hx-focus-sum">'+esc(sum.due===0?'Resting today':sum.done+' of '+sum.due+' done')+'</div>'+
    live.map(function(h){return rowHTML(h,true);}).join('')+
    '<button type="button" class="hx-new ghost wide" onclick="closeFocusHabits();showView(\'habits\')">Edit habits</button>';
};

/* ---------- day strip: one tab stop per strip, arrow keys move inside it ---------- */
function rove(){
  [].forEach.call(document.querySelectorAll('.hx-strip'),function(st){
    var cells=[].slice.call(st.querySelectorAll('.hx-d.is-edit'));if(!cells.length)return;
    var cur=cells.filter(function(c){return c===document.activeElement;})[0]||cells[cells.length-1];
    cells.forEach(function(c){c.setAttribute('tabindex',c===cur?'0':'-1');});
  });
}
var _rh=renderHabits;
renderHabits=function(){var r=_rh.apply(this,arguments);rove();return r;};
document.addEventListener('focusin',function(ev){
  var t=ev.target;if(t&&t.matches&&t.matches('.hx-d.is-edit')){
    [].forEach.call(t.parentNode.querySelectorAll('.hx-d.is-edit'),function(c){c.setAttribute('tabindex',c===t?'0':'-1');});
  }
});
document.addEventListener('keydown',function(ev){
  var t=ev.target;if(!t||!t.matches||!t.matches('.hx-d.is-edit'))return;
  var k=ev.key;if(k!=='ArrowLeft'&&k!=='ArrowRight'&&k!=='Home'&&k!=='End')return;
  var cells=[].slice.call(t.parentNode.querySelectorAll('.hx-d.is-edit')),i=cells.indexOf(t);
  var n=k==='Home'?0:k==='End'?cells.length-1:Math.max(0,Math.min(cells.length-1,i+(k==='ArrowRight'?1:-1)));
  ev.preventDefault();if(cells[n])cells[n].focus();
});

/* ---------- history modal: dialog behaviour + newest data in view ---------- */
(function(){
  var ov=document.getElementById('habit-history-overlay');
  if(!ov||typeof openHabitHistory!=='function'||typeof closeHabitHistory!=='function')return;
  var modal=ov.querySelector('.hh-modal'),opener=null,openerKey=null;
  if(modal){modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','hh-title');}
  function toLatest(){
    ['.hh-heatmap-scroll','.hh-monthly-row'].forEach(function(sel){
      var e=ov.querySelector(sel);if(e)e.scrollLeft=e.scrollWidth;
    });
  }
  var _open=openHabitHistory;
  openHabitHistory=function(id){
    opener=document.activeElement;openerKey=focusKey(opener);
    _open.apply(this,arguments);
    toLatest();
    var c=ov.querySelector('.hh-close');if(c)c.focus({preventScroll:true});
  };
  if(typeof setHabitHistRange==='function'){
    var _rng=setHabitHistRange;
    setHabitHistRange=function(){_rng.apply(this,arguments);toLatest();};
  }
  var _close=closeHabitHistory;
  closeHabitHistory=function(){
    var was=ov.classList.contains('open');
    _close.apply(this,arguments);
    if(!was)return;
    if(opener&&document.body.contains(opener)&&opener.focus)opener.focus({preventScroll:true});
    else restoreFocus(openerKey);
    opener=null;openerKey=null;
  };
  document.addEventListener('keydown',function(ev){
    if(!ov.classList.contains('open'))return;
    if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();closeHabitHistory();return;}
    if(ev.key!=='Tab'||!modal)return;
    var f=[].filter.call(modal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'),function(e){return e.offsetParent!==null&&!e.disabled;});
    if(!f.length)return;
    var first=f[0],last=f[f.length-1];
    if(!modal.contains(document.activeElement)){ev.preventDefault();first.focus();}
    else if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus();}
    else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}
  },true);
})();

/* first paint with the new components */
try{renderHabits();}catch(e){reportError(e);}
})();
