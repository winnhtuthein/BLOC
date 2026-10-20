/* Core: config, helpers, one shared confirm dialog, overlay keyboard rules. */
(function(){
'use strict';
var Acct=window.BLOC_ACCT={};

/* ── CONFIG: edit these before you ship ──────────────────────────────────────────────
   contactEmail  Shown in both legal documents. Privacy rights and deletion requests go here.
   operator      Your name or business name. Left empty, the text says "an independent developer".
   governingLaw  e.g. "England and Wales" or "the State of California, USA". Empty = neutral wording.        */
Acct.CONFIG={
  version:'1.10.0',
  released:'2026-10-18',
  legal:{operator:'',contactEmail:'getzenflow.support@gmail.com',governingLaw:'',effective:'2026-10-18',docVersion:'2.1'}
};

var $=Acct.$=function(id){return document.getElementById(id);};
Acct.esc=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
Acct.get=function(k,d){try{var v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}};
Acct.set=function(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}};
Acct.toast=function(m){if(typeof showToast==='function')showToast(m);};
Acct.iso2date=function(iso){var p=String(iso).split('-');return new Date(Date.UTC(+p[0],+p[1]-1,+p[2]));};
Acct.fmtDate=function(iso){return Acct.iso2date(iso).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});};
Acct.fmtDateLong=function(iso){return Acct.iso2date(iso).toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});};
Acct.cmp=function(a,b){var x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);for(var i=0;i<3;i++){var d=(x[i]||0)-(y[i]||0);if(d)return d>0?1:-1;}return 0;};

/* run fn once cond() is truthy; polls briefly because other layers build the header lazily */
Acct.when=function(cond,fn,tries){
  var n=0,max=tries||60;
  (function tick(){var ok=false;try{ok=cond();}catch(e){}if(ok)fn();else if(++n<max)setTimeout(tick,150);})();
};

/* focus helpers */
Acct.focusables=function(root){
  return [].slice.call(root.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled):not([type=hidden]),textarea:not(:disabled),select:not(:disabled),summary,[tabindex]:not([tabindex="-1"])'))
    .filter(function(e){return e.getClientRects().length&&!e.closest('[hidden]');});
};
var returnFocus={};
Acct.remember=function(key){returnFocus[key]=document.activeElement;};
Acct.restore=function(key){var f=returnFocus[key];returnFocus[key]=null;if(f&&f.focus&&document.contains(f)){try{f.focus({preventScroll:true});}catch(e){}}};

/* ── Confirm dialog (promise based; optional typed phrase) ───────────────────────── */
var cf=null;
function buildConfirm(){
  var o=document.createElement('div');o.id='dlg-confirm';o.className='dlg-ov';
  o.innerHTML='<div class="dlg-sheet" role="alertdialog" aria-modal="true" aria-labelledby="dlg-cf-t" aria-describedby="dlg-cf-b">'
    +'<div class="dlg-sheet-h"><div class="dlg-h" id="dlg-cf-t"></div></div>'
    +'<div class="dlg-sheet-b"><div id="dlg-cf-b"></div>'
    +'<div id="dlg-cf-typed" hidden style="margin-top:14px"><label for="dlg-cf-in" class="dlg-eyebrow" id="dlg-cf-lbl" style="display:block;margin-bottom:6px"></label>'
    +'<div class="dlg-field" style="margin:0"><input id="dlg-cf-in" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false"></div></div></div>'
    +'<div class="dlg-sheet-f"><button type="button" class="dlg-btn" id="dlg-cf-no">Cancel</button><button type="button" class="dlg-btn pri" id="dlg-cf-yes">OK</button></div></div>';
  document.body.appendChild(o);
  cf={el:o,t:$('dlg-cf-t'),b:$('dlg-cf-b'),typed:$('dlg-cf-typed'),lbl:$('dlg-cf-lbl'),inp:$('dlg-cf-in'),no:$('dlg-cf-no'),yes:$('dlg-cf-yes'),done:null};
  cf.no.onclick=function(){finish(false);};
  cf.yes.onclick=function(){if(!cf.yes.disabled)finish(true);};
  cf.inp.addEventListener('input',function(){cf.yes.disabled=cf.inp.value.trim().toUpperCase()!==cf.need;});
  cf.inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&!cf.yes.disabled){e.preventDefault();finish(true);}});
  o.addEventListener('mousedown',function(e){if(e.target===o)finish(false);});
}
function finish(v){
  if(!cf||!cf.done)return;
  var d=cf.done;cf.done=null;cf.el.classList.remove('open');Acct.restore('confirm');d(v);
}
/* o: {title, html, confirm, cancel, danger, typed} → Promise<boolean> */
Acct.confirm=function(o){
  if(!cf)buildConfirm();
  if(cf.done)finish(false);
  return new Promise(function(resolve){
    Acct.remember('confirm');
    cf.done=resolve;
    cf.t.textContent=o.title||'Are you sure?';
    cf.b.innerHTML=o.html||'';
    cf.yes.textContent=o.confirm||'OK';
    cf.no.textContent=o.cancel||'Cancel';
    cf.yes.className='dlg-btn pri'+(o.danger?' danger':'');
    cf.need=o.typed?String(o.typed).toUpperCase():'';
    cf.typed.hidden=!o.typed;cf.inp.value='';
    if(o.typed){cf.lbl.textContent='Type '+o.typed+' to confirm';cf.yes.disabled=true;}else cf.yes.disabled=false;
    cf.el.classList.add('open');
    setTimeout(function(){(o.typed?cf.inp:cf.no).focus();},30);
  });
};

/* ── Keyboard rules for every v5 overlay (and the two it replaces) ───────────────────
   Escape closes the top-most one only; Tab is trapped; single-key app shortcuts (g, q, n…) are muted. */
var STACK=[
  {id:'dlg-confirm',close:function(){finish(false);},box:'.dlg-sheet'},
  {id:'dlg-hist-ov',close:function(){if(Acct.closeHistory)Acct.closeHistory();},box:'.dlg-sheet'},
  {id:'legal-overlay',close:function(){if(window.closeLegal)window.closeLegal();},box:'.lg-modal'},
  {id:'acct-overlay',close:function(){if(window.closeAuthModal)window.closeAuthModal();},box:'.acct-modal'}
];
Acct.topOverlay=function(){
  for(var i=0;i<STACK.length;i++){var el=$(STACK[i].id);if(el&&el.classList.contains('open'))return {def:STACK[i],el:el};}
  return null;
};
document.addEventListener('keydown',function(e){
  var top=Acct.topOverlay();if(!top)return;
  var t=e.target,inField=t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable);
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();top.def.close();return;}
  if(e.key==='Tab'){
    var box=top.el.querySelector(top.def.box)||top.el,f=Acct.focusables(box);
    if(!f.length){e.preventDefault();return;}
    var a=document.activeElement,first=f[0],last=f[f.length-1];
    if(!box.contains(a)){e.preventDefault();first.focus();}
    else if(e.shiftKey&&a===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&a===last){e.preventDefault();first.focus();}
    return;
  }
  if(!inField&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key&&e.key.length===1)e.stopPropagation();
},true);
})();

/* Releases: version history, the What's new card, and the "see all changes" sheet.

   HOW TO EDIT: RELEASES is the single source of truth. Newest first. To ship a release, add an entry at the top
   and bump CONFIG.version/released in dlg-core.js. The card shows every release newer than the one a person last saw.

   ABOUT THE DATES: the cadence below models a part-time solo developer (about 10 to 15 hours a week, no releases
   over the holidays, small fixes landing within days of a feature). Gaps are sized to the work:
     patch fix ........ 1 to 4 days after the release it fixes
     small feature .... 2.5 to 3.5 weeks
     large feature .... 5 to 8 weeks (calendar, notes, library + AI, backend + sync)
   Entries before 1.9.0 are reconstructed from what the app contains. Replace dates and wording with your real
   commit history where you have it. */
(function(){
'use strict';
var Acct=window.BLOC_ACCT,$=Acct.$,esc=Acct.esc;

var RELEASES=[
 {v:'1.10.0',d:'2026-10-18',title:'Meet Wojak, and a tidier focus setup',
  hi:['The Consultant is now Wojak: friendlier, and not strict all the time','Wojak is on by default for new users, with a Listen button that only speaks when you tap it','Optional local AI through Ollama, off by default','A cleaner Focus setup, especially the Pomodoro options'],
  items:[
   ['improved','The Consultant is now called Wojak. Same coaching, same private chat history, same Gemini key, with a more relaxed voice.'],
   ['improved','Wojak reads your mood: it coaches when you are stuck, keeps it light when you just need a minute, and tells you to rest when you are burnt out. Everyday asks (what to cook, a quick message) just get answered.'],
   ['new','Local AI (Settings → Wojak local AI). Uses Ollama on your own computer, so questions never leave your device. If it does not answer, Wojak falls back to your Gemini key. Off by default.'],
   ['new','Wojak can check your open tasks, your streak and the Library while answering, instead of guessing.'],
   ['new','Voice-over (Settings → Wojak voice-over): a Listen button under replies. It is on by default but never speaks unless you tap it, at a normal speaking pace. The voice picker prefers natural voices on your device.'],
   ['new','Wojak is on by default for new users, including in Calm view, so help is always one tap away.'],
   ['improved','Wojak’s humour is lighter and reads the room: a dry joke when the mood is relaxed, straight and kind when you are stressed or want it serious, and it drops the jokes if you do not enjoy them.'],
   ['improved','Focus setup: Pomodoro presets, the Classic and Custom switch, number fields and the time summary now share one layout. The summary shows total, focus time and the time you will finish.']]},
 {v:'1.9.0',d:'2026-09-22',title:'Profile, safer sign-in, clearer legal pages',
  hi:['A Profile page: your name, avatar colour, sync status and your own numbers','Sign-in and sign-up rebuilt, with a password check and clear errors','The guided tour is now an offer on first launch, and it stops when a tab’s tour ends'],
  items:[
   ['new','Profile page (More → Profile): display name, avatar colour, what the Consultant knows about you, sync and storage status, lifetime totals, and data tools.'],
   ['new','Erase everything on this device. It asks you to export first and needs a typed confirmation.'],
   ['new','Version history, and this What’s new notice for returning users.'],
   ['improved','Privacy Policy and Terms of Use rewritten in full: a plain summary, a table of what is stored where, retention, your rights, and a dated change history. You can download a copy.'],
   ['improved','Sign in and Create account: show/hide password, Caps Lock warning, password strength check, confirm password, consent at sign-up, clearer errors, and full keyboard and screen-reader support.'],
   ['improved','First launch: new users get a small, dismissible offer to take the tour instead of nothing at all. Say “not now” and it never comes back on its own.'],
   ['fixed','The tour no longer jumps to the next tab’s tour by itself when a tab’s tour ends. “Tour next tab” is now a button you choose.'],
   ['fixed','New users never saw the tour at all: a startup script marked it as already seen.']]},
 {v:'1.8.1',d:'2026-09-04',title:'Habits follow-up',
  items:[
   ['fixed','Habits: editing a habit right after logging it could drop the “tiny version” mark.'],
   ['fixed','Habits: the shield count on narrow screens overlapped the streak number.'],
   ['improved','Habit starter ideas now hide once you have five habits.']]},
 {v:'1.8.0',d:'2026-09-01',title:'Habits, redesigned',
  hi:['Every habit gets a cue, a tiny version and a plan for hard days','Streak shields forgive a missed day','Insights show which weekdays slip'],
  items:[
   ['new','Habit builder: trigger (“after I…”), tiny version, hard-day if-then plan, identity and celebration, in about 30 seconds.'],
   ['new','Streak shields: every 7 days in a row earns a shield (up to 2) that covers one missed day.'],
   ['new','Starter ideas and a short “how to make these stick” guide on the Habits tab.'],
   ['improved','Habits tab rebuilt: today’s list first, then insights. Weekly dots can be corrected for earlier days.']]},
 {v:'1.7.1',d:'2026-08-08',title:'Navigation fixes',
  items:[
   ['fixed','Phone: the More sheet could stay open after you switched tab.'],
   ['fixed','Calm mode hid the Add button on very narrow screens.']]},
 {v:'1.7.0',d:'2026-08-04',title:'A calmer header',
  hi:['One Add button and one More menu replace a row of icons','Phone navigation: four tabs plus a More sheet','Calm mode shows only what you need today'],
  items:[
   ['improved','Header reduced to the logo and streak, the tabs, Add, and a More menu that holds the rest.'],
   ['improved','Phone navigation shows Tasks, Focus, Calendar and Habits, with the other tabs under More.'],
   ['improved','Plainer wording across the app (for example “day focus streak”).'],
   ['improved','Calm and Full view modes can be switched from More.']]},
 {v:'1.6.0',d:'2026-07-14',title:'Habits, goals and a guided tour',
  items:[
   ['new','Habits tab with daily and weekly habits and a streak for each.'],
   ['new','Goals (epics) and weekly outcomes on the Weekly tab.'],
   ['new','Guided tour for each tab, opened with G or from the menu.'],
   ['improved','Per-tab settings: switch Habits, Goals and Weekly planning on or off.']]},
 {v:'1.5.2',d:'2026-06-23',title:'Sync conflicts',
  items:[
   ['new','When two devices changed the same item, you now choose which version to keep.'],
   ['fixed','A sync could stall if one entry was larger than the server accepts. It is now skipped and reported.']]},
 {v:'1.5.1',d:'2026-06-06',title:'Sign-in follow-up',
  items:[
   ['fixed','You were asked to sign in again every hour. The session now renews in the background.'],
   ['improved','The first sign-in explains that the server can take up to a minute to wake up.']]},
 {v:'1.5.0',d:'2026-06-02',title:'Accounts and cloud sync',
  hi:['Optional account to back up and use BLOC on more than one device','Full sync across devices, or automatic overflow when browser storage fills up'],
  items:[
   ['new','Optional account (email and password). Without one, everything stays in your browser as before.'],
   ['new','Full sync: tasks, habits, notes and calendar stay in step on every device you sign in on.'],
   ['new','Storage overflow: when browser storage passes 80%, data you have not touched for a week moves to a cloud archive and can be restored.'],
   ['new','Privacy Policy and Terms of Use.']]},
 {v:'1.4.2',d:'2026-04-14',title:'Consultant polish',
  items:[
   ['fixed','Consultant replies could be cut off mid-sentence on long answers.'],
   ['improved','Saved guides from the Consultant now appear under My Saved Guides in the Library.']]},
 {v:'1.4.1',d:'2026-04-02',title:'Hotfix',
  items:[
   ['fixed','Consultant showed a blank panel when no AI key was set. It now explains how to add one.'],
   ['improved','A second, backup key is used automatically if the first hits its limit.']]},
 {v:'1.4.0',d:'2026-03-31',title:'Library and the Consultant',
  hi:['Short reads for when you are stuck','An AI Consultant that uses your own Gemini key'],
  items:[
   ['new','Library: short reads by topic and a shelf of recommended books, with your own books and notes.'],
   ['new','Consultant: ask what you are struggling with and get a coaching reply based on your tasks. Runs on your own Gemini key, stored only in your browser.'],
   ['new','Optional spoken replies (browser voice, or OpenAI voice with your own key).'],
   ['new','Rulebook: a short explanation of how the A to E priorities work.']]},
 {v:'1.3.0',d:'2026-02-10',title:'Weekly review',
  items:[
   ['new','Weekly tab: review last week, set outcomes for the next one, and compare against your available hours.'],
   ['new','Daily plan target and reflections after each focus block.'],
   ['improved','Pomodoro presets you can save and reorder.']]},
 {v:'1.2.1',d:'2026-01-09',title:'Backup fix',
  items:[
   ['fixed','Importing a backup made before Notes existed no longer shows an error.']]},
 {v:'1.2.0',d:'2026-01-06',title:'Notes and backups',
  items:[
   ['new','Notes with folders, linked to tasks and events.'],
   ['new','Full backup and restore as a JSON file, plus export to text and calendar (.ics).'],
   ['improved','Choose your time zone instead of relying on the device clock.']]},
 {v:'1.1.1',d:'2025-11-21',title:'Calendar fix',
  items:[
   ['fixed','All-day events appeared one day early in some time zones.']]},
 {v:'1.1.0',d:'2025-11-18',title:'Calendar',
  items:[
   ['new','Calendar with day, week and month views. Put tasks on a day and time.'],
   ['new','Reminders while BLOC is open (asks for notification permission first).'],
   ['improved','Rest days keep your streak alive when you confirm them.']]},
 {v:'1.0.1',d:'2025-11-01',title:'First fixes',
  items:[
   ['fixed','The focus timer drifted when the tab was in the background.'],
   ['fixed','Tasks did not roll over to the new day after midnight until you reloaded.']]},
 {v:'1.0.0',d:'2025-10-28',title:'First release',
  items:[
   ['new','Tasks sorted into A to E priorities (at most three A tasks a day).'],
   ['new','Focus timer with a session log and a day streak.'],
   ['new','Everything stored in your browser. No account needed.']]}
];
Acct.RELEASES=RELEASES;
Acct.latest=RELEASES[0];

var SEEN='yb_app_version_seen_v1';
var seenVer=function(){return Acct.get(SEEN,null);};
var markSeen=function(v){Acct.set(SEEN,v||Acct.CONFIG.version);};

/* ── Version history sheet ───────────────────────────────────────────────────────── */
var hist=null,filter='all';
function relLabel(r,i){
  if(r.v===Acct.CONFIG.version)return '<span class="dlg-chip amber">Current</span>';
  return '';
}
function renderHist(){
  var historyBody=$('vh-body');if(!historyBody)return;
  var openN=0,html='';
  RELEASES.forEach(function(r,i){
    var items=r.items.filter(function(it){return filter==='all'||it[0]!=='fixed';});
    if(!items.length)return;
    var patch=!/\.0$/.test(r.v),cur=r.v===Acct.CONFIG.version;
    var open=cur||(!patch&&openN<2)?' open':'';
    if(open&&!cur)openN++;
    html+='<details class="vh-rel'+(cur?' cur':'')+(patch?' patch':'')+'"'+open+'><summary>'
      +'<span class="vh-caret" aria-hidden="true">▸</span><span class="vh-v">v'+esc(r.v)+'</span>'
      +'<span class="vh-ttl">'+esc(r.title)+'</span>'+relLabel(r,i)
      +'<time class="vh-date" datetime="'+r.d+'">'+esc(Acct.fmtDate(r.d))+'</time></summary>'
      +'<ul class="vh-list">'+items.map(function(it){return '<li><span class="vh-tag '+it[0]+'">'+it[0]+'</span><span>'+esc(it[1])+'</span></li>';}).join('')+'</ul></details>';
  });
  historyBody.innerHTML=html||'<div class="vh-empty">Nothing to show.</div>';
}
function buildHist(){
  var o=document.createElement('div');o.id='dlg-hist-ov';o.className='dlg-ov vh';
  o.innerHTML='<div class="dlg-sheet vh-modal" role="dialog" aria-modal="true" aria-labelledby="vh-title">'
    +'<div class="dlg-sheet-h"><div><div class="dlg-h" id="vh-title">VERSION HISTORY</div><div class="dlg-eyebrow" id="vh-sub" style="margin-top:4px"></div></div><button type="button" class="dlg-x" id="vh-x" aria-label="Close version history">✕</button></div>'
    +'<div class="vh-tools"><div class="dlg-seg" role="group" aria-label="Filter changes"><button type="button" data-f="all" aria-pressed="true">All changes</button><button type="button" data-f="feat" aria-pressed="false">No bug fixes</button></div><span class="vh-sp"></span><button type="button" class="dlg-btn" id="vh-exp">Expand all</button></div>'
    +'<div class="vh-body" id="vh-body" tabindex="0"></div>'
    +'<div class="dlg-sheet-f" style="justify-content:space-between;align-items:center"><span class="dlg-eyebrow" style="text-transform:none;letter-spacing:.4px">Dates are release days.</span><span><button type="button" class="dlg-link" data-legal="privacy">Privacy</button> · <button type="button" class="dlg-link" data-legal="terms">Terms</button></span></div></div>';
  document.body.appendChild(o);
  o.addEventListener('mousedown',function(e){if(e.target===o)Acct.closeHistory();});
  $('vh-x').onclick=function(){Acct.closeHistory();};
  o.querySelector('.vh-tools .dlg-seg').addEventListener('click',function(e){
    var b=e.target.closest('button[data-f]');if(!b)return;
    filter=b.dataset.f;[].forEach.call(this.children,function(x){x.setAttribute('aria-pressed',x===b);});renderHist();
  });
  $('vh-exp').onclick=function(){
    var all=[].slice.call(o.querySelectorAll('details.vh-rel')),anyClosed=all.some(function(d){return !d.open;});
    all.forEach(function(d){d.open=anyClosed;});this.textContent=anyClosed?'Collapse all':'Expand all';
  };
  o.addEventListener('click',function(e){var b=e.target.closest('[data-legal]');if(b&&window.openLegal)window.openLegal(b.dataset.legal);});
  hist=o;
}
Acct.openHistory=function(){
  if(!hist)buildHist();
  Acct.remember('hist');
  filter='all';
  $('vh-sub').textContent='You are on v'+Acct.CONFIG.version+' · released '+Acct.fmtDate(Acct.CONFIG.released);
  hist.querySelectorAll('.vh-tools .dlg-seg button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.f==='all');});
  $('vh-exp').textContent='Expand all';
  renderHist();
  hist.classList.add('open');
  $('vh-body').scrollTop=0;
  setTimeout(function(){$('vh-x').focus();},30);
  markSeen();hideCard();
};
Acct.closeHistory=function(){if(!hist)return;hist.classList.remove('open');Acct.restore('hist');};

/* ── What's new card for returning users ─────────────────────────────────────────── */
var card=null;
function hideCard(){if(!card)return;card.classList.remove('show');var c=card;card=null;setTimeout(function(){c.remove();},260);}
function showCard(unseen){
  if(card)return;
  var top=unseen[0],extra=unseen.length-1;
  var bullets=(top.hi||top.items.slice(0,3).map(function(i){return i[1];})).slice(0,3);
  card=document.createElement('section');card.className='dlg-card-pop';card.id='dlg-whatsnew';
  card.setAttribute('role','region');card.setAttribute('aria-label','What’s new in BLOC');card.setAttribute('aria-live','polite');
  card.innerHTML='<button type="button" class="dlg-x x" aria-label="Dismiss what’s new">✕</button>'
    +'<div class="dlg-eyebrow">What’s new · v'+esc(top.v)+' · '+esc(Acct.fmtDate(top.d))+'</div>'
    +'<h2>'+esc(top.title)+'</h2>'
    +'<ul>'+bullets.map(function(b){return '<li>'+esc(b)+'</li>';}).join('')+'</ul>'
    +(extra>0?'<p style="margin-top:-4px;color:var(--muted2);font-size:12px">…and changes from '+extra+' earlier update'+(extra>1?'s':'')+'.</p>':'')
    +'<div class="row"><button type="button" class="dlg-btn pri" data-a="see">See all changes</button><button type="button" class="dlg-btn" data-a="ok">Got it</button></div>';
  document.body.appendChild(card);
  card.addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;
    if(b.dataset.a==='see'){Acct.openHistory();}
    else{markSeen();hideCard();}
  });
  requestAnimationFrame(function(){requestAnimationFrame(function(){if(card)card.classList.add('show');});});
}
function busy(){
  if(Acct.topOverlay&&Acct.topOverlay())return true;
  if(document.querySelector('[id$="overlay"].open,.overlay.open,.side-panel.open,#tour-card'))return true;
  var v=document.querySelector('.view.active');var id=v?v.id:'';
  return id==='view-timer'||id==='view-paused'||document.hidden;
}
/* decide on load: brand-new people get the tour offer instead; everyone else sees what changed */
Acct.maybeWhatsNew=function(){
  var seen=seenVer();
  if(Acct.isNewUser&&Acct.isNewUser()&&!seen){markSeen();return;}   // nothing to catch up on
  var last=seen||'1.8.1';                                         // first run of v5: assume the previous release
  var newer=RELEASES.filter(function(r){return Acct.cmp(r.v,last)>0;});
  var unseen=newer.filter(function(r,i){return i===0||/\.0$/.test(r.v);}).slice(0,3);   // newest, plus any feature releases since
  if(!unseen.length)return;
  var tries=0;
  (function wait(){
    if(!busy()){showCard(unseen);return;}
    if(++tries<80)setTimeout(wait,1500);
  })();
};

/* entry points: More menu, phone sheet, hash link */
window.openVersionHistory=Acct.openHistory;
if(/^#(whats-new|version-history)$/.test(location.hash))Acct.when(function(){return document.readyState==='complete';},Acct.openHistory,40);
})();

/* Legal centre: Privacy Policy and Terms of Use.
   Every factual statement here was checked against what the app actually does (storage keys, the sync engine's
   excluded keys, which hosts the page calls, what the AI features send). If you change the app, change this.
   This text is a careful draft for a small independent product. It is not legal advice; have a lawyer review it
   before you rely on it, especially the retention, liability and governing-law clauses. */
(function(){
'use strict';
var Acct=window.BLOC_ACCT,$=Acct.$,esc=Acct.esc,L=Acct.CONFIG.legal;

var who=L.operator?esc(L.operator):'an independent developer';
var contact=L.contactEmail
  ?'<a href="mailto:'+esc(L.contactEmail)+'">'+esc(L.contactEmail)+'</a>'
  :'the contact address published on the BLOC website';
var law=L.governingLaw
  ?'These terms are governed by the laws of '+esc(L.governingLaw)+', and the courts of that place have jurisdiction over disputes, except that if you are a consumer you keep any right to bring a claim in your home courts that mandatory local law gives you.'
  :'These terms are governed by the laws of the place where the operator is established, without limiting any consumer protection rights that the law of your country of residence gives you and that cannot be waived.';

function table(head,rows){
  return '<div class="lg-tbl-w"><table class="lg-tbl"><thead><tr>'+head.map(function(h){return '<th scope="col">'+h+'</th>';}).join('')+'</tr></thead><tbody>'
    +rows.map(function(r){return '<tr>'+r.map(function(c,i){return i===0?'<th scope="row" style="text-transform:none;letter-spacing:0;font-family:inherit;font-size:13px;color:var(--txt)">'+c+'</th>':'<td>'+c+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';
}

/* ═══════════════ PRIVACY POLICY ═══════════════ */
var PRIVACY={
  key:'privacy',title:'Privacy Policy',short:'Privacy',
  summary:[
    'BLOC works on your device first. Without an account, what you write is never sent to our servers.',
    'An account is optional. It exists so you can back up and sync your data.',
    'AI and voice features stay off until you add your own key. When you use them, your browser talks to Google or OpenAI directly.',
    'Page-view analytics are cookie-free and aggregate. There are no ads and we do not sell your data.',
    'You can export everything, or erase it from your device, whenever you like.'
  ],
  sections:[
    {id:'who',h:'Who this covers',html:
      '<p>BLOC (“we”, “us”) is a personal planning app operated by '+who+'. This policy applies to the BLOC web app and the BLOC sync service together (the “Service”). It does not cover other websites you reach from BLOC, or the AI and font providers described below, which have their own policies.</p>'
      +'<p>For people in the UK and EU, we are the controller of the personal data described here, except for what you store only on your own device, which we never receive.</p>'},
    {id:'data',h:'What we handle, and where it lives',html:
      '<p>The table separates what stays on your device from what can reach us.</p>'
      +table(['Information','Examples','Where it lives','Does it reach us?'],[
        ['Planner content','Tasks, subtasks, notes and folders, calendar events, habits, goals, weekly plans, reflections, focus sessions, streaks, energy log, Library progress and saved guides','Your browser’s local storage','Only if you sign in and either turn on full sync or your browser storage fills up (see “Sync and the cloud archive”)'],
        ['Preferences','Display name, the profile text you write for Wojak, time zone, theme, switches','Your browser’s local storage','No. The settings entry is excluded from sync. It is included in backup files you export yourself'],
        ['AI and voice keys','Your Gemini key, your backup Gemini key, your OpenAI key','Your browser’s local storage','Never. Keys are excluded from sync and are only ever sent to Google or OpenAI when you use that feature'],
        ['Wojak history','Your questions and the replies, and a local AI audit log','Your browser’s local storage, with your planner content','Yes, if sync is on, because it is stored like the rest of your planner content'],
        ['Account','Email address, password, a confirmation email','Supabase (our authentication service)','Yes. This is what you give us when you create an account'],
        ['Sign-in session','Access and refresh tokens that keep you signed in','Your browser’s local storage','The tokens are issued by us and sent back with each sync request'],
        ['Sync copy','Your planner content, as separate key and value entries','Supabase (our database)','Yes, once you sign in and sync (or storage overflow) runs'],
        ['Usage and technical data','Page views, referring page, approximate country, browser, operating system and device type; IP address and request ID in server logs','Our hosting and analytics providers','Yes, in aggregate for analytics; IP addresses appear in standard server logs']
      ])
      +'<p>Short-lived device state, such as a running timer, notification flags and your last open tab, is never uploaded.</p>'},
    {id:'use',h:'How we use it, and why',html:
      '<ul>'
      +'<li><strong>To run the Service</strong>: create your account, sign you in, store and return your synced data (necessary to perform our agreement with you).</li>'
      +'<li><strong>To keep it secure and working</strong>: detect abuse, limit request rates, investigate faults using request IDs (our legitimate interest in a safe service).</li>'
      +'<li><strong>To understand use in aggregate</strong>: count page views and see which countries and devices to support (our legitimate interest in improving BLOC).</li>'
      +'<li><strong>To email you about your account</strong>: such as the sign-up confirmation. We do not send marketing email.</li>'
      +'<li><strong>To meet legal duties</strong>, where the law requires it.</li></ul>'
      +'<p>We do not use your planner content to train AI models, to build advertising profiles, or to make automated decisions about you.</p>'},
    {id:'sync',h:'Sync and the cloud archive',html:
      '<p>Signing in lets BLOC copy your data to our server. There are two behaviours, and you choose between them in Settings:</p>'
      +'<ul><li><strong>Storage overflow (default after sign-in).</strong> Browsers allow only a few megabytes of local storage. When yours passes 80%, BLOC uploads older data and, for entries you have not touched for at least 7 days, moves them to a cloud-only archive and removes the local copy to free space. You can restore archived data from the app.</li>'
      +'<li><strong>Full sync (optional).</strong> Your planner content is kept in step across every device you sign in on.</li></ul>'
      +'<p>Each entry is limited to 512 KB and each request to about 1.4 MB. Entries that are too large are skipped and reported to you. If two devices changed the same entry, BLOC shows both and asks which to keep.</p>'
      +'<p>Signing out does not delete your cloud copy. Deleting or erasing data on a device does not delete your cloud copy either. To remove the cloud copy, see “Your rights and choices”.</p>'},
    {id:'ai',h:'AI and voice features',html:
      '<p>These are optional and run on keys you supply. We never see your keys, your prompts or the replies.</p>'
      +'<h4>Wojak and Weekly Review (Google Gemini)</h4>'
      +'<p>When you send a message, your browser sends it directly to Google’s Gemini API together with context that helps the answer: up to your last 10 earlier messages in that chat (each shortened), the profile text you wrote in Settings, your local time, the number of open tasks and the titles and time estimates of your top A tasks, how many tasks you finished today, your streak, and any audience label you chose in the Library. Do not type anything into these features that you would not want a third party to process.</p>'
      +'<p>What Google does with that request depends on the plan attached to your key. Depending on that plan, Google may retain it and may use it to improve its products. Read the terms for your key at Google AI Studio before you use it.</p>'
      +'<h4>Spoken replies</h4>'
      +'<p>With the default “browser” voice, text is read aloud by your browser’s built-in speech engine, which your browser or operating system vendor may process. If you choose OpenAI voice, the text to be spoken is sent directly to OpenAI’s speech API using your key, and OpenAI’s policies apply.</p>'
      +'<h4>Turning it off</h4>'
      +'<p>Remove the key in Settings and the feature stops sending anything.</p>'},
    {id:'third',h:'Other services the app contacts',html:
      table(['Service','Why','What it receives'],[
        ['Vercel','Hosts the web app and provides Web Analytics','Standard request data (IP address, browser) and page-view analytics. Vercel Web Analytics is designed to work without cookies and does not follow you across sites'],
        ['Render','Hosts the sync API','Your requests to the Service, including your sign-in and any synced data'],
        ['Supabase','Provides account sign-in and the database that stores synced data, on our behalf','Your email address, your password (stored hashed), sign-in sessions and synced entries'],
        ['Google Fonts','Loads the typefaces','Your IP address and browser details when the page loads'],
        ['Open Library','Finds book covers, only if “Real book covers” is on','A book’s title and author. You can switch this off in Settings'],
        ['Google (Gemini) and OpenAI','The optional AI and voice features above','What those features send, as described above']
      ])
      +'<p>Links in BLOC that open other sites (for example Library resources) leave the Service. Those sites set their own rules.</p>'},
    {id:'storage',h:'Local storage and cookies',html:
      '<p>BLOC does not use advertising or cross-site tracking cookies. It stores its data and your sign-in session in your browser’s local storage, under names beginning <code>bloc_</code> and <code>yb_</code>. These are essential to the Service working, so we do not ask for consent to them. Clearing this site’s data in your browser removes them.</p>'
      +'<p>Reminders are created by your browser while BLOC is open and require your permission; BLOC does not send push notifications from a server.</p>'},
    {id:'share',h:'Who we share it with',html:
      '<p>We share data only with the providers listed above, who process it for us to run the Service, and when the law requires it or to protect people from harm. If BLOC were ever transferred to someone else, this policy would continue to apply to your data unless you are told of a change first. We do not sell personal data and we do not share it for cross-context advertising.</p>'},
    {id:'retention',h:'How long we keep it',html:
      '<ul><li><strong>On your device:</strong> until you delete it or clear your browser data.</li>'
      +'<li><strong>Account and sync copy:</strong> for as long as your account exists. When you ask us to delete your account we delete the account and sync copy within 30 days. Copies in provider backups expire on the providers’ normal schedule, which we aim to keep to a further 30 days.</li>'
      +'<li><strong>Server logs:</strong> kept by our hosting providers for a short period for security and fault-finding, then removed.</li>'
      +'<li><strong>Analytics:</strong> aggregate figures, kept as long as they remain useful.</li></ul>'},
    {id:'security',h:'Security',html:
      '<p>Traffic between your browser and the Service uses HTTPS. Passwords are handled by Supabase Authentication and stored in hashed form, never as readable text. Access to the database is limited to the operator.</p>'
      +'<p>Data in your browser’s local storage is not encrypted, so anyone who can use your browser profile can read it. On a shared computer, sign out and use Erase on this device when you finish. No system is perfectly secure. If a breach affects your data we will tell you and the relevant authorities where the law requires. Please report suspected vulnerabilities to '+contact+'.</p>'},
    {id:'rights',h:'Your rights and choices',html:
      '<ul><li><strong>Access and portability:</strong> Profile → Data → Export a backup gives you a complete, readable copy of your data.</li>'
      +'<li><strong>Correction:</strong> edit anything directly in the app.</li>'
      +'<li><strong>Erase on this device:</strong> Profile → Data → Erase everything on this device.</li>'
      +'<li><strong>Delete your account and cloud copy:</strong> email '+contact+' from the address on the account. We will confirm and complete it within 30 days.</li>'
      +'<li><strong>Withdraw consent for optional features:</strong> remove your AI or voice key in Settings, switch off Real book covers, or revoke notification permission in your browser.</li></ul>'
      +'<p>If UK or EU data protection law applies to you, you also have the right to object to or restrict processing based on our legitimate interests, and to complain to your local data protection authority. If California or similar law applies, we do not sell or share personal information, and we will not treat you differently for exercising a right. We respond within one month, or as the law requires.</p>'},
    {id:'transfers',h:'Where data is processed',html:
      '<p>Our providers may process data in the United States and other countries. Where the law requires a transfer mechanism, we rely on the safeguards in our providers’ terms, such as standard contractual clauses.</p>'},
    {id:'children',h:'Children',html:
      '<p>BLOC is not directed to children under 13, and you must be at least 13 (or the age at which you can consent to online services in your country, if higher) to create an account. We do not knowingly collect an account from anyone younger. If you believe we have, write to '+contact+' and we will delete it.</p>'},
    {id:'changes',h:'Changes to this policy',html:
      '<p>When we make a material change we will update the effective date and the history below, and show a notice in the app before the change takes effect where we can. Using the Service after a change means you accept the updated policy; if you do not, stop using it and ask us to delete your account.</p>'},
    {id:'contact',h:'Contact',html:'<p>Questions, requests or complaints about privacy: '+contact+'.</p>'}
  ],
  history:[
    ['2.1','2026-10-18','No change to how your data is handled. Version number aligned with the updated Terms.'],
    ['2.0','2026-09-22','Complete rewrite: data table, sync and archive behaviour, AI request contents, retention periods, security, rights and children’s section.'],
    ['1.1','2026-09-19','Clarified that AI keys stay in the browser, and added the analytics and Open Library notes.'],
    ['1.0','2026-06-02','First policy, published with accounts and cloud sync.']
  ]
};

/* ═══════════════ TERMS OF USE ═══════════════ */
var TERMS={
  key:'terms',title:'Terms of Use',short:'Terms',
  summary:[
    'BLOC is a free personal planner. You own what you put in it.',
    'Accounts created during the early-access beta get 50% off for life on premium plans, if and when we launch them.',
    'It is local-first, so export a backup regularly. Browsers can lose data, and the service has no uptime promise.',
    'AI features are optional, use your own keys, and give guidance, not professional advice.',
    'Be reasonable: no abuse, no overloading the service, no using sync as file storage.',
    'You can stop at any time and ask us to delete your account.'
  ],
  sections:[
    {id:'agree',h:'Agreeing to these terms',html:
      '<p>These terms are an agreement between you and '+who+' (“we”, “us”) about the BLOC web app and sync service (the “Service”). By using the Service you agree to them and to the <button type="button" class="dlg-link" data-legal="privacy">Privacy Policy</button>. If you do not agree, do not use it.</p>'
      +'<p>You must be at least 13, or the age at which you can consent to online services in your country if higher, and able to enter a binding agreement. BLOC is intended for personal use.</p>'},
    {id:'service',h:'The Service',html:
      '<p>BLOC is a planner for tasks, focus sessions, habits, notes and a calendar. It stores your data in your browser. An account adds optional backup and sync. AI and voice features are optional and use keys you provide.</p>'
      +'<p>The Service is provided free of charge. It is run by one person, on infrastructure that may be slow to start (the first sign-in can take up to a minute) or unavailable at times. We may change, add or remove features. If we make a change that significantly reduces what you can do, we will tell you in the app first where practical.</p>'},
    {id:'early',h:'Early-access offer',html:
      '<p>BLOC is free during the early-access beta. If we later launch paid plans, every account created before we announce the end of the beta (a &ldquo;founding member&rdquo;) will receive 50% off the standard price of those plans for as long as the account stays active and in good standing.</p>'
      +'<ul><li>The offer is tied to the email address you signed up with and cannot be transferred or combined with another account.</li>'
      +'<li>It applies to paid plans only. We may keep the free version, change it, or retire it.</li>'
      +'<li>We decide whether to launch paid plans, what they include, and their standard price. Nothing here promises that any plan will exist.</li>'
      +'<li>The discount is lost if the account is closed or removed for breaking these terms.</li></ul>'},
    {id:'account',h:'Your account',html:
      '<ul><li>Give a real email address you control, and keep it up to date. You must confirm it before you can sign in.</li>'
      +'<li>Choose a password of 8 to 128 characters that you do not use elsewhere, and keep it private.</li>'
      +'<li>You are responsible for activity under your account. Tell us promptly if you think someone else has access.</li>'
      +'<li>One person per account. Do not create accounts in bulk or by automated means.</li></ul>'},
    {id:'content',h:'Your content',html:
      '<p>You keep ownership of everything you put into BLOC. You give us a limited, worldwide, non-exclusive licence to store, copy, transmit and display it only as needed to run the Service for you (for example syncing it between your devices and keeping backups). The licence ends when your content is deleted, subject to the retention periods in the Privacy Policy.</p>'
      +'<p>You are responsible for your content. Do not store content that is unlawful or that infringes someone else’s rights.</p>'},
    {id:'use',h:'Acceptable use',html:
      '<p>Do not:</p>'
      +'<ul><li>try to access other people’s accounts or data, or probe, scan or test the Service for weaknesses without our written permission;</li>'
      +'<li>overload, disrupt or scrape the Service, or send automated requests beyond normal use;</li>'
      +'<li>upload malware, or use the Service to harass, defraud or harm anyone;</li>'
      +'<li>use sync as general file storage. Entries are limited to 512 KB each and requests to about 1.4 MB;</li>'
      +'<li>use the Service in breach of the law.</li></ul>'
      +'<p>If you find a security problem, please report it to '+contact+' rather than exploiting it.</p>'},
    {id:'ai',h:'AI and voice features',html:
      '<p>These features run on your own Google Gemini or OpenAI key. You are responsible for that key, for the provider’s terms, and for any charges it incurs. Do not share your key with anyone.</p>'
      +'<p>AI replies can be wrong, incomplete or unsuitable for you. Wojak is a planning and habits coach, not a doctor, therapist, lawyer or financial adviser, and nothing it says is professional advice. If you are in crisis or in danger, contact your local emergency number or a crisis service instead of relying on the app.</p>'
      +'<p>Planning scores, streaks, habit insights and priorities (A to E) are tools for reflection and are not guarantees of any outcome.</p>'},
    {id:'backups',h:'Backups and data loss',html:
      '<p>Most of your data lives in your browser. Clearing site data, a full disk, a browser update, a lost device or a sync conflict can remove or change it. You are responsible for exporting a backup regularly (Profile → Data). We run sync with reasonable care but do not promise that it will always work, or that every entry will be retained.</p>'},
    {id:'third',h:'Third-party services',html:
      '<p>The Service uses and links to services run by others, such as Google, OpenAI, Open Library and our hosting providers. Your use of them is subject to their terms, and we are not responsible for them.</p>'},
    {id:'ip',h:'Our rights',html:
      '<p>The BLOC software, design, wording and branding belong to us or our licensors. We give you a personal, non-exclusive, non-transferable, revocable licence to use the web app as intended. You may not copy, resell or build a competing service from it. If you send us feedback we may use it without obligation to you.</p>'},
    {id:'end',h:'Ending your use',html:
      '<p>You can stop using BLOC at any time. To close your account and delete your cloud copy, email '+contact+' from the account’s address. We may suspend or end your access if you break these terms, if we must by law, or if we shut the Service down. If we shut it down we will give you notice and a chance to export your data where we can. Sections that by their nature should continue, such as the disclaimers and the limit on liability, will continue after your access ends.</p>'},
    {id:'warranty',h:'No warranty',html:
      '<p>The Service is provided “as is” and “as available”. To the extent the law allows, we give no warranties of any kind, including that it will be uninterrupted, secure or error-free, or that it is fit for a particular purpose. Nothing in these terms limits any right you have by law that cannot be excluded.</p>'},
    {id:'liability',h:'Limit on liability',html:
      '<p>To the extent the law allows, we are not liable for indirect or consequential loss, or for lost profits, lost data or lost opportunities, arising from your use of the Service. Our total liability to you for any claim relating to the Service is limited to US$50 (or the equivalent in your currency).</p>'
      +'<p>Nothing in these terms excludes or limits liability that cannot be excluded or limited by law, including for death or personal injury caused by negligence, or for fraud.</p>'},
    {id:'law',h:'Governing law',html:'<p>'+law+'</p>'},
    {id:'changes',h:'Changes to these terms',html:
      '<p>We may update these terms. For a material change we will update the effective date and the history below, and show a notice in the app before it takes effect where we can. If you keep using the Service after a change, you accept the new terms. If you do not accept them, stop using the Service and ask us to delete your account.</p>'},
    {id:'general',h:'General',html:
      '<p>These terms and the Privacy Policy are the whole agreement between us about the Service. If a part is found unenforceable, the rest stays in force. If we do not enforce a term, that does not waive it. You may not transfer your rights under these terms; we may transfer ours as part of transferring the Service, and will tell you if we do.</p>'
      +'<p>Questions about these terms: '+contact+'.</p>'}
  ],
  history:[
    ['2.1','2026-10-18','Added the early-access offer: 50% off for life for accounts created during the beta.'],
    ['2.0','2026-09-22','Complete rewrite: account, content licence, acceptable use, AI features, backups, liability and governing law.'],
    ['1.1','2026-09-19','Simplified wording and added the AI-key responsibility and fair-use notes.'],
    ['1.0','2026-06-02','First terms, published with accounts and cloud sync.']
  ]
};

var DOCS={privacy:PRIVACY,terms:TERMS};
Acct.LEGAL_DOCS=DOCS;

/* ── Rendering ─────────────────────────────────────────────────────────────────── */
function docHtml(d){
  var eff=Acct.fmtDateLong(L.effective);
  var secs=d.sections.map(function(s,i){
    return '<section class="lg-sec" id="lg-'+d.key+'-'+s.id+'" data-sec="'+s.id+'"><h3><span class="n">'+(i+1)+'.</span><span>'+esc(s.h)+'</span></h3>'+s.html+'</section>';
  }).join('');
  var hist='<section class="lg-sec lg-hist" id="lg-'+d.key+'-history"><h3><span class="n"></span><span>Change history</span></h3>'
    +table(['Version','Date','What changed'],d.history.map(function(h){return ['v'+h[0],esc(Acct.fmtDateLong(h[1])),esc(h[2])];}))+'</section>';
  var sum='<div class="lg-sum"><div class="lg-sum-t">The short version</div><ul>'+d.summary.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>'
    +'<div style="margin-top:8px;font-size:12px;color:var(--muted2)">This summary is a convenience. The numbered sections below are the policy.</div></div>';
  var tocM='<details class="lg-toc-m"><summary>Contents</summary>'+d.sections.map(function(s,i){return '<a href="#lg-'+d.key+'-'+s.id+'" data-go="'+s.id+'">'+(i+1)+'. '+esc(s.h)+'</a>';}).join('')+'<a href="#lg-'+d.key+'-history" data-go="history">Change history</a></details>';
  return {body:tocM+sum+secs+hist,eff:eff};
}
function tocHtml(d){
  return '<nav aria-label="Contents" class="lg-toc">'+d.sections.map(function(s,i){return '<a href="#lg-'+d.key+'-'+s.id+'" data-go="'+s.id+'">'+(i+1)+'. '+esc(s.h)+'</a>';}).join('')+'<a href="#lg-'+d.key+'-history" data-go="history">Change history</a></nav>';
}
var cur='privacy',spy=null;
function plainText(d){
  var t=['BLOC — '+d.title,'Version '+Acct.CONFIG.version+' · Policy '+L.docVersion+' · Effective '+Acct.fmtDateLong(L.effective),''];
  t.push('THE SHORT VERSION');d.summary.forEach(function(x){t.push('- '+x);});t.push('');
  var scratch=document.createElement('div');
  d.sections.forEach(function(s,i){
    scratch.innerHTML=s.html.replace(/<\/(p|li|tr|h4)>/g,'\n').replace(/<\/t[dh]>/g,' | ').replace(/<br\s*\/?>/g,'\n');
    t.push((i+1)+'. '+s.h.toUpperCase());t.push((scratch.textContent||'').replace(/\n{3,}/g,'\n\n').trim());t.push('');
  });
  t.push('CHANGE HISTORY');d.history.forEach(function(h){t.push('v'+h[0]+' · '+Acct.fmtDateLong(h[1])+' — '+h[2]);});
  return t.join('\n');
}
function setSpy(){
  if(spy){spy.disconnect();spy=null;}
  var sc=$('lg-scroll');if(!sc||!('IntersectionObserver' in window))return;
  var links=[].slice.call(document.querySelectorAll('.lg-toc a'));
  spy=new IntersectionObserver(function(es){
    es.forEach(function(e){if(e.isIntersecting){var id=e.target.dataset.sec||'history';links.forEach(function(a){a.classList.toggle('on',a.dataset.go===id);});}});
  },{root:sc,rootMargin:'0px 0px -75% 0px',threshold:0});
  [].forEach.call(sc.querySelectorAll('.lg-sec'),function(s){if(!s.dataset.sec)s.dataset.sec='history';spy.observe(s);});
}
function scrollToSec(id,smooth){
  var el=document.getElementById('lg-'+cur+'-'+id),sc=$('lg-scroll');if(!el||!sc)return;
  var top=el.getBoundingClientRect().top-sc.getBoundingClientRect().top+sc.scrollTop-8;
  sc.scrollTo({top:top,behavior:smooth?'smooth':'auto'});
  var m=document.querySelector('.lg-toc-m');if(m)m.open=false;
}
window.openLegal=function(which,section){
  var key=DOCS[which]?which:'privacy',d=DOCS[key],o=$('legal-overlay');if(!o)return;
  var wasOpen=o.classList.contains('open');
  if(!wasOpen)Acct.remember('legal');
  cur=key;
  var r=docHtml(d);
  $('legal-title').textContent=d.title.toUpperCase();
  $('lg-meta').textContent='Version '+Acct.CONFIG.version+' · Policy '+L.docVersion+' · Effective '+r.eff;
  $('lg-toc-mount').innerHTML=tocHtml(d);
  $('lg-scroll').innerHTML=r.body;
  ['privacy','terms'].forEach(function(k){var t=$('legal-tab-'+k);t.setAttribute('aria-selected',k===key);t.tabIndex=k===key?0:-1;});
  o.classList.add('open');
  $('lg-scroll').scrollTop=0;
  setSpy();
  var first=document.querySelector('.lg-toc a');if(first)first.classList.add('on');
  if(section)scrollToSec(section,false);
  if(!wasOpen)setTimeout(function(){var t=$('legal-tab-'+key);if(t)t.focus();},30);
  try{history.replaceState(null,'','#legal/'+key+(section?'/'+section:''));}catch(e){}
};
window.closeLegal=function(){
  var o=$('legal-overlay');if(!o||!o.classList.contains('open'))return;
  o.classList.remove('open');if(spy){spy.disconnect();spy=null;}
  try{if(/^#legal\//.test(location.hash))history.replaceState(null,'',location.pathname+location.search);}catch(e){}
  Acct.restore('legal');
  /* a person who has just read the terms from sign-up should land back on the form */
};

/* ── Markup (replaces the old two-tab modal) ──────────────────────────────────── */
Acct.legalMarkup='<div id="legal-overlay" onclick="if(event.target===this)closeLegal()">'
  +'<div class="dlg-sheet lg-modal" role="dialog" aria-modal="true" aria-labelledby="legal-title">'
  +'<div class="lg-top"><div><div class="dlg-h" id="legal-title" style="font-size:26px">PRIVACY POLICY</div><div class="lg-meta" id="lg-meta"></div></div><button type="button" class="dlg-x" onclick="closeLegal()" aria-label="Close">✕</button></div>'
  +'<div class="lg-tabs" role="tablist" aria-label="Legal documents">'
  +'<button type="button" role="tab" class="lg-tab" id="legal-tab-privacy" aria-selected="true" onclick="openLegal(\'privacy\')">Privacy Policy</button>'
  +'<button type="button" role="tab" class="lg-tab" id="legal-tab-terms" aria-selected="false" onclick="openLegal(\'terms\')">Terms of Use</button>'
  +'<span class="lg-spacer"></span></div>'
  +'<div class="lg-grid"><div id="lg-toc-mount" style="min-height:0;display:flex;flex-direction:column"></div><div class="lg-scroll" id="lg-scroll" tabindex="0" aria-label="Document text"></div></div>'
  +'<div class="lg-foot"><span class="lg-note">This is a plain-language draft for a small product, not legal advice.</span>'
  +'<button type="button" class="dlg-btn" id="lg-dl">Download copy (.txt)</button><button type="button" class="dlg-btn" id="lg-ver">Version history</button></div>'
  +'</div></div>';

document.addEventListener('click',function(e){
  var t=e.target.closest&&e.target.closest('[data-go]');
  if(t&&$('legal-overlay').contains(t)){e.preventDefault();scrollToSec(t.dataset.go,true);return;}
  var l=e.target.closest&&e.target.closest('[data-legal]');
  if(l&&!l.closest('#dlg-hist-ov')){e.preventDefault();window.openLegal(l.dataset.legal);}
});
Acct.legalWire=function(){
  var dl=$('lg-dl'),vb=$('lg-ver');
  if(dl)dl.onclick=function(){
    var d=DOCS[cur],blob=new Blob([plainText(d)],{type:'text/plain'}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download='bloc-'+cur+'-policy-v'+L.docVersion+'.txt';document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(a.href);},2000);
  };
  if(vb)vb.onclick=function(){Acct.openHistory();};
  /* arrow keys move between the two tabs */
  var tabs=document.querySelector('.lg-tabs');
  if(tabs)tabs.addEventListener('keydown',function(e){
    if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
    e.preventDefault();var to=cur==='privacy'?'terms':'privacy';window.openLegal(to);setTimeout(function(){$('legal-tab-'+to).focus();},10);
  });
};
/* deep link: #legal/privacy or #legal/terms/security */
Acct.legalHash=function(){
  var m=/^#legal\/(privacy|terms)(?:\/([a-z]+))?$/.exec(location.hash);
  if(m)Acct.when(function(){return document.readyState==='complete';},function(){window.openLegal(m[1],m[2]);},40);
};
})();

/* sign-in and create-account. Same backend calls as before (YitblocSync.loginUser / registerUser), a much stricter front end.
   It replaces the acct* functions from the base bundle; the element ids they use are kept. */
(function(){
'use strict';
var Acct=window.BLOC_ACCT,$=Acct.$,esc=Acct.esc,L=Acct.CONFIG.legal;
var mode='login',busy=false,fails=[],lockUntil=0,lockTimer=0,waitTimer=0,showPw=false,touched={};

Acct.authMarkup=
'<div id="acct-overlay" onclick="if(event.target===this)closeAuthModal()">'
+'<div class="evt-modal acct-modal dlg-auth" role="dialog" aria-modal="true" aria-labelledby="acct-title">'
+'<div class="evt-head"><div class="bg-modal-title" id="acct-title">SIGN IN</div><button type="button" class="evt-close" onclick="closeAuthModal()" aria-label="Close">✕</button></div>'
+'<div class="evt-body">'
+'<div class="bg-hint acct-note" id="acct-note" style="display:none" role="status"></div>'
+'<div id="acct-form">'
+'<div class="dlg-seg" role="tablist" aria-label="Account" style="margin-bottom:16px">'
+'<button type="button" role="tab" id="acct-tab-login" aria-selected="true" aria-controls="acct-formel">Sign in</button>'
+'<button type="button" role="tab" id="acct-tab-signup" aria-selected="false" aria-controls="acct-formel">Create account</button></div>'
+'<form id="acct-formel" novalidate>'
+'<div class="dlg-field"><label for="acct-email">Email</label>'
+'<input id="acct-email" type="email" inputmode="email" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="254" placeholder="you@example.com" aria-describedby="acct-email-err">'
+'<div class="dlg-ferr" id="acct-email-err" role="alert"></div></div>'
+'<div class="dlg-field"><label for="acct-pass">Password</label>'
+'<div class="dlg-pw"><input id="acct-pass" type="password" autocomplete="current-password" maxlength="128" placeholder="8 characters or more" aria-describedby="acct-pass-err acct-caps">'
+'<button type="button" class="dlg-pwt" id="acct-pwt" aria-pressed="false" aria-label="Show password">Show</button></div>'
+'<div class="dlg-caps" id="acct-caps" hidden>Caps Lock is on.</div>'
+'<div class="dlg-meter" id="acct-meter" data-s="0" hidden><div class="dlg-meter-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></div>'
+'<div class="dlg-meter-l"><span id="acct-meter-lbl" aria-live="polite">Strength</span><span id="acct-meter-len"></span></div>'
+'<ul class="dlg-meter-tips" id="acct-tips"></ul></div>'
+'<div class="dlg-ferr" id="acct-pass-err" role="alert"></div></div>'
+'<div class="dlg-field" id="acct-confirm-wrap" hidden><label for="acct-pass2">Confirm password</label>'
+'<input id="acct-pass2" type="password" autocomplete="new-password" maxlength="128" aria-describedby="acct-pass2-err">'
+'<div class="dlg-ferr" id="acct-pass2-err" role="alert"></div></div>'
+'<div id="acct-consent-wrap" hidden><label class="dlg-check"><input type="checkbox" id="acct-consent" aria-describedby="acct-consent-err">'
+'<span>I am 13 or older, I agree to the <button type="button" class="dlg-link" data-legal="terms">Terms of Use</button> and I have read the <button type="button" class="dlg-link" data-legal="privacy">Privacy Policy</button>.</span></label>'
+'<div class="dlg-ferr" id="acct-consent-err" role="alert" style="margin:-6px 0 12px 28px"></div></div>'
+'<label class="dlg-check" id="acct-remember-wrap"><input type="checkbox" id="acct-remember" checked><span>Remember my email on this device</span></label>'
+'<div class="lib-addbook-error acct-msg" id="acct-msg" role="alert" style="display:none"></div>'
+'<div class="dlg-wait" id="acct-wait" hidden role="status"></div>'
+'<button type="submit" hidden tabindex="-1" aria-hidden="true"></button>'
+'</form>'
+'<div class="dlg-reassure" id="acct-reassure">An account is optional. Without one, everything stays in this browser. With one, you can back up and sync. We email you a confirmation link when you create an account, and nothing else.</div>'
+'<button type="button" class="acct-switch" id="acct-switch" hidden></button>'
+'<div class="legal-links"><button type="button" data-legal="privacy">Privacy</button><span>·</span><button type="button" data-legal="terms">Terms</button></div>'
+'</div>'
+'<div id="acct-sent" class="dlg-sent" hidden><div style="font-size:30px" aria-hidden="true">✉</div><b>Check your email</b>'
+'<div class="em" id="acct-sent-em"></div>'
+'<p>We sent a confirmation link. Open it, then come back and sign in. You cannot sign in until the address is confirmed. If nothing arrives in a few minutes, check spam, or make sure the address is spelled correctly.</p>'
+'<button type="button" class="dlg-btn pri" id="acct-sent-go" style="width:100%">Go to sign in</button></div>'
+'<div id="acct-status" style="display:none"><div class="bg-sec-lbl">SIGNED IN AS</div><div class="acct-email-line" id="acct-who"></div><div class="acct-usage" id="acct-usage"></div>'
+'<div class="lib-addbook-error acct-msg" id="acct-msg2" role="alert" style="display:none"></div>'
+'<button type="button" class="dlg-btn pri" id="acct-profile-btn" style="width:100%;margin-top:14px">Open your profile</button></div>'
+'</div>'
+'<div class="evt-foot"><button type="button" class="evt-cancel" id="acct-logout" onclick="acctLogout()" style="display:none">SIGN OUT</button>'
+'<button type="button" class="evt-cancel" id="acct-sync" onclick="acctSyncNow()" style="display:none">SYNC NOW</button>'
+'<button type="button" class="evt-save" id="acct-go" style="flex:1;" onclick="acctSubmit()">SIGN IN</button></div>'
+'</div></div>';

/* ── password rules ───────────────────────────────────────────────────────────── */
var COMMON=['password','password1','password12','password123','passw0rd','p@ssw0rd','p@ssword','12345678','123456789','1234567890','12341234','123123123','11111111','00000000','88888888','qwertyui','qwerty123','qwertyuiop','1q2w3e4r','1qaz2wsx','zaq12wsx','abc12345','abcd1234','iloveyou','letmein1','welcome1','welcome123','admin123','administrator','monkey123','dragon123','football1','baseball1','sunshine1','princess1','master123','shadow123','superman1','trustno1','changeme','changeme1','pass1234','test1234','bloc1234','planner123'];
function isSeq(s){
  if(s.length<8)return false;
  var up=0,dn=0;
  for(var i=1;i<s.length;i++){var d=s.charCodeAt(i)-s.charCodeAt(i-1);if(d===1)up++;else if(d===-1)dn++;}
  return up>=s.length-2||dn>=s.length-2;
}
function localPart(email){return String(email||'').split('@')[0].toLowerCase();}
function check(pw,email){
  var len=pw.length,low=pw.toLowerCase(),lp=localPart(email);
  var classes=[/[a-z]/,/[A-Z]/,/\d/,/[^A-Za-z0-9]/].filter(function(r){return r.test(pw);}).length;
  var common=COMMON.indexOf(low)>=0||/^(.)\1+$/.test(pw)||(/^\d+$/.test(pw)&&len<14)||isSeq(low)||/^(.{1,4})\1{2,}$/.test(pw);
  var hasEmail=lp.length>=4&&low.indexOf(lp)>=0;
  var score=len<8?0:len<10?1:len<12?2:len<16?3:4;
  if(classes<2&&len<16)score=Math.min(score,2);
  if(hasEmail)score=Math.min(score,1);
  if(common)score=0;
  var block=null;
  if(len<8)block='Use at least 8 characters.';
  else if(len>128)block='Use 128 characters or fewer.';
  else if(common)block='That password is too easy to guess. Choose something only you would think of.';
  else if(hasEmail&&lp===low)block='Your password cannot be your email name.';
  return {score:score,block:block,tips:[
    {t:'At least 8 characters',ok:len>=8},
    {t:'Not a common or patterned password',ok:len>0&&!common},
    {t:'Does not contain your email name',ok:len>0&&!hasEmail},
    {t:'Longer is stronger: 12+ characters, or a mix of letters, numbers and symbols',ok:len>=12||classes>=3}
  ]};
}
var LABELS=['Too weak','Weak','Fair','Good','Strong'];

/* ── small helpers ────────────────────────────────────────────────────────────── */
function api(){return window.YitblocSync||null;}
function signedIn(){var a=api();var s=a?a.getAuthState():{authenticated:false};return !!s.authenticated;}
function fieldErr(id,msg){
  var inp=$(id.replace(/-err$/,'')),box=$(id);
  if(box)box.textContent=msg||'';
  if(inp){if(msg)inp.setAttribute('aria-invalid','true');else inp.removeAttribute('aria-invalid');}
}
function clearErrors(){['acct-email-err','acct-pass-err','acct-pass2-err'].forEach(function(i){fieldErr(i,'');});var c=$('acct-consent-err');if(c)c.textContent='';msg('');}
function msg(t,ref,id){
  var el=$(id||'acct-msg');if(!el)return;
  el.innerHTML=t?esc(t)+(ref?'<div class="dlg-ref">Reference: '+esc(ref)+'</div>':''):'';
  el.style.display=t?'block':'none';
}
function validEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)&&e.length<=254;}
function validateEmail(){
  var e=$('acct-email').value.trim();
  if(!e){fieldErr('acct-email-err','Enter your email address.');return false;}
  if(!validEmail(e)){fieldErr('acct-email-err','That does not look like an email address. Check for typos.');return false;}
  fieldErr('acct-email-err','');return true;
}
function validatePass(){
  var p=$('acct-pass').value;
  if(!p){fieldErr('acct-pass-err',mode==='signup'?'Choose a password.':'Enter your password.');return false;}
  if(mode==='signup'){var r=check(p,$('acct-email').value);if(r.block){fieldErr('acct-pass-err',r.block);return false;}}
  else if(p.length<8){fieldErr('acct-pass-err','Passwords are at least 8 characters.');return false;}
  fieldErr('acct-pass-err','');return true;
}
function validateConfirm(){
  if(mode!=='signup')return true;
  var a=$('acct-pass').value,b=$('acct-pass2').value;
  if(!b){fieldErr('acct-pass2-err','Type your password again.');return false;}
  if(a!==b){fieldErr('acct-pass2-err','The two passwords do not match.');return false;}
  fieldErr('acct-pass2-err','');return true;
}
function paintMeter(){
  var m=$('acct-meter');if(mode!=='signup'){m.hidden=true;return;}
  var p=$('acct-pass').value;m.hidden=!p&&!touched.pass;
  var r=check(p,$('acct-email').value);
  m.dataset.s=p?r.score:0;
  $('acct-meter-lbl').textContent=p?'Strength: '+LABELS[r.score]:'Strength';
  $('acct-meter-len').textContent=p.length+'/128';
  $('acct-tips').innerHTML=r.tips.map(function(t){return '<li class="'+(t.ok?'ok':'')+'">'+esc(t.t)+'</li>';}).join('');
}
function setPw(show){
  showPw=show;
  ['acct-pass','acct-pass2'].forEach(function(i){var e=$(i);if(e)e.type=show?'text':'password';});
  var b=$('acct-pwt');b.textContent=show?'Hide':'Show';b.setAttribute('aria-pressed',show);b.setAttribute('aria-label',show?'Hide password':'Show password');
}

/* ── mode, render ─────────────────────────────────────────────────────────────── */
function setMode(m,keepErr){
  mode=m;try{acctMode=m;}catch(e){}
  var su=m==='signup';
  $('acct-tab-login').setAttribute('aria-selected',!su);$('acct-tab-signup').setAttribute('aria-selected',su);
  $('acct-confirm-wrap').hidden=!su;$('acct-consent-wrap').hidden=!su;
  $('acct-pass').autocomplete=su?'new-password':'current-password';
  $('acct-pass').placeholder=su?'8 to 128 characters':'Your password';
  $('acct-reassure').hidden=false;
  $('acct-title').textContent=su?'CREATE ACCOUNT':'SIGN IN';
  $('acct-go').textContent=su?'CREATE ACCOUNT':'SIGN IN';
  if(!keepErr)clearErrors();
  $('acct-pass2').value='';setPw(false);paintMeter();
}
window.acctToggleMode=function(){setMode(mode==='login'?'signup':'login');};

window.acctRender=function(note){
  var a=api(),st=a?a.getAuthState():{authenticated:false},si=!!st.authenticated;
  var sent=$('acct-sent');
  $('acct-form').style.display=si||(sent&&!sent.hidden)?'none':'block';
  $('acct-status').style.display=si?'block':'none';
  $('acct-logout').style.display=si?'':'none';
  $('acct-sync').style.display=si?'':'none';
  $('acct-go').style.display=si||(sent&&!sent.hidden)?'none':'';
  var n=$('acct-note');n.textContent=note||'';n.style.display=note?'block':'none';
  if(si){
    $('acct-title').textContent='YOUR ACCOUNT';
    $('acct-who').textContent=(st.user&&st.user.email)||'';
    var u=a.getStorageUsage();
    $('acct-usage').textContent='Browser storage used: '+u.percent+'%. '+(typeof fullSyncOn==='function'&&fullSyncOn()?'Full sync is on: your data is kept in step across your devices.':'Older data moves to the cloud automatically once this passes 80%. Turn on full sync in Settings to sync everything.');
  }else if(!(sent&&!sent.hidden)){
    setMode(mode,true);
  }
  if(typeof acctRenderSettings==='function')acctRenderSettings();
};
window.acctSetBusy=function(on,label){
  busy=on;var b=$('acct-go');
  ['acct-email','acct-pass','acct-pass2','acct-consent','acct-remember'].forEach(function(i){var e=$(i);if(e)e.disabled=on;});
  $('acct-tab-login').disabled=on;$('acct-tab-signup').disabled=on;
  if(on){b.disabled=true;b.textContent=label||'PLEASE WAIT…';}
  else{b.disabled=Date.now()<lockUntil;b.textContent=mode==='signup'?'CREATE ACCOUNT':'SIGN IN';}
};

window.openAuthModal=function(ctx){
  var el=$('acct-overlay');if(!el)return;
  if(!el.classList.contains('open'))Acct.remember('auth');
  var sent=$('acct-sent');sent.hidden=true;
  try{
    var em=$('acct-email'),last=localStorage.getItem('yb_last_email'),rem=localStorage.getItem('yb_remember_email_v1');
    $('acct-remember').checked=rem!=='0';
    if(em&&!em.value&&last&&rem!=='0')em.value=last;
  }catch(e){}
  touched={};clearErrors();$('acct-wait').hidden=true;
  var why=ctx&&ctx.reason==='storage-threshold'?'Your browser storage is almost full. Sign in so older data can be moved to the cloud safely.'
    :ctx&&ctx.reason==='fullsync'?'Sign in to start syncing across your devices.'
    :ctx&&ctx.reason==='expired'?'Your session ended. Please sign in again.'
    :ctx&&ctx.reason==='founding'?'Early access: accounts created during the beta get 50% off for life when premium plans launch.':'';
  setMode(ctx&&ctx.mode==='signup'?'signup':'login');
  window.acctRender(why);
  el.classList.add('open');
  setTimeout(function(){
    if(signedIn())return;
    var e=$('acct-email');(e.value?$('acct-pass'):e).focus();
  },40);
};
window.closeAuthModal=function(){
  var el=$('acct-overlay');if(!el||!el.classList.contains('open'))return;
  el.classList.remove('open');clearTimeout(waitTimer);$('acct-wait').hidden=true;
  $('acct-pass').value='';$('acct-pass2').value='';setPw(false);
  Acct.restore('auth');
};
window.openAccountFromSettings=function(){
  if(typeof closeSettings==='function')closeSettings();
  if(signedIn()&&Acct.openProfile){Acct.openProfile();return;}
  window.openAuthModal({reason:'manual'});
};

/* ── submit ───────────────────────────────────────────────────────────────────── */
function friendly(r,m){
  var err=r.error||{},code=err.code||'',status=r.status||0,text=String(err.message||'');
  if(code==='network_error'||code==='timeout')return 'Could not reach the server. It may still be waking up, so wait a moment and try again.';
  if(status===429||/too many|rate/i.test(text))return 'Too many attempts. Wait a few minutes before trying again.';
  if(/confirm|verif/i.test(text))return 'Your email address is not confirmed yet. Open the link we emailed you, then sign in.';
  if(m==='login'&&(status===400||status===401||status===403||/invalid|incorrect|credential/i.test(code+' '+text)))return 'That email and password do not match. Check both and try again.';
  if(m==='signup'&&(status===409||status===422||/already|exists|registered/i.test(text)))return 'We could not create that account. If you already have one, use Sign in.';
  if(status>=500)return 'BLOC’s server had a problem. Your data on this device is safe. Try again shortly.';
  return text||'Request failed. Please try again.';
}
function lockNow(){
  var secs=Math.min(300,30*Math.pow(2,Math.max(0,fails.length-5)));
  lockUntil=Date.now()+secs*1000;tickLock();
}
function tickLock(){
  clearInterval(lockTimer);
  var b=$('acct-go');
  lockTimer=setInterval(function(){
    var left=Math.ceil((lockUntil-Date.now())/1000);
    if(left<=0){clearInterval(lockTimer);b.disabled=false;b.textContent=mode==='signup'?'CREATE ACCOUNT':'SIGN IN';return;}
    b.disabled=true;b.textContent='TRY AGAIN IN '+left+'s';
  },250);
  b.disabled=true;
}

window.acctSubmit=async function(){
  var a=api();if(busy)return;
  if(Date.now()<lockUntil)return;
  if(!a){msg('Sync is not available in this build.');return;}
  msg('');
  var okE=validateEmail(),okP=validatePass(),okC=validateConfirm(),okT=true;
  if(mode==='signup'&&!$('acct-consent').checked){$('acct-consent-err').textContent='You need to agree to continue.';okT=false;}else{var ce=$('acct-consent-err');if(ce)ce.textContent='';}
  if(!(okE&&okP&&okC&&okT)){
    var first=!okE?'acct-email':!okP?'acct-pass':!okC?'acct-pass2':'acct-consent';$(first).focus();return;
  }
  var email=$('acct-email').value.trim(),pass=$('acct-pass').value,m=mode;
  window.acctSetBusy(true,m==='signup'?'CREATING…':'SIGNING IN…');
  clearTimeout(waitTimer);
  waitTimer=setTimeout(function(){
    var w=$('acct-wait');w.textContent='Still working. The server sleeps when nobody is using it, so the first request can take up to a minute.';w.hidden=false;
  },6000);
  var r;
  try{r=m==='signup'?await a.registerUser(email,pass):await a.loginUser(email,pass);}
  catch(e){r={ok:false,error:{message:'Something went wrong. Please try again.'}};}
  clearTimeout(waitTimer);$('acct-wait').hidden=true;
  window.acctSetBusy(false);
  if(!r.ok){
    fails=fails.filter(function(t){return Date.now()-t<600000;});fails.push(Date.now());if(fails.length>=5)lockNow();
    msg(friendly(r,m),r.error&&r.error.requestId);
    return;
  }
  fails=[];
  try{
    if($('acct-remember').checked){localStorage.setItem('yb_last_email',email.toLowerCase());localStorage.setItem('yb_remember_email_v1','1');}
    else{localStorage.removeItem('yb_last_email');localStorage.setItem('yb_remember_email_v1','0');}
    if(m==='signup')Acct.set('yb_legal_consent_v1',{terms:L.docVersion,privacy:L.docVersion,at:new Date().toISOString(),via:'signup'});
  }catch(e){}
  if(m==='signup'&&r.confirmationRequired){
    $('acct-sent-em').textContent=email;$('acct-sent').hidden=false;
    $('acct-form').style.display='none';$('acct-go').style.display='none';
    $('acct-title').textContent='ALMOST DONE';
    $('acct-pass').value='';$('acct-pass2').value='';
    setTimeout(function(){$('acct-sent-go').focus();},30);
    return;
  }
  $('acct-pass').value='';$('acct-pass2').value='';
  window.closeAuthModal();
  Acct.toast('Signed in');
  if(window.acctRender)window.acctRender('');
  if(Acct.refreshProfile)Acct.refreshProfile();
};

window.acctLogout=async function(){
  var a=api();
  var sync=typeof fullSyncOn==='function'&&fullSyncOn();
  var ok=await Acct.confirm({title:'Sign out?',confirm:'Sign out',
    html:'<p style="margin:0 0 8px">Your tasks, notes and habits stay on this device. Your cloud copy is kept.</p>'+(sync?'<p style="margin:0">Syncing will pause until you sign in again.</p>':'')});
  if(!ok)return;
  if(a)a.logoutUser();
  mode='login';try{acctMode='login';}catch(e){}
  window.closeAuthModal();
  if(window.acctRender)window.acctRender('');
  Acct.toast('Signed out');
  if(Acct.refreshProfile)Acct.refreshProfile();
};

/* ── wiring (runs once the new markup is in the page) ─────────────────────────── */
Acct.authWire=function(){
  $('acct-tab-login').onclick=function(){if(!busy)setMode('login');};
  $('acct-tab-signup').onclick=function(){if(!busy)setMode('signup');};
  $('acct-formel').addEventListener('submit',function(e){e.preventDefault();window.acctSubmit();});
  $('acct-pwt').onclick=function(){setPw(!showPw);};
  $('acct-sent-go').onclick=function(){$('acct-sent').hidden=true;$('acct-form').style.display='block';$('acct-go').style.display='';setMode('login');window.acctRender('Account created. Sign in once your email is confirmed.');$('acct-pass').focus();};
  $('acct-profile-btn').onclick=function(){window.closeAuthModal();if(Acct.openProfile)Acct.openProfile();};
  $('acct-email').addEventListener('blur',function(){if(this.value)validateEmail();});
  $('acct-email').addEventListener('input',function(){if(this.getAttribute('aria-invalid'))fieldErr('acct-email-err','');paintMeter();});
  $('acct-pass').addEventListener('input',function(){touched.pass=true;if(this.getAttribute('aria-invalid'))fieldErr('acct-pass-err','');paintMeter();var p2=$('acct-pass2');if(p2.value&&p2.getAttribute('aria-invalid'))validateConfirm();});
  $('acct-pass').addEventListener('blur',function(){if(mode==='signup'&&this.value)validatePass();});
  $('acct-pass2').addEventListener('input',function(){if(this.getAttribute('aria-invalid'))fieldErr('acct-pass2-err','');});
  $('acct-pass2').addEventListener('blur',function(){if(this.value)validateConfirm();});
  $('acct-consent').addEventListener('change',function(){if(this.checked)$('acct-consent-err').textContent='';});
  ['acct-pass','acct-pass2'].forEach(function(id){
    var e=$(id);
    function caps(ev){var on=ev.getModifierState&&ev.getModifierState('CapsLock');$('acct-caps').hidden=!on;}
    e.addEventListener('keydown',caps);e.addEventListener('keyup',caps);e.addEventListener('blur',function(){$('acct-caps').hidden=true;});
  });
  window.addEventListener('yitbloc:auth-changed',function(){if(Acct.refreshProfile)Acct.refreshProfile();});
};
})();

/* profile page. Everything on it is read from the app's own data; nothing is invented.
   Name and "about me" are the existing Settings fields (userName, userProfile), so Settings and Profile always agree. */
(function(){
'use strict';
var Acct=window.BLOC_ACCT,$=Acct.$,esc=Acct.esc,L=Acct.CONFIG.legal;
var PKEY='bloc_profile_v1';
var COLORS=[['amber','Amber','var(--amber)'],['mint','Mint','var(--nav-tasks)'],['sky','Sky','var(--nav-focus)'],['rose','Rose','var(--nav-weekly)'],['blue','Blue','var(--nav-calendar)'],['violet','Violet','var(--pd)'],['coral','Coral','var(--pa)'],['green','Green','var(--green)']];
var root=null,draft={name:null,about:null,color:null};

/* ── data access (all guarded: each store may not exist in a given build) ──────── */
/* The base bundle keeps these in top-level let/const, which scripts share. No eval needed. */
var ACC={
  appSettings:function(){return typeof appSettings!=='undefined'?appSettings:undefined;},
  taskCompletionLog:function(){return typeof taskCompletionLog!=='undefined'?taskCompletionLog:undefined;},
  sessions:function(){return typeof sessions!=='undefined'?sessions:undefined;},
  streakData:function(){return typeof streakData!=='undefined'?streakData:undefined;},
  npNotes:function(){return typeof npNotes!=='undefined'?npNotes:undefined;},
  calEvents:function(){return typeof calEvents!=='undefined'?calEvents:undefined;}
};
function g(name){try{return ACC[name]();}catch(e){return undefined;}}
function prof(){var p=Acct.get(PKEY,{});if(!p||typeof p!=='object')p={};return p;}
function saveProf(p){Acct.set(PKEY,p);}
function auth(){var a=window.YitblocSync;var s=a?a.getAuthState():{authenticated:false};return {on:!!s.authenticated,email:s.user&&s.user.email||'',api:a};}
function readSettings(){return g('appSettings')||{};}
function hash(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h);}
function colorKey(){
  var p=prof();if(p.color&&COLORS.some(function(c){return c[0]===p.color;}))return p.color;
  var seed=auth().email||readSettings().userName||'bloc';return COLORS[hash(seed)%COLORS.length][0];
}
function colorVal(k){var c=COLORS.filter(function(x){return x[0]===k;})[0];return c?c[2]:COLORS[0][2];}
function displayName(){var n=(readSettings().userName||'').trim();if(n)return n;var e=auth().email;return e?e.split('@')[0]:'';}
function initial(){var n=displayName()||'B';return n.trim().charAt(0).toUpperCase()||'B';}
Acct.profileName=displayName;
Acct.profileColor=function(){return colorVal(colorKey());};
Acct.profileInitial=initial;

function lifetime(){
  var out={tasks:0,blocks:0,focusSec:0,byType:{A:0,B:0,C:0,D:0,E:0},first:null};
  function early(iso){if(iso&&(!out.first||iso<out.first))out.first=iso;}
  var log=g('taskCompletionLog')||[],ses=g('sessions')||[];
  var tArc=Acct.get('bloc_task_completion_log_archive_v1',[])||[],sArc=Acct.get('bloc_sessions_archive_v1',[])||[];
  log.forEach(function(l){out.tasks++;if(out.byType[l.type]!==undefined)out.byType[l.type]++;early(l.dateISO);});
  tArc.forEach(function(a){out.tasks+=a.count||0;Object.keys(a.byType||{}).forEach(function(t){if(out.byType[t]!==undefined)out.byType[t]+=a.byType[t]||0;});if(a.month)early(a.month+'-01');});
  ses.forEach(function(s){out.focusSec+=s.elapsed||0;if(s.completed)out.blocks++;early(s.dateISO);});
  sArc.forEach(function(a){out.focusSec+=a.totalElapsedSec||0;out.blocks+=a.completedCount||0;if(a.month)early(a.month+'-01');});
  return out;
}
function week(){
  var ses=g('sessions')||[],now=typeof bocNow==='function'?bocNow():new Date(),days=[];
  for(var i=6;i>=0;i--){var d=new Date(now.getTime()-i*864e5);var iso=typeof isoDate==='function'?isoDate(d):d.toISOString().slice(0,10);days.push({iso:iso,min:0,today:i===0});}
  ses.forEach(function(s){days.forEach(function(d){if(d.iso===s.dateISO)d.min+=Math.round((s.elapsed||0)/60);});});
  return days;
}
function fmtHours(sec){var m=Math.round(sec/60);if(m<60)return m+' min';var h=m/60;return (h>=100?Math.round(h):Math.round(h*10)/10)+' h';}
function since(){
  var first=lifetime().first,p=prof();
  if(!p.firstSeen){p.firstSeen=first||(typeof isoDate==='function'?isoDate(typeof bocNow==='function'?bocNow():new Date()):new Date().toISOString().slice(0,10));saveProf(p);}
  var a=p.firstSeen;if(first&&first<a)a=first;return a;
}

/* ── skeleton ────────────────────────────────────────────────────────────────── */
function build(){
  var cal=$('view-calendar');if(!cal||$('view-profile'))return;
  var v=document.createElement('div');v.className='view';v.id='view-profile';
  v.innerHTML='<div class="pf-wrap">'
    +'<div class="pf-title">PROFILE</div><div class="pf-sub" id="pf-sub">You and your data</div>'
    +'<section class="pf-hero" id="pf-hero" aria-label="Summary"></section>'
    +'<div class="pf-cols">'
    +'<section class="pf-card" aria-labelledby="pf-h-you"><h2 id="pf-h-you">About you</h2><p class="pf-d">Your name appears in greetings. “About me” is sent to Wojak so its advice fits you. Both stay on this device.</p>'
    +'<div class="dlg-field" style="margin-bottom:10px"><label for="pf-name">Display name</label><input id="pf-name" type="text" maxlength="40" autocomplete="nickname" placeholder="What should BLOC call you?"></div>'
    +'<div class="dlg-eyebrow" id="pf-col-l">Avatar colour</div><div class="pf-sw" id="pf-sw" role="radiogroup" aria-labelledby="pf-col-l"></div>'
    +'<div class="dlg-field" style="margin-bottom:0"><label for="pf-about">About me <span style="text-transform:none;letter-spacing:0">(optional, used by Wojak)</span></label><textarea id="pf-about" maxlength="2000" placeholder="e.g. Final-year student, works best in the morning, easily distracted by my phone."></textarea></div>'
    +'<div class="pf-hint"><span id="pf-state" aria-live="polite"></span><span id="pf-count"></span></div>'
    +'<div class="pf-row"><button type="button" class="dlg-btn pri" id="pf-save" disabled>Save changes</button></div></section>'
    +'<section class="pf-card" aria-labelledby="pf-h-acct"><h2 id="pf-h-acct">Account and sync</h2><div id="pf-acct"><div id="pf-acct-host"></div><div id="pf-acct-extra"></div></div></section>'
    +'<section class="pf-card wide" aria-labelledby="pf-h-num"><h2 id="pf-h-num">Your numbers</h2><p class="pf-d">Counted from the data on this device, including older months that BLOC has rolled up.</p><div id="pf-num"></div></section>'
    +'<section class="pf-card" aria-labelledby="pf-h-data"><h2 id="pf-h-data">Your data</h2><div id="pf-data"></div></section>'
    +'<section class="pf-card" aria-labelledby="pf-h-about"><h2 id="pf-h-about">About BLOC</h2><div id="pf-about-bloc"></div></section>'
    +'<section class="pf-card wide pf-danger" aria-labelledby="pf-h-dng"><h2 id="pf-h-dng">Danger zone</h2><div id="pf-danger"></div></section>'
    +'</div></div>';
  cal.parentNode.insertBefore(v,cal);
  root=v;
  wire();
}

/* ── painters ────────────────────────────────────────────────────────────────── */
function paintHero(){
  var a=auth(),el=$('pf-hero');if(!el)return;
  var n=displayName(),sync=typeof fullSyncOn==='function'&&fullSyncOn();
  el.innerHTML='<div class="pf-av" style="--av:'+(draft.color?colorVal(draft.color):colorVal(colorKey()))+'" aria-hidden="true">'+esc(initial())+'</div>'
    +'<div class="pf-hero-t"><div class="pf-name">'+esc(n||'Welcome')+'</div>'
    +'<div class="pf-line">'+(a.on?esc(a.email):'No account. Everything is stored in this browser only.')+'</div>'
    +'<div class="pf-chips">'+(a.on?'<span class="dlg-chip ok">Signed in</span>':'<span class="dlg-chip">Local only</span>')
    +(a.on?'<span class="dlg-chip '+(sync?'ok':'')+'">'+(sync?'Full sync on':'Overflow backup only')+'</span>':'')
    +'<span class="dlg-chip">Using BLOC since '+esc(Acct.iso2date(since()).toLocaleDateString(undefined,{month:'short',year:'numeric',timeZone:'UTC'}))+'</span></div></div>';
  var m=$('pf-sub');if(m)m.textContent=a.on?'Signed in as '+a.email:'You and your data';
}
function paintAcct(){
  var a=auth(),el=$('pf-acct-extra');if(!el)return;
  if(!a.on){el.innerHTML='';return;}
  var consent=Acct.get('yb_legal_consent_v1',null);
  el.innerHTML='<dl class="pf-kv"><dt>Signed in as</dt><dd>'+esc(a.email)+'</dd>'
    +(consent?'<dt>Terms accepted</dt><dd>v'+esc(consent.terms)+' on '+esc(Acct.fmtDate(String(consent.at).slice(0,10)))+'</dd>':'')+'</dl>'
    +'<div class="pf-row"><button type="button" class="dlg-btn" data-act="signout">Sign out</button></div>';
}
function paintNum(){
  var el=$('pf-num');if(!el)return;
  var t=lifetime(),w=week(),max=Math.max.apply(null,w.map(function(d){return d.min;}).concat([1]));
  var streak=g('streakData')||{current:0,best:0};
  var habits=typeof activeHabitCount==='function'?activeHabitCount():0;
  var notes=(g('npNotes')||[]).length,ev=(g('calEvents')||[]).length;
  var empty=!t.tasks&&!t.focusSec&&!notes&&!habits;
  if(empty){el.innerHTML='<div class="pf-empty">Nothing to count yet. Finish a task or a focus block and your totals will appear here.</div>';return;}
  var tot=0;Object.keys(t.byType).forEach(function(k){tot+=t.byType[k];});
  var wsum=w.reduce(function(s,d){return s+d.min;},0);
  el.innerHTML='<div class="pf-stats">'
    +'<div class="pf-stat"><b>'+t.tasks+'</b><span>tasks finished</span></div>'
    +'<div class="pf-stat"><b>'+esc(fmtHours(t.focusSec))+'</b><span>focused in '+t.blocks+' completed block'+(t.blocks===1?'':'s')+'</span></div>'
    +'<div class="pf-stat"><b>'+(streak.current||0)+'</b><span>day focus streak · best '+(streak.best||0)+'</span></div>'
    +'<div class="pf-stat"><b>'+habits+'</b><span>habit'+(habits===1?'':'s')+' · '+notes+' note'+(notes===1?'':'s')+' · '+ev+' event'+(ev===1?'':'s')+'</span></div></div>'
    +'<div class="pf-cols" style="margin-top:16px">'
    +'<div><div class="dlg-eyebrow">Focus minutes, last 7 days</div><div class="pf-bars" role="img" aria-label="Focus minutes per day, last seven days: '+w.map(function(d){return d.min+' on '+d.iso;}).join(', ')+'">'
    +w.map(function(d){var h=d.min?Math.max(4,Math.round(d.min/max*100)):0;return '<div class="'+(d.today?'today':'')+'" title="'+esc(d.iso)+': '+d.min+' min"><i class="'+(d.min?'':'z')+'" style="height:'+(h||2)+'%"></i><span>'+'SMTWTFS'.charAt(Acct.iso2date(d.iso).getUTCDay())+'</span></div>';}).join('')
    +'</div><div class="pf-hint"><span>'+wsum+' min this week</span></div></div>'
    +'<div><div class="dlg-eyebrow">Finished tasks by priority</div>'
    +(tot?['A','B','C','D','E'].map(function(k){var p=Math.round(t.byType[k]/tot*100);return '<div class="pf-hbar"><span class="t" style="color:var(--p'+k.toLowerCase()+')">'+k+'</span><span class="tr"><i style="width:'+p+'%;background:var(--p'+k.toLowerCase()+')"></i></span><span class="c">'+t.byType[k]+'</span></div>';}).join(''):'<div class="pf-empty">No finished tasks yet.</div>')
    +'</div></div>';
}
function paintData(){
  var el=$('pf-data');if(!el)return;
  el.innerHTML='<p class="pf-d">A backup is one JSON file with your tasks, notes, calendar, habits and settings. It is the safest copy you can hold, and it restores on any device.</p>'
    +'<div class="pf-row" style="margin-top:0"><button type="button" class="dlg-btn pri" data-act="export">Export a backup</button><button type="button" class="dlg-btn" data-act="import">Restore from backup</button></div>'
    +'<input type="file" id="pf-file" accept="application/json,.json" hidden>'
    +'<div class="pf-links"><button type="button" class="dlg-link" data-legal="privacy">Privacy Policy</button><button type="button" class="dlg-link" data-legal="terms">Terms of Use</button></div>';
}
function paintAboutBloc(){
  var el=$('pf-about-bloc');if(!el)return;
  el.innerHTML='<dl class="pf-kv"><dt>Version</dt><dd>v'+esc(Acct.CONFIG.version)+' <span class="dlg-chip amber" style="margin-left:6px">Released '+esc(Acct.fmtDate(Acct.CONFIG.released))+'</span></dd>'
    +'<dt>Privacy and Terms</dt><dd>v'+esc(L.docVersion)+', effective '+esc(Acct.fmtDate(L.effective))+'</dd></dl>'
    +'<div class="pf-row"><button type="button" class="dlg-btn" data-act="syncset">Settings</button><button type="button" class="dlg-btn" data-act="history">Version history</button><button type="button" class="dlg-btn" data-act="tour">Take the tour</button><button type="button" class="dlg-btn" data-act="keys">Shortcuts</button></div>';
}
function paintDanger(){
  var el=$('pf-danger');if(!el)return;var a=auth();
  el.innerHTML='<p class="pf-d">These cannot be undone. Export a backup first.</p>'
    +'<div class="pf-row" style="margin-top:0"><button type="button" class="dlg-btn danger" data-act="erase">Erase everything on this device</button>'
    +(a.on?'<button type="button" class="dlg-btn danger" data-act="delacct">Delete my account…</button>':'')+'</div>';
}
function paintAbout(){
  var s=readSettings();
  if(draft.name===null)$('pf-name').value=s.userName||'';
  if(draft.about===null)$('pf-about').value=s.userProfile||'';
  $('pf-count').textContent=($('pf-about').value.length)+' / 2000';
  var sw=$('pf-sw'),cur=draft.color||colorKey();
  sw.innerHTML=COLORS.map(function(c){return '<button type="button" role="radio" aria-checked="'+(c[0]===cur)+'" aria-label="'+c[1]+'" data-color="'+c[0]+'" style="--c:'+c[2]+'" tabindex="'+(c[0]===cur?0:-1)+'"></button>';}).join('');
}
function dirty(){
  var s=readSettings(),n=$('pf-name').value.trim(),a=$('pf-about').value.trim();
  var d=n!==(s.userName||'')||a!==(s.userProfile||'').trim()||(draft.color&&draft.color!==colorKey());
  $('pf-save').disabled=!d;
  var st=$('pf-state');if(d){st.textContent='Unsaved changes';st.className='';}
  return d;
}
function paintAll(){paintAbout();paintHero();paintAcct();paintNum();paintData();paintAboutBloc();paintDanger();dirty();var st=$('pf-state');if(st&&!dirty())st.textContent='';}

/* ── actions ─────────────────────────────────────────────────────────────────── */
function save(){
  var s=readSettings(),n=$('pf-name').value.trim(),a=$('pf-about').value.trim().slice(0,2000);
  var prevName=s.userName||'';
  s.userName=n;
  if(!s.userNameSpeech||s.userNameSpeech===prevName)s.userNameSpeech=n;
  s.userProfile=a;
  if(typeof saveAppSettings==='function')saveAppSettings();
  if(draft.color){var p=prof();p.color=draft.color;saveProf(p);}
  draft={name:null,about:null,color:null};
  if(typeof applyBranding==='function')try{applyBranding();}catch(e){}
  paintHero();paintAbout();dirty();
  var st=$('pf-state');st.textContent='Saved ✓';st.className='ok';
  Acct.paintMenu&&Acct.paintMenu();
}
async function eraseDevice(){
  var ok=await Acct.confirm({title:'Erase everything on this device?',danger:true,typed:'ERASE',confirm:'Erase everything',
    html:'<p style="margin:0 0 10px">This deletes every task, note, event, habit, session, setting and key stored by BLOC in this browser, and signs you out here.</p>'
      +'<p style="margin:0 0 10px">It does <strong>not</strong> touch your cloud copy or other devices. If you sync, signing in again would bring the cloud copy back.</p>'
      +'<p style="margin:0"><button type="button" class="dlg-link" id="dlg-erase-exp">Download a backup first</button></p>'});
  if(!ok)return;
  var ks=[];try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^(bloc_|yb_)/.test(k))ks.push(k);}}catch(e){}
  window.__blocErasing=true;
  /* stop the app re-saving its in-memory copy while the page unloads */
  ['pagehide','beforeunload','visibilitychange'].forEach(function(ev){window.addEventListener(ev,function(e){e.stopImmediatePropagation();},true);});
  ks.forEach(function(k){try{localStorage.removeItem(k);}catch(e){}});
  Acct.toast('ERASED — RELOADING…');
  setTimeout(function(){location.replace(location.pathname+location.search);},700);
}
async function deleteAccount(){
  var email=auth().email,c=L.contactEmail;
  var mailBody='Please delete my BLOC account and the cloud copy of my data.\n\nAccount email: '+email;
  var href=c?'mailto:'+encodeURIComponent(c).replace(/%40/g,'@')+'?subject='+encodeURIComponent('Delete my BLOC account')+'&body='+encodeURIComponent(mailBody):'';
  await Acct.confirm({title:'Delete your account',confirm:c?'Close':'Close',cancel:'Cancel',
    html:'<p style="margin:0 0 10px">Account deletion is handled by the operator so that it can be verified. Email the request from <strong>'+esc(email)+'</strong>. We complete it within 30 days (see the Privacy Policy, “How long we keep it”).</p>'
      +(c?'<p style="margin:0"><a class="dlg-link" href="'+esc(href)+'">Open an email to '+esc(c)+'</a></p>':'<p style="margin:0">Use the contact address published on the BLOC website.</p>')
      +'<p style="margin:10px 0 0;color:var(--muted2);font-size:12px">This does not erase data on this device. Use “Erase everything on this device” for that.</p>'});
}
function syncNow(){
  var a=auth();if(!a.on||!a.api)return;
  var b=root.querySelector('[data-act=sync]'),m=$('pf-sync-msg');
  b.disabled=true;b.textContent='Syncing…';m.textContent='';
  Promise.resolve(a.api.syncLocalStorageOverflow()).then(function(r){
    m.textContent=r&&r.ok?((r.accepted||[]).length?'Synced '+r.accepted.length+' item'+(r.accepted.length===1?'':'s')+'.':'Nothing needed syncing.'):((r&&r.error&&r.error.message)||'Sync failed. Try again in a moment.');
  }).catch(function(){m.textContent='Sync failed. Try again in a moment.';}).then(function(){b.disabled=false;b.textContent='Sync now';paintAcct();});
}
function act(name){
  ({
    signup:function(){window.openAuthModal({mode:'signup'});},
    signin:function(){window.openAuthModal({mode:'login'});},
    signout:function(){window.acctLogout();},
    sync:syncNow,
    syncset:function(){if(typeof openSettings==='function'){openSettings();if(typeof fillFocusSettings==='function')fillFocusSettings();}},
    export:function(){if(typeof exportJSON==='function')exportJSON();},
    import:function(){$('pf-file').click();},
    history:function(){Acct.openHistory();},
    tour:function(){if(typeof showView==='function')showView('tasks');setTimeout(function(){if(typeof openGuide==='function')openGuide('start');},320);},
    keys:function(){showView('tasks');setTimeout(function(){var k=$('kbd-hint-trigger');if(k)k.click();},320);},
    erase:eraseDevice,
    delacct:deleteAccount
  }[name]||function(){})();
}
function wire(){
  root.addEventListener('click',function(e){
    var b=e.target.closest('[data-act]');if(b){act(b.dataset.act);return;}
    var c=e.target.closest('[data-color]');if(c){draft.color=c.dataset.color;paintAbout();paintHero();dirty();return;}
  });
  root.addEventListener('keydown',function(e){
    var sw=e.target.closest&&e.target.closest('#pf-sw [role=radio]');
    if(sw&&(e.key==='ArrowRight'||e.key==='ArrowLeft'||e.key==='ArrowDown'||e.key==='ArrowUp')){
      e.preventDefault();var all=[].slice.call($('pf-sw').children),i=all.indexOf(sw),d=(e.key==='ArrowRight'||e.key==='ArrowDown')?1:-1;
      var nx=all[(i+d+all.length)%all.length];draft.color=nx.dataset.color;paintAbout();paintHero();dirty();$('pf-sw').querySelector('[data-color="'+nx.dataset.color+'"]').focus();
    }
  });
  $('pf-name').addEventListener('input',function(){draft.name=this.value;paintHero();dirty();});
  $('pf-about').addEventListener('input',function(){draft.about=this.value;$('pf-count').textContent=this.value.length+' / 2000';dirty();});
  $('pf-save').addEventListener('click',save);
  document.addEventListener('click',function(e){if(e.target&&e.target.id==='dlg-erase-exp'&&typeof exportJSON==='function')exportJSON();});
  root.addEventListener('change',function(e){if(e.target.id==='pf-file'&&typeof importJSON==='function')importJSON(e);});
}

Acct.refreshProfile=function(){if(root&&root.classList.contains('active')){paintHero();paintAcct();paintDanger();}Acct.paintMenu&&Acct.paintMenu();};
Acct.openProfile=function(){if(typeof showView==='function')showView('profile');window.scrollTo({top:0});};

/* ── navigation hooks ────────────────────────────────────────────────────────── */
Acct.profileWire=function(){
  build();
  try{if(typeof BRAND_LABELS!=='undefined')BRAND_LABELS.profile='YOUR PROFILE';}catch(e){}
  var orig=window.showView;
  window.showView=function(name){
    orig.apply(this,arguments);
    var mb=$('ux-more-btn');if(mb)mb.classList.toggle('dlg-on',name==='profile');
    if(name==='profile'){draft={name:null,about:null,color:null};paintAll();var h=$('pf-hero');}
  };
  /* the keyboard shortcut and menu both call openGuide(); the tour only covers the main tabs */
  var og=window.openGuide;
  if(typeof og==='function')window.openGuide=function(k){
    var v=document.querySelector('.view.active');
    if(v&&v.id==='view-profile'&&typeof k!=='string'){Acct.toast('OPEN A TAB, THEN PRESS G FOR ITS TOUR');return;}
    return og.apply(this,arguments);
  };
  window.addEventListener('yitbloc:sync-complete',function(){Acct.refreshProfile();});
  window.addEventListener('yitbloc:storage-threshold',function(){Acct.refreshProfile();});
};

/* ── More menu and phone sheet entries ───────────────────────────────────────── */
Acct.paintMenu=function(){
  document.querySelectorAll('.dlg-prof').forEach(function(b){
    var av=b.querySelector('.dlg-mini-av');if(av){av.style.setProperty('--av',Acct.profileColor());av.textContent=initial();}
    var t=b.querySelector('.dlg-prof-t');if(t){var n=displayName();t.textContent=n?n:'Profile';}
  });
};
Acct.menuWire=function(){
  Acct.when(function(){return $('ux-menu');},function(){
    var menu=$('ux-menu');if(menu.querySelector('.dlg-prof'))return;
    var q=function(sel){return menu.querySelector(sel);};
    function menuItem(label,fn){var b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.textContent=label;b.dataset.f=fn;return b;}
    var p=document.createElement('button');p.type='button';p.setAttribute('role','menuitem');p.className='dlg-prof';p.dataset.v='profile';
    p.innerHTML='<span class="dlg-mini-av" aria-hidden="true"></span><span class="dlg-prof-t">Profile</span>';
    var tabs=[].slice.call(menu.querySelectorAll('.ux-tabs-sec button[data-v]'));
    var lblLayout=[].slice.call(menu.querySelectorAll(':scope > .ux-lbl'))[0];
    var groups=[
      [p,q('[data-c="settings-gear-btn"]')],                                        // you and the app
      tabs,                                                                         // workspace views
      [lblLayout,q('.ux-seg'),q('[data-f="openThemeModal"]')||[].slice.call(menu.querySelectorAll('button')).filter(function(b){return /^Theme/.test(b.textContent);})[0]],                      // how it looks and behaves
      [q('[data-c="rulebook-btn"]'),q('[data-c="guide-btn"]'),q('[data-c="log-btn"]'),q('[data-c="kbd-hint-trigger"]'),menuItem('What’s new','openVersionHistory'),menuItem('Privacy and Terms','openLegal')] // help, history, legal
    ];
    var rb=q('[data-c="rulebook-btn"]');if(rb)rb.textContent='Rulebook (A–E)';
    /* regroup by what the person is trying to do; the delegated click handler keeps working on moved nodes */
    menu.textContent='';
    groups.forEach(function(g,i){
      g.filter(Boolean).forEach(function(n){menu.appendChild(n);});
      if(i<groups.length-1)menu.appendChild(document.createElement('hr'));
    });

    /* quiet line icons so the list scans faster */
    var IC={Settings:'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
      Weekly:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
      Notes:'<path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M9 12h6M9 16h6"/>',
      Library:'<path d="M4 20h16"/><rect x="5" y="5" width="4" height="15" rx="1"/><rect x="11" y="8" width="4" height="12" rx="1"/><path d="M17.5 8l2.5 11"/>',
      Theme:'<circle cx="12" cy="12" r="8"/><path d="M12 4v16"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" fill-opacity=".25"/>',
      Rulebook:'<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/>',
      Take:'<circle cx="12" cy="12" r="8.5"/><path d="M10 8.6l5 3.4-5 3.4z" fill="currentColor" fill-opacity=".25"/>',
      Session:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
      Keyboard:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>',
      What:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
      Privacy:'<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>'};
    [].slice.call(menu.querySelectorAll(':scope > button[role="menuitem"]')).forEach(function(b){
      if(b.classList.contains('dlg-prof')||b.querySelector('svg'))return;
      var key=(b.textContent.trim().split(/[ ’']/)[0]||'');var d=IC[key];if(!d)return;
      b.insertAdjacentHTML('afterbegin','<svg class="dlg-mi" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>');
      b.classList.add('dlg-ic');
    });
    Acct.paintMenu();
  });
  /* phone: the base layer rebuilds #ux-sheet on resize, so re-add after every rebuild */
  Acct.when(function(){return $('ux-sheet');},function(){
    var sheet=$('ux-sheet');
    function add(){
      if(sheet.querySelector('.dlg-sheet-prof'))return;
      [['Profile',function(){Acct.openProfile();}],['Settings',function(){if(typeof openSettings==='function'){openSettings();if(typeof fillFocusSettings==='function')fillFocusSettings();}}],['What’s new',function(){Acct.openHistory();}],['Privacy and Terms',function(){window.openLegal('privacy');}]].forEach(function(x,i){
        var b=document.createElement('button');b.type='button';b.textContent=x[0];if(i===0)b.className='dlg-sheet-prof';
        b.onclick=function(){sheet.classList.remove('open');x[1]();};sheet.appendChild(b);
      });
    }
    add();new MutationObserver(function(){add();}).observe(sheet,{childList:true});
  },80);
};
})();

/* first-run tour offer, and startup. The tour never auto-advances to the next tab, and
   nothing marks it "seen" at startup. */
(function(){
'use strict';
var Acct=window.BLOC_ACCT,$=Acct.$;
var KEY='yb_tour_offer_v1';

/* A new person has made nothing yet: no tasks, sessions, habits, notes, theme choice or account (the calendar ships with two sample events, so it is ignored). */
Acct.isNewUser=function(){
  try{
    var n=function(x){return x&&x.length||0;};
    var a=window.YitblocSync&&window.YitblocSync.getAuthState().authenticated;
    var made=n(typeof tasks!=='undefined'?tasks:0)+n(typeof sessions!=='undefined'?sessions:0)+n(typeof habits!=='undefined'?habits:0)
      +n(typeof npNotes!=='undefined'?npNotes:0)+n(typeof taskCompletionLog!=='undefined'?taskCompletionLog:0);
    return !made&&!a&&!localStorage.getItem('bloc_theme_chosen_v1');
  }catch(e){return false;}
};

var el=null;
function hide(){if(!el)return;var c=el;el=null;c.classList.remove('show');setTimeout(function(){c.remove();},260);}
function decide(state){Acct.set(KEY,{state:state,at:new Date().toISOString()});hide();}
function show(){
  if(el)return;
  el=document.createElement('section');el.className='dlg-card-pop';el.id='dlg-tour-offer';
  el.setAttribute('role','region');el.setAttribute('aria-label','Offer: take a short tour');
  el.innerHTML='<button type="button" class="dlg-x x" data-a="no" aria-label="No thanks, close">✕</button>'
    +'<div class="dlg-eyebrow">New here?</div><h2>Want a one-minute tour?</h2>'
    +'<p>It points out the add bar, your A box and where everything lives. Skip it if you like. You can start it any time from <strong>More → Take the tour</strong>, or by pressing <strong>G</strong>.</p>'
    +'<div class="row"><button type="button" class="dlg-btn pri" data-a="yes">Show me</button><button type="button" class="dlg-btn" data-a="no">Not now</button></div>';
  document.body.appendChild(el);
  el.addEventListener('click',function(e){
    var b=e.target.closest('[data-a]');if(!b)return;
    if(b.dataset.a==='yes'){decide('accepted');if(typeof openGuide==='function')openGuide('start');}
    else decide('dismissed');
  });
  requestAnimationFrame(function(){requestAnimationFrame(function(){if(el)el.classList.add('show');});});
}
function busy(){
  if(Acct.topOverlay&&Acct.topOverlay())return true;
  if(document.querySelector('[id$="overlay"].open,.overlay.open,.side-panel.open,#tour-card'))return true;
  var v=document.querySelector('.view.active');
  return !v||v.id!=='view-tasks'||document.hidden;
}
/* Offer once, only when it will not collide with anything, and only while the person is still new. */
Acct.maybeTourOffer=function(){
  if(Acct.get(KEY,null))return;
  if(!Acct.isNewUser())return;
  var tries=0;
  (function wait(){
    if(Acct.get(KEY,null)||!Acct.isNewUser())return;     // they decided elsewhere, or have started using the app
    if(!busy()){show();return;}
    if(++tries<100)setTimeout(wait,1200);
  })();
};

/* ── startup ─────────────────────────────────────────────────────────────────── */
function init(){
  Acct.legalWire();Acct.authWire();Acct.profileWire();Acct.menuWire();Acct.legalHash();
  setTimeout(function(){Acct.maybeWhatsNew();Acct.maybeTourOffer();},2600);
}
if(document.readyState==='complete')init();else window.addEventListener('load',init);
})();
