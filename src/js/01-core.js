window.uiI=function(n){return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-'+n+'"/></svg>'};
const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,'0');
// BLOC runs on the time zone the user picked (saved in settings), not whatever the browser reports today.
// bocNow()/bocFromMs() return a Date whose local getters (getHours, getDate, toDateString...) show that zone's
// wall-clock time, so every "what day is it" check in the app should go through them instead of `new Date()`.
let BOC_TZ='';
const _tzFmts={};
function validTimezone(tz){if(!tz||typeof tz!=='string')return false;try{new Intl.DateTimeFormat('en-US',{timeZone:tz});return true;}catch(e){return false;}}
// Browsers still report some old zone names (Asia/Rangoon, Asia/Calcutta...). Show people the names they know.
const TZ_MODERN={'Asia/Calcutta':'Asia/Kolkata','Asia/Rangoon':'Asia/Yangon','Asia/Katmandu':'Asia/Kathmandu','Asia/Saigon':'Asia/Ho_Chi_Minh','Asia/Dacca':'Asia/Dhaka','Asia/Thimbu':'Asia/Thimphu','Asia/Ulan_Bator':'Asia/Ulaanbaatar','Europe/Kiev':'Europe/Kyiv','Atlantic/Faeroe':'Atlantic/Faroe','America/Buenos_Aires':'America/Argentina/Buenos_Aires','America/Godthab':'America/Nuuk','Pacific/Truk':'Pacific/Chuuk','Pacific/Ponape':'Pacific/Pohnpei','Pacific/Enderbury':'Pacific/Kanton'};
function modernTimezone(z){const m=TZ_MODERN[z];return m&&validTimezone(m)?m:z;}
// Device zone, VPN/spoof resistant: a VPN never changes the OS clock, but privacy extensions can fake Intl's zone name.
// The real UTC offset (Date#getTimezoneOffset) is cross-checked; if the name disagrees, fall back to the last
// verified zone, then to any zone with the real offset.
const DEVICE_TZ_KEY='bloc_device_tz_v1';
function detectDeviceTimezone(){
  let z='';
  try{z=Intl.DateTimeFormat().resolvedOptions().timeZone;if(validTimezone(z))z=modernTimezone(z);else z='';}catch(e){z='';}
  let real=null;
  try{real=-new Date().getTimezoneOffset();}catch(e){}
  const now=Date.now();
  const matches=t=>{try{return real===null||tzOffsetFor(t,now)===real;}catch(e){return false;}};
  const remember=t=>{try{localStorage.setItem(DEVICE_TZ_KEY,t);}catch(e){}return t;};
  if(z&&matches(z))return remember(z);
  let last='';try{last=localStorage.getItem(DEVICE_TZ_KEY)||'';}catch(e){}
  if(validTimezone(last)&&matches(last))return last;
  let list=[];try{list=Intl.supportedValuesOf('timeZone').map(modernTimezone);}catch(e){}
  let fb=[];try{fb=TZ_FALLBACK;}catch(e){}
  const hit=fb.concat(list).find(t=>validTimezone(t)&&matches(t));
  return hit||z||'UTC';
}
function setBocTimezone(tz){BOC_TZ=validTimezone(tz)?tz:detectDeviceTimezone();}
function tzOffsetFor(tz,ms){
  if(!_tzFmts[tz])_tzFmts[tz]=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'});
  const p={};_tzFmts[tz].formatToParts(new Date(ms)).forEach(x=>{p[x.type]=x.value;});
  const asUTC=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour%24,+p.minute,+p.second);
  return Math.round((asUTC-Math.floor(ms/1000)*1000)/60000);
}
function bocFromMs(ms){
  const tz=BOC_TZ||detectDeviceTimezone();
  const t=new Date(ms+tzOffsetFor(tz,ms)*60000);
  return new Date(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate(),t.getUTCHours(),t.getUTCMinutes(),t.getUTCSeconds(),t.getUTCMilliseconds());
}
function bocNow(){return bocFromMs(Date.now());}
function fmtTime(s){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;return h>0?`${pad(h)}:${pad(m)}:${pad(sc)}`:`${pad(m)}:${pad(sc)}`;}
function fmtDur(s){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);if(h>0&&m>0)return`${h}h ${m}m`;if(h>0)return`${h}h`;if(m>0)return`${m}m`;return`${s}s`;}
const dateStr=()=>bocNow().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
const escHTML=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const escAttr=s=>escHTML(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function taskStampHue(id){let h=0;const s=String(id||'');for(let i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))>>>0;}return h%360;}
function taskStampLetter(text){const t=String(text||'').trim();return t?t[0].toUpperCase():'?';}
function taskStampHTML(task,extraClass,tag,title){
  if(!task)return'';
  tag=tag||'span';
  const hue=taskStampHue(task.id),letter=taskStampLetter(task.text);
  const titleAttr=title?` title="${escHTML(title)}"`:'';
  return`<${tag} class="${extraClass||''}" style="background:hsl(${hue},62%,42%)"${titleAttr}>${letter}</${tag}>`;
}

const URL_RE=/(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+\.[^\s<>"']+)/i;
function isLikelyURL(str){const s=String(str||'').trim();if(!s||/\s/.test(s))return false;return/^https?:\/\//i.test(s)||/^www\.[^\s]+\.[^\s]+$/i.test(s);}
function normalizeURL(raw){const u=String(raw||'').trim();if(!u)return'';if(/^https?:\/\//i.test(u))return u;if(/^www\./i.test(u))return'https://'+u;return u;}
function getHostname(url){try{return new URL(url).hostname.replace(/^www\./i,'');}catch(e){const s=String(url||'');return s.length>28?s.slice(0,28)+'…':s;}}
function extractFirstURL(line){
  const m=String(line||'').match(URL_RE);
  if(!m)return null;
  const url=normalizeURL(m[0]);
  const before=line.slice(0,m.index).replace(/[-:–—|]+\s*$/,'').trim();
  return{url,before};
}

function loadMigratedStore(key, defaultValue, migrateFn){
  let store;
  try{ store = JSON.parse(localStorage.getItem(key) || 'null'); }
  catch(e){ store = null; }
  if (store === null || store === undefined) store = defaultValue;
  if (typeof migrateFn === 'function'){
    const changed = migrateFn(store);
    if (changed) localStorage.setItem(key, JSON.stringify(store));
  }
  return store;
}

function blocStorageReport(){
  const rows=[];
  let total=0;
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    const v=localStorage.getItem(k)||'';
    const bytes=new Blob([v]).size;
    total+=bytes;
    rows.push({key:k,bytes,kb:(bytes/1024).toFixed(1)});
  }
  rows.sort((a,b)=>b.bytes-a.bytes);
  // Browsers cap localStorage around 5 MB; flag early so the caller can archive big keys.
  return {total,rows,nearLimit:total>3*1024*1024};
}


const SETTINGS_KEY='bloc_settings_v1';
const DEFAULT_SETTINGS={
  weeklyPlanningEnabled:true,
  habitsEnabled:true,
  goalsEnabled:true,
  planningChecklistEnabled:false,
  dailyHoursAvailable:8,
  defaultView:'tasks',
  showWelcome:true,
  voiceAutoplay:false,
  voiceEngine:'browser',
  openaiApiKey:'',
  openaiVoice:'alloy',
  timezone:'',
  timezoneConfirmed:false,
  timezoneManual:false,   // true only when the person deliberately picked a zone different from their device
  userName:'',
  userNameSpeech:'',
  userProfile:'',
  agentButtonEnabled:true,
  studyButtonEnabled:false,   // off by default: the one-tap timer pill isn't relevant to everyone
  celebrations:true,
  timerSounds:true,
  timerVoiceAnnouncements:true,
  theme:'default',
  tracyQuotesEnabled:true,
  tracyKnowledgeEnabled:false,
};
const LAST_VIEW_KEY='bloc_last_view_v1';
// One-time: the “I’m studying” pill used to default to ON, and earlier settings writes saved that default into
// nearly every browser. Switch it off once for everyone; anyone who wants it can turn it back on in Settings.
const STUDY_FAB_OFF_MIGRATION_KEY='bloc_study_fab_off_v1';

// BLOC's name, logo and tagline are fixed brand assets: users cannot change them. Older saved settings (and imported
// backups) may still carry these keys, so they are always dropped on load/import.
const LEGACY_BRAND_KEYS=['appName','tagline','logoMode','customLogoData'];
function stripLegacyBrandKeys(o){LEGACY_BRAND_KEYS.forEach(k=>{delete o[k];});return o;}

const TZ_DEVICE_MIGRATION_KEY='bloc_tz_device_v1';
function loadSettings(){
  let saved=null;
  try{saved=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null');}catch(e){saved=null;}
  const merged=stripLegacyBrandKeys(Object.assign({},DEFAULT_SETTINGS,saved||{}));
  // Everyone (new and existing) follows the device time zone, unless they deliberately picked another in Settings.
  // One-time: older builds saved a zone nobody chose (e.g. Yangon), so reset it to the device once.
  try{
    if(!localStorage.getItem(TZ_DEVICE_MIGRATION_KEY)){
      merged.timezoneManual=false;
      localStorage.setItem(TZ_DEVICE_MIGRATION_KEY,'1');
    }
  }catch(e){}
  if(merged.timezoneManual!==true||!validTimezone(merged.timezone)){
    merged.timezone=detectDeviceTimezone();
  }
  try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(merged));}catch(e){}
  try{
    if(!localStorage.getItem(STUDY_FAB_OFF_MIGRATION_KEY)){
      merged.studyButtonEnabled=false;
      localStorage.setItem(STUDY_FAB_OFF_MIGRATION_KEY,'1');
      localStorage.setItem(SETTINGS_KEY,JSON.stringify(merged));
    }
  }catch(e){}
  return merged;
}
let appSettings=loadSettings();
setBocTimezone(appSettings.timezone);
function saveAppSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(appSettings));}catch(e){}}

function baiProfileBlock(){
  const p=(appSettings.userProfile||'').trim();
  return p?`About the person you're talking to, for context on how to phrase things — not a script to follow rigidly:\n${p}\n`:'';
}

function resolveDefaultView(){
  if(appSettings.defaultView==='last'){
    const v=localStorage.getItem(LAST_VIEW_KEY);
    if(v&&['tasks','focus-setup','weekly','habits','calendar','notes'].includes(v))return v;
    return 'tasks';
  }
  if(appSettings.defaultView==='focus')return 'focus-setup';
  return appSettings.defaultView||'tasks';
}

// ---- Fixed brand: name and mark never change; only the label that follows the name does (per screen). ----
const BRAND_NAME='BLOC';
const BRAND_LABELS={
  tasks:'MASTER YOUR DAY',
  'focus-setup':'PROTECT YOUR FOCUS',
  timer:'PROTECT YOUR FOCUS',
  paused:'PROTECT YOUR FOCUS',
  done:'PROTECT YOUR FOCUS',
  weekly:'PLAN YOUR WEEK',
  habits:'BUILD THE HABIT',
  calendar:'OWN YOUR TIME',
  notes:'CAPTURE THE THOUGHT',
  library:'FEED YOUR MIND'
};
const BRAND_DEFAULT_LABEL=BRAND_LABELS.tasks;
let brandView='tasks';
const BRAND_LOGO_SVG=`<svg class="logo-mark" viewBox="0 0 36 36" width="30" height="30" aria-hidden="true">
        <path class="logo-stem" d="M8 5H12V31H8a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="var(--amber)"/>
        <path class="logo-a" d="M14.5 5H21a5.5 5.5 0 0 1 0 11H14.5Z" fill="var(--amber)"/>
        <path class="logo-b" d="M14.5 18H23a6.5 6.5 0 0 1 0 13H14.5Z" fill="var(--amber)" fill-opacity=".55"/>
      </svg>`;
const BRAND_FAVICON="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'><rect width='36' height='36' rx='9' fill='%23e6a118'/><path d='M8 5H12V31H8a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z' fill='%230b0a08'/><path d='M14.5 5H21a5.5 5.5 0 0 1 0 11H14.5Z' fill='%230b0a08'/><path d='M14.5 18H23a6.5 6.5 0 0 1 0 13H14.5Z' fill='%230b0a08' fill-opacity='.6'/></svg>";
function applyBranding(viewName){
  if(viewName)brandView=viewName;
  const label=BRAND_LABELS[brandView]||BRAND_DEFAULT_LABEL;
  const nameEl=$('logo-word-txt'),tagEl=$('logo-tagline-txt');
  if(nameEl)nameEl.textContent=BRAND_NAME;
  if(tagEl&&tagEl.textContent!==label){
    tagEl.textContent=label;
    tagEl.classList.remove('tag-swap');void tagEl.offsetWidth;tagEl.classList.add('tag-swap');
  }
  document.title=`${BRAND_NAME} — ${label}`;
  const mark=$('logo-mark-slot');
  if(mark&&!mark.querySelector('.logo-a'))mark.innerHTML=BRAND_LOGO_SVG;
  const fav=$('page-favicon');
  if(fav)fav.href=BRAND_FAVICON;
}

const agentButtonOn=()=>appSettings.agentButtonEnabled!==false;
const studyButtonOn=()=>appSettings.studyButtonEnabled===true;
function applyFloatingButtons(){
  document.body.classList.toggle('no-agent-fab',!agentButtonOn());
  document.body.classList.toggle('no-study-fab',!studyButtonOn());
  const panel=$('bai-panel');
  if(!agentButtonOn()&&panel&&panel.classList.contains('open')&&typeof baiToggle==='function')baiToggle(false);
}

function openSettings(){
  closeSidePanels('settings-panel');
  populateSettingsForm();
  $('settings-backdrop').classList.add('open');
  $('settings-panel').classList.add('open');
}
function closeSettings(){
  flushAutoSave();
  $('settings-backdrop').classList.remove('open');
  $('settings-panel').classList.remove('open');
}
function populateSettingsForm(){
  $('set-default-view').value=appSettings.defaultView;
  $('set-show-welcome').checked=appSettings.showWelcome;
  $('set-voice-autoplay').checked=appSettings.voiceAutoplay;
  $('set-voice-engine').value=appSettings.voiceEngine;
  $('set-openai-key').value=appSettings.openaiApiKey;
  $('set-openai-voice').value=appSettings.openaiVoice;
  tzFillSelect('set-timezone',appSettings.timezone);
  tzRenderDeviceHint();
  $('set-user-name').value=appSettings.userName;
  $('set-user-name-speech').value=appSettings.userNameSpeech;
  $('set-user-profile').value=appSettings.userProfile||'';
  $('set-agent-btn').checked=appSettings.agentButtonEnabled!==false;
  $('set-study-btn').checked=appSettings.studyButtonEnabled===true;
  $('set-celebrations').checked=appSettings.celebrations;
  $('set-timer-sounds').checked=appSettings.timerSounds;
  $('set-timer-voice').checked=appSettings.timerVoiceAnnouncements!==false;
  $('set-daily-hours').value=appSettings.dailyHoursAvailable;
  $('set-weekly-planning').checked=appSettings.weeklyPlanningEnabled!==false;
  $('set-habits').checked=appSettings.habitsEnabled!==false;
  $('set-goals').checked=appSettings.goalsEnabled!==false;
  $('set-theme').value=appSettings.theme||'default';
  $('set-tracy-quotes').checked=appSettings.tracyQuotesEnabled!==false;
  $('set-tracy-knowledge').checked=appSettings.tracyKnowledgeEnabled===true;
  toggleOpenaiFields();
  renderSetThemes();
  if(typeof fsPaint==='function')fsPaint();
}
function toggleOpenaiFields(){
  const isOpenai=$('set-voice-engine').value==='openai';
  $('set-openai-fields').style.display=isOpenai?'block':'none';
}
function saveSettingsFromForm(){
  applySettingsFromForm();
  closeSettings();
  showToast('SETTINGS SAVED');
}
function applySettingsFromForm(){
  appSettings.defaultView=$('set-default-view').value;
  appSettings.showWelcome=$('set-show-welcome').checked;
  appSettings.voiceAutoplay=$('set-voice-autoplay').checked;
  appSettings.voiceEngine=$('set-voice-engine').value;
  appSettings.openaiApiKey=$('set-openai-key').value.trim();
  appSettings.openaiVoice=$('set-openai-voice').value;
  const tzBefore=appSettings.timezone,tzPicked=$('set-timezone').value;
  if(validTimezone(tzPicked))appSettings.timezone=tzPicked;
  appSettings.timezoneConfirmed=true;
  appSettings.timezoneManual=appSettings.timezone!==detectDeviceTimezone();
  setBocTimezone(appSettings.timezone);
  appSettings.userName=($('set-user-name').value||'').trim()||DEFAULT_SETTINGS.userName;
  appSettings.userNameSpeech=($('set-user-name-speech').value||'').trim()||appSettings.userName;
  appSettings.userProfile=($('set-user-profile').value||'').trim().slice(0,2000);
  appSettings.agentButtonEnabled=$('set-agent-btn').checked;
  appSettings.studyButtonEnabled=$('set-study-btn').checked;
  appSettings.celebrations=$('set-celebrations').checked;
  appSettings.timerSounds=$('set-timer-sounds').checked;
  appSettings.timerVoiceAnnouncements=$('set-timer-voice').checked;
  appSettings.dailyHoursAvailable=parseFloat($('set-daily-hours').value)||8;
  appSettings.weeklyPlanningEnabled=$('set-weekly-planning').checked;
  appSettings.habitsEnabled=$('set-habits').checked;
  appSettings.goalsEnabled=$('set-goals').checked;
  appSettings.theme=$('set-theme').value;
  appSettings.tracyQuotesEnabled=$('set-tracy-quotes').checked;
  appSettings.tracyKnowledgeEnabled=$('set-tracy-knowledge').checked;
  saveAppSettings();
  applyBranding();
  applyFloatingButtons();
  if(typeof applyWisdomTheme==='function')applyWisdomTheme();
  if(appSettings.timezone!==tzBefore){renderTasks();updateLogCount();if(typeof calRender==='function')calRender();}
  if(typeof renderHabits==='function')renderHabits();
  if(typeof renderWeeklyReview==='function'&&$('view-weekly')&&$('view-weekly').classList.contains('active'))renderWeeklyReview();
  if(typeof renderTracyContext==='function'){
    ['tasks','calendar','weekly'].forEach(v=>{
      const el=$('view-'+v);
      if(el&&el.classList.contains('active'))renderTracyContext(v);
    });
  }
}
function resetSettings(){
  if(!confirm('Reset all customization to default? This clears voice, theme, and startup settings (your tasks, calendar and time zone are not touched).'))return;
  appSettings=Object.assign({},DEFAULT_SETTINGS,{timezone:appSettings.timezone,timezoneConfirmed:appSettings.timezoneConfirmed,timezoneManual:appSettings.timezoneManual});
  saveAppSettings();
  applyBranding();
  applyFloatingButtons();
  if(typeof applyWisdomTheme==='function')applyWisdomTheme();
  populateSettingsForm();
  showToast('SETTINGS RESET TO DEFAULT');
}
function exportSettings(){
  const blob=new Blob([JSON.stringify(appSettings,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='bloc-settings.json';
  document.body.appendChild(a);a.click();a.remove();
  showToast('SETTINGS EXPORTED');
}
function importSettings(input){
  const file=input.files&&input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const parsed=JSON.parse(reader.result);
      const keepTz=appSettings.timezone,keepManual=appSettings.timezoneManual;
      appSettings=stripLegacyBrandKeys(Object.assign({},DEFAULT_SETTINGS,parsed));
      if(appSettings.timezoneManual!==true||!validTimezone(appSettings.timezone))appSettings.timezone=keepManual?keepTz:detectDeviceTimezone();
      if(!validTimezone(appSettings.timezone))appSettings.timezone=detectDeviceTimezone();
      setBocTimezone(appSettings.timezone);
      saveAppSettings();applyBranding();applyFloatingButtons();if(typeof applyWisdomTheme==='function')applyWisdomTheme();populateSettingsForm();
      showToast('SETTINGS IMPORTED');
    }catch(e){showToast('COULD NOT READ THAT FILE');}
  };
  reader.readAsText(file);
  input.value='';
}

applyBranding();
applyFloatingButtons();

let autoSaveTimer=null,autoSaveFlashTimer=null;
function flashSaved(){
  const el=$('set-autosave');if(!el)return;
  el.textContent='✓ Saved';el.classList.add('saved');
  clearTimeout(autoSaveFlashTimer);
  autoSaveFlashTimer=setTimeout(()=>{el.classList.remove('saved');},1600);
}
function autoSaveNow(){
  clearTimeout(autoSaveTimer);autoSaveTimer=null;
  try{applySettingsFromForm();flashSaved();}catch(e){}
}
function flushAutoSave(){if(autoSaveTimer)autoSaveNow();}
function autoSaveSoon(){clearTimeout(autoSaveTimer);autoSaveTimer=setTimeout(autoSaveNow,700);}
function isAutoSaveField(el){
  if(!el||!el.id||el.id.indexOf('set-')!==0)return false;
  if(el.type==='file'||el.id.indexOf('set-focus-')===0||el.id==='set-tz-device')return false;
  return !!el.closest('#settings-panel')&&!el.closest('[data-noauto]');
}
document.addEventListener('change',e=>{if(isAutoSaveField(e.target))autoSaveNow();});
document.addEventListener('input',e=>{
  const t=e.target;
  if(isAutoSaveField(t)&&(t.tagName==='TEXTAREA'||['text','password','number'].includes(t.type)))autoSaveSoon();
});

function renderSetThemes(){
  const grid=$('set-theme-grid');
  if(!grid||typeof THEMES==='undefined')return;
  grid.innerHTML=Object.keys(THEMES).map(k=>{
    const t=THEMES[k],on=currentTheme===k;
    return `<button type="button" class="set-theme${on?' on':''}" aria-pressed="${on}" onclick="setPickTheme('${k}')">
      <span class="set-theme-dots"><i style="background:${t.bg}"></i><i style="background:${t.surf2}"></i><i style="background:${t.accent}"></i><i style="background:${t.pc}"></i></span>
      <span class="set-theme-name">${t.label}</span><span class="set-theme-mood">${t.mood}</span>${on?'<span class="set-theme-tick">✓</span>':''}</button>`;
  }).join('');
}
function setPickTheme(k){selectTheme(k);renderSetThemes();}

// Time zone picker: the first-run dialog and the Settings dropdown share the same list + helpers.
// The core clock (bocNow, setBocTimezone, validTimezone) lives in core-helpers.js.
const TZ_FALLBACK=['Pacific/Honolulu','America/Anchorage','America/Los_Angeles','America/Denver','America/Chicago','America/New_York','America/Halifax','America/Sao_Paulo','Atlantic/Azores','UTC','Europe/London','Europe/Paris','Europe/Athens','Africa/Cairo','Africa/Nairobi','Europe/Moscow','Asia/Dubai','Asia/Karachi','Asia/Kolkata','Asia/Dhaka','Asia/Yangon','Asia/Bangkok','Asia/Shanghai','Asia/Singapore','Asia/Tokyo','Australia/Sydney','Pacific/Auckland'];

function tzZoneList(extra){
  let z=[];
  try{z=Intl.supportedValuesOf('timeZone').slice();}catch(e){z=TZ_FALLBACK.slice();}
  z=z.map(modernTimezone);
  if(!z.includes('UTC'))z.push('UTC');
  if(extra&&!z.includes(extra))z.push(extra);
  return z.filter((x,i)=>z.indexOf(x)===i);
}
function tzOffLabel(min){const a=Math.abs(min);return`UTC${min<0?'-':'+'}${pad(Math.floor(a/60))}:${pad(a%60)}`;}
function tzCity(z){return z.split('/').pop().replace(/_/g,' ');}

function tzOptionsHTML(sel){
  const now=Date.now(),groups={};
  tzZoneList(sel).forEach(z=>{
    const g=z.includes('/')?z.split('/')[0]:'Other';
    (groups[g]=groups[g]||[]).push({z,off:tzOffsetFor(z,now)});
  });
  return Object.keys(groups).sort((a,b)=>a==='Other'?1:b==='Other'?-1:a.localeCompare(b)).map(g=>{
    const opts=groups[g].sort((a,b)=>a.off-b.off||a.z.localeCompare(b.z)).map(o=>
      `<option value="${escAttr(o.z)}"${o.z===sel?' selected':''}>(${tzOffLabel(o.off)}) ${escHTML(tzCity(o.z))}</option>`).join('');
    return`<optgroup label="${escAttr(g)}">${opts}</optgroup>`;
  }).join('');
}
function tzFillSelect(id,sel){const el=$(id);if(el)el.innerHTML=tzOptionsHTML(sel);}

function tzNowText(tz){
  try{return new Date().toLocaleString('en-US',{timeZone:tz,weekday:'long',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});}
  catch(e){return'';}
}
function tzPreviewUpdate(){
  const el=$('tz-preview'),sel=$('tz-select');if(!el||!sel)return;
  el.innerHTML=`Right now there it's <strong>${escHTML(tzNowText(sel.value))}</strong>`;
}
function tzRenderDeviceHint(){
  const el=$('set-tz-device');if(!el)return;
  const dev=detectDeviceTimezone();
  el.textContent=`↻ USE THIS DEVICE'S TIME ZONE (${tzCity(dev).toUpperCase()})`;
}
function useDeviceTimezone(){
  const dev=detectDeviceTimezone();
  tzFillSelect('set-timezone',dev);
  showToast('PICKED '+tzCity(dev).toUpperCase()+' — TAP SAVE');
}

// Saves the zone, locks it in, and tells the clock to use it.
function applyTimezone(tz,confirmed){
  appSettings.timezone=validTimezone(tz)?tz:detectDeviceTimezone();
  if(confirmed)appSettings.timezoneConfirmed=true;
  appSettings.timezoneManual=appSettings.timezone!==detectDeviceTimezone();
  setBocTimezone(appSettings.timezone);
  saveAppSettings();
}

// First-run dialog: shown until the person confirms a zone once.
function needsTzSetup(){return appSettings.timezoneConfirmed!==true;}
function tzOpenSetup(){
  const ov=$('tz-overlay');if(!ov)return;
  tzFillSelect('tz-select',appSettings.timezone);
  tzPreviewUpdate();
  ov.classList.add('open');
}
function tzConfirm(){
  const was=isoDate(bocNow());
  applyTimezone($('tz-select').value,true);
  const nowISO=isoDate(bocNow());
  // Starter tasks were dated with the guessed zone; move them if the picked zone is on a different calendar day.
  if(typeof FIRST_LAUNCH_SEEDED!=='undefined'&&FIRST_LAUNCH_SEEDED&&nowISO!==was){
    tasks.forEach(t=>{if(t.dateISO===was)t.dateISO=nowISO;});
    saveT();renderTasks();
  }
  $('tz-overlay').classList.remove('open');
  if(!maybeShowWelcome()){checkDailyReset();}
}

const TRACY_QUOTES=[
  {id:'q01',text:"Successful people are simply those with successful habits.",ctx:['tasks','general']},
  {id:'q02',text:"Develop a sense of urgency in everything you do.",ctx:['tasks','focus']},
  {id:'q03',text:"You can't hit a target you cannot see.",ctx:['goals','planning']},
  {id:'q04',text:"The starting point of all achievement is desire.",ctx:['goals']},
  {id:'q05',text:"Discipline yourself to do what you know you should.",ctx:['focus','tasks']},
  {id:'q06',text:"Action is the real measure of intelligence.",ctx:['tasks','general']},
  {id:'q07',text:"Concentrate single-mindedly on one task until it's complete.",ctx:['focus']},
  {id:'q08',text:"Think on paper — write your goals down.",ctx:['goals','planning']},
  {id:'q09',text:"Small disciplines, repeated daily, become great achievements.",ctx:['weekly','general']},
  {id:'q10',text:"Your future is created by what you do today.",ctx:['weekly','tasks']},
  {id:'q11',text:"Take complete responsibility for your results.",ctx:['weekly','general']},
  {id:'q12',text:"Review your goals and plans every single day.",ctx:['weekly','planning']},
  {id:'q13',text:"Time is your most precious, non-renewable resource.",ctx:['calendar','general']},
  {id:'q14',text:"Plan your day the night before it begins.",ctx:['calendar','planning']},
  {id:'q15',text:"A goal without a deadline is only a wish.",ctx:['goals']},
  {id:'q16',text:"Focus on the tasks that matter most, first.",ctx:['tasks','focus']},
  {id:'q17',text:"Momentum starts the moment you actually begin.",ctx:['focus','tasks']},
  {id:'q18',text:"You become what you think about most of the time.",ctx:['general']},
  {id:'q19',text:"Clarity is the most important concept in productivity.",ctx:['planning','tasks']},
  {id:'q20',text:"Every minute of planning saves ten in execution.",ctx:['calendar','planning']},
  {id:'q21',text:"Never leave the scene of a decision without acting.",ctx:['tasks','weekly']},
  {id:'q22',text:"Good habits are hard to form but easy to live with.",ctx:['weekly','general']},
  {id:'q23',text:"Set the bar high — then discipline yourself to reach it.",ctx:['goals','focus']},
  {id:'q24',text:"Peace of mind comes from doing the right task, right now.",ctx:['tasks','focus']},
];

const TRACY_INSIGHTS=[
  {id:'i01',title:'The Law of Forced Efficiency',ctx:['calendar','weekly','tasks'],
    body:"There's never enough time to do everything — but there's always enough time to do the most important thing. When the day runs short, that's your cue to protect the one task that matters and let the rest wait."},
  {id:'i02',title:'The 80/20 Rule',ctx:['tasks','planning'],
    body:"Roughly 20% of what's on your list will account for 80% of what actually moves things forward. Before diving in, ask which few items would matter most if nothing else got done today."},
  {id:'i03',title:"The Six P's",ctx:['calendar','planning','weekly'],
    body:"Proper prior planning prevents poor performance. A few minutes mapping tomorrow tonight almost always beats scrambling to figure it out once morning arrives."},
  {id:'i04',title:'The Salami Slice Technique',ctx:['tasks','focus'],
    body:"Break an intimidating task into thin, single slices you can finish in one sitting. Momentum builds slice by slice instead of stalling in front of the whole loaf."},
  {id:'i05',title:'The Swiss Cheese Method',ctx:['tasks','focus'],
    body:"Instead of working a big task in order, poke a few random holes in it — five minutes here, ten there — until enough of it is gone that finishing feels within reach."},
  {id:'i06',title:'Zero-Based Thinking',ctx:['weekly','goals'],
    body:"Ask yourself: knowing what I know now, would I start this again today? If the honest answer is no, that's usually a sign to stop, delegate, or drop it."},
  {id:'i07',title:'Clarity, Focus, Concentration',ctx:['focus','general'],
    body:"High performers tend to share three habits: they're clear about what they want, focused on the few things that matter, and able to concentrate on one task without switching until it's done."},
  {id:'i08',title:'Single Handling',ctx:['focus','tasks'],
    body:"Pick a task and work it through to completion before starting the next one. Every half-finished restart costs far more time than it feels like in the moment."},
  {id:'i09',title:'The Momentum Principle',ctx:['focus','tasks'],
    body:"The hardest part of most tasks is the first few minutes. Committing to just five minutes is usually enough to carry you the rest of the way in."},
  {id:'i10',title:'Ten Types of Time',ctx:['calendar','weekly'],
    body:"Not all hours serve the same purpose — planning time, prime time, family time, and rest time each matter differently. A full week protects each type, not just the working hours."},
  {id:'i11',title:'Beating the Instant-Gratification Pull',ctx:['tasks','focus'],
    body:"We naturally drift toward easy, low-value tasks because they feel good right away. Naming your single hardest task each morning — your \"frog\" — and doing it first breaks that pull."},
  {id:'i12',title:'Continuous Learning',ctx:['weekly','general'],
    body:"Investing a little time each day in reading or learning something useful compounds. It's a small habit that quietly separates long-term top performers from everyone else."},
];

function estWisdomDwellMs(text){
  const words=String(text||'').trim().split(/\s+/).filter(Boolean).length;
  const readMs=(words/200)*60000;
  return Math.max(5200,Math.min(15000,Math.round(readMs+1400)));
}

const WISDOM_EXPOSURE_KEY='bloc_wisdom_exposure_v1';
let wisdomExposure=loadMigratedStore(WISDOM_EXPOSURE_KEY,{},null);
function _saveWisdomExposure(){try{localStorage.setItem(WISDOM_EXPOSURE_KEY,JSON.stringify(wisdomExposure));}catch(e){}}
function _markWisdomExposed(id){
  const e=wisdomExposure[id]||{last:0,count:0};
  e.last=Date.now();e.count++;
  wisdomExposure[id]=e;
  _saveWisdomExposure();
}
function _dayIndexSeed(salt){
  const d=bocNow();
  const key=`${d.getFullYear()}${d.getMonth()}${d.getDate()}${salt||''}`;
  let h=0;for(let i=0;i<key.length;i++){h=(h*31+key.charCodeAt(i))>>>0;}
  return h;
}

function _ctxBoost(view){
  if(view==='tasks'&&typeof tasks!=='undefined'){
    const openA=tasks.filter(t=>t.type==='A'&&!t.done).length;
    if(openA>=2)return 'focus';
  }
  if(view==='weekly'&&typeof streakData!=='undefined'&&streakData.current===0)return 'general';
  return null;
}

function pickForContext(pool,view,salt){
  let candidates=pool.filter(x=>x.ctx.includes(view));
  const boostCtx=_ctxBoost(view);
  if(boostCtx){
    const boosted=candidates.filter(x=>x.ctx.includes(boostCtx));
    if(boosted.length>=2)candidates=boosted;
  }
  if(!candidates.length)candidates=pool;
  const now=Date.now();
  const COOLDOWN_MS=1000*60*60*6;
  const scored=candidates.map(wisdom=>{
    const exp=wisdomExposure[wisdom.id];
    const last=exp?exp.last:0,count=exp?exp.count:0;
    return {item: wisdom,last,count,onCooldown:last>0&&(now-last)<COOLDOWN_MS};
  });
  let usable=scored.filter(s=>!s.onCooldown);
  if(!usable.length)usable=scored;
  usable.sort((a,b)=>(a.count-b.count)||(a.last-b.last));
  const tierCount=usable[0].count;
  const topTier=usable.filter(s=>s.count===tierCount);
  const idx=_dayIndexSeed(salt+view)%topTier.length;
  return topTier[idx].item;
}

const _wisdomTimeouts={};
const _wisdomRotationCounts={};
const WISDOM_MAX_ROTATIONS=5;
function _clearWisdomTimer(key){
  if(_wisdomTimeouts[key]){clearTimeout(_wisdomTimeouts[key]);delete _wisdomTimeouts[key];}
}
function _scheduleWisdomRotation(key,dwellMs,onTick){
  _clearWisdomTimer(key);
  const rotations=_wisdomRotationCounts[key]||0;
  if(rotations>=WISDOM_MAX_ROTATIONS)return;
  const backoff=1+Math.min(rotations*0.35,1.8);
  const jitter=0.85+Math.random()*0.3;
  const delay=dwellMs*backoff*jitter;
  _wisdomTimeouts[key]=setTimeout(()=>{
    if(document.hidden){
      _scheduleWisdomRotation(key,dwellMs,onTick);return;
    }
    _wisdomRotationCounts[key]=rotations+1;
    onTick();
  },delay);
}

function quoteStripHTML(q,dwellMs){
  if(!q)return'';
  return`<div class="tracy-strip"><div class="tracy-strip-top"><span class="tracy-strip-mark">“</span><p>${escHTML(q.text)}</p></div><div class="tracy-strip-foot"><span class="tracy-strip-attr">— Brian Tracy</span><a class="tracy-strip-link" href="javascript:void(0)" onclick="openLibraryFromStrip('${q._view}')">Explore the library →</a></div><div class="tracy-dwell-bar"><div class="tracy-dwell-fill" style="animation-duration:${dwellMs}ms"></div></div></div>`;
}
function insightCardHTML(ins,dwellMs){
  if(!ins)return'';
  return`<div class="tracy-insight"><div class="tracy-insight-hd"><span class="tracy-insight-tag">FROM THE BOOK</span><h4>${escHTML(ins.title)}</h4></div><p>${escHTML(ins.body)}</p><div class="tracy-strip-foot"><a class="tracy-strip-link" href="javascript:void(0)" onclick="openLibraryFromStrip('${ins._view}')">Read more on this →</a></div><div class="tracy-dwell-bar"><div class="tracy-dwell-fill" style="animation-duration:${dwellMs}ms"></div></div></div>`;
}
function _renderWisdomStrip(view){
  const stripEl=$('tracy-strip-'+view);
  if(!stripEl)return;
  _clearWisdomTimer('strip-'+view);
  if(appSettings.tracyQuotesEnabled===false){stripEl.innerHTML='';stripEl.style.display='none';return;}
  const q=pickForContext(TRACY_QUOTES,view,'quote');
  _markWisdomExposed(q.id);
  const dwell=estWisdomDwellMs(q.text);
  stripEl.innerHTML=quoteStripHTML(Object.assign({_view:view},q),dwell);
  stripEl.style.display='';
  _scheduleWisdomRotation('strip-'+view,dwell,()=>{
    if(stripEl.isConnected&&$('view-'+view)&&$('view-'+view).classList.contains('active'))_renderWisdomStrip(view);
  });
}
function _renderWisdomInsight(view){
  const insEl=$('tracy-insight-'+view);
  if(!insEl)return;
  _clearWisdomTimer('insight-'+view);
  if(appSettings.tracyKnowledgeEnabled!==true){insEl.innerHTML='';insEl.style.display='none';return;}
  const ins=pickForContext(TRACY_INSIGHTS,view,'insight');
  _markWisdomExposed(ins.id);
  const dwell=estWisdomDwellMs(ins.body);
  insEl.innerHTML=insightCardHTML(Object.assign({_view:view},ins),dwell);
  insEl.style.display='';
  _scheduleWisdomRotation('insight-'+view,dwell,()=>{
    if(insEl.isConnected&&$('view-'+view)&&$('view-'+view).classList.contains('active'))_renderWisdomInsight(view);
  });
}
function renderTracyContext(view){
  _wisdomRotationCounts['strip-'+view]=0;
  _wisdomRotationCounts['insight-'+view]=0;
  _renderWisdomStrip(view);
  _renderWisdomInsight(view);
}

function applyWisdomTheme(){
  const t=(appSettings.theme==='ledger')?'ledger':'';
  if(t)document.documentElement.setAttribute('data-theme',t);
  else document.documentElement.removeAttribute('data-theme');
}
applyWisdomTheme();


const LIBRARY_TOPICS=[
  {
    id:'procrastination',
    problem:"I keep putting off the thing I most need to do",
    title:'Procrastination & Getting Started',
    icon:'⏳',
    ctx:['tasks','focus'],
    keywords:['procrastinate','avoid','avoiding','delay','stuck','starting','lazy'],
    reads:[
      {id:'p-r1',title:'Why the first two minutes are the hardest',
        body:"Most resistance to a task is front-loaded. The starting cost — deciding, opening the file, remembering where you left off — is almost always higher than the cost of actually doing the next two minutes of work. That's why a task can feel unbearable to start and completely manageable once you're twenty seconds into it. The practical move is to stop negotiating with the whole task and commit to a laughably small opening: not \"write the report,\" just \"open the document and write one sentence.\" Momentum tends to carry you past that point on its own.",
        tip:'Pick the smallest possible first step — small enough that skipping it would feel silly — and do only that.'},
      {id:'p-r2',fromInsight:'i11',
        tip:"Before opening anything else today, name your one hardest task out loud and do three minutes of it first."},
      {id:'p-r3',title:"It's usually not laziness, it's mood repair",
        body:"Procrastination research keeps landing on the same finding: people don't delay tasks because they're lazy, they delay tasks that make them feel something uncomfortable — bored, anxious, inadequate — because putting it off brings instant relief. That relief is what gets reinforced, not the task itself, which is why the same avoidance pattern keeps returning on similar tasks. Naming the actual feeling (\"I think I'm avoiding this because I'm worried it won't be good enough\") tends to loosen its grip more than another round of willpower or a stricter deadline.",
        tip:"Next time you catch yourself avoiding something, name the feeling underneath it in one short sentence before deciding what to do."},
      {id:'p-r4',fromInsight:'i04',
        tip:'Cut your next avoided task into a slice you could finish in under ten minutes, and start with only that slice.'},
      {id:'p-r5',fromBookChapter:{bookId:'eat-that-frog',chapterId:'etf-6'}},
    ],
  },
  {
    id:'chaos',
    problem:"My day feels chaotic and I never seem to have a plan",
    title:'Structure & Daily Planning',
    icon:'🗓️',
    ctx:['calendar','planning'],
    keywords:['chaotic','unplanned','disorganized','schedule','structure','plan'],
    reads:[
      {id:'c-r1',title:'Plan the night before, not the morning of',
        body:"By the time morning arrives, you've already spent decision-making energy on what to wear, what to eat, and how to respond to the first message that landed. Adding \"what should today even look like\" on top of that is asking a partly-depleted brain to do your clearest thinking of the day. Mapping tomorrow the night before — even just three lines — moves that decision to a moment when you have more of yourself left to make it well, and it means the day already has a shape before it has a chance to fill up with other people's priorities.",
        tip:'Before you close your laptop tonight, write down the one thing tomorrow needs to include, no matter what else happens.'},
      {id:'c-r2',fromInsight:'i03',
        tip:'Give tomorrow five minutes tonight — a rough order for your top three items is enough to count.'},
      {id:'c-r3',fromInsight:'i10',
        tip:'Look at this week and mark one block that isn\u2019t work — planning, rest, or people — and protect it like a meeting.'},
      {id:'c-r4',title:'A time block beats an open-ended to-do',
        body:"Work tends to expand to fill whatever time is available for it — a task with no boundary will happily eat an entire afternoon, not because it needed to, but because nothing told it to stop. A plain list of tasks has no edges; a calendar with blocks does. Giving a task a fixed window, even a rough one, changes the question from \"when will I get to this\" to \"what can I get done in the next 40 minutes,\" which is a much easier question for a chaotic day to actually answer.",
        tip:'Pick your next open task and give it a hard end time, even an arbitrary one — then stop when it hits, finished or not.'},
      {id:'c-r5',fromBookChapter:{bookId:'master-your-time',chapterId:'mytl-5'}},
    ],
  },
  {
    id:'focus',
    problem:"I can't focus, my attention keeps drifting",
    title:'Focus & Attention',
    icon:'🎯',
    ctx:['focus'],
    keywords:['focus','distract','distracted','attention','concentrate','concentration'],
    reads:[
      {id:'f-r1',fromInsight:'i08',
        tip:'Before switching tasks, ask: is this actually finished, or am I just tired of it? Finish the current slice first if you can.'},
      {id:'f-r2',title:"Why switching tasks costs more than it feels like",
        body:"When you jump from one task to another, attention doesn't fully follow — a portion of it lingers on the task you just left, still half-processing loose ends, even while you've physically moved on. Researchers call this attention residue, and it means the first stretch of a \"new\" task is often being worked on by a partially-occupied mind, not a fresh one. This is why constant switching feels busy but produces less than it should: you're rarely giving any single task your full attention, even when it looks like you are.",
        tip:'Before switching tasks, write one line about where you left off — it closes the loop enough to actually leave it behind.'},
      {id:'f-r3',title:"Design the room, don't rely on willpower",
        body:"Willpower is an unreliable thing to build a focus strategy on — it fluctuates by time of day, stress, and how many other decisions you've already made. Environment is more reliable. Every distraction removed in advance is one less moment where willpower has to win a fight it might lose. Phone in another room instead of face-down on the desk, one browser tab instead of eleven, a closed door instead of an open one — none of these require discipline in the moment, because the decision was already made earlier, when you had more of it to spend.",
        tip:'Before your next focus block, physically remove your phone from the room — not silence it, remove it.'},
      {id:'f-r4',fromInsight:'i05',
        tip:'On a task you keep bouncing off of, set a 10-minute timer and just poke a hole in it — you don\u2019t have to start at the beginning.'},
      {id:'f-r5',fromBookChapter:{bookId:'deep-work',chapterId:'dw-1'}},
    ],
  },
  {
    id:'overwhelm',
    problem:"I have too much on my plate and don't know where to start",
    title:'Prioritization & Overload',
    icon:'🧭',
    ctx:['tasks','planning'],
    keywords:['overwhelm','overwhelmed','busy','toomuch','priority','prioritize','overload'],
    reads:[
      {id:'o-r1',fromInsight:'i02',
        tip:'Look at today\u2019s full list and circle the two or three items that would matter most if nothing else got done.'},
      {id:'o-r2',title:"Not urgent doesn't mean not important",
        body:"Urgency is loud — a notification, a reply someone's waiting on, a deadline today. Importance is usually quiet — the report due in three weeks, the habit you keep meaning to start, the conversation you keep postponing. Without a deliberate check, a full plate trains you to respond only to what's loud, because loud things have a way of always winning the moment. The fix isn't ignoring urgent things; it's protecting a small, non-negotiable slice of time for the important-but-quiet ones before the day fills up with noise.",
        tip:"Before you open your inbox or messages today, spend ten minutes on one important-but-not-urgent item first."},
      {id:'o-r3',fromInsight:'i06',
        tip:'Scan your open list for one thing you\u2019d honestly say no to starting today — and drop, delegate, or delay it.'},
      {id:'o-r4',title:'Write it down to get it out of your head',
        body:"An open task that's only living in your memory doesn't stay quiet — it resurfaces at odd moments, competing for attention even while you're doing something else entirely. This is sometimes called the Zeigarnik effect: unfinished, uncaptured tasks tend to nag at working memory until they're written down somewhere you trust. The relief isn't from finishing the task, it's from knowing it won't be forgotten. A full list can look overwhelming on the page, but it's almost always lighter than the same list held loosely in your head.",
        tip:'Do a two-minute brain dump right now — every open loop you can think of, captured as a task, no sorting yet.'},
      {id:'o-r5',fromBookChapter:{bookId:'eat-that-frog',chapterId:'etf-3'}},
    ],
  },
  {
    id:'followthrough',
    problem:"I start strong but rarely finish what I begin",
    title:'Momentum & Follow-Through',
    icon:'🔥',
    ctx:['tasks','weekly'],
    keywords:['finish','finishing','followthrough','momentum','quit','abandon','unfinished'],
    reads:[
      {id:'ft-r1',fromInsight:'i09',
        tip:'On something you\u2019ve been circling, commit to five minutes only — no obligation to keep going after that.'},
      {id:'ft-r2',title:'Decide the trigger, not just the goal',
        body:"\"I'll work on it this week\" rarely survives contact with a real week. Research on implementation intentions — simple if-then plans like \"if it's 9am, I'll open the draft\" — shows they meaningfully outperform vague good intentions, because they remove the in-the-moment decision of when to start. The goal stays the same either way; what changes is whether \"starting\" depends on you remembering to feel motivated, or on a specific, already-decided trigger showing up. Triggers are far more reliable than motivation, because they don't ask you to feel like it first.",
        tip:'For one task you keep not getting to, write the exact trigger: "When ___ happens, I will start ___."'},
      {id:'ft-r3',title:"Finishing is a skill, not a feeling",
        body:"Almost every project has a middle stretch where the initial excitement has worn off and the finish line still feels far away — motivation dips there predictably, for nearly everyone, on nearly everything. The mistake is treating that dip as a signal something's wrong and waiting to feel ready again before continuing. It's more useful to expect the dip in advance and have a plan for it: a mini-deadline, telling someone what you're finishing, or simply scheduling the next session before motivation is required to show up on its own.",
        tip:'For your current unfinished thing, set one small, concrete checkpoint before the real deadline — and tell someone about it.'},
      {id:'ft-r4',fromInsight:'i01',
        tip:'When the day runs short, protect the one task that matters most and let the rest slide — on purpose, not by accident.'},
      {id:'ft-r5',fromBookChapter:{bookId:'atomic-habits',chapterId:'ah-6'}},
    ],
  },
  {
    id:'habits',
    problem:"My habits never seem to stick",
    title:'Building Habits That Last',
    icon:'🔁',
    ctx:['weekly','general'],
    keywords:['habit','habits','routine','consistency','streak'],
    reads:[
      {id:'h-r1',fromInsight:'i12',
        tip:'Pick a fixed 10-minute slot this week for one small thing you want to become routine — same time, every day.'},
      {id:'h-r2',title:'Attach it to something you already do',
        body:"A new habit that depends on remembering to do it is fragile — memory is unreliable exactly when you're busy or tired, which is when habits matter most. A more durable approach is to anchor the new behavior to one that's already automatic: right after you pour your morning coffee, right after you close your laptop for the day. The existing habit becomes the reminder, so the new one doesn't need willpower to be remembered — only to be done, which is a much smaller ask.",
        tip:'Pick one habit you already do without thinking, and attach your new habit immediately before or after it.'},
      {id:'h-r3',title:'Track the streak, not just the outcome',
        body:"Outcomes from a new habit are often slow to show up — the benefit of a daily planning habit or a focus routine compounds quietly for weeks before it's obviously paying off. A visible streak gives you something to react to immediately, long before results arrive, which keeps the behavior going through the part where nothing seems to be happening yet. This is exactly why a simple streak counter works as well as it does: it's not the goal, it's a stand-in reward that keeps you showing up until the real one catches up.",
        tip:'Keep your streak visible somewhere you\u2019ll actually see it daily, and treat "don\u2019t break the chain" as its own small goal.'},
      {id:'h-r4',title:"Miss once, don't miss twice",
        body:"A single missed day rarely breaks a habit on its own — life happens, and one gap is just a gap. What actually derails a habit is the second missed day in a row, because that's when a slip starts turning into a new pattern. Treating a miss as data instead of failure — and treating the very next opportunity as non-negotiable — protects far more of a habit's momentum than trying to never miss at all, which usually isn't realistic anyway.",
        tip:"If you missed yesterday, make today's version of the habit as small as it needs to be — but don't skip it too."},
      {id:'h-r5',fromBookChapter:{bookId:'atomic-habits',chapterId:'ah-2'}},
      {id:'h-r6',title:'The "21 days" number isn\'t real',
        body:"The claim that a habit takes exactly 21 days to form gets repeated so often it feels like settled science — it isn't. It traces back to a 1960s observation about how long it took patients to stop noticing a change after plastic surgery, which was never a study of habit formation at all. The actual research on habits, tracking people building a real daily behavior, found it took 66 days on average for the behavior to start feeling automatic — and the range across individuals was enormous, from as little as 18 days to as long as 254, depending on the person and the habit.\n\nWhat moves that number the most is difficulty: a simple habit like drinking a glass of water settles in fast, while something demanding like a full workout routine can take months longer. Consistency matters too — doing something every day builds automaticity faster than doing it on a random or occasional schedule, since the behavior needs repeated, predictable exposure to stop requiring conscious effort. None of this means a habit is fragile or failing just because day 21 came and went and it still feels effortful — that's closer to normal than the myth ever let on.",
        tip:'Expect a new habit to feel like effort for weeks, not days — judge it by whether you\u2019re still showing up, not by whether it feels automatic yet.'},
    ],
  },
  {
    id:'busyness',
    problem:"I'm busy all day but don't feel like I'm getting anywhere",
    title:'Effectiveness Over Busyness',
    icon:'⚖️',
    ctx:['weekly','general'],
    keywords:['busy','busyness','effective','effectiveness','productive','stuck','treadmill'],
    reads:[
      {id:'b-r1',fromInsight:'i07',
        tip:'Before your next work session, write one sentence naming exactly what "done" looks like for it.'},
      {id:'b-r2',title:'Busy is a feeling, effective is a fact',
        body:"Clearing a dozen small emails produces a genuine sense of accomplishment — it's fast, visible, and satisfying in the moment. Whether it moved anything important forward is a separate question entirely, and the two get confused constantly, because both feel like \"getting things done\" from the inside. A day can be full of real activity and still be nearly empty of real progress. The only reliable way to catch that gap is to periodically step back and ask what actually changed this week — which is the entire purpose of a weekly review, not just a formality.",
        tip:'At the end of today, name one thing that\u2019s meaningfully different now versus this morning — if you can\u2019t, that\u2019s useful information.'},
      {id:'b-r3',fromInsight:'i01',
        tip:'Look at today\u2019s list and ask: if I only get one thing done, which one actually needs to be it?'},
      {id:'b-r4',title:'More output isn\u2019t automatically more progress',
        body:"It's tempting to treat hours worked or tasks checked off as the real measure of a good day, because both are easy to count. But ten small, low-stakes tasks finished can add up to less real movement than one well-chosen task half-finished. The number of things done is a measure of activity; whether the right things got attention is a measure of effectiveness, and a busy day can easily score high on the first while scoring low on the second without that ever being obvious in the moment.",
        tip:'Before adding a new task to today, ask whether it belongs on the list at all, or just feels good to check off.'},
      {id:'b-r5',fromBookChapter:{bookId:'master-your-time',chapterId:'mytl-4'}},
    ],
  },
  {
    id:'energy',
    problem:"I'm running on empty and can't keep this pace up",
    title:'Energy & Sustainable Pace',
    icon:'🔋',
    ctx:['weekly','calendar'],
    keywords:['tired','exhausted','burnout','burnedout','energy','rest','pace'],
    reads:[
      {id:'e-r1',title:'Match your hardest task to your best hours',
        body:"Most people have a window — often a few hours, usually earlier in the day — where alertness and focus genuinely peak, and other stretches where they reliably dip. Scheduling is rarely built around this; the hardest task often just gets whatever slot is left over, frequently the worst one. Protecting your actual best window for the one task that needs your full brain, and pushing lower-stakes work into the dips, tends to produce noticeably better results without adding a single extra hour to the day.",
        tip:'Notice the next hour you feel sharpest today, and protect it for your hardest task tomorrow — don\u2019t give it away to email.'},
      {id:'e-r2',fromInsight:'i10',
        tip:'Look at this week\u2019s calendar and add one real, protected rest block — treat it as fixed, not optional.'},
      {id:'e-r3',title:"Rest is part of the plan, not the reward for finishing it",
        body:"Sustained high output — in sports, performance, and ordinary work — depends on built-in recovery, not just willingness to keep pushing. Treating rest as something you've earned only after everything is done means it keeps getting postponed indefinitely, since the list is rarely actually finished. The more durable approach treats recovery as a scheduled requirement, the same way sleep or meals are, rather than a discretionary reward that has to compete with everything else for a slot it usually loses.",
        tip:'Put one rest block on the calendar this week as a fixed appointment, not a "if I have time" maybe.'},
      {id:'e-r4',fromInsight:'i11',
        tip:'If today feels heavy, do your hardest task first anyway — it\u2019s usually lighter than carrying the dread of it all day.'},
      {id:'e-r5',fromBookChapter:{bookId:'deep-work',chapterId:'dw-5'}},
    ],
  },
];

const LIBRARY_BOOKS=[
  {
    id:'eat-that-frog',
    title:'Eat That Frog!',
    author:'Brian Tracy',
    subtitle:'21 Great Ways to Stop Procrastinating and Get More Done in Less Time',
    icon:'🐸',
    blurb:"Tracy's whole argument fits in one image: every day has a 'frog' on it — the biggest, ugliest, most important task you're most likely to put off. Eat it first, before you do anything else, and the rest of the day gets easier by comparison.",
    chapters:[
      {id:'etf-1',title:'Set the Table',
        body:"Before you can prioritize anything, you need a genuinely clear target — a specific, written outcome, not a vague direction. Tracy's starting point is that most people who feel unproductive aren't actually lazy; they're unclear. Without a defined goal, every task looks roughly as important as every other task, so there's nothing to sort by. The fix is deceptively simple: write down exactly what you're trying to accomplish, set a deadline for it, and list every step you can think of to get there — even out of order. A messy list built against a clear goal beats a tidy list built against no goal at all, because only the first one tells you which items on it actually matter.\n\nThis matters most at the start of anything ambitious, where the temptation is to jump straight into a task list without first pinning down what success actually looks like. A goal like 'improve the project' can absorb infinite tasks, because almost anything could plausibly count as improvement, which is exactly why it produces sprawling lists that never quite finish. A goal like 'ship version two with the three features clients asked for by the 15th' can't absorb infinite tasks, because most possible tasks obviously don't serve it. The specificity does the prioritizing work before you've consciously prioritized anything: a vague goal makes every task look roughly equally justified, while a sharp one makes most tasks visibly irrelevant on sight — a far easier discipline to sustain than ranking an undifferentiated pile of equally plausible items one by one.\n\nInside BLOC specifically, this is worth doing before a goal ever becomes a row of tasks: write the outcome as one sentence in Notes or a Goal first, then break it into A-E tasks against that sentence. Tasks created without that anchor tend to drift toward whatever's easiest to add, rather than what the outcome actually requires.",
        tip:'Pick one goal that\u2019s been vague in your head and write it as one specific sentence with a real deadline, today.'},
      {id:'etf-2',title:'Plan Every Day in Advance',
        body:"Tracy is emphatic that planning is not optional overhead — it's where the real leverage in a day gets created, before the day even starts. His rule of thumb is that each minute spent planning saves multiple minutes in execution, because a written plan removes dozens of small in-the-moment decisions that would otherwise eat time and mental energy one at a time. The specific habit he pushes hardest is planning tomorrow at the end of today, in writing, using yesterday's unfinished items as the starting point for tomorrow's list — so nothing quietly falls through the cracks between one day and the next, and every morning starts already pointed somewhere.\n\nThe reason this has to happen the night before, specifically, rather than first thing in the morning, comes down to willpower and decision fatigue. By evening you already know exactly what's unfinished, what's coming tomorrow, and what actually matters — that information is fresh and doesn't need to be reconstructed. By morning, some of it has to be re-remembered, and it competes with the dozens of other small decisions a fresh day brings. Tracy's stronger version of this habit is to work from a running master list: everything you might need to do, in one place, and each day's plan is a short extraction from it rather than a list built from memory. That way nothing depends on remembering what you meant to do — it only depends on consulting a list that already exists.\n\nThis is exactly what BLOC's daily task list rewards: entering tomorrow's items tonight, while today's list is still fresh, rather than opening the app cold in the morning and reconstructing it from memory. The habit costs a couple of minutes and removes the very first, most draining decision of the next day.",
        tip:'Tonight, write tomorrow\u2019s list before you stop working today — carry over anything unfinished first.'},
      {id:'etf-3',title:'Apply the 80/20 Rule to Everything',
        body:"Also called the Pareto Principle, this is the idea that roughly 20% of your activities will account for roughly 80% of your results — and Tracy applies it almost mechanically to daily task lists. If you have ten items, two of them are worth more than the other eight combined, even though every item on the list probably feels similarly urgent while you're looking at it. His practical test: before starting anything, ask which single item, if it were the only thing you finished today, would matter most in a month. That item usually isn't the easiest or the most urgent-feeling one — which is exactly why it's the one most likely to get quietly skipped without a deliberate check.\n\nThe uncomfortable part of applying this rule honestly is that it tends to point at tasks you'd rather not do, not tasks that are easiest to justify doing. The urgent-feeling 20% is usually full of small, satisfying, low-stakes items — replying to messages, tidying details — precisely because they're easy and give quick closure. The valuable 20% is often a single harder, longer, less immediately rewarding task that doesn't announce itself as urgent at all. Tracy's version of the rule isn't really about spending less time on the trivial many; it's about refusing to let the trivial many go first just because they're more inviting. In practice that means treating the high-value 20% as the literal first item of the day, before anything on the other list gets touched, rather than hoping it gets a fair turn later.\n\nThis is the honest test for what belongs in category A versus everything else: not what feels urgent this morning, but what would matter most in a month. Tasks that pass that test earn the A label; tasks that don't, however pressing they feel, belong lower — even if they'd otherwise be first in line.",
        tip:'Look at your list right now and put a star next to the one item that would matter most in a month — do that one before anything else today.'},
      {id:'etf-4',title:'Consider the Consequences',
        body:"Tracy's definition of a truly important task is simple and a little uncomfortable: it's whatever has the most serious consequences, positive or negative, attached to doing or not doing it. Judged this way, many of the tasks that feel urgent — replying quickly, tidying small things up — turn out to have almost no real consequence either way, while a handful of quieter tasks carry consequences that compound for months or years. This reframes procrastination itself: putting something off isn't really a time-management failure, it's usually a sign the task's true consequences haven't been weighed honestly yet. Once they are, the task tends to stop feeling optional.\n\nConsequences aren't always obvious on the surface, which is why this question needs to be asked deliberately rather than assumed. A task can feel urgent and carry almost no real consequence — a message that could wait a day with no effect on anything. Another task can feel entirely optional and carry consequences that compound for months, like a habit, a relationship, or a skill you keep deferring building. Tracy's frame for this is time span: tasks with consequences reaching further into the future deserve proportionally more priority today, even if nothing about them feels urgent right now, because the cost of delay is quietly accumulating in the background the whole time it sits undone, invisible until it isn't.\n\nThis is effectively what BLOC's A-through-E rating already asks: A for real consequences, down to E for almost none. Rating honestly, by consequence rather than by how loud a task feels right now, is what keeps the category meaningful instead of drifting toward everything eventually being marked A.",
        tip:'For your most-avoided task, write one sentence on what happens in three months if it stays undone — then one on what happens if it\u2019s done this week.'},
      {id:'etf-5',title:'Practice Creative Procrastination',
        body:"Since you genuinely cannot do everything, Tracy argues you're already procrastinating on something — the only real choice is whether you're doing it deliberately or by accident. Creative procrastination means consciously choosing your low-value tasks in advance and deferring them on purpose, freeing up the time and attention that would otherwise leak into them by default. This flips the usual guilt around procrastination on its head: the goal isn't to eliminate it entirely, which isn't realistic, but to aim it — squarely at the busywork that was never going to move anything forward, so the delay costs you nothing important.\n\nThe discomfort with this idea usually isn't about the logic — it's about the guilt of consciously choosing not to do something, versus the more familiar guilt of an ever-growing unfinished list. Most people procrastinate passively: things slip because there wasn't a decision made about them either way, and the slipping feels like failure. Creative procrastination replaces that passive slippage with an active choice, made in advance, about exactly which low-value items will not get done this week — and that choice, once made, stops quietly nagging, because it's a decision rather than an oversight. The tasks that get deliberately set aside this way are rarely missed later; if they were genuinely important, zero-based thinking would have caught that on review.\n\nIn practice, this looks like deliberately leaving certain C, D, or E tasks unstarted, or moving them to Someday, rather than letting them silently accumulate at the bottom of every day's list. A task sitting in Someday isn't failing to get done — it's been consciously deferred, which is a very different thing, and reviewing that Someday list occasionally is enough to catch anything that quietly became important later.",
        tip:'Name one low-value task you\u2019ll deliberately not do this week, on purpose, and take it off today\u2019s list.'},
      {id:'etf-6',title:'The ABCDE Method',
        body:"This is Tracy's own priority system, and it's stricter than a simple A-through-E category label might suggest. An 'A' task is anything with a real consequence for not doing it; a 'B' task has only a mild consequence; a 'C' task has no consequence at all — it would be pleasant to do but nothing happens if it doesn't. The rule that makes this method work is a hard one: you're never allowed to do a B task while an A task sits undone, no matter how much more appealing the B task is in the moment. Multiple A's get ranked A-1, A-2, A-3 by consequence, and A-1 is where the day actually starts — not wherever feels easiest to begin.\n\nThe discipline this method actually demands is resisting the pull toward B and C tasks specifically because they're easier and offer faster completion — a kind of task that's satisfying to finish but doesn't move much. Tracy's insistence on never touching a B task while an A sits open is aimed directly at that pull, since without the rule, most people will quietly justify 'just clearing a few small things first' and lose the morning to them. When there are multiple A's, the ranking into A-1, A-2, A-3 matters just as much as the letter itself — treating all A-tasks as interchangeable just relocates the same avoidance one level down, letting A-2 or A-3 get done first simply because they're less intimidating than A-1.\n\nBLOC's own A-through-E task categories are a direct descendant of this exact method — which is also why the app's Smart Pick and MIT widget lean so heavily on category A. Rating a task honestly by real consequence, not by urgency or ease, is what makes the whole category system worth trusting.",
        tip:'Rank today\u2019s open A-tasks by consequence — A-1, A-2, A-3 — and start on A-1 specifically, not whichever A feels easiest.'},
    ],
  },
  {
    id:'master-your-time',
    title:'Master Your Time, Master Your Life',
    author:'Brian Tracy',
    subtitle:'The Breakthrough System to Get More Results, Faster, in Every Area of Your Life',
    icon:'⏱️',
    blurb:"Tracy's broader time-management system — the book this app's short quotes and knowledge bites are drawn from. Where Eat That Frog is almost entirely about daily prioritization, this one zooms out to how a whole week, and a whole life, gets structured.",
    chapters:[
      {id:'mytl-1',title:'The Law of Forced Efficiency',
        body:"Tracy's observation is blunt: there is never enough time to do everything, but there is always enough time to do the most important thing. Most people treat a shrinking day as a crisis that demands doing everything faster; Tracy treats it as useful information — a forcing function that reveals what actually matters once everything can't be done. The practical shift is to stop asking 'how do I fit it all in' and start asking 'given that I can't fit it all in, what absolutely has to happen today.' That second question, asked honestly, tends to produce a much shorter and much more useful list than the first one ever does.\n\nThe instinct under real time pressure is usually the opposite of what this law recommends: speed up on everything, try to compress every item a little, and hope the whole list somehow fits. That approach tends to produce a day where nothing gets a proper amount of attention and the one task that actually mattered gets the same rushed treatment as everything else. Forced efficiency asks a harder but more useful question up front: if only one thing gets done well today, what does it need to be — and then gives that one thing the full time it needs, letting lower-value items compress, slip, or drop entirely. The day that results is shorter on activity but longer on actual outcomes than the day spent trying to rush through everything at once.\n\nThis is what BLOC's Crowded Day warning is quietly pointing at: not a reason to cram harder, but a signal to look at the MIT widget and ask which one or two A-tasks are actually worth protecting today, letting everything else compress or slide without guilt.",
        tip:'When today runs short, don\u2019t speed up everything — pick the one task you\u2019d protect if the day got cut in half, and protect only that one.'},
      {id:'mytl-2',title:'Zero-Based Thinking',
        body:"The test Tracy proposes is uncomfortable on purpose: for any ongoing commitment, task, or habit, ask 'knowing what I know now, would I start this today if I hadn't already started it?' Most people keep doing things not because they still make sense, but because stopping feels like it would waste the time already invested — a bias economists call the sunk-cost fallacy. Zero-based thinking deliberately ignores that sunk cost, since it's already gone either way, and looks only at whether the thing is worth continuing from this exact point forward. Applied regularly, it tends to surface at least one commitment on most people's plates that would never have been chosen if it weren't already underway.\n\nWhat makes zero-based thinking difficult in practice isn't the question itself, which is simple, but the discomfort of admitting that time, money, or effort already spent doesn't actually justify continuing something that no longer makes sense. This is the same trap that keeps people finishing a bad movie because they've already sat through half of it — the remaining decision (leave now or stay) is completely separate from the sunk cost (the time already spent), but the two get emotionally tangled together. Applied to commitments, projects, or habits, the same tangle shows up constantly: a project that's absorbed months keeps getting funded partly because of the months already spent, not because the months ahead are expected to pay off. Zero-based thinking forces the second question to be asked on its own.\n\nThe Weekly Review is a natural home for this question: looking back at a recurring task or ongoing commitment and asking honestly whether it would still be started today. A task that keeps getting carried forward week after week without ever quite mattering is exactly what this check is built to catch.",
        tip:'Pick one recurring commitment and honestly answer: if I weren\u2019t already doing this, would I start it today? If not, plan how to end it.'},
      {id:'mytl-3',title:'Ten Types of Time',
        body:"A common failure mode Tracy identifies is treating 'time' as one undifferentiated resource that all gets managed the same way — when in practice a week actually contains several distinct kinds: planning time, prime time (your highest-focus hours), time with people who matter, rest and recovery time, and more. A calendar that only tracks work hours is silently letting every other type get squeezed by whatever work demands in the moment, since nothing is protecting them. Tracy's fix is to schedule the non-work types with the same seriousness as a meeting — not as whatever's left over, but as fixed commitments that get planned first, precisely because nothing else will protect them automatically.\n\nMost calendars, left unmanaged, drift toward protecting only the type of time that has external pressure attached to it — meetings, deadlines, other people's requests — because those come with built-in enforcement. Nobody is going to escalate if your planning time or rest time gets skipped this week; the cost is invisible and delayed, which is exactly why it's the type most likely to quietly disappear first under pressure. Tracy's fix is structural rather than motivational: block the non-work types of time into the calendar with the same specificity as an external meeting, so that protecting them doesn't depend on remembering to value them in the moment — it depends only on the calendar already having a fixed appointment there that other things have to work around instead.\n\nBLOC's Weekly Planning budget and the Habits section's rest-day logic are both structural nods to this idea — time categories beyond raw task output that get their own protected space instead of being whatever's left over once category A through E is handled.",
        tip:'Pick one non-work \u201ctype of time\u201d you\u2019ve been neglecting and put a specific block for it on this week\u2019s calendar, before the rest of the week fills in.'},
      {id:'mytl-4',title:'The Law of Three',
        body:"Looking across a person's full range of responsibilities, Tracy's claim is that just three tasks typically account for around 90% of the real value they produce — everything else is comparatively minor, however busy it keeps someone. The exercise is to list everything you do in a normal week or month, then ask which three items, if you did only those and nothing else, would still deliver almost all of the value. Those three usually aren't the tasks that generate the most visible activity; they're the ones with the most leverage. Once identified, the goal becomes protecting time for those three specifically, and treating everything else as negotiable around them.\n\nThe list of three that actually produces most of the value is rarely the same as the list of three that produces the most visible activity — and that gap is where most people's time quietly leaks away. A task can generate a great deal of motion, messages sent, meetings attended, items checked off, while contributing almost nothing to the handful of outcomes that would matter most in hindsight. The exercise only works if it's done honestly, in writing, looking backward at a real week rather than forward at an idealized one: what actually produced the value, not what felt the busiest. Once the three are identified, the practical shift is to schedule them first, at your best hours, and let everything else fit in the remaining space rather than the other way around.\n\nThis maps closely onto BLOC's Weekly Planning outcomes, capped at five for exactly this reason: forcing a short, honest list of what actually matters this week, rather than letting the week's plan expand to match however many tasks happen to exist.",
        tip:'List everything you did this week, then circle the three items that produced almost all of the real value — protect time for exactly those next week.'},
      {id:'mytl-5',title:'Batching Similar Tasks',
        body:"Every switch between different kinds of work — replying to messages, then writing, then a quick call, then back to messages — carries a hidden restart cost: re-loading context, refocusing, getting back to where you were mentally. Tracy's suggestion is to group similar small tasks into a single dedicated block instead of letting them interrupt everything else throughout the day: all email at two set times, all calls back-to-back, all errands in one trip. The tasks themselves don't get any faster this way, but the number of costly context-switches between different types of work drops sharply, which is where most of the actual time savings comes from.\n\nThe instinct that fights against batching is the belief that handling something the moment it appears is more responsive, more efficient, or simply more considerate — reply right away, return the call now, handle the small task immediately. In practice this constant availability to interruption is one of the more expensive habits a day can have, because each small interruption doesn't just cost the minute it takes; it costs the refocusing time on whatever it interrupted, paid again on the way back in. Batching doesn't mean being slower to respond to things that matter — it means deciding in advance when the response happens, so that similar small demands get handled together, in one focused pass, instead of scattered across the day as a long series of costly re-entries into and out of focus.\n\nThe Calendar's time-blocking is the natural place to put this into practice: grouping similar small tasks — quick replies, short calls, minor edits — into one dedicated block instead of letting them interrupt whatever else the day was supposed to be protecting.",
        tip:'Pick one type of small recurring task (messages, calls, errands) and batch it into one fixed block today instead of handling it whenever it arrives.'},
      {id:'mytl-6',title:'Written Goals: The Four-Step Method',
        body:"An unwritten goal, Tracy argues, is really just a wish — it has no deadline, no defined shape, and nothing to measure progress against, so it's easy to quietly deprioritize when anything else feels more urgent. His method for turning a wish into something that actually gets pursued has four steps: decide exactly what you want, write it down in specific and measurable terms, set a firm deadline (and sub-deadlines for anything long-term), and list every action you can think of to get there. The list doesn't need to be complete or in order at the start — the act of writing it is what turns a vague intention into something concrete enough to actually work from.\n\nThe written part of this method is doing more work than it first appears to. A goal held only in your head is elastic — it can quietly shrink, shift, or get reinterpreted under pressure without you fully noticing, because there's no fixed version to compare against. A written goal, with a specific measure and a real date attached, can't drift the same way; either the written version gets met or it doesn't, and that clarity is uncomfortable precisely because it removes the option of a vague, retroactive redefinition of success. The fourth step — listing every action you can think of, out of order, unfiltered — matters because it turns an intimidating abstract goal into a concrete list of ordinary, doable items, which is usually far less daunting than the goal looked like before it was broken down.\n\nThis is essentially what BLOC's Goals feature exists to hold: a written, specific target with linked tasks tracking real progress toward it, rather than a goal that only ever existed as an intention in the back of your mind.",
        tip:'Take one goal that\u2019s only existed in your head so far and run it through all four steps, in writing, right now.'},
    ],
  },
  {
    id:'atomic-habits',
    title:'Atomic Habits',
    author:'James Clear',
    subtitle:'An Easy & Proven Way to Build Good Habits & Break Bad Ones',
    icon:'⚛️',
    blurb:"Clear's core claim is that small, consistent habits compound into large results over time, and that the most reliable way to change behavior is to redesign your systems and identity — not to rely on motivation, which is naturally inconsistent.",
    chapters:[
      {id:'ah-1',title:'Identity-Based Habits',
        body:"Clear draws a distinction between outcome-based habits ('I want to run a marathon') and identity-based habits ('I am someone who runs'). Outcome-based goals are usually temporary — once achieved, or once motivation dips, the behavior tends to stop, because it was never anchored to anything beyond the goal itself. Identity-based habits work differently: every time you perform the behavior, you're casting a small vote for the type of person you believe yourself to be, and over time that accumulated evidence becomes self-reinforcing. The practical implication is to decide who you want to become first, then ask what a person like that would do today — and do that, even in a small way.\n\nThe reason identity-based habits tend to outlast outcome-based ones comes down to what happens after the initial goal is reached, or after motivation naturally dips. An outcome goal has a finish line — once crossed, or once it stops feeling urgent, there's no built-in reason to continue the behavior that got you there. An identity has no finish line in the same way; 'I am someone who exercises' doesn't get satisfied by one workout, so the behavior keeps making sense long after any single goal would have stopped requiring it. This is also why relapse after reaching a goal is so common: the goal was the whole engine, and once it's met, the engine has nothing left to run on unless the identity behind it was also being built the entire time, quietly, one small repeated action at a time.\n\nThe Habits section's streak counter works on exactly this principle: each daily checkmark isn't really about that one day, it's a small piece of evidence toward becoming the kind of person who does this — which is why a visible streak tends to motivate longer than the original goal alone.",
        tip:'Finish this sentence and act on it today: "I am someone who ___." Do one small thing that person would do.'},
      {id:'ah-2',title:'The Four Laws of Behavior Change',
        body:"Clear's central framework treats every habit as a loop with four stages — cue, craving, response, reward — and offers one lever for each: make it obvious, make it attractive, make it easy, make it satisfying. To build a good habit, you design for all four; to break a bad one, you invert them — make it invisible, unattractive, difficult, unsatisfying. The insight underneath the framework is that willpower is an unreliable long-term strategy, since it fluctuates with stress, sleep, and how many other decisions you've already made that day — while a well-designed environment and loop keeps working even on the days your motivation doesn't show up.\n\nThe four laws work best understood as ordered filters, not independent tips to apply randomly. If a habit never gets triggered because its cue is invisible, the other three laws are irrelevant — it simply won't happen often enough to matter. If it's triggered but unappealing, attractiveness needs work before ease or reward will help. Most failed habits fail at the earliest law that applies to them, which is why troubleshooting a habit that isn't sticking should start at the cue, not jump straight to willpower or motivation. A habit with an obvious, specific cue — not 'exercise more' but 'the moment I set my coffee cup down' — has already solved the hardest part before the behavior itself is even asked to happen.\n\nSetting up a new habit in BLOC is a natural moment to apply all four laws at once: pick a specific, obvious time and place (cue), pair it with something you enjoy (attractive), start with the smallest version that still counts (easy), and let the streak counter supply the immediate reward (satisfying).",
        tip:'Pick one habit you want to build and design just its cue: decide exactly when and where it will happen, in one specific sentence.'},
      {id:'ah-3',title:'Make It Attractive',
        body:"People are more likely to repeat behaviors that feel good in the moment, so Clear suggests deliberately pairing a habit you need with one you already want — a technique sometimes called temptation bundling, such as only allowing yourself a favorite podcast while doing a task you'd otherwise avoid. He also points to the pull of social norms: habits practiced by a group you belong to, or aspire to belong to, become far more attractive by association, which is part of why joining a community around a habit tends to outperform pursuing the same habit alone.\n\nAttractiveness isn't a fixed property of a behavior — it's largely constructed by anticipation, and anticipation can be deliberately engineered rather than waited for. Temptation bundling works by borrowing the appeal of something you already crave and lending it to something you need but don't naturally want, so the craving arrives attached to the harder behavior instead of competing against it. Social proof works on a slower but stronger timescale: behaviors practiced by people you belong to, or want to belong to, absorb some of that group's appeal simply through association, which is part of why the exact same habit can feel like a chore done alone and feel attractive done inside a community built around it.\n\nOne direct way to apply this inside BLOC: attach a habit to a Focus Timer session you already look forward to, or let completing it contribute toward a reward you've set up — borrowing appeal from something you already want to do, so the habit rides along on motivation that already exists, instead of having to generate its own from scratch every single time.",
        tip:'Pair your least-appealing recurring task with something you genuinely enjoy, and only allow yourself the enjoyable part while doing it.'},
      {id:'ah-4',title:'Make It Easy',
        body:"The most consistent predictor of whether a habit sticks isn't how motivated you feel, Clear argues, but how much friction stands between you and starting it — and friction is often invisible until you go looking for it. His well-known 'two-minute rule' scales any habit down to a version so small it can be started in under two minutes: not 'read for an hour' but 'read one page,' not 'work out' but 'put on workout clothes.' The small version isn't meant to be the whole habit forever — it's meant to remove the friction of starting, since starting is reliably the hardest and most frequently skipped part of any habit.\n\nFriction is often invisible to the person experiencing it, because it doesn't feel like an obstacle — it feels like a reason. 'I don't have time' or 'I'm too tired' often really means 'the activation energy required to start this particular version of the habit is higher than I have available right now,' which is a solvable design problem, not a character flaw. Shrinking a habit to its two-minute version isn't giving up on the real goal; it's removing the friction that was actually preventing the habit from happening at all, on the theory that a habit performed at low intensity consistently beats a habit performed at high intensity rarely. Once the two-minute version is reliably happening, scaling it up tends to be far easier than starting the full version ever was.\n\nIf a habit in BLOC keeps getting skipped, the fix usually isn't more willpower — it's shrinking the habit itself to a version so small it takes under two minutes, then letting the streak carry it from there once starting stops being the hard part.",
        tip:'Shrink one habit you keep skipping down to a version that takes under two minutes, and do only that version today.'},
      {id:'ah-5',title:'Make It Satisfying',
        body:"Behaviors that get rewarded immediately are far more likely to repeat than ones whose payoff is delayed for weeks or months — which is exactly the problem with most genuinely worthwhile habits, since their real benefit is slow to show up. Clear's fix is to manufacture a small, immediate reward that isn't the eventual result: the satisfaction of marking an X on a calendar, watching a streak grow, or simply the visible feeling of 'I did the thing.' The habit tracker itself becomes a source of quick reward, bridging the gap between doing the behavior today and the outcome it's actually building toward, which might not be visible for a long time yet.\n\nThe mismatch between immediate reward and delayed benefit is the single biggest reason genuinely good habits are hard to sustain and genuinely bad ones are hard to break: bad habits usually reward instantly and cost slowly, while good habits usually cost effort instantly and reward slowly. A habit tracker doesn't change that underlying mismatch, but it inserts a small, real, immediate reward — the visible mark of having done it — right at the moment the behavior happens, which is exactly where the reward was previously missing. Over time the tracker itself can become almost beside the point, since the identity and the momentum take over, but in the early period, before the real benefit is visible, it's often the only thing standing between the habit and the plateau where most habits quietly die.\n\nThis is precisely the function BLOC's streak counters and completion badges serve: an immediate, visible reward the moment a habit is logged, standing in for the real benefit — better focus, better health, more done — which is usually too slow to notice day to day on its own.",
        tip:'Set up one simple, visible way to mark today\u2019s habit as done the moment you finish it — a checkmark, a streak, anything immediate.'},
      {id:'ah-6',title:'The Plateau of Latent Potential',
        body:"Clear's illustration is an ice cube in a slightly-too-warm room: the temperature climbs from 25 to 31 degrees with no visible change at all, and then one more degree — 32 — and it suddenly melts. Habits behave the same way. Early progress is often invisible, not because nothing is happening, but because the effects are compounding quietly below a threshold where they'd be noticeable. Most people quit during exactly this invisible stretch, mistaking a lack of visible results for a lack of real progress, right before the compounding would have become obvious. The only way through the plateau is to keep going on the evidence that the system is sound, not on the evidence of visible results yet.\n\nThis is also why comparing your own progress to someone further along the same path is misleading in a specific way: their current results reflect years of compounding that isn't visible in what they're doing today, only in what they've already built. Judged purely by daily actions, an early-stage habit and a well-established one can look almost identical — the same short run, the same modest reading session — while producing wildly different outcomes because of how long the compounding has had to run. The only reliable signal available during the invisible stretch is whether the actions are actually happening consistently, not whether the results are visible yet, because the results are structurally delayed regardless of how correctly the habit is being performed.\n\nThis is worth remembering specifically during a Weekly Review that shows a habit's numbers looking flat: flat visible numbers don't necessarily mean nothing is building underneath. The habit log across several weeks is a better judge of whether a habit is working than any single week's compliance rate alone.",
        tip:'For a habit you\u2019ve been tempted to quit, commit to two more weeks purely because the system is sound — not because you\u2019ve seen results yet.'},
    ],
  },
  {
    id:'deep-work',
    title:'Deep Work',
    author:'Cal Newport',
    subtitle:'Rules for Focused Success in a Distracted World',
    icon:'🧠',
    blurb:"Newport's argument is that the ability to focus without distraction on a cognitively demanding task is becoming both rarer and more valuable — and that it's a skill you can deliberately train, not a fixed trait you either have or don't.",
    chapters:[
      {id:'dw-1',title:'Deep Work vs. Shallow Work',
        body:"Newport draws a hard line between deep work — cognitively demanding effort performed without distraction, the kind that pushes your abilities and creates real value — and shallow work: logistical, low-concentration tasks like most email and routine admin, which are easy to do while distracted and easy to replicate. The trap is that shallow work fills a day and feels productive, precisely because it's easy to make visible progress on, while deep work is harder to start and easier to postpone. Newport's claim is that shallow work rarely produces anything that couldn't be replicated with modest training, while deep work is where genuinely valuable, hard-to-replace output actually gets made.\n\nThe asymmetry between the two matters more than the definitions themselves: shallow work is easy to start, easy to measure, and easy to feel productive doing, while deep work is harder to start, slower to show results, and easy to postpone in favor of something that produces a quicker sense of accomplishment. Over a career or a project, this asymmetry compounds — years spent mostly in shallow work produce a great deal of activity and comparatively little that couldn't have been done by someone with far less skill or experience. The scarcity Newport points to isn't the ability to work hard; it's the ability to protect blocks of time long enough, and distraction-free enough, for genuinely demanding cognitive work to happen at all, which is becoming rarer as more environments default to constant availability.\n\nThis is essentially the case BLOC's Focus Timer makes structurally: a dedicated, timed block explicitly set aside for one task, distinct from the open, unprotected stretches of a day where shallow work naturally tends to take over by default.",
        tip:'Look at tomorrow\u2019s calendar and label each block deep or shallow — then protect the deep ones the way you\u2019d protect a meeting.'},
      {id:'dw-2',title:'The Four Philosophies of Deep Work Scheduling',
        body:"Newport outlines several ways people structure deep work into a life, from monastic (eliminating shallow obligations almost entirely, rare and extreme) to bimodal (dedicating full days or weeks to deep work, alternating with normal periods) to rhythmic (a fixed daily block, protected at the same time every day) to journalistic (dropping into deep work opportunistically whenever a gap appears, which takes practice to do well). The rhythmic approach tends to work best for people with regular daily obligations, since it doesn't require dramatic schedule changes — it just requires the same block, defended the same way, every single day, until it becomes closer to automatic than optional.\n\nNone of the four scheduling philosophies is inherently superior — the right one depends heavily on how much control a person has over their own calendar and obligations. Monastic scheduling requires near-total control and is realistic for very few people; bimodal requires the ability to disappear for stretches, which suits some project-based work but not most jobs with daily obligations; journalistic requires a trained, practiced ability to drop into focus on short notice, which usually only develops after other approaches have built the underlying skill. Rhythmic scheduling is the most broadly practical starting point precisely because it asks the least of a person's circumstances — it only requires one defended block, at a consistent time, which most schedules can accommodate even without dramatic restructuring.\n\nOf the four, the rhythmic approach maps most directly onto BLOC's Focus Setup: the same preset, same rough time, defended daily — which asks far less of a day's structure than trying to clear an entire day or week for deep work at once.",
        tip:'Pick one fixed time slot, same time each day this week, and protect it as a non-negotiable deep work block — even if it\u2019s only 45 minutes.'},
      {id:'dw-3',title:'Embrace Boredom',
        body:"Newport's counterintuitive claim is that the ability to concentrate is a trainable skill, and that constantly reaching for a phone or a quick distraction the moment attention gets uncomfortable is actively training the opposite skill — the ability to be perpetually distracted. Every time boredom is filled instantly with stimulation, the brain gets a little more conditioned to expect that relief on demand, which makes sustained, undistracted focus progressively harder to sustain later, even during deliberately scheduled deep work. His suggestion is to practice tolerating boredom on purpose — a few minutes without a phone in line, on a walk, between tasks — as direct training for the same muscle deep work depends on.\n\nThe mechanism behind this is that attention, like a muscle, adapts to how it's actually used, not to how a person intends to use it. Reaching for stimulation at the first sign of boredom repeatedly trains a fast, automatic association between mild discomfort and immediate relief, and that association doesn't stay contained to idle moments — it follows into deep work sessions as a lowered tolerance for the natural discomfort of hard, unstimulating concentration. Deliberately sitting with boredom, even briefly and outside of work, is training in the literal sense: repeated practice tolerating the urge to switch attention away, which is the same skill a difficult stretch of focused work demands, just exercised in a lower-stakes setting first.\n\nA Focus Timer break is a small, low-stakes place to practice this deliberately: resisting the pull to fill the break with a phone the instant the timer ends is direct training for the same tolerance the next focus block will require.",
        tip:'Pick one small daily moment of boredom today — a line, a walk, a wait — and deliberately don\u2019t reach for your phone through it.'},
      {id:'dw-4',title:'Drain the Shallows',
        body:"Since shallow work reliably expands to fill however much time is available for it, Newport argues the fix isn't better time management within shallow work, but a hard cap on how much of the day it's allowed to occupy at all. His suggestion is to actually schedule every hour of the workday in advance, including the shallow tasks, so shallow work has a visible boundary instead of an open-ended claim on whatever time deep work doesn't defend first. A day with unscheduled gaps tends to get filled by whatever's easiest and most available — almost always shallow work — simply because nothing else was scheduled to fill it instead.\n\nShallow work is rarely eliminated by working faster at it; it's controlled by capping how much of it is allowed to happen, since it will otherwise expand to consume whatever time isn't explicitly protected from it. A useful distinction Newport draws is between shallow work that's genuinely necessary — some coordination and administration keeps any real effort running — and shallow work that only feels necessary because it's the path of least resistance in an unstructured day. Draining the shallows isn't about resenting all shallow work; it's about noticing that most days default to far more of it than is actually required, simply because nothing was scheduled to stop it from filling every available gap.\n\nThe Calendar's hour-by-hour blocking is the practical tool for this: giving shallow tasks an explicit, capped slot instead of an open-ended claim on whatever time deep work doesn't defend first, so the shallow work has a visible ceiling rather than no boundary at all — and once that block ends, the remaining shallow items simply wait for tomorrow's slot.",
        tip:'Block out tomorrow hour by hour, including the shallow tasks — give shallow work an explicit ceiling instead of an open claim on your day.'},
      {id:'dw-5',title:'The Shutdown Ritual',
        body:"Unfinished work has a way of continuing to occupy attention well after the workday technically ends — a background hum of half-formed thoughts about open tasks that quietly taxes both rest and the ability to focus the next day. Newport's fix is a fixed, repeatable ritual performed at a set time each day: review every open task and commitment, confirm each one either has a plan or has been consciously deferred, then say a closing phrase to yourself ('done for the day' or similar) as a deliberate signal that work is actually over. The specific words matter less than the consistency — the brain learns to trust the signal and actually let go, rather than continuing to quietly churn on unresolved threads into the evening.\n\nWhat makes an explicit shutdown ritual necessary, rather than just quietly stopping at the end of the day, is that the brain doesn't reliably distinguish between a task that's finished and a task that's merely stopped being worked on — both can trigger the same lingering, low-grade attention that follows you into the evening. The ritual's real function is to give the brain external confirmation that everything open has either a plan or a deliberate deferral, which is different information than simply closing the laptop. Skipping the ritual doesn't save the few minutes it takes; it usually costs more than that back later, in reduced quality of rest and in reduced quality of attention the next day, since neither one fully recovers while a backlog of half-tracked open loops is still quietly running in the background.\n\nA nightly pass through BLOC's task list — confirming every open item either has a plan, a place on tomorrow's list, or a deliberate deferral — serves as a natural shutdown ritual, giving the same closing signal this idea is built around.",
        tip:'Tonight, review every open task, confirm each has a plan or a deferred date, then say a fixed closing phrase to signal you\u2019re actually done.'},
      {id:'dw-6',title:'Attention Capital & the Cost of Context-Switching',
        body:"Newport treats sustained, undivided attention as a finite resource — attention capital — that gets spent down with every switch between tasks, not just with the passage of time. Research on attention residue (echoed elsewhere in this library) shows that part of your focus lingers on a task you've just left even after switching to something new, meaning the 'cost' of checking a notification isn't just the seconds it takes, it's the reduced quality of attention on whatever comes right after. Protecting attention capital means treating context-switches as expensive on purpose — batching shallow interruptions instead of handling them as they arrive, so deep work blocks stay genuinely uninterrupted rather than just nominally scheduled.\n\nThe cost of a context switch isn't paid once, at the moment of switching — it's paid gradually, as attention slowly disengages from the old task and re-engages with the new one, meaning the first several minutes after any switch are operating on reduced cognitive capacity even when it doesn't feel that way. A single notification checked during a deep work block doesn't just cost the seconds spent reading it; it costs the quality of attention for a meaningful stretch afterward, which is why 'I'll just glance at it and get right back to work' consistently underestimates the actual price. Protecting attention capital means treating access to a task, not just time on a task, as the scarce resource — batching interruptions into dedicated windows so that deep blocks stay genuinely uninterrupted rather than merely scheduled that way on paper.\n\nTurning notifications off during a BLOC Focus Timer session, rather than leaving them on silent, is a direct application of this: silent notifications still interrupt attention the moment they're glimpsed, even without a sound, which quietly taxes the very session they're supposed to be staying out of.",
        tip:'During your next deep work block, keep notifications fully off rather than "on silent" — silent still interrupts attention even without a sound.'},
    ],
  },
];

/* ── Library visuals: designed topic icons + real book covers (Open Library, with a designed fallback) ── */
const LIB_TOPIC_ICON={procrastination:'hourglass',chaos:'calendar',focus:'target',overwhelm:'compass',followthrough:'flame',habits:'repeat',busyness:'scale',energy:'battery','no-system':'sprout',exams:'edit','school-life':'graduation',phone:'phone',group:'users',inbox:'mail','saying-no':'hand',estimates:'timer',delegating:'link',selfdirected:'home','morning-evening':'contrast',decisions:'shuffle',perfectionism:'gem','low-motivation':'battery-low',goals:'mountain','my-guides':'bookmark'};
const LIB_CAT_COLOR={start:'var(--nav-tasks)',study:'var(--nav-calendar)',focus:'var(--nav-focus)',work:'var(--nav-wisdom)',plan:'var(--pc)',habits:'var(--nav-log)',mind:'var(--nav-weekly)',mine:'var(--amber)'};
const LIB_ART={"hourglass":"<rect x=\"7\" y=\"3\" width=\"18\" height=\"3.5\" rx=\"1.75\" fill=\"#8a5a3c\"/><rect x=\"7\" y=\"25.5\" width=\"18\" height=\"3.5\" rx=\"1.75\" fill=\"#8a5a3c\"/><path d=\"M9 6.5h14c0 6-5 7.5-5 9.5s5 3.5 5 9.5H9c0-6 5-7.5 5-9.5S9 12.500 9 6.500z\" fill=\"#bfe6ff\"/><path d=\"M11 6.5h10c0 3-3 5-5 6-2-1-5-3-5-6z\" fill=\"#ffb02e\"/><path d=\"M12 25.5c0-3 2-4 4-5 2 1 4 2 4 5z\" fill=\"#ff7a1a\"/>","calendar":"<rect x=\"3\" y=\"6\" width=\"26\" height=\"23\" rx=\"4.5\" fill=\"#fff\"/><path d=\"M3 10.500A4.500 4.500 0 017.500 6h17a4.500 4.500 0 014.500 4.500V14H3z\" fill=\"#ff5a5f\"/><rect x=\"9\" y=\"3\" width=\"3.200\" height=\"6.500\" rx=\"1.600\" fill=\"#2b2f45\"/><rect x=\"19.800\" y=\"3\" width=\"3.200\" height=\"6.500\" rx=\"1.600\" fill=\"#2b2f45\"/><circle cx=\"10\" cy=\"19\" r=\"2.200\" fill=\"#3b8bff\"/><circle cx=\"17\" cy=\"23\" r=\"2.200\" fill=\"#ffb02e\"/><circle cx=\"22.500\" cy=\"18.500\" r=\"2.200\" fill=\"#3ddc84\"/><circle cx=\"11.500\" cy=\"25\" r=\"1.700\" fill=\"#9b5cff\"/><circle cx=\"24\" cy=\"25\" r=\"1.700\" fill=\"#ff6fb5\"/>","target":"<circle cx=\"15\" cy=\"18\" r=\"12.500\" fill=\"#ff5a5f\"/><circle cx=\"15\" cy=\"18\" r=\"8.800\" fill=\"#fff\"/><circle cx=\"15\" cy=\"18\" r=\"5.200\" fill=\"#ff5a5f\"/><circle cx=\"15\" cy=\"18\" r=\"2.100\" fill=\"#fff\"/><path d=\"M15 18L26 6\" stroke=\"#8a5a3c\" stroke-width=\"2.200\" stroke-linecap=\"round\"/><path d=\"M23 2.500l6.500 1.500-1.500 6.500-2.500-2.500-2.500-2.500z\" fill=\"#ffd23f\"/>","compass":"<circle cx=\"16\" cy=\"16\" r=\"14\" fill=\"#3b8bff\"/><circle cx=\"16\" cy=\"16\" r=\"10.500\" fill=\"#fff\"/><path d=\"M22.500 9.500L18.500 18 14 13.500z\" fill=\"#ff5a5f\"/><path d=\"M9.500 22.500L13.500 14 18 18.500z\" fill=\"#2b2f45\"/><circle cx=\"16\" cy=\"16\" r=\"1.700\" fill=\"#fff\"/><circle cx=\"16\" cy=\"6.800\" r=\"1\" fill=\"#3b8bff\"/>","flame":"<path d=\"M16 1.500c1.200 5.500 9 8.500 9 17a9 9 0 01-18 0c0-4.500 2.500-6.500 4.500-8.500.2 3.200 1.300 4.300 2.500 4.300 0-4.300-1.300-8.600 2-12.800z\" fill=\"#ff6a1a\"/><path d=\"M16 14c1.200 3.500 5.500 5.500 5.500 9.800a5.500 5.500 0 01-11 0c0-2.200 1.200-3.400 2.300-4.500.2 2 1.200 2.400 1.200 2.400.2-3.300-.2-5.400 2-7.700z\" fill=\"#ffd23f\"/>","repeat":"<path d=\"M5 15.500a11 11 0 0118.500-8l2.500-3v10h-10l3.600-3.600A6.500 6.500 0 009.500 15.500z\" fill=\"#3ddc84\"/><path d=\"M27 16.500a11 11 0 01-18.500 8L6 27.500v-10h10l-3.600 3.600A6.500 6.500 0 0022.500 16.500z\" fill=\"#19a8e0\"/>","scale":"<circle cx=\"16\" cy=\"5\" r=\"3\" fill=\"#ffd23f\"/><rect x=\"14.500\" y=\"6\" width=\"3\" height=\"19\" rx=\"1.500\" fill=\"#8a5a3c\"/><rect x=\"8.500\" y=\"25\" width=\"15\" height=\"4\" rx=\"2\" fill=\"#8a5a3c\"/><path d=\"M4.500 9.500h23\" stroke=\"#ffb02e\" stroke-width=\"2.600\" stroke-linecap=\"round\"/><path d=\"M4.500 10L1.500 18M4.500 10L8.500 18M27.500 10L23.500 18M27.500 10L30.500 18\" stroke=\"#8a5a3c\" stroke-width=\"1.200\"/><path d=\"M0.500 18h9a4.500 4.500 0 01-9 0z\" fill=\"#ff5a5f\"/><path d=\"M22.500 18h9a4.500 4.500 0 01-9 0z\" fill=\"#3b8bff\"/>","battery":"<rect x=\"2\" y=\"8\" width=\"24.500\" height=\"16\" rx=\"4.500\" fill=\"#2b2f45\"/><rect x=\"26.500\" y=\"12.500\" width=\"3.500\" height=\"7\" rx=\"1.500\" fill=\"#2b2f45\"/><rect x=\"5\" y=\"11\" width=\"5.500\" height=\"10\" rx=\"1.800\" fill=\"#3ddc84\"/><rect x=\"11.800\" y=\"11\" width=\"5.500\" height=\"10\" rx=\"1.800\" fill=\"#3ddc84\"/><rect x=\"18.600\" y=\"11\" width=\"5\" height=\"10\" rx=\"1.800\" fill=\"#3ddc84\"/><path d=\"M17 1.500l-5 8h4l-2 6.500 7-9h-4.500z\" fill=\"#ffd23f\"/>","sprout":"<path d=\"M16 27V15\" stroke=\"#2fa84f\" stroke-width=\"2.600\" stroke-linecap=\"round\"/><path d=\"M16 17C16 9.500 11 6.500 4.500 7.500c0 7.500 4.500 10.500 11.500 9.500z\" fill=\"#3ddc84\"/><path d=\"M16 14c0-6.500 4-9.500 11.500-9.500 0 6.500-4 10.500-11.500 9.500z\" fill=\"#26c26a\"/><path d=\"M6 25.500h20l-2.500 5.500h-15z\" fill=\"#c9783c\"/><rect x=\"5\" y=\"24\" width=\"22\" height=\"3\" rx=\"1.500\" fill=\"#e08a46\"/>","edit":"<rect x=\"3\" y=\"3\" width=\"19.500\" height=\"26\" rx=\"3.500\" fill=\"#fff\"/><path d=\"M7.500 9.500h11M7.500 14.500h11M7.500 19.500h6\" stroke=\"#3b8bff\" stroke-width=\"2.200\" stroke-linecap=\"round\"/><path d=\"M26.500 8l3.500 3.500L18 23.500l-4.500 1 1-4.500z\" fill=\"#ffd23f\"/><path d=\"M26.500 8l3.500 3.500-2.300 2.300-3.500-3.500z\" fill=\"#ff6fb5\"/><path d=\"M14.500 20l-1 4.500 4.500-1z\" fill=\"#f4cfa4\"/><path d=\"M13.700 23.600l-.4 1.600 1.700-.4z\" fill=\"#2b2f45\"/>","graduation":"<path d=\"M16 4.500L1.500 12 16 19.500 30.500 12z\" fill=\"#3b4bd6\"/><path d=\"M7.500 16v6.500c0 2.500 4 4.500 8.500 4.500s8.500-2 8.500-4.500V16L16 20.500z\" fill=\"#6b7cff\"/><path d=\"M28 13v10\" stroke=\"#ffd23f\" stroke-width=\"2\" stroke-linecap=\"round\"/><circle cx=\"28\" cy=\"25\" r=\"2.300\" fill=\"#ffd23f\"/>","phone":"<rect x=\"7.500\" y=\"2\" width=\"17\" height=\"28\" rx=\"4.500\" fill=\"#2b2f45\"/><rect x=\"9.800\" y=\"6\" width=\"12.400\" height=\"19\" rx=\"2\" fill=\"#6fd0ff\"/><rect x=\"12\" y=\"9\" width=\"8\" height=\"2.600\" rx=\"1.300\" fill=\"#fff\"/><rect x=\"12\" y=\"13.500\" width=\"8\" height=\"2.600\" rx=\"1.300\" fill=\"#ffd23f\"/><circle cx=\"16\" cy=\"27.500\" r=\"1\" fill=\"#8a93b0\"/><circle cx=\"25\" cy=\"6\" r=\"5\" fill=\"#ff5a5f\"/><rect x=\"24.200\" y=\"3\" width=\"1.700\" height=\"4\" rx=\".8\" fill=\"#fff\"/><circle cx=\"25\" cy=\"8.600\" r=\".9\" fill=\"#fff\"/>","users":"<circle cx=\"6.500\" cy=\"14.500\" r=\"3.500\" fill=\"#ff6fb5\"/><path d=\"M.5 27c0-5.500 2.500-7.500 6-7.500s6 2 6 7.500z\" fill=\"#ff6fb5\"/><circle cx=\"25.500\" cy=\"14.500\" r=\"3.500\" fill=\"#3ddc84\"/><path d=\"M19.500 27c0-5.500 2.500-7.500 6-7.500s6 2 6 7.500z\" fill=\"#3ddc84\"/><circle cx=\"16\" cy=\"10.500\" r=\"5.200\" fill=\"#ffb02e\"/><path d=\"M6.500 29c0-6.500 4-9.500 9.500-9.500s9.500 3 9.500 9.500z\" fill=\"#3b8bff\"/>","mail":"<rect x=\"2\" y=\"6\" width=\"28\" height=\"20\" rx=\"3.500\" fill=\"#fff\"/><path d=\"M2 9.500A3.500 3.500 0 015.500 6h21A3.500 3.500 0 0130 9.500L16 19.500z\" fill=\"#3b8bff\"/><path d=\"M3 25l9-7M29 25l-9-7\" stroke=\"#cfd6e4\" stroke-width=\"1.600\" stroke-linecap=\"round\"/><circle cx=\"26.500\" cy=\"7\" r=\"5.200\" fill=\"#ff5a5f\"/><circle cx=\"26.500\" cy=\"7\" r=\"1.800\" fill=\"#fff\"/>","hand":"<circle cx=\"16\" cy=\"16\" r=\"14\" fill=\"#ff5a5f\"/><circle cx=\"16\" cy=\"16\" r=\"10.500\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\" opacity=\".35\"/><rect x=\"7\" y=\"13\" width=\"18\" height=\"6\" rx=\"3\" fill=\"#fff\"/>","timer":"<rect x=\"12.500\" y=\"1.800\" width=\"7\" height=\"3.500\" rx=\"1.200\" fill=\"#2b2f45\"/><path d=\"M26 6.500l2.500 2.500\" stroke=\"#19c3b1\" stroke-width=\"3.400\" stroke-linecap=\"round\"/><circle cx=\"16\" cy=\"18\" r=\"12.500\" fill=\"#19c3b1\"/><circle cx=\"16\" cy=\"18\" r=\"9.300\" fill=\"#fff\"/><path d=\"M16 18v-7\" stroke=\"#2b2f45\" stroke-width=\"2.200\" stroke-linecap=\"round\"/><path d=\"M16 18l5 3\" stroke=\"#ff5a5f\" stroke-width=\"2.200\" stroke-linecap=\"round\"/><circle cx=\"16\" cy=\"18\" r=\"1.600\" fill=\"#2b2f45\"/>","link":"<g transform=\"rotate(-45 16 16)\"><rect x=\"1.500\" y=\"10.500\" width=\"17\" height=\"11\" rx=\"5.500\" fill=\"none\" stroke=\"#ff9f1c\" stroke-width=\"3.800\"/><rect x=\"13.500\" y=\"10.500\" width=\"17\" height=\"11\" rx=\"5.500\" fill=\"none\" stroke=\"#3b8bff\" stroke-width=\"3.800\"/></g>","home":"<rect x=\"21\" y=\"4\" width=\"4.500\" height=\"9\" fill=\"#c9783c\"/><path d=\"M5 15v12.500a1.500 1.500 0 001.500 1.500h19a1.500 1.500 0 001.500-1.500V15L16 6.500z\" fill=\"#ffd23f\"/><path d=\"M1.500 16L16 3l14.500 13-2.200 2.400L16 7.500 3.700 18.400z\" fill=\"#ff5a5f\"/><rect x=\"12.500\" y=\"19\" width=\"7\" height=\"10\" rx=\"1.800\" fill=\"#8a5a3c\"/><circle cx=\"18\" cy=\"24.500\" r=\".8\" fill=\"#ffd23f\"/>","contrast":"<circle cx=\"16\" cy=\"16\" r=\"13.500\" fill=\"#2b2f6b\"/><path d=\"M16 2.500a13.500 13.500 0 000 27z\" fill=\"#ffb02e\"/><circle cx=\"16\" cy=\"16\" r=\"7\" fill=\"#ffd23f\" clip-path=\"inset(0 50% 0 0)\"/><circle cx=\"23\" cy=\"10.500\" r=\"1.400\" fill=\"#fff\"/><circle cx=\"21.500\" cy=\"22\" r=\"1.100\" fill=\"#fff\"/><circle cx=\"25.500\" cy=\"17\" r=\".9\" fill=\"#fff\"/>","shuffle":"<path d=\"M2.500 9h5c6.500 0 8 14 14.500 14h3\" stroke=\"#3b8bff\" stroke-width=\"3.400\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M2.500 23h5c6.500 0 8-14 14.500-14h3\" stroke=\"#ff6fb5\" stroke-width=\"3.400\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M24 17.500l6 5.500-6 5.500z\" fill=\"#3b8bff\"/><path d=\"M24 3.500l6 5.500-6 5.500z\" fill=\"#ff6fb5\"/>","gem":"<path d=\"M9 5h14l8 8.500L16 29 1 13.500z\" fill=\"#38d4ff\"/><path d=\"M1 13.500h30L16 29z\" fill=\"#1fa0e8\"/><path d=\"M9 5l-8 8.500h11zM23 5l8 8.500H20zM12 13.500L16 5l4 8.500z\" fill=\"#a8ecff\"/><path d=\"M6 8.500l1.300 1.700 1.700 1.300-1.700 1.300L6 14.500\" fill=\"none\"/><path d=\"M26 3l1 2.200 2.200 1-2.200 1L26 9.400l-1-2.200-2.200-1 2.200-1z\" fill=\"#ffd23f\"/>","battery-low":"<rect x=\"2\" y=\"8\" width=\"24.500\" height=\"16\" rx=\"4.500\" fill=\"#2b2f45\"/><rect x=\"26.500\" y=\"12.500\" width=\"3.500\" height=\"7\" rx=\"1.500\" fill=\"#2b2f45\"/><rect x=\"5\" y=\"11\" width=\"5.500\" height=\"10\" rx=\"1.800\" fill=\"#ff5a5f\"/><rect x=\"11.800\" y=\"11\" width=\"5.500\" height=\"10\" rx=\"1.800\" fill=\"#454b6b\"/><rect x=\"18.600\" y=\"11\" width=\"5\" height=\"10\" rx=\"1.800\" fill=\"#454b6b\"/><path d=\"M20 2l-5 8h4l-1.500 5 6-8h-4z\" fill=\"#ffd23f\"/>","mountain":"<circle cx=\"26\" cy=\"7.500\" r=\"4.200\" fill=\"#ffd23f\"/><path d=\"M1 28L13 7l12 21z\" fill=\"#7a6cff\"/><path d=\"M13 7l-4.200 7.400 2.200-1.400 2 2 2-2 2.200 1.400z\" fill=\"#fff\"/><path d=\"M16.500 28l7.500-13 8 13z\" fill=\"#3ddc84\"/><path d=\"M13 7V1.500\" stroke=\"#2b2f45\" stroke-width=\"1.600\" stroke-linecap=\"round\"/><path d=\"M13 1.500l6 2.200-6 2.200z\" fill=\"#ff5a5f\"/>","bookmark":"<path d=\"M5 3.500h19a3 3 0 013 3V28H8a3 3 0 01-3-3z\" fill=\"#3b8bff\"/><path d=\"M8 3.500V28\" stroke=\"#2b6fd6\" stroke-width=\"2.200\"/><rect x=\"11\" y=\"9\" width=\"10\" height=\"2.200\" rx=\"1.100\" fill=\"#fff\" opacity=\".85\"/><rect x=\"11\" y=\"13.500\" width=\"7\" height=\"2.200\" rx=\"1.100\" fill=\"#fff\" opacity=\".85\"/><path d=\"M19 3.500h6.500v14l-3.250-2.800L19 17.500z\" fill=\"#ff5a5f\"/>","book":"<path d=\"M5 3.500h19a3 3 0 013 3V28H8a3 3 0 01-3-3z\" fill=\"#9b5cff\"/><path d=\"M8 3.500V28\" stroke=\"#7a3fe0\" stroke-width=\"2.200\"/><rect x=\"11\" y=\"9\" width=\"10\" height=\"2.200\" rx=\"1.100\" fill=\"#fff\" opacity=\".85\"/>"};
function libTopicIcon(t,size){
  const name=LIB_TOPIC_ICON[t.id]||'book';
  const col=LIB_CAT_COLOR[t.cat]||'var(--nav-wisdom)';
  return '<span class="lib-ico'+(size?' '+size:'')+'" style="--lc:'+col+'"><svg class="lib-art" viewBox="0 0 32 32" aria-hidden="true">'+(LIB_ART[name]||LIB_ART.book)+'</svg></span>';
}
const LIB_COVER_KEY='bloc_lib_covers_v1',LIB_COVER_ON_KEY='bloc_lib_covers_on_v1';
let libCovers={};try{libCovers=JSON.parse(localStorage.getItem(LIB_COVER_KEY)||'{}')||{};}catch(e){libCovers={};}
function libCoversOn(){try{return localStorage.getItem(LIB_COVER_ON_KEY)!=='0';}catch(e){return true;}}
(function(){const el=document.getElementById('set-lib-covers');if(el)el.checked=libCoversOn();})();
function libSetCoversOn(on){try{localStorage.setItem(LIB_COVER_ON_KEY,on?'1':'0');}catch(e){}if(typeof bookShell==='function')bookShell();}
function libCoverHue(str){let h=0;for(let i=0;i<str.length;i++)h=(h*31+str.charCodeAt(i))%360;return h;}
function libCover(b,size){
  const ch=libCoverHue(b.title+b.author);
  return '<div class="lib-cover'+(size?' '+size:'')+'" data-bid="'+escHTML(b.id)+'" style="--ch:'+ch+'"><div class="lib-cover-fb"><b>'+escHTML(b.title)+'</b><i>'+escHTML((b.author||'').trim().split(/\s+/).pop())+'</i></div></div>';
}
function libShowCoverImg(box,url){
  if(!box||box.querySelector('img'))return;
  const img=new Image();img.alt='';img.decoding='async';img.loading='lazy';
  img.onload=()=>{if(img.naturalWidth>40)img.classList.add('ok');else img.remove();};
  img.onerror=()=>img.remove();
  img.src=url;box.appendChild(img);
}
async function libFetchCover(b){
  const c=libCovers[b.id];
  if(c&&(c.u||(Date.now()-c.t)<7*864e5))return c.u||null;
  try{
    const q=new URLSearchParams({title:b.title,author:b.author||'',limit:'1',fields:'cover_i'});
    const r=await fetch('https://openlibrary.org/search.json?'+q.toString(),{signal:AbortSignal.timeout?AbortSignal.timeout(8000):undefined});
    if(!r.ok)return null;
    const j=await r.json();const id=j.docs&&j.docs[0]&&j.docs[0].cover_i;
    const u=id?'https://covers.openlibrary.org/b/id/'+id+'-L.jpg?default=false':null;
    libCovers[b.id]={u:u,t:Date.now()};
    try{localStorage.setItem(LIB_COVER_KEY,JSON.stringify(libCovers));}catch(e){}
    return u;
  }catch(e){return null;}
}
function libHydrateCovers(){
  if(!libCoversOn())return;
  document.querySelectorAll('.lib-cover[data-bid]').forEach(box=>{
    const b=allBooks().find(x=>x.id===box.dataset.bid);if(!b)return;
    const c=libCovers[b.id];
    if(c&&c.u){libShowCoverImg(box,c.u);return;}
    libFetchCover(b).then(u=>{if(u)libShowCoverImg(box,u);});
  });
}

const LIB_USER_BOOKS_KEY='bloc_library_user_books_v1';
let userBooks=loadMigratedStore(LIB_USER_BOOKS_KEY,[],null);
const saveBooks=()=>{try{localStorage.setItem(LIB_USER_BOOKS_KEY,JSON.stringify(userBooks));}catch(e){}};
const allBooks=()=>LIBRARY_BOOKS.concat(userBooks);

const LIB_USER_TOPICS_KEY='bloc_library_user_topics_v1';
let userTopics=loadMigratedStore(LIB_USER_TOPICS_KEY,[],null);
const saveTopics=()=>{try{localStorage.setItem(LIB_USER_TOPICS_KEY,JSON.stringify(userTopics));}catch(e){}};
function libAllTopics(){return LIBRARY_TOPICS.concat(userTopics);}
const LIB_PREFS_KEY='bloc_library_prefs_v1';
let libPrefs=loadMigratedStore(LIB_PREFS_KEY,{aud:null,cat:'all'},null);
const savePrefs=()=>{try{localStorage.setItem(LIB_PREFS_KEY,JSON.stringify(libPrefs));}catch(e){}};
function libSaveGuide(title,guideText){
  let t=userTopics.find(x=>x.id==='my-guides');
  if(!t){t={id:'my-guides',cat:'mine',aud:['all'],icon:'📝',problem:'Answers I saved from Wojak',title:'My Saved Guides',ctx:[],keywords:['saved','guide','my'],reads:[]};userTopics.push(t);}
  const id='u-'+Date.now();
  t.reads.unshift({id,title:String(title||'Saved guide').slice(0,80),body:String(guideText||''),tip:''});
  saveTopics();
  return id;
}

const IMPORT_PROMPT=`You are helping convert a nonfiction book into short, original study notes for a personal productivity app called BLOC. I'm going to attach or paste in a book, usually as a PDF.

Read it, then write 5 to 8 chapters covering its most useful, practical ideas — the ones I could actually act on this week. Skip chapters that are mostly memoir, filler, or repetition of a point already made elsewhere in the book.

Ground rules:
- Explain every idea entirely in your own words. Do not quote the book, not even short phrases strung together, and do not paraphrase so closely that the sentence structure or wording mirrors the original — write it the way a teacher explains an idea from memory, not the way a summarizer compresses a page.
- Each chapter should read like a short, direct lesson written to "you" — willing to spend a couple of paragraphs on WHY an idea works, not just stating that it does.
- Do not invent facts, statistics, or quotes that aren't actually the book's argument.
- If the book is a novel or memoir with no practical framework to extract, say so instead of forcing chapters out of it.

Each chapter needs exactly these fields:
- title: a short, specific chapter title (not "Chapter 3")
- body: 2 to 3 paragraphs as plain text, a blank line between paragraphs, no markdown, no headers, no bullet points inside it
- tip: one imperative sentence — something I could literally do today

Also give me, once, at the top level:
- title: the book's title
- author: the author's name
- subtitle: the book's subtitle if it has one, otherwise leave it out
- icon: one single emoji that fits the book's theme
- blurb: one or two sentences capturing the book's central idea, in your own words

Output ONLY one JSON object and nothing else — no commentary before or after it, code fence is fine if that's how your interface normally shows code. Use exactly this shape:

{
  "title": "…",
  "author": "…",
  "subtitle": "…",
  "icon": "…",
  "blurb": "…",
  "chapters": [
    { "title": "…", "body": "First paragraph…\\n\\nSecond paragraph…", "tip": "…" }
  ]
}`;

const slugify=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-+|-+$)/g,'').slice(0,40)||'book';
function pullBookJSON(raw){
  let s=String(raw||'').trim();
  s=s.replace(/^```[a-zA-Z]*\s*/,'').replace(/```\s*$/,'').trim();
  const start=s.indexOf('{'),end=s.lastIndexOf('}');
  if(start===-1||end===-1||end<=start)return null;
  s=s.slice(start,end+1);
  try{return JSON.parse(s);}catch(e){return null;}
}
function checkBookData(bookJson){
  const errors=[];
  if(!bookJson||typeof bookJson!=='object')return['That doesn\u2019t look like valid JSON — make sure you copied the whole { … } block, including the outer curly braces, and nothing else.'];
  if(!bookJson.title||typeof bookJson.title!=='string'||!bookJson.title.trim())errors.push('Missing a "title".');
  if(!bookJson.author||typeof bookJson.author!=='string'||!bookJson.author.trim())errors.push('Missing an "author".');
  if(!Array.isArray(bookJson.chapters)||!bookJson.chapters.length){
    errors.push('Missing "chapters" — it needs to be a non-empty list.');
  }else{
    bookJson.chapters.forEach((c,i)=>{
      if(!c||typeof c!=='object'){errors.push(`Chapter ${i+1} isn\u2019t a valid entry.`);return;}
      if(!c.title||!String(c.title).trim())errors.push(`Chapter ${i+1} is missing a "title".`);
      if(!c.body||String(c.body).trim().length<40)errors.push(`Chapter ${i+1} is missing a "body" (or it\u2019s too short to be a real chapter).`);
    });
  }
  return errors;
}
function importBook(raw){
  const errBox=$('lib-addbook-error');
  const showError=msg=>{if(errBox){errBox.style.display='';errBox.textContent=msg;}};
  const bookJson=pullBookJSON(raw);
  const errors=checkBookData(bookJson);
  if(errors.length){showError(errors.join(' '));return false;}
  let slug=slugify(bookJson.id||bookJson.title),id=slug,n=2;
  while(allBooks().some(b=>b.id===id)){id=`${slug}-${n++}`;}
  const chapters=bookJson.chapters.map((c,i)=>({
    id:`${id}-c${i+1}`,
    title:String(c.title).trim(),
    body:String(c.body).trim(),
    tip:c.tip&&String(c.tip).trim()?String(c.tip).trim():undefined,
  }));
  const icon=(bookJson.icon&&String(bookJson.icon).trim()&&String(bookJson.icon).trim().length<=4)?String(bookJson.icon).trim():'📘';
  const book={
    id,custom:true,addedAt:Date.now(),
    title:String(bookJson.title).trim(),
    author:String(bookJson.author).trim(),
    subtitle:bookJson.subtitle?String(bookJson.subtitle).trim():'',
    icon,
    blurb:bookJson.blurb&&String(bookJson.blurb).trim()?String(bookJson.blurb).trim():'Added from your own library.',
    chapters,
  };
  userBooks.push(book);
  saveBooks();
  if(errBox)errBox.style.display='none';
  libCloseAddBookModal();
  renderBooks();
  openLibraryBook(book.id);
  return true;
}
function removeBook(id){
  const book=userBooks.find(b=>b.id===id);
  if(!book)return;
  if(!confirm(`Remove “${book.title}” from your library? Your progress on it will be lost, and since it only lives in this browser, it can\u2019t be recovered — you\u2019d need to run it through your AI again.`))return;
  userBooks=userBooks.filter(b=>b.id!==id);
  saveBooks();
  if(activeBook===id)activeBook=null;
  bookShell();
}
function libOpenAddBookModal(){
  const overlay=$('lib-addbook-overlay');if(!overlay)return;
  overlay.classList.add('open');
  const err=$('lib-addbook-error');if(err){err.style.display='none';err.textContent='';}
  const box=$('lib-addbook-textarea');if(box)box.value='';
  const btn=$('lib-addbook-copy-btn');if(btn){btn.textContent='📋 COPY THE PROMPT';btn.classList.remove('copied');}
}
function libCloseAddBookModal(){
  const overlay=$('lib-addbook-overlay');if(overlay)overlay.classList.remove('open');
}
async function libCopyAddBookPrompt(){
  const copyBtn=$('lib-addbook-copy-btn');
  let ok=true;
  try{await navigator.clipboard.writeText(IMPORT_PROMPT);}
  catch(e){
    try{
      const ta=document.createElement('textarea');
      ta.value=IMPORT_PROMPT;ta.style.position='fixed';ta.style.opacity='0';
      document.body.appendChild(ta);ta.focus();ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }catch(e2){ok=false;}
  }
  if(copyBtn){
    copyBtn.textContent=ok?'✓ COPIED — NOW PASTE IT INTO YOUR AI':'Couldn\u2019t copy — select the text manually';
    copyBtn.classList.toggle('copied',ok);
    setTimeout(()=>{if(copyBtn){copyBtn.textContent='📋 COPY THE PROMPT';copyBtn.classList.remove('copied');}},3200);
  }
}
function libSubmitAddBook(){
  const ta=$('lib-addbook-textarea');
  importBook(ta?ta.value:'');
}

const LIB_PROGRESS_KEY='bloc_library_progress_v1';
let readLog=loadMigratedStore(LIB_PROGRESS_KEY,{},null);
const saveProgress=()=>{try{localStorage.setItem(LIB_PROGRESS_KEY,JSON.stringify(readLog));}catch(e){}};
const markRead=id=>{readLog[id]={done:true,at:Date.now()};saveProgress();};
const flipRead=id=>{if(readLog[id]&&readLog[id].done)delete readLog[id];else markRead(id);saveProgress();};
const isRead=id=>!!(readLog[id]&&readLog[id].done);

function resolveRead(read){
  if(read.fromInsight){
    const src=TRACY_INSIGHTS.find(i=>i.id===read.fromInsight);
    if(src)return{id:read.id,title:src.title,body:src.body,tip:read.tip,fromBook:true};
  }
  if(read.fromBookChapter){
    const book=allBooks().find(b=>b.id===read.fromBookChapter.bookId);
    const ch=book&&book.chapters.find(c=>c.id===read.fromBookChapter.chapterId);
    if(ch)return{id:read.id,title:ch.title,body:ch.body,tip:read.tip||ch.tip,fromBook:true,bookTitle:book.title,bookAuthor:book.author};
  }
  return{id:read.id,title:read.title,body:read.body,tip:read.tip,fromBook:false};
}
const chapterAsRead=(book,ch)=>({id:ch.id,fromBookChapter:{bookId:book.id,chapterId:ch.id}});
function findRead(id){
  for(const t of libAllTopics()){const r=t.reads.find(x=>x.id===id);if(r)return r;}
  for(const b of allBooks()){const c=b.chapters.find(x=>x.id===id);if(c)return chapterAsRead(b,c);}
  return null;
}
function wordCount(read){
  const r=resolveRead(read);
  return((r.title||'')+' '+(r.body||'')+' '+(r.tip||'')).trim().split(/\s+/).filter(Boolean).length;
}
function readTimeLabel(read){
  const mins=Math.max(1,Math.round(wordCount(read)/200));
  return`${mins} min read`;
}
const allReads=()=>libAllTopics().flatMap(t=>t.reads.map(r=>({read:r,topic:t})));

function openLibraryFromStrip(view){
  showView('library');
  const topic=libAllTopics().find(t=>t.ctx.includes(view))||libAllTopics()[0];
  if(topic)openLibraryTopic(topic.id);
  else setLibraryMode('topics');
}

let libMode='topics';
let activeTopic=null;
let activeBook=null;
let openRead=null;
let searchQ='';

function renderLibraryView(){
  syncModeToggle();
  setLibraryMode(libMode);
}
function syncModeToggle(){
  document.querySelectorAll('#lib-mode-toggle .lib-mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.m===libMode));
}
function setLibraryMode(mode){
  libMode=mode;
  syncModeToggle();
  ['topics','books','quotes','librarian'].forEach(m=>{
    const el=$('lib-panel-'+m);if(el)el.style.display=(m===mode)?'':'none';
  });
  if(mode==='topics'){topicShell();}
  if(mode==='books'){bookShell();}
  if(mode==='quotes'){renderFilters();renderSpotlight();renderGrid();startPlay();}
  else{stopPlay();}
  if(mode==='librarian'){libUpdateHeadSub();libRenderChips();libRenderMessages();}
}

function onLibrarySearch(v){searchQ=(v||'').trim();renderTopics();}

const STOPWORDS=new Set('the and for are but not you your with this that have has had was were what when where why how can cant dont does did just from they them then than there their about into out all any some very too its our get got been being would could should will want need feel feeling really keep always never still more most much many one two off over under again only own same such who whom which while also because'.split(' '));
const SYNONYMS={
  exam:['test','revision','finals','quiz','study','school'],study:['learn','revision','exam','homework','memorize'],homework:['assignment','school','study'],
  tired:['exhausted','energy','burnout','rest','drained','sleepy'],exhausted:['tired','burnout','drained','energy'],burnout:['exhausted','tired','overworked'],
  phone:['scrolling','social','instagram','tiktok','youtube','notification','screen'],scroll:['phone','social','distract'],
  procrastinate:['avoid','delay','putting off','stuck','lazy','postpone'],lazy:['procrastinate','motivation','unmotivated'],avoid:['procrastinate','delay'],
  focus:['concentrate','distract','attention','drift'],distract:['focus','attention','phone','interrupt'],
  overwhelm:['too much','swamped','overload','busy','stress','plate'],stress:['overwhelm','pressure','anxious','overload'],busy:['overwhelm','swamped'],
  deadline:['late','due','overdue','rushing'],late:['deadline','overdue','behind'],estimate:['underestimate','long','takes','time'],
  email:['inbox','message','slack','reply'],meeting:['calls','calendar','zoom'],interrupt:['distract','notification','disturb'],
  boss:['manager','work','job','career'],manager:['lead','team','delegate','boss'],delegate:['hand','assign','team','trust'],
  freelance:['self-employed','remote','home','solo','founder'],remote:['home','wfh','freelance'],home:['remote','wfh'],
  perfect:['perfectionism','overthink','polish','good enough'],overthink:['perfect','indecisive','decide'],
  decide:['decision','choose','indecisive','options'],choose:['decide','decision'],
  motivation:['unmotivated','lazy','drive','energy','bored'],unmotivated:['motivation','lazy','bored'],bored:['motivation','unmotivated'],
  habit:['routine','consistency','streak','stick'],routine:['habit','morning','evening','schedule'],morning:['routine','wake','early'],
  sleep:['tired','bedtime','rest','night'],plan:['schedule','organize','calendar','structure','system'],organize:['plan','system','tidy','structure'],
  chaos:['chaotic','mess','disorganized','unplanned'],mess:['chaos','disorganized'],goal:['dream','ambition','future','progress'],
  group:['team','project','teammate','partner'],team:['group','project','colleague'],no:['boundaries','refuse','decline'],
  start:['begin','starting','first','stuck'],finish:['complete','follow','quit','abandon'],quit:['finish','abandon','giving up'],
};
function norm(w){
  w=(w||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  if(w.length>4)w=w.replace(/(ing|ed|ly|es|s)$/,'');
  return w.length>6?w.slice(0,6):w;
}
const tokenize=text=>(text||'').toLowerCase().split(/[^a-z0-9']+/).filter(w=>w.length>2&&!STOPWORDS.has(w)).map(norm).filter(Boolean);
const SYN_NORM=(()=>{const m={};Object.keys(SYNONYMS).forEach(k=>{m[norm(k)]=SYNONYMS[k].flatMap(x=>x.split(/\s+/)).map(norm).filter(Boolean);});return m;})();
function oneEditAway(a,b){
  if(Math.abs(a.length-b.length)>1)return false;
  let i=0,j=0,d=0;
  while(i<a.length&&j<b.length){
    if(a[i]===b[j]){i++;j++;continue;}
    if(++d>1)return false;
    if(a.length>b.length)i++;else if(a.length<b.length)j++;else{i++;j++;}
  }
  return d+(a.length-i)+(b.length-j)<=1;
}
function libQueryTerms(q){
  const base=[...new Set(tokenize(q))];
  const terms=base.map(t=>({t,w:1}));
  base.forEach(t=>(SYN_NORM[t]||[]).forEach(s=>{if(!base.includes(s)&&!terms.some(x=>x.t===s))terms.push({t:s,w:.55});}));
  return terms;
}
function libWeightMap(parts){
  const m=new Map();
  parts.forEach(([text,w])=>tokenize(text).forEach(t=>{if((m.get(t)||0)<w)m.set(t,w);}));
  return m;
}
function libMatchScore(map,terms){
  let score=0;
  terms.forEach(({t,w})=>{
    let best=map.get(t)||0;
    if(!best&&t.length>=5){for(const [k,kw] of map){if(k.length>=5&&oneEditAway(t,k)){best=Math.max(best,kw*.6);}}}
    score+=best*w;
  });
  return score;
}
const topicIdx=new Map();
function topicIndex(topic){
  const key=topic.id+':'+topic.reads.length;
  if(topicIdx.has(key))return topicIdx.get(key);
  const cat=(LIB_CATS.find(c=>c.id===topic.cat)||{}).label||'';
  const m=libWeightMap([[topic.problem,4],[topic.title,4],[(topic.keywords||[]).join(' '),3],[cat,1],
    [topic.reads.map(r=>resolveRead(r).title).join(' '),2],
    [topic.reads.map(r=>{const x=resolveRead(r);return(x.body||'')+' '+(x.tip||'');}).join(' '),1]]);
  topicIdx.set(key,m);return m;
}
function libSearchTopics(q,limit){
  const terms=libQueryTerms(q);
  if(!terms.length)return libAllTopics().map(t=>({topic:t,score:0}));
  const needle=(q||'').toLowerCase().trim();
  return libAllTopics().map(t=>{
    let score=libMatchScore(topicIndex(t),terms);
    if(needle.length>3&&(t.problem+' '+t.title).toLowerCase().includes(needle))score+=4;
    return{topic:t,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit||60);
}
const readIdx=new Map();
function libSearchReads(q,limit){
  const terms=libQueryTerms(q);if(!terms.length)return[];
  const out=[];
  const consider=(id,title,text,tip,ref)=>{
    let m=readIdx.get(id);
    if(!m){m=libWeightMap([[title,3],[text,1],[tip,1]]);readIdx.set(id,m);}
    let sc=libMatchScore(m,terms)+(ref.topic?libMatchScore(topicIndex(ref.topic),terms)*.35:0);
    if(sc>0)out.push(Object.assign({id,title,score:sc},ref));
  };
  libAllTopics().forEach(t=>t.reads.forEach(r=>{const x=resolveRead(r);consider(r.id,x.title,x.body,x.tip,{topic:t,teaser:(x.body||'').split(/(?<=[.!?])\s/)[0]});}));
  allBooks().forEach(b=>b.chapters.forEach(c=>consider(c.id,c.title,c.body,c.tip,{book:b,teaser:(c.body||'').split(/(?<=[.!?])\s/)[0]})));
  return out.sort((a,b)=>b.score-a.score).slice(0,limit||3);
}
const LIB_GOOD_MATCH=3.2;
function openLibraryRead(id){
  if(typeof baiOpen!=='undefined'&&baiOpen&&typeof baiToggle==='function')baiToggle(false);
  showView('library');
  const t=libAllTopics().find(x=>x.reads.some(r=>r.id===id));
  if(t){activeBook=null;activeTopic=t.id;setLibraryMode('topics');openRead=id;markRead(id);topicShell();}
  else{
    const b=allBooks().find(x=>x.chapters.some(c=>c.id===id));
    if(!b)return;
    activeTopic=null;activeBook=b.id;setLibraryMode('books');openRead=id;markRead(id);bookShell();
  }
  setTimeout(()=>{const el=document.querySelector('.lib-read-card.open');if(el)el.scrollIntoView({behavior:'smooth',block:'center'});},60);
}

function libSetAudienceVal(v){libPrefs.aud=v||null;savePrefs();renderTopics();}
function libSetAudience(a){libPrefs.aud=(libPrefs.aud===a)?null:a;savePrefs();renderTopics();}
function libSetCat(c){libPrefs.cat=c;savePrefs();renderTopics();}
const dayOfYear=()=>{const d=bocNow();return Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);};
function pickedForYou(){
  const ids=[];
  if(typeof tasks!=='undefined'){
    const openA=tasks.filter(t=>t.type==='A'&&!t.done).length;
    const open=tasks.filter(t=>!t.done).length;
    if(openA>=2)ids.push('procrastination');
    if(open>=12)ids.push('overwhelm');
    if(!tasks.length)ids.push('no-system');
  }
  if(typeof streakData!=='undefined'&&streakData.current===0)ids.push('habits');
  const aud=libPrefs.aud;
  libAllTopics().filter(t=>aud&&(t.aud||[]).includes(aud)&&t.id!=='my-guides').forEach(t=>ids.push(t.id));
  libAllTopics().filter(t=>(t.aud||['all']).includes('all')&&t.id!=='my-guides').forEach(t=>ids.push(t.id));
  const seen=new Set(),picks=[];
  const day=dayOfYear();
  [...new Set(ids)].forEach((id,i)=>{
    if(picks.length>=3)return;
    const t=libAllTopics().find(x=>x.id===id);if(!t||seen.has(id))return;
    const offset=(i<3&&['procrastination','overwhelm','no-system','habits'].includes(id))?0:day;
    const unread=t.reads.filter(r=>!isRead(r.id));
    const pool=unread.length?unread:t.reads;
    seen.add(id);picks.push({topic:t,read:pool[(offset+i)%pool.length]});
  });
  return picks;
}
function libSel(label,aria,onchange,opts,cur,isSet){
  return`<label class="lib-sel${isSet?' on':''}"><span class="lib-sel-lbl">${label}</span><select class="lib-sel-in" aria-label="${aria}" onchange="${onchange}">${opts.map(o=>`<option value="${o.id}"${o.id===cur?' selected':''}>${escHTML(o.label)}</option>`).join('')}</select></label>`;
}
function drawAudienceBar(){
  const el=$('lib-aud-bar');if(!el)return;
  el.innerHTML=libSel('For',"I'm a…",'libSetAudienceVal(this.value)',[{id:'',label:'Everyone'}].concat(LIB_AUDIENCES),libPrefs.aud||'',!!libPrefs.aud);
}
function drawCatRow(){
  const el=$('lib-cat-row');if(!el)return;
  const have=new Set(libAllTopics().map(t=>t.cat||'focus'));
  const cats=LIB_CATS.filter(c=>c.id==='all'||have.has(c.id));
  el.innerHTML=libSel('Topic','Topic',"libSetCat(this.value)",cats,libPrefs.cat,libPrefs.cat!=='all');
}
function drawForYou(){
  const el=$('lib-foryou');if(!el)return;
  if(searchQ||libPrefs.cat!=='all'){el.innerHTML='';return;}
  const picks=pickedForYou();
  if(!picks.length){el.innerHTML='';return;}
  el.innerHTML=`<div class="lib-foryou-hd">Picked for you today</div><div class="lib-foryou-row">`+picks.map(p=>{
    const r=resolveRead(p.read);
    return`<div class="lib-foryou-card" onclick="openLibraryRead('${p.read.id}')"><div class="lib-foryou-ic">${libTopicIcon(p.topic,'sm')}</div><div class="lib-foryou-t">${escHTML(r.title)}</div><div class="lib-foryou-m">${escHTML(p.topic.title)} · ${readTimeLabel(p.read)}</div></div>`;
  }).join('')+`</div>`;
}
function topicShell(){
  const grid=$('lib-topics-grid'),detail=$('lib-topic-detail');
  if(!grid||!detail)return;
  const top=$('lib-topics-top');
  if(activeTopic){if(top)top.style.display='none';grid.style.display='none';detail.style.display='';topicDetail();}
  else{if(top)top.style.display='';grid.style.display='';detail.style.display='none';renderTopics();}
}
function renderTopics(){
  const wrap=$('lib-topics-grid');if(!wrap)return;
  drawAudienceBar();drawCatRow();drawForYou();
  let list;
  if(searchQ){list=libSearchTopics(searchQ).map(x=>x.topic);}
  else{
    list=libAllTopics().slice();
    const aud=libPrefs.aud;
    if(aud)list.sort((a,b)=>((b.aud||[]).includes(aud)?1:0)-((a.aud||[]).includes(aud)?1:0));
  }
  if(libPrefs.cat!=='all')list=list.filter(t=>(t.cat||'focus')===libPrefs.cat);
  if(!list.length){
    wrap.innerHTML=`<p class="lib-empty">Nothing in the Library covers that yet. <a href="javascript:void(0)" class="lib-chat-link" onclick="askConsultant()">Ask Wojak</a> — it can write you a short guide and you can save it here.</p>`;return;
  }
  const aud=libPrefs.aud;
  wrap.innerHTML=list.map(t=>{
    const total=t.reads.length,done=t.reads.filter(r=>isRead(r.id)).length;
    const pct=total?Math.round(done/total*100):0;
    const mins=Math.max(1,Math.round(t.reads.reduce((a,r)=>a+wordCount(r),0)/200));
    const forYou=aud&&(t.aud||[]).includes(aud)&&!(t.aud||[]).includes('all');
    return`<div class="lib-topic-card" onclick="openLibraryTopic('${t.id}')">
      ${forYou?'<div class="lib-foryou-badge">FOR YOU</div>':''}
      ${libTopicIcon(t)}
      <div class="lib-topic-problem">“${escHTML(t.problem)}”</div>
      <div class="lib-topic-title">${escHTML(t.title)}</div>
      <div class="lib-topic-meta"><span>${total} reads · ~${mins} min</span>${done?`<span class="lib-topic-progress">${done}/${total} done</span>`:''}</div>
      <div class="lib-topic-bar"><div class="lib-topic-bar-fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}
function askConsultant(){
  const q=searchQ;setLibraryMode('librarian');
  const inp=$('lib-chat-input');if(inp){inp.value=q;inp.focus();}
}
function openLibraryTopic(id){
  activeTopic=id;openRead=null;
  setLibraryMode('topics');
  topicShell();
}
function closeLibraryTopic(){
  activeTopic=null;
  topicShell();
}
function topicDetail(){
  const topic=libAllTopics().find(t=>t.id===activeTopic);
  const el=$('lib-topic-detail');
  if(!topic||!el)return;
  const done=topic.reads.filter(r=>isRead(r.id)).length;
  const mins=Math.max(1,Math.round(topic.reads.reduce((a,r)=>a+wordCount(r),0)/200));
  el.innerHTML=`
    <button class="lib-back-btn" onclick="closeLibraryTopic()">‹ ALL TOPICS</button>
    <div class="lib-topic-detail-hd">
      ${libTopicIcon(topic,'lg')}
      <div>
        <div class="lib-topic-detail-problem">“${escHTML(topic.problem)}”</div>
        <div class="lib-topic-detail-title">${escHTML(topic.title)}</div>
        <div class="lib-topic-detail-sub">${done}/${topic.reads.length} read · ~${mins} min total</div>
      </div>
    </div>
    <div class="lib-read-list">${topic.reads.map(r=>readCard(r)).join('')}</div>`;
}

function bookShell(){
  const grid=$('lib-books-grid'),detail=$('lib-book-detail');
  if(!grid||!detail)return;
  if(activeBook){grid.style.display='none';detail.style.display='';bookDetail();}
  else{grid.style.display='';detail.style.display='none';renderBooks();}
  libHydrateCovers();
}
function renderBooks(){
  const wrap=$('lib-books-grid');if(!wrap)return;
  const list=allBooks();
  if(!list.length){wrap.innerHTML='<p class="lib-empty">No books yet — add one with the button above.</p>';return;}
  wrap.innerHTML=list.map(b=>{
    const total=b.chapters.length,done=b.chapters.filter(c=>isRead(c.id)).length;
    const pct=total?Math.round(done/total*100):0;
    const mins=Math.max(1,Math.round(b.chapters.reduce((a,c)=>a+wordCount(chapterAsRead(b,c)),0)/200));
    const removeBtn=b.custom?`<button class="lib-book-remove-btn" onclick="event.stopPropagation();removeBook('${b.id}')" title="Remove this book">✕</button>`:'';
    return`<div class="lib-book-card${b.custom?' custom':''}" onclick="openLibraryBook('${b.id}')">
      ${removeBtn}
      <div class="lib-book-top">${libCover(b)}<div><div class="lib-book-title">${escHTML(b.title)}</div>
      <div class="lib-book-author">${escHTML(b.author)}${b.custom?' · ADDED BY YOU':''}</div></div></div>
      <div class="lib-book-blurb">${escHTML(b.blurb)}</div>
      <div class="lib-topic-meta"><span>${total} chapters · ~${mins} min</span>${done?`<span class="lib-topic-progress">${done}/${total} done</span>`:''}</div>
      <div class="lib-topic-bar"><div class="lib-topic-bar-fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}
function openLibraryBook(id){
  activeBook=id;openRead=null;
  setLibraryMode('books');
  bookShell();
}
function closeLibraryBook(){
  activeBook=null;
  bookShell();
}
function bookDetail(){
  const book=allBooks().find(b=>b.id===activeBook);
  const el=$('lib-book-detail');
  if(!book||!el)return;
  const chapterReads=book.chapters.map(c=>chapterAsRead(book,c));
  const done=chapterReads.filter(r=>isRead(r.id)).length;
  const mins=Math.max(1,Math.round(chapterReads.reduce((a,r)=>a+wordCount(r),0)/200));
  const footnote=book.custom
    ?`<div class="lib-footnote">Added by you, from your own AI's reading of ${escHTML(book.title)} — in its own words, not the book's. <a href="javascript:void(0)" class="lib-chat-link" onclick="removeBook('${book.id}')">Remove this book</a></div>`
    :`<div class="lib-footnote">Chapters above are explained in our own words — condensed, original summaries of well-known ideas from ${escHTML(book.title)}, not excerpts or quotations from the book itself.</div>`;
  el.innerHTML=`
    <button class="lib-back-btn" onclick="closeLibraryBook()">‹ ALL BOOKS</button>
    <div class="lib-topic-detail-hd">
      ${libCover(book,'lg')}
      <div>
        <div class="lib-topic-detail-title">${escHTML(book.title)}</div>
        <div class="lib-topic-detail-problem" style="margin-top:2px;">${escHTML(book.author)}${book.subtitle?` — <span style="opacity:.8;">${escHTML(book.subtitle)}</span>`:''}</div>
        <div class="lib-topic-detail-sub">${done}/${book.chapters.length} read · ~${mins} min total</div>
      </div>
    </div>
    <p class="lib-book-detail-blurb">${escHTML(book.blurb)}</p>
    <div class="lib-read-list">${chapterReads.map(r=>readCard(r)).join('')}</div>
    ${footnote}`;
}
function readCard(read){
  const r=resolveRead(read);
  const open=openRead===read.id;
  const isDone=isRead(read.id);
  const tag=r.bookTitle?`<span class="lib-read-tag" title="${escHTML(r.bookAuthor||'')}">FROM “${escHTML(r.bookTitle).toUpperCase()}”</span>`:(r.fromBook?'<span class="lib-read-tag">FROM THE BOOK</span>':'');
  return`<div class="lib-read-card${open?' open':''}${isDone?' done':''}">
    <div class="lib-read-hd" onclick="toggleLibraryRead('${read.id}')">
      <div class="lib-read-check${isDone?' on':''}" onclick="event.stopPropagation();flipRead('${read.id}');topicDetail();bookDetail();" title="Mark as read">${isDone?'✓':''}</div>
      <div class="lib-read-hd-txt">
        <div class="lib-read-title">${escHTML(r.title)}</div>
        <div class="lib-read-meta">${tag}<span class="lib-read-time">${readTimeLabel(read)}</span></div>
      </div>
      <div class="lib-read-caret">${open?'▲':'▼'}</div>
    </div>
    ${open?`<div class="lib-read-body">${r.body.split('\n\n').map(p=>`<p>${escHTML(p)}</p>`).join('')}${r.tip?`<div class="lib-read-tip"><span>TRY THIS</span>${escHTML(r.tip)}</div>`:''}
      <div class="lib-ai-row">
        <button class="lib-ai-btn" onclick="deepDive('${read.id}')">✨ PERSONALIZE THIS FOR ME</button>
        <span class="lib-ai-hint">Uses your Gemini key</span>
      </div>
      <div class="lib-ai-output" id="lib-ai-out-${read.id}" style="display:none"></div>
    </div>`:''}
  </div>`;
}
function toggleLibraryRead(id){
  const wasOpen=openRead===id;
  openRead=wasOpen?null:id;
  if(!wasOpen)markRead(id);
  topicDetail();
  bookDetail();
}

function situationNote(){
  const parts=[];
  if(typeof tasks!=='undefined'){
    const openA=tasks.filter(t=>t.type==='A'&&!t.done).length;
    const openB=tasks.filter(t=>t.type==='B'&&!t.done).length;
    parts.push(`Open tasks: ${openA} A-task(s), ${openB} B-task(s).`);
  }
  if(typeof streakData!=='undefined')parts.push(`Current daily streak: ${streakData.current} day(s).`);
  return parts.length?parts.join(' '):'No specific data available.';
}
async function deepDive(id){
  const entry=findRead(id);
  if(!entry)return;
  const r=resolveRead(entry);
  if(!baiGetGeminiKey()){
    baiSetupGemini();
    if(!baiGetGeminiKey())return;
  }
  const box=$('lib-ai-out-'+id);
  if(!box)return;
  box.style.display='block';
  box.innerHTML='<div style="opacity:.75">✨ Thinking about how this applies to you…</div>';
  const prompt=`You are the Librarian inside BLOC, a personal task/time-management app. A person has this idea open in front of them right now:\n\nTitle: ${r.title}\nIdea: ${r.body}\n${baiProfileBlock()}\nHere is a short snapshot of their current situation:\n${situationNote()}\n\nIn 3-4 short sentences, plain text (no markdown, no headers, no asterisks), explain specifically how this idea applies to their situation right now and give one concrete next action. Reference their actual data where relevant — don't just restate the idea generically. You are not a therapist and must not give medical or mental-health advice.`;
  try{
    const text=await baiCallGemini(prompt,{maxOutputTokens:500,thinkingLevel:'low'});
    box.innerHTML=`<div class="lib-ai-out-body">${escHTML(text).replace(/\n\s*\n/g,'<br><br>').replace(/\n/g,'<br>')}</div><div class="lib-ai-out-note">Sent to Gemini (using your key) — this idea, plus a short snapshot of your open tasks and streak, only for this request.</div>`;
  }catch(err){
    box.innerHTML=`<div style="opacity:.75">Couldn't reach Gemini: ${escHTML(err.message||'unknown error')}</div>`;
  }
}

const LIB_FILTERS=[
  {key:'all',label:'All'},
  {key:'tasks',label:'Tasks'},
  {key:'calendar',label:'Calendar'},
  {key:'weekly',label:'Weekly'},
  {key:'planning',label:'Planning'},
  {key:'focus',label:'Focus'},
  {key:'goals',label:'Goals'},
  {key:'general',label:'General'},
];
let libFilter='all';
let libIndex=0;
let playTimer=null;

function quotePool(){
  const all=[
    ...TRACY_QUOTES.map(q=>({kind:'quote',id:q.id,ctx:q.ctx,title:null,text:q.text})),
    ...TRACY_INSIGHTS.map(i=>({kind:'insight',id:i.id,ctx:i.ctx,title:i.title,text:i.body})),
  ];
  if(libFilter==='all')return all;
  return all.filter(x=>x.ctx.includes(libFilter));
}
function renderFilters(){
  const row=$('lib-filter-row');if(!row)return;
  row.innerHTML=LIB_FILTERS.map(f=>
    `<button class="lib-chip${f.key===libFilter?' on':''}" onclick="setLibraryFilter('${f.key}')">${f.label}</button>`
  ).join('');
}
function setLibraryFilter(key){
  libFilter=key;libIndex=0;
  renderFilters();renderSpotlight();renderGrid();
  stopPlay();startPlay();
}
function renderSpotlight(){
  const pool=quotePool();
  const box=$('lib-spotlight');if(!box)return;
  if(!pool.length){box.innerHTML='<p class="lib-empty">Nothing in this category yet.</p>';return;}
  if(libIndex>=pool.length)libIndex=0;
  const entry=pool[libIndex];
  box.innerHTML=entry.kind==='quote'
    ?`<span class="tracy-strip-mark">“</span><p class="lib-spot-text">${escHTML(entry.text)}</p><span class="lib-spot-attr">— Brian Tracy</span>`
    :`<span class="lib-spot-kind">FROM THE BOOK</span><h4 class="lib-spot-title">${escHTML(entry.title)}</h4><p class="lib-spot-text">${escHTML(entry.text)}</p>`;
}
function libraryNext(){const pool=quotePool();if(!pool.length)return;libIndex=(libIndex+1)%pool.length;renderSpotlight();syncGridActive();}
function libraryPrev(){const pool=quotePool();if(!pool.length)return;libIndex=(libIndex-1+pool.length)%pool.length;renderSpotlight();syncGridActive();}
function toggleLibraryPlay(){if(playTimer){stopPlay();}else{startPlay();}}
function startPlay(){
  const btn=$('lib-play-btn');if(!btn)return;
  if(playTimer)return;
  btn.textContent='⏸ PAUSE';btn.classList.add('playing');
  queueTick();
}
function queueTick(){
  const pool=quotePool();
  if(!pool.length){playTimer=null;return;}
  const entry=pool[libIndex];
  const dwell=estWisdomDwellMs(entry.text);
  playTimer=setTimeout(()=>{
    if(document.hidden||libMode!=='quotes'){queueTick();return;}
    libraryNext();
    queueTick();
  },dwell);
}
function stopPlay(){
  if(playTimer){clearTimeout(playTimer);playTimer=null;}
  const btn=$('lib-play-btn');if(btn){btn.textContent='▶ PLAY';btn.classList.remove('playing');}
}
function renderGrid(){
  const grid=$('lib-grid');if(!grid)return;
  const pool=quotePool();
  grid.innerHTML=pool.map((entry,i)=>
    `<div class="lib-card${i===libIndex?' active':''}" onclick="jumpTo(${i})">
      ${entry.kind==='insight'?`<div class="lib-card-title">${escHTML(entry.title)}</div>`:''}
      <p>${escHTML(entry.text)}</p>
      ${entry.kind==='quote'?'<span class="lib-card-attr">— Brian Tracy</span>':'<span class="lib-card-attr">Concept note</span>'}
    </div>`
  ).join('');
}
function syncGridActive(){
  document.querySelectorAll('#lib-grid .lib-card').forEach((el,i)=>el.classList.toggle('active',i===libIndex));
  const active=document.querySelector('#lib-grid .lib-card.active');
  if(active&&typeof active.scrollIntoView==='function')active.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function jumpTo(i){libIndex=i;renderSpotlight();syncGridActive();}



const LIB_CATS=[
  {id:'all',label:'All'},
  {id:'start',label:'Getting Started'},
  {id:'focus',label:'Focus & Doing'},
  {id:'plan',label:'Planning & Time'},
  {id:'habits',label:'Habits & Routine'},
  {id:'study',label:'Study & School'},
  {id:'work',label:'Work & Career'},
  {id:'mind',label:'Energy & Mindset'},
  {id:'mine',label:'My Saved Guides'},
];
const LIB_AUDIENCES=[
  {id:'student',label:'Student'},
  {id:'early',label:'Early career'},
  {id:'pro',label:'Professional'},
  {id:'manager',label:'Manager / leader'},
  {id:'free',label:'Self-employed'},
  {id:'all',label:'Just me'},
];

const LIB_ORIGINAL_META={
  procrastination:{cat:'focus',aud:['all']},
  chaos:{cat:'plan',aud:['all']},
  focus:{cat:'focus',aud:['all']},
  overwhelm:{cat:'plan',aud:['all']},
  followthrough:{cat:'focus',aud:['all']},
  habits:{cat:'habits',aud:['all']},
  busyness:{cat:'mind',aud:['pro','manager','free']},
  energy:{cat:'mind',aud:['all']},
};
LIBRARY_TOPICS.forEach(t=>{const m=LIB_ORIGINAL_META[t.id];if(m){t.cat=m.cat;t.aud=m.aud;}});

const LIB_MORE_TOPICS=[
{id:'no-system',cat:'start',aud:['all'],icon:'🌱',
 problem:"I've never managed to stick to any planning system",title:'Starting From Zero',
 ctx:['tasks','planning'],keywords:['beginner','newbie','never planned','bad at planning','organize','organise','disorganized','no system','start planning'],
 reads:[
 {id:'ns-1',title:'Why most planning systems fail in week two',body:"Most systems fail because they ask for too much: colour codes, daily reviews, five lists. Effort that high works while you are excited and collapses on the first busy day. The system that survives is the one you can still run when you are tired. Start with something almost embarrassingly small, then add one piece only after the small version has run for two weeks.",tip:"Run a version of planning that takes under two minutes a day for the next 14 days before adding anything."},
 {id:'ns-2',title:'The three-task day',body:"Each morning, choose three things that would make today count. Not ten. Three. Anything beyond them is a bonus, not a failure. A short list is easier to start, easier to finish, and it forces the useful question: what actually matters today? People who struggle with planning often do better with fewer commitments, not better tools.",tip:"Write down three tasks for today right now, then do the first one before checking anything else."},
 {id:'ns-3',title:'One place for everything',body:"If your tasks live in your head, three apps, sticky notes and old chats, you never trust any of them, so you keep re-checking all of them. Pick one place as the single home for tasks. When something comes in anywhere else, move it there. Trust in the list is what lets your mind stop holding everything at once.",tip:"Decide where your tasks live (this app counts). Move anything stray into it today."},
 {id:'ns-4',title:"Falling off is part of the process",body:"Everyone misses days. What matters is how you restart. The restart that works is the smallest one: skip the catch-up and the guilt, and just plan today. A system that needs a perfect streak to work is a fragile system. Treat the gap as information about what was too hard, then shrink the plan.",tip:"If you have fallen off, do not catch up. Plan only today, with three tasks."},
 ]},
{id:'exams',cat:'study',aud:['student'],icon:'📝',
 problem:"I have exams coming and I don't know how to study",title:'Studying That Actually Works',
 ctx:['focus','planning'],keywords:['exam','exams','test','tests','revision','revise','study','studying','finals','memorize','memorise','school','university','college'],
 reads:[
 {id:'ex-1',title:'Testing yourself beats re-reading',body:"Re-reading notes feels productive because the material looks familiar, but familiar is not the same as remembered. Pulling an answer out of memory, with a blank page, flashcards or practice questions, is what strengthens recall. It feels harder and slower, and that difficulty is the point. Studies of learning have repeatedly found self-testing beats re-reading for lasting memory.",tip:"Close your notes and write down everything you remember about one topic. Then check what you missed."},
 {id:'ex-2',title:'Spread it out instead of cramming',body:"Seeing the same material on several different days sticks far better than the same total hours packed into one night. Each time you come back, a little has faded and you have to work to retrieve it, which is exactly what builds memory. Cramming can get you through tomorrow, but most of it is gone within days. Even three shorter sessions spread over a week beat one long one.",tip:"Split one subject into three 30-minute sessions on three different days this week."},
 {id:'ex-3',title:'Start from what will be tested',body:"A common trap is studying what feels comfortable instead of what the exam will ask. Before you start, find out the format and the topics: past papers, the syllabus, the teacher's hints. Then sort topics into strong, shaky and unknown. Spend most of your time on shaky, because strong topics feel good but add little, and unknown ones may be cheaper to learn than you fear.",tip:"List your exam topics and mark each strong, shaky or unknown. Study a shaky one first."},
 {id:'ex-4',title:'A two-week countdown plan',body:"Work backwards from the exam date. Give each topic a day. Leave the last two days for mixed practice and a lighter final review, not new material. Put the hardest subject in your best-focus hours and the easy review in your low-energy ones. A plan on paper turns a vague dread into a checklist, and the dread usually shrinks once the list exists.",tip:"Count the days until your exam, write one topic per day, and keep the last two days free."},
 ]},
{id:'school-life',cat:'study',aud:['student'],icon:'🎒',
 problem:"Homework, clubs and friends are all colliding",title:'School & Life Balance',
 ctx:['calendar','planning'],keywords:['homework','assignment','assignments','clubs','sports','friends','school','balance','teenager','student','overloaded'],
 reads:[
 {id:'sl-1',title:'Map the fixed stuff first',body:"Before planning study time, mark everything that cannot move: classes, practice, meals, travel, sleep. What is left is your real free time, and it is usually smaller than it feels. Seeing it clearly stops the guilt of 'I should be studying right now' and lets you place work into actual gaps instead of imaginary ones.",tip:"Block your fixed commitments in the calendar for this week, then look at the gaps."},
 {id:'sl-2',title:'Do homework in the first gap, not the last',body:"Work you leave until the evening gets done tired or not at all. The first free slot after school, even 25 minutes, is nearly always better than 9pm. A short early start also removes the background worry that makes free time less enjoyable. Aim to finish the hardest piece first and leave easy reading for later.",tip:"Pick the first free slot tomorrow and put one homework task in it."},
 {id:'sl-3',title:'Write down every due date in one place',body:"Missed deadlines at school are usually forgotten deadlines, not lazy students. Teachers say them out loud once and move on. Put every due date into one list the moment you hear it, including the small ones. At the start of each week, look at the next 14 days so nothing arrives as a surprise.",tip:"Add every due date you know about to your tasks now, and check them each Sunday."},
 {id:'sl-4',title:"Saying no to extras without guilt",body:"Every club, job and favour has a time cost, and your week has a limit. Saying yes to everything usually means doing most things badly. Before you accept something new, ask what it would replace. If the answer is sleep or your main goals, the honest answer is 'not right now', which is a complete and respectable reply.",tip:"Before agreeing to the next request, name what it would replace this week."},
 ]},
{id:'phone',cat:'focus',aud:['student','early','all'],icon:'📱',
 problem:"My phone keeps eating my time",title:'Phone & Scrolling Control',
 ctx:['focus'],keywords:['phone','scrolling','social media','tiktok','instagram','youtube','notifications','screen time','addicted','games'],
 reads:[
 {id:'ph-1',title:'Add friction, not willpower',body:"Apps are built to be effortless to open. You do not beat that with discipline, you beat it by adding a few steps. Log out after each use, move the app off the home screen, or delete it and use the browser version, which is clunkier. A few seconds of friction is often enough to break the automatic reach for the phone.",tip:"Pick your most time-eating app and move or log out of it right now."},
 {id:'ph-2',title:'Turn off the pings that are not people',body:"Most notifications are not messages from people. They are apps asking for your attention. Every one pulls you away and makes the next unlock more likely. Keep alerts for real people and real deadlines, and switch off the rest. After a week, most people notice they miss almost nothing.",tip:"Open notification settings and turn off every app that is not a person or a deadline."},
 {id:'ph-3',title:'Schedule scrolling instead of fighting it',body:"A rule of 'never' tends to snap. A scheduled slot, say 20 minutes after dinner, gives the habit a place to live so it does not leak into every gap. Knowing the slot is coming also makes it easier to postpone the urge now. It turns 'should I?' into 'not yet'.",tip:"Choose one daily 20-minute scroll slot and save phone time for then."},
 {id:'ph-4',title:'Notice the trigger before the tap',body:"Most phone checks are triggered by a feeling: boredom, a hard task, a little anxiety. If you can catch the moment right before you reach, you get a real choice. Even a three-second pause with the question 'what am I avoiding right now?' breaks the autopilot, and the answer is often the exact task you needed to do.",tip:"Next time you reach for your phone, pause and name what you were avoiding."},
 ]},
{id:'group',cat:'study',aud:['student','early'],icon:'👥',
 problem:"Group projects keep falling apart",title:'Group Work & Shared Deadlines',
 ctx:['tasks'],keywords:['group','team','teammates','project','partner','shared','slacker','collaboration','group project'],
 reads:[
 {id:'gr-1',title:'Split by deliverable, with a name and a date',body:"Group work fails when the work is 'everyone does a bit'. Replace that with a list: each piece, one named person, one date. Vague shared ownership means nobody feels responsible. Once every piece has a single owner, it becomes obvious who is stuck and who is done.",tip:"Write one line per part of the project: who does it and by when. Share it with the group."},
 {id:'gr-2',title:'Set an internal deadline before the real one',body:"If everyone's work arrives on the due date, there is no time to merge, fix or chase. Choose an earlier group deadline, a few days ahead, for first drafts. The gap absorbs the late piece and the surprise problem. Almost every group ends up needing it.",tip:"Set a group deadline 3 days before the real one and tell everyone."},
 {id:'gr-3',title:'A two-line check-in beats a long meeting',body:"A short regular check-in with two questions, what did you finish and what are you stuck on, finds problems early without taking an hour. Send it in the group chat midweek. Silence is a signal: someone who stops replying is usually stuck or overwhelmed, not uninterested.",tip:"Send your group two questions today: what is done, and what is blocking you?"},
 {id:'gr-4',title:'When someone is not delivering',body:"Start with the assumption that they are stuck, not careless. Ask directly and kindly: 'Do you need help with your part, or should we shift it?' Offer a smaller piece with a clear date. If it still does not arrive, tell your teacher or lead early with facts, not blame. Leaving it to the last day helps nobody.",tip:"Message the late person with a specific, smaller ask and a new date, not a complaint."},
 ]},
{id:'inbox',cat:'work',aud:['early','pro','manager'],icon:'📧',
 problem:"Meetings and messages swallow my whole day",title:'Email, Meetings & Interruptions',
 ctx:['calendar','tasks'],keywords:['email','emails','meetings','slack','messages','interruptions','inbox','calls','busy','reactive','notifications'],
 reads:[
 {id:'in-1',title:'Check email in batches',body:"If you answer messages as they arrive, other people set your agenda all day. Checking two or three set times, say mid-morning, after lunch and late afternoon, keeps replies reasonably fast and leaves long stretches of uninterrupted work. Most things that feel urgent can wait a couple of hours without harm.",tip:"Choose three times to check email tomorrow and keep it closed in between."},
 {id:'in-2',title:'Guard your first 90 minutes',body:"The start of the day is often your clearest time, and most people hand it to their inbox. If you start with the most important piece of work instead, the day has already produced something real before the interruptions begin. Even 60 protected minutes changes how the rest of the day feels.",tip:"Block the first hour of tomorrow for your top task and do not open email until it is done."},
 {id:'in-3',title:'Ask what a meeting is for',body:"Meetings without a purpose and an expected outcome tend to run long and end without decisions. Before accepting one, ask what it needs to decide. If nobody knows, a short written update may do the job. When you run meetings, put the goal in the title and end by saying who does what by when.",tip:"For your next meeting, write one sentence on what outcome would make it worthwhile."},
 {id:'in-4',title:'The two-minute rule, used carefully',body:"If a reply will take under two minutes, doing it now is cheaper than tracking it. But the rule is a trap if it becomes constant: small tasks are endless and quietly replace the important ones. Use it inside your batch times, not during deep work.",tip:"Do quick replies only during your email batches, not in the middle of focused work."},
 ]},
{id:'saying-no',cat:'work',aud:['early','pro','manager','free'],icon:'✋',
 problem:"I can't say no and keep taking on more",title:'Saying No & Setting Limits',
 ctx:['planning'],keywords:['no','boundaries','overcommitted','people pleasing','overworked','workload','extra work','asked','requests','favours','favors'],
 reads:[
 {id:'sn-1',title:'Not now is a real answer',body:"A flat no can feel rude, but a clear 'not now' is easier to say and easier to hear. You can add when you could help: 'I cannot take that on this week, but I could look at it next Tuesday.' It shows respect for the request without breaking your own plan.",tip:"Practise one sentence: 'I can't this week, but I can on ___.'"},
 {id:'sn-2',title:'Ask what should move instead',body:"When a boss or client adds something, the useful reply is not 'no' but 'happy to, which of these should I drop or delay?' It makes the trade-off visible and puts the priority decision back with the person who can make it. Many extra requests quietly disappear when they have to compete with something real.",tip:"Next time someone adds work, ask which existing item should move."},
 {id:'sn-3',title:'Every yes has a hidden cost',body:"A yes that takes two hours also takes the focus before and after it, and the time you now cannot spend on something else. Overcommitment usually builds from many small yeses that each looked cheap. Before agreeing, picture the actual hours and what they displace.",tip:"Before your next yes, write down roughly how many hours it will really take."},
 {id:'sn-4',title:'Finish the day on purpose',body:"Work with no end point expands into the evening. A short shutdown ritual, review what is done, write tomorrow's top three, close the laptop, tells your mind the day is finished. It protects rest, and well-rested people are better at the work and at saying no.",tip:"At a fixed time tonight, list tomorrow's top three tasks and then stop work."},
 ]},
{id:'estimates',cat:'plan',aud:['all'],icon:'⏱️',
 problem:"Everything takes longer than I expect",title:'Time Estimates & Deadlines',
 ctx:['planning','calendar'],keywords:['late','deadline','deadlines','estimate','underestimate','running behind','time','overrun','rushing','last minute'],
 reads:[
 {id:'es-1',title:'Why you always underestimate',body:"People picture the smooth version of a task and forget the interruptions, the hunt for files and the parts they did not foresee. Psychologists call this the planning fallacy, and it affects experts as much as beginners. The fix is not trying harder to guess, it is correcting for it.",tip:"Take your next gut-feel estimate and multiply it by 1.5."},
 {id:'es-2',title:'Look at how long it really took last time',body:"Your own past is a better forecast than your optimism. If the last similar task took three hours, plan for about three, whatever it feels like this time. Noting actual times for a few weeks quickly teaches you your real speeds.",tip:"For the next three tasks, jot down the estimate and the real time."},
 {id:'es-3',title:'Add buffer between things',body:"A plan with no slack breaks at the first delay and carries the delay forward. Leave gaps between blocks and keep one open slot per day for surprises. If nothing goes wrong you gain free time. If something does, your plan survives.",tip:"Leave a 15-minute gap after each major block in your plan tomorrow."},
 {id:'es-4',title:'Work backwards from the deadline',body:"Start at the due date and list the steps in reverse: what must exist the day before, the week before. Give each step its own date. This reveals early whether the deadline is realistic, and it turns one big scary date into a series of small ones you can hit.",tip:"Pick one deadline and write the last three steps before it, each with a date."},
 ]},
{id:'delegating',cat:'work',aud:['manager','free'],icon:'🤝',
 problem:"I'm doing everything myself and it's not sustainable",title:'Delegating & Leading',
 ctx:['planning'],keywords:['delegate','delegation','manager','lead','leader','team','micromanage','control','bottleneck','hand off','trust'],
 reads:[
 {id:'de-1',title:'Hand over the outcome, not the steps',body:"Delegating a list of exact steps keeps you in the work. Delegating an outcome, what good looks like, by when, and any limits, lets the other person find their way and frees you. Be clear about the result and flexible about the method.",tip:"Pick one task and write the outcome, the deadline and any limits in three lines."},
 {id:'de-2',title:'What to hand off first',body:"Look for tasks that are repeatable, that someone else could do 80% as well, and that drain your time. Perfection is the enemy here: if it is good enough, it is done. Keep for yourself the work only you can do, such as key decisions and relationships.",tip:"List five things you did this week and mark which could be done 80% as well by someone else."},
 {id:'de-3',title:'Set a check-in, then step back',body:"Delegation fails in two ways: no follow-up, or constant hovering. A fixed check-in point, say halfway, gives you visibility without interference. Agree it upfront so it feels like support, not suspicion.",tip:"When you delegate next, agree one specific check-in time."},
 {id:'de-4',title:"Redoing it yourself costs more than it saves",body:"Fixing someone's work in silence feels faster this time and teaches nobody anything, so the problem returns. Give short, specific feedback and let them fix it. The first round is slower, but you only pay it once.",tip:"Next time the work is not quite right, give one clear piece of feedback instead of redoing it."},
 ]},
{id:'selfdirected',cat:'work',aud:['free'],icon:'🏠',
 problem:"I work for myself or from home and my days have no structure",title:'Working Without a Boss',
 ctx:['calendar','planning'],keywords:['freelance','freelancer','self employed','self-employed','remote','work from home','wfh','founder','solo','no structure','entrepreneur'],
 reads:[
 {id:'sd-1',title:'Make a start and a stop',body:"Without an office, work blurs into everything. A simple start ritual, a walk, a coffee, opening the same document, tells your mind work has begun. A stop ritual closes it. Fixed edges make the hours between them far more productive, and the evenings more restful.",tip:"Choose a start time and a stop time for tomorrow and write both down."},
 {id:'sd-2',title:'Plan your week on Sunday or Monday',body:"With no manager setting priorities, a short weekly plan does that job. Choose the two or three outcomes that would make the week a success and put them in your calendar as blocks. Without it, urgent client messages decide your week for you.",tip:"Spend 15 minutes choosing your top three outcomes for this week and block time for them."},
 {id:'sd-3',title:'Set office hours for interruptions',body:"Being reachable all day means being unfocused all day. Tell clients and family when you reply, for example within a few hours, and keep to it. Most people accept clear rules far better than inconsistent availability.",tip:"Pick the times you answer messages and tell the people who contact you most."},
 ]},
{id:'morning-evening',cat:'habits',aud:['all'],icon:'🌗',
 problem:"My mornings and evenings are a mess",title:'Start & End of Day Routines',
 ctx:['planning','weekly'],keywords:['morning','evening','night','routine','wake up','late','sleep','bedtime','mornings','evenings','shutdown'],
 reads:[
 {id:'me-1',title:'A five-minute shutdown beats a perfect morning routine',body:"Most chaotic mornings are really unfinished evenings. A five-minute end-of-day routine, clear your desk, check tomorrow's calendar, write three tasks, lay out what you need, hands your morning self a plan. It is smaller and more reliable than an elaborate morning ritual.",tip:"Set a reminder for a five-minute shutdown tonight and do the four steps."},
 {id:'me-2',title:'Fix the first thirty minutes',body:"You do not need a perfect routine, just a predictable first half hour: same wake-up window, light, water, one small win such as making the bed. Predictability reduces decision-making when your energy is lowest. Keep the phone out of this window if you can.",tip:"Decide your first three actions after waking and do them in the same order tomorrow."},
 {id:'me-3',title:'Consistent timing matters more than the exact time',body:"Waking and sleeping around the same times each day tends to make mornings easier than chasing the 'ideal' schedule on some days and sleeping in on others. Choose a time you can actually keep, including weekends within an hour or so.",tip:"Choose a wake-up time you can keep seven days a week and stick to it for two weeks."},
 ]},
{id:'decisions',cat:'focus',aud:['all'],icon:'🔀',
 problem:"I waste ages deciding what to do next",title:'Deciding What to Do Next',
 ctx:['tasks','planning'],keywords:['decide','decision','choose','choosing','what next','indecisive','paralysis','options','too many choices'],
 reads:[
 {id:'dc-1',title:'Decide the order the night before',body:"Choosing the next task in the moment burns energy and invites distractions. Set the order of your top tasks in advance, then when one is done, simply start the next. You have turned a daily choice into a default.",tip:"Number your top three tasks for tomorrow before you finish today."},
 {id:'dc-2',title:'Set a time limit for the decision',body:"Most everyday decisions do not deserve more than a few minutes. Give yourself a short timer, pick the best option, and move on. A good decision made now beats a perfect decision made after an hour of circling.",tip:"Next time you hesitate, set a 3-minute timer and pick before it ends."},
 {id:'dc-3',title:'When two tasks tie, pick the one you are avoiding',body:"If you cannot decide between two, the one you feel resistance toward is usually the one that matters more. Starting it first removes it from your mind and makes the rest of the day easier.",tip:"Between two tied tasks today, start the one you least want to do."},
 ]},
{id:'perfectionism',cat:'mind',aud:['all'],icon:'💎',
 problem:"I won't start or finish unless it's perfect",title:'Perfectionism & Getting It Done',
 ctx:['tasks','focus'],keywords:['perfect','perfectionist','perfectionism','not good enough','redo','overthinking','polish','fear of failure','standards'],
 reads:[
 {id:'pf-1',title:'Give yourself permission for a rough first draft',body:"A blank page is intimidating because every word has to be good. A draft is allowed to be bad. Its only job is to exist so you can improve it, and improving something is far easier than creating it from nothing. Tell yourself 'this version is for me only'.",tip:"Write or build a deliberately rough first version of your task in the next 15 minutes."},
 {id:'pf-2',title:'Define done before you start',body:"Perfectionism has no finish line, which is why it never ends. Decide in advance what 'good enough' looks like, for instance 'three clear points and a summary'. When you reach that, stop. The extra hours rarely change how it is received.",tip:"Write one sentence defining 'done' for your current task before you continue."},
 {id:'pf-3',title:'Time-box the polish',body:"Set a fixed time for improving, such as 30 minutes, and stop when it ends. Without a limit, polishing expands to fill every hour you give it. Shipping something good on time is nearly always worth more than something flawless late.",tip:"Set a timer for the polish stage and hand it in when it rings."},
 ]},
{id:'low-motivation',cat:'mind',aud:['all'],icon:'🪫',
 problem:"I just have no motivation today",title:'Low-Motivation Days',
 ctx:['tasks','general'],keywords:['unmotivated','motivation','no motivation','bored','cant be bothered','lazy','low energy','dont feel like','demotivated','drained'],
 reads:[
 {id:'lm-1',title:'Action comes first, motivation follows',body:"We tend to wait to feel like it before starting, but the feeling often shows up after you begin. A few minutes of actual movement on a task changes how you feel about it. Lower the bar to something tiny and the feeling often follows.",tip:"Work on your easiest task for just five minutes and see how you feel after."},
 {id:'lm-2',title:'Have a minimum version of the day',body:"On heavy days a full plan is unrealistic, and failing it makes tomorrow worse. Decide in advance what the minimum looks like, perhaps one important task and one small chore. Meeting the minimum keeps the habit alive and the day counts.",tip:"Write down your minimum viable day: the one or two things that make today count."},
 {id:'lm-3',title:'Check the basics first',body:"Low drive is often about sleep, food, movement and daylight rather than character. A short walk, a proper meal or a glass of water will not fix everything, but they remove common causes. If low energy lasts for weeks, or feels heavy rather than just flat, it is worth talking to someone you trust or a health professional.",tip:"Before judging yourself today, get water, a snack and ten minutes of fresh air."},
 ]},
{id:'goals',cat:'plan',aud:['all'],icon:'🏔️',
 problem:"I have big goals but my days don't move them forward",title:'Turning Goals into Weekly Action',
 ctx:['weekly','general'],keywords:['goal','goals','dream','ambition','future','career','progress','long term','vision','direction','purpose'],
 reads:[
 {id:'go-1',title:'One goal, three weekly actions',body:"A big goal is too far away to act on today. Translate it into the two or three things you could do this week that would clearly move it forward. A weekly action is close enough to schedule and small enough to finish, and repeated weekly it adds up.",tip:"Pick one goal and write three actions you could take this week."},
 {id:'go-2',title:'Measure what you do, not only what you get',body:"Results are often outside your control and slow to show. Actions, such as 'three study sessions' or 'two outreach emails', are yours. Track those. If you hit your actions and the result still lags, adjust the plan, but you will know it was the plan and not the effort.",tip:"Choose one action number for this week, like 3 sessions, and track it."},
 {id:'go-3',title:'A fifteen-minute weekly review',body:"Once a week, look at what you did, what worked and what got in the way, then choose next week's focus. It is the cheapest tool for staying on course. Without it, weeks blur together and goals drift.",tip:"Put 15 minutes in your calendar this week for a review and next-week plan."},
 {id:'go-4',title:'Decide what you will not do',body:"Every goal needs room. If your week is already full, a new aim only works if something else goes. Name what you will drop or reduce for now. It is better to pause something on purpose than to let it fail by accident.",tip:"Name one thing you will pause for the next month to make room for your goal."},
 ]},
];

LIB_MORE_TOPICS.forEach(t=>{if(!LIBRARY_TOPICS.some(x=>x.id===t.id))LIBRARY_TOPICS.push(t);});

const LIB_RESOURCES=[
  {id:'anki',name:'Anki',url:'https://apps.ankiweb.net',use:'free flashcards with spaced repetition for studying and memorising',tags:['flashcards','memorize','memorise','exam','study','vocabulary','revision'],aud:['student','early']},
  {id:'learning-how',name:'Learning How to Learn (Coursera)',url:'https://www.coursera.org/learn/learning-how-to-learn',use:'a popular free-to-audit course on study techniques that work',tags:['study','learn','learning','memory','exam','school','university'],aud:['student','early','all']},
  {id:'khan',name:'Khan Academy',url:'https://www.khanacademy.org',use:'free lessons and practice for school subjects',tags:['math','maths','science','school','homework','lessons','exam'],aud:['student']},
  {id:'focusmate',name:'Focusmate',url:'https://www.focusmate.com',use:'work silently alongside another person on video to stay accountable',tags:['accountability','procrastinate','focus','alone','remote','home','start'],aud:['all','free','pro']},
  {id:'forest',name:'Forest',url:'https://www.forestapp.cc',use:'a focus timer app that helps you stay off your phone',tags:['phone','scrolling','distraction','focus','social media','screen time'],aud:['student','early','all']},
  {id:'freedom',name:'Freedom',url:'https://freedom.to',use:'blocks distracting sites and apps across your devices',tags:['distraction','websites','social media','phone','focus','blocker'],aud:['all','pro','free']},
  {id:'google-calendar',name:'Google Calendar',url:'https://calendar.google.com',use:'free calendar for time-blocking and reminders',tags:['calendar','schedule','plan','time blocking','reminders','deadline'],aud:['all']},
  {id:'todoist',name:'Todoist',url:'https://todoist.com',use:'a simple task manager if you need tasks on every device',tags:['tasks','todo','list','organize','organise','capture'],aud:['all','pro','free']},
  {id:'notion',name:'Notion',url:'https://www.notion.so',use:'flexible notes, projects and wikis in one place',tags:['notes','projects','knowledge','team','organize','organise','docs'],aud:['pro','manager','free','student']},
  {id:'james-clear',name:'James Clear (articles on habits)',url:'https://jamesclear.com',use:'practical, readable articles about building habits',tags:['habit','habits','routine','consistency','atomic'],aud:['all']},
  {id:'cal-newport',name:'Cal Newport (Study Hacks blog)',url:'https://calnewport.com',use:'essays on deep work, focus and sustainable productivity',tags:['focus','deep work','distraction','career','productivity','email'],aud:['pro','student','early','free']},
  {id:'zen-habits',name:'Zen Habits',url:'https://zenhabits.net',use:'calm writing on simplifying, focusing and habits',tags:['simple','simplify','overwhelm','habit','focus','stress'],aud:['all']},
  {id:'hbr',name:'Harvard Business Review',url:'https://hbr.org',use:'articles on management, delegation, meetings and career',tags:['manager','delegate','meeting','leadership','career','team','boundaries'],aud:['manager','pro','early']},
];

const CELEB_KEY='bloc_celebration_tier_v1';
function celebGetState(){
  let s=null;try{s=JSON.parse(localStorage.getItem(CELEB_KEY)||'null');}catch(e){}
  const todayISO=isoDate(bocNow());
  if(!s||s.dateISO!==todayISO)s={dateISO:todayISO,tier:0};
  return s;
}
function celebSaveState(s){localStorage.setItem(CELEB_KEY,JSON.stringify(s));}
function checkTiers(){
  if(typeof tasks==='undefined')return;
  const todayISO=isoDate(bocNow());
  const todays=tasks.filter(t=>t.dateISO===todayISO);
  const A=todays.filter(t=>t.type==='A'),B=todays.filter(t=>t.type==='B'),C=todays.filter(t=>t.type==='C');
  const aDone=A.length>0&&A.every(t=>t.done);
  const bDone=B.every(t=>t.done);
  const cDone=C.every(t=>t.done);
  let tier=0;
  if(aDone&&bDone&&cDone)tier=3;else if(aDone&&bDone)tier=2;else if(aDone)tier=1;
  const state=celebGetState();
  if(tier>state.tier){fireCelebration(tier);state.tier=tier;celebSaveState(state);renderTrophyBadge(true);}
  else if(tier<state.tier){state.tier=tier;celebSaveState(state);renderTrophyBadge(false);}
  else{renderTrophyBadge(false);}
}
function renderTrophyBadge(isNew){
  const el=document.getElementById('trophy-badge');if(!el)return;
  const state=celebGetState();
  if(state.tier<=0){el.classList.remove('show');el.innerHTML='';el.title='';return;}
  const cfg=CELEB_CFG[state.tier];
  const label=state.tier===3?'FULL CLEAR':state.tier===2?'A+B CLEAR':'A CLEAR';
  el.innerHTML=`<span class="trophy-badge-icon" style="background:radial-gradient(circle at 32% 28%,${cfg.hi} 0%,${cfg.mid} 55%,${cfg.lo} 100%);box-shadow:0 0 8px ${cfg.glow},0 0 3px rgba(0,0,0,.5) inset;"></span><span>${label}</span>`;
  el.title=cfg.caption+' — earned today, resets tomorrow';
  el.classList.add('show');
  if(isNew){el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');}
}

function celebCtx(){if(!window._celebCtx){try{window._celebCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){window._celebCtx=null;}}return window._celebCtx;}
function celebNoiseBuffer(ctx,dur){const n=ctx.sampleRate*dur,buf=ctx.createBuffer(1,n,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;return buf;}
function celebPlayThud(strength){
  const ctx=celebCtx();if(!ctx)return;const t0=ctx.currentTime;
  const osc=ctx.createOscillator(),g=ctx.createGain();
  osc.type='sine';osc.frequency.setValueAtTime(140*strength,t0);osc.frequency.exponentialRampToValueAtTime(38,t0+.28);
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.55*strength,t0+.012);g.gain.exponentialRampToValueAtTime(.001,t0+.42);
  osc.connect(g);g.connect(ctx.destination);osc.start(t0);osc.stop(t0+.45);
  const click=ctx.createOscillator(),cg=ctx.createGain();
  click.type='square';click.frequency.setValueAtTime(90,t0);cg.gain.setValueAtTime(.25*strength,t0);cg.gain.exponentialRampToValueAtTime(.001,t0+.05);
  click.connect(cg);cg.connect(ctx.destination);click.start(t0);click.stop(t0+.06);
}
function celebPlayWhoosh(dur,strength){
  const ctx=celebCtx();if(!ctx)return;const t0=ctx.currentTime;
  const src=ctx.createBufferSource();src.buffer=celebNoiseBuffer(ctx,dur);
  const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=.9;
  bp.frequency.setValueAtTime(2600,t0);bp.frequency.exponentialRampToValueAtTime(220,t0+dur);
  const g=ctx.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.32*strength,t0+dur*.35);g.gain.linearRampToValueAtTime(0,t0+dur);
  src.connect(bp);bp.connect(g);g.connect(ctx.destination);src.start(t0);src.stop(t0+dur);
}
function celebPlayChime(strength){
  const ctx=celebCtx();if(!ctx)return;const t0=ctx.currentTime;
  [523.25,659.25,783.99,1046.5].forEach((f,i)=>{
    const osc=ctx.createOscillator(),g=ctx.createGain();
    osc.type='sine';osc.frequency.value=f;
    const start=t0+i*.045;
    g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(.16*strength,start+.02);g.gain.exponentialRampToValueAtTime(.0008,start+1.1);
    osc.connect(g);g.connect(ctx.destination);osc.start(start);osc.stop(start+1.15);
  });
}
function celebPlayBell(){
  const ctx=celebCtx();if(!ctx)return;const t0=ctx.currentTime;
  [783.99,987.77,1174.66].forEach((f,i)=>{
    const osc=ctx.createOscillator(),g=ctx.createGain(),osc2=ctx.createOscillator(),g2=ctx.createGain();
    const start=t0+i*.09;
    osc.type='sine';osc.frequency.value=f;
    g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(.22,start+.015);g.gain.exponentialRampToValueAtTime(.0006,start+.9);
    osc.connect(g);g.connect(ctx.destination);osc.start(start);osc.stop(start+.95);
    osc2.type='sine';osc2.frequency.value=f*2.01;
    g2.gain.setValueAtTime(0,start);g2.gain.linearRampToValueAtTime(.06,start+.01);g2.gain.exponentialRampToValueAtTime(.0004,start+.5);
    osc2.connect(g2);g2.connect(ctx.destination);osc2.start(start);osc2.stop(start+.55);
  });
}
function celebPlayFanfare(){
  const ctx=celebCtx();if(!ctx)return;const t0=ctx.currentTime;
  [392,523.25,659.25,783.99,1046.5].forEach((f,i)=>{
    const osc=ctx.createOscillator(),g=ctx.createGain();
    osc.type='sawtooth';osc.frequency.value=f;
    const start=t0+i*.075;
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2200;
    g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(.14,start+.02);g.gain.exponentialRampToValueAtTime(.0006,start+1.3);
    osc.connect(lp);lp.connect(g);g.connect(ctx.destination);osc.start(start);osc.stop(start+1.35);
  });
  const susc=ctx.createOscillator(),sg=ctx.createGain();
  susc.type='sine';susc.frequency.value=1046.5*2;
  const sstart=t0+.4;
  sg.gain.setValueAtTime(0,sstart);sg.gain.linearRampToValueAtTime(.1,sstart+.05);sg.gain.exponentialRampToValueAtTime(.0004,sstart+1.6);
  susc.connect(sg);sg.connect(ctx.destination);susc.start(sstart);susc.stop(sstart+1.65);
}

const CELEB_CFG={
  1:{size:150,label:'A CLEARED',sub:'MUST-DO · COMPLETE',caption:'Priority A closed out',hi:'#f7c65a',mid:'#e8513a',lo:'#7a2412',glow:'rgba(232,81,58,.55)',shake:1,rings:1,rays:false,shards:0,confetti:0,confetti2:0,doubleThud:false,hold:1400,dropClass:'drop1'},
  2:{size:196,label:'A + B\nCLEARED',sub:'MUST-DO + SHOULD-DO',caption:'Priority A and B closed out',hi:'#f5cf6a',mid:'#e6a118',lo:'#6b4406',glow:'rgba(230,161,24,.6)',shake:2,rings:2,rays:true,shards:0,confetti:34,confetti2:0,doubleThud:true,hold:2100,dropClass:'drop2'},
  3:{size:232,label:'FULL CLEAR',sub:'A · B · C — ALL COMPLETE',caption:'Every priority task closed out today',hi:'#fbe08a',mid:'#e6a118',lo:'#5c3a05',glow:'rgba(230,161,24,.75)',shake:3,rings:3,rays:true,shards:10,confetti:55,confetti2:35,doubleThud:true,hold:2900,dropClass:'drop3'}
};
const CELEB_PARTICLE_COLORS=['#e8513a','#e6a118','#4ea8e8','#f0b428','#ede7d4'];

function fireCelebration(tier,cfgOverride){
  if(typeof appSettings!=='undefined'&&appSettings.celebrations===false)return;
  const base=CELEB_CFG[tier];if(!base)return;
  const cfg=cfgOverride?Object.assign({},base,cfgOverride):base;
  if(tier===1)fireCelebrationSeal(cfg);
  else if(tier===2)fireCelebrationMedal(cfg);
  else fireCelebrationTreasure(cfg);
}

const HABIT_CELEB_PALETTE={
  1:{hi:'#b6efc8',mid:'#3d8a55',lo:'#12331f',glow:'rgba(61,138,85,.6)'},
  2:{hi:'#c4f5d3',mid:'#2fa866',lo:'#0f3a22',glow:'rgba(47,168,102,.65)'},
  3:{hi:'#d8fbe3',mid:'#34c27a',lo:'#0b3320',glow:'rgba(52,194,122,.8)'}
};
function fireHabitCelebration(h,streak,marks){
  const weekly=!!(h&&h.frequency==='weekly');
  const idx=Math.max(0,(marks||[]).indexOf(streak));
  const tier=Math.min(3,idx+1);
  const unit=weekly?'WEEK':'DAY';
  const unitPl=weekly?'weeks':'days';
  let name=String((h&&h.title)||'').trim();
  if(name.length>22)name=name.slice(0,21)+'…';
  const esc=typeof escHTML==='function'?escHTML:(x=>String(x));
  fireCelebration(tier,Object.assign({},HABIT_CELEB_PALETTE[tier],{
    label:`${streak}-${unit}\nSTREAK`,
    sub:tier===3?`${streak}-${unit} STREAK`:'HABIT STREAK',
    caption:esc(name?`${name} · ${streak} ${unitPl} in a row`:`${streak} ${unitPl} in a row`)
  }));
}

function celebMakeOverlay(extraHTML,captionText){
  const overlay=document.createElement('div');overlay.className='celeb-overlay';
  overlay.innerHTML=`<div class="celeb-flash"></div><div class="celeb-shake">${extraHTML}</div><div class="celeb-caption">${captionText}</div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(()=>overlay.classList.add('dim'));
  let dismissed=false;
  const dismiss=()=>{if(dismissed)return;dismissed=true;overlay.classList.add('fading');setTimeout(()=>overlay.remove(),650);};
  overlay.addEventListener('click',dismiss);
  return {overlay,dismiss};
}

function fireCelebrationSeal(cfg){
  const {overlay,dismiss}=celebMakeOverlay(`
      <div class="celeb-scene" style="width:${cfg.size}px;height:${cfg.size}px;">
        <div class="celeb-shockwave-layer" style="position:absolute;left:50%;top:50%;width:0;height:0;"></div>
        <div class="celeb-seal drop1" style="width:${cfg.size}px;height:${cfg.size}px;--seal-hi:${cfg.hi};--seal-mid:${cfg.mid};--seal-lo:${cfg.lo};--seal-glow:${cfg.glow};">
          <div class="celeb-shine"></div>
          <div class="celeb-seal-label" style="font-size:${cfg.size*.135}px;white-space:pre-line;">${cfg.label}</div>
          <div class="celeb-seal-sub">${cfg.sub}</div>
        </div>
      </div>`,cfg.caption);
  const shockLayer=overlay.querySelector('.celeb-shockwave-layer');
  const caption=overlay.querySelector('.celeb-caption');
  const shakeEl=overlay.querySelector('.celeb-shake');
  const fallMs=680;
  setTimeout(()=>{
    celebPlayThud(.75);
    shakeEl.classList.add('go1');
    overlay.querySelector('.celeb-flash').classList.add('go');
    const ring=document.createElement('div');ring.className='celeb-shockwave go';
    ring.style.setProperty('--seal-glow',cfg.glow);
    shockLayer.appendChild(ring);setTimeout(()=>ring.remove(),1100);
    caption.classList.add('go');
  },fallMs);
  setTimeout(dismiss,fallMs+cfg.hold+900);
}

function fireCelebrationMedal(cfg){
  const {overlay,dismiss}=celebMakeOverlay(`
      <div class="celeb-scene" style="width:${cfg.size}px;height:${cfg.size+70}px;">
        <div class="celeb-shockwave-layer" style="position:absolute;left:50%;top:50%;width:0;height:0;"></div>
        <div class="celeb-rays"></div>
        <div class="celeb-medal-wrap swing" style="width:${cfg.size}px;height:${cfg.size}px;">
          <div class="celeb-ribbon"><svg viewBox="0 0 120 64"><path d="M60,0 L30,58 L60,44 L90,58 Z" fill="${cfg.mid}" stroke="${cfg.lo}" stroke-width="2"/></svg></div>
          <div class="celeb-medal" style="width:${cfg.size}px;height:${cfg.size}px;--seal-hi:${cfg.hi};--seal-mid:${cfg.mid};--seal-lo:${cfg.lo};--seal-glow:${cfg.glow};">
            <div class="celeb-shine"></div>
            <svg class="celeb-medal-star" width="${cfg.size*.42}" height="${cfg.size*.42}" viewBox="0 0 24 24"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.86L12 17.77l-6.18 3.23L7 14.14 2 9.27l7.1-1.01z" fill="${cfg.lo}"/></svg>
            <div class="celeb-medal-sub" style="font-size:10px;">${cfg.sub}</div>
          </div>
          <div class="celeb-seal-label" style="position:absolute;bottom:-30px;left:0;right:0;font-size:13px;white-space:pre-line;text-align:center;color:var(--txt);">${cfg.label}</div>
        </div>
      </div>`,cfg.caption);
  const shockLayer=overlay.querySelector('.celeb-shockwave-layer');
  const rays=overlay.querySelector('.celeb-rays');
  const medal=overlay.querySelector('.celeb-medal-wrap');
  const caption=overlay.querySelector('.celeb-caption');
  const shakeEl=overlay.querySelector('.celeb-shake');
  const fallMs=760;
  setTimeout(()=>{
    celebPlayThud(1);
    shakeEl.classList.add('go2');
    overlay.querySelector('.celeb-flash').classList.add('go');
    rays.classList.add('go');
    for(let i=0;i<2;i++){
      setTimeout(()=>{
        const ring=document.createElement('div');ring.className='celeb-shockwave go';
        ring.style.setProperty('--seal-glow',cfg.glow);
        shockLayer.appendChild(ring);setTimeout(()=>ring.remove(),1100);
      },i*160);
    }
    caption.classList.add('go');
    setTimeout(()=>{celebPlayBell();medal.classList.add('lockin2');},200);
    celebSpawnSparkles(overlay,16,cfg.mid);
    celebSpawnStreamers(overlay,22,cfg.hi,cfg.mid);
  },fallMs);
  setTimeout(dismiss,fallMs+cfg.hold+900);
}

function fireCelebrationTreasure(cfg){
  const {overlay,dismiss}=celebMakeOverlay(`
      <div class="celeb-fullflash"></div>
      <div class="celeb-scene" style="width:${cfg.size}px;height:${cfg.size}px;">
        <div class="celeb-shard-layer" style="position:absolute;left:50%;top:50%;width:0;height:0;"></div>
        <div class="celeb-shockwave-layer" style="position:absolute;left:50%;top:50%;width:0;height:0;"></div>
        <div class="celeb-rays"></div>
        <div class="celeb-crack"><svg viewBox="0 0 520 520"></svg></div>
        <div class="celeb-gem-wrap drop3b" style="width:${cfg.size}px;height:${cfg.size}px;">
          <svg width="${cfg.size*.7}" height="${cfg.size*.7}" viewBox="0 0 100 100" style="filter:drop-shadow(0 0 30px ${cfg.glow});">
            <defs><linearGradient id="gemg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="${cfg.hi}"/><stop offset="55%" stop-color="${cfg.mid}"/><stop offset="100%" stop-color="${cfg.lo}"/>
            </linearGradient></defs>
            <polygon points="50,4 78,32 66,90 34,90 22,32" fill="url(#gemg)" stroke="${cfg.lo}" stroke-width="2"/>
            <polygon points="50,4 78,32 50,40 22,32" fill="rgba(255,255,255,.4)"/>
            <polygon points="34,90 50,40 66,90" fill="rgba(0,0,0,.18)"/>
          </svg>
          <div class="celeb-gem-sub" style="font-size:10px;">${cfg.sub}</div>
        </div>
      </div>`,cfg.caption);
  const gem=overlay.querySelector('.celeb-gem-wrap');
  const shockLayer=overlay.querySelector('.celeb-shockwave-layer');
  const shardLayer=overlay.querySelector('.celeb-shard-layer');
  const rays=overlay.querySelector('.celeb-rays');
  const crack=overlay.querySelector('.celeb-crack');
  const caption=overlay.querySelector('.celeb-caption');
  const gemSub=overlay.querySelector('.celeb-gem-sub');
  const shakeEl=overlay.querySelector('.celeb-shake');
  const fullflash=overlay.querySelector('.celeb-fullflash');
  celebPlayWhoosh(.7,1);
  const fallMs=820;
  setTimeout(()=>{
    celebPlayThud(1.25);
    shakeEl.classList.add('go3');
    overlay.querySelector('.celeb-flash').classList.add('go');
    fullflash.classList.add('go');
    for(let i=0;i<3;i++){
      setTimeout(()=>{
        const ring=document.createElement('div');ring.className='celeb-shockwave go';
        ring.style.setProperty('--seal-glow',cfg.glow);
        shockLayer.appendChild(ring);setTimeout(()=>ring.remove(),1100);
      },i*140);
    }
    rays.classList.add('go');
    crack.querySelector('svg').innerHTML=celebCrackPaths();
    crack.classList.add('go');
    caption.classList.add('go');
    gemSub.classList.add('go');
    setTimeout(()=>celebPlayFanfare(),220);
    setTimeout(()=>{celebPlayThud(.65);gem.classList.add('lockin3');gem.classList.add('spin');},260);

    const dirs=[[-1,-1],[1,-1],[-1,1],[1,1],[-1,0],[1,0],[0,-1],[0,1],[-.7,.7],[.7,-.7]];
    for(let i=0;i<cfg.shards;i++){
      const [dx,dy]=dirs[i%dirs.length];
      const shard=document.createElement('div');
      shard.className='celeb-shard';
      const w=100+Math.random()*80,h=76+Math.random()*64;
      shard.style.width=w+'px';shard.style.height=h+'px';
      shard.style.marginLeft=(-w/2)+'px';shard.style.marginTop=(-h/2)+'px';
      shard.style.zIndex='-1';
      const farMag=900+Math.random()*550,nearMag=80+Math.random()*55;
      shard.style.setProperty('--fx',(dx*farMag)+'px');
      shard.style.setProperty('--fy',(dy*farMag)+'px');
      shard.style.setProperty('--fr',((Math.random()*140)-70)+'deg');
      shard.style.setProperty('--sx',(dx*nearMag)+'px');
      shard.style.setProperty('--sy',(dy*nearMag)+'px');
      shard.style.setProperty('--sr',((Math.random()*10)-5)+'deg');
      shard.style.animationDuration=(.55+Math.random()*.3)+'s';
      shard.style.animationDelay=(i*.045)+'s';
      shardLayer.appendChild(shard);
      requestAnimationFrame(()=>shard.classList.add('go'));
    }
    const fwCount=7;
    for(let i=0;i<fwCount;i++){
      setTimeout(()=>{
        const x=overlay.clientWidth*(.15+Math.random()*.7);
        const y=overlay.clientHeight*(.12+Math.random()*.45);
        celebSpawnFireworkAt(overlay,x,y);
      },260+i*260);
    }
    celebSpawnConfetti(overlay,55);
    setTimeout(()=>celebSpawnConfetti(overlay,35),480);
  },fallMs);
  setTimeout(dismiss,fallMs+cfg.hold+900);
}

function celebSpawnSparkles(overlay,count,color){
  const layer=document.createElement('div');
  layer.style.cssText='position:absolute;inset:0;pointer-events:none;';
  overlay.appendChild(layer);
  for(let i=0;i<count;i++){
    const el=document.createElement('div');
    el.className='celeb-sparkle';
    const sz=8+Math.random()*8;
    el.innerHTML=`<svg width="${sz}" height="${sz}" viewBox="0 0 24 24"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.86L12 17.77l-6.18 3.23L7 14.14 2 9.27l7.1-1.01z" fill="${color}"/></svg>`;
    const ang=Math.random()*Math.PI*2,r0=20+Math.random()*20,r1=r0+120+Math.random()*140;
    el.style.setProperty('--sx0',(Math.cos(ang)*r0)+'px');
    el.style.setProperty('--sy0',(Math.sin(ang)*r0)+'px');
    el.style.setProperty('--sx1',(Math.cos(ang)*r1)+'px');
    el.style.setProperty('--sy1',(Math.sin(ang)*r1-80-Math.random()*60)+'px');
    el.style.animationDelay=(Math.random()*.5)+'s';
    layer.appendChild(el);
    requestAnimationFrame(()=>el.classList.add('go'));
  }
  setTimeout(()=>{if(layer.parentNode)layer.remove();},2400);
}

function celebSpawnStreamers(overlay,count,colorA,colorB){
  const layer=document.createElement('div');
  layer.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden;';
  overlay.appendChild(layer);
  const W=overlay.clientWidth,H=overlay.clientHeight;
  const streamers=[];
  for(let i=0;i<count;i++){
    const el=document.createElement('div');
    el.className='celeb-streamer';
    const w=3+Math.random()*3,h=16+Math.random()*14;
    el.style.width=w+'px';el.style.height=h+'px';
    el.style.background=Math.random()>.5?colorA:colorB;
    layer.appendChild(el);
    streamers.push({
      el,x:Math.random()*W,y:-40-Math.random()*200,
      vy:90+Math.random()*70,sway:20+Math.random()*30,swaySpeed:1+Math.random()*1.4,phase:Math.random()*Math.PI*2,
      rot:Math.random()*360,vr:(Math.random()*160-80),
      born:performance.now(),life:2600+Math.random()*900
    });
  }
  let last=performance.now();
  function tick(now){
    const dt=Math.min((now-last)/1000,.032);last=now;
    let alive=false;
    streamers.forEach(p=>{
      const age=now-p.born;
      if(age>p.life||p.y>H+60){if(p.el.parentNode)p.el.remove();return;}
      alive=true;
      p.y+=p.vy*dt;
      p.rot+=p.vr*dt;
      const sx=p.x+Math.sin(p.phase+age*.001*p.swaySpeed)*p.sway;
      const fadeStart=p.life*.78;
      const op=age>fadeStart?Math.max(0,1-(age-fadeStart)/(p.life-fadeStart)):1;
      p.el.style.opacity=op;
      p.el.style.transform=`translate3d(${sx}px,${p.y}px,0) rotate(${p.rot}deg)`;
    });
    if(alive)requestAnimationFrame(tick);else if(layer.parentNode)layer.remove();
  }
  requestAnimationFrame(tick);
}

function celebSpawnFireworkAt(overlay,x,y){
  celebPlayChime(.55+Math.random()*.4);
  const layer=document.createElement('div');
  layer.style.cssText=`position:absolute;left:${x}px;top:${y}px;pointer-events:none;`;
  overlay.appendChild(layer);
  const n=18+Math.floor(Math.random()*10);
  const color=CELEB_PARTICLE_COLORS[Math.floor(Math.random()*CELEB_PARTICLE_COLORS.length)];
  for(let i=0;i<n;i++){
    const el=document.createElement('div');
    el.className='celeb-fw go';
    const sz=3+Math.random()*3;
    el.style.width=sz+'px';el.style.height=sz+'px';
    el.style.background=color;
    el.style.boxShadow=`0 0 6px ${color}`;
    const ang=(Math.PI*2*i/n)+Math.random()*.3;
    const dist=60+Math.random()*90;
    el.style.setProperty('--fwx',(Math.cos(ang)*dist)+'px');
    el.style.setProperty('--fwy',(Math.sin(ang)*dist)+'px');
    el.style.animationDuration=(.7+Math.random()*.4)+'s';
    layer.appendChild(el);
  }
  setTimeout(()=>{if(layer.parentNode)layer.remove();},1300);
}

function celebCrackPaths(){
  let s='';
  for(let i=0;i<7;i++){
    const ang=Math.random()*Math.PI*2,len=90+Math.random()*160;
    const x1=260,y1=260,x2=260+Math.cos(ang)*len,y2=260+Math.sin(ang)*len;
    const mx=(x1+x2)/2+(Math.random()*30-15),my=(y1+y2)/2+(Math.random()*30-15);
    s+=`<path d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" stroke="rgba(255,255,255,.85)" stroke-width="${1+Math.random()*1.5}" fill="none"/>`;
  }
  return s;
}

function celebSpawnConfetti(overlay,count){
  const layer=document.createElement('div');
  layer.style.cssText='position:absolute;inset:0;pointer-events:none;';
  overlay.appendChild(layer);
  const W=overlay.clientWidth,H=overlay.clientHeight,groundY=H*.5+260;
  const particles=[];
  for(let i=0;i<count;i++){
    const el=document.createElement('div');
    el.className='celeb-particle';
    const size=4+Math.random()*6,isSquare=Math.random()>.4;
    el.style.width=size+'px';el.style.height=(isSquare?size:size*2.4)+'px';
    el.style.background=CELEB_PARTICLE_COLORS[i%CELEB_PARTICLE_COLORS.length];
    el.style.borderRadius=isSquare?'1px':'2px';
    layer.appendChild(el);
    const angle=(-Math.PI/2)+(Math.random()*Math.PI-Math.PI/2)*.9;
    const speed=340+Math.random()*420;
    particles.push({
      el,x:0,y:0,
      vx:Math.cos(angle)*speed*(Math.random()>.5?1:-1),
      vy:Math.sin(angle)*speed,
      rot:Math.random()*360,vr:(Math.random()*540-270),
      bounced:false,born:performance.now(),life:2000+Math.random()*900
    });
  }
  const g=1500;
  let last=performance.now();
  function tick(now){
    const dt=Math.min((now-last)/1000,.032);last=now;
    let alive=false;
    particles.forEach(p=>{
      const age=now-p.born;
      if(age>p.life){if(p.el.parentNode)p.el.remove();return;}
      alive=true;
      p.vy+=g*dt;
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(p.y>groundY&&!p.bounced){p.y=groundY;p.vy*=-.38;p.vx*=.6;p.bounced=true;}
      else if(p.y>groundY&&p.bounced){p.y=groundY;p.vy=0;p.vx*=.92;}
      p.rot+=p.vr*dt;
      const fadeStart=p.life*.72;
      const op=age>fadeStart?Math.max(0,1-(age-fadeStart)/(p.life-fadeStart)):1;
      p.el.style.opacity=op;
      p.el.style.transform=`translate3d(${p.x}px,${p.y}px,0) rotate(${p.rot}deg)`;
    });
    if(alive)requestAnimationFrame(tick);else if(layer.parentNode)layer.remove();
  }
  requestAnimationFrame(tick);
}


const RTE_BUTTONS=[
  {cmd:'bold',label:'B',title:'Bold',style:'font-weight:700;'},
  {cmd:'italic',label:'I',title:'Italic',style:'font-style:italic;'},
  {cmd:'underline',label:'U',title:'Underline',style:'text-decoration:underline;'},
  {sep:true},
  {cmd:'insertUnorderedList',label:'☰',title:'Bullet list'},
  {cmd:'insertOrderedList',label:'①',title:'Numbered list'},
  {sep:true},
  {cmd:'link',label:'🔗',title:'Add link'},
  {cmd:'removeFormat',label:'Tx',title:'Clear formatting'},
];
function renderRteToolbar(containerId,targetId){
  const c=$(containerId);if(!c)return;
  c.innerHTML=RTE_BUTTONS.map(b=>b.sep?'<div class="rte-sep"></div>':
    `<button type="button" class="rte-btn" style="${b.style||''}" title="${b.title}" data-cmd="${b.cmd}" onmousedown="event.preventDefault()" onclick="richExec('${targetId}','${b.cmd}')">${b.label}</button>`
  ).join('');
}
function richExec(targetId,cmd){
  const el=$(targetId);if(!el)return;
  el.focus();
  if(cmd==='link'){
    const url=prompt('Link URL:','https://');
    if(!url)return;
    document.execCommand('createLink',false,url);
  }else{
    document.execCommand(cmd,false,null);
  }
}


const TASK_KEY='bloc_tasks_v1',COL_KEY='bloc_collapsed_v1',NID_KEY='bloc_nid_v1',DATE_KEY='bloc_last_date_v1';
let tasks=JSON.parse(localStorage.getItem(TASK_KEY)||'[]');
(function migrateTaskDates(){
  const todayISO=isoDate(bocNow());
  let changed=false;
  tasks.forEach(t=>{if(!t.dateISO){t.dateISO=todayISO;changed=true;}});
  if(changed)localStorage.setItem(TASK_KEY,JSON.stringify(tasks));
})();
(function migrateTaskProgress(){
  let changed=false;
  tasks.forEach(t=>{
    if(t.progressState===undefined){t.progressState=t.done?'done':'not_started';changed=true;}
    if(t.timeSpentMin===undefined){t.timeSpentMin=0;changed=true;}
  });
  if(changed)localStorage.setItem(TASK_KEY,JSON.stringify(tasks));
})();
function migrateTaskDependencies(){
  let changed=false;
  const ids=new Set(tasks.map(t=>t.id));
  tasks.forEach(t=>{
    if(t.dependsOn===undefined){t.dependsOn=null;changed=true;}
    else if(t.dependsOn&&!ids.has(t.dependsOn)){t.dependsOn=null;changed=true;}
  });
  if(changed)localStorage.setItem(TASK_KEY,JSON.stringify(tasks));
}
migrateTaskDependencies();
(function migrateSubtaskLinks(){
  let changed=false;
  tasks.forEach(t=>{
    if(t.subtasks&&t.subtasks.length)t.subtasks.forEach(st=>{if(!Array.isArray(st.links)){st.links=[];changed=true;}});
  });
  if(changed)localStorage.setItem(TASK_KEY,JSON.stringify(tasks));
})();
function accrueTaskProgress(taskId,elapsedSec){
  const t=tasks.find(x=>x.id===taskId);
  if(!t||!elapsedSec)return;
  t.timeSpentMin=Math.round((t.timeSpentMin||0)+elapsedSec/60);
  if(!t.done)t.progressState=(t.estimate&&t.timeSpentMin>=t.estimate)?'partial':'in_progress';
  saveT();
}

function getTaskDependency(t){
  if(!t||!t.dependsOn)return null;
  return tasks.find(x=>x.id===t.dependsOn)||null;
}
function isTaskBlocked(t){
  const dep=getTaskDependency(t);
  return !!(dep&&!dep.done);
}
function wouldCreateCycle(taskId,candidateDepId){
  let cur=candidateDepId,seen=new Set();
  while(cur){
    if(cur===taskId)return true;
    if(seen.has(cur))return false;
    seen.add(cur);
    const t=tasks.find(x=>x.id===cur);
    cur=t?t.dependsOn:null;
  }
  return false;
}
function setTaskDependency(tid,depId){
  const t=tasks.find(x=>x.id===tid);if(!t)return;
  if(!depId){t.dependsOn=null;saveT();renderTasks();return;}
  if(depId===tid){showToast("A TASK CAN'T DEPEND ON ITSELF");return;}
  if(wouldCreateCycle(tid,depId)){showToast('THAT WOULD CREATE A CIRCULAR DEPENDENCY');return;}
  t.dependsOn=depId;saveT();renderTasks();showToast('DEPENDENCY SET');
}
function depDayLabel(iso){
  if(!iso)return'';
  const todayISO=isoDate(bocNow());
  if(iso===todayISO)return'TODAY';
  if(iso>todayISO&&isoDaysApart(todayISO,iso)===1)return'TOMORROW';
  return new Date(iso+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}).toUpperCase();
}
function isoDaysApart(fromISO,toISO){
  const[fy,fm,fd]=fromISO.split('-').map(Number);
  const[ty,tm,td]=toISO.split('-').map(Number);
  return Math.round((Date.UTC(ty,tm-1,td)-Date.UTC(fy,fm-1,fd))/86400000);
}
function depOptionsHTML(t){
  const opts=tasks.filter(x=>x.id!==t.id&&!wouldCreateCycle(t.id,x.id));
  return `<option value="">— None —</option>`+opts.map(x=>{
    const dLbl=depDayLabel(x.dateISO);
    const dTag=dLbl?`[${dLbl}] `:'';
    return `<option value="${x.id}"${t.dependsOn===x.id?' selected':''}>${dTag}${x.type}: ${escHTML(x.text.length>44?x.text.slice(0,44)+'…':x.text)}${x.done?' ✓ done':''}</option>`;
  }).join('');
}

const PLAN_KEY='bloc_plan_target_v1';
function loadPlanTarget(){
  let s=null;try{s=JSON.parse(localStorage.getItem(PLAN_KEY)||'null');}catch(e){}
  const todayISO=isoDate(bocNow());
  if(!s||s.dateISO!==todayISO)return 'today';
  return (s.target==='tomorrow'||s.target==='someday')?s.target:'today';
}
let addPlanTarget=loadPlanTarget();
function savePlanTarget(){localStorage.setItem(PLAN_KEY,JSON.stringify({dateISO:isoDate(bocNow()),target:addPlanTarget}));}
function planTargetISO(){
  if(addPlanTarget==='someday')return 'someday';
  return addPlanTarget==='tomorrow'?isoDate(new Date(bocNow().getTime()+86400000)):isoDate(bocNow());
}
function setPlanTarget(t){addPlanTarget=t;savePlanTarget();renderPlanTarget();}
function isTaskSomeday(t){return t.dateISO==='someday';}
function renderPlanTarget(){
  const wrap=$('plan-target');if(!wrap)return;
  wrap.querySelectorAll('.pt-btn').forEach(b=>b.classList.toggle('on',b.dataset.t===addPlanTarget));
  const on=wrap.querySelector('.pt-btn.on'),ind=$('pt-indicator');
  if(on&&ind&&on.offsetWidth){
    ind.style.width=on.offsetWidth+'px';
    ind.style.transform=`translateX(${on.offsetLeft}px)`;
  }
}
const secTarget={};
function secTargetFor(type){
  const t=secTarget[type];
  if(t&&t.mode==='custom'&&(!t.iso||t.iso<isoDate(bocNow())))return{mode:'today'};
  return t||{mode:addPlanTarget};
}
function secTargetISO(type){
  const t=secTargetFor(type),now=bocNow();
  if(t.mode==='someday')return'someday';
  if(t.mode==='custom')return t.iso;
  return isoDate(t.mode==='tomorrow'?new Date(now.getTime()+86400000):now);
}
const secDateLabel=iso=>new Date(iso+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
function secFullNote(type){
  if(type!=='A')return'';
  const iso=secTargetISO(type);
  if(iso==='someday'||tasks.filter(t=>t.type==='A'&&t.dateISO===iso).length<3)return'';
  return`⚠ MAX 3 A-TASKS FOR ${depDayLabel(iso)} — COMPLETE OR MOVE ONE FIRST`;
}
function setSecTarget(type,mode,iso){
  if(mode==='custom'){
    if(!iso)return;
    if(iso<isoDate(bocNow())){showToast('PICK TODAY OR A FUTURE DATE');return;}
    secTarget[type]={mode,iso};
  }else secTarget[type]={mode};
  secRefreshRow(type);
  const inp=document.querySelector(`#sec-${type} .inline-in`);if(inp)inp.focus();
}
function secRefreshRow(type){
  const row=document.querySelector(`#sec-${type} .inline-add`);if(!row)return;
  const cur=secTargetFor(type);
  row.querySelectorAll('.sw-btn').forEach(b=>b.classList.toggle('on',b.dataset.m===cur.mode));
  const txt=row.querySelector('.sw-date-txt');if(txt)txt.textContent=cur.mode==='custom'?secDateLabel(cur.iso):'Pick date';
  const note=document.querySelector(`#sec-${type} .amax-note`);
  if(note){const m=secFullNote(type);note.textContent=m;note.style.display=m?'':'none';}
}
window.addEventListener('resize',()=>{
  if($('view-tasks')&&$('view-tasks').classList.contains('active'))renderPlanTarget();
  if($('view-weekly')&&$('view-weekly').classList.contains('active')&&typeof positionWkModeIndicator==='function')positionWkModeIndicator();
});
let collapsed=JSON.parse(localStorage.getItem(COL_KEY)||'{}');
let nextId=parseInt(localStorage.getItem(NID_KEY)||'1');
const SECTS=[
  {type:'A',name:'Must Do',   desc:'Serious consequences if not done today',icon:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>'},
  {type:'B',name:'Should Do', desc:'Mild consequences — important but not urgent',icon:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l-1 6 3.5 4H6.5L10 9z"/><path d="M12 13v8"/></svg>'},
  {type:'C',name:'Nice to Do',desc:'No real consequences either way',icon:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></svg>'},
  {type:'D',name:'Delegate',  desc:'Assign to someone else, free yourself for A',icon:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7"/><path d="M9 7h8v8"/></svg>'},
  {type:'E',name:'Eliminate', desc:'Remove entirely — no meaningful value',icon:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1L20 20M8.1 15.9L20 4"/></svg>'},
];
function saveT(){localStorage.setItem(TASK_KEY,JSON.stringify(tasks));localStorage.setItem(COL_KEY,JSON.stringify(collapsed));localStorage.setItem(NID_KEY,String(nextId));}

const TCLOG_KEY='bloc_task_completion_log_v1';
const TCLOG_ARCHIVE_KEY='bloc_task_completion_log_archive_v1';
const TCLOG_KEEP_DAYS=90;
let taskCompletionLog=JSON.parse(localStorage.getItem(TCLOG_KEY)||'[]');
function saveTCLog(){
  localStorage.setItem(TCLOG_KEY,JSON.stringify(taskCompletionLog));
  archiveOldLogs();
}
function archiveOldLogs(){
  const cutoff=isoDate(new Date(bocNow().getTime()-TCLOG_KEEP_DAYS*86400000));
  const toArchive=taskCompletionLog.filter(l=>l.dateISO&&l.dateISO<cutoff);
  if(!toArchive.length)return;
  let archive=[];
  try{archive=JSON.parse(localStorage.getItem(TCLOG_ARCHIVE_KEY)||'[]');}catch(e){archive=[];}
  const byMonth={};
  toArchive.forEach(l=>{
    const month=l.dateISO.slice(0,7);
    byMonth[month]=byMonth[month]||{month,count:0,byType:{A:0,B:0,C:0,D:0,E:0}};
    byMonth[month].count++;
    if(byMonth[month].byType[l.type]!==undefined)byMonth[month].byType[l.type]++;
  });
  Object.values(byMonth).forEach(roll=>{
    const existing=archive.find(a=>a.month===roll.month);
    if(existing){
      existing.count+=roll.count;
      Object.keys(roll.byType).forEach(t=>existing.byType[t]=(existing.byType[t]||0)+roll.byType[t]);
    }else archive.push(roll);
  });
  localStorage.setItem(TCLOG_ARCHIVE_KEY,JSON.stringify(archive));
  taskCompletionLog=taskCompletionLog.filter(l=>!l.dateISO||l.dateISO>=cutoff);
  localStorage.setItem(TCLOG_KEY,JSON.stringify(taskCompletionLog));
}
function logTaskCompletion(t){taskCompletionLog.push({dateISO:isoDate(bocNow()),type:t.type,taskId:t.id,ts:Date.now()});saveTCLog();}
function unlogTaskCompletion(t){const todayISO=isoDate(bocNow());for(let i=taskCompletionLog.length-1;i>=0;i--){if(taskCompletionLog[i].taskId===t.id&&taskCompletionLog[i].dateISO===todayISO){taskCompletionLog.splice(i,1);break;}}saveTCLog();}

const DAYSTATE_KEY='bloc_day_state_v1';
let dayState=JSON.parse(localStorage.getItem(DAYSTATE_KEY)||'{}');
function saveDayState(){localStorage.setItem(DAYSTATE_KEY,JSON.stringify(dayState));}
function getDayState(iso){
  if(dayState[iso])return dayState[iso];
  const hasActivity=taskCompletionLog.some(l=>l.dateISO===iso)||sessions.some(s=>s.dateISO===iso);
  return hasActivity?'observed':'unobserved';
}
function markRestDay(iso){
  dayState[iso]='confirmed-rest';saveDayState();
  if(typeof recomputeStreak==='function')recomputeStreak();
  showToast('🌙 MARKED AS REST DAY');
  if($('view-weekly')&&$('view-weekly').classList.contains('active'))renderWeeklyReview();
}
function unmarkRestDay(iso){
  delete dayState[iso];saveDayState();
  if(typeof recomputeStreak==='function')recomputeStreak();
  showToast('REST DAY UNMARKED');
  if($('view-weekly')&&$('view-weekly').classList.contains('active'))renderWeeklyReview();
}

const STREAK_KEY='bloc_streak_v1';
const STREAK_VIS_KEY='bloc_streak_visible_v1';
let streakData=JSON.parse(localStorage.getItem(STREAK_KEY)||'{"current":0,"best":0,"lastDate":""}');
let streakVisible=JSON.parse(localStorage.getItem(STREAK_VIS_KEY))??true;
function saveStreak(){localStorage.setItem(STREAK_KEY,JSON.stringify(streakData));}
function toggleStreakVisible(){
  streakVisible=!streakVisible;
  localStorage.setItem(STREAK_VIS_KEY,JSON.stringify(streakVisible));
  renderStreak();
  const btn=$('streak-vis-btn');if(btn)btn.classList.toggle('streak-off',!streakVisible);
  showToast(streakVisible?'STREAK DISPLAY ON':'STREAK DISPLAY OFF');
}
function recomputeStreak(){
  const todayISO=isoDate(bocNow());
  let cursor=bocNow();
  let current=0;
  let guard=0;
  while(guard<3650){
    const iso=isoDate(cursor);
    const completedThatDay=sessions.some(s=>s.dateISO===iso&&s.completed);
    if(completedThatDay){
      current++;
    }else{
      const st=getDayState(iso);
      const showedUp=!!(typeof energyLog!=='undefined'&&energyLog[iso]);
      const bridges=st==='confirmed-rest'||st==='observed'||showedUp||iso===todayISO;
      if(!bridges)break;
    }
    cursor=new Date(cursor.getTime()-86400000);
    guard++;
  }
  streakData.current=current;
  streakData.best=Math.max(streakData.best,current);
  streakData.lastDate=bocNow().toDateString();
  saveStreak();renderStreak();
}
function updateStreak(){recomputeStreak();}
function renderStreak(){
  const badge=$('streak-badge'),num=$('streak-num');
  if(!badge||!num)return;
  if(!streakVisible){badge.style.display='none';return;}
  badge.style.display='';
  num.textContent=streakData.current;
  badge.classList.toggle('cold',streakData.current===0);
  badge.title=`Current streak: ${streakData.current} day${streakData.current!==1?'s':''}  Best: ${streakData.best} days`;
  const vbtn=$('streak-vis-btn');if(vbtn)vbtn.classList.toggle('streak-off',!streakVisible);
}


function calcScore(){
  const todayISO=isoDate(bocNow());
  const aTasks=tasks.filter(t=>t.type==='A'&&t.dateISO===todayISO);
  const aDone=aTasks.filter(t=>t.done).length;
  const aScore=aTasks.length?Math.round((aDone/aTasks.length)*45):0;
  const today=isoDate(bocNow());
  const todaySessions=sessions.filter(s=>s.dateISO===today);
  const todayCompleted=todaySessions.filter(s=>s.completed).length;
  const sessScore=Math.min(todayCompleted*15,30);
  const streakBonus=Math.min(streakData.current*5,25);
  return Math.min(aScore+sessScore+streakBonus,100);
}
function renderScore(){
  const score=calcScore();
  const badge=$('score-badge'),scoreEl=$('score-val');
  if(!badge||!scoreEl)return;
  if(tasks.length===0&&sessions.length===0){badge.style.display='none';return;}
  badge.style.display='inline-flex';
  scoreEl.textContent=score;
  badge.className='score-badge '+(score>=75?'good':score>=40?'ok':'low');
}

function focusHourlyStats(){
  const now=bocNow();
  const HALF_LIFE_DAYS=14;
  const buckets=Array.from({length:24},()=>({w:0,weightedSum:0}));
  taskCompletionLog.forEach(l=>{
    if(!l.ts||!l.dateISO)return;
    const ageDays=Math.max(0,(now-new Date(l.dateISO+'T12:00:00'))/86400000);
    const w=Math.pow(0.5,ageDays/HALF_LIFE_DAYS);
    const h=bocFromMs(l.ts).getHours();
    buckets[h].w+=w;
    buckets[h].weightedSum+=w*(WKI_WEIGHT[l.type]||1);
  });
  const totalW=buckets.reduce((a,b)=>a+b.w,0);
  if(totalW<1e-6)return null;
  const overallAvg=buckets.reduce((a,b)=>a+b.weightedSum,0)/totalW;
  return{perHour:buckets.map((b,h)=>({h,avg:b.w>0?b.weightedSum/b.w:null,w:b.w})),overallAvg,totalW};
}

function leverageScore(t){
  const weight=WKI_WEIGHT[t.type]||1;
  const recentImpacts=taskCompletionLog.filter(l=>l.type===t.type&&l.impactRating).slice(-10);
  const avgImpact=recentImpacts.length?recentImpacts.reduce((a,l)=>a+l.impactRating,0)/recentImpacts.length:3;
  return Math.round(weight*10+avgImpact*6);
}
function highLeverageTaskIds(){
  const open=tasks.filter(t=>!t.done&&t.dateISO!=='someday');
  const ranked=open.slice().sort((a,b)=>leverageScore(b)-leverageScore(a));
  const topN=Math.max(1,Math.ceil(open.length*0.2));
  return new Set(ranked.slice(0,topN).map(t=>t.id));
}

const SLEEP_START_MIN=23*60;
const SLEEP_END_MIN=7*60;

const FIT_DEFAULT_MIN=25;
function fitTaskMin(t){
  if(t.estimate>0)return{min:Math.max(t.estimate-(t.timeSpentMin||0),5),guess:false};
  return{min:FIT_DEFAULT_MIN,guess:true};
}
function fitTomorrowISO(){const d=bocNow();d.setDate(d.getDate()+1);return isoDate(d);}
function computeFitCheck(){
  const today=bocNow(),todayISO=isoDate(today);
  const nowMins=today.getHours()*60+today.getMinutes();
  const from=Math.max(nowMins,SLEEP_END_MIN);
  const windowMin=Math.max(SLEEP_START_MIN-from,0);
  const evs=(typeof calEventsForDate==='function'?calEventsForDate(todayISO):[])
    .filter(e=>!e.done&&e.end>from)
    .map(e=>({s:Math.max(e.start,from),e:Math.min(e.end,SLEEP_START_MIN)}))
    .filter(e=>e.e>e.s).sort((a,b)=>a.s-b.s);
  let busyMin=0,curEnd=-1;
  evs.forEach(e=>{const s=Math.max(e.s,curEnd);if(e.e>s){busyMin+=e.e-s;curEnd=e.e;}});
  const clockFree=Math.max(windowMin-busyMin,0);
  const dayBudget=Math.round(((typeof appSettings!=='undefined'&&appSettings.dailyHoursAvailable)||8)*60);
  const focusedToday=Math.round(sessions.filter(s=>s.dateISO===todayISO).reduce((a,s)=>a+s.elapsed,0)/60);
  const budgetLeft=Math.max(dayBudget-focusedToday,0);
  const capacity=Math.min(clockFree,budgetLeft);
  const limitedBy=clockFree<=budgetLeft?'clock':'budget';

  const open=tasks.filter(t=>!t.done&&!t._archived&&t.dateISO!=='someday'&&(!t.dateISO||t.dateISO===todayISO));
  const mine=open.filter(t=>t.type==='A'||t.type==='B'||t.type==='C');
  const notMine=open.length-mine.length;
  const order={A:0,B:1,C:2};
  const sorted=mine.map((t,i)=>({t,i})).sort((a,b)=>(order[a.t.type]-order[b.t.type])||(a.i-b.i)).map(x=>x.t);
  let acc=0,cut=false,guesses=0;
  const rows=sorted.map(t=>{
    const{min,guess}=fitTaskMin(t);
    if(guess)guesses++;
    let fits=false;
    if(!cut&&acc+min<=capacity){acc+=min;fits=true;}else cut=true;
    return{t,min,guess,fits};
  });
  const planned=rows.reduce((a,r)=>a+r.min,0);
  const over=Math.max(planned-capacity,0);
  const spill=rows.filter(r=>!r.fits);
  return{todayISO,nowMins,capacity,clockFree,budgetLeft,limitedBy,busyMin,dayBudget,focusedToday,
    planned,over,slack:Math.max(capacity-planned,0),rows,spill,spillMin:spill.reduce((a,r)=>a+r.min,0),
    spillHasA:spill.some(r=>r.t.type==='A'),guesses,notMine,empty:rows.length===0};
}
function fitM(min){const m=Math.max(Math.round(min),0);return m?fmtDur(m*60):'0m';}
function renderFitCheck(){
  const fc=computeFitCheck();
  const fitBody=$('fit-body'),btns=$('fit-btns');
  let h='';
  if(fc.empty){
    h=`<div class="fit-verdict ok">NOTHING OPEN</div><div class="fit-why">No open A/B/C tasks for today.${fc.notMine?` (${fc.notMine} Delegate/Eliminate item${fc.notMine===1?' doesn’t':'s don’t'} count against your time.)`:''}</div>`;
  }else{
    const fits=fc.spill.length===0;
    const verdict=fc.capacity===0?'NO TIME LEFT TODAY':fits?'IT FITS':"DOESN'T FIT";
    h=`<div class="fit-verdict ${fits?'ok':'over'}">${verdict}</div>
    <div class="fit-nums">
      <div><b>${fitM(fc.planned)}</b><span>PLANNED</span></div>
      <div><b>${fitM(fc.capacity)}</b><span>AVAILABLE</span></div>
      <div class="${fits?'ok':'over'}"><b>${fits?fitM(fc.slack):'−'+fitM(fc.over)}</b><span>${fits?'SLACK':'OVER'}</span></div>
    </div>`;
    const why=fc.limitedBy==='clock'
      ?`Limited by the clock: ${fmtClock(Math.max(fc.nowMins,SLEEP_END_MIN))} → ${fmtClock(SLEEP_START_MIN)}${fc.busyMin?`, minus ${fitM(fc.busyMin)} of calendar events`:''}.`
      :`Limited by your ${fc.dayBudget/60}h working day (${fitM(fc.focusedToday)} already focused). Change it in Settings.`;
    h+=`<div class="fit-why">${why}</div><div class="fit-list">`+fc.rows.map((r,i)=>{
      const lineBefore=!r.fits&&(i===0||fc.rows[i-1].fits)&&i>0?'<div class="fit-line"><span>THE LINE — everything below won’t fit</span></div>':'';
      return lineBefore+`<div class="fit-row ${r.fits?'in':'out'}">
        <span class="fit-mark">${r.fits?'✓':'✕'}</span>
        <span class="fit-type">${r.t.type}</span>
        <span class="fit-txt">${escHTML(r.t.text)}</span>
        <span class="fit-min">${r.guess?'~':''}${fitM(r.min)}</span>
        ${r.fits?'':`<button class="fit-mv" onclick="fitMove('${r.t.id}')" title="Move to tomorrow">→ TOMORROW</button>`}
      </div>`;
    }).join('')+`</div>`;
    const notes=[];
    if(fc.spillHasA)notes.push(`<b>Your A’s alone don’t fit.</b> Start the first one now, or shrink/split it — an A means real consequences today, so cut B and C before touching it.`);
    if(fc.guesses)notes.push(`${fc.guesses} task${fc.guesses===1?' has':'s have'} no estimate (<b>~</b> = counted as ${FIT_DEFAULT_MIN}m). Add estimates and this gets sharper.`);
    if(fc.notMine)notes.push(`${fc.notMine} Delegate/Eliminate item${fc.notMine===1?'':'s'} not counted.`);
    if(notes.length)h+=`<div class="fit-notes">${notes.map(n=>`<div>${n}</div>`).join('')}</div>`;
  }
  fitBody.innerHTML=h;
  const first=fc.rows.find(r=>r.fits&&!(typeof isTaskBlocked==='function'&&isTaskBlocked(r.t)));
  btns.innerHTML=
    (fc.spill.length?`<button class="wki-action-btn ghost fit-btn" onclick="fitMoveAll()">MOVE ${fc.spill.length} TO TOMORROW · ${fitM(fc.spillMin)}</button>`:'')
    +(first?`<button class="wki-action-btn ghost fit-btn" onclick="fitStartFirst('${first.t.id}')">START: ${escHTML(first.t.text.length>22?first.t.text.slice(0,22)+'…':first.t.text)} →</button>`:'')
    +`<button class="btn-keep fit-close" onclick="closeFitCheck()">CLOSE</button>`;
}
function fitMoveOne(id){
  const t=tasks.find(x=>x.id===id);if(!t)return false;
  const tmr=fitTomorrowISO();
  if(t.type==='A'&&tasks.filter(x=>x.type==='A'&&x.id!==id&&x.dateISO===tmr&&!x.done).length>=3){showToast('TOMORROW ALREADY HAS 3 A-TASKS');return false;}
  t.dateISO=tmr;return true;
}
function fitMove(id){
  if(fitMoveOne(id)){saveT();renderTasks();showToast('MOVED TO TOMORROW');}
  renderFitCheck();
}
function fitMoveAll(){
  const ids=computeFitCheck().spill.map(r=>r.t.id);
  let n=0;ids.forEach(id=>{if(fitMoveOne(id))n++;});
  if(n){saveT();renderTasks();}
  showToast(n===ids.length?`MOVED ${n} TO TOMORROW`:`MOVED ${n} · ${ids.length-n} BLOCKED (TOMORROW'S A LIMIT)`);
  renderFitCheck();
}
function fitStartFirst(id){
  closeFitCheck();
  showView('focus-setup');
  const sel=$('focus-task-select');
  if(sel){sel.value=id;sel.dispatchEvent(new Event('change',{bubbles:true}));}
}
function showFitCheck(){renderFitCheck();$('fit-overlay').classList.add('open');}
function closeFitCheck(){$('fit-overlay').classList.remove('open');}

function toggleKbdHint(e){
  if(e)e.stopPropagation();
  const kh=$('kbd-hint');
  if(kh)kh.classList.toggle('open');
}
function toggleDataMenu(e){
  if(e)e.stopPropagation();
  const dm=$('data-menu');
  if(dm)dm.classList.toggle('open');
}
function closeDataMenu(){
  const dm=$('data-menu');
  if(dm)dm.classList.remove('open');
}
document.addEventListener('click',(e)=>{
  const kh=$('kbd-hint'),trig=$('kbd-hint-trigger');
  if(kh&&kh.classList.contains('open')&&!kh.contains(e.target)&&e.target!==trig)kh.classList.remove('open');
  const dm=$('data-menu');
  if(dm&&dm.classList.contains('open')&&!dm.contains(e.target)&&!e.target.closest('.data-menu-wrap'))dm.classList.remove('open');
});
let highLeverageFilterActive=false;
function toggleHighLeverageFilter(){
  highLeverageFilterActive=!highLeverageFilterActive;
  const btn=$('leverage-toggle');
  btn.classList.toggle('on',highLeverageFilterActive);
  btn.setAttribute('aria-pressed',highLeverageFilterActive?'true':'false');
  renderSections();
  showToast(highLeverageFilterActive?'SHOWING TOP-LEVERAGE TASKS':'SHOWING ALL TASKS');
}

const ENERGY_KEY='bloc_energy_log_v1';
let energyLog=JSON.parse(localStorage.getItem(ENERGY_KEY)||'{}');
function saveEnergyLog(){localStorage.setItem(ENERGY_KEY,JSON.stringify(energyLog));}
let lowEnergyMode=(energyLog[isoDate(bocNow())]||0)>0&&energyLog[isoDate(bocNow())]<=2;
function logEnergy(n){
  const iso=isoDate(bocNow());
  energyLog[iso]=n;saveEnergyLog();
  renderEnergyRow();
  if(n<=2)enterLowEnergyMode();
  else if(lowEnergyMode)exitLowEnergyMode();
  showToast('ENERGY LOGGED: '+n+'/5');
}
function enterLowEnergyMode(){
  if(lowEnergyMode)return;
  lowEnergyMode=true;
  renderTasks();
  const fab=$('js-fab');if(fab)fab.classList.add('low-energy-highlight');
  showToast('🌙 LOW-ENERGY MODE ON');
}
function exitLowEnergyMode(){
  if(!lowEnergyMode)return;
  lowEnergyMode=false;
  renderTasks();
  const fab=$('js-fab');if(fab)fab.classList.remove('low-energy-highlight');
}
function toggleLowEnergyMode(){lowEnergyMode?exitLowEnergyMode():enterLowEnergyMode();}
function renderEnergyRow(){
  const iso=isoDate(bocNow());
  const level=energyLog[iso]||0;
  document.querySelectorAll('.energy-btn').forEach(b=>b.classList.toggle('on',parseInt(b.dataset.v)===level));
}
function openEnergyModal(){renderEnergyRow();$('energy-overlay').classList.add('open');}
function closeEnergyModal(){$('energy-overlay').classList.remove('open');}

function renderLowEnergyView(){
  const cont=$('sections');if(!cont)return;
  const todayISO=isoDate(bocNow());
  const openA=tasks.filter(t=>t.type==='A'&&!t.done&&!t._archived&&t.dateISO===todayISO)
    .sort((a,b)=>(a.created||0)-(b.created||0));
  const top=openA[0];
  let html=`<div class="low-energy-banner">🌙 Low-energy mode — showing just the one thing that matters right now.<button class="le-exit-btn" onclick="exitLowEnergyMode()">EXIT</button></div>`;
  if(top){
    const sIdx=SECTS.findIndex(s=>s.type==='A');
    html+=`<div class="task-list">${renderTI(SECTS[sIdx],top,0)}</div>`;
  }else{
    html+=`<div class="le-empty-copy">Nothing logged yet — and that's okay.<br>One small thing?</div>`;
  }
  cont.innerHTML=html;
}

const BACKFILL_CHIP_MIN={h1:60,h2:120,half:240,untracked:20};
const BACKFILL_CHIP_LABEL={h1:'Backfilled — ~1h',h2:'Backfilled — ~2h',half:'Backfilled — ~half day',untracked:'Backfilled — productive, untracked'};
let _backfillTargetISO=null;
const dateStrFor=iso=>new Date(iso+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
function openBackfill(iso){
  _backfillTargetISO=iso||isoDate(new Date(bocNow().getTime()-86400000));
  const input=$('backfill-date-input');
  if(input){input.value=_backfillTargetISO;input.max=isoDate(bocNow());}
  $('backfill-overlay').classList.add('open');
}
function closeBackfill(){$('backfill-overlay').classList.remove('open');}
function onBackfillDateChange(){
  const input=$('backfill-date-input');
  if(input&&input.value)_backfillTargetISO=input.value;
}
function confirmBackfill(chip){
  if(!_backfillTargetISO)return;
  const mins=BACKFILL_CHIP_MIN[chip]||30;
  const iso=_backfillTargetISO;
  sessions.unshift({
    id:'bf_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
    subject:BACKFILL_CHIP_LABEL[chip]||'Backfilled activity',
    mode:'free',target:mins*60,elapsed:mins*60,completed:true,
    date:dateStrFor(iso),dateISO:iso,distractions:0,
    source:'backfill',confidence:'low'
  });
  saveSessions();updateLogCount();
  if(dayState[iso]==='confirmed-rest'){delete dayState[iso];saveDayState();}
  if(typeof recomputeStreak==='function')recomputeStreak();
  closeBackfill();
  showToast('✓ BACKFILLED '+dateStrFor(iso).toUpperCase());
  if($('view-weekly')&&$('view-weekly').classList.contains('active'))renderWeeklyReview();
  if($('hist-panel')&&$('hist-panel').classList.contains('open'))renderHistory();
}
function reflectBackfillToday(chip){
  _backfillTargetISO=isoDate(bocNow());
  confirmBackfill(chip);
}


function resetAllTasks(){
  if(!tasks.length){showToast('NO TASKS TO CLEAR');return;}
  const n=tasks.length;
  const typed=prompt(`This deletes all ${n} task(s) across every section (A–E). This can't be undone.\n\nType DELETE to confirm.`);
  if(typed===null)return;
  if(typed.trim().toUpperCase()!=='DELETE'){showToast('RESET CANCELLED');return;}
  if(typeof calEvents!=='undefined'){const ids=new Set(tasks.map(t=>t.id));calEvents.forEach(ev=>{if(ev.taskId&&ids.has(ev.taskId))ev.taskId='';});saveCal();}
  tasks=[];
  collapsed={};
  saveT();
  renderTasks();
  showToast('ALL TASKS CLEARED');
}

const WELCOME_KEY='bloc_last_welcome_v1';
let _greetingSpeechText='';
let _unlockAttempted=false;

function timeSalutation(){
  const h=bocNow().getHours();
  if(h<5)return{word:'night',icon:'moon'};
  if(h<12)return{word:'morning',icon:'sunrise'};
  if(h<17)return{word:'afternoon',icon:'sun'};
  if(h<21)return{word:'evening',icon:'sunset'};
  return{word:'night',icon:'moon'};
}

function buildGreeting(){
  const{word,icon}=timeSalutation();
  const streak=streakData.current;
  const everWelcomed=!!localStorage.getItem(WELCOME_KEY);
  const templates=!everWelcomed?[
    `Hey {NAME} — welcome to BLOC. Let's build something good, one day at a time.`
  ]:[
    `Good ${word}, {NAME}. Ready to make today count?`,
    `Welcome back, {NAME} — let's pick up right where you left off.`,
    `Hey {NAME}, good ${word}. Your board's ready whenever you are.`,
    streak>0?`Good ${word}, {NAME} — day ${streak+1} of the streak. Let's keep it alive.`:`Good ${word}, {NAME}. Fresh day, clean slate.`,
    `Welcome back, {NAME}. Let's get after it.`
  ];
  const tpl=templates[Math.floor(Math.random()*templates.length)];
  const name=(appSettings.userName||'').trim();
  const nameSpeech=(appSettings.userNameSpeech||'').trim()||name;
  // With no name set, drop ", {NAME}" cleanly (or fall back to "there") so greetings still read naturally.
  const fill=(t,rep)=>name?t.replace('{NAME}',rep):t.replace(/, \{NAME\}/g,'').replace('{NAME}','there');
  return{
    icon,
    html:fill(tpl,`<span class="welcome-name">${escHTML(name)}</span>`),
    plain:fill(tpl,nameSpeech)
  };
}

function maybeShowWelcome(){
  if(!appSettings.showWelcome)return false;
  const today=bocNow().toDateString();
  if(localStorage.getItem(WELCOME_KEY)===today)return false;
  const{icon,html,plain}=buildGreeting();
  $('welcome-icon').innerHTML='<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-'+icon+'"/></svg>';
  $('welcome-text').innerHTML=html;
  $('welcome-date').textContent=bocNow().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  _greetingSpeechText=plain;
  _lastGreetingAudio=null;
  _unlockAttempted=false;
  $('welcome-overlay').classList.add('open');
  if(appSettings.voiceAutoplay)speakGreeting();
  return true;
}

function dismissWelcome(){
  localStorage.setItem(WELCOME_KEY,bocNow().toDateString());
  $('welcome-overlay').classList.remove('open');
  checkDailyReset();
}

let _voiceCache=[];
function refreshVoiceCache(){_voiceCache=('speechSynthesis'in window)?speechSynthesis.getVoices():[];}
if('speechSynthesis'in window){
  refreshVoiceCache();
  speechSynthesis.onvoiceschanged=refreshVoiceCache;
}
function bestVoice(){
  if(!_voiceCache.length)refreshVoiceCache();
  const english=_voiceCache.filter(v=>v.lang&&v.lang.toLowerCase().startsWith('en'));
  const pool=english.length?english:_voiceCache;
  return pool.find(v=>/natural|neural|enhanced|premium/i.test(v.name))
    ||pool.find(v=>/google/i.test(v.name))
    ||pool.find(v=>v.lang==='en-US')
    ||pool[0]||null;
}

let _lastGreetingAudio=null;

async function speakCloud(text,btnId='welcome-speak-btn'){
  if(appSettings.voiceEngine!=='openai'||!appSettings.openaiApiKey)return false;
  try{
    const speechReply=await fetch('https://api.openai.com/v1/audio/speech',{
      method:'POST',
      headers:{'Authorization':'Bearer '+appSettings.openaiApiKey,'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-4o-mini-tts',voice:appSettings.openaiVoice||'alloy',input:text})
    });
    if(!speechReply.ok)return false;
    const blob=await speechReply.blob();
    const audio=new Audio(URL.createObjectURL(blob));
    if(btnId==='welcome-speak-btn')_lastGreetingAudio=audio;
    const btn=btnId?$(btnId):null;
    audio.onplay=()=>btn&&btn.classList.add('speaking');
    audio.onended=audio.onerror=()=>btn&&btn.classList.remove('speaking');
    await audio.play();
    return true;
  }catch(e){return false;}
}

function speakBrowser(text,btnId='welcome-speak-btn'){
  if(!('speechSynthesis'in window))return Promise.resolve(false);
  return new Promise(resolve=>{
    try{
      speechSynthesis.cancel();
      const voice=bestVoice();
      const utter=new SpeechSynthesisUtterance(text);
      if(voice)utter.voice=voice;
      utter.rate=.97;utter.pitch=1;utter.volume=1;
      const btn=btnId?$(btnId):null;
      let started=false;
      utter.onstart=()=>{started=true;btn&&btn.classList.add('speaking');resolve(true);};
      utter.onend=utter.onerror=()=>{btn&&btn.classList.remove('speaking');if(!started)resolve(false);};
      speechSynthesis.speak(utter);
      setTimeout(()=>{if(!started)resolve(false);},500);
    }catch(e){resolve(false);}
  });
}

function armAutoplayUnlock(replay){
  if(_unlockAttempted)return;
  _unlockAttempted=true;
  const unlock=()=>{replay();document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);};
  document.addEventListener('pointerdown',unlock,{once:true});
  document.addEventListener('keydown',unlock,{once:true});
}

async function speakGreeting(){
  if(!_greetingSpeechText)return;
  if(_lastGreetingAudio){
    try{_lastGreetingAudio.currentTime=0;await _lastGreetingAudio.play();return;}catch(e){armAutoplayUnlock(()=>speakGreeting());return;}
  }
  const cloudOK=await speakCloud(_greetingSpeechText);
  if(cloudOK)return;
  if(appSettings.voiceEngine==='openai'&&appSettings.openaiApiKey){
    armAutoplayUnlock(()=>speakGreeting());
    return;
  }
  const browserOK=await speakBrowser(_greetingSpeechText);
  if(!browserOK)armAutoplayUnlock(()=>speakGreeting());
}
function replayGreeting(){speakGreeting();}

function speakTimerCue(text){
  if(!appSettings.timerVoiceAnnouncements)return;
  speakCloud(text,null).then(ok=>{if(!ok)speakBrowser(text,null);}).catch(()=>{});
}


let _crowdedDayWarnedToday=false;
let openLoopsFilterActive=false;
let openDetailsTaskId=null;
let openSubLinkPanels=new Set();
function checkDailyReset(){
  const today=bocNow().toDateString();
  const todayISO=isoDate(bocNow());
  const last=localStorage.getItem(DATE_KEY);
  if(!last||last!==today){
    injectRecurringTasks();
    if(last){const undone=tasks.filter(t=>!t.done&&!t.recurring&&t.dateISO&&t.dateISO!=='someday'&&t.dateISO<todayISO);if(undone.length>0)showDailyResetModal(undone);}
    addPlanTarget='today';savePlanTarget();renderPlanTarget();
    Object.keys(secTarget).forEach(k=>delete secTarget[k]);
    _crowdedDayWarnedToday=false;
  }
  localStorage.setItem(DATE_KEY,today);
}
function injectRecurringTasks(){
  const today=bocNow().toDateString();
  const todayISO=isoDate(bocNow());
  tasks.filter(t=>t.recurring).forEach(t=>{
    if(t.lastRecurDate!==today){
      t.done=false;t.lastRecurDate=today;t.dateISO=todayISO;
      t.progressState='not_started';t.timeSpentMin=0;
      if(t.subtasks&&t.subtasks.length)t.subtasks.forEach(st=>{st.done=false;});
    }
  });
  saveT();
}
function showDailyResetModal(undone){
  const list=$('reset-task-list');
  list.innerHTML=undone.map(t=>{
    const colors={A:'var(--pa)',B:'var(--pb)',C:'var(--pc)',D:'var(--pd)',E:'var(--pe)'};
    return`<div class="reset-task-item"><span class="reset-task-badge" style="color:${colors[t.type]};border-color:${colors[t.type]}">${t.type}</span><span style="flex:1">${escHTML(t.text)}</span></div>`;
  }).join('');
  $('daily-reset-overlay').classList.add('open');
}
function dailyRollover(action){
  const todayISO=isoDate(bocNow());
  const demoteMap={A:'B',B:'C',C:'D',D:'E',E:'E'};
  tasks.forEach(t=>{
    if(!t.done&&!t.recurring&&t.dateISO&&t.dateISO<todayISO){
      if(action==='demote')t.type=demoteMap[t.type]||t.type;
      else if(action==='archive')t._archived=true;
      if(action!=='archive')t.dateISO=todayISO;
    }
  });
  if(action==='archive')tasks=tasks.filter(t=>!t._archived);
  $('daily-reset-overlay').classList.remove('open');
  renderTasks();showToast(action==='keep'?'ROLLED OVER':action==='demote'?'TASKS DEMOTED':'ARCHIVE CLEARED');
}

function renderTasks(){
  {const ni=$('new-input');if(ni)ni.placeholder=tasks.length?'New task…':'What must get done today?';}
  renderDate();renderPlanTarget();renderEnergyRow();renderMITWidget();renderOpenLoopsPill();
  if(lowEnergyMode){
    renderLowEnergyView();
    $('daily-budget').style.display='none';
    renderProgress();
    const leBtn=$('le-toggle-btn');if(leBtn)leBtn.classList.add('on');
  }else{
    renderSections();renderProgress();renderBudget();
    const leBtn=$('le-toggle-btn');if(leBtn)leBtn.classList.remove('on');
  }
  renderScore();saveT();checkTiers();
}
function renderMITWidget(){
  const wrap=$('mit-widget'),list=$('mit-widget-list');
  if(!wrap||!list)return;
  // "Today's 3 most important" just repeated the A box below it, so it is switched off for everyone.
  wrap.style.display='none';return;
  const todayISO=isoDate(bocNow());
  const mits=tasks.filter(t=>t.type==='A'&&t.dateISO===todayISO);
  if(!mits.length){wrap.style.display='none';return;}
  wrap.style.display='block';
  list.innerHTML=mits.map((t,i)=>`
    <div class="mit-item${t.done?' done':''}">
      <div class="t-chk" onclick="toggleDone('${t.id}')" title="${t.done?'Done — click to undo':'Mark as done'}">${t.done?'✓':''}</div>
      <div class="mit-item-num">${i+1}</div>
      <div class="mit-item-txt">${escHTML(t.text)}</div>
    </div>`).join('');
}
function renderOpenLoopsPill(){
  const pill=$('open-loops-pill');if(!pill)return;
  const todayISO=isoDate(bocNow());
  const openLoops=tasks.filter(t=>!t.done&&(getAgeDays(t)>=3||(t.dateISO&&t.dateISO!=='someday'&&t.dateISO<todayISO)));
  if(!openLoops.length){pill.style.display='none';openLoopsFilterActive=false;return;}
  pill.style.display='inline-flex';
  pill.textContent=`${openLoops.length} open 3+ days`;
  pill.classList.toggle('on',openLoopsFilterActive);
  pill.setAttribute('aria-pressed',openLoopsFilterActive?'true':'false');
}
function toggleOpenLoopsFilter(){
  openLoopsFilterActive=!openLoopsFilterActive;
  renderSections();
  renderOpenLoopsPill();
}
function renderDate(){const d=bocNow();$('date-display').textContent=d.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});}
function renderProgress(){
  const todayISO=isoDate(bocNow());
  const todays=tasks.filter(t=>t.dateISO===todayISO);
  const tot=todays.length,done=todays.filter(t=>t.done).length,pct=tot?Math.round(done/tot*100):0;
  {const pw=document.querySelector('.prog-wrap');if(pw)pw.style.visibility=tot?'':'hidden';}
  $('prog-fill').style.width=pct+'%';$('prog-lbl').textContent=`${done} / ${tot} done`;
  {const aLeft=todays.filter(t=>t.type==='A'&&!t.done).length,ab=$('a-badge');
   ab.textContent=aLeft?`${aLeft} A task${aLeft>1?'s':''} left`:'';
   ab.style.display=aLeft?'inline-flex':'none';}
}
function renderBudget(){
  const todayISO=isoDate(bocNow());
  const withEst=tasks.filter(t=>!t.done&&t.estimate>0&&t.dateISO===todayISO);
  if(!withEst.length){$('daily-budget').style.display='none';return;}
  const total=withEst.reduce((a,t)=>a+(t.estimate||0),0);
  const hrs=Math.floor(total/60),mins=total%60;
  $('budget-txt').textContent=hrs>0?(mins>0?`${hrs}h ${mins}m planned`:`${hrs}h planned`):`${mins}m planned`;
  $('daily-budget').style.display='inline-flex';
  const availMin=(typeof appSettings!=='undefined'?(appSettings.dailyHoursAvailable||8):8)*60;
  $('daily-budget').classList.toggle('warn',total>availMin);
  if(total>availMin&&!_crowdedDayWarnedToday){
    _crowdedDayWarnedToday=true;
    showToast(`⚠ ${fmtDur((total-availMin)*60)} OVER YOUR ${appSettings.dailyHoursAvailable||8}H DAY — SOMETHING SHOULD MOVE`);
  }
}
function renderSections(){
  const cont=$('sections');cont.innerHTML='';
  const leverageSet=(typeof highLeverageFilterActive!=='undefined'&&highLeverageFilterActive)?highLeverageTaskIds():null;
  const todayISO=isoDate(bocNow());
  SECTS.forEach(s=>{
    let st=tasks.filter(t=>t.type===s.type&&t.dateISO!=='someday');
    if(typeof openLoopsFilterActive!=='undefined'&&openLoopsFilterActive){
      st=st.filter(t=>!t.done&&(getAgeDays(t)>=3||(t.dateISO&&t.dateISO<todayISO)));
    }else{
      st=st.filter(t=>t.done?t.dateISO===todayISO:true);
    }
    st=st.slice().sort((a,b)=>(a.dateISO||'').localeCompare(b.dateISO||''));
    if(leverageSet)st=st.filter(t=>leverageSet.has(t.id));
    const isClosed=collapsed[s.type];
    const div=document.createElement('div');
    div.className='sec'+(isClosed?' closed':'');
    div.dataset.t=s.type;div.id='sec-'+s.type;
    const done=st.filter(t=>t.done).length;
    div.innerHTML=`
      <div class="sec-hdr" onclick="toggleSec('${s.type}')">
        <div class="sec-letter">${s.type}</div>
        <div class="sec-icon">${s.icon||''}</div>
        <div class="sec-meta"><div class="sec-name">${s.name}</div><div class="sec-desc">${s.desc}</div>${s.eg?`<div class="sec-eg">e.g. ${s.eg}</div>`:''}</div>
        ${s.type!=='SOMEDAY'?`<button type="button" class="sec-help" onclick="event.stopPropagation();rbOpenLetter('${s.type}')" aria-label="What does ${s.type} mean? Open the rulebook" title="What does ${s.type} mean?">?</button>`:''}
        <div class="sec-cnt">${done}/${st.length}</div>
        <div class="sec-chev">▼</div>
      </div>
      <div class="sec-body" id="body-${s.type}" style="max-height:${isClosed?'0':'4000px'}"
        ondragover="secDragOver(event,'${s.type}')" ondrop="secDrop(event,'${s.type}')" ondragleave="secDragLeave(event,'${s.type}')">
        ${renderTaskList(s,st)}${renderInlineAddIf(s,st)}
      </div>`;
    cont.appendChild(div);
  });
  const somedayTasks=tasks.filter(t=>t.dateISO==='someday');
  {
    const isClosed=collapsed['SOMEDAY'];
    const div=document.createElement('div');
    div.className='sec'+(isClosed?' closed':'');
    div.id='sec-SOMEDAY';div.dataset.t='SOMEDAY';
    div.innerHTML=`
      <div class="sec-hdr" onclick="toggleSec('SOMEDAY')">
        <div class="sec-letter">∞</div>
        <div class="sec-meta"><div class="sec-name">Someday / Maybe</div><div class="sec-desc">Not now — parked, not forgotten</div></div>
        <div class="sec-cnt">${somedayTasks.filter(t=>t.done).length}/${somedayTasks.length}</div>
        <div class="sec-chev">▼</div>
      </div>
      <div class="sec-body" id="body-SOMEDAY" style="max-height:${isClosed?'0':'4000px'}"
        ondragover="secDragOver(event,'SOMEDAY')" ondrop="secDrop(event,'SOMEDAY')" ondragleave="secDragLeave(event,'SOMEDAY')">
        ${renderTaskList({type:'SOMEDAY'},somedayTasks)}
      </div>`;
    cont.appendChild(div);
  }
}
function renderTaskList(s,st){
  if(!st.length&&s.type==='A'){
    const first=!tasks.length;
    return`<div class="task-list"><div class="empty-sec empty-nudge">${first?'Add your first A task.':'No A tasks yet.'}<span>${first?'Pick the one thing that must get done today. You can have up to 3.':'What must get done today? You can have up to 3.'}</span><button type="button" class="empty-rb-link" onclick="openRulebook('which')">Not sure what counts as an A? Answer 4 quick questions →</button></div></div>`;
  }
  if(!st.length)return`<div class="task-list"><div class="empty-sec">${s.type==='SOMEDAY'?'Drag a task here to park it for later.':`No ${s.type} tasks yet.`}</div></div>`;
  return`<div class="task-list" id="tl-${s.type}">${st.map((t,i)=>renderTI(s,t,i)).join('')}</div>`;
}

function getAgeDays(t){return t.created?Math.floor((Date.now()-t.created)/86400000):0;}

function renderTI(s,t,i){
  const sub=s.type==='A'?`<div class="sub-tag">A-${i+1}</div>`:'';
  const estMin=t.estimate||0;
  const estTxt=estMin?`${estMin>=60?Math.floor(estMin/60)+'h'+(estMin%60?(' '+estMin%60+'m'):''):(estMin+'m')}`:'＋est';
  const estCls=estMin?'t-est set':'t-est';
  const recurCls=t.recurring?'t-recur':'t-recur inactive';
  const recurTxt=t.recurring?'↻ DAILY':'↻';
  const hasLinkedNote=typeof npNotes!=='undefined'&&npNotes.some(n=>n.linkType==='task'&&n.linkId===t.id&&(n.content||'').replace(/<[^>]+>/g,'').trim());
  const hasSubtasks=(t.subtasks&&t.subtasks.length>0)||t.dependsOn||hasLinkedNote;
  const detailsOpen=t.id===openDetailsTaskId;
  const expandCls='t-expand'+(hasSubtasks?' has-content':'')+(detailsOpen?' open':'');
  const subtasksDone=t.subtasks?t.subtasks.filter(s=>s.done).length:0;
  const subtasksTotal=t.subtasks?t.subtasks.length:0;
  const subtaskHint=subtasksTotal>0?` · ${subtasksDone}/${subtasksTotal}✓`:'';
  const subtaskPct=subtasksTotal>0?Math.round(subtasksDone/subtasksTotal*100):0;
  const subtaskBarHTML=subtasksTotal>0?`<div class="t-subprog" id="tsp-${t.id}" title="${subtasksDone}/${subtasksTotal} subtasks done"><div class="t-subprog-fill" style="width:${subtaskPct}%"></div></div>`:'';

  const ageDays=!t.done?getAgeDays(t):0;
  const ageCls=ageDays>=7?' aging-7':ageDays>=3?' aging-3':'';
  const ageBadge=ageDays>=7?`<span class="age-badge a7">${ageDays}d OLD</span>`:ageDays>=3?`<span class="age-badge a3">${ageDays}d</span>`:'';

  const todayISO=isoDate(bocNow());
  let planBadge='';
  if(t.dateISO&&t.dateISO!=='someday'&&t.dateISO>todayISO&&isoDaysApart(todayISO,t.dateISO)===1){
    planBadge='<span class="plan-badge">TOMORROW</span>';
  }else if(t.dateISO&&t.dateISO!=='someday'&&t.dateISO>todayISO){
    const dLbl=new Date(t.dateISO+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}).toUpperCase();
    planBadge=`<span class="plan-badge">${dLbl}</span>`;
  }else if(t.dateISO&&t.dateISO!=='someday'&&t.dateISO<todayISO){
    const dLbl=new Date(t.dateISO+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}).toUpperCase();
    planBadge=`<span class="plan-badge past">${dLbl}</span>`;
  }

  const depTask=getTaskDependency(t);
  let depBadge='';
  if(depTask){
    const depLbl=depTask.text.length>22?depTask.text.slice(0,22)+'…':depTask.text;
    depBadge=depTask.done
      ?`<span class="dep-badge done" title="Depended on &quot;${escHTML(depTask.text)}&quot; — now done">${uiI('link')}${escHTML(depLbl)}</span>`
      :`<span class="dep-badge blocked" title="Blocked until &quot;${escHTML(depTask.text)}&quot; is done">${uiI('lock')}${escHTML(depLbl)}</span>`;
  }

  const pState=t.progressState||(t.done?'done':(t.timeSpentMin?'in_progress':'not_started'));
  let progressPill='';
  if(!t.done&&(pState==='in_progress'||pState==='partial')&&t.timeSpentMin>0){
    const tsm=t.timeSpentMin;
    const tsTxt=tsm>=60?`${Math.floor(tsm/60)}h${tsm%60?' '+(tsm%60)+'m':''}`:`${tsm}m`;
    progressPill=`<span class="ti-progress-pill ${pState}" title="${tsTxt} accumulated across sessions, not reset by rollover">${uiI('timer')}${tsTxt}</span>`;
  }

  const subtaskHTML=`<div class="subtask-panel${detailsOpen?' open':''}" id="sub-${t.id}">
    <button class="task-notes-btn${hasLinkedNote?' has-content':''}" onclick="npOpenTaskNote('${t.id}')" title="Open this task's note in the Notes tab">${uiI('edit')}${hasLinkedNote?'Notes':'Add note…'}</button>
    <div class="dep-row">
      <span class="dep-row-lbl">${uiI('link')}Depends on</span>
      <select class="dep-select" onchange="setTaskDependency('${t.id}',this.value)" title="This task can't be started or completed until the one you pick here is done">
        ${depOptionsHTML(t)}
      </select>
    </div>
    <div class="subtask-list" id="stl-${t.id}">
      ${(t.subtasks||[]).map((st,si)=>subtaskRowHTML(t.id,st,si)).join('')}
    </div>
    <div class="subtask-add-row">
      <input class="subtask-in" placeholder="Add sub-task, or paste a link… (Enter)"
        onkeydown="addSub(event,'${t.id}',this)" onpaste="handleSubtaskPaste(event,'${t.id}',this)">
    </div>
  </div>`;
  let chkHTML;
  if(t.type==='D'){
    const lbl=t.done?`${uiI('arrow-up-right')}${t.delegatedTo?escHTML(t.delegatedTo):'Delegated'}`:uiI('arrow-up-right')+'Delegate';
    chkHTML=`<button type="button" class="t-action-btn t-delegate${t.done?' done':''}" onclick="delegateTask('${t.id}')" title="${t.done?'Delegated — click to undo':'Delegate this task'}">${lbl}</button>`;
  }else if(t.type==='E'){
    chkHTML=`<button type="button" class="t-action-btn t-eliminate" onclick="eliminateTask('${t.id}')" title="Remove this task entirely">${uiI('scissors')}Remove</button>`;
  }else{
    chkHTML=`<div class="t-chk" onclick="toggleDone('${t.id}')" title="${t.done?'Done — click to undo':'Mark as done'}">${t.done?'✓':''}</div>`;
  }
  return`<div class="ti-wrap">
  <div class="ti${t.done?' done':''}${ageCls}" id="ti-${t.id}" draggable="true"
    ondragstart="dStart(event,'${t.id}')" ondragover="dOver(event)" ondrop="dDrop(event,'${t.id}')" ondragend="dEnd(event)">
    <div class="drag-h">⠿</div>
    ${chkHTML}
    ${sub}
    ${planBadge}
    ${depBadge}
    ${ageBadge}
    ${progressPill}
    <button type="button" class="${expandCls}" id="exp-${t.id}" onclick="toggleSubPanel('${t.id}')" title="Notes, subtasks & dependency">Details <span class="t-expand-car">▾</span></button>
    <div class="t-txt" contenteditable="true" spellcheck="false"
      onblur="editTask('${t.id}',this.textContent)"
      onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}"
    >${escHTML(t.text)}${subtaskHint?`<span id="tsh-${t.id}" style="font-size:10px;color:var(--muted);margin-left:5px">${subtaskHint}</span>`:`<span id="tsh-${t.id}"></span>`}</div>
    <div class="${estCls}" onclick="openEstModal('${t.id}')" title="Set time estimate">${estTxt}</div>
    <div class="${recurCls}" onclick="toggleRecur('${t.id}')" title="Repeat daily">${recurTxt}</div>
    <div class="t-actions">
      ${t.dateISO==='someday'?`<button class="t-btn promote" onclick="promoteSomeday('${t.id}')" title="Move to Today">${uiI('sun')}Today</button>`:''}
      <button class="t-btn" onclick="moveTask('${t.id}',-1)" title="Up">↑</button>
      <button class="t-btn" onclick="moveTask('${t.id}',1)" title="Down">↓</button>
      <button class="t-btn del" onclick="deleteTask('${t.id}')" title="Delete">✕</button>
    </div>
  </div>${subtaskBarHTML}${subtaskHTML}
  </div>`;
}
var addSeen={};
function renderInlineAddIf(s,st){
  if(!st.length){addSeen[s.type]=false;return'';}
  const fresh=addSeen[s.type]===false;addSeen[s.type]=true;
  const html=renderInlineAdd(s);
  return fresh?html.replace('class="inline-add"','class="inline-add fade-in"'):html;
}
function renderInlineAdd(s){
  const cur=secTargetFor(s.type),todayISO=isoDate(bocNow()),note=secFullNote(s.type);
  const btn=(m,txt)=>`<button type="button" class="sw-btn${cur.mode===m?' on':''}" data-m="${m}" onclick="setSecTarget('${s.type}','${m}')">${txt}</button>`;
  return`<div class="inline-add" style="--sc:var(--p${s.type.toLowerCase()})">
    <form class="inline-form" onsubmit="return inlineSubmit(event,'${s.type}',this)">
      <input class="inline-in" type="text" enterkeyhint="done" autocomplete="off" autocapitalize="sentences" placeholder="Quick-add ${s.type} task… ${s.egRaw?'e.g. '+escAttr(s.egRaw.split(' · ')[0]):'(Enter)'}">
      <button type="submit" class="inline-go" aria-label="Add ${s.type} task">Add</button>
    </form>
    <div class="sec-when" role="group" aria-label="Plan this ${s.type} task for">
      ${btn('today','Today')}${btn('tomorrow','Tomorrow')}
      <label class="sw-btn sw-date${cur.mode==='custom'?' on':''}" data-m="custom" title="Choose any date from today onward"><span class="sw-date-txt">${cur.mode==='custom'?secDateLabel(cur.iso):'Pick date'}</span><input type="date" min="${todayISO}" value="${cur.mode==='custom'?cur.iso:''}" aria-label="Custom date for ${s.type} task" onclick="try{this.showPicker()}catch(e){}" onchange="setSecTarget('${s.type}','custom',this.value)"></label>
      ${btn('someday','Someday')}
    </div>
  </div><div class="amax-note"${note?'':' style="display:none"'}>${note}</div>`;
}


function toggleSubPanel(id){
  const panel=document.getElementById('sub-'+id);
  if(!panel)return;
  const willOpen=!panel.classList.contains('open');
  document.querySelectorAll('.subtask-panel.open').forEach(p=>{
    if(p!==panel){
      p.classList.remove('open');
      const otherBtn=document.getElementById('exp-'+p.id.slice(4));
      if(otherBtn)otherBtn.classList.remove('open');
    }
  });
  panel.classList.toggle('open',willOpen);
  const btn=document.getElementById('exp-'+id);
  if(btn)btn.classList.toggle('open',willOpen);
  openDetailsTaskId=willOpen?id:null;
}
function autoResize(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,80)+'px';}
function subtaskRowHTML(tid,st,si){
  const links=st.links||[];
  const key=tid+':'+si;
  const panelOpen=openSubLinkPanels.has(key);
  const linkBtnTitle=links.length?`${links.length} link${links.length>1?'s':''} attached — click to view or add more`:'Attach a link to this sub-task';
  const chipsHTML=links.map((lk,li)=>`<a class="subtask-link-chip" href="${escAttr(lk.url)}" target="_blank" rel="noopener noreferrer" title="${escAttr(lk.url)}">${uiI('globe')}${escHTML(getHostname(lk.url))}</a><button type="button" class="subtask-link-del" onclick="deleteSubLink('${tid}',${si},${li})" title="Remove this link">✕</button>`).join('');
  const linkMods=(links.length?' has-content':'')+(panelOpen?' open':''); return`<div class="subtask-item">
      <div class="subtask-chk${st.done?' done':''}" onclick="toggleSub('${tid}',${si})">${st.done?'✓':''}</div>
      <input class="subtask-txt${st.done?' done':''}" value="${escAttr(st.text)}" onblur="editSub('${tid}',${si},this.value)" onkeydown="if(event.key==='Enter')this.blur()">
      <button type="button" class="subtask-link-btn${linkMods}" id="slb-${tid}-${si}" onclick="toggleSubLinks('${tid}',${si})" title="${linkBtnTitle}">${uiI('link')}${links.length?`<span>${links.length}</span>`:''}</button>
      <button class="subtask-del" onclick="deleteSub('${tid}',${si})">✕</button>
    </div>
    <div class="subtask-links${panelOpen?' open':''}" id="sl-${tid}-${si}">
      ${chipsHTML}
      <input class="subtask-link-in" placeholder="Paste a link… (Enter)" onkeydown="addSubLink(event,'${tid}',${si},this)">
    </div>`;
}
function renderSubtaskList(tid){
  const t=tasks.find(t=>t.id===tid);if(!t)return;
  const stl=document.getElementById('stl-'+tid);
  if(stl)stl.innerHTML=(t.subtasks||[]).map((st,si)=>subtaskRowHTML(tid,st,si)).join('');
}
function addSub(e,tid,el){
  if(e.key!=='Enter')return;const text=el.value.trim();if(!text)return;
  const t=tasks.find(t=>t.id===tid);if(!t)return;if(!t.subtasks)t.subtasks=[];
  t.subtasks.push({text,done:false,links:[]});el.value='';saveT();
  renderSubtaskList(tid);
  _refreshSubProgress(tid);
}
function handleSubtaskPaste(e,tid,el){
  const raw=(e.clipboardData||window.clipboardData).getData('text');
  if(!raw||!URL_RE.test(raw))return;
  e.preventDefault();
  const lines=raw.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if(!lines.length)return;
  const t=tasks.find(t=>t.id===tid);if(!t)return;if(!t.subtasks)t.subtasks=[];
  lines.forEach(line=>{
    const found=extractFirstURL(line);
    if(!found){t.subtasks.push({text:line,done:false,links:[]});return;}
    const label=found.before||getHostname(found.url);
    t.subtasks.push({text:label,done:false,links:[{url:found.url}]});
  });
  el.value='';saveT();
  renderSubtaskList(tid);
  _refreshSubProgress(tid);
  showToast(lines.length>1?`🔗 ADDED ${lines.length} SUB-TASKS FROM PASTED LINKS`:'🔗 LINK ATTACHED AS NEW SUB-TASK');
}
function toggleSubLinks(tid,si){
  const key=tid+':'+si;
  const panel=document.getElementById(`sl-${tid}-${si}`);
  if(!panel)return;
  const willOpen=!panel.classList.contains('open');
  panel.classList.toggle('open',willOpen);
  const btn=document.getElementById(`slb-${tid}-${si}`);
  if(btn)btn.classList.toggle('open',willOpen);
  if(willOpen){openSubLinkPanels.add(key);const inp=panel.querySelector('.subtask-link-in');if(inp)inp.focus();}
  else openSubLinkPanels.delete(key);
}
function addSubLink(e,tid,si,el){
  if(e.key!=='Enter')return;
  const raw=el.value.trim();if(!raw)return;
  const t=tasks.find(t=>t.id===tid);if(!t||!t.subtasks||!t.subtasks[si])return;
  const found=extractFirstURL(raw)||(isLikelyURL(raw)?{url:normalizeURL(raw)}:null);
  if(!found){showToast('⚠ THAT DOESN\'T LOOK LIKE A LINK');return;}
  if(!t.subtasks[si].links)t.subtasks[si].links=[];
  t.subtasks[si].links.push({url:found.url});
  el.value='';saveT();
  openSubLinkPanels.add(tid+':'+si);
  renderSubtaskList(tid);
  _refreshSubProgress(tid);
}
function deleteSubLink(tid,si,li){
  const t=tasks.find(t=>t.id===tid);if(!t||!t.subtasks||!t.subtasks[si]||!t.subtasks[si].links)return;
  t.subtasks[si].links.splice(li,1);saveT();
  renderSubtaskList(tid);
}
function _refreshSubProgress(tid){
  const t=tasks.find(x=>x.id===tid);if(!t)return;
  const total=t.subtasks?t.subtasks.length:0;
  const done=t.subtasks?t.subtasks.filter(s=>s.done).length:0;
  const hintEl=document.getElementById('tsh-'+tid);
  if(hintEl)hintEl.textContent=total>0?` · ${done}/${total}✓`:'';
  let barEl=document.getElementById('tsp-'+tid);
  if(total>0){
    if(!barEl){
      const tiEl=document.getElementById('ti-'+tid);
      if(tiEl){
        barEl=document.createElement('div');
        barEl.className='t-subprog';barEl.id='tsp-'+tid;
        barEl.innerHTML='<div class="t-subprog-fill"></div>';
        tiEl.insertAdjacentElement('afterend',barEl);
      }
    }
    if(barEl){
      const pct=Math.round(done/total*100);
      barEl.title=`${done}/${total} subtasks done`;
      barEl.querySelector('.t-subprog-fill').style.width=pct+'%';
    }
  }else if(barEl){
    barEl.remove();
  }
}
function toggleSub(tid,si){
  const t=tasks.find(t=>t.id===tid);if(!t||!t.subtasks)return;
  t.subtasks[si].done=!t.subtasks[si].done;
  syncFromSubtasks(t);
  saveT();renderTasks();
}
function syncFromSubtasks(t){
  if(!t||!t.subtasks||!t.subtasks.length)return;
  const allDone=t.subtasks.every(s=>s.done);
  if(allDone&&!t.done){
    const blocker=getTaskDependency(t);
    if(blocker&&!blocker.done){
      showToast(`🔒 SUBTASKS DONE, BUT BLOCKED — FINISH "${blocker.text.length>28?blocker.text.slice(0,28)+'…':blocker.text}" FIRST`);
      return;
    }
    completeTaskCore(t);
    syncCalForTask(t);
    if((t.type==='A'||t.type==='B')&&typeof askImpact==='function')askImpact(t.id);
    showToast('✓ ALL SUBTASKS DONE — TASK COMPLETE');
  }else if(!allDone&&t.done){
    uncompleteTaskCore(t);
    syncCalForTask(t);
  }
}
function editSub(tid,si,text){const t=tasks.find(t=>t.id===tid);if(!t||!t.subtasks)return;t.subtasks[si].text=text.trim()||t.subtasks[si].text;saveT();}
function deleteSub(tid,si){
  const t=tasks.find(t=>t.id===tid);if(!t||!t.subtasks)return;t.subtasks.splice(si,1);
  for(const key of Array.from(openSubLinkPanels))if(key.startsWith(tid+':'))openSubLinkPanels.delete(key);
  saveT();renderTasks();
}
function toggleRecur(id){const t=tasks.find(t=>t.id===id);if(!t)return;t.recurring=!t.recurring;if(t.recurring)t.lastRecurDate=bocNow().toDateString();saveT();renderTasks();showToast(t.recurring?'↻ REPEATS DAILY':'REPEAT OFF');}

let _estTaskId=null;
function openEstModal(id){
  _estTaskId=id;const t=tasks.find(t=>t.id===id);const cur=t&&t.estimate||0;
  document.querySelectorAll('.est-preset').forEach(p=>{
    p.classList.toggle('on',parseInt(p.dataset.m)===cur);
    p.onclick=()=>{document.querySelectorAll('.est-preset').forEach(x=>x.classList.remove('on'));p.classList.add('on');$('est-custom-val').value=p.dataset.m;};
  });
  $('est-custom-val').value=cur||30;
  const range=t?suggestEstimateRange(t):null;
  const sugEl=$('est-suggest');
  if(sugEl)sugEl.innerHTML=range
    ?`Similar <b style="color:var(--txt)">${t.type}</b>-priority tasks you've actually finished usually took <b style="color:var(--now)">${fmtDur(range.lo*60)}–${fmtDur(range.hi*60)}</b> <span style="opacity:.7">(based on ${range.n} past tasks, not a guess)</span>.`
    :`No completed ${t?t.type:''}-priority tasks with tracked time yet — this estimate is still a guess until BLOC has history to ground it in.`;
  $('est-overlay').classList.add('open');
}
function suggestEstimateRange(task){
  const sameType=tasks.filter(t=>t.id!==task.id&&t.type===task.type&&t.timeSpentMin>0);
  if(sameType.length<2)return null;
  const vals=sameType.map(t=>t.timeSpentMin).sort((a,b)=>a-b);
  return {lo:vals[0],hi:vals[vals.length-1],avg:Math.round(vals.reduce((a,b)=>a+b,0)/vals.length),n:vals.length};
}
function closeEstModal(){$('est-overlay').classList.remove('open');_estTaskId=null;}
function confirmEst(){if(!_estTaskId)return;const t=tasks.find(t=>t.id===_estTaskId);if(t){t.estimate=Math.max(0,parseInt($('est-custom-val').value)||0);}closeEstModal();renderTasks();}

function addTask(){
  const inp=$('new-input'),type=$('new-type').value,text=inp.value.trim();
  if(!text){showToast('ENTER A TASK NAME');return;}
  const dISO=planTargetISO();
  if(type==='A'&&tasks.filter(t=>t.type==='A'&&t.dateISO===dISO).length>=3){showToast(addPlanTarget==='tomorrow'?'MAX 3 A-TASKS FOR TOMORROW':'MAX 3 A-TASKS');return;}
  tasks.push({id:String(nextId++),type,text,done:false,created:Date.now(),estimate:0,recurring:false,subtasks:[],note:'',dateISO:dISO,progressState:'not_started',timeSpentMin:0,dependsOn:null});
  if(collapsed[type]){collapsed[type]=false;saveT();}
  inp.value='';inp.blur();renderTasks();
}
function inlineSubmit(e,type,form){
  if(e&&e.preventDefault)e.preventDefault();
  const el=form.querySelector('.inline-in');if(el)inlineAdd({key:'Enter'},type,el);
  return false;
}
function inlineAdd(e,type,el){
  if(e.key!=='Enter')return;const text=el.value.trim();if(!text)return;
  const dISO=secTargetISO(type);
  if(type==='A'&&dISO!=='someday'&&tasks.filter(t=>t.type==='A'&&t.dateISO===dISO).length>=3){showToast(`MAX 3 A-TASKS FOR ${depDayLabel(dISO)}`);return;}
  tasks.push({id:String(nextId++),type,text,done:false,created:Date.now(),estimate:0,recurring:false,subtasks:[],note:'',dateISO:dISO,progressState:'not_started',timeSpentMin:0,dependsOn:null});
  el.value='';renderTasks();
  if(dISO!==isoDate(bocNow()))showToast(`${type} TASK ADDED — ${dISO==='someday'?'SOMEDAY':depDayLabel(dISO)}`);
  const next=document.querySelector(`#sec-${type} .inline-in`);if(next)next.focus();
}
function syncCalForTask(t){
  if(typeof calEvents==='undefined')return;
  let touched=false;
  const occISO=t.dateISO||isoDate(bocNow());
  calEvents.forEach(ev=>{
    if(ev.taskId!==t.id)return;
    if(!calEventOccursOn(ev,occISO))return;
    const occ=calGetOccurrence(ev,occISO);
    if(occ&&occ.done===t.done)return;
    calSetEventDone(ev,occISO,t.done);
    touched=true;
  });
  if(touched)saveCal();
}
function completeTaskCore(t){
  if(t.subtasks&&t.subtasks.length)t.subtasks.forEach(st=>{st.done=true;});
  t.done=true;t.completedAt=Date.now();t.progressState='done';logTaskCompletion(t);
}
function uncompleteTaskCore(t){
  t.done=false;t.completedAt=null;t.progressState=(t.timeSpentMin>0)?'in_progress':'not_started';unlogTaskCompletion(t);
}
function toggleDone(id){
  const t=tasks.find(t=>t.id===id);if(!t)return;
  if(!t.done){
    const blocker=getTaskDependency(t);
    if(blocker&&!blocker.done){showToast(`🔒 BLOCKED — FINISH "${blocker.text.length>28?blocker.text.slice(0,28)+'…':blocker.text}" FIRST`);return;}
    if(t.subtasks&&t.subtasks.length)t.subtasks.forEach(st=>{st.done=true;});
    completeTaskCore(t);
    if((t.type==='A'||t.type==='B')&&typeof askImpact==='function')askImpact(t.id);
  }
  else{
    if(t.subtasks&&t.subtasks.length)t.subtasks.forEach(st=>{st.done=false;});
    uncompleteTaskCore(t);
  }
  syncCalForTask(t);
  renderTasks();
}
function delegateTask(id){
  const t=tasks.find(t=>t.id===id);if(!t)return;
  if(t.done){
    t.done=false;t.completedAt=null;t.delegatedTo=null;
    t.progressState=(t.timeSpentMin>0)?'in_progress':'not_started';
    unlogTaskCompletion(t);
    syncCalForTask(t);
    renderTasks();
    return;
  }
  const blocker=getTaskDependency(t);
  if(blocker&&!blocker.done){showToast(`🔒 BLOCKED — FINISH "${blocker.text.length>28?blocker.text.slice(0,28)+'…':blocker.text}" FIRST`);return;}
  const name=(prompt('Delegate to (optional):','')||'').trim();
  t.delegatedTo=name||null;
  completeTaskCore(t);
  syncCalForTask(t);
  renderTasks();
  showToast(name?`🤝 DELEGATED TO ${name.toUpperCase()}`:'🤝 DELEGATED');
}
function eliminateTask(id){
  const t=tasks.find(t=>t.id===id);if(!t)return;
  t.completedAt=Date.now();
  logTaskCompletion(t);
  deleteTask(id);
  showToast('✂️ ELIMINATED');
}
function editTask(id,text){const t=tasks.find(t=>t.id===id);if(t){t.text=text.trim()||t.text;saveT();}}
function deleteTask(id){
  tasks.forEach(x=>{if(x.dependsOn===id)x.dependsOn=null;});
  if(typeof calEvents!=='undefined'){calEvents.forEach(ev=>{if(ev.taskId===id)ev.taskId='';});saveCal();}
  if(typeof npOrphanLinkedNote==='function')npOrphanLinkedNote('task',id);
  const el=document.getElementById('ti-'+id);
  if(el){el.style.transition='opacity .15s ease,transform .15s ease';el.style.opacity='0';el.style.transform='translateX(8px)';setTimeout(()=>{tasks=tasks.filter(t=>t.id!==id);renderTasks();},150);}
  else{tasks=tasks.filter(t=>t.id!==id);renderTasks();}
  showToast('TASK REMOVED');
}
function moveTask(id,dir){
  const t=tasks.find(t=>t.id===id);if(!t)return;
  const g=tasks.filter(x=>x.type===t.type);const gi=g.findIndex(x=>x.id===id);const ni=gi+dir;
  if(ni<0||ni>=g.length)return;
  const ai=tasks.indexOf(t),bi=tasks.indexOf(g[ni]);[tasks[ai],tasks[bi]]=[tasks[bi],tasks[ai]];renderTasks();
}
function clearDone(){
  const doomed=tasks.filter(t=>t.done&&!t.recurring);
  const kept=tasks.filter(t=>t.done&&t.recurring).length;
  const c=doomed.length;
  if(!c){showToast(kept?'ONLY REPEATING TASKS ARE DONE — KEPT, THEY RETURN TOMORROW':'NOTHING TO CLEAR');return;}
  const doneIds=new Set(doomed.map(t=>t.id));
  if(typeof calEvents!=='undefined'){calEvents.forEach(ev=>{if(ev.taskId&&doneIds.has(ev.taskId))ev.taskId='';});saveCal();}
  if(typeof npOrphanLinkedNote==='function')doomed.forEach(t=>npOrphanLinkedNote('task',t.id));
  tasks=tasks.filter(t=>!doneIds.has(t.id));
  renderTasks();
  showToast(`CLEARED ${c} COMPLETED`+(kept?` · ${kept} REPEATING KEPT`:''));
}
function exportTasks(){
  const lines=['BLOC TASK LIST — '+bocNow().toDateString(),''];
  SECTS.forEach(s=>{const st=tasks.filter(t=>t.type===s.type);lines.push(`[${s.type}] ${s.name.toUpperCase()}`);if(!st.length)lines.push('  (none)');st.forEach((t,i)=>lines.push(`  ${t.done?'✓':'○'} ${s.type==='A'?'A-'+(i+1)+' ':''}${t.text}`));lines.push('');});
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain'}));a.download='bloc-tasks.txt';a.click();showToast('EXPORTED');
}
function exportICS(){
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//BLOC//EN'];
  const now=new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  tasks.filter(t=>!t.done&&t.estimate>0).forEach(t=>{lines.push('BEGIN:VEVENT',`UID:bloc-${t.id}@bloc`,`DTSTAMP:${now}`,`DTSTART:${now}`,`DURATION:PT${t.estimate}M`,`SUMMARY:[${t.type}] ${t.text}`,'END:VEVENT');});
  lines.push('END:VCALENDAR');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lines.join('\r\n')],{type:'text/calendar'}));a.download='bloc-tasks.ics';a.click();showToast('ICS EXPORTED');
}
const BACKUP_EXTRA_KEYS=['bloc_habits_v1','bloc_habits_onboarded_v1','bloc_day_state_v1','bloc_goals_v1','bloc_weekly_plans_v1',
  'bloc_task_completion_log_v1','bloc_task_completion_log_archive_v1','bloc_sessions_archive_v1','bloc_energy_log_v1',
  'bloc_settings_v1','bloc_personalize_v1','bloc_theme_v1','bloc_cal_palette_v1','bloc_cal_hide_life_v1','bloc_streak_visible_v1',
  'bloc_nav_order','bloc_celebration_tier_v1','bloc_library_user_books_v1','bloc_library_user_topics_v1','bloc_library_progress_v1',
  'bloc_library_prefs_v1','bloc_lib_covers_on_v1','bloc_wisdom_exposure_v1','bloc_consultant_chats_v1'];
function exportJSON(){
  const extra={};
  BACKUP_EXTRA_KEYS.forEach(k=>{try{const v=localStorage.getItem(k);if(v!==null)extra[k]=v;}catch(e){}});
  const backup={
    version:5,extra,exportedAt:new Date().toISOString(),
    tasks,collapsed,nextId,sessions,streak:streakData,
    reflections:JSON.parse(localStorage.getItem(REFLECT_KEY)||'[]'),
    pomoPresets:getPomoPresets(),durPresets:getDurPresets(),
    calEvents,calBg,
    npFolders,npNotes,npNid
  };
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));a.download=`bloc-backup-${isoDate(bocNow())}.json`;a.click();showToast('BACKUP SAVED');
}
function importJSON(event){
  const file=event.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const backup=JSON.parse(e.target.result);
      if(!backup.tasks)throw new Error('Invalid BLOC backup file');
      const hasCal=Array.isArray(backup.calEvents)&&backup.calEvents.length>0;
      const hasNotes=Array.isArray(backup.npNotes)&&backup.npNotes.length>0;
      const extras=[hasCal?'calendar events':null,hasNotes?'notes':null].filter(Boolean).join(' and ');
      const warn=backup.version&&backup.version<4?`\n\nHeads up: this backup predates ${bocNow().getFullYear()>=2026?'2026':''} calendar/notes support, so it won't include those.`:'';
      if(!confirm(`Restore backup from ${backup.exportedAt||'unknown date'}?\nThis will replace your current tasks, sessions${extras?', '+extras:''}, and settings.${warn}`))return;
      tasks=backup.tasks||[];sessions=backup.sessions||[];
      migrateTaskDependencies();
      if(backup.collapsed)collapsed=backup.collapsed;
      if(backup.nextId)nextId=backup.nextId;
      if(backup.streak)streakData=backup.streak;
      if(backup.reflections)localStorage.setItem(REFLECT_KEY,JSON.stringify(backup.reflections));
      if(Array.isArray(backup.pomoPresets))setPomoPresetList(backup.pomoPresets);
      if(Array.isArray(backup.durPresets))setDurPresets(backup.durPresets);
      if(Array.isArray(backup.calEvents)){calEvents=backup.calEvents;saveCal();}
      if(backup.calBg){calBg=backup.calBg;saveBg();}
      if(Array.isArray(backup.npFolders)){npFolders=backup.npFolders;}
      if(Array.isArray(backup.npNotes)){npNotes=backup.npNotes;}
      if(backup.npNid)npNid=backup.npNid;
      if(typeof npMigrateEntityNotes==='function')npMigrateEntityNotes();
      npSave();
      saveT();saveSessions();saveStreak();renderTasks();updateLogCount();recomputeStreak();renderPomoPresets();
      if($('view-calendar')&&$('view-calendar').classList.contains('active'))calRender();
      if($('view-notes')&&$('view-notes').classList.contains('active'))renderNotesView();
      let needsReload=false;
      if(backup.extra&&typeof backup.extra==='object'){
        BACKUP_EXTRA_KEYS.forEach(k=>{if(typeof backup.extra[k]==='string'){try{localStorage.setItem(k,backup.extra[k]);needsReload=true;}catch(e){}}});
      }
      showToast(needsReload?'BACKUP RESTORED — RELOADING…':'BACKUP RESTORED');
      if(needsReload)setTimeout(()=>location.reload(),900);
    }catch(err){showToast('INVALID BACKUP FILE');}
  };
  reader.readAsText(file);event.target.value='';
}
function toggleSec(type){const sec=$('sec-'+type);if(!sec)return;
  collapsed[type]=!collapsed[type];saveT();sec.classList.toggle('closed');const secBody=sec.querySelector('.sec-body');secBody.style.maxHeight=collapsed[type]?'0':'4000px';secBody.style.opacity=collapsed[type]?'0':'1';}
function scrollSec(type){const el=$('sec-'+type);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}

let dragId=null;
function dStart(e,id){dragId=id;e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',id);}catch(_){}e.stopPropagation();const el=document.getElementById('ti-'+id);if(el)setTimeout(()=>el.classList.add('dragging'),0);}
function dEnd(e){if(dragId){const el=document.getElementById('ti-'+dragId);if(el)el.classList.remove('dragging');}document.querySelectorAll('.sec-body.drag-over').forEach(b=>b.classList.remove('drag-over'));}
function dOver(e){e.preventDefault();e.stopPropagation();}
function _dropTarget(from,type,toDateISO){
  const isSomeday=type==='SOMEDAY';
  const newType=isSomeday?from.type:type;
  let newDate;
  if(isSomeday)newDate='someday';
  else if(toDateISO&&toDateISO!=='someday')newDate=toDateISO;
  else newDate=from.dateISO==='someday'?isoDate(bocNow()):from.dateISO;
  if(newType==='A'&&newDate!=='someday'){
    const aCount=tasks.filter(t=>t.type==='A'&&t.id!==from.id&&t.dateISO===newDate).length;
    if(aCount>=3){showToast('MAX 3 A-TASKS');return null;}
  }
  return{type:newType,dateISO:newDate};
}
function dDrop(e,targetId){
  e.preventDefault();e.stopPropagation();if(!dragId||dragId===targetId)return;
  const from=tasks.find(t=>t.id===dragId),toTask=tasks.find(t=>t.id===targetId);
  if(!from||!toTask)return;
  document.querySelectorAll('.sec-body.drag-over').forEach(b=>b.classList.remove('drag-over'));
  if(from.type!==toTask.type||from.dateISO!==toTask.dateISO){
    const dest=_dropTarget(from,toTask.dateISO==='someday'?'SOMEDAY':toTask.type,toTask.dateISO==='someday'?null:toTask.dateISO);
    if(!dest){dragId=null;return;}
    from.type=toTask.dateISO==='someday'?from.type:toTask.type;from.dateISO=dest.dateISO;
  }
  const toIdx=tasks.findIndex(t=>t.id===targetId);tasks=tasks.filter(t=>t.id!==dragId);tasks.splice(toIdx,0,from);dragId=null;saveT();renderTasks();
}
function secDragOver(e,type){e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';const secBody=$('body-'+type);if(secBody)secBody.classList.add('drag-over');}
function secDragLeave(e,type){const secBody=$('body-'+type);if(secBody&&!secBody.contains(e.relatedTarget))secBody.classList.remove('drag-over');}
function secDrop(e,type){
  e.preventDefault();const secBody=$('body-'+type);if(secBody)secBody.classList.remove('drag-over');
  if(!dragId)return;const from=tasks.find(t=>t.id===dragId);if(!from)return;
  const inSomeday=from.dateISO==='someday';
  if(type==='SOMEDAY'?inSomeday:(!inSomeday&&from.type===type)){dragId=null;return;}
  const dest=_dropTarget(from,type,null);
  if(!dest){dragId=null;return;}
  from.type=dest.type;from.dateISO=dest.dateISO;dragId=null;saveT();renderTasks();
  showToast(type==='SOMEDAY'?'PARKED IN SOMEDAY / MAYBE':(inSomeday?`MOVED TO ${type} · TODAY`:`MOVED TO ${type}`));
}

function openQuickCapture(){$('quick-capture').classList.add('open');$('qc-input').value='';setTimeout(()=>$('qc-input').focus(),50);}
function closeQuickCapture(){$('quick-capture').classList.remove('open');}
function qcKeydown(e){
  if(e.key==='Enter'){
    const text=$('qc-input').value.trim(),type=$('qc-type').value;
    if(!text)return;
    const dISO=planTargetISO();
    if(type==='A'&&tasks.filter(t=>t.type==='A'&&t.dateISO===dISO).length>=3){showToast(addPlanTarget==='tomorrow'?'MAX 3 A-TASKS FOR TOMORROW':'MAX 3 A-TASKS');return;}
    tasks.push({id:String(nextId++),type,text,done:false,created:Date.now(),estimate:0,recurring:false,subtasks:[],note:'',dateISO:dISO,progressState:'not_started',timeSpentMin:0,dependsOn:null});
    saveT();renderTasks();closeQuickCapture();showToast(addPlanTarget==='tomorrow'?`${type} TASK ADDED — TOMORROW`:`${type} TASK ADDED`);
  }
  if(e.key==='Escape')closeQuickCapture();
}
$('quick-capture').addEventListener('click',e=>{if(e.target===$('quick-capture'))closeQuickCapture();});

const REFLECT_KEY='bloc_reflections_v1';
let _reflectRating=0;
function openReflection(){
  $('reflect-date-sub').textContent=bocNow().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}).toUpperCase();
  $('reflect-wins').value='';$('reflect-blocks').value='';_reflectRating=0;
  document.querySelectorAll('.score-star').forEach(s=>s.classList.remove('on'));
  const restChk=$('reflect-rest-day');if(restChk)restChk.checked=(getDayState(isoDate(bocNow()))==='confirmed-rest');
  $('reflection-overlay').classList.add('open');
}
function closeReflection(){$('reflection-overlay').classList.remove('open');}
function saveReflection(){
  const wins=$('reflect-wins').value.trim();
  const blocks=$('reflect-blocks').value.trim();
  const score=calcScore();
  const reflections=JSON.parse(localStorage.getItem(REFLECT_KEY)||'[]');
  const todayISO=isoDate(bocNow());
  const entry={date:dateStr(),dateISO:todayISO,wins,blocks,rating:_reflectRating,focusScore:score};
  const existingIdx=reflections.findIndex(r=>r.dateISO===todayISO);
  if(existingIdx>=0){
    reflections[existingIdx]=entry;
  }else{
    reflections.unshift(entry);
    if(reflections.length>60)reflections.pop();
  }
  localStorage.setItem(REFLECT_KEY,JSON.stringify(reflections));
  if(typeof npSyncReflectionNote==='function')npSyncReflectionNote(entry);
  const restChk=$('reflect-rest-day');
  if(restChk&&restChk.checked)markRestDay(todayISO);
  else if(restChk&&!restChk.checked&&dayState[todayISO]==='confirmed-rest')unmarkRestDay(todayISO);
  closeReflection();showToast('REFLECTION SAVED');
}
document.querySelectorAll('.score-star').forEach(star=>{
  star.addEventListener('click',()=>{
    _reflectRating=parseInt(star.dataset.v);
    document.querySelectorAll('.score-star').forEach(s=>s.classList.toggle('on',parseInt(s.dataset.v)<=_reflectRating));
  });
});

function promoteSomeday(id){
  const t=tasks.find(x=>x.id===id);if(!t||t.dateISO!=='someday')return;
  const today=isoDate(bocNow());
  if(t.type==='A'&&tasks.filter(x=>x.type==='A'&&x.dateISO===today&&x.id!==id).length>=3){showToast('MAX 3 A-TASKS FOR TODAY — MOVE ONE FIRST');return;}
  t.dateISO=today;saveT();renderTasks();showToast('MOVED TO TODAY');
}

const POMO_PRESET_KEY='bloc_pomo_presets_v1';
const POMO_SEEDED_KEY='bloc_pomo_presets_seeded_v2';
const POMO_SEQ_DRAFT_KEY='bloc_pomo_seq_draft_v1';
const DUR_PRESET_KEY='bloc_dur_presets_v1';
const STARTER_DURS=[900,1800,3600,5400,7200,10800];
const MAX_BLOCKS=30,MAX_BLOCK_MIN=240;
const STARTER_PRESETS=[
  {name:'Standard',kind:'classic',work:25,short:5,long:15,rounds:4},
  {name:'Deep Work',kind:'classic',work:50,short:10,long:20,rounds:3},
  {name:'Micro',kind:'classic',work:15,short:3,long:10,rounds:4},
  {name:'60×2',kind:'classic',work:60,short:10,long:0,rounds:2},
  {name:'30 · 10 · 50',kind:'custom',seq:[{t:'w',m:30},{t:'b',m:10},{t:'w',m:50}]},
];
function cleanPreset(p){
  if(!p||typeof p.name!=='string'||!p.name.trim())return null;
  if(p.kind==='custom'||Array.isArray(p.seq)){
    const seq=(Array.isArray(p.seq)?p.seq:[]).map(x=>({t:x&&x.t==='b'?'b':'w',m:Math.min(MAX_BLOCK_MIN,Math.max(1,parseInt(x&&x.m,10)||0))})).filter(x=>x.m>=1).slice(0,MAX_BLOCKS);
    return seq.some(x=>x.t==='w')?{name:p.name.trim(),kind:'custom',seq}:null;
  }
  const n=(v,d)=>Number.isFinite(parseInt(v,10))?parseInt(v,10):d;
  return {name:p.name.trim(),kind:'classic',work:n(p.work,25),short:n(p.short,5),long:n(p.long,15),rounds:n(p.rounds,4)};
}
const setPomoPresetList=(list)=>{localStorage.setItem(POMO_PRESET_KEY,JSON.stringify(list));localStorage.setItem(POMO_SEEDED_KEY,'1');};
function getPomoPresets(){
  let saved=null;
  try{saved=JSON.parse(localStorage.getItem(POMO_PRESET_KEY)||'null');}catch(e){}
  if(localStorage.getItem(POMO_SEEDED_KEY))return(Array.isArray(saved)?saved:[]).map(cleanPreset).filter(Boolean);
  let list;
  if(Array.isArray(saved)){
    const starterByName=new Map(STARTER_PRESETS.map(p=>[p.name,p]));
    list=saved.map(cleanPreset).filter(Boolean).map(p=>{
      const d=starterByName.get(p.name);
      return d&&d.kind==='classic'&&p.kind==='classic'?{...d}:p;
    });
    STARTER_PRESETS.forEach(d=>{if(!list.some(p=>p.name===d.name))list.push(JSON.parse(JSON.stringify(d)));});
  }else list=JSON.parse(JSON.stringify(STARTER_PRESETS));
  setPomoPresetList(list);
  return list;
}
function presetLabel(p){
  if(p.kind==='custom')return p.seq.map(x=>(x.t==='w'?'':'☕')+x.m).join(' · ');
  return `${p.work}/${p.short}/${p.long} × ${p.rounds}`;
}
let activePreset=null;
function savePomoPreset(){
  let preset;
  if(pomoSub==='custom'){
    if(!seqDraft.some(x=>x.t==='w')){showToast('ADD AT LEAST ONE WORK BLOCK');return;}
    preset={kind:'custom',seq:seqDraft.map(x=>({...x}))};
  }else{
    const f=readClassic();
    const typedLong=parseInt($('pomo-long')?.value,10);
    preset={kind:'classic',work:f.w,short:f.s,long:Number.isFinite(typedLong)?Math.max(0,typedLong):f.l,rounds:f.r};
  }
  const name=prompt(`Name this preset (${presetLabel(preset)}):`)?.trim();
  if(!name)return;
  preset.name=name;
  const presets=getPomoPresets();
  const at=presets.findIndex(p=>p.name.toLowerCase()===name.toLowerCase());
  if(at>=0){
    if(!confirm(`A preset named "${presets[at].name}" already exists. Replace it?`))return;
    presets[at]=preset;
  }else presets.push(preset);
  setPomoPresetList(presets);
  activePreset=name;
  renderPomoPresets();showToast('PRESET SAVED');
}
function removePomoPreset(i){
  const presets=getPomoPresets(),p=presets[i];if(!p)return;
  if(!confirm(`Remove the "${p.name}" preset?`))return;
  presets.splice(i,1);setPomoPresetList(presets);
  if(activePreset===p.name)activePreset=null;
  renderPomoPresets();showToast('PRESET REMOVED');
}
function resetPomoPresets(){
  const presets=getPomoPresets();
  const missing=STARTER_PRESETS.filter(d=>!presets.some(p=>p.name===d.name));
  if(!missing.length){showToast('ALL DEFAULT PRESETS ARE ALREADY HERE');return;}
  missing.forEach(d=>presets.push(JSON.parse(JSON.stringify(d))));
  setPomoPresetList(presets);renderPomoPresets();
  showToast(`RESTORED ${missing.length} DEFAULT PRESET${missing.length!==1?'S':''}`);
}
function applyPomoPreset(i){
  const p=getPomoPresets()[i];if(!p)return;
  if(p.kind==='custom'){
    seqDraft=p.seq.map(x=>({...x}));saveDraft();renderSeq();
    setPomoSub('custom');
  }else{
    $('pomo-work').value=p.work;$('pomo-short').value=p.short;
    $('pomo-long').value=p.long;$('pomo-rounds').value=p.rounds;
    setPomoSub('classic');
  }
  activePreset=p.name;
  renderPomoPresets();
}
var pomoEditing=false;
function syncPomoSave(){try{const b=$('pomo-save');if(b)b.hidden=!!activePreset;}catch(e){}}
function togglePomoEdit(){pomoEditing=!pomoEditing;renderPomoPresets();}
function renderPomoPresets(){
  const row=$('pomo-presets-row');if(!row)return;
  const presets=getPomoPresets();
  row.innerHTML=presets.length?presets.map((p,i)=>{const presetMods=(p.name===activePreset?' active':'');return `<span class="preset-chip dur-pill"><button type="button" class="pomo-preset-btn${presetMods}" data-name="${escHTML(p.name)}" title="${escHTML(presetLabel(p))}" onclick="applyPomoPreset(${i})">${escHTML(p.name)}</button>${pomoEditing?`<button type="button" class="chip-x" title="Remove this preset" aria-label="Remove preset ${escHTML(p.name)}" onclick="removePomoPreset(${i})">×</button>`:''}</span>`}).join(''):'<span class="preset-empty">No presets saved.</span>';
  const eb=$('pomo-edit'),rb=$('pomo-restore');
  if(eb){eb.hidden=!presets.length;eb.textContent=pomoEditing?'Done':'Edit';}
  if(rb)rb.hidden=!(pomoEditing||!presets.length);
  durChips();
  updateTotalPreview();
}

var durOpen=false,durEditing=false;
function getDurPresets(){
  try{
    const a=JSON.parse(localStorage.getItem(DUR_PRESET_KEY)||'null');
    if(Array.isArray(a))return[...new Set(a.map(Number).filter(n=>Number.isFinite(n)&&n>0))].sort((x,y)=>x-y);
  }catch(e){}
  return STARTER_DURS.slice();
}
const setDurPresets=(a)=>{localStorage.setItem(DUR_PRESET_KEY,JSON.stringify(a));};
function chipDur(s){
  const h=Math.floor(s/3600),m=Math.round((s%3600)/60);
  if(!h)return m+'m';if(!m)return h+'h';if(m===30)return h+'.5h';return h+'h '+m+'m';
}
function durChips(){
  const row=$('duration-presets');if(!row)return;
  const list=getDurPresets(),isCustom=!list.includes(focusTarget);
  const pills=list.map(s=>`<span class="preset-chip dur-pill"><button type="button" class="preset${s===focusTarget?' on':''}" data-s="${s}" onclick="pickDurPreset(${s})">${chipDur(s)}</button>${durEditing?`<button type="button" class="chip-x" title="Remove this preset" aria-label="Remove ${chipDur(s)} preset" onclick="removeDurPreset(${s})">×</button>`:''}</span>`).join('');
  row.innerHTML=pills
    +`<span class="preset-chip dur-pill"><button type="button" class="preset dur-custom" aria-controls="custom-row" onclick="openCustomDur()">Custom…</button></span>`;
  const eb=$('dur-edit');eb.hidden=!list.length;eb.textContent=durEditing?'Done':'Edit';
  $('custom-row').hidden=!(durOpen||isCustom);
  const h=$('custom-h'),m=$('custom-m');
  if(document.activeElement!==h&&document.activeElement!==m){h.value=Math.floor(focusTarget/3600);m.value=Math.floor((focusTarget%3600)/60);}
  markDur();
}
function markDur(){
  const list=getDurPresets(),isCustom=!list.includes(focusTarget);
  document.querySelectorAll('#duration-presets .preset[data-s]').forEach(b=>b.classList.toggle('on',+b.dataset.s===focusTarget));
  const c=document.querySelector('#duration-presets .dur-custom');
  if(c){c.classList.toggle('on',isCustom);c.classList.toggle('open',!isCustom&&!$('custom-row').hidden);c.setAttribute('aria-expanded',String(!$('custom-row').hidden));}
  const sv=$('dur-save');if(sv)sv.hidden=!isCustom||focusTarget<=0;
}
function pickDurPreset(s){
  focusTarget=s;durOpen=false;
  durChips();updateTotalPreview();
}
function saveDurPreset(){
  syncCustom();
  if(focusTarget<=0){showToast('SET A DURATION FIRST');return;}
  const list=getDurPresets();
  if(list.includes(focusTarget)){showToast('THAT PRESET ALREADY EXISTS');return;}
  list.push(focusTarget);list.sort((a,b)=>a-b);setDurPresets(list);
  durOpen=false;durChips();showToast('PRESET SAVED');
}
function removeDurPreset(s){
  if(!confirm(`Remove the ${chipDur(s)} preset?`))return;
  setDurPresets(getDurPresets().filter(x=>x!==s));
  durChips();showToast('PRESET REMOVED');
}

let pomoSub='classic';
let seqDraft=loadDraft();
function loadDraft(){
  try{
    const a=JSON.parse(localStorage.getItem(POMO_SEQ_DRAFT_KEY)||'null');
    const p=cleanPreset({name:'x',kind:'custom',seq:a});
    if(p)return p.seq;
  }catch(e){}
  return[{t:'w',m:25},{t:'b',m:5},{t:'w',m:25}];
}
const saveDraft=()=>{try{localStorage.setItem(POMO_SEQ_DRAFT_KEY,JSON.stringify(seqDraft));}catch(e){}};
function classicPlan(w,s,l,r){
  const plan=[];
  for(let lap=1;lap<=r;lap++){
    plan.push({k:'work',sec:w});
    const lastLap=lap>=r,longDue=isFourthLap(lap);
    if(lastLap&&!longDue)break;
    plan.push({k:longDue?'long':'short',sec:longDue?l:s});
  }
  return plan;
}
const seqPlan=(seq)=>seq.map(x=>({k:x.t==='w'?'work':'short',sec:Math.max(1,x.m)*60}));
const planSecs=(plan)=>plan.reduce((a,x)=>a+x.sec,0);
const planWorkSeconds=(plan)=>(plan||pomoPlan).filter(x=>x.k==='work').reduce((a,x)=>a+x.sec,0);
function pomoTotalSeconds(w,s,l,r){return planSecs(classicPlan(w*60,s*60,l*60,r));}
function readClassic(){
  const numOr=(id,fallback)=>{const n=parseInt($(id)?.value,10);return Number.isFinite(n)?n:fallback;};
  return{w:Math.max(1,numOr('pomo-work',25)),s:Math.max(1,numOr('pomo-short',5)),l:Math.max(1,numOr('pomo-long',15)),r:Math.max(1,numOr('pomo-rounds',4))};
}
function setupPlan(){
  if(pomoSub==='custom')return seqPlan(seqDraft);
  const f=readClassic();
  return classicPlan(f.w*60,f.s*60,f.l*60,f.r);
}

function setPomoSub(sub){
  pomoSub=sub;
  document.querySelectorAll('.pomo-sub').forEach(b=>b.classList.toggle('on',b.dataset.sub===sub));
  $('pomo-classic-cfg').style.display=sub==='classic'?'block':'none';
  $('pomo-custom-cfg').style.display=sub==='custom'?'block':'none';
  if(sub==='custom')renderSeq();
  try{const a=getPomoPresets().find(p=>p.name===activePreset);if(a&&(a.kind==='custom')!==(sub==='custom')){activePreset=null;renderPomoPresets();}}catch(e){}
  updateTotalPreview();
}
function seqTouched(){activePreset=null;document.querySelectorAll('.pomo-preset-btn.active').forEach(b=>b.classList.remove('active'));saveDraft();updateTotalPreview();}
function renderSeq(){
  const list=$('seq-list');if(!list)return;
  list.innerHTML=seqDraft.map((x,i)=>`<div class="seq-row ${x.t==='w'?'w':'b'}">
    <span class="seq-n">${i+1}</span>
    <button class="seq-type" title="Switch work / break" onclick="flipBlock(${i})">${x.t==='w'?'WORK':'BREAK'}</button>
    <input class="num-in seq-min" type="number" min="1" max="${MAX_BLOCK_MIN}" value="${x.m}" aria-label="Minutes for block ${i+1}" oninput="setBlockMin(${i},this.value)" onchange="renderSeq()"/>
    <span class="seq-unit">min</span><span class="seq-sp"></span>
    <button class="seq-ic" title="Move up" onclick="moveBlock(${i},-1)"${i===0?' disabled':''}>↑</button>
    <button class="seq-ic" title="Move down" onclick="moveBlock(${i},1)"${i===seqDraft.length-1?' disabled':''}>↓</button>
    <button class="seq-ic del" title="Remove block" onclick="dropBlock(${i})">×</button>
  </div>`).join('')||'<div class="preset-empty">Empty — add a work block to begin.</div>';
}
const setBlockMin=(i,v)=>{const n=parseInt(v,10);if(!Number.isFinite(n))return;seqDraft[i].m=Math.min(MAX_BLOCK_MIN,Math.max(1,n));seqTouched();};
const flipBlock=(i)=>{seqDraft[i].t=seqDraft[i].t==='w'?'b':'w';renderSeq();seqTouched();};
const moveBlock=(i,d)=>{const j=i+d;if(j<0||j>=seqDraft.length)return;[seqDraft[i],seqDraft[j]]=[seqDraft[j],seqDraft[i]];renderSeq();seqTouched();};
const dropBlock=(i)=>{seqDraft.splice(i,1);renderSeq();seqTouched();};
function seqAdd(t){
  if(seqDraft.length>=MAX_BLOCKS){showToast(`MAX ${MAX_BLOCKS} BLOCKS`);return;}
  const prev=[...seqDraft].reverse().find(x=>x.t===t);
  seqDraft.push({t,m:prev?prev.m:(t==='w'?25:5)});
  renderSeq();seqTouched();
}
const seqClear=()=>{if(seqDraft.length&&!confirm('Clear all blocks in this sequence?'))return;seqDraft=[];renderSeq();seqTouched();};

function hrsMins(sec){
  const h=Math.floor(sec/3600),m=Math.round((sec%3600)/60);
  return h>0?`${h}h ${m}m`:`${m}m`;
}
function updateTotalPreview(){
  syncPomoSave();
  const box=$('total-preview');if(!box)return;
  let total,focus=null;
  if(focusMode==='pomo'){
    const plan=setupPlan();
    total=planSecs(plan);focus=planWorkSeconds(plan);
    if(!focus){box.innerHTML='';return;}
  }else total=focusTarget;
  if(!(total>0)){box.innerHTML='';return;}
  const endsAt=new Date(Date.now()+total*1000).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  const cell=(l,v,c)=>`<div class="tp-cell${c?' '+c:''}"><span>${l}</span><b>${v}</b></div>`;
  const split=(focus!==null&&focus!==total)?cell('Focus time',hrsMins(focus)):'';
  box.innerHTML=cell('Total',hrsMins(total))+split+cell('Finish around',endsAt,'end');
}
const updatePomoTotalPreview=updateTotalPreview;
['pomo-work','pomo-short','pomo-long','pomo-rounds'].forEach(id=>{
  $(id)?.addEventListener('input',()=>{activePreset=null;document.querySelectorAll('.pomo-preset-btn.active').forEach(b=>b.classList.remove('active'));updateTotalPreview();});
});
setInterval(()=>{const v=$('view-focus-setup');if(v&&v.classList.contains('active'))updateTotalPreview();},30000);

const SESS_KEY='bloc_sessions_v1';
const SESS_ARCHIVE_KEY='bloc_sessions_archive_v1';
const KEEP_RAW_DAYS=90;
let sessions=JSON.parse(localStorage.getItem(SESS_KEY)||'[]');
function saveSessions(){
  localStorage.setItem(SESS_KEY,JSON.stringify(sessions));
  rollUpOld();
}
function rollUpOld(){
  const cutoff=isoDate(new Date(bocNow().getTime()-KEEP_RAW_DAYS*86400000));
  const stale=sessions.filter(s=>s.dateISO&&s.dateISO<cutoff);
  if(!stale.length)return;
  let archive=[];
  try{archive=JSON.parse(localStorage.getItem(SESS_ARCHIVE_KEY)||'[]');}catch(e){archive=[];}
  const months={};
  stale.forEach(s=>{
    const month=s.dateISO.slice(0,7);
    months[month]=months[month]||{month,totalElapsedSec:0,sessionCount:0,completedCount:0};
    months[month].totalElapsedSec+=s.elapsed||0;
    months[month].sessionCount++;
    if(s.completed)months[month].completedCount++;
  });
  Object.values(months).forEach(rollup=>{
    const bucket=archive.find(a=>a.month===rollup.month);
    if(bucket){
      bucket.totalElapsedSec+=rollup.totalElapsedSec;
      bucket.sessionCount+=rollup.sessionCount;
      bucket.completedCount+=rollup.completedCount;
    }else archive.push(rollup);
  });
  localStorage.setItem(SESS_ARCHIVE_KEY,JSON.stringify(archive));
  sessions=sessions.filter(s=>!s.dateISO||s.dateISO>=cutoff);
  localStorage.setItem(SESS_KEY,JSON.stringify(sessions));
}

const TIMER_STATE_KEY='bloc_timer_state_v1';
function saveTimerState(){
  if(!timerID&&!focusPaused){localStorage.removeItem(TIMER_STATE_KEY);return;}
  const state={
    running:!!timerID,paused:focusPaused,
    focusMode,focusSubject,focusTaskId,focusTarget,
    pomoWork,pomoShort,pomoLong,pomoRounds,pomoPhase,pomoLapsDone,pomoPlan,pomoIdx,
    segTarget,elapsed,startEpoch:timerID?t0:null,
    distractionCount,justStartMode:_justStartMode,
    ambientType:_ambientType,savedAt:Date.now()
  };
  try{localStorage.setItem(TIMER_STATE_KEY,JSON.stringify(state));}catch(e){}
}
const clearTimerState=()=>{localStorage.removeItem(TIMER_STATE_KEY);};
function restoreTimerState(){
  let s=null;
  try{s=JSON.parse(localStorage.getItem(TIMER_STATE_KEY)||'null');}catch(e){}
  if(!s)return false;
  focusMode=s.focusMode;focusSubject=s.focusSubject;focusTaskId=s.focusTaskId;focusTarget=s.focusTarget;
  pomoWork=s.pomoWork;pomoShort=s.pomoShort;pomoLong=s.pomoLong;pomoRounds=s.pomoRounds;
  pomoPhase=s.pomoPhase;pomoLapsDone=s.pomoLapsDone;segTarget=s.segTarget;
  if(focusMode==='pomo'){
    if(Array.isArray(s.pomoPlan)&&s.pomoPlan.length){pomoPlan=s.pomoPlan;pomoIdx=Math.min(Math.max(0,s.pomoIdx|0),pomoPlan.length-1);}
    else{
      pomoPlan=classicPlan(pomoWork,pomoShort,pomoLong,pomoRounds);pomoIdx=0;
      let workCount=0;
      for(let i=0;i<pomoPlan.length;i++){
        if(pomoPlan[i].k==='work'){if(pomoPhase==='work'&&workCount===pomoLapsDone){pomoIdx=i;break;}workCount++;}
        else if(pomoPhase!=='work'&&workCount===pomoLapsDone){pomoIdx=i;break;}
      }
    }
  }
  distractionCount=s.distractionCount||0;_justStartMode=!!s.justStartMode;
  if(s.ambientType&&s.ambientType!=='off')setAmbient(s.ambientType);
  const distBadge=$('distract-count');
  if(distBadge){distBadge.textContent=`${distractionCount} distraction${distractionCount!==1?'s':''}`;distBadge.classList.toggle('has',distractionCount>0);}
  if(s.paused){
    elapsed=s.elapsed;focusPaused=true;
    goPaused();
    return true;
  }
  if(s.running&&s.startEpoch){
    const realElapsed=Math.floor((Date.now()-s.startEpoch)/1000);
    if(realElapsed<s.segTarget){
      elapsed=realElapsed;
      goRunning();
    }else{
      elapsed=s.segTarget;
      goRunning();
      onSegmentComplete();
    }
    return true;
  }
  clearTimerState();
  return false;
}
let focusMode='free',focusSubject='',focusTaskId='',focusTarget=3600;
let pomoWork=25*60,pomoShort=5*60,pomoLong=15*60,pomoRounds=4;
let pomoPhase='work',pomoLapsDone=0;
let pomoPlan=[],pomoIdx=0;
let timerID=null,t0=0,elapsed=0,segTarget=0;
let distractionCount=0;
let focusPaused=false;

const AudioCtx=window.AudioContext||window.webkitAudioContext;let _actx=null;
const getAudio=()=>{if(!_actx)_actx=new AudioCtx();if(_actx.state==='suspended')_actx.resume();return _actx;};
let audioPrimed=false;
function primeTimerAudio(){
  if(audioPrimed)return;
  audioPrimed=true;
  try{getAudio();}catch(e){}
  if('speechSynthesis'in window){
    try{const warm=new SpeechSynthesisUtterance(' ');warm.volume=0;warm.rate=10;speechSynthesis.speak(warm);}catch(e){}
  }
}
let alarmLoop=null,alarmStopped=false;
const silenceAlarm=()=>{alarmStopped=true;if(alarmLoop){try{alarmLoop.stop();}catch(e){}}alarmLoop=null;};
function playWorkEnd(){if(typeof appSettings!=='undefined'&&appSettings.timerSounds===false)return;const ac=getAudio(),now=ac.currentTime;function bowl(freq,gain,dur,detune=0){const osc=ac.createOscillator(),env=ac.createGain(),flt=ac.createBiquadFilter();flt.type='lowpass';flt.frequency.value=freq*3;osc.type='sine';osc.frequency.setValueAtTime(freq,now);osc.frequency.exponentialRampToValueAtTime(freq*.997,now+dur);osc.detune.value=detune;env.gain.setValueAtTime(0,now);env.gain.linearRampToValueAtTime(gain,now+.012);env.gain.exponentialRampToValueAtTime(.001,now+dur);osc.connect(flt);flt.connect(env);env.connect(ac.destination);osc.start(now);osc.stop(now+dur);}bowl(220,.55,4.2);bowl(440,.22,3.6);bowl(659,.10,2.8);bowl(880,.06,2.0);bowl(218.5,.18,4.0,-12);const buf=ac.createBuffer(1,ac.sampleRate*.06,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);const src=ac.createBufferSource(),g2=ac.createGain(),lpf=ac.createBiquadFilter();g2.gain.value=.18;lpf.type='lowpass';lpf.frequency.value=320;src.buffer=buf;src.connect(lpf);lpf.connect(g2);g2.connect(ac.destination);src.start(now);}
function playBreakEnd(){if(typeof appSettings!=='undefined'&&appSettings.timerSounds===false)return;const ac=getAudio(),now=ac.currentTime;function chime(t,freq,gain,dur){const osc=ac.createOscillator(),osc2=ac.createOscillator(),env=ac.createGain();osc.type='sine';osc.frequency.value=freq;osc2.type='sine';osc2.frequency.value=freq*2.756;const mg=ac.createGain();mg.gain.value=.28;env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(gain,t+.008);env.gain.exponentialRampToValueAtTime(.001,t+dur);osc.connect(env);osc2.connect(mg);mg.connect(env);env.connect(ac.destination);osc.start(t);osc.stop(t+dur);osc2.start(t);osc2.stop(t+dur);}chime(now,740,.5,2.2);chime(now+.55,880,.45,1.8);const osc3=ac.createOscillator(),eg=ac.createGain();osc3.type='sine';osc3.frequency.value=1760;eg.gain.setValueAtTime(0,now+.55);eg.gain.linearRampToValueAtTime(.08,now+.56);eg.gain.exponentialRampToValueAtTime(.001,now+1.8);osc3.connect(eg);eg.connect(ac.destination);osc3.start(now+.55);osc3.stop(now+2.2);}
function playBlockDone(){if(typeof appSettings!=='undefined'&&appSettings.timerSounds===false)return;silenceAlarm();alarmStopped=false;function playOnce(ac){const now=ac.currentTime;function gongPartial(freq,gain,dur,detune=0){const o=ac.createOscillator(),e=ac.createGain();o.type='sine';o.frequency.value=freq;o.detune.value=detune;e.gain.setValueAtTime(0,now);e.gain.linearRampToValueAtTime(gain,now+.015);e.gain.exponentialRampToValueAtTime(.001,now+dur);o.connect(e);e.connect(ac.destination);o.start(now);o.stop(now+dur);}gongPartial(110,.60,5.0);gongPartial(220,.30,4.2);gongPartial(165,.20,3.5,8);gongPartial(330,.12,2.8);gongPartial(440,.07,2.0);const notes=[523,659,784,1047];notes.forEach((f,i)=>{const o=ac.createOscillator(),e=ac.createGain(),t=now+.5+i*.22;o.type='sine';o.frequency.value=f;e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(.12,t+.01);e.gain.exponentialRampToValueAtTime(.001,t+1.4);o.connect(e);e.connect(ac.destination);o.start(t);o.stop(t+1.5);});const buf=ac.createBuffer(1,ac.sampleRate*.08,ac.sampleRate),bd=buf.getChannelData(0);for(let i=0;i<bd.length;i++)bd[i]=(Math.random()*2-1)*Math.pow(1-i/bd.length,3);const s=ac.createBufferSource(),g=ac.createGain(),lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=280;g.gain.value=.25;s.buffer=buf;s.connect(lp);lp.connect(g);g.connect(ac.destination);s.start(now);return 5.5;}function scheduleLoop(){if(alarmStopped)return;const ac=getAudio(),dur=playOnce(ac);const to=setTimeout(scheduleLoop,(dur+.6)*1000);alarmLoop={stop(){clearTimeout(to);}};};scheduleLoop();}
const stopAlarm=()=>{silenceAlarm();};
function playFiveLeft(){if(typeof appSettings!=='undefined'&&appSettings.timerSounds===false)return;const ac=getAudio(),now=ac.currentTime;function soft(freq,gain,dur){const osc=ac.createOscillator(),env=ac.createGain();osc.type='sine';osc.frequency.value=freq;env.gain.setValueAtTime(0,now);env.gain.linearRampToValueAtTime(gain,now+.02);env.gain.exponentialRampToValueAtTime(.001,now+dur);osc.connect(env);env.connect(ac.destination);osc.start(now);osc.stop(now+dur);}soft(528,.18,2.5);soft(1056,.06,1.8);}

let _ambientType='off',_ambientVol=.3,_ambientNode=null,_ambientGain=null;
function setAmbient(type){_ambientType=type;document.querySelectorAll('.amb-btn').forEach(b=>b.classList.remove('on'));const btn=$('amb-'+type);if(btn)btn.classList.add('on');stopAmbient();if(type!=='off')startAmbient(type);}
const setAmbientVol=(v)=>{_ambientVol=parseFloat(v);if(_ambientGain)_ambientGain.gain.value=_ambientVol;};
const stopAmbient=()=>{if(_ambientNode){try{_ambientNode.stop();}catch(e){}}_ambientNode=null;};
function startAmbient(type){const ac=getAudio(),bufSize=ac.sampleRate*4,buf=ac.createBuffer(2,bufSize,ac.sampleRate);for(let c=0;c<2;c++){const d=buf.getChannelData(c);if(type==='brown'){let v=0;for(let i=0;i<bufSize;i++){v=(v+.02*(Math.random()*2-1))*.98;d[i]=v*3.5;}}else if(type==='rain'){for(let i=0;i<bufSize;i++)d[i]=Math.random()*2-1;}else if(type==='cafe'){let v=0;for(let i=0;i<bufSize;i++){v=(v+.015*(Math.random()*2-1))*.985;d[i]=v*3+(Math.random()*.04-.02);}}}const src=ac.createBufferSource();src.buffer=buf;src.loop=true;const gain=ac.createGain();gain.gain.value=_ambientVol;const flt=ac.createBiquadFilter();if(type==='rain'){flt.type='highpass';flt.frequency.value=1200;}else{flt.type='lowpass';flt.frequency.value=type==='cafe'?2800:800;}src.connect(flt);flt.connect(gain);gain.connect(ac.destination);src.start();_ambientNode=src;_ambientGain=gain;}

function logDistraction(){
  distractionCount++;
  const el=$('distract-count');
  if(el){el.textContent=`${distractionCount} distraction${distractionCount!==1?'s':''}`;el.classList.add('has');}
  const btn=document.querySelector('.btn-distract');
  if(btn){btn.style.borderColor='var(--red)';btn.style.color='var(--red)';setTimeout(()=>{btn.style.borderColor='';btn.style.color='';},400);}
  showToast(`DISTRACTION #${distractionCount} LOGGED`);
  saveTimerState();
}
const resetDistraction=()=>{distractionCount=0;const el=$('distract-count');if(el){el.textContent='0 distractions';el.classList.remove('has');}};

const R=116,CIRC=2*Math.PI*R;
(function drawTicks(){
  const svg=$('ring-svg');
  for(let i=0;i<60;i++){
    const angle=(i/60)*360-90,rad=angle*Math.PI/180;
    const major=i%5===0,r1=137,r2=r1+(major?10:5);
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',145+r1*Math.cos(rad));line.setAttribute('y1',145+r1*Math.sin(rad));
    line.setAttribute('x2',145+r2*Math.cos(rad));line.setAttribute('y2',145+r2*Math.sin(rad));
    line.setAttribute('stroke',major?'var(--bdr2)':'var(--bdr)');
    line.setAttribute('stroke-width',major?1.5:1);
    svg.insertBefore(line,$('ring-track'));
  }
})();
function updateRing(e,tgt){
  const prog=Math.min(e/tgt,1),off=CIRC*(1-prog);
  const rp=$('ring-progress'),almostDone=prog>.85;
  let color,glow;
  if(pomoPhase==='short'||pomoPhase==='long'){color='var(--green)';glow='rgba(61,138,85,.5)';}
  else{color=prog>=1?'var(--green)':almostDone?'#a8d868':'var(--amber)';glow=prog>=1?'rgba(61,138,85,.5)':almostDone?'rgba(168,216,104,.4)':'rgba(230,161,24,.5)';}
  rp.style.strokeDashoffset=off;rp.style.stroke=color;rp.style.filter=`drop-shadow(0 0 10px ${glow})`;
  $('ring-pulse').style.borderColor=color;
  $('elapsed-display').style.color=(pomoPhase==='short'||pomoPhase==='long')?'var(--green)':almostDone?'#a8d868':'var(--txt)';
  $('elapsed-display').textContent=fmtTime(e);$('target-sub').textContent=(typeof _justStartMode!=='undefined'&&_justStartMode)?'no target — stop anytime':'of '+fmtTime(tgt);
  $('pct-display').textContent=Math.floor(prog*100)+'%';
  $('stat-target').textContent=fmtDur(tgt);$('stat-remaining').textContent=fmtDur(Math.max(tgt-e,0));$('stat-done').textContent=fmtDur(e);
  const wrap=$('ring-wrap');
  if(wrap){wrap.style.setProperty('--focus-accent',color);wrap.style.setProperty('--focus-glow',glow);}
  const marker=$('ring-second-marker');
  if(marker){
    const sec=e%60,ang=(sec/60)*360-90,rad=ang*Math.PI/180;
    marker.setAttribute('cx',145+R*Math.cos(rad));
    marker.setAttribute('cy',145+R*Math.sin(rad));
    marker.setAttribute('fill',color);
  }
}

let fiveWarned=false;
function startTimerTick(){
  stopTimerTick();fiveWarned=false;$('five-warn').classList.remove('show');
  t0=Date.now()-elapsed*1000;
  saveTimerState();
  let ticks=0;
  timerID=setInterval(()=>{
    const e=Math.floor((Date.now()-t0)/1000);
    if(e>=segTarget){stopTimerTick();elapsed=segTarget;updateRing(elapsed,segTarget);$('five-warn').classList.remove('show');onSegmentComplete();}
    else{
      elapsed=e;updateRing(elapsed,segTarget);const rem=segTarget-e;if(rem<=300&&rem>0&&!fiveWarned&&pomoPhase==='work'){fiveWarned=true;$('five-warn').classList.add('show');playFiveLeft();}if(rem>300)fiveWarned=false;
      if(++ticks%8===0)saveTimerState();
    }
  },250);
}
function stopTimerTick(){if(timerID){clearInterval(timerID);timerID=null;}stopAmbient();}
function isFourthLap(lap){return lap%4===0;}
function onSegmentComplete(){
  $('five-warn').classList.remove('show');
  if(focusMode==='free'||focusMode==='sprint'){commitSession(elapsed,true);playBlockDone();goCompleted();}
  else{
    if(pomoPlan[pomoIdx]&&pomoPlan[pomoIdx].k==='work'){pomoLapsDone++;updatePomoLaps();}
    const next=pomoPlan[pomoIdx+1];
    if(!next){commitSession(planWorkSeconds(),true);playBlockDone();goCompleted();return;}
    pomoIdx++;
    if(next.k==='work'){playBreakEnd();speakTimerCue('Break\'s over. Time to get back to work.');}
    else{playWorkEnd();speakTimerCue(next.k==='long'?'Long rest time. Take a good break, you\'ve earned it.':'Rest time. Take a few minutes to recharge.');}
    startSegment(next);
  }
}
function startSegment(seg){
  const isBreak=seg.k!=='work';
  pomoPhase=seg.k;segTarget=seg.sec;elapsed=0;fiveWarned=false;
  showPhaseBadge();showSkipBreak(isBreak);updatePomoLaps();updatePomoNext();
  $('btn-interrupt').style.display=isBreak?'none':'block';
  $('ring-lbl').textContent=isBreak?'BREAK':'ELAPSED';
  if(_ambientType!=='off')startAmbient(_ambientType);
  startTimerTick();
}
function updatePomoNext(){
  const el=$('pomo-next');if(!el)return;
  if(focusMode!=='pomo'){el.style.display='none';return;}
  const n=pomoPlan[pomoIdx+1];
  if(!n){el.textContent='LAST BLOCK';el.style.display='block';return;}
  el.textContent=`UP NEXT · ${chipDur(n.sec)} ${n.k==='work'?'WORK':'BREAK'}`;el.style.display='block';
}
function showPhaseBadge(){const b=$('phase-badge');b.className='phase-badge visible';if(pomoPhase==='work'){b.classList.add('work');b.textContent='WORK';}else{b.classList.add('brk');b.textContent='BREAK';}}
const showSkipBreak=(v)=>{$('btn-skip-break').classList.toggle('visible',v);};
function skipBreak(){
  if(pomoPhase==='work')return;
  const next=pomoPlan[pomoIdx+1];
  if(!next){commitSession(planWorkSeconds(),true);playBlockDone();goCompleted();return;}
  pomoIdx++;startSegment(next);
}
function updatePomoLaps(){const wrap=$('pomo-laps');if(focusMode!=='pomo'){wrap.style.display='none';return;}wrap.style.display='flex';wrap.innerHTML=Array.from({length:pomoRounds},(_,i)=>{let cls='lap-dot';if(i<pomoLapsDone)cls+=' done';else if(i===pomoLapsDone&&pomoPhase==='work')cls+=' active';return`<div class="${cls}"></div>`;}).join('');}

function selectMode(m){
  focusMode=m;
  document.querySelectorAll('.mode-opt').forEach(o=>{const on=o.dataset.mode===m;o.classList.toggle('on',on);o.setAttribute('aria-pressed',String(on));});
  $('free-duration-cfg').style.display=(m==='pomo')?'none':'block';
  $('pomo-cfg').classList.toggle('visible',m==='pomo');
  updateTotalPreview();
}
function syncCustom(){const h=Math.max(0,parseInt($('custom-h').value)||0),m=Math.max(0,Math.min(59,parseInt($('custom-m').value)||0));focusTarget=h*3600+m*60;durOpen=true;markDur();updateTotalPreview();}
$('custom-h').addEventListener('input',syncCustom);
$('custom-m').addEventListener('input',syncCustom);
function populateFocusTaskSelect(){
  const sel=$('focus-task-select');
  const canFocus=t=>!t.done&&!t._archived&&t.dateISO!=='someday';
  const pending=tasks.filter(canFocus);
  sel.innerHTML='<option value="">⚡ SELECT FROM PENDING TASKS…</option>';
  const makeOpt=(t,label)=>{const o=document.createElement('option');o.value=t.id;o.dataset.text=t.text;const blocked=isTaskBlocked(t);o.textContent=(blocked?'Blocked · ':'')+label;if(blocked){o.disabled=true;o.title='Blocked until its dependency is done';}return o;};
  const a=pending.filter(t=>t.type==='A');
  if(a.length){const g=document.createElement('optgroup');g.label='A — Must Do';a.forEach((t,i)=>{g.appendChild(makeOpt(t,'A-'+(i+1)+': '+t.text));});sel.appendChild(g);}
  ['B','C','D','E'].forEach(type=>{const gt=pending.filter(t=>t.type===type);if(gt.length){const g=document.createElement('optgroup'),names={B:'Should Do',C:'Nice to Do',D:'Delegate',E:'Eliminate'};g.label=type+' — '+names[type];gt.forEach(t=>{g.appendChild(makeOpt(t,t.text));});sel.appendChild(g);}});
  sel.onchange=function(){const opt=sel.options[sel.selectedIndex];if(opt&&opt.value)$('focus-task-custom').value=opt.dataset.text||opt.textContent;};
  const a1=tasks.find(t=>t.type==='A'&&canFocus(t)&&!isTaskBlocked(t));
  if(a1){$('focus-task-custom').value=a1.text;sel.value=a1.id;}
}
function updateSetupStats(){
  if(!sessions.length){$('setup-stats').style.display='none';return;}
  $('setup-stats').style.display='flex';
  $('ss-total').textContent=sessions.length;
  $('ss-done').textContent=sessions.filter(s=>s.completed).length;
  $('ss-time').textContent=fmtDur(sessions.reduce((a,s)=>a+s.elapsed,0));
  $('ss-streak').innerHTML=streakData.current+' '+'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-flame"/></svg>';
}
function startBlock(){
  _justStartMode=false;
  primeTimerAudio();
  const sel=$('focus-task-select'),picked=sel.options[sel.selectedIndex],typed=$('focus-task-custom').value.trim();
  if(picked&&picked.value&&(picked.dataset.text===typed||picked.textContent===typed)){focusTaskId=picked.value;focusSubject=typed||picked.dataset.text||'Focus Block';}
  else{const matched=tasks.find(t=>!t.done&&t.text===typed);focusTaskId=matched?matched.id:'';focusSubject=typed||'Focus Block';}
  if(focusTaskId){
    const chosen=tasks.find(t=>t.id===focusTaskId);
    const blocker=getTaskDependency(chosen);
    if(blocker&&!blocker.done){showToast(`🔒 BLOCKED — FINISH "${blocker.text.length>28?blocker.text.slice(0,28)+'…':blocker.text}" FIRST`);return;}
  }
  if(focusMode==='pomo'){
    let plan;
    if(pomoSub==='custom'){
      plan=seqPlan(seqDraft);
      if(!plan.some(x=>x.k==='work')){showToast('ADD AT LEAST ONE WORK BLOCK');return;}
      if(plan[0].k!=='work'){showToast('START THE SEQUENCE WITH A WORK BLOCK');return;}
    }else{
      const f=readClassic();
      pomoWork=f.w*60;pomoShort=f.s*60;pomoLong=f.l*60;
      plan=classicPlan(pomoWork,pomoShort,pomoLong,f.r);
    }
    pomoPlan=plan;pomoIdx=0;
    pomoRounds=plan.filter(x=>x.k==='work').length;
    segTarget=plan[0].sec;pomoLapsDone=0;pomoPhase='work';
  } else {if(focusTarget<=0){showToast('SET A DURATION');return;}segTarget=focusTarget;pomoPhase='work';}
  elapsed=0;resetDistraction();goRunning();
}

let _justStartMode=false;
const JUST_START_CAP=8*3600;
function justStartTap(){
  if(timerID){showView('timer');return;}
  if(focusPaused){showView('paused');return;}
  primeTimerAudio();
  focusTaskId='';focusSubject='';focusMode='free';
  segTarget=JUST_START_CAP;pomoPhase='work';
  elapsed=0;resetDistraction();
  _justStartMode=true;
  goRunning();
  showToast("TIMER STARTED — TAP I'M DONE WHEN YOU'RE FINISHED");
}
function updateJsFabState(){
  const fab=$('js-fab');if(!fab)return;
  const lbl=$('js-fab-label');
  if(timerID||focusPaused){
    fab.classList.add('running');
    if(lbl)lbl.textContent=focusPaused?'⏸ PAUSED':'⏱ RESUME';
  }else{
    fab.classList.remove('running');
    if(lbl)lbl.textContent="I'M STUDYING →";
  }
}


function goRunning(){
  focusPaused=false;
  $('timer-subject-chip').textContent=(focusSubject||'SESSION').toUpperCase();
  $('zen-subject-lbl').textContent=(focusSubject||'').toUpperCase();
  updateRing(elapsed,segTarget);
  if(focusMode==='pomo'){const brk=pomoPhase!=='work';showPhaseBadge();updatePomoLaps();updatePomoNext();$('btn-skip-break').style.display='';showSkipBreak(brk);$('btn-interrupt').style.display=brk?'none':'block';$('ring-lbl').textContent=brk?'BREAK':'ELAPSED';}
  else{$('phase-badge').className='phase-badge';$('pomo-laps').style.display='none';updatePomoNext();$('btn-skip-break').classList.remove('visible');$('btn-interrupt').style.display='block';$('ring-lbl').textContent='ELAPSED';}
  $('btn-interrupt').textContent=_justStartMode?"✕ I'M DONE":'⏸ INTERRUPT';
  const showChip=focusSubject&&focusSubject!=='Focus Block';
  $('task-chip-row').style.display=showChip?'flex':'none';$('task-chip-txt').textContent=focusSubject;
  if(_ambientType!=='off')startAmbient(_ambientType);
  showView('timer');startTimerTick();
  updateJsFabState();
}
function realElapsedSeconds(){
  if(focusMode!=='pomo')return elapsed;
  let done=0;for(let i=0;i<pomoIdx;i++)if(pomoPlan[i].k==='work')done+=pomoPlan[i].sec;
  return done+(pomoPhase==='work'?elapsed:0);
}
function tryInterrupt(){
  stopTimerTick();
  if(_justStartMode){commitSession(elapsed,true);goCompleted();return;}
  const prog=Math.min(elapsed/segTarget,1),rem=Math.max(segTarget-elapsed,0);
  if(elapsed>=segTarget){commitSession(realElapsedSeconds(),true);goCompleted();return;}
  $('warn-body').innerHTML=`You've completed <strong>${fmtTime(elapsed)}</strong> of <strong>${fmtTime(segTarget)}</strong> target.<br>You're <strong>${Math.floor(prog*100)}%</strong> through.<br><br><strong>${fmtTime(rem)}</strong> remaining. Pause now and your progress is saved.`;
  $('warn-overlay').classList.add('open');
}
function keepGoing(){$('warn-overlay').classList.remove('open');goRunning();}
function confirmPause(){$('warn-overlay').classList.remove('open');goPaused();}
function goPaused(){
  focusPaused=true;
  stopTimerTick();const prog=Math.min(elapsed/segTarget,1),rem=Math.max(segTarget-elapsed,0);
  $('paused-remaining').textContent=fmtTime(rem);$('paused-subj').textContent=focusSubject||'Focus Block';
  $('paused-date').textContent=dateStr();$('paused-pct').textContent=Math.floor(prog*100)+'%';
  $('paused-bar').style.width=(prog*100)+'%';$('paused-done-t').textContent='✓ '+fmtDur(elapsed)+' done';$('paused-left-t').textContent=fmtDur(rem)+' left';
  showView('paused');
  updateJsFabState();
  saveTimerState();
}
function resumeBlock(){goRunning();}
function abandonBlock(){commitSession(realElapsedSeconds(),false);elapsed=0;focusPaused=false;_justStartMode=false;stopTimerTick();resetDistraction();updateSetupStats();showView('focus-setup');updateJsFabState();}
function goCompleted(){
  focusPaused=false;
  stopTimerTick();
  $('done-subject').textContent=focusSubject||'Focus Block';
  $('done-time').textContent=fmtDur(focusMode==='pomo'?planWorkSeconds():elapsed);
  $('done-target').textContent=_justStartMode?'open-ended':fmtDur(focusMode==='pomo'?planWorkSeconds():focusTarget);
  $('done-mode').textContent={free:'FREE',pomo:'POMO',sprint:'SPRINT'}[focusMode];
  $('done-streak').innerHTML=streakData.current+' '+'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-flame"/></svg>';
  $('done-distractions').textContent=distractionCount;
  $('done-distractions').style.color=distractionCount===0?'var(--green)':distractionCount<=3?'var(--amber)':'var(--red)';
  let matchedTask=focusTaskId?tasks.find(t=>!t.done&&t.id===focusTaskId):null;
  if(!matchedTask&&focusSubject&&focusSubject!=='Focus Block')matchedTask=tasks.find(t=>!t.done&&t.text===focusSubject);
  if($('tdp-event-wrap'))$('tdp-event-wrap').style.display='none';
  if(matchedTask){
    $('tdp-task-name').textContent=matchedTask.text.length>40?matchedTask.text.slice(0,40)+'…':matchedTask.text;
    $('task-done-prompt').style.display='flex';$('task-done-prompt').dataset.tid=matchedTask.id;
    $('task-attach-prompt').style.display='none';
    const nowMin=bocNow().getHours()*60+bocNow().getMinutes();
    fillEventSelect('tdp-event-select','tdp-event-wrap',matchedTask.id,detectLiveEvent(matchedTask.id,isoDate(bocNow()),nowMin));
  }else if(_justStartMode){
    $('task-done-prompt').style.display='none';
    fillAttachSelect();
    $('task-attach-prompt').style.display='flex';
  }else{
    $('task-done-prompt').style.display='none';
    $('task-attach-prompt').style.display='none';
  }
  _justStartMode=false;
  if(document.body.classList.contains('zen'))toggleZen();
  showView('done');spawnSparks();
  updateJsFabState();
}
function linkedEventsOn(taskId,iso){
  return calEvents.filter(e=>e.taskId===taskId&&calEventOccursOn(e,iso))
    .map(e=>({ev:e,occ:calGetOccurrence(e,iso)})).filter(x=>x.occ);
}
function detectLiveEvent(taskId,iso,nowMin){
  const linked=linkedEventsOn(taskId,iso);
  if(!linked.length)return null;
  const live=linked.find(x=>nowMin>=x.occ.start&&nowMin<x.occ.end);
  if(live)return live.ev.id;
  const undone=linked.filter(x=>!x.occ.done);
  const pool=undone.length?undone:linked;
  pool.sort((a,b)=>Math.abs(a.occ.start-nowMin)-Math.abs(b.occ.start-nowMin));
  return pool[0].ev.id;
}
function fillEventSelect(selId,wrapId,taskId,preselectId){
  const sel=$(selId),wrap=$(wrapId),host=$('task-done-prompt');
  if(!sel||!wrap)return;
  const iso=isoDate(bocNow());
  const linked=linkedEventsOn(taskId,iso);
  if(linked.length<2){
    wrap.style.display='none';sel.innerHTML='';
    if(host)host.style.flexDirection='';
    if(sessions[0]){sessions[0].eventId=linked.length===1?linked[0].ev.id:null;saveSessions();}
    return;
  }
  wrap.style.display='block';
  if(host)host.style.flexDirection='column';
  sel.innerHTML=linked.map(x=>`<option value="${x.ev.id}"${x.ev.id===preselectId?' selected':''}>${fmtClock(x.occ.start)}–${fmtClock(x.occ.end)} — ${escHTML(x.occ.title||x.ev.title)}</option>`).join('');
  if(sessions[0]){sessions[0].eventId=sel.value||null;saveSessions();}
}
function onEventLinkChange(selId){
  const sel=$(selId);if(!sel||!sessions[0])return;
  sessions[0].eventId=sel.value||null;saveSessions();
}
function fillAttachSelect(){
  const sel=$('attach-task-select');if(!sel)return;
  const pending=tasks.filter(t=>!t.done);
  sel.innerHTML='<option value="">— pick a task (optional) —</option>'+pending.map(t=>`<option value="${t.id}">${t.type}: ${escHTML(t.text)}</option>`).join('');
}
function confirmAttachTask(){
  const sel=$('attach-task-select');
  const tid=sel&&sel.value;
  $('task-attach-prompt').style.display='none';
  if(!tid)return;
  const t=tasks.find(x=>x.id===tid);
  if(t){
    if(sessions[0]){sessions[0].subject=t.text;sessions[0].taskId=t.id;}
    saveSessions();
    focusTaskId=t.id;
    accrueTaskProgress(t.id,sessions[0]?sessions[0].elapsed:0);
    $('tdp-task-name').textContent=t.text.length>40?t.text.slice(0,40)+'…':t.text;
    $('task-done-prompt').style.display='flex';$('task-done-prompt').dataset.tid=t.id;
    const nowMin=bocNow().getHours()*60+bocNow().getMinutes();
    fillEventSelect('tdp-event-select','tdp-event-wrap',t.id,detectLiveEvent(t.id,isoDate(bocNow()),nowMin));
    showToast('LINKED TO TASK — MARK IT DONE?');
  }
}
function dismissAttachPrompt(){$('task-attach-prompt').style.display='none';}
function markFocusTaskDone(){
  const tid=$('task-done-prompt').dataset.tid;
  if(tid){
    const t=tasks.find(t=>t.id===tid);
    if(t){
      const blocker=getTaskDependency(t);
      if(blocker&&!blocker.done){
        showToast(`🔒 BLOCKED — FINISH "${blocker.text.length>28?blocker.text.slice(0,28)+'…':blocker.text}" FIRST`);
        dismissTaskPrompt();
        return;
      }
      completeTaskCore(t);
      if(typeof calEvents!=='undefined'){
        const occISO=t.dateISO||isoDate(bocNow());
        let touched=false;
        calEvents.forEach(ev=>{
          if(ev.taskId!==tid)return;
          if(!calEventOccursOn(ev,occISO))return;
          calSetEventDone(ev,occISO,true);
          touched=true;
        });
        if(touched)saveCal();
      }
      renderTasks();
    }
  }
  $('task-done-prompt').style.display='none';if($('tdp-event-wrap'))$('tdp-event-wrap').style.display='none';showToast('✓ TASK MARKED DONE');focusTaskId='';
}
function dismissTaskPrompt(){$('task-done-prompt').style.display='none';if($('tdp-event-wrap'))$('tdp-event-wrap').style.display='none';focusTaskId='';}
function newBlock(){stopAlarm();elapsed=0;focusPaused=false;focusTaskId='';_justStartMode=false;resetDistraction();updateSetupStats();populateFocusTaskSelect();showView('focus-setup');updateJsFabState();}
function commitSession(e,completed){
  clearTimerState();
  const fullTarget=(focusMode==='pomo')?planWorkSeconds():segTarget;
  sessions.unshift({id:Date.now().toString(),subject:focusSubject||'Untitled',mode:focusMode,target:fullTarget,elapsed:e,completed,date:dateStr(),dateISO:isoDate(bocNow()),distractions:distractionCount,source:_justStartMode?'just-start':'setup',confidence:'high',taskId:focusTaskId||null,eventId:null});
  saveSessions();updateLogCount();
  if(completed)recomputeStreak();
  if(completed&&focusTaskId)accrueTaskProgress(focusTaskId,e);
  renderScore();
}
function updateLogCount(){$('log-count').textContent=sessions.length;}


function toggleZen(){
  const isZen=document.body.classList.toggle('zen');
  showToast(isZen?'ZEN MODE — PRESS Z OR ESC TO EXIT':'ZEN MODE OFF');
}

function goFocusNav(){
  if(timerID){showView('timer');}
  else if(focusPaused){showView('paused');}
  else{showView('focus-setup');}
}

const LAST_VIEW_TRACKED=['tasks','focus-setup','weekly','habits','calendar','notes'];
function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  $('view-'+name).classList.add('active');
  if(window.syncViewClass)syncViewClass();
  if(name==='profile'&&window.onProfileShown)onProfileShown();
  if(LAST_VIEW_TRACKED.includes(name)){try{localStorage.setItem(LAST_VIEW_KEY,name);}catch(e){}}
  if(typeof applyBranding==='function')applyBranding(name);
  $('nav-tasks').classList.toggle('active',name==='tasks');
  $('nav-focus').classList.toggle('active',name==='focus-setup'||name==='timer'||name==='paused'||name==='done');
  $('nav-weekly').classList.toggle('active',name==='weekly');
  $('nav-habits').classList.toggle('active',name==='habits');
  $('nav-calendar').classList.toggle('active',name==='calendar');
  $('nav-notes').classList.toggle('active',name==='notes');
  $('nav-library').classList.toggle('active',name==='library');
  if(name==='tasks'){renderPlanTarget();}
  if(name==='focus-setup'){populateFocusTaskSelect();updateSetupStats();renderPomoPresets();}
  if(name==='weekly'){renderWeeklyReview();positionWkModeIndicator();}
  if(name==='habits'&&typeof renderHabits==='function')renderHabits();
  if(name==='calendar'){
    calRender();
    setTimeout(calAutoScroll,30);
    maybeRequestNotifPermission();
  }
  if(name==='notes'){renderNotesView();}
  if(name==='library'&&typeof renderLibraryView==='function')renderLibraryView();
  if(typeof renderTracyContext==='function'&&['tasks','calendar','weekly'].includes(name))renderTracyContext(name);
  const khTrig=$('kbd-hint-trigger');if(khTrig)khTrig.style.display=(name==='tasks')?'inline-flex':'none';
  const kh=$('kbd-hint');if(kh)kh.classList.remove('open');
  if(typeof guideOnViewChange==='function')guideOnViewChange(name);
}

function closeSidePanels(keep){
  [['settings-panel',closeSettings],['hist-panel',closeHist],['focus-habits-panel',closeFocusHabits],['rulebook-panel',closeRulebook]]
    .forEach(([id,close])=>{const p=$(id);if(id!==keep&&p&&p.classList.contains('open'))close();});
}
function openHist(){closeSidePanels('hist-panel');renderHistory();$('hist-backdrop').classList.add('open');$('hist-panel').classList.add('open');}
function closeHist(){cancelHistSelect();$('hist-backdrop').classList.remove('open');$('hist-panel').classList.remove('open');}

let _histSelectMode=false,_histSelected=new Set();
function toggleHistSelect(){_histSelectMode=!_histSelectMode;_histSelected.clear();renderHistory();$('hist-select-btn').classList.toggle('active',_histSelectMode);$('hist-select-btn').textContent=_histSelectMode?'SELECTING…':'SELECT';$('hist-clear-btn').style.display=_histSelectMode?'none':'block';$('hist-delete-sel-btn').style.display=_histSelectMode?'block':'none';$('hist-cancel-sel-btn').style.display=_histSelectMode?'block':'none';}
function cancelHistSelect(){_histSelectMode=false;_histSelected.clear();if($('hist-select-btn')){$('hist-select-btn').classList.remove('active');$('hist-select-btn').textContent='SELECT';$('hist-clear-btn').style.display='block';$('hist-delete-sel-btn').style.display='none';$('hist-cancel-sel-btn').style.display='none';}renderHistory();}
function deleteSession(id){sessions=sessions.filter(s=>s.id!==id);saveSessions();updateLogCount();renderHistory();showToast('SESSION REMOVED');}
function deleteSelected(){const count=_histSelected.size;if(!count){showToast('SELECT SESSIONS FIRST');return;}sessions=sessions.filter(s=>!_histSelected.has(s.id));saveSessions();updateLogCount();cancelHistSelect();showToast(`DELETED ${count} SESSION${count!==1?'S':''}`);}
function clearAllSessions(){if(!sessions.length){showToast('LOG IS ALREADY EMPTY');return;}if(!confirm(`Delete all ${sessions.length} sessions? This cannot be undone.`))return;sessions=[];saveSessions();updateLogCount();renderHistory();showToast('LOG CLEARED');}
function toggleHistItem(id){if(!_histSelectMode)return;if(_histSelected.has(id))_histSelected.delete(id);else _histSelected.add(id);const row=document.querySelector(`.hist-item[data-id="${id}"]`);if(row){row.classList.toggle('selected',_histSelected.has(id));const chk=row.querySelector('.hist-sel-chk');if(chk)chk.textContent=_histSelected.has(id)?'✓':'';}const n=_histSelected.size;$('hist-delete-sel-btn').textContent=n?`DELETE (${n})`:'DELETE SELECTED';}
function renderHistory(){
  const total=sessions.reduce((a,s)=>a+s.elapsed,0);
  $('hist-meta').textContent=`${sessions.length} SESSION${sessions.length!==1?'S':''} · ${fmtDur(total)} FOCUSED`;
  const list=$('hist-list');
  if(!sessions.length){list.innerHTML='<div class="no-hist">No sessions yet.<br>Start your first block.</div>';return;}
  list.innerHTML=sessions.map(s=>{
    const pct=Math.min(s.elapsed/s.target*100,100),color=s.completed?'var(--green)':'var(--amber)';
    const modeTag={free:'FREE',pomo:'POMO',sprint:'SPRINT'}[s.mode||'free'];
    const isSel=_histSelected.has(s.id);const selCls=_histSelectMode?' select-mode':'',selCls2=isSel?' selected':'';
    const distTag=s.distractions>0?`<span style="font-size:10px;color:var(--red);margin-left:8px">${s.distractions}⚡</span>`:'';
    return`<div class="hist-item${selCls}${selCls2}" data-id="${s.id}" onclick="toggleHistItem('${s.id}')">
      <div class="hist-sel-chk">${isSel?'✓':''}</div>
      <button class="hist-del-btn" onclick="event.stopPropagation();deleteSession('${s.id}')" title="Delete">✕</button>
      <div class="hist-row"><div class="hist-subj">${escHTML(s.subject)}</div><div class="hist-badge ${s.completed?'ok':'partial'}">${s.completed?'✓ DONE':'PARTIAL'}</div></div>
      <div class="hist-bar"><div class="hist-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="hist-info"><span>${fmtDur(s.elapsed)} / ${fmtDur(s.target)} · ${modeTag}${distTag}</span><span>${s.date}</span></div>
    </div>`;
  }).join('');
}

let toastTO;
function showToast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTO);toastTO=setTimeout(()=>t.classList.remove('show'),2400);}

function spawnSparks(){
  const colors=['#e6a118','#ede7d4','#c24a18','#3d8a55','#f0c060','#e8513a','#4ea8e8','#7c6fe0'];
  const shapes=['50%','0','30% 70% 70% 30% / 30% 30% 70% 70%'];
  for(let i=0;i<65;i++){setTimeout(()=>{const el=document.createElement('div');el.className='spark';const size=4+Math.random()*10,shape=shapes[Math.floor(Math.random()*shapes.length)];el.style.cssText=`left:${5+Math.random()*90}%;width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${shape};animation-duration:${1.6+Math.random()*1.8}s;animation-delay:0s;`;document.body.appendChild(el);el.addEventListener('animationend',()=>el.remove());},Math.random()*1000);}
}

function weekWindowISO(offsetWeeks){
  offsetWeeks=offsetWeeks||0;
  const startDate=calWeekStart(bocNow());
  startDate.setDate(startDate.getDate()-offsetWeeks*7);
  const endDate=new Date(startDate);endDate.setDate(endDate.getDate()+6);
  return {cutoffISO:isoDate(startDate),endISO:isoDate(endDate),startDate,endDate};
}

/* Tour data. Step: {t, d, sel, pre, pts}. sel is a selector or a list tried in order; hidden or missing targets are skipped by guide.js. */
const GUIDE_CONTENT=(function(){
  const run=(fn,...a)=>()=>{if(typeof window[fn]==='function')window[fn](...a);};
  const openSec=t=>()=>{if(typeof guideOpenSec==='function')guideOpenSec(t);};
  const openDetails=()=>{const d=document.getElementById('wk-details');if(d)d.open=true;};
  return {tours:[
    {key:'tasks',label:'TASKS',view:'tasks',steps:[
      {t:'Add a task in seconds',d:'Type it, pick a letter (A–E), then press Enter. That’s the whole job.',sel:'#new-input',pts:[['N','jump to the box'],['Q','quick-capture from anywhere']]},
      {t:'Today · Tomorrow · Someday',d:'Choose which day a task belongs to. “Someday” is a parking lot — tap ☀ Today to promote it later.',sel:'#plan-target'},
      {t:'The Calm / Full switch',d:'Top right. Calm view shows just the add bar and your A box, with B–E folded away. It does not start a timer. Tap Calm or Full any time to switch between calm view and every tool.',sel:'#focus-mode-btn',pts:[['Tinted','calm view is on'],['Plain','every tool is shown']]},
      {t:'The A–E sections',d:'A = must do, B = should do, C = nice to do, D = delegate, E = eliminate. Not sure which letter? Tap the ? beside a letter, or open the Rulebook. In the calm view B–E start folded: tap a letter to open it.',sel:'#sections',pts:[['1–5','jump to a section'],['R','open the Rulebook']]},
      {t:'Check it off',d:'Tap the circle to finish a task. Tap again to undo.',sel:['.t-chk','#new-input'],pre:openSec('A')},
      {t:'Reorder or delete',d:'Use ↑ ↓ to change the order inside a section, or ✕ to delete. They appear when you hover a task.',sel:['.t-actions','#new-input'],pre:openSec('A')},
      {t:'Delegate or eliminate',d:'D tasks get a Delegate button, E tasks get Remove. Each one clears your mind and your list.',sel:['.t-delegate','#new-input'],pre:openSec('D')},
      {t:'Time estimate & repeat',d:'Tap ⏱ to say how long it takes, and ↻ to repeat it every day. Estimates power Fit Check and your weekly budget.',sel:['.t-est','#new-input'],pre:openSec('A')},
      {t:'Details: notes, subtasks, links',d:'Open Details to add a linked note, split a task into subtasks with a progress bar, or block it until another task is done.',sel:['.t-expand','#new-input'],pre:openSec('A'),pts:[['Note','opens this task’s note in Notes'],['Locked','locked until the other task is finished']]},
      {t:'Progress, score & streak',d:'The bar shows done vs. total. Finish days to grow the 🔥 streak up top. A quiet “A tasks left” note shows until your A’s are done.',sel:['.prog-wrap','#prog-fill']},
      {t:'Filter the noise',d:'Top priorities keeps just the top ~20% that matter most. “Open 3+ days” shows tasks that have been sitting for a while. Tap again to see everything.',sel:'.filter-seg'},
      {t:'Fit Check',d:'Will today’s list really fit in the time you have left? Fit Check shows what to move to tomorrow.',sel:'.tt-fit'},
      {t:'Energy-aware planning',d:'⚡ Log your energy from 1 to 5. On a rough day, the window also lets you show only your single most important task.',sel:'#energy-btn'},
      {t:'Wrap up the day',d:'✦ End of Day lets you reflect. Clear Done tidies finished tasks. 🎨 Theme changes colours. Data ▾ exports your tasks as text or a calendar file. Full backups live in Profile.',sel:'.btm-bar',pts:[['Clear all tasks','in Settings → Backup & Reset (you type DELETE to confirm)']]},
      {t:'Keyboard shortcuts',d:'Tap ⌨ Shortcuts any time to see every shortcut. The big three: N new task, Q quick capture, 1–5 jump to a section.',sel:'#kbd-hint-trigger'}
    ]},
    {key:'focus',label:'FOCUS BLOCK',view:'focus-setup',steps:[
      {t:'Pick what to work on',d:'Your top A task is filled in for you. Click the field to pick another pending task, or just type any name.',sel:'#focus-combo'},
      {t:'Choose a mode',d:'Free Block: any length. Pomodoro: work with short breaks. Deep Sprint: one long stretch with no breaks.',sel:'#mode-row'},
      {t:'Set the length',d:'For Free Block and Deep Sprint, tap a preset, or choose Custom… to type your own hours and minutes. Edit lets you remove presets you no longer use.',sel:'#free-duration-cfg',pre:run('selectMode','free')},
      {t:'Pomodoro, your way',d:'Classic repeats the same work and break each round. Custom Sequence lets you chain blocks, like 30 work · 10 break · 50 work.',sel:'#pomo-cfg',pre:run('selectMode','pomo'),pts:[['Save as preset','keep a favourite for next time'],['Edit → Restore defaults','bring the originals back']]},
      {t:'Preview & your stats',d:'See the total time before you start. Below it: sessions, completed blocks, total focus time and your streak.',sel:'#total-preview'},
      {t:'Start the block',d:'Hit START BLOCK. The screen switches to a calm, distraction-free timer.',sel:'#btn-start'},
      {t:'The timer ring',d:'The ring fills as you work. You always see elapsed, target and remaining time.',sel:['#ring-wrap','#btn-start'],pts:[['Space','pause / interrupt'],['Z','zen mode — only the timer']]},
      {t:'Pause or interrupt',d:'Life happens. Interrupt pauses the block safely so you can resume or end it.',sel:['#btn-interrupt','#btn-start']},
      {t:'Count distractions',d:'Tap + Distraction each time something pulls you away. The count is saved in your session log.',sel:['#distract-count','#btn-start']},
      {t:'Breaks & alerts',d:'Skip a break if you’re in flow. A “5 min left” heads-up appears near the end. Silence mutes sounds and voice cues.',sel:['#btn-skip-break','#btn-start']},
      {t:'Session log',d:'Every block is recorded (clock icon, top bar): time focused, done or partial, and distractions.',sel:'#log-btn'}
    ]},
    {key:'weekly',label:'WEEKLY',view:'weekly',steps:[
      {t:'Review or Plan',d:'REVIEW shows how last week went. PLAN is where you set up the coming week. Switch any time.',sel:'#wk-mode-toggle',pre:run('setWeeklyMode','review')},
      {t:'The week at a glance',d:'A one-line headline and your key numbers. Use ‹ › to browse earlier weeks.',sel:'#weekly-headline',pre:run('setWeeklyMode','review')},
      {t:'Breakdown by letter',d:'See how your week split across A, B, C, D and E. The more A and B, the better your week.',sel:'#wk-cat-bars',pre:run('setWeeklyMode','review')},
      {t:'Planned vs. actual',d:'Compare the time you budgeted with what you really logged. It appears once you set a budget in Plan.',sel:['#wk-planned-actual','#wk-cat-bars'],pre:run('setWeeklyMode','review')},
      {t:'Ask Wojak',d:'Send this week’s numbers to Wojak and ask what they mean.',sel:'.wk-ask-agent-btn',pre:run('setWeeklyMode','review')},
      {t:'Productivity trend',d:'A daily score from tasks and focus time. ▲ peak is your sweet spot, ▼ a low day, ◆ a change of direction. Green is rising, red is falling.',sel:'#wki-graph-wrap',pre:()=>{run('setWeeklyMode','review')();openDetails();},pts:[['7 · 14 · 30','pick how far back to look'],['Tap a dot','plain-language breakdown of that day']]},
      {t:'Energy vs. output',d:'See if your high-energy days really are your best.',sel:'#wki-energy-card',pre:()=>{run('setWeeklyMode','review')();openDetails();}},
      {t:'BLOC Insight Report',d:'Create a written Insight Report from your own data — or an optional AI one — only when you want it.',sel:'.wki-report-box',pre:()=>{run('setWeeklyMode','review')();openDetails();}},
      {t:'Avoidance & reflections',d:'BLOC flags tasks you keep moving around, and shows your recent End-of-Day reflections.',sel:['#wk-avoidance','#wk-reflections-section','#wk-details'],pre:run('setWeeklyMode','review')},
      {t:'Plan: set the rules',d:'Choose how tasks are routed, whether epics or deadlines lead, and how many hours you can really give this week.',sel:'#wk-nuance-section',pre:run('setWeeklyMode','plan')},
      {t:'Long-term epics',d:'Big goals live here with an optional target date, bridged to the week. Switch on in Settings → Goals.',sel:['#wk-goals-section','#wk-nuance-section'],pre:run('setWeeklyMode','plan')},
      {t:'AI planning audit',d:'On-device math shows your velocity, bottlenecks and capacity, plus suggested routing. Rebalance, log it, or add an optional AI note (only numbers are sent).',sel:'#wk-audit-section',pre:run('setWeeklyMode','plan')},
      {t:'Outcomes & time budget',d:'Name 3–5 outcomes for the week and budget time for them. The Review side compares plan to reality.',sel:'#wk-outcomes-section',pre:run('setWeeklyMode','plan')},
      {t:'Delegate board',d:'Track what you handed off and who it’s waiting on. BLOC can’t message anyone — it just keeps you honest.',sel:['#wk-delegate-section','#wk-outcomes-section'],pre:run('setWeeklyMode','plan')}
    ]},
    {key:'habits',label:'HABITS',view:'habits',steps:[
      {t:'Add a habit',d:'Tap New habit. Pick what you already do (the anchor), the tiny action, then a 2-second celebration. No anchor yet? Save it as a draft.',sel:'#hb-add-row'},
      {t:'Starter ideas',d:'Tap an idea to add it. Each comes ready with a trigger and a tiny version.',sel:'#hb-starters-mount'},
      {t:'Pin a trigger',d:'Pick a cue type — After I, Before I, When, or If-then — and finish the sentence. “After I brush my teeth, I stretch.”',sel:'#hb-list'},
      {t:'Shrink it',d:'Name a tiny version. On a bad day the tiny one still counts and keeps your chain alive.',sel:'#hb-list'},
      {t:'Obstacle, identity & reward',d:'Decide your plan for obstacles now (“if I’m wiped out, then…”), note who you’re becoming, and pick a reward.',sel:'#hb-list'},
      {t:'Check it off',d:'Tap the circle when it’s done. Tap the ✦ if you only did the tiny version — it counts.',sel:'#hb-list'},
      {t:'Rest days',d:'Mark a rest day and your streak is bridged without counting against you.',sel:'#hb-list'},
      {t:'Streaks that forgive',d:'Your headline is how many of the last 14 days you showed up. Finish 7 days to earn a shield (hold up to 2); a shield covers a missed day automatically. Use Skip for rest, sick or travel days.',sel:'#hb-list'},
      {t:'Summary & insights',d:'See today’s count, your best streak and weekly rate, plus gentle patterns BLOC notices about your habits.',sel:['#hb-summary','#hb-list']},
      {t:'Keep the list small',d:'A short cap keeps habits doable. The “How to make these stick” tips link to the Library for a deeper read.',sel:'.hb-howto'}
    ]},
    {key:'calendar',label:'CALENDAR',view:'calendar',steps:[
      {t:'Day, Week or Month',d:'Switch the view with the toggle, jump with ‹ ›, and tap TODAY to snap back.',sel:'.cal-mode-tog'},
      {t:'Time-block by dragging',d:'Drag a task from “Unscheduled” onto the grid. Drag a block to move it, pull its bottom edge to resize it, tick it to complete.',sel:'#cal-sidebar-list'},
      {t:'Add an event',d:'Tap + EVENT, or click an empty slot on the grid. Choose Work or Life, then set the date and time.',sel:'.cal-add-btn'},
      {t:'Repeat',d:'Repeat daily, on weekdays, weekly, monthly or yearly — or build a custom rhythm that ends never, on a date, or after a number of times.',sel:'.cal-add-btn'},
      {t:'Reminders, links & colour',d:'Get a reminder, link the event to one of your tasks, pick a colour and add notes.',sel:'.cal-add-btn'},
      {t:'Life & chores',d:'Home life counts too. Drag a chore chip onto the calendar — or just click it — to block time for cooking, tidying and routines.',sel:'#cal-life-chips'},
      {t:'Show just your work',d:'The ◌ LIFE button hides chores and routines so you can see only your work blocks. Tap it again to bring them back.',sel:'#cal-life-btn'},
      {t:'Actual time',d:'The thin coloured strip at the left of each day shows real logged focus time. Compare it with your planned blocks.',sel:'.cal-legend-actual'},
      {t:'Your best hours',d:'After enough focus sessions, BLOC points out the hours you focus best — so you can book your hardest work there.',sel:['#prime-time-badge','.cal-topbar']},
      {t:'Reminders button',d:'Turn on browser reminders. They only fire while BLOC is open in a tab — there is no background service.',sel:'#cal-notif-btn'},
      {t:'Make it yours',d:'Open Canvas to choose a background picture and a colour palette for your task blocks.',sel:'#cal-canvas-btn'},
      {t:'Backup & restore',d:'Backup and Restore now live in More → Settings (and on your Profile page), so they stay out of your daily view.',sel:['#ux-more-btn','.ux-tabmore']}
    ]},
    {key:'notes',label:'NOTES',view:'notes',steps:[
      {t:'Folders',d:'Tap + to make a folder, then pick one to see only its notes. “All Notes” shows everything.',sel:'#np-folder-list'},
      {t:'Your notes list',d:'Tap + for a new note. Click any note to open it — the newest edits float to the top.',sel:'#np-note-list'},
      {t:'Just write',d:'Give it a title and start typing. It saves automatically — there is no Save button.',sel:'#np-content'},
      {t:'Formatting toolbar',d:'Bold, italic, underline, bullet and numbered lists, links (🔗), and Tx to clear formatting.',sel:'#np-toolbar'},
      {t:'Linked to a task',d:'On the Tasks tab, tap “📝 Add note…” under Details and a note opens here, linked to that task. The badge shows which one.',sel:'#np-link-badge'},
      {t:'Delete a note',d:'DELETE removes the open note (it asks first). Back up all your notes from Profile → Your data.',sel:'.np-note-del-btn'}
    ]},
    {key:'library',label:'LIBRARY',view:'library',steps:[
      {t:'Four ways in',d:'TOPICS for problem-based reads, BOOKS for your own shelf, QUOTES for a daily spark, and ASK WOJAK to talk it through.',sel:'#lib-mode-toggle',pre:run('setLibraryMode','topics')},
      {t:'Search by struggle',d:'Type what’s going on — “exams”, “tired”, “too many emails” — and matching reads appear instantly.',sel:'#lib-search-input',pre:run('setLibraryMode','topics')},
      {t:'Narrow it down',d:'Use the two menus beside the search box: “For” sets who you are (student, professional, manager…) and “Topic” picks a theme like focus, time or habits.',sel:'.lib-search-row',pre:run('setLibraryMode','topics')},
      {t:'For you & topic cards',d:'“For you” picks something based on how you’ve been using BLOC. Tap any topic card to open a short, practical read.',sel:'#lib-topics-grid',pre:run('setLibraryMode','topics')},
      {t:'Books: add your own',d:'Copy a prompt, paste it into your own AI chat along with a book, then paste the JSON back. It’s stored only in your browser.',sel:'.lib-addbook-btn',pre:run('setLibraryMode','books')},
      {t:'Quotes',d:'A spotlight quote you can step through with ‹ ›, or press ▶ PLAY to auto-advance at reading speed. Filter by theme below.',sel:'#lib-spotlight',pre:run('setLibraryMode','quotes'),pts:[['‹  ›','previous / next quote'],['▶ PLAY','auto-advance']]},
      {t:'Ask Wojak',d:'Describe your struggle in your own words. It searches the whole Library, then answers directly and links to the best reads. Needs a free Gemini key (⚙).',sel:'#lib-chat-input',pre:run('setLibraryMode','librarian')},
      {t:'Chats, chips & keys',d:'Pick up an old conversation from History, start with a quick suggestion chip, and manage your Gemini keys (primary + backup) with ⚙.',sel:'#lib-chat-bar',pre:run('setLibraryMode','librarian')}
    ]},
    {key:'start',label:'QUICK START',view:'tasks',steps:[
      {t:'Start with one thing',d:'What must you get done today? Type it here, like “Call the dentist”, and press Enter.',sel:'#new-input'},
      {t:'How much does it matter?',d:'A means “must happen today”. You only get 3 A’s a day, so pick wisely. B to E are for everything less urgent.',sel:'#new-type'},
      {t:'Your A box',d:'Your A tasks show up here. Done? Tap the little circle to tick it off. That is the whole system.',sel:'#sec-A'},
      {t:'Calm view or everything',d:'This Calm / Full switch changes how much you see. It is not a timer. Choose Full any time to see every tool.',sel:'#focus-mode-btn'},
      {t:'More tools, when you’re ready',d:'A focus timer, weekly review, habits, calendar, notes and a library of short reads live up here. No rush, try them one by one.',sel:'#hdr-nav'},
      {t:'Need help later?',d:'Open ⋯ More → Take the tour for a short tour of whichever tab you are on, or press G. On a phone, use the Quick tour link under the add bar.',sel:['#quick-tour-link','#ux-more-btn']}
    ]},
    {key:'global',label:'EVERYWHERE',view:null,steps:[
      {t:'Switch tabs — and reorder them',d:'Tap a tab to jump there. You can also drag the tabs in the top bar into the order you like; BLOC remembers it.',sel:'#hdr-nav'},
      {t:'Streak & trophy',d:'Your daily streak and trophy level live in the top-left. Finish your days to keep them growing.',sel:'#streak-badge'},
      {t:'Rulebook',d:'The A–E method in plain words, with a short quiz to help you choose the right letter. Press R any time.',sel:'#rulebook-btn',pts:[['R','open / close']]},
      {t:'Session log',d:'Every focus block you’ve run, with time, status and distractions. The number is how many sessions you have.',sel:'#log-btn'},
      {t:'Calm view (Focus Mode)',d:'Hide everything except what you need to act on. A 🌱 button appears for a quick habits check-in without leaving.',sel:'#focus-mode-btn'},
      {t:'Wojak',d:'The Wojak face in the corner opens a chat that searches the Library and answers you. Drag it wherever you like.',sel:'#bai-fab'},
      {t:'“I’m studying” button',d:'Off by default. Turn it on in Settings › Floating Buttons and one tap starts a timer immediately — no task, mode or length to pick first. Drag it out of the way if you need to.',sel:'#js-fab'},
      {t:'Keyboard shortcuts',d:'Fast keys for almost everything. Letters work anywhere except while you’re typing in a box.',sel:'#kbd-hint-trigger'},
      {t:'Settings',d:'Your name, start-up tab, greeting and voice, time zone, theme, planning and habits switches, floating buttons, and settings backup.',sel:'#settings-gear-btn'}
    ]}
  ]};
})();

const GUIDE_DEMO=(function(){
  const NEEDS={tasks:['tasks','weekly','calendar','notes'],habits:['habits']};
  const drop=(arr,fn)=>{for(let i=arr.length-1;i>=0;i--)if(fn(arr[i]))arr.splice(i,1);};
  const base=(id,type,text,o)=>Object.assign({id,type,text,done:false,created:Date.now(),estimate:0,recurring:false,subtasks:[],note:'',dateISO:isoDate(bocNow()),progressState:'not_started',timeSpentMin:0,dependsOn:null,demo:true},o);
  const needs=(key,store)=>NEEDS[store].includes(key);
  let seeded=false;

  function refresh(){
    const f=['renderTasks','renderHabits','renderNotesView','renderWeeklyReview','calRender'];
    const v=document.querySelector('.view.active');
    f.forEach(n=>{if(typeof window[n]==='function'&&(n==='renderTasks'||n.toLowerCase().includes((v?v.id:'').replace('view-',''))))try{window[n]();}catch(e){}});
  }
  function seed(key){
    if(seeded)return;
    if(needs(key,'tasks')&&!tasks.some(t=>!t.demo&&!t.done&&t.dateISO===isoDate(bocNow()))){
      tasks.push(
        base('demo1','A','Finish Q3 report',{estimate:90}),
        base('demo2','A','Call key client'),
        base('demo3','B','Review PRs',{estimate:30,recurring:true}),
        base('demo4','D','Hand the slides to Sam'),
        base('demo5','E','Scroll news feeds'));
      seeded=true;
    }
    if(needs(key,'habits')&&!habits.length){
      habits.push(
        {id:'h_demo1',title:'Drink a glass of water',frequency:'daily',startDateISO:isoDate(bocNow()),dayState:{},bestStreak:0,cue:'wake up',tiny:'Take one sip',slot:'morning',demo:true},
        {id:'h_demo2',title:'Stretch',frequency:'daily',startDateISO:isoDate(bocNow()),dayState:{},bestStreak:0,cue:'brush my teeth',tiny:'Touch my toes once',demo:true});
      seeded=true;
    }
    if(key==='notes'&&!npNotes.some(n=>!n.demo)&&tasks.some(t=>t.id==='demo1')){
      npNotes.unshift({id:'ndemo',folderId:'sys-tasks',title:'Finish Q3 report',content:'<div>Draft outline for the board…</div>',linkType:'task',linkId:'demo1',orphaned:false,orphanTag:null,created:Date.now(),updated:Date.now()});
      npActiveFolder='__all__';
      seeded=true;
    }
    if(!seeded)return;
    refresh();
    if(key==='notes'&&npNotes.some(n=>n.id==='ndemo'))npOpenNote('ndemo');
  }
  function clear(){
    if(!seeded)return;
    seeded=false;
    purge();
    refresh();
    if(npActiveNote==='ndemo'||(npActiveNote&&!npNotes.some(n=>n.id===npActiveNote))){npActiveNote=null;if(typeof npShowNoNote==='function')npShowNoNote();}
  }
  function purge(){
    drop(tasks,t=>t.demo);saveT();
    drop(habits,h=>h.demo);saveHabits();
    drop(npNotes,n=>n.demo);npSave();
  }
  window.addEventListener('load',()=>{
    if(tasks.some(t=>t.demo)||habits.some(h=>h.demo)||npNotes.some(n=>n.demo)){purge();refresh();}
  });
  return {seed,clear};
})();

(function(){
'use strict';
if(typeof GUIDE_CONTENT==='undefined')return;
const SEEN_KEY='bloc_guide_seen_v1';
const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const mobile=()=>window.matchMedia&&matchMedia('(max-width:640px)').matches;
const T={open:false,tour:null,i:0,hl:null,card:null,raf:0,run:0,lastFocus:null,el:null};
const $id=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const tourByKey=k=>GUIDE_CONTENT.tours.find(t=>t.key===k);
const tabHidden=k=>k!=='tasks'&&k!=='global'&&typeof focusModeOn!=='undefined'&&focusModeOn&&Array.isArray(focusModeTabs)&&!focusModeTabs.includes(k);
const tours=()=>GUIDE_CONTENT.tours.filter(t=>t.key!=='start'&&!(t.key==='habits'&&typeof habitsEnabled==='function'&&!habitsEnabled())&&!tabHidden(t.key));

function tabKey(){
  const v=document.querySelector('.view.active');
  const id=v?v.id.replace(/^view-/,''):'tasks';
  return ({'focus-setup':'focus',timer:'focus',paused:'focus',done:'focus'})[id]||id;
}
const seen=()=>{try{return JSON.parse(localStorage.getItem(SEEN_KEY)||'{}')||{};}catch(e){return {};}};
function markSeen(k){
  const s=seen();if(s[k])return;
  s[k]=1;try{localStorage.setItem(SEEN_KEY,JSON.stringify(s));}catch(e){}
  refreshBtn();
}
function refreshBtn(){
  const b=$id('guide-btn');if(!b)return;
  const k=tabKey();
  b.classList.toggle('fresh',!!tourByKey(k)&&!seen()[k]);
}

function visibleEl(sel){
  for(const s of [].concat(sel)){
    const e=document.querySelector(s);
    if(e&&e.getClientRects().length&&!e.closest('.sec.closed'))return e;
  }
  return null;
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));

const unfolded=[];
function guideOpenSec(type){
  const sec=$id('sec-'+type);
  if(!sec||!sec.classList.contains('closed')||typeof toggleSec!=='function')return;
  const secBody=sec.querySelector('.sec-body');
  if(secBody)secBody.style.transition='none';
  toggleSec(type);
  unfolded.push(type);
  if(secBody){void secBody.offsetHeight;requestAnimationFrame(()=>{secBody.style.transition='';});}
}
function refold(){
  while(unfolded.length){
    const t=unfolded.pop();
    if(typeof collapsed!=='undefined'&&!collapsed[t]&&typeof toggleSec==='function')toggleSec(t);
  }
}
function clearReveal(){document.querySelectorAll('.tour-reveal').forEach(x=>x.classList.remove('tour-reveal'));}

async function resolve(from,dir){
  const run=++T.run,steps=T.tour.steps;
  for(let i=from;i>=0&&i<steps.length;i+=dir){
    const st=steps[i];
    if(st.pre){try{st.pre();}catch(e){}await wait(60);}
    if(run!==T.run)return null;
    const el=visibleEl(st.sel);
    if(el)return {i,el};
  }
  return null;
}

function build(){
  T.hl=document.createElement('div');T.hl.className='tour-hl snap';T.hl.setAttribute('aria-hidden','true');
  T.card=document.createElement('div');
  T.card.className='tour-card';T.card.id='tour-card';T.card.tabIndex=-1;
  T.card.setAttribute('role','dialog');T.card.setAttribute('aria-label','Guided tour');
  T.card.addEventListener('click',e=>{
    const a=e.target.closest('[data-a]');if(!a)return;
    ({next:()=>go(1),nexttab:()=>finish(true),back:()=>go(-1),skip:()=>finish(false)})[a.dataset.a]();
  });
  document.body.append(T.hl,T.card);
}

function place(){
  T.raf=0;
  if(!T.open||!T.el||!T.card)return;
  if(!document.contains(T.el)||!T.el.getClientRects().length){T.hl.style.opacity=0;return;}
  const b=T.el.getBoundingClientRect(),p=6;
  const top=Math.max(b.top,p),bottom=Math.min(b.bottom,innerHeight-p);
  const r={left:b.left,right:b.right,top,bottom,width:b.width,height:Math.max(bottom-top,0)};
  Object.assign(T.hl.style,{opacity:1,left:r.left-p+'px',top:r.top-p+'px',width:r.width+2*p+'px',height:r.height+2*p+'px'});
  if(mobile()){T.card.classList.toggle('top',(r.top+r.bottom)/2>innerHeight/2);return;}
  const vw=innerWidth,vh=innerHeight,cw=T.card.offsetWidth,ch=T.card.offsetHeight,g=14,m=8;
  const spots={
    bottom:[r.left,r.bottom+p+g,vh-(r.bottom+p+g)>=ch],
    top:[r.left,r.top-p-g-ch,r.top-p-g>=ch],
    right:[r.right+p+g,r.top,vw-(r.right+p+g)>=cw],
    left:[r.left-p-g-cw,r.top,r.left-p-g>=cw]
  };
  const pick=['bottom','top','right','left'].find(k=>spots[k][2]);
  const clamp=(v,max)=>Math.max(m,Math.min(v,max-m));
  const [x,y]=pick?spots[pick]:[vw-cw-m,vh-ch-m];
  T.card.style.left=clamp(x,vw-cw)+'px';
  T.card.style.top=clamp(y,vh-ch)+'px';
}
const schedule=()=>{if(!T.raf)T.raf=requestAnimationFrame(place);};

function render(i,el){
  const tour=T.tour,st=tour.steps[i],list=tours();
  const nxt=tour.key==='start'?null:list[list.findIndex(t=>t.key===tour.key)+1];
  const av=T.avail||(T.avail=tour.steps.map(()=>true));
  av[i]=true;
  const n=av.filter(Boolean).length,pos=av.slice(0,i+1).filter(Boolean).length;
  const last=!av.some((ok,j)=>ok&&j>i);
  T.i=i;T.el=el;
  clearReveal();el.classList.add('tour-reveal');
  T.card.innerHTML=`<div class="tour-top"><span class="tour-lbl">${esc(tour.label)}</span><span class="tour-count">${pos} / ${n}</span></div>`
    +`<div class="tour-bar"><i style="width:${pos/n*100}%"></i></div>`
    +`<div class="tour-t">${esc(st.t)}</div><div class="tour-d">${esc(st.d)}</div>`
    +(st.pts?`<div class="tour-pts">${st.pts.map(([k,v])=>`<span><kbd>${esc(k)}</kbd>${esc(v)}</span>`).join('')}</div>`:'')
    +`<div class="tour-btns"><button data-a="skip" class="tour-skip">Skip</button><span></span>`
    +`<button data-a="back"${i===0?' disabled':''}>Back</button>`
    +(last&&nxt?`<button data-a="nexttab" class="tour-next-tab">Tour ${esc(nxt.label)} →</button>`:'')
    +`<button data-a="next" class="pri">${last?(tour.key==='start'?'Let’s go':'Done'):'Next'}</button></div>`;
  const tall=el.getBoundingClientRect().height>innerHeight*.6;
  if(T.hl.dataset.placed)T.hl.classList.remove('snap');
  try{el.scrollIntoView({block:tall?'start':'center',behavior:RM?'auto':'smooth'});}catch(e){}
  place();
  T.hl.dataset.placed=1;
  setTimeout(()=>{schedule();if(T.hl)T.hl.classList.add('snap');},RM?0:420);
  const nb=T.card.querySelector('[data-a=next]');
  if(nb)nb.focus({preventScroll:true});
}

async function go(d){
  const found=await resolve(T.i+d,d);
  if(!T.open)return;
  if(found)render(found.i,found.el);
  else if(d>0)finish(false);
}

function finish(advance){
  const tour=T.tour,list=tours(),nxt=tour.key==='start'?null:list[list.findIndex(t=>t.key===tour.key)+1];
  markSeen(tour.key);
  closeGuide();
  if(advance&&nxt){
    if(nxt.view)switchTo(nxt);
    setTimeout(()=>openGuide(nxt.key),260);
  }
}
function switchTo(t){
  if(t.key==='focus'){if(tabKey()!=='focus'&&typeof goFocusNav==='function')goFocusNav();return;}
  if(tabKey()!==t.key&&typeof showView==='function')showView(t.view);
}

async function openGuide(k){
  const list=tours();
  let key=(typeof k==='string'&&tourByKey(k))?k:tabKey();
  if(key!=='start'&&!list.some(t=>t.key===key))key=list[0].key;
  if(T.open)closeGuide(true);
  T.lastFocus=document.activeElement;
  T.tour=tourByKey(key);T.open=true;
  GUIDE_DEMO.seed(key);
  const ob=$id('habits-onboard-overlay');if(ob)ob.classList.remove('open');
  build();
  T.avail=T.tour.steps.map(st=>!!st.pre||!!visibleEl(st.sel));
  const found=await resolve(0,1);
  if(!T.open)return;
  if(found)render(found.i,found.el);else finish(false);
}
function closeGuide(keepFocus){
  if(!T.open)return;
  T.open=false;T.run++;
  cancelAnimationFrame(T.raf);T.raf=0;
  clearReveal();refold();
  if(T.hl)T.hl.remove();
  if(T.card)T.card.remove();
  T.hl=T.card=T.el=null;
  GUIDE_DEMO.clear();
  refreshBtn();
  const f=T.lastFocus;T.lastFocus=null;
  if(!keepFocus&&f&&f.focus&&document.contains(f)){try{f.focus({preventScroll:true});}catch(e){}}
}

function guideKey(e){
  if(e.ctrlKey||e.metaKey||e.altKey)return false;
  const k=e.key,onBtn=T.card&&T.card.contains(document.activeElement)&&document.activeElement.tagName==='BUTTON';
  if(k==='Escape'||k==='g'||k==='G'){e.preventDefault();closeGuide();return true;}
  if(k==='ArrowRight'||(k==='Enter'&&!onBtn)){e.preventDefault();go(1);return true;}
  if(k==='ArrowLeft'){e.preventDefault();go(-1);return true;}
  if(k==='Tab'&&T.card){
    const f=[...T.card.querySelectorAll('button:not(:disabled)')],a=document.activeElement;
    if(!f.length)return false;
    if(!T.card.contains(a)||(e.shiftKey&&a===f[0])||(!e.shiftKey&&a===f[f.length-1])){
      e.preventDefault();(e.shiftKey?f[f.length-1]:f[0]).focus();return true;
    }
  }
  return false;
}
function guideOnViewChange(){
  refreshBtn();
  if(T.open&&T.tour.key!=='global'&&tabKey()!==(T.tour.key==='start'?'tasks':T.tour.key))closeGuide(true);
}

function autoStart(n){
  if(T.open||Object.keys(seen()).length||(typeof tasks!=='undefined'&&tasks.length))return;
  const blocked=document.querySelector('[id$="overlay"].open,.overlay.open');
  if(blocked||tabKey()!=='tasks'){if((n||0)<120)setTimeout(()=>autoStart((n||0)+1),700);return;}
  openGuide('start');
}
/* No forced auto-start. See the offer card in account-legal.js. */
window.addEventListener('resize',schedule);
window.addEventListener('scroll',schedule,{passive:true,capture:true});
Object.assign(window,{guideOpenSec,openGuide,closeGuide,guideKey,guideOnViewChange,guideIsOpen:()=>T.open});
refreshBtn();
})();

const FOCUS_KEY='bloc_focus_mode_v1';
const FOCUS_TABS_KEY='bloc_focus_mode_tabs_v1';
const FOCUS_AGENT_KEY='bloc_focus_mode_agent_v1';
const FOCUS_HABITS_KEY='bloc_focus_mode_habits_btn_v1';
const FOCUS_ALL_TABS=['tasks','focus','weekly','habits','calendar','notes','library'];

// First visit ever (no saved focus preference and no saved tasks): start in the calm Focus Mode.
const IS_NEW_VISITOR=(function(){try{return localStorage.getItem(FOCUS_KEY)===null&&localStorage.getItem(TASK_KEY)===null;}catch(e){return false;}})();
// On a phone, anyone who has never touched the Focus Mode switch also gets it on (an explicit choice is always respected).
const IS_PHONE=(function(){try{return !!(window.matchMedia&&window.matchMedia('(max-width:640px)').matches);}catch(e){return false;}})();
const AUTO_PHONE_FOCUS=IS_PHONE&&!IS_NEW_VISITOR&&(function(){try{return localStorage.getItem(FOCUS_KEY)===null;}catch(e){return false;}})();
let focusModeOn=(IS_NEW_VISITOR||AUTO_PHONE_FOCUS)?true:JSON.parse(localStorage.getItem(FOCUS_KEY)||'false')===true;
let focusModeAgentVisible=IS_NEW_VISITOR?true:JSON.parse(localStorage.getItem(FOCUS_AGENT_KEY)||'false')===true;
let focusModeHabitsBtn=JSON.parse(localStorage.getItem(FOCUS_HABITS_KEY)||'true')!==false;
let focusModeTabs=(function(){
  try{
    const saved=JSON.parse(localStorage.getItem(FOCUS_TABS_KEY)||'null');
    if(Array.isArray(saved)&&saved.length){
      const mapped=saved.map(k=>k==='rules'?'habits':k);
      return mapped.filter((k,i)=>FOCUS_ALL_TABS.includes(k)&&mapped.indexOf(k)===i);
    }
  }catch(e){}
  // New visitors on a phone get a short bottom bar (4 tabs); everything else stays reachable via "Show all tools".
  if((IS_NEW_VISITOR||AUTO_PHONE_FOCUS)&&IS_PHONE)return['tasks','focus','weekly','habits'];
  return FOCUS_ALL_TABS.slice();
})();
if(IS_NEW_VISITOR){
  // B-E start folded away so the first screen is just the A box; tapping a header opens it.
  collapsed={B:true,C:true,D:true,E:true};
  try{localStorage.setItem(COL_KEY,JSON.stringify(collapsed));}catch(e){}
  saveFocusPrefs();
}else if(AUTO_PHONE_FOCUS){
  saveFocusPrefs();
}

function saveFocusPrefs(){
  try{
    localStorage.setItem(FOCUS_KEY,JSON.stringify(focusModeOn));
    localStorage.setItem(FOCUS_AGENT_KEY,JSON.stringify(focusModeAgentVisible));
    localStorage.setItem(FOCUS_HABITS_KEY,JSON.stringify(focusModeHabitsBtn));
    localStorage.setItem(FOCUS_TABS_KEY,JSON.stringify(focusModeTabs));
  }catch(e){}
}

function openFocusHabits(){
  closeSidePanels('focus-habits-panel');
  if(typeof renderFocusHabits==='function')renderFocusHabits();
  const backdrop=$('focus-habits-backdrop'),panel=$('focus-habits-panel');
  if(backdrop)backdrop.classList.add('open');
  if(panel)panel.classList.add('open');
}
function closeFocusHabits(){
  const backdrop=$('focus-habits-backdrop'),panel=$('focus-habits-panel');
  if(backdrop)backdrop.classList.remove('open');
  if(panel)panel.classList.remove('open');
}

function applyFocusMode(){
  document.body.classList.toggle('focus-mode',focusModeOn);
  if(typeof fitNavTabs==='function')fitNavTabs();

  const btn=$('focus-mode-btn');
  if(btn){btn.classList.toggle('on',focusModeOn);const c=btn.querySelector('.ms-calm'),f=btn.querySelector('.ms-full');if(c)c.setAttribute('aria-pressed',focusModeOn?'true':'false');if(f)f.setAttribute('aria-pressed',focusModeOn?'false':'true');}

  const agentFab=$('bai-fab');
  const hideAgent=focusModeOn&&!focusModeAgentVisible;
  if(agentFab)agentFab.style.display=hideAgent?'none':'';
  if(hideAgent&&typeof baiToggle==='function'&&$('bai-panel')&&$('bai-panel').classList.contains('open')){
    baiToggle(false);
  }

  const habitsBtn=$('focus-habits-btn');
  const habitsOn=typeof habitsEnabled!=='function'||habitsEnabled();
  // One door to Habits, never two: the shortcut only appears when the Habits tab is NOT already in the nav.
  const habitsTabShown=focusModeTabs.includes('habits');
  const showHabitsBtn=focusModeOn&&focusModeHabitsBtn&&habitsOn&&!habitsTabShown;
  if(habitsBtn)habitsBtn.style.display=showHabitsBtn?'flex':'none';
  if(!showHabitsBtn)closeFocusHabits();

  document.querySelectorAll('#hdr-nav .nav-btn[data-navkey]').forEach(b=>{
    const key=b.dataset.navkey;
    const habitsOff=key==='habits'&&typeof habitsEnabled==='function'&&!habitsEnabled();
    b.style.display=(habitsOff||(focusModeOn&&!focusModeTabs.includes(key)))?'none':'';
  });
}

function toggleFocusMode(){
  focusModeOn=!focusModeOn;
  saveFocusPrefs();
  applyFocusMode();
  showToast(focusModeOn?'CALM VIEW':'FULL VIEW');
}

function setFocusAgentVisible(v){focusModeAgentVisible=!!v;saveFocusPrefs();applyFocusMode();}
function setFocusHabitsBtn(v){focusModeHabitsBtn=!!v;saveFocusPrefs();applyFocusMode();}
function setFocusTabEnabled(key,v){
  focusModeTabs=focusModeTabs.filter(k=>k!==key);
  if(v)focusModeTabs.push(key);
  saveFocusPrefs();
  applyFocusMode();
}
function fillFocusSettings(){
  const agentChk=$('set-focus-agent');if(agentChk)agentChk.checked=focusModeAgentVisible;
  const habitsChk=$('set-focus-habits-btn');if(habitsChk)habitsChk.checked=focusModeHabitsBtn;
  document.querySelectorAll('.set-focus-tab-chk').forEach(chk=>{
    chk.checked=focusModeTabs.includes(chk.dataset.navkey);
  });
}

applyFocusMode();

function fitNavTabs(){
  const nav=$('hdr-nav');if(!nav)return;
  document.body.classList.remove('nav-tight');
  if(window.innerWidth>640&&nav.scrollWidth>nav.clientWidth+1)document.body.classList.add('nav-tight');
}
window.addEventListener('resize',fitNavTabs);
window.addEventListener('load',fitNavTabs);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fitNavTabs);

function setViewMode(calm){if(!!calm!==!!focusModeOn)toggleFocusMode();}

let wkOffset=0;
function wkStepWeek(dir){wkOffset=Math.max(0,wkOffset+dir);renderWeeklyReview();}
function wkGoThisWeek(){wkOffset=0;renderWeeklyReview();}
function renderWeeklyReview(){
  const {cutoffISO,endISO,startDate:weekStart,endDate:weekEnd}=weekWindowISO(wkOffset);
  const isCurrentWeek=wkOffset===0;
  const recentSessions=sessions.filter(s=>s.dateISO&&s.dateISO>=cutoffISO&&s.dateISO<=endISO);
  const totalFocus=recentSessions.reduce((a,s)=>a+s.elapsed,0);
  const doneSessions=recentSessions.filter(s=>s.completed).length;
  const rate=recentSessions.length?Math.round(doneSessions/recentSessions.length*100):0;
  const totalDistractions=recentSessions.reduce((a,s)=>a+(s.distractions||0),0);
  const logEntries=taskCompletionLog.filter(l=>l.dateISO&&l.dateISO>=cutoffISO&&l.dateISO<=endISO);
  const fmt=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric'});

  $('weekly-range').innerHTML=
    `<button class="wk-week-nav" onclick="wkStepWeek(1)" title="Previous week" aria-label="Previous week">‹</button>`+
    `<span class="wk-week-label">${fmt(weekStart)} – ${fmt(weekEnd)}${isCurrentWeek?' · This week':''}</span>`+
    `<button class="wk-week-nav" onclick="wkStepWeek(-1)" title="Next week" aria-label="Next week" ${isCurrentWeek?'disabled':''}>›</button>`+
    (isCurrentWeek?'':`<button class="wk-week-jump" onclick="wkGoThisWeek()">THIS WEEK</button>`);

  const prev=baiWeeklyStats(wkOffset+1);
  const taskDelta=logEntries.length-prev.tasksCompleted;
  const deltaTxt=prev.tasksCompleted>0
    ?`, <b style="color:${taskDelta>=0?'var(--green)':'var(--pa)'}">${taskDelta>=0?'up':'down'} ${Math.abs(taskDelta)}</b> from last week`
    :'';
  $('weekly-headline').innerHTML=logEntries.length||recentSessions.length
    ?`You completed <b>${logEntries.length}</b> task${logEntries.length===1?'':'s'}${deltaTxt} — <b style="color:${rate>=70?'var(--green)':rate>=40?'var(--amber)':'var(--pa)'}">${rate}%</b> focus-session completion rate.`
    :`No activity logged for this week yet.`;

  const calDays={};for(let i=0;i<7;i++){const d=new Date(weekStart.getTime()+i*86400000);calDays[isoDate(d)]=[];}
  Object.keys(calDays).forEach(iso=>{calDays[iso]=calEventsForDate(iso).filter(e=>e.kind!=='life');});
  const weekEvents=Object.values(calDays).flat();
  const calMins=weekEvents.reduce((a,e)=>a+Math.max(e.end-e.start,0),0);
  const calDoneCount=weekEvents.filter(e=>e.done).length;
  const calByType={A:0,B:0,C:0,D:0,E:0};
  weekEvents.forEach(e=>{if(calByType[e.type||'B']!==undefined)calByType[e.type||'B']++;});

  $('weekly-grid').innerHTML=`
    <div class="wk-stat"><div class="wk-stat-lbl">Total Focus Time</div><div class="wk-stat-val">${fmtDur(totalFocus)}</div><div class="wk-stat-sub">${recentSessions.length} timed session${recentSessions.length===1?'':'s'} · timer-tracked only</div></div>
    <div class="wk-stat"><div class="wk-stat-lbl">Completion Rate</div><div class="wk-stat-val" style="color:${rate>=70?'var(--green)':rate>=40?'var(--amber)':'var(--pa)'}">${rate}%</div><div class="wk-stat-sub">${doneSessions} / ${recentSessions.length} focus sessions · timer-tracked only</div></div>
    <div class="wk-stat"><div class="wk-stat-lbl">Calendar Load</div><div class="wk-stat-val" style="color:var(--now)">${weekEvents.length}</div><div class="wk-stat-sub">${calDoneCount}/${weekEvents.length} completed · ${calMins?fmtDur(calMins*60):'0m'} scheduled</div></div>
    <div class="wk-stat"><div class="wk-stat-lbl">${isCurrentWeek?'Current Streak':'Streak (as of today)'}</div><div class="wk-stat-val" style="color:var(--amber)">${streakData.current}🔥</div><div class="wk-stat-sub">best: ${streakData.best} days</div></div>
    <div class="wk-stat"><div class="wk-stat-lbl">Distractions</div><div class="wk-stat-val" style="color:${totalDistractions===0?'var(--green)':totalDistractions<10?'var(--amber)':'var(--red)'}">${totalDistractions}</div><div class="wk-stat-sub">${recentSessions.length?'this week · timer-tracked only':'no timed sessions logged'}</div></div>`;

  const catColors={A:'var(--pa)',B:'var(--pb)',C:'var(--pc)',D:'var(--pd)',E:'var(--pe)'};
  $('wk-cat-bars').innerHTML=SECTS.map(s=>{
    const all=tasks.filter(t=>t.type===s.type),done=all.filter(t=>t.done).length,pct=all.length?Math.round(done/all.length*100):0;
    const n=calByType[s.type];
    return`<div class="wk-cat-row"><div class="wk-cat-lbl" style="color:${catColors[s.type]}">${s.type}</div><div class="wk-cat-track"><div class="wk-cat-fill" style="width:${pct}%;background:${catColors[s.type]}"></div></div><div class="wk-cat-info">${done}/${all.length} tasks${n?` · ${n} evt${n===1?'':'s'}`:''}</div></div>`;
  }).join('');
  if(typeof renderPlannedActualChart==='function')renderPlannedActualChart(wkOffset);

  const dayMap={},daySessCount={},daySessDone={};
  for(let i=0;i<7;i++){const d=new Date(weekStart.getTime()+i*86400000);const iso=isoDate(d);dayMap[iso]=0;daySessCount[iso]=0;daySessDone[iso]=0;}
  recentSessions.forEach(s=>{if(s.dateISO&&dayMap.hasOwnProperty(s.dateISO)){dayMap[s.dateISO]+=s.elapsed;daySessCount[s.dateISO]++;if(s.completed)daySessDone[s.dateISO]++;}});
  const maxDay=Math.max(...Object.values(dayMap),1);
  $('wk-focus-bars').innerHTML=`<div style="font-size:10px;letter-spacing:1.5px;color:var(--muted2);margin-bottom:2px">FOCUS TIME <span style="color:var(--amber)">■</span></div>`+Object.entries(dayMap).map(([d,e])=>{
    const pct=Math.round(e/maxDay*100),label=new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
    const cnt=daySessCount[d],dn=daySessDone[d];
    const summary=e>0?`${fmtDur(e)}${cnt?` · ${dn}/${cnt} done`:''}`:'—';
    return`<div style="display:flex;align-items:center;gap:12px;"><div style="font-size:10px;letter-spacing:1px;color:var(--muted2);min-width:100px">${label}</div><div style="flex:1;height:6px;background:var(--surf2);border:1px solid var(--bdr2);overflow:hidden;"><div style="height:100%;width:${pct}%;background:var(--amber);transition:width .7s var(--ease-out)"></div></div><div style="font-size:10px;color:var(--muted2);min-width:78px;text-align:right">${summary}</div></div>`;
  }).join('');
  const calMaxMins=Math.max(...Object.values(calDays).map(v=>v.reduce((a,e)=>a+Math.max(e.end-e.start,0),0)),1);
  $('wk-cal-bars').innerHTML=`<div style="font-size:10px;letter-spacing:1.5px;color:var(--muted2);margin:10px 0 2px">CALENDAR LOAD <span style="color:var(--now)">■</span> done <span style="color:var(--now);opacity:.35">■</span> scheduled</div>`+Object.entries(calDays).map(([d,evs])=>{
    const mins=evs.reduce((a,e)=>a+Math.max(e.end-e.start,0),0),pct=Math.round(mins/calMaxMins*100);
    const done=evs.filter(e=>e.done).length,doneFrac=evs.length?Math.round(done/evs.length*100):0;
    const label=new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
    return`<div style="display:flex;align-items:center;gap:12px;"><div style="font-size:10px;letter-spacing:1px;color:var(--muted2);min-width:100px">${label}</div><div style="flex:1;height:6px;background:var(--surf2);border:1px solid var(--bdr2);overflow:hidden;"><div style="height:100%;width:${pct}%;display:flex;"><div style="height:100%;width:${doneFrac}%;background:var(--now);"></div><div style="height:100%;width:${100-doneFrac}%;background:var(--now);opacity:.35;"></div></div></div><div style="font-size:10px;color:var(--muted2);min-width:78px;text-align:right">${evs.length?`${done}/${evs.length} done`:'—'}</div></div>`;
  }).join('');
  const avoidance=tasks.filter(t=>t.type==='A'&&!t.done&&t.created&&(Date.now()-t.created)>3*86400000);
  const avoidDiv=$('wk-avoidance');
  if(avoidance.length>0){avoidDiv.style.display='block';$('wk-avoidance-list').innerHTML=avoidance.map(t=>`<div class="wk-avoidance-item">→ ${escHTML(t.text)}<span style="color:var(--muted);font-size:10px;margin-left:8px">${Math.floor((Date.now()-t.created)/86400000)}d old</span></div>`).join('');}
  else{avoidDiv.style.display='none';}
  const reflections=JSON.parse(localStorage.getItem(REFLECT_KEY)||'[]').filter(r=>r.dateISO&&r.dateISO>=cutoffISO&&r.dateISO<=endISO);
  const reflSec=$('wk-reflections-section'),reflList=$('wk-reflections-list');
  if(reflections.length>0){
    reflSec.style.display='block';
    reflList.innerHTML=reflections.map(r=>`<div style="background:var(--surf);border:1px solid var(--bdr2);padding:14px;margin-bottom:8px;transition:border-color var(--dur-med);" onmouseover="this.style.borderColor='var(--amber)'" onmouseout="this.style.borderColor='var(--bdr2)'">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:10px;letter-spacing:2px;color:var(--muted2);text-transform:uppercase;">${r.date}</span>
        <span style="font-size:10px;letter-spacing:1px;color:var(--amber);">${'★'.repeat(r.rating||0)}${'☆'.repeat(5-(r.rating||0))}</span>
      </div>
      ${r.wins?`<div style="font-size:11px;color:var(--green);margin-bottom:6px;"><span style="font-size:10px;letter-spacing:2px;color:var(--muted);display:block;margin-bottom:2px;">WINS</span>${escHTML(r.wins)}</div>`:''}
      ${r.blocks?`<div style="font-size:11px;color:var(--muted2);"><span style="font-size:10px;letter-spacing:2px;color:var(--muted);display:block;margin-bottom:2px;">BLOCKS</span>${escHTML(r.blocks)}</div>`:''}
    </div>`).join('');
  } else {reflSec.style.display='none';}
  wkiRenderAll();
  const wkModeToggle=$('wk-mode-toggle');
  const planningDisabled=typeof appSettings!=='undefined'&&appSettings.weeklyPlanningEnabled===false;
  if(wkModeToggle)wkModeToggle.style.display=planningDisabled?'none':'flex';
  if(planningDisabled&&typeof wkMode!=='undefined'&&wkMode==='plan')setWeeklyMode('review');
  else if(typeof wkMode!=='undefined'&&wkMode==='plan')renderWeeklyPlan(wkOffset);
}

function weekContext(){
  const rangeLbl=$('weekly-range')?$('weekly-range').innerText.replace(/\s+/g,' ').trim():'this week';
  const headline=$('weekly-headline')?$('weekly-headline').innerText.trim():'';
  const gridStats=$('weekly-grid')?Array.from($('weekly-grid').querySelectorAll('.wk-stat')).map(el=>el.innerText.replace(/\s+/g,' ').trim()).join(' | '):'';
  const catBars=$('wk-cat-bars')?Array.from($('wk-cat-bars').querySelectorAll('.wk-cat-row')).map(el=>el.innerText.replace(/\s+/g,' ').trim()).join(' | '):'';
  const avoidanceVisible=$('wk-avoidance')&&$('wk-avoidance').style.display!=='none';
  const avoidanceTxt=avoidanceVisible&&$('wk-avoidance-list')?$('wk-avoidance-list').innerText.replace(/\s+/g,' ').trim():'';
  const reflVisible=$('wk-reflections-section')&&$('wk-reflections-section').style.display!=='none';
  const reflTxt=reflVisible&&$('wk-reflections-list')?$('wk-reflections-list').innerText.replace(/\s+/g,' ').trim():'';
  return [
    `Week being viewed on screen: ${rangeLbl}.`,
    `Headline: ${headline}`,
    gridStats?`Stat grid: ${gridStats}`:null,
    catBars?`Category breakdown (A–E, tasks + calendar): ${catBars}`:null,
    avoidanceTxt?`Avoidance pattern flagged this week: ${avoidanceTxt}`:null,
    reflTxt?`Reflections logged this week: ${reflTxt}`:null
  ].filter(Boolean).join('\n');
}
async function askAgentAboutWeek(){
  if(typeof agentButtonOn==='function'&&!agentButtonOn()){showToast('WOJAK IS OFF — TURN IT ON IN SETTINGS');return;}
  const rangeLbl=$('weekly-range')?$('weekly-range').innerText.replace(/\s+/g,' ').trim():'this week';
  const weekData=weekContext();

  if(typeof bcNewChat==='function')bcNewChat();
  const chatMsgs=baiChat,chatRef=(typeof bcActive==='function')?bcActive():null;
  baiOpen=true;$('bai-panel').classList.add('open');
  baiUpdateHeadSub();baiRenderChips();
  setTimeout(()=>{const inp=$('bai-input');if(inp)inp.focus();},80);

  const seedQuestion=`How did this week go? (${rangeLbl})`;
  baiChat.push({role:'user',text:escHTML(seedQuestion),ts:Date.now()});
  baiSaveChat();baiRenderMessages();

  if(!baiGetGeminiKey())baiSetupGemini();
  const geminiKey=baiGetGeminiKey();

  if(!geminiKey){
    baiChat.push({role:'agent',text:`Here's what's on screen for ${escHTML(rangeLbl)}:<br>${escHTML($('weekly-headline')?$('weekly-headline').innerText.trim():'')}<br><span style="opacity:.65">Add a Gemini key (⚙ in this panel) for a fuller written take on the week.</span>`,ts:Date.now()});
    baiSaveChat();baiRenderMessages();
    return;
  }

  const tempId='wk-ask-'+Date.now();
  baiChat.push({role:'agent',text:'<i>Thinking…</i>',ts:Date.now(),tempId});
  baiSaveChat();baiRenderMessages();
  try{
    const prompt=`You are BLOC AGENT, a terse, encouraging productivity assistant embedded in a task/focus-timer app called BLOC. The user tapped "Ask Agent about this" from their Weekly Review page while looking at a specific week (it may not be the current week — check the label below). Answer "how did this week go?" in 3-5 short sentences, warm but concrete, referencing real numbers from the data below. Plain text, no markdown, no asterisks.\n${baiProfileBlock()}\nWeek data (from the screen they're looking at):\n${weekData}\n\nGeneral current app context, for extra background only — don't let it override the week data above:\n${baiContextSummary()}`;
    const aiReply=await baiCallGemini(prompt,{maxOutputTokens:1536,thinkingLevel:'low'});
    const msg=chatMsgs.find(m=>m.tempId===tempId);
    if(msg){msg.text=`✨ ${escHTML(aiReply)}`;delete msg.tempId;}
  }catch(err){
    const msg=chatMsgs.find(m=>m.tempId===tempId);
    if(msg){msg.text=`${escHTML(typeof baiFriendlyError==='function'?baiFriendlyError(err):(err.message||'network error'))}`;delete msg.tempId;}
  }
  if(chatRef)chatRef.updated=Date.now();
  if(typeof bcPersist==='function')bcPersist();
  baiRenderMessages();
}


const WKPLAN_KEY='bloc_weekly_plans_v1';
let weeklyPlans=loadMigratedStore(WKPLAN_KEY,{},function(store){
  let changed=false;
  Object.values(store).forEach(p=>{
    if(!p.timeBudgetMin){p.timeBudgetMin={A:0,B:0,C:0,D:0,E:0};changed=true;}
    if(!p.outcomes){p.outcomes=[];changed=true;}
    if(!p.status){p.status='planned';changed=true;}
    if(!p.routingMode){p.routingMode='time-block';changed=true;}
    if(!p.deadlineMode){p.deadlineMode='strict';changed=true;}
    if(p.capacityMin===undefined){p.capacityMin=null;changed=true;}
  });
  return changed;
});
function saveWeeklyPlans(){localStorage.setItem(WKPLAN_KEY,JSON.stringify(weeklyPlans));}

function currentPlanWeekKey(offsetWeeks){return weekWindowISO(offsetWeeks||0).cutoffISO;}
function getOrCreateWeeklyPlan(offsetWeeks){
  const key=currentPlanWeekKey(offsetWeeks);
  if(!weeklyPlans[key])weeklyPlans[key]={weekStartISO:key,outcomes:[],timeBudgetMin:{A:0,B:0,C:0,D:0,E:0},status:'planned',routingMode:'time-block',deadlineMode:'strict',capacityMin:null};
  return weeklyPlans[key];
}
function setPlanRoutingMode(offsetWeeks,mode){
  const plan=getOrCreateWeeklyPlan(offsetWeeks);
  plan.routingMode=mode==='energy'?'energy':'time-block';
  saveWeeklyPlans();renderWeeklyPlan(offsetWeeks);
}
function setPlanDeadlineMode(offsetWeeks,mode){
  const plan=getOrCreateWeeklyPlan(offsetWeeks);
  plan.deadlineMode=mode==='fluid'?'fluid':'strict';
  saveWeeklyPlans();renderWeeklyPlan(offsetWeeks);
}
function setPlanCapacityHours(offsetWeeks,hoursStr){
  const plan=getOrCreateWeeklyPlan(offsetWeeks);
  const hrs=parseFloat(hoursStr);
  plan.capacityMin=(hrs>0)?Math.round(hrs*60):null;
  saveWeeklyPlans();renderWeeklyPlan(offsetWeeks);
}
function planCapacityMin(offsetWeeks){
  const plan=getOrCreateWeeklyPlan(offsetWeeks);
  if(plan.capacityMin>0)return plan.capacityMin;
  const dailyHrs=(typeof appSettings!=='undefined'&&appSettings.dailyHoursAvailable>0)?appSettings.dailyHoursAvailable:8;
  return dailyHrs*7*60;
}
function addWeeklyOutcome(offsetWeeks,text){
  if(!text||!text.trim())return;
  const plan=getOrCreateWeeklyPlan(offsetWeeks);
  if(plan.outcomes.length>=5){showToast('MAX 5 OUTCOMES — FINISH OR REMOVE ONE FIRST');return;}
  plan.outcomes.push({id:'wo_'+Date.now()+'_'+Math.floor(Math.random()*1000),text:text.trim(),done:false,taskIds:[]});
  saveWeeklyPlans();renderWeeklyPlan(offsetWeeks);
}
function toggleWeeklyOutcome(offsetWeeks,outcomeId){
  const plan=getOrCreateWeeklyPlan(offsetWeeks);
  const o=plan.outcomes.find(x=>x.id===outcomeId);if(!o)return;
  o.done=!o.done;saveWeeklyPlans();renderWeeklyPlan(offsetWeeks);
}
function deleteWeeklyOutcome(offsetWeeks,outcomeId){
  const plan=getOrCreateWeeklyPlan(offsetWeeks);
  plan.outcomes=plan.outcomes.filter(x=>x.id!==outcomeId);
  saveWeeklyPlans();renderWeeklyPlan(offsetWeeks);
}
function setWeeklyTimeBudget(offsetWeeks,type,minutes){
  const plan=getOrCreateWeeklyPlan(offsetWeeks);
  plan.timeBudgetMin[type]=Math.max(0,parseInt(minutes)||0);
  saveWeeklyPlans();renderWeeklyPlan(offsetWeeks);
}
function outcomeProgress(o){
  if(!o.taskIds||!o.taskIds.length)return null;
  const linked=o.taskIds.map(id=>tasks.find(t=>t.id===id)).filter(Boolean);
  if(!linked.length)return null;
  return Math.round(linked.filter(t=>t.done).length/linked.length*100);
}

function actualByCat(offsetWeeks){
  const {cutoffISO,endISO}=weekWindowISO(offsetWeeks||0);
  const recentSessions=sessions.filter(s=>s.dateISO&&s.dateISO>=cutoffISO&&s.dateISO<=endISO);
  const byType={A:0,B:0,C:0,D:0,E:0};
  recentSessions.forEach(s=>{
    const t=tasks.find(x=>x.id===s.taskId);
    const type=t?t.type:null;
    if(type&&byType[type]!==undefined)byType[type]+=Math.round((s.elapsed||0)/60);
  });
  return byType;
}

let wkMode='review';
function positionWkModeIndicator(){
  const wrap=$('wk-mode-toggle');if(!wrap)return;
  const on=wrap.querySelector('.wk-mode-btn.active'),ind=$('wk-mode-indicator');
  if(on&&ind&&on.offsetWidth){
    ind.style.width=on.offsetWidth+'px';
    ind.style.transform=`translateX(${on.offsetLeft}px)`;
  }
}
function setWeeklyMode(m){
  wkMode=m;
  document.querySelectorAll('.wk-mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.m===m));
  positionWkModeIndicator();
  $('weekly-review-panel').style.display=m==='review'?'block':'none';
  $('weekly-plan-panel').style.display=m==='plan'?'block':'none';
  if(m==='plan')renderWeeklyPlan(wkOffset);
}
function renderNuanceControls(offsetWeeks){
  const wrap=$('wk-nuance-section');if(!wrap)return;
  const plan=getOrCreateWeeklyPlan(offsetWeeks);
  const capMin=planCapacityMin(offsetWeeks);
  $('wk-nuance-routing').innerHTML=[
    {v:'time-block',lbl:'TIME-BLOCK',sub:'route by open calendar slots'},
    {v:'energy',lbl:'ENERGY-BASED',sub:'route by your historical good days'},
  ].map(o=>{const routingMods=(plan.routingMode===o.v?' active':'');return `<button class="nuance-btn${routingMods}" onclick="setPlanRoutingMode(${offsetWeeks},'${o.v}')" title="${o.sub}">${o.lbl}</button>`}).join('');
  $('wk-nuance-deadline').innerHTML=[
    {v:'strict',lbl:'STRICT DEADLINES',sub:'protect the Epic closest to its date first'},
    {v:'fluid',lbl:'FLUID SPRINTS',sub:'spread any shortfall evenly across everything'},
  ].map(o=>{const deadlineMods=(plan.deadlineMode===o.v?' active':'');return `<button class="nuance-btn${deadlineMods}" onclick="setPlanDeadlineMode(${offsetWeeks},'${o.v}')" title="${o.sub}">${o.lbl}</button>`}).join('');
  const capInput=$('wk-nuance-capacity-in');
  if(capInput&&document.activeElement!==capInput)capInput.value=(capMin/60).toFixed(1).replace(/\.0$/,'');
  const usingDefault=!(plan.capacityMin>0);
  $('wk-nuance-capacity-note').textContent=usingDefault?`using Settings default (${(capMin/60).toFixed(1)}h/wk) — override for this week only`:'custom for this week';
}
function renderWeeklyPlan(offsetWeeks){
  const plan=getOrCreateWeeklyPlan(offsetWeeks);
  renderNuanceControls(offsetWeeks);
  $('wk-outcomes-list').innerHTML=plan.outcomes.length?plan.outcomes.map(o=>{
    const prog=outcomeProgress(o);
    return `<div class="wk-outcome-row${o.done?' done':''}">
      <div class="t-chk" onclick="toggleWeeklyOutcome(${offsetWeeks},'${o.id}')">${o.done?'✓':''}</div>
      <div class="wk-outcome-txt">${escHTML(o.text)}${prog!==null?` <span style="color:var(--muted2)">(${prog}%)</span>`:''}</div>
      <button class="t-btn del" onclick="deleteWeeklyOutcome(${offsetWeeks},'${o.id}')">✕</button>
    </div>`;
  }).join(''):'<div class="empty-sec">No outcomes set yet — what are the 3–5 things that would make this week a win?</div>';

  const actual=actualByCat(offsetWeeks);
  const PCOLOR={A:'pa',B:'pb',C:'pc',D:'pd',E:'pe'};
  $('wk-budget-editor').innerHTML=SECTS.map(s=>{
    const planned=plan.timeBudgetMin[s.type]||0;
    const act=actual[s.type]||0;
    const pct=planned?Math.min(Math.round(act/planned*100),150):0;
    return `<div class="wk-budget-row">
      <span class="wk-budget-lbl">${s.type}</span>
      <input type="number" class="wk-budget-in" value="${planned}" min="0" step="15"
        onchange="setWeeklyTimeBudget(${offsetWeeks},'${s.type}',this.value)">
      <span class="wk-budget-unit">min planned</span>
      <div class="wk-budget-track"><div class="wk-budget-fill" style="width:${pct}%;background:var(--${PCOLOR[s.type]})"></div></div>
      <span class="wk-budget-actual">${act}m actual</span>
    </div>`;
  }).join('');

  if(typeof renderGoals==='function')renderGoals();
  if(typeof renderHabits==='function')renderHabits();
  if(typeof renderDelegateBoard==='function')renderDelegateBoard();
  if(typeof renderAuditCard==='function')renderAuditCard(offsetWeeks);
}

function renderPlannedActualChart(offsetWeeks){
  const wrap=$('wk-planned-actual');if(!wrap)return;
  const planningEnabled=typeof appSettings==='undefined'||appSettings.weeklyPlanningEnabled!==false;
  if(!planningEnabled){wrap.style.display='none';return;}
  const plan=getOrCreateWeeklyPlan(offsetWeeks);
  const anyPlanned=SECTS.some(s=>(plan.timeBudgetMin[s.type]||0)>0);
  if(!anyPlanned){wrap.style.display='none';return;}
  wrap.style.display='block';
  const actual=actualByCat(offsetWeeks);
  const PCOLOR={A:'pa',B:'pb',C:'pc',D:'pd',E:'pe'};
  const maxMin=Math.max(...SECTS.map(s=>Math.max(plan.timeBudgetMin[s.type]||0,actual[s.type]||0)),1);
  $('wk-planned-actual-bars').innerHTML=SECTS.map(s=>{
    const planned=plan.timeBudgetMin[s.type]||0,act=actual[s.type]||0;
    const plannedPct=Math.round(planned/maxMin*100),actPct=Math.round(act/maxMin*100);
    return `<div class="wk-pa-row">
      <span class="wk-pa-lbl" style="color:var(--${PCOLOR[s.type]})">${s.type}</span>
      <div class="wk-pa-bars">
        <div class="wk-pa-track"><div class="wk-pa-fill planned" style="width:${plannedPct}%;background:var(--${PCOLOR[s.type]})"></div></div>
        <div class="wk-pa-track"><div class="wk-pa-fill actual" style="width:${actPct}%;background:var(--${PCOLOR[s.type]})"></div></div>
      </div>
      <span class="wk-pa-info">${planned}m planned · ${act}m actual</span>
    </div>`;
  }).join('');
}

function renderDelegateBoard(){
  const section=$('wk-delegate-section');if(!section)return;
  const delegated=tasks.filter(t=>t.type==='D'&&t.done);
  if(!delegated.length){section.style.display='none';return;}
  section.style.display='block';
  const byWho={};
  delegated.forEach(t=>{
    const who=(t.delegatedTo&&t.delegatedTo.trim())||'Unspecified';
    (byWho[who]=byWho[who]||[]).push(t);
  });
  const names=Object.keys(byWho).sort((a,b)=>a==='Unspecified'?1:b==='Unspecified'?-1:a.localeCompare(b));
  $('wk-delegate-list').innerHTML=names.map(who=>`
    <div class="wk-delegate-group">
      <div class="wk-delegate-who">${escHTML(who)}</div>
      ${byWho[who].map(t=>`<div class="wk-delegate-item">→ ${escHTML(t.text)}</div>`).join('')}
    </div>`).join('');
}

const HABIT_STREAK_MILESTONES=[7,30,66,100];
const HABIT_STREAK_MILESTONES_WEEKLY=[4,12,26,52];
const HABIT_KEY='bloc_habits_v1';
const HABIT_MAX=5;
let habits=loadMigratedStore(HABIT_KEY,[],function(store){
  let changed=false;
  store.forEach(h=>{
    if(!h.dayState){h.dayState={};changed=true;}
    if(h.bestStreak===undefined){h.bestStreak=0;changed=true;}
  });
  return changed;
});
function saveHabits(){localStorage.setItem(HABIT_KEY,JSON.stringify(habits));}

const HABIT_SHIELD_EVERY=7,HABIT_SHIELD_MAX=2;
const activeHabitCount=()=>habits.filter(h=>!h.draft).length;

/* Walk a daily habit's history: streak that auto-spends shields, best run, shields held. */
function habitSim(h){
  const out={streak:0,best:0,shields:0,toNext:HABIT_SHIELD_EVERY,covered:{}};
  if(!h||h.frequency==='weekly'||!h.dayState)return out;
  const today=isoDate(bocNow());
  let first=null;
  Object.keys(h.dayState).sort().forEach(iso=>{if(!first&&h.dayState[iso]==='observed')first=iso;});
  if(!first)return out;
  const cursor=new Date(first+'T00:00:00');
  let run=0,best=0,shields=0,prog=0;
  for(let guard=0;guard<900;guard++){
    const iso=isoDate(cursor);
    const st=h.dayState[iso]||'unobserved';
    if(st==='observed'){
      run++;if(run>best)best=run;
      if(prog<HABIT_SHIELD_EVERY)prog++;
      if(prog>=HABIT_SHIELD_EVERY&&shields<HABIT_SHIELD_MAX){shields++;prog=0;}
    }else if(st==='confirmed-rest'){
    }else if(iso===today){
    }else if(shields>0){shields--;out.covered[iso]=1;}
    else run=0;
    if(iso>=today)break;
    cursor.setDate(cursor.getDate()+1);
  }
  out.streak=run;out.best=best;out.shields=shields;
  out.toNext=shields>=HABIT_SHIELD_MAX?0:Math.max(1,HABIT_SHIELD_EVERY-prog);
  return out;
}
/* "12 of last 14": days done (or covered by a shield) out of days that counted */
function consistencyOf(h,days){
  const today=isoDate(bocNow());
  const sim=habitSim(h);
  let done=0,n=0;
  const c=bocNow();
  for(let i=0;i<days;i++){
    const iso=isoDate(c);
    if(iso<h.startDateISO)break;
    const st=h.dayState[iso]||'unobserved';
    if(st!=='confirmed-rest'&&!(iso===today&&st==='unobserved')){
      n++;if(st==='observed'||sim.covered[iso])done++;
    }
    c.setDate(c.getDate()-1);
  }
  return{done,n};
}
const HB_SHIELD_PATH='M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z';
function shieldPipsHTML(count,toNext){
  const tip=`${count} of ${HABIT_SHIELD_MAX} streak shields. A shield covers one missed day automatically. `+(toNext?`Next one after ${toNext} more day${toNext===1?'':'s'} done.`:'Full.');
  let s='';
  for(let i=0;i<HABIT_SHIELD_MAX;i++)s+=`<svg class="hb-shield${i<count?' on':''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${HB_SHIELD_PATH}"/></svg>`;
  return `<span class="hb-shields" title="${tip}" aria-label="${count} of ${HABIT_SHIELD_MAX} streak shields">${s}</span>`;
}
function dailyStatsHTML(h,todayState,streak){
  const sim=habitSim(h);
  const c=consistencyOf(h,14);
  const consChip=c.n?`<span class="hb-cons" title="Days done, or covered by a shield, out of the last ${c.n}">${c.done} of last ${c.n}</span>`:'';
  const restNote=(todayState==='confirmed-rest')?' <span class="wk-habit-stats-sub">· resting today</span>':'';
  const todayISO=isoDate(bocNow());
  const best=Math.max(h.bestStreak||0,streak);
  let streakChip;
  if(streak>0){
    const tier=streakTier(streak,'d');
    const isRecordDay=h.bestStreakDate===todayISO&&todayState==='observed'&&streak===best;
    streakChip=`<span class="wk-habit-flame ${tier}">🔥 ${streak}-day streak</span>`+(isRecordDay
      ?` <span class="wk-habit-record" title="You just passed your previous best">${hico('trophy','trophy')} NEW RECORD</span>`
      :` <span class="wk-habit-stats-sub">· best ${best}</span>`);
  }else{
    const l=consistencyOf(h,50);
    streakChip=`<span class="wk-habit-flame cold" title="One miss doesn’t undo the work you’ve put in">${l.n?`${l.done} of your last ${l.n} days`:'Start again today'}</span> <span class="wk-habit-stats-sub">· today is a fresh rep</span>`;
  }
  return `${consChip}${consChip?' · ':''}${streakChip}${restNote} ${shieldPipsHTML(sim.shields,sim.toNext)}`;
}
function shieldNoteHTML(h){
  if(h.frequency==='weekly')return'';
  const sim=habitSim(h);
  const days=Object.keys(sim.covered).sort();
  const last=days[days.length-1];
  if(!last||h.shieldSeen===last)return'';
  const age=Math.round((new Date(isoDate(bocNow())+'T00:00:00')-new Date(last+'T00:00:00'))/86400000);
  if(age>3)return'';
  const wd=new Date(last+'T00:00:00').toLocaleDateString('en-US',{weekday:'long'});
  return `<div class="wk-habit-shield-note"><span>A shield covered ${wd}. Your streak is intact.</span><button onclick="dismissShieldNote('${h.id}','${last}')">GOT IT</button></div>`;
}
function dismissShieldNote(id,iso){const h=habits.find(x=>x.id===id);if(!h)return;h.shieldSeen=iso;saveHabits();renderHabits();}

const HABIT_SKIP_REASONS=[
  {k:'rest',label:'Rest day',keep:true},{k:'sick',label:'Sick',keep:true},{k:'travel',label:'Travel',keep:true},
  {k:'energy',label:'Low energy',keep:false},{k:'busy',label:'Busy',keep:false}];
function skipBtnHTML(h,todayState){
  const on=todayState==='confirmed-rest'||todayState==='missed';
  const title=on?'Skipped today — tap to undo':'Skip today — rest, sick or travel days keep your streak';
  return `<button class="wk-habit-rest-btn wk-habit-skip-btn${on?' on':''}" onclick="habitSkipClick(event,'${h.id}')" title="${title}" aria-label="Skip today" aria-haspopup="true">${hico('moon','rest')}<span class="hb-skip-lbl">SKIP</span></button>`;
}
function habitSkipClick(ev,id){
  ev.stopPropagation();
  const h=habits.find(x=>x.id===id);if(!h)return;
  const st=dayStateOf(h,isoDate(bocNow()));
  if(st==='confirmed-rest'||st==='missed'){logHabitDay(id,st);return;}
  openHabitSkip(id,ev.currentTarget);
}
function _hbSkipOutside(ev){const p=document.getElementById('hb-skip-pop');if(p&&!p.contains(ev.target))closeHabitSkip();}
function closeHabitSkip(){
  const p=document.getElementById('hb-skip-pop');if(p)p.remove();
  document.removeEventListener('click',_hbSkipOutside,true);
}
function openHabitSkip(id,btn){
  closeHabitSkip();
  const p=document.createElement('div');
  p.id='hb-skip-pop';p.className='hb-skip-pop';p.setAttribute('role','dialog');p.setAttribute('aria-label','Skip today');
  p.innerHTML=`<div class="hb-skip-hd">SKIP TODAY</div>
    <div class="hb-skip-chips">${HABIT_SKIP_REASONS.map(r=>`<button class="hb-skip-chip" onclick="skipHabitDay('${id}','${r.k}')">${r.label}</button>`).join('')}</div>
    <button class="hb-skip-none" onclick="skipHabitDay('${id}','')">Skip without a reason</button>
    <div class="hb-skip-note">Rest, sick and travel days never break your streak. Low energy and busy days use a shield if you have one.</div>`;
  p.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.stopPropagation();closeHabitSkip();if(btn&&btn.focus)btn.focus();}});
  document.body.appendChild(p);
  const r=btn.getBoundingClientRect();
  const top=Math.min(window.innerHeight-p.offsetHeight-12,r.bottom+6);
  const left=Math.max(12,Math.min(window.innerWidth-p.offsetWidth-12,r.right-p.offsetWidth));
  p.style.top=Math.max(12,top)+'px';p.style.left=left+'px';
  const first=p.querySelector('button');if(first)first.focus();
  setTimeout(()=>document.addEventListener('click',_hbSkipOutside,true),0);
}
function skipHabitDay(id,key){
  const h=habits.find(x=>x.id===id);if(!h)return;
  const r=HABIT_SKIP_REASONS.find(x=>x.k===key);
  const iso=isoDate(bocNow());
  const state=r&&r.keep?'confirmed-rest':'missed';
  if(r){(h.reasons=h.reasons||{})[iso]=r.label;}else if(h.reasons){delete h.reasons[iso];}
  closeHabitSkip();
  logHabitDay(id,state);
  const sim=habitSim(h);
  showToast(r&&r.keep?'SKIPPED — YOUR STREAK IS SAFE':(sim.shields>0?'SKIPPED — A SHIELD WILL COVER IT':'SKIPPED — ONE MISS DOESN’T UNDO YOU'));
}

let _habitCel=null,_habitCelTO=null;
const HB_FACES=[
  [1,'Meh','<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="8" y1="15" x2="16" y2="15"/></svg>'],
  [2,'Good','<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 14c1 1.5 2.5 2 4 2s3-.5 4-2"/></svg>'],
  [3,'Great','<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M7.5 13.5c1 3 3 3.5 4.5 3.5s3.5-.5 4.5-3.5z"/></svg>']
];
function startHabitCelebrationStrip(h,iso){
  let hint=false;
  try{if(!localStorage.getItem('bloc_hb_cel_hint_v1')){hint=true;localStorage.setItem('bloc_hb_cel_hint_v1','1');}}catch(_){}
  _habitCel={id:h.id,iso,felt:0,t:Date.now(),hint};
  clearTimeout(_habitCelTO);
  _habitCelTO=setTimeout(endHabitCel,4500);
  try{if(navigator.vibrate)navigator.vibrate(12);}catch(_){}
}
function endHabitCel(){
  _habitCel=null;clearTimeout(_habitCelTO);
  if(!_habitEdit)renderHabits();
}
function habitFeel(id,feel){
  const h=habits.find(x=>x.id===id);
  if(!h||!_habitCel||_habitCel.id!==id)return;
  (h.feel=h.feel||{})[_habitCel.iso]=feel;
  _habitCel.felt=feel;saveHabits();
  clearTimeout(_habitCelTO);_habitCelTO=setTimeout(endHabitCel,1100);
  renderHabits();
}
function celebrationHTML(h,compact){
  if(!_habitCel||_habitCel.id!==h.id)return'';
  let html='';
  if(h.reward)html+=`<div class="hbc-line"><span class="hbc-k">CELEBRATE WITH</span> <b>${escHTML(h.reward)}</b></div>`;
  if(h.identity)html+=`<div class="hbc-id">Another vote for: “${escHTML(h.identity)}”</div>`;
  if(!html){
    html=`<div class="hbc-line">That’s one more vote for who you’re becoming.</div>`;
    if(!compact&&_habitCel.hint)html+=`<button class="hbc-add" onclick="startHabitEdit('${h.id}','reward')">+ add a 2-second celebration</button>`;
  }
  const feels=HB_FACES.map(([v,l,s])=>`<button class="hbc-f${_habitCel.felt===v?' on':''}" onclick="habitFeel('${h.id}',${v})" aria-label="${l}" title="${l}">${s}</button>`).join('');
  return `<div class="hbc" role="status"><div class="hbc-txt">${html}</div><div class="hbc-feel"><span class="hbc-q">How did that feel?</span>${feels}</div></div>`;
}

function draftRowHTML(h){
  const hasCue=!!h.cue;
  return `<div class="wk-habit-row hb-draft">
    <div class="wk-habit-top">
      <div class="wk-habit-main">
        <div class="t-chk hb-draft-chk" onclick="startHabitEdit('${h.id}','cue')" title="Add an anchor first — a habit needs a cue to start" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();startHabitEdit('${h.id}','cue');}"></div>
        <div class="wk-habit-txt"><span class="wk-habit-txt-name editable" role="button" tabindex="0" onclick="startHabitEdit('${h.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();startHabitEdit('${h.id}');}">${escHTML(h.title)}</span><span class="wk-habit-freq hb-draft-tag">DRAFT</span></div>
      </div>
      <div class="wk-habit-actions">
        <button class="hob-add-btn hb-draft-go" onclick="${hasCue?`activateHabitDraft('${h.id}')`:`startHabitEdit('${h.id}','cue')`}">${hasCue?'START':'ADD ANCHOR'}</button>
        <button class="t-btn del" onclick="deleteHabit('${h.id}')" title="Delete draft">✕</button>
      </div>
    </div>
    <div class="wk-habit-stats-row hb-draft-note">${hasCue?escHTML(habitCueLine(h))+' · ready when you are':'No anchor yet. Drafts have no streak and don’t use one of your '+HABIT_MAX+' slots.'}</div>
  </div>`;
}
function activateHabitDraft(id){
  const h=habits.find(x=>x.id===id);if(!h)return;
  if(activeHabitCount()>=HABIT_MAX){showToast('MAX '+HABIT_MAX+' ACTIVE HABITS — REMOVE OR GRADUATE ONE FIRST');return;}
  delete h.draft;h.startDateISO=isoDate(bocNow());
  saveHabits();renderHabits();showToast('HABIT STARTED — YOUR FIRST REP IS WAITING');
}

const HBB_ANCHORS=[
  {t:'wake up',s:'morning'},{t:'pour my coffee',s:'morning'},{t:'brush my teeth',s:'morning'},
  {t:'sit down at my desk',s:'midday'},{t:'finish lunch',s:'midday'},
  {t:'close my laptop for the day',s:'evening'},{t:'finish dinner',s:'evening'},{t:'get into bed',s:'evening'}];
const HBB_REWARDS=['a quiet “yes!”','a fist pump','a proper coffee','a deep breath and a smile'];
const HBB_SLOTS=[{k:'morning',l:'Morning'},{k:'midday',l:'Midday'},{k:'evening',l:'Evening'}];
let _hbb=null;
function hbbInferSlot(text){
  const t=(text||'').toLowerCase();
  if(/\b(bed|sleep|night|dinner|evening|tonight|laptop)\b/.test(t))return'evening';
  if(/\b(lunch|noon|midday|afternoon|desk)\b/.test(t))return'midday';
  if(/\b(wake|morning|coffee|breakfast|brush|teeth|alarm)\b/.test(t))return'morning';
  return'';
}
function hbbTinyIdeas(){
  const t=(_hbb.title||'').trim().toLowerCase();
  const m=HABIT_STARTERS.find(s=>s.title.toLowerCase()===t);
  const ideas=m&&m.tiny?[m.tiny]:[];
  ['Do it for 2 minutes','Do just the first step'].forEach(x=>{if(!ideas.includes(x))ideas.push(x);});
  return ideas;
}
const hbbQ=s=>escHTML(s||'').replace(/"/g,'&quot;');
const hbbClean=s=>(s||'').trim().replace(/[.\s]+$/,'');
function openHabitBuilder(seed){
  seed=seed||{};
  _hbb={step:1,title:seed.title||'',cueType:'after',anchor:'',slot:'',slotManual:false,
    freq:seed.freq==='weekly'?'weekly':'daily',target:3,tiny:'',reward:HBB_REWARDS[0],identity:'',showId:false};
  hbbRender();
}
function closeHabitBuilder(){
  const o=document.getElementById('hb-builder-overlay');
  if(o){o.classList.remove('open');o.innerHTML='';}
  _hbb=null;
}
function hbbSentence(){
  const e=_hbb,t=HABIT_CUE_TYPES[e.cueType]||HABIT_CUE_TYPES.after;
  const b=(v,ph)=>v&&v.trim()?`<span class="hbb-blank f">${escHTML(v.trim())}</span>`:`<span class="hbb-blank">${ph}</span>`;
  const will=e.cueType==='ifthen'?', then I will ':', I will ';
  return `${t.pre} ${b(e.anchor,'…')}${will}${b(e.title,'…')}${e.reward&&e.reward.trim()?`, then I’ll celebrate with ${b(e.reward,'…')}`:''}`;
}
function hbbCanNext(){
  const e=_hbb;
  if(e.step===1)return!!(e.anchor.trim()&&e.slot);
  if(e.step===2)return!!e.title.trim();
  return true;
}
function hbbSlotsHTML(){
  return HBB_SLOTS.map(s=>`<button class="hbb-chip${_hbb.slot===s.k?' on':''}" onclick="hbbSlot('${s.k}')">${s.l}</button>`).join('');
}
function hbbStepHTML(n,label,summary,renderBody){
  const e=_hbb;
  if(e.step===n)return `<div class="hbb-step active"><div class="hbb-sh"><span class="hbb-pin">${n}</span><span class="hbb-sl">${label}</span></div><div class="hbb-body">${renderBody()}</div></div>`;
  if(n<e.step)return `<div class="hbb-step done"><span class="hbb-pin ok">✓</span><div class="hbb-sum"><div class="hbb-sl">${label}</div><div class="hbb-sv">${summary}</div></div><button class="hbb-edit" onclick="hbbGo(${n})">Edit</button></div>`;
  return `<div class="hbb-step later"><span class="hbb-pin">${n}</span><div class="hbb-sum"><div class="hbb-sl">${label}</div></div></div>`;
}
function hbbGateNote(){
  const weekAgo=isoDate(new Date(bocNow().getTime()-6*86400000));
  if(_hbb.step!==1||!habits.some(h=>!h.draft&&h.startDateISO>=weekAgo))return'';
  return `<div class="hbb-gate">You started a habit this week. Starting with one tends to work better — add another now, or give the first a few days.</div>`;
}
function hbbAnchorStep(){
  const e=_hbb,t=HABIT_CUE_TYPES[e.cueType]||HABIT_CUE_TYPES.after;
  const chips=['after','when','before'].includes(e.cueType)
    ?`<div class="hbb-chips">${HBB_ANCHORS.map((a,i)=>`<button class="hbb-chip${e.anchor===a.t?' on':''}" onclick="hbbPickAnchor(${i})">${a.t}</button>`).join('')}</div>`:'';
  return `<label class="hbb-lbl" for="hbb-anchor">What already happens every day?</label>
    <div class="hbb-cuerow">
      <select class="hbb-sel" onchange="hbbCueType(this.value)" aria-label="Kind of cue">${Object.keys(HABIT_CUE_TYPES).map(k=>`<option value="${k}"${e.cueType===k?' selected':''}>${HABIT_CUE_TYPES[k].label}</option>`).join('')}</select>
      <input class="hbb-in" id="hbb-anchor" type="text" maxlength="80" value="${hbbQ(e.anchor)}" placeholder="${hbbQ(t.ph)}" oninput="hbbSet('anchor',this.value)" onkeydown="hbbEnter(event)" autocomplete="off">
    </div>${chips}
    <div class="hbb-lbl">Roughly when?</div><div class="hbb-chips" id="hbb-slots">${hbbSlotsHTML()}</div>`;
}
function hbbActionStep(){
  const e=_hbb;
  const target=e.freq==='weekly'
    ?`<select class="hbb-sel" onchange="hbbSet('target',Number(this.value))" aria-label="Times per week">${[1,2,3,4,5,6].map(n=>`<option value="${n}"${Number(e.target)===n?' selected':''}>${n}× / week</option>`).join('')}</select>`:'';
  return `<label class="hbb-lbl" for="hbb-title">The habit</label>
    <input class="hbb-in" id="hbb-title" type="text" maxlength="60" value="${hbbQ(e.title)}" placeholder="e.g. Stretch, Read 10 pages…" oninput="hbbSet('title',this.value)" onkeydown="hbbEnter(event)" autocomplete="off">
    <div class="hbb-lbl">Tiny version <span class="hbb-opt">the smallest rep that still counts</span></div>
    <input class="hbb-in" id="hbb-tiny" type="text" maxlength="80" value="${hbbQ(e.tiny)}" placeholder="e.g. touch my toes once" oninput="hbbSet('tiny',this.value)" onkeydown="hbbEnter(event)" autocomplete="off">
    <div class="hbb-chips">${hbbTinyIdeas().map((x,i)=>`<button class="hbb-chip${e.tiny===x?' on':''}" onclick="hbbPickTiny(${i})">${escHTML(x)}</button>`).join('')}</div>
    <div class="hbb-lbl">How often</div>
    <div class="hbb-chips"><button class="hbb-chip${e.freq==='daily'?' on':''}" onclick="hbbFreq('daily')">Every day</button><button class="hbb-chip${e.freq==='weekly'?' on':''}" onclick="hbbFreq('weekly')">A few times a week</button>${target}</div>`;
}
function hbbCelebrateStep(){
  const e=_hbb;
  const identity=e.showId
    ?`<label class="hbb-lbl" for="hbb-id">Identity <span class="hbb-opt">each rep is a vote for who you’re becoming</span></label>
    <input class="hbb-in" id="hbb-id" type="text" maxlength="80" value="${hbbQ(e.identity)}" placeholder="I’m someone who moves every day" oninput="hbbSet('identity',this.value)" onkeydown="hbbEnter(event)" autocomplete="off">`
    :`<button class="hbb-link" onclick="hbbShowId()">+ add an identity line (optional)</button>`;
  return `<label class="hbb-lbl" for="hbb-reward">Celebrate right after <span class="hbb-opt">a 2-second win that makes it feel good</span></label>
    <input class="hbb-in" id="hbb-reward" type="text" maxlength="60" value="${hbbQ(e.reward)}" oninput="hbbSet('reward',this.value)" onkeydown="hbbEnter(event)" autocomplete="off">
    <div class="hbb-chips">${HBB_REWARDS.map((x,i)=>`<button class="hbb-chip${e.reward===x?' on':''}" onclick="hbbPickReward(${i})">${escHTML(x)}</button>`).join('')}</div>
    ${identity}`;
}
function hbbRender(){
  const e=_hbb;if(!e)return;
  let o=document.getElementById('hb-builder-overlay');
  if(!o){o=document.createElement('div');o.id='hb-builder-overlay';document.body.appendChild(o);}
  const t=HABIT_CUE_TYPES[e.cueType]||HABIT_CUE_TYPES.after;
  o.innerHTML=`<div class="hbb-modal" role="dialog" aria-modal="true" aria-label="New habit" onkeydown="hbbKey(event)">
    <div class="hbb-top"><span class="hbb-k">NEW HABIT</span><button class="hbb-x" onclick="closeHabitBuilder()" aria-label="Close">✕</button></div>
    <div class="hbb-sent" id="hbb-sent" aria-live="polite">${hbbSentence()}</div>
    <div class="hbb-bar" aria-hidden="true">${[1,2,3].map(i=>`<span class="${i<=e.step?'on':''}"></span>`).join('')}</div>
    ${hbbGateNote()}
    ${hbbStepHTML(1,'ANCHOR',`${t.pre} ${escHTML(e.anchor)}${e.slot?` · ${e.slot}`:''}`,hbbAnchorStep)}
    ${hbbStepHTML(2,'TINY ACTION',escHTML(e.title||''),hbbActionStep)}
    ${hbbStepHTML(3,'CELEBRATE',escHTML(e.reward||'—'),hbbCelebrateStep)}
    <div class="hbb-foot">
      <button class="hbb-draft" onclick="hbbDraft()">Save as draft</button>
      <span class="hbb-spacer"></span>
      ${e.step>1?`<button class="hbb-back" onclick="hbbBack()">BACK</button>`:''}
      <button class="hob-add-btn hbb-next" id="hbb-next" onclick="hbbNext()"${hbbCanNext()?'':' disabled'}>${e.step<3?'NEXT':'SAVE HABIT'}</button>
    </div>
  </div>`;
  o.classList.add('open');
  const f=document.getElementById(e.step===1?'hbb-anchor':e.step===2?'hbb-title':'hbb-reward');
  if(f){f.focus();try{const n=f.value.length;f.setSelectionRange(n,n);}catch(_){}}
}
function hbbLive(){
  const s=document.getElementById('hbb-sent');if(s)s.innerHTML=hbbSentence();
  const n=document.getElementById('hbb-next');if(n)n.disabled=!hbbCanNext();
}
function hbbSet(k,v){
  if(!_hbb)return;
  _hbb[k]=v;
  if(k==='anchor'&&!_hbb.slotManual){
    _hbb.slot=hbbInferSlot(v);
    const el=document.getElementById('hbb-slots');if(el)el.innerHTML=hbbSlotsHTML();
  }
  hbbLive();
}
function hbbCueType(v){if(!_hbb)return;_hbb.cueType=v;hbbRender();}
function hbbPickAnchor(i){const a=HBB_ANCHORS[i];if(!a||!_hbb)return;_hbb.anchor=a.t;_hbb.slot=a.s;_hbb.slotManual=false;hbbRender();}
function hbbSlot(k){if(!_hbb)return;_hbb.slot=k;_hbb.slotManual=true;hbbRender();}
function hbbPickTiny(i){if(!_hbb)return;const x=hbbTinyIdeas()[i];if(x){_hbb.tiny=x;hbbRender();}}
function hbbPickReward(i){if(!_hbb)return;_hbb.reward=HBB_REWARDS[i];hbbRender();}
function hbbFreq(f){if(!_hbb)return;_hbb.freq=f;hbbRender();}
function hbbShowId(){if(!_hbb)return;_hbb.showId=true;hbbRender();}
function hbbGo(n){if(!_hbb)return;_hbb.step=n;hbbRender();}
function hbbBack(){if(!_hbb||_hbb.step<2)return;_hbb.step--;hbbRender();}
function hbbEnter(ev){if(ev.key==='Enter'){ev.preventDefault();hbbNext();}}
function hbbKey(ev){if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();closeHabitBuilder();}}
function hbbNext(){
  const e=_hbb;if(!e)return;
  if(!hbbCanNext()){
    showToast(e.step===1?(e.anchor.trim()?'PICK ROUGHLY WHEN IT HAPPENS':'NAME WHAT YOU’LL ANCHOR IT TO'):'NAME THE HABIT FIRST');
    return;
  }
  if(e.step<3){e.step++;hbbRender();}
  else hbbSave(false);
}
function hbbDraft(){
  const e=_hbb;if(!e)return;
  if(!e.title.trim()){e.step=2;hbbRender();showToast('NAME THE HABIT, THEN SAVE AS DRAFT');return;}
  hbbSave(true);
}
function hbbSave(draft){
  const e=_hbb;if(!e)return;
  const title=e.title.trim();
  if(!title){e.step=2;hbbRender();return;}
  const t=HABIT_CUE_TYPES[e.cueType]||HABIT_CUE_TYPES.after;
  const cue=hbbClean((e.anchor||'').trim().replace(t.strip,''));
  const extra={cueType:cue&&e.cueType!=='after'?e.cueType:'',cue,slot:e.slot,tiny:hbbClean(e.tiny),reward:hbbClean(e.reward),identity:hbbClean(e.identity),draft:!!draft};
  if(e.freq==='weekly')extra.target=e.target;
  const h=addHabit(title,e.freq,extra);
  if(!h)return;
  closeHabitBuilder();
  showToast(h.draft?'SAVED AS DRAFT — ADD AN ANCHOR TO START YOUR STREAK':'HABIT ADDED — YOUR FIRST REP IS WAITING');
}

function draftsSection(){
  const d=habits.filter(h=>h.draft);
  if(!d.length)return'';
  return `<div class="hb-slot-hd"><span>${hico('clock','clock')}</span> Drafts · need an anchor</div>${d.map(h=>rowHTML(h,false)).join('')}`;
}


const HABIT_CUE_TYPES={
  after: {label:'After I…',     pre:'After I',  ph:'pour my morning coffee',   strip:/^after\s+i\s+/i},
  when:  {label:'When I…',      pre:'When I',   ph:'sit down at my desk',      strip:/^when\s+i\s+/i},
  before:{label:'Before I…',    pre:'Before I', ph:'open my laptop',           strip:/^before\s+i\s+/i},
  ifthen:{label:'If … then',    pre:'If',       ph:'I feel the urge to scroll',strip:/^if\s+/i},
  at:    {label:'At (time/place)',pre:'At',     ph:'7:30 am, at my desk',      strip:/^at\s+/i}
};
function hico(n,c){return '<svg class="i hi-'+c+'" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-'+n+'"/></svg>';}
const HABIT_SLOTS=[
  {k:'morning',label:'Morning',ico:hico('sunrise','dawn')},
  {k:'midday', label:'Midday', ico:hico('sun','sun')},
  {k:'evening',label:'Evening',ico:hico('moon','night')},
  {k:'anytime',label:'Anytime',ico:hico('clock','clock')}
];
const cueKind=h=>HABIT_CUE_TYPES[h.cueType]?h.cueType:'after';
const slotOf=h=>HABIT_SLOTS.some(s=>s.k===h.slot)?h.slot:'anytime';
function habitCueLine(h){
  if(!h.cue)return'';
  const t=HABIT_CUE_TYPES[cueKind(h)];
  if(cueKind(h)==='ifthen')return`↳ If ${h.cue} → ${h.title}`;
  return`↳ ${t.pre} ${h.cue}`;
}
const isWeekly=h=>h.frequency==='weekly';
const habitUnit=h=>isWeekly(h)?'w':'d';
const habitTarget=h=>Math.min(6,Math.max(1,parseInt(h.target,10)||1));
function freqBadge(h){
  if(!isWeekly(h))return'DAILY';
  const t=habitTarget(h);return t===1?'WEEKLY':`${t}×/WEEK`;
}

const HABIT_STARTERS=[
  {title:'Drink a glass of water',cueType:'after',cue:'wake up',slot:'morning',tiny:'Take one sip'},
  {title:'10-minute walk',cueType:'after',cue:'finish lunch',slot:'midday',tiny:'Put on shoes and step outside'},
  {title:'Name tomorrow\u2019s A-1',cueType:'after',cue:'close my laptop for the day',slot:'evening',tiny:'Write the A-1 task on one line'},
  {title:'Read 10 pages',cueType:'before',cue:'get into bed',slot:'evening',tiny:'Read one paragraph'},
  {title:'Stretch',cueType:'after',cue:'brush my teeth',slot:'morning',tiny:'Touch my toes once'},
  {title:'Weekly review',frequency:'weekly',cueType:'when',cue:'finish Sunday breakfast',slot:'anytime',tiny:'Open the Weekly tab'}
];

function addHabit(title,frequency,extra){
  if(!title||!title.trim())return null;
  const draft=!!(extra&&extra.draft)||!(extra&&extra.cue);
  if(!draft&&activeHabitCount()>=HABIT_MAX){showToast('MAX 5 ACTIVE HABITS \u2014 REMOVE OR GRADUATE ONE FIRST');return null;}
  if(habits.length>=HABIT_MAX*2){showToast('TOO MANY HABITS \u2014 DELETE A DRAFT FIRST');return null;}
  const h={id:'h_'+Date.now()+Math.random().toString(36).slice(2,5),title:title.trim(),frequency:frequency==='weekly'?'weekly':'daily',
    startDateISO:isoDate(bocNow()),dayState:{},bestStreak:0};
  if(draft)h.draft=true;
  if(extra){
    ['cueType','cue','slot','tiny','obstacle','fallback','identity','reward'].forEach(k=>{if(extra[k])h[k]=extra[k];});
    if(extra.target)h.target=habitTarget(extra);
  }
  habits.push(h);
  saveHabits();renderHabits();
  return h;
}
function addHabitStarter(i){
  const s=HABIT_STARTERS[i];if(!s)return;
  if(habits.some(h=>h.title===s.title)){showToast('ALREADY ADDED');return;}
  addHabit(s.title,s.frequency||'daily',s);
}
function deleteHabit(id){if(_habitEdit&&_habitEdit.id===id)_habitEdit=null;habits=habits.filter(h=>h.id!==id);saveHabits();renderHabits();}

function logHabitDay(habitId,state,level){
  const h=habits.find(x=>x.id===habitId);if(!h)return;
  if(h.draft){showToast('ADD AN ANCHOR FIRST \u2014 A HABIT NEEDS A CUE TO START');startHabitEdit(h.id,'cue');return;}
  const iso=isoDate(bocNow());
  const simBefore=isWeekly(h)?null:habitSim(h);
  if(h.dayState[iso]===state){delete h.dayState[iso];if(h.reasons&&h.reasons[iso]){delete h.reasons[iso];if(!Object.keys(h.reasons).length)delete h.reasons;}}
  else h.dayState[iso]=state;
  if(_habitCel&&_habitCel.id===h.id&&h.dayState[iso]!=='observed')_habitCel=null;
  if(h.dayState[iso]==='observed'&&level==='tiny'){(h.levels=h.levels||{})[iso]='tiny';}
  else if(h.levels&&h.levels[iso]){delete h.levels[iso];if(!Object.keys(h.levels).length)delete h.levels;}
  const streak=currentHabitStreak(h);
  const oldBest=h.bestStreak||0;
  if(streak>oldBest){
    h.bestStreak=streak;
    if(oldBest>0)h.bestStreakDate=iso;
  }
  const marks=isWeekly(h)?HABIT_STREAK_MILESTONES_WEEKLY:HABIT_STREAK_MILESTONES;
  if(state==='observed'&&h.dayState[iso]==='observed'&&marks.includes(streak)&&typeof fireHabitCelebration==='function'){
    fireHabitCelebration(h,streak,marks);
    if(streak===66&&!isWeekly(h)&&typeof showToast==='function'){
      showToast('🔥 DAY 66 — HABITS TOOK 18 TO 254 DAYS TO FEEL AUTOMATIC IN ONE STUDY. TRUST HOW IT FEELS, NOT THE COUNT');
    }
  }
  if(state==='observed'&&h.dayState[iso]==='observed'&&oldBest>0&&streak>oldBest&&typeof showToast==='function'){
    showToast(`🏆 NEW RECORD — ${streak} ${isWeekly(h)?'WEEKS':'DAYS'} (PAST BEST WAS ${oldBest})`);
  }else if(state==='observed'&&h.dayState[iso]==='observed'&&level==='tiny'&&typeof showToast==='function'){
    showToast('✦ TINY COUNTS — YOU SHOWED UP');
  }
  if(state==='observed'&&h.dayState[iso]==='observed'){
    startHabitCelebrationStrip(h,iso);
    if(simBefore&&habitSim(h).shields>simBefore.shields)setTimeout(()=>showToast('SHIELD EARNED — A MISSED DAY WILL BE COVERED FOR YOU'),1200);
  }
  saveHabits();renderHabits();
}
const dayStateOf=(h,iso)=>h.dayState[iso]||'unobserved';

function everDone(h){
  for(const iso in h.dayState){if(h.dayState[iso]==='observed')return true;}
  return false;
}
function streakTier(streak,unit){
  const [lit,strong,mile]=unit==='w'?[4,12,26]:[7,30,66];
  if(streak>=mile)return'milestone';
  if(streak>=strong)return'strong';
  if(streak>=lit)return'lit';
  return'building';
}

function habitWeekStats(h,weekStart){
  const today=isoDate(bocNow());
  let observed=0,rest=0,active=0,remaining=0;
  for(let i=0;i<7;i++){
    const iso=isoDate(new Date(weekStart.getFullYear(),weekStart.getMonth(),weekStart.getDate()+i));
    if(iso<h.startDateISO)continue;
    active++;
    const st=dayStateOf(h,iso);
    if(st==='observed')observed++;
    else if(st==='confirmed-rest')rest++;
    else if(iso>=today&&st!=='missed')remaining++;
  }
  const eff=Math.max(0,Math.min(habitTarget(h),active-rest));
  const endISO=isoDate(new Date(weekStart.getFullYear(),weekStart.getMonth(),weekStart.getDate()+6));
  return{observed,rest,active,remaining,eff,met:eff>0&&observed>=eff,bridged:active>0&&eff===0,over:endISO<today,reachable:observed+remaining>=eff};
}
const weeksAgo=(ws,n)=>new Date(ws.getFullYear(),ws.getMonth(),ws.getDate()-7*n);
function weeklyStreak(h){
  let streak=0,ws=calWeekStart(bocNow());
  for(let guard=0;guard<120;guard++){
    const s=habitWeekStats(h,ws);
    if(s.active===0)break;
    if(s.met)streak++;
    else if(s.bridged){}
    else if(!s.over){if(!s.reachable)break;}
    else break;
    ws=weeksAgo(ws,1);
  }
  return streak;
}
function refreshWeeklyBest(h){
  const cur=calWeekStart(bocNow());
  let best=0,run=0,ws=calWeekStart(new Date(h.startDateISO+'T00:00:00'));
  for(let guard=0;guard<400&&ws<=cur;guard++){
    const s=habitWeekStats(h,ws);
    if(s.met){run++;if(run>best)best=run;}
    else if(s.bridged){}
    else if(s.over||!s.reachable)run=0;
    ws=new Date(ws.getFullYear(),ws.getMonth(),ws.getDate()+7);
  }
  h.bestStreak=best;
}

function currentHabitStreak(h){
  if(isWeekly(h))return weeklyStreak(h);
  return habitSim(h).streak;
}

const DAY_CYCLE=['unobserved','observed','missed','confirmed-rest'];
function cycleDay(habitId,iso){
  const h=habits.find(x=>x.id===habitId);if(!h)return;
  const today=isoDate(bocNow());
  if(iso>=today)return;
  if(iso<h.startDateISO)return;
  const cur=h.dayState[iso]||'unobserved';
  const next=DAY_CYCLE[(DAY_CYCLE.indexOf(cur)+1)%DAY_CYCLE.length];
  if(next==='unobserved')delete h.dayState[iso];
  else h.dayState[iso]=next;
  if(next!=='observed'&&h.levels&&h.levels[iso]){delete h.levels[iso];if(!Object.keys(h.levels).length)delete h.levels;}
  rebuildBestStreak(h);
  saveHabits();renderHabits();
  if(typeof showToast==='function'){
    const labels={observed:'DONE',missed:'SKIPPED',['confirmed-rest']:'REST DAY',unobserved:'CLEARED'};
    showToast(`${iso} MARKED ${labels[next]}`);
  }
}
function rebuildBestStreak(h){
  if(isWeekly(h)){refreshWeeklyBest(h);return;}
  h.bestStreak=habitSim(h).best;
}

const HABIT_COMPLIANCE_WINDOW_DAYS=30;
const complianceLabel=h=>isWeekly(h)?'4w':HABIT_COMPLIANCE_WINDOW_DAYS+'d';
function complianceRate(h,windowDays){
  if(isWeekly(h)){
    let got=0,want=0,ws=calWeekStart(bocNow());
    for(let i=0;i<Math.max(1,Math.round(windowDays/7));i++){
      const s=habitWeekStats(h,ws);
      if(s.active===0)break;
      if(!s.bridged&&(s.over||s.met)){got+=Math.min(s.observed,s.eff);want+=s.eff;}
      ws=weeksAgo(ws,1);
    }
    return want>0?Math.round(got/want*100):0;
  }
  let observed=0,restDays=0;
  let cursor=bocNow();
  for(let i=0;i<windowDays;i++){
    const iso=isoDate(cursor);
    const st=dayStateOf(h,iso);
    if(st==='observed')observed++;
    else if(st==='confirmed-rest')restDays++;
    cursor=new Date(cursor.getTime()-86400000);
  }
  const denom=windowDays-restDays;
  return denom>0?Math.round(observed/denom*100):0;
}

function missedRun(h){
  if(!everDone(h))return 0;
  let run=0,cursor=new Date(bocNow().getTime()-86400000);
  for(let i=0;i<14;i++){
    const iso=isoDate(cursor);
    if(iso<h.startDateISO)break;
    const st=dayStateOf(h,iso);
    if(st==='observed'||st==='confirmed-rest')break;
    run++;
    cursor=new Date(cursor.getTime()-86400000);
  }
  return run;
}
function nudgeText(h,todayState){
  if(todayState==='observed'||todayState==='confirmed-rest')return'';
  if(isWeekly(h)){
    const s=habitWeekStats(h,calWeekStart(bocNow()));
    if(s.met||s.bridged)return'';
    const need=s.eff-s.observed;
    if(!s.reachable)return'Out of reach this week — no guilt. Any rep still builds momentum for the next one.';
    if(need>0&&s.remaining<=need)return`${need} more in the ${s.remaining} day${s.remaining===1?'':'s'} left this week — today keeps you on pace.`;
    return'';
  }
  const run=missedRun(h);
  const tinyHint=h.tiny?` Do the tiny version: ${h.tiny}.`:' Make today\u2019s rep as small as it needs to be.';
  if(run===1)return`Never miss twice — one gap is just a gap.${tinyHint}`;
  if(run>=2)return`A fresh start is one rep away — a gap isn\u2019t a failure.${tinyHint}`;
  return'';
}

function miniHistory(h){
  const today=isoDate(bocNow());
  const everObserved=everDone(h);
  const simM=isWeekly(h)?{covered:{}}:habitSim(h);
  const days=[];
  let cursor=bocNow();
  for(let i=0;i<7;i++){days.unshift(isoDate(cursor));cursor=new Date(cursor.getTime()-86400000);}
  return days.map(iso=>{
    if(iso<h.startDateISO)return`<span class="wk-habit-dot unset" title="Before this habit was added"></span>`;
    if(!everObserved){
      if(iso===today)return`<span class="wk-habit-dot pending" title="${iso} — not started yet, tap the checkbox to begin"></span>`;
      return`<span class="wk-habit-dot unset" title="${iso} — habit not started yet"></span>`;
    }
    const isToday=iso===today;
    const editAttrs=isToday?'':` onclick="cycleDay('${h.id}','${iso}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();cycleDay('${h.id}','${iso}');}"`;
    const editCls=isToday?'':' editable';
    const tapHint=isToday?'':' — tap to correct';
    const st=dayStateOf(h,iso);
    if(st==='observed'){
      const tiny=h.levels&&h.levels[iso]==='tiny';
      return`<span class="wk-habit-dot observed${tiny?' tiny':''}${editCls}" title="${iso} — ${tiny?'done (tiny version)':'done'}${tapHint}"${editAttrs}></span>`;
    }
    if(st==='confirmed-rest')return`<span class="wk-habit-dot rest${editCls}" title="${iso} — rest day${tapHint}"${editAttrs}></span>`;
    if(simM.covered[iso]&&st!=='observed')return`<span class="wk-habit-dot covered${editCls}" title="${iso} — covered by a streak shield${tapHint}"${editAttrs}></span>`;
    if(st==='missed')return`<span class="wk-habit-dot missed${editCls}" title="${iso} — skipped${tapHint}"${editAttrs}></span>`;
    if(isToday)return`<span class="wk-habit-dot pending" title="${iso} — not logged yet"></span>`;
    return`<span class="wk-habit-dot missed${editCls}" title="${iso} — ${isWeekly(h)?'no check-in':'missed'}${tapHint}"${editAttrs}></span>`;
  }).join('');
}

const ONBOARDED_KEY='bloc_habits_onboarded_v1';
function showHabitsIntro(){
  if(habits.length>0)return;
  if(localStorage.getItem(ONBOARDED_KEY))return;
  localStorage.setItem(ONBOARDED_KEY,'1');
  openHabitsOnboarding();
}
function openHabitsOnboarding(){
  drawIntroList();
  const inp=$('hob-input');if(inp)inp.value='';
  $('habits-onboard-overlay').classList.add('open');
}
function closeHabitsOnboarding(){
  $('habits-onboard-overlay').classList.remove('open');
  renderHabits();
}
function addHabitFromOnboarding(){
  const inp=$('hob-input');if(!inp)return;
  const freq=$('hob-freq')?$('hob-freq').value:'daily';
  const t=inp.value.trim();
  if(!t)return;
  inp.value='';
  closeHabitsOnboarding();
  openHabitBuilder({title:t,freq});
}
function drawIntroList(){
  const list=$('hob-list');if(!list)return;
  list.innerHTML=habits.length?habits.map(h=>`
    <div class="hob-item">
      <span class="hob-item-txt">${escHTML(h.title)}</span>
      <span class="hob-item-freq">${h.frequency}</span>
      <button class="t-btn del" onclick="deleteHabit('${h.id}');drawIntroList();">✕</button>
    </div>`).join(''):'<div class="empty-sec">No habits added yet — try one you already sort-of do.</div>';
}

let _habitEdit=null;
function startHabitEdit(id,focusField){
  const h=habits.find(x=>x.id===id);if(!h)return;
  _habitEdit={id:h.id,title:h.title,cue:h.cue||'',cueType:cueKind(h),freq:h.frequency,target:habitTarget(h),
    slot:slotOf(h),tiny:h.tiny||'',obstacle:h.obstacle||'',fallback:h.fallback||'',identity:h.identity||'',reward:h.reward||''};
  renderHabits();
  const el=$(focusField==='cue'?'hed-cue':focusField==='tiny'?'hed-tiny':focusField==='reward'?'hed-reward':'hed-title');
  if(el){el.focus();if(el.select)el.select();}
}
const cancelEdit=()=>{_habitEdit=null;renderHabits();};
function saveHabitEdit(){
  if(!_habitEdit)return;
  const h=habits.find(x=>x.id===_habitEdit.id);
  if(!h){_habitEdit=null;renderHabits();return;}
  const e=_habitEdit;
  const title=(e.title||'').trim();
  if(!title){
    showToast('A HABIT NEEDS A NAME');
    const el=$('hed-title');if(el)el.focus();
    return;
  }
  const clean=s=>(s||'').trim().replace(/[.\s]+$/,'');
  const cueType=HABIT_CUE_TYPES[e.cueType]?e.cueType:'after';
  const cue=clean((e.cue||'').trim().replace(HABIT_CUE_TYPES[cueType].strip,''));
  const freq=e.freq==='weekly'?'weekly':'daily';
  const next={title,cue,cueType:cue?cueType:'',frequency:freq,target:freq==='weekly'?habitTarget({target:e.target}):0,
    slot:HABIT_SLOTS.some(s=>s.k===e.slot)&&e.slot!=='anytime'?e.slot:'',
    tiny:clean(e.tiny),obstacle:clean(e.obstacle),fallback:clean(e.fallback),identity:clean(e.identity),reward:clean(e.reward)};
  const oldFreq=h.frequency;
  const before=JSON.stringify([h.title,h.cue||'',cueKind(h),h.frequency,habitTarget(h),h.slot||'',h.tiny||'',h.obstacle||'',h.fallback||'',h.identity||'',h.reward||'']);
  h.title=title;h.frequency=freq;
  ['cue','tiny','obstacle','fallback','identity','reward','slot'].forEach(k=>{if(next[k])h[k]=next[k];else delete h[k];});
  if(next.cue&&next.cueType&&next.cueType!=='after')h.cueType=next.cueType;else delete h.cueType;
  if(freq==='weekly')h.target=next.target;else delete h.target;
  if(h.draft&&h.cue){
    if(activeHabitCount()>=HABIT_MAX)showToast('MAX 5 ACTIVE HABITS \u2014 THIS ONE STAYS A DRAFT');
    else{delete h.draft;h.startDateISO=isoDate(bocNow());showToast('HABIT STARTED \u2014 YOUR FIRST REP IS WAITING');}
  }
  const after=JSON.stringify([h.title,h.cue||'',cueKind(h),h.frequency,habitTarget(h),h.slot||'',h.tiny||'',h.obstacle||'',h.fallback||'',h.identity||'',h.reward||'']);
  _habitEdit=null;
  if(freq!==oldFreq)rebuildBestStreak(h);
  if(before!==after){saveHabits();showToast('HABIT UPDATED');}
  renderHabits();
  if($('hob-list'))drawIntroList();
  if(histId===h.id)histModal();
}
function editKey(e){
  if(e.key==='Enter'){e.preventDefault();saveHabitEdit();}
  else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancelEdit();}
}
const editInput=(field,fieldValue)=>{if(_habitEdit)_habitEdit[field]=fieldValue;};
const editSelect=(field,fieldValue)=>{if(_habitEdit){_habitEdit[field]=fieldValue;renderHabits();}};
function editorHTML(){
  const e=_habitEdit;
  const q=s=>escHTML(s).replace(/"/g,'&quot;');
  const ct=HABIT_CUE_TYPES[e.cueType]||HABIT_CUE_TYPES.after;
  const field=(id,lbl,opt,current,ph,max,fieldKey)=>`
      <label class="wk-habit-ed-lbl" for="${id}">${lbl}${opt?` <span class="wk-habit-ed-opt">${opt}</span>`:''}</label>
      <input class="wk-habit-ed-in" id="${id}" type="text" maxlength="${max}" value="${q(current)}" placeholder="${q(ph)}"
        oninput="editInput('${fieldKey}',this.value)" onkeydown="editKey(event)" autocomplete="off">`;
  return `<div class="wk-habit-row editing">
    <div class="wk-habit-editor">
      ${field('hed-title','Habit','',e.title,'',60,'title')}
      <div class="hed-grid">
        <div>
          <label class="wk-habit-ed-lbl" for="hed-freq">How often</label>
          <select class="wk-habit-freq-sel hed-sel" id="hed-freq" onchange="editSelect('freq',this.value)" onkeydown="editKey(event)" aria-label="Frequency">
            <option value="daily"${e.freq==='daily'?' selected':''}>Every day</option>
            <option value="weekly"${e.freq==='weekly'?' selected':''}>Times per week</option>
          </select>
        </div>
        ${e.freq==='weekly'?`<div>
          <label class="wk-habit-ed-lbl" for="hed-target">Target</label>
          <select class="wk-habit-freq-sel hed-sel" id="hed-target" onchange="editInput('target',this.value)" onkeydown="editKey(event)" aria-label="Times per week">
            ${[1,2,3,4,5,6].map(n=>`<option value="${n}"${Number(e.target)===n?' selected':''}>${n}× / week</option>`).join('')}
          </select>
        </div>`:''}
        <div>
          <label class="wk-habit-ed-lbl" for="hed-slot">Time of day</label>
          <select class="wk-habit-freq-sel hed-sel" id="hed-slot" onchange="editInput('slot',this.value)" onkeydown="editKey(event)" aria-label="Time of day">
            ${HABIT_SLOTS.map(s=>`<option value="${s.k}"${e.slot===s.k?' selected':''}>${s.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="hed-sect">TRIGGER <span class="wk-habit-ed-opt">a specific cue beats a good intention</span></div>
      <div class="wk-habit-ed-cuerow">
        <select class="wk-habit-freq-sel hed-cuetype" id="hed-cuetype" onchange="editSelect('cueType',this.value)" onkeydown="editKey(event)" aria-label="Kind of cue">
          ${Object.keys(HABIT_CUE_TYPES).map(k=>`<option value="${k}"${e.cueType===k?' selected':''}>${HABIT_CUE_TYPES[k].label}</option>`).join('')}
        </select>
        <input class="wk-habit-ed-in" id="hed-cue" type="text" maxlength="80" value="${q(e.cue)}" placeholder="${q(ct.ph)}"
          oninput="editInput('cue',this.value)" onkeydown="editKey(event)" autocomplete="off">
      </div>

      ${field('hed-tiny','Tiny version','the smallest rep that still counts on a bad day',e.tiny,'e.g. put on my running shoes',80,'tiny')}

      <div class="hed-sect">WHEN IT GETS HARD <span class="wk-habit-ed-opt">if-then plan for the obstacle you actually expect</span></div>
      <div class="wk-habit-ed-cuerow">
        <span class="wk-habit-ed-pre">If</span>
        <input class="wk-habit-ed-in" id="hed-obstacle" type="text" maxlength="80" value="${q(e.obstacle)}" placeholder="I'm exhausted after work"
          oninput="editInput('obstacle',this.value)" onkeydown="editKey(event)" autocomplete="off">
      </div>
      <div class="wk-habit-ed-cuerow">
        <span class="wk-habit-ed-pre">then</span>
        <input class="wk-habit-ed-in" id="hed-fallback" type="text" maxlength="80" value="${q(e.fallback)}" placeholder="I'll do the tiny version"
          oninput="editInput('fallback',this.value)" onkeydown="editKey(event)" autocomplete="off">
      </div>

      ${field('hed-identity','Identity','each check-in is a vote for who you\u2019re becoming',e.identity,'I\u2019m someone who moves every day',80,'identity')}
      ${field('hed-reward','Celebrate with','a small, immediate win right after',e.reward,'e.g. a proper coffee, a fist pump',60,'reward')}

      <div class="wk-habit-ed-btns">
        <span class="wk-habit-ed-spacer"></span>
        <button class="wk-habit-ed-cancel" onclick="cancelEdit()">CANCEL</button>
        <button class="hob-add-btn wk-habit-ed-save" onclick="saveHabitEdit()">SAVE</button>
      </div>
    </div>
  </div>`;
}

function statsHTML(h,todayState,streak){
  const unit=habitUnit(h);
  const started=everDone(h);
  const compliance=complianceRate(h,HABIT_COMPLIANCE_WINDOW_DAYS);
  const winLabel=complianceLabel(h);
  const todayISO=isoDate(bocNow());
  const restNote=(streak>0&&todayState==='confirmed-rest')?' <span class="wk-habit-stats-sub">· resting today</span>':'';
  let weekChip='';
  if(isWeekly(h)){
    const s=habitWeekStats(h,calWeekStart(bocNow()));
    weekChip=`<span class="wk-habit-week${s.met?' met':''}" title="Check-ins this week vs. target">${s.observed}/${s.eff||habitTarget(h)} this week</span> `;
  }
  if(!started){
    return `${weekChip}<span class="wk-habit-flame new" title="No days logged yet — tap the checkbox to start">✦ NOT STARTED</span>`;
  }
  if(!isWeekly(h))return dailyStatsHTML(h,todayState,streak);
  if(streak>0){
    const tier=streakTier(streak,unit);
    const best=Math.max(h.bestStreak||0,streak);
    const isRecordDay=h.bestStreakDate===todayISO&&todayState==='observed'&&streak===best;
    const bestChip=isRecordDay
      ?`<span class="wk-habit-record" title="You just passed your previous best">${hico('trophy','trophy')} NEW RECORD</span>`
      :`<span class="wk-habit-stats-sub">· best ${best}${unit}</span>`;
    return `${weekChip}<span class="wk-habit-flame ${tier}">🔥 ${streak}w</span> · ${compliance}%${restNote} ${bestChip} <span class="wk-habit-stats-sub">(${winLabel})</span>`;
  }
  const best=Math.max(h.bestStreak||0,streak);
  const word='week';
  const bestLabel=best>0?`Beat your ${best}-${word} record`:'Start your streak';
  return `${weekChip}<span class="wk-habit-flame cold" title="A missed ${word} breaks the run, not the progress — best so far is ${best} ${word}${best===1?'':'s'}">↻ ${bestLabel}</span> <span class="wk-habit-stats-sub">· pick back up</span>`;
}

function rowHTML(h,compact){
  if(!compact&&_habitEdit&&_habitEdit.id===h.id)return editorHTML();
  if(h.draft)return draftRowHTML(h);
  const todayISO=isoDate(bocNow());
  const todayState=dayStateOf(h,todayISO);
  const streak=currentHabitStreak(h);
  const tinyToday=h.levels&&h.levels[todayISO]==='tiny';
  const nudge=nudgeText(h,todayState);
  const cueLine=habitCueLine(h);
  const celeb=celebrationHTML(h,compact);
  const isCel=!!(_habitCel&&_habitCel.id===h.id);
  const fresh=isCel&&(Date.now()-_habitCel.t<700);
  const skipReason=(todayState==='confirmed-rest'||todayState==='missed')&&h.reasons&&h.reasons[todayISO]?h.reasons[todayISO]:'';
  const skipTag=skipReason?`<span class="wk-habit-tinytag" title="Why you skipped today">SKIPPED · ${escHTML(skipReason.toUpperCase())}</span>`:'';
  const shieldNote=compact?'':shieldNoteHTML(h);
  const nameEl=compact
    ?`<span class="wk-habit-txt-name">${escHTML(h.title)}</span>`
    :`<span class="wk-habit-txt-name editable" role="button" tabindex="0" title="Click to edit" onclick="startHabitEdit('${h.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();startHabitEdit('${h.id}');}">${escHTML(h.title)}</span>`;
  const tinyBtn=(h.tiny&&todayState!=='observed')
    ?`<button class="wk-habit-tiny-btn" onclick="logHabitDay('${h.id}','observed','tiny')" title="Log the tiny version — it still counts">✦ tiny: ${escHTML(h.tiny)}</button>`:'';
  const tinyTag=(todayState==='observed'&&tinyToday)?`<span class="wk-habit-tinytag" title="Done via the tiny version — still counts">✦ TINY</span>`:'';
  const actions=compact
    ?`${skipBtnHTML(h,todayState)}`
    :`${skipBtnHTML(h,todayState)}
       <button class="wk-habit-edit-btn" onclick="startHabitEdit('${h.id}')" title="Edit — trigger, tiny version, obstacle plan, identity" aria-label="Edit habit">${hico('edit','edit')}</button>
       <button class="wk-habit-hist-btn" onclick="openHabitHistory('${h.id}')" title="View full history — months at a glance" aria-label="History">${hico('chart','chart')}</button>
       <button class="t-btn del" onclick="deleteHabit('${h.id}')" title="Delete habit">✕</button>`;
  let extras='';
  if(!compact){
    if(h.identity)extras+=`<div class="wk-habit-identity" onclick="startHabitEdit('${h.id}')">“${escHTML(h.identity)}”</div>`;
    if(h.obstacle||h.fallback){
      extras+=`<div class="wk-habit-plan" title="Your if-then plan for when it gets hard"><span class="wk-habit-plan-k">HARD DAY</span> If ${escHTML(h.obstacle||'it gets hard')} → ${escHTML(h.fallback||(h.tiny?'do the tiny version':'do the smallest version'))}</div>`;
    }
    if(!h.tiny&&!h.obstacle&&!h.identity&&everDoneOrOld(h)){
      extras+=`<button class="wk-habit-cue-add" onclick="startHabitEdit('${h.id}','tiny')" title="Name the smallest rep that still counts">+ add a tiny version &amp; hard-day plan</button>`;
    }
  }
  return `<div class="wk-habit-row${compact?' compact':''}${fresh?' hb-shine':''}">
      <div class="wk-habit-top">
        <div class="wk-habit-main">
          <div class="t-chk${todayState==='observed'?' done':''}${fresh&&todayState==='observed'?' hb-pop':''}" onclick="logHabitDay('${h.id}','observed')" title="${todayState==='observed'?'Done today — tap to unmark':'Mark done today'}">${todayState==='observed'?'✓':''}</div>
          <div class="wk-habit-txt">${nameEl}<span class="wk-habit-freq">${freqBadge(h)}</span>${tinyTag}${skipTag}</div>
        </div>
        <div class="wk-habit-actions">${actions}</div>
      </div>
      ${cueLine
        ?`<div class="wk-habit-cue"${compact?'':` onclick="startHabitEdit('${h.id}','cue')" title="Click to edit trigger"`}>${escHTML(cueLine)}</div>`
        :(compact?'':`<button class="wk-habit-cue-add" onclick="startHabitEdit('${h.id}','cue')" title="A specific trigger makes a habit far more likely to happen">+ add a trigger — After I… / When I… / If…then</button>`)}
      ${celeb}
      ${tinyBtn}
      ${shieldNote}
      ${nudge?`<div class="wk-habit-nudge">${escHTML(nudge)}</div>`:''}
      <div class="wk-habit-stats-row">${statsHTML(h,todayState,streak)}</div>
      ${compact?'':`<div class="wk-habit-history">${miniHistory(h)}</div>
      ${everDone(h)?'<div class="wk-habit-history-hint">tap a past day above to correct it, or open the full history for the long view</div>':''}
      ${extras}`}
    </div>`;
}
const everDoneOrOld=h=>everDone(h)||h.startDateISO<isoDate(new Date(bocNow().getTime()-2*86400000));

function todaySummary(){
  const today=isoDate(bocNow());
  let due=0,done=0,resting=0;
  habits.forEach(h=>{
    if(h.draft)return;
    const st=dayStateOf(h,today);
    if(st==='confirmed-rest'){resting++;return;}
    if(isWeekly(h)){
      const s=habitWeekStats(h,calWeekStart(bocNow()));
      if(st==='observed'){due++;done++;}
      else if(!s.met&&!s.bridged)due++;
      return;
    }
    due++;if(st==='observed')done++;
  });
  return{due,done,resting,total:activeHabitCount()};
}
function summaryMsg(s){
  if(!s.total)return'';
  if(s.due===0)return'Rest day — your streaks are safe.';
  if(s.done===s.due)return'All done for today. Every rep is a vote for who you\u2019re becoming.';
  const left=s.due-s.done;
  const anyTiny=habits.some(h=>h.tiny&&dayStateOf(h,isoDate(bocNow()))!=='observed');
  return `${left} to go${anyTiny?' — low energy? A tiny version still counts.':'.'}`;
}
function ringSVG(done,due,size){
  const r=(size-8)/2,c=2*Math.PI*r,pct=due>0?done/due:0;
  return `<svg class="hb-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--bdr2)" stroke-width="4"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${pct>=1?'var(--green)':'var(--amber)'}" stroke-width="4" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c*(1-pct)).toFixed(1)}" transform="rotate(-90 ${size/2} ${size/2})" style="transition:stroke-dashoffset .5s var(--ease-out)"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" class="hb-ring-txt">${due>0?done+'/'+due:'—'}</text>
  </svg>`;
}

function habitInsights(){
  const span=28,out=[];
  const daily=habits.filter(h=>!isWeekly(h)&&everDone(h));
  if(!daily.length)return out;
  const today=isoDate(bocNow());
  const dow=Array.from({length:7},()=>({o:0,t:0}));
  const slot={};
  let allDone=0,allTotal=0,tinyDays=0;
  daily.forEach(h=>{
    const s=slotOf(h);slot[s]=slot[s]||{o:0,t:0};
    let cursor=bocNow();
    for(let i=0;i<span;i++){
      const iso=isoDate(cursor);
      if(iso>=h.startDateISO&&!(iso===today&&dayStateOf(h,iso)==='unobserved')){
        const st=dayStateOf(h,iso);
        if(st!=='confirmed-rest'){
          const d=cursor.getDay(),obs=st==='observed'?1:0;
          dow[d].t++;dow[d].o+=obs;slot[s].t++;slot[s].o+=obs;allTotal++;allDone+=obs;
          if(obs&&h.levels&&h.levels[iso]==='tiny')tinyDays++;
        }
      }
      cursor=new Date(cursor.getTime()-86400000);
    }
  });
  if(allTotal<10)return out;
  const overall=Math.round(allDone/allTotal*100);
  const dayNames=['Sundays','Mondays','Tuesdays','Wednesdays','Thursdays','Fridays','Saturdays'];
  let worst=-1,worstRate=101;
  dow.forEach((b,d)=>{if(b.t>=4){const r=Math.round(b.o/b.t*100);if(r<worstRate){worstRate=r;worst=d;}}});
  if(worst>=0&&overall-worstRate>=20){
    out.push({ico:hico('trend-down','down'),txt:`Your habits slip most on ${dayNames[worst]} (${worstRate}% vs ${overall}% overall). Plan a tiny version for that day — don\u2019t rely on willpower.`});
  }
  const slots=Object.keys(slot).filter(k=>slot[k].t>=8);
  if(slots.length>=2){
    const rates=slots.map(k=>({k,r:Math.round(slot[k].o/slot[k].t*100)})).sort((a,b)=>a.r-b.r);
    if(rates[rates.length-1].r-rates[0].r>=25){
      const lbl=HABIT_SLOTS.find(s=>s.k===rates[0].k).label.toLowerCase();
      out.push({ico:hico('clock','clock'),txt:`${lbl.charAt(0).toUpperCase()+lbl.slice(1)} habits are your weak spot (${rates[0].r}%). Try a stronger trigger there, or move one to ${HABIT_SLOTS.find(s=>s.k===rates[rates.length-1].k).label.toLowerCase()}.`});
    }
  }
  if(tinyDays>0){
    out.push({ico:hico('sparkle','spark'),txt:`You used a tiny version on ${tinyDays} day${tinyDays===1?'':'s'} this month — each one kept the chain alive. That\u2019s the system working.`});
  }
  if(!out.length&&overall>=80){
    out.push({ico:hico('check-circle','ok'),txt:`${overall}% over the last 4 weeks — solid. Resist adding more until this feels automatic.`});
  }
  return out.slice(0,3);
}

function starterChips(){
  const idx=HABIT_STARTERS.map((s,i)=>i).filter(i=>!habits.some(h=>h.title===HABIT_STARTERS[i].title)).slice(0,4);
  if(!idx.length||activeHabitCount()>=HABIT_MAX)return'';
  return `<div class="hb-starters"><span class="hb-starters-lbl">Starter ideas — each comes with a trigger and a tiny version</span>
    <div class="hb-starter-chips">${idx.map(i=>`<button class="hb-starter" onclick="addHabitStarter(${i})" title="${escHTML(habitCueLine(HABIT_STARTERS[i]))}">+ ${escHTML(HABIT_STARTERS[i].title)}</button>`).join('')}</div></div>`;
}

function habitsEnabled(){return typeof appSettings==='undefined'||appSettings.habitsEnabled!==false;}
function syncEnabled(){
  const on=habitsEnabled();
  if(typeof applyFocusMode==='function')applyFocusMode();
  else{const nav=$('nav-habits');if(nav)nav.style.display=on?'':'none';}
  const v=$('view-habits');
  if(!on&&v&&v.classList.contains('active')&&typeof showView==='function')showView('tasks');
}

function renderHabits(){
  syncEnabled();
  renderFocusHabits();
  const list=$('hb-list');
  if(!list)return;
  const view=$('view-habits');
  const onTab=view&&view.classList.contains('active');
  if(habitsEnabled()&&onTab)showHabitsIntro();
  const ae=document.activeElement;
  const focusId=(_habitEdit&&ae&&list.contains(ae)&&ae.id)?ae.id:null;
  const selFrom=focusId&&ae.selectionStart!=null&&ae.type!=='select-one'?ae.selectionStart:null;
  const selTo=focusId&&ae.selectionEnd!=null&&ae.type!=='select-one'?ae.selectionEnd:null;

  const sum=todaySummary();
  const sumEl=$('hb-summary');
  if(sumEl){
    sumEl.style.display=habits.length?'flex':'none';
    sumEl.innerHTML=habits.length?`${ringSVG(sum.done,sum.due,64)}<div class="hb-summary-txt"><div class="hb-summary-hd">${sum.due===0?'Resting today':sum.done===sum.due?'Done for today':'Today'}</div><div class="hb-summary-sub">${escHTML(summaryMsg(sum))}</div></div>`:'';
  }
  const sub=$('hb-sub');
  if(sub)sub.textContent=bocNow().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

  if(!habits.length){
    list.innerHTML='<div class="empty-sec hb-empty">No habits yet. Start with <strong>one</strong> — small and honest beats ambitious and abandoned.</div>';
  }else{
    const groups=HABIT_SLOTS.map(s=>({s,items:habits.filter(h=>!h.draft&&slotOf(h)===s.k)})).filter(g=>g.items.length);
    const showHeads=groups.length>1||(groups.length===1&&groups[0].s.k!=='anytime');
    list.innerHTML=groups.map(g=>`${showHeads?`<div class="hb-slot-hd"><span>${g.s.ico}</span> ${g.s.label}</div>`:''}${g.items.map(h=>rowHTML(h,false)).join('')}`).join('')+draftsSection();
  }

  const insights=habitInsights();
  const insEl=$('hb-insights');
  if(insEl){
    insEl.style.display=insights.length?'block':'none';
    insEl.innerHTML=insights.length?`<div class="plan-card-hdr"><div class="plan-card-title">What your data says</div><div class="plan-card-meta">last 4 weeks</div></div>${insights.map(i=>`<div class="hb-insight"><span class="hb-insight-ico">${i.ico}</span><span>${escHTML(i.txt)}</span></div>`).join('')}`:'';
  }

  const addRow=$('hb-add-row');
  if(addRow)addRow.style.display=activeHabitCount()>=HABIT_MAX?'none':'flex';
  const cap=$('hb-cap');
  if(cap)cap.textContent=`${activeHabitCount()}/${HABIT_MAX}${activeHabitCount()>=HABIT_MAX?' — full. Master these before adding more.':''}`;
  const st=$('hb-starters-mount');
  if(st)st.innerHTML=starterChips();

  if(focusId){
    const el=$(focusId);
    if(el){el.focus();if(selFrom!=null&&el.setSelectionRange){try{el.setSelectionRange(selFrom,selTo);}catch(_){}}}
  }
}

function renderFocusHabits(){
  const mount=$('focus-habits-mount');
  if(!mount)return;
  const liveHabits=habits.filter(h=>!h.draft);
  if(!liveHabits.length){
    mount.innerHTML='<div class="empty-sec">No habits yet.</div><button class="hob-add-btn hb-focus-link" onclick="closeFocusHabits();showView(\'habits\')">SET UP HABITS →</button>';
    return;
  }
  const sum=todaySummary();
  mount.innerHTML=`<div class="hb-focus-sum">${escHTML(sum.due===0?'Resting today':`${sum.done} of ${sum.due} done`)}</div>
    ${liveHabits.map(h=>rowHTML(h,true)).join('')}
    <button class="wk-habit-ed-cancel hb-focus-link" onclick="closeFocusHabits();showView('habits')">EDIT HABITS →</button>`;
}

const HABIT_HEATMAP_RANGES={'3m':3,'6m':6,'1y':12};
let histId=null;
let histRange='6m';

function openHabitHistory(id){
  const h=habits.find(x=>x.id===id);if(!h)return;
  histId=id;histRange='6m';
  histModal();
  $('habit-history-overlay').classList.add('open');
}
function closeHabitHistory(){
  $('habit-history-overlay').classList.remove('open');
  histId=null;
}
function setHabitHistRange(r){
  if(!HABIT_HEATMAP_RANGES[r])return;
  histRange=r;
  histModal();
}
function histModal(){
  const h=habits.find(x=>x.id===histId);
  if(!h){closeHabitHistory();return;}
  const streak=currentHabitStreak(h);
  const best=Math.max(h.bestStreak||0,streak);
  const started=everDone(h);
  const compliance=complianceRate(h,HABIT_COMPLIANCE_WINDOW_DAYS);
  const unit=habitUnit(h);
  const tier=streakTier(streak,unit);

  const cons=(!isWeekly(h)&&started)?consistencyOf(h,14):null;
  $('hh-title').textContent=h.title;
  $('hh-freq').textContent=freqBadge(h);
  $('hh-stats').innerHTML=`
    <div class="hh-stat"><span class="hh-stat-val hh-flame ${started&&streak>0?tier:'cold'}">${started?hico('flame','flame')+' '+streak+(unit==='w'?'w':''):'—'}</span><span class="hh-stat-lbl">current streak${unit==='w'?' (weeks)':''}</span></div>
    <div class="hh-stat"><span class="hh-stat-val">${best}${unit==='w'?'w':''}</span><span class="hh-stat-lbl">best streak${unit==='w'?' (weeks)':''}</span></div>
    <div class="hh-stat"><span class="hh-stat-val">${cons&&cons.n?cons.done+'/'+cons.n:'—'}</span><span class="hh-stat-lbl">last 14 days</span></div>
    <div class="hh-stat"><span class="hh-stat-val">${started?compliance+'%':'—'}</span><span class="hh-stat-lbl">${complianceLabel(h)} compliance</span></div>
  `;
  document.querySelectorAll('.hh-range-btn').forEach(b=>b.classList.toggle('on',b.dataset.range===histRange));
  const months=HABIT_HEATMAP_RANGES[histRange];
  $('hh-heatmap').innerHTML=heatmapHTML(h,months);
  $('hh-monthly').innerHTML=monthlyHTML(h,months);
}

function heatmapHTML(h,monthsBack){
  const today=bocNow();today.setHours(0,0,0,0);
  const todayISO=isoDate(today);
  const everObserved=everDone(h);

  const heatSim=isWeekly(h)?{covered:{}}:habitSim(h);
  const start=new Date(today);
  start.setMonth(start.getMonth()-monthsBack);
  start.setDate(start.getDate()-start.getDay());
  const end=new Date(today);
  end.setDate(end.getDate()+(6-end.getDay()));

  const weeks=[];
  let week=[];
  for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){
    week.push(new Date(d));
    if(week.length===7){weeks.push(week);week=[];}
  }

  const cols=weeks.length;
  let monthLabels='';
  let lastCol=-99;
  weeks.forEach((wk,wi)=>{
    const first=wk.find(d=>d.getDate()===1);
    if(first&&wi-lastCol>=2){
      monthLabels+=`<div class="hh-month-lbl" style="grid-column:${wi+1}">${first.toLocaleDateString('en-US',{month:'short'})}</div>`;
      lastCol=wi;
    }
  });

  let cells='';
  weeks.forEach((wk,wi)=>{
    wk.forEach((d,di)=>{
      const iso=isoDate(d);
      let cls='hh-cell',title=iso,clickable=false;
      if(iso>todayISO){cls+=' future';title='';}
      else if(iso<h.startDateISO){cls+=' unset';title='Before this habit was added';}
      else if(!everObserved){
        if(iso===todayISO){cls+=' pending';title=`${iso} — not started yet, tap to begin`;clickable=true;}
        else{cls+=' unset';title=`${iso} — habit not started yet`;}
      }else{
        const st=dayStateOf(h,iso);
        if(st==='observed'){const tn=h.levels&&h.levels[iso]==='tiny';cls+=' observed'+(tn?' tiny':'');title=`${iso} — ${tn?'done (tiny version)':'done'}`;}
        else if(st==='confirmed-rest'){cls+=' rest';title=`${iso} — rest day`;}
        else if(heatSim.covered[iso]){cls+=' covered';title=`${iso} — covered by a streak shield`;}
        else if(st==='missed'){cls+=' missed';title=`${iso} — missed`;}
        else if(iso===todayISO){cls+=' pending';title=`${iso} — not logged yet`;}
        else if(isWeekly(h)){cls+=' off';title=`${iso} — no check-in`;}
        else{cls+=' missed';title=`${iso} — missed`;}
        clickable=true;
      }
      if(clickable){
        cls+=' editable';
        const onTap=iso===todayISO?`logHabitDay('${h.id}','observed');histModal();`:`cycleDay('${h.id}','${iso}');histModal();`;
        cells+=`<div class="${cls}" style="grid-column:${wi+1};grid-row:${di+1}" title="${title}${iso===todayISO?'':' — tap to correct'}" role="button" tabindex="0" onclick="${onTap}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();${onTap}}"></div>`;
      }else{
        cells+=`<div class="${cls}" style="grid-column:${wi+1};grid-row:${di+1}" title="${title}"></div>`;
      }
    });
  });

  return `<div class="hh-heatmap-scroll">
    <div class="hh-heatmap-inner">
      <div class="hh-dow-col"><span>Sun</span><span></span><span>Tue</span><span></span><span>Thu</span><span></span><span>Sat</span></div>
      <div class="hh-grid-cols">
        <div class="hh-month-row" style="grid-template-columns:repeat(${cols},11px)">${monthLabels}</div>
        <div class="hh-grid" style="grid-template-columns:repeat(${cols},11px)">${cells}</div>
      </div>
    </div>
  </div>
  <div class="hh-legend">
    <span>Less</span>
    <span class="hh-cell unset" style="position:static"></span>
    <span class="hh-cell missed" style="position:static"></span>
    <span class="hh-cell rest" style="position:static"></span>
    <span class="hh-cell observed" style="position:static"></span>
    <span>More</span>
  </div>`;
}

function monthlyHTML(h,monthsBack){
  const today=bocNow();
  const months=[];
  for(let i=monthsBack-1;i>=0;i--)months.push(new Date(today.getFullYear(),today.getMonth()-i,1));

  const bars=months.map(monthStart=>{
    const y=monthStart.getFullYear(),m=monthStart.getMonth();
    const monthLen=new Date(y,m+1,0).getDate();
    const thisMonth=(y===today.getFullYear()&&m===today.getMonth());
    const lastDay=thisMonth?today.getDate():monthLen;
    let observed=0,rest=0,tracked=0;
    for(let day=1;day<=lastDay;day++){
      const iso=isoDate(new Date(y,m,day));
      if(iso<h.startDateISO||iso>isoDate(today))continue;
      tracked++;
      const st=dayStateOf(h,iso);
      if(st==='observed')observed++;else if(st==='confirmed-rest')rest++;
    }
    const denom=isWeekly(h)?Math.max(1,Math.round(habitTarget(h)*(tracked-rest)/7)):tracked-rest;
    const pct=(tracked-rest)>0?Math.min(100,Math.round(observed/denom*100)):null;
    return{label:monthStart.toLocaleDateString('en-US',{month:'short'}),pct};
  });

  return `<div class="hh-monthly-title">Monthly compliance</div>
  <div class="hh-monthly-row">${bars.map(b=>`
    <div class="hh-monthly-col">
      <div class="hh-monthly-bar-track" title="${b.pct===null?'No tracked days':b.pct+'% compliant'}"><div class="hh-monthly-bar-fill" style="height:${b.pct===null?0:Math.max(b.pct,b.pct>0?4:0)}%"></div></div>
      <div class="hh-monthly-pct">${b.pct===null?'—':b.pct+'%'}</div>
      <div class="hh-monthly-lbl">${b.label}</div>
    </div>`).join('')}</div>`;
}

const RB_CHAPTERS=[
  {k:'method',  label:'Method'},
  {k:'letters', label:'A–E'},
  {k:'which',   label:'Which letter?'},
  {k:'practice',label:'In practice'}
];
const RB_LETTERS={
  A:{name:'MUST DO',color:'var(--pa)',
     line:'Serious consequences if it isn\u2019t done.',
     test:'What\u2019s the worst realistic outcome if I skip this today?',
     body:'These are your \u201cfrogs\u201d. Sub-rank them A-1, A-2, A-3 (three at most). Start A-1 immediately and stay on it until it\u2019s complete.',
     eg:'Submit the proposal due tomorrow · Pay the overdue invoice · Prepare the exam that\u2019s in two days',
     trap:'\u201cEverything is an A.\u201d If you have six, you haven\u2019t ranked yet — ask which one has the worst consequence. Also: loud \u2260 serious. A ping is urgent; it isn\u2019t automatically an A.'},
  B:{name:'SHOULD DO',color:'var(--pb)',
     line:'Mild consequences if delayed.',
     test:'Would someone be mildly inconvenienced, or would I pay a small cost, if this slipped?',
     body:'Important but not urgent. Never touch a B while any A is undone.',
     eg:'Reply to a colleague\u2019s non-urgent email · Prep next week\u2019s meeting · Book the dentist',
     trap:'B tasks quietly turn into A tasks as deadlines approach. Give them a slot on the calendar before they do.'},
  C:{name:'NICE TO DO',color:'var(--pc)',
     line:'No real consequences either way.',
     test:'If this never happened, would anyone — including me — notice in a week?',
     body:'Only after every A and B is handled. Fine as a reward or as filler between blocks.',
     eg:'Tidy the desktop · Read an interesting article · Reorganise a folder',
     trap:'C tasks feel productive because they\u2019re easy. That\u2019s procrastination in a work costume — they\u2019re the first thing people reach for to avoid an A.'},
  D:{name:'DELEGATE',color:'var(--pd)',
     line:'Someone else can do it.',
     test:'Does this need my skill, my decision, or my presence — or just a person?',
     body:'If it doesn\u2019t require you specifically, hand it off to free yourself for A tasks.',
     eg:'Booking travel · Data entry · Anything a teammate could do 80% as well',
     trap:'\u201cFaster if I do it myself\u201d is a short-term trade that costs you every week. And delegating without a follow-up isn\u2019t delegating — track it on the Delegate Board (Weekly → Plan).'},
  E:{name:'ELIMINATE',color:'var(--pe)',
     line:'Remove it entirely.',
     test:'What happens if I never do this?',
     body:'If the honest answer is \u201cnothing important\u201d, eliminate it. Also ask: \u201cKnowing what I know now, would I start this today?\u201d',
     eg:'A report nobody reads · A recurring meeting with no outcome · A \u201csomeday\u201d item you\u2019ve carried for months',
     trap:'Keeping it \u201cjust in case.\u201d Every item you carry costs attention. Deleting is a decision, not a failure.'}
};
const RB_FLOW=[
  {q:'If you never did this, would anything important happen?',hint:'Think consequences, not guilt or habit.',yes:1,no:'E'},
  {q:'Does it have to be you — your skill, your decision, your presence?',hint:'If someone else could do it 80% as well, the answer is no.',yes:2,no:'D'},
  {q:'Are there serious consequences if it isn\u2019t done today (or by its deadline)?',hint:'Lost money or trust, a missed deadline, a real problem getting worse.',yes:'A',no:3},
  {q:'Would delaying it cause mild consequences?',hint:'Someone mildly inconvenienced, a small cost, a slower week.',yes:'B',no:'C'}
];
const RB_ACTION={
  A:'Rank it among your A\u2019s (A-1, A-2, A-3) and start the top one now.',
  B:'Put it on the calendar so it doesn\u2019t become an A. Don\u2019t start it while an A is open.',
  C:'Park it. Do it only after A and B are clear — or as a reward.',
  D:'Hand it off, then add it to the Delegate Board so you remember to follow up.',
  E:'Delete it. If it comes back, it wasn\u2019t an E.'
};
let _rbChap='method',_rbStep=0,_rbResult=null;

// "Seen" = the person has opened the Rulebook or dismissed the intro card. Until then the Tasks screen shows the
// "New here?" card and the header Rulebook button is labelled and gently pulses, so a new user can find it.
const RB_SEEN_KEY='bloc_rb_seen_v1';
function rbSeen(){try{return localStorage.getItem(RB_SEEN_KEY)==='1';}catch(e){return true;}}
function rbRefreshIntro(){
  const seen=rbSeen();
  const card=$('rb-intro');if(card)card.style.display=seen?'none':'';
  const btn=$('rulebook-btn');if(btn)btn.classList.toggle('fresh',!seen);
}
function rbMarkSeen(){try{localStorage.setItem(RB_SEEN_KEY,'1');}catch(e){}rbRefreshIntro();}
function rbIntroDismiss(){rbMarkSeen();}
function rbOpenLetter(L){openRulebook('letters');rbScrollTo(L);}
function rbIntroOpen(L){rbOpenLetter(L);}

function openRulebook(chap){
  if(chap&&RB_CHAPTERS.some(c=>c.k===chap)){_rbChap=chap;if(chap==='which'){_rbStep=0;_rbResult=null;}}
  closeSidePanels('rulebook-panel');
  rbMarkSeen();
  renderRulebook();
  $('rulebook-backdrop').classList.add('open');
  $('rulebook-panel').classList.add('open');
}
function closeRulebook(){
  $('rulebook-backdrop').classList.remove('open');
  $('rulebook-panel').classList.remove('open');
}
function rulebookIsOpen(){const p=$('rulebook-panel');return !!(p&&p.classList.contains('open'));}
function setRulebookChapter(k){
  if(!RB_CHAPTERS.some(c=>c.k===k))return;
  _rbChap=k;
  if(k==='which'){_rbStep=0;_rbResult=null;}
  renderRulebook();
  const b=$('rb-body');if(b)b.scrollTop=0;
}
function rbAnswer(yes){
  const s=RB_FLOW[_rbStep];if(!s)return;
  const nxt=yes?s.yes:s.no;
  if(typeof nxt==='number')_rbStep=nxt;else _rbResult=nxt;
  renderRulebook();
}
function rbRestart(){_rbStep=0;_rbResult=null;renderRulebook();}

function rbLetterBadge(L,size){
  return `<span class="rb-badge" style="color:${RB_LETTERS[L].color};border-color:${RB_LETTERS[L].color};${size?`width:${size}px;height:${size}px;font-size:${Math.round(size*.55)}px`:''}">${L}</span>`;
}
function rbChapterHTML(){
  if(_rbChap==='method'){
    return `<p class="rb-lead">Give every task a letter based on its <strong>consequences</strong>. Work from A to E — never do a lower-priority task while a higher one is still open.</p>
      <div class="rb-glance">${Object.keys(RB_LETTERS).map(L=>`
        <button class="rb-glance-row" onclick="setRulebookChapter('letters');rbScrollTo('${L}')">
          ${rbLetterBadge(L,30)}
          <span class="rb-glance-txt"><span class="rb-glance-name">${RB_LETTERS[L].name}</span><span class="rb-glance-line">${RB_LETTERS[L].line}</span></span>
        </button>`).join('')}</div>
      <div class="rb-quote">\u201cDiscipline yourself to start immediately on your A-1 task and stay at it until it is complete.\u201d<span>— Brian Tracy</span></div>
      <button class="rb-cta" onclick="setRulebookChapter('which')">Not sure what a task is? Ask the 4-question helper →</button>`;
  }
  if(_rbChap==='letters'){
    return Object.keys(RB_LETTERS).map(L=>{const l=RB_LETTERS[L];return `
      <div class="rb-letter" id="rb-letter-${L}" data-t="${L}" style="--rb-c:${l.color}">
        <div class="rb-letter-hd">${rbLetterBadge(L,34)}<div><div class="rb-letter-name">${l.name}</div><div class="rb-letter-line">${l.line}</div></div></div>
        <p>${l.body}</p>
        <div class="rb-row"><span class="rb-k">THE TEST</span><span>${l.test}</span></div>
        <div class="rb-row"><span class="rb-k">EXAMPLES</span><span>${l.eg}</span></div>
        <div class="rb-row rb-trap"><span class="rb-k">THE TRAP</span><span>${l.trap}</span></div>
      </div>`;}).join('');
  }
  if(_rbChap==='which'){
    if(_rbResult){
      const l=RB_LETTERS[_rbResult];
      return `<div class="rb-result" style="--rb-c:${l.color}">
        ${rbLetterBadge(_rbResult,64)}
        <div class="rb-result-name">${_rbResult} — ${l.name}</div>
        <p>${RB_ACTION[_rbResult]}</p>
        <div class="rb-result-btns">
          <button class="rb-cta ghost" onclick="rbRestart()">↻ CLASSIFY ANOTHER</button>
          <button class="rb-cta ghost" onclick="setRulebookChapter('letters');rbScrollTo('${_rbResult}')">READ THE RULE</button>
        </div>
      </div>`;
    }
    const s=RB_FLOW[_rbStep];
    return `<div class="rb-q">
      <div class="rb-q-step">QUESTION ${_rbStep+1}</div>
      <div class="rb-q-text">${s.q}</div>
      <div class="rb-q-hint">${s.hint}</div>
      <div class="rb-q-btns"><button class="rb-yes" onclick="rbAnswer(true)">YES</button><button class="rb-no" onclick="rbAnswer(false)">NO</button></div>
      ${_rbStep>0?'<button class="rb-q-back" onclick="rbRestart()">↻ start over</button>':''}
    </div>`;
  }
  // practice
  return `<div class="rb-sect">THE DAILY LOOP</div>
    <ol class="rb-steps">
      <li><strong>Dump it.</strong> Get everything out of your head — press <kbd>Q</kbd> for quick capture.</li>
      <li><strong>Letter it.</strong> One letter per task. Unsure? Use the helper.</li>
      <li><strong>Rank your A\u2019s.</strong> A-1, A-2, A-3 — three at most.</li>
      <li><strong>Start A-1.</strong> Open a Focus Block (<kbd>F</kbd>) and stay until it\u2019s done.</li>
      <li><strong>Clear D and E.</strong> Hand off, delete — before they eat the morning.</li>
      <li><strong>Close the day.</strong> What stayed undone, and which letter was it really?</li>
    </ol>
    <div class="rb-sect">RULES OF THUMB</div>
    <ul class="rb-rules">
      <li>No B while an A is open. No C while a B is open.</li>
      <li>If it\u2019s been an A for a week, it\u2019s a project — break it down.</li>
      <li>A day of only C\u2019s is a day avoided, not a day lived.</li>
      <li>Re-letter when facts change: a B near its deadline is now an A.</li>
    </ul>
    <div class="rb-sect">WARNING SIGNS</div>
    <ul class="rb-rules">
      <li>More than three A\u2019s → you haven\u2019t decided what matters.</li>
      <li>Your A\u2019s never get done → they\u2019re too big, or you\u2019re hiding in C\u2019s.</li>
      <li>Nothing is ever an E → you\u2019re hoarding obligations.</li>
    </ul>`;
}
function rbScrollTo(L){
  setTimeout(()=>{const el=$('rb-letter-'+L);if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'});},40);
}
function renderRulebook(){
  const tabs=$('rb-tabs'),rbBody=$('rb-body');
  if(!tabs||!rbBody)return;
  tabs.innerHTML=RB_CHAPTERS.map(c=>`<button class="rb-tab${c.k===_rbChap?' on':''}" role="tab" aria-selected="${c.k===_rbChap}" onclick="setRulebookChapter('${c.k}')">${c.label}</button>`).join('');
  rbBody.innerHTML=rbChapterHTML();
}
rbRefreshIntro();

const PZ_KEY='bloc_personalize_v1';
const PZ_LETTERS=['A','B','C','D','E'];
const PZ_FIELDS={name:24,desc:200,line:160,test:220,eg:260,trap:320};

const PZ_DEFAULTS=(()=>{
  const d={};
  PZ_LETTERS.forEach(L=>{
    const sec=SECTS.find(s=>s.type===L)||{},rb=RB_LETTERS[L]||{};
    d[L]={name:sec.name||'',desc:sec.desc||'',line:rb.line||'',test:rb.test||'',eg:rb.eg||'',trap:rb.trap||''};
  });
  return d;
})();
const PZ_RB_NAME_DEFAULTS=(()=>{const d={};PZ_LETTERS.forEach(L=>{d[L]=(RB_LETTERS[L]||{}).name||'';});return d;})();

let pzState=loadMigratedStore(PZ_KEY,{role:'',context:'',overrides:null,at:0},null);
function pzSave(){try{localStorage.setItem(PZ_KEY,JSON.stringify(pzState));}catch(e){}}

function pzClean(v,max){
  return String(v==null?'':v).replace(/<[^>]*>/g,'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
}

function pzApply(overrides){
  PZ_LETTERS.forEach(L=>{
    const o=(overrides&&overrides[L])||{};
    const sec=SECTS.find(s=>s.type===L);
    Object.keys(PZ_FIELDS).forEach(f=>{
      const text=o[f]?escHTML(o[f]):PZ_DEFAULTS[L][f];
      if(f==='name'){
        if(sec){sec.name=text;sec.nameRaw=o.name||PZ_DEFAULTS[L].name;}
        if(RB_LETTERS[L])RB_LETTERS[L].name=o.name?escHTML(o.name.toUpperCase()):PZ_RB_NAME_DEFAULTS[L];
      }else if(f==='desc'){if(sec)sec.desc=text;}
      else if(RB_LETTERS[L])RB_LETTERS[L][f]=text;
      if(f==='eg'&&sec){sec.eg=o.eg?text:'';sec.egRaw=o.eg||'';}
    });
  });
  try{
    const sel=document.getElementById('new-type');
    if(sel)PZ_LETTERS.forEach(L=>{
      const opt=Array.from(sel.options).find(x=>x.value===L),sec=SECTS.find(x=>x.type===L);
      if(opt&&sec)opt.textContent=L+' — '+(sec.nameRaw||sec.name);
    });
  }catch(e){}
}
function pzRefreshUI(){
  try{if(typeof renderTasks==='function')renderTasks();}catch(e){}
  try{if(typeof rulebookIsOpen==='function'&&rulebookIsOpen())renderRulebook();}catch(e){}
}

function pzBuildPrompt(){
  const skeleton={};
  PZ_LETTERS.forEach(L=>{skeleton[L]=PZ_DEFAULTS[L];});
  return `You are helping me adapt the wording of a personal productivity app called BLOC. BLOC sorts every task into five letters by CONSEQUENCES: A = Must Do, B = Should Do, C = Nice to Do, D = Delegate, E = Eliminate. The method is the same for everyone. I only want the EXAMPLES and phrasing to speak MY language.

ABOUT ME
You already know me — my profession, field, the kind of work I do and how my days go — from our previous conversations and your memory of me. Use that. Do NOT ask me questions and do NOT ask me to describe myself. (Only if you truly know nothing about my work, use realistic examples for a typical busy professional and carry on.)

BELOW IS THE CURRENT GENERIC WORDING (JSON). Rewrite it for me.
${JSON.stringify(skeleton,null,2)}

RULES
1. Keep the MEANING of every letter exactly as it is. A is still "serious consequences", E is still "remove it", and so on. Do not change the method — only the wording and examples.
2. "name" = the section title, 1 to 3 words, MAX 20 characters. It replaces "Must Do", "Should Do", etc. with a label that sounds natural in MY world, while still making the priority level instantly obvious (A must feel like the most urgent, E must clearly mean "drop it"). Keep D = handing it off and E = removing it recognisable. "desc" = a one-line subtitle for the section. "line" = a short one-sentence summary. "test" = the one question I ask myself. "eg" = exactly three realistic examples from MY work, separated by " · ". "trap" = the common mistake someone in MY situation makes with that letter.
3. Use real situations from my field (the tools, deadlines, people and jargon I'd actually meet). Avoid generic office examples unless they truly apply to me.
4. Plain text only. No HTML, no Markdown, no emoji, no code. Keep each value short (name ≤ 20 characters, desc ≤ 150 characters, line ≤ 120, test ≤ 180, eg ≤ 220, trap ≤ 280).
5. Return ONLY one JSON object with exactly this structure (keys A, B, C, D, E, each with name, desc, line, test, eg, trap). No explanation before or after it, and no code fences.`;
}

function pzExtractJSON(raw){
  let s=String(raw||'').trim().replace(/^```[a-zA-Z]*\s*/,'').replace(/```\s*$/,'').trim();
  const a=s.indexOf('{'),b=s.lastIndexOf('}');
  if(a===-1||b<=a)return null;
  try{return JSON.parse(s.slice(a,b+1));}catch(e){return null;}
}
function pzValidate(parsed){
  const errors=[],clean={};
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return{errors:['That doesn\u2019t look like valid JSON — copy the whole { … } block from your AI, including the outer curly braces.'],clean};
  PZ_LETTERS.forEach(L=>{
    const o=parsed[L];
    if(!o||typeof o!=='object'){errors.push(`Missing the "${L}" entry.`);return;}
    clean[L]={};
    Object.keys(PZ_FIELDS).forEach(f=>{
      const v=pzClean(o[f],PZ_FIELDS[f]);
      if(f==='name'&&v.length<2)return;
      if(v.length<3)errors.push(`"${L}" is missing a usable "${f}".`);
      else clean[L][f]=v;
    });
  });
  return{errors,clean};
}

function pzOpen(){
  const ov=$('pz-overlay');if(!ov)return;
  $('pz-paste').value='';
  pzShowMsg('');
  pzRenderStatus();
  const btn=$('pz-copy-btn');if(btn){btn.textContent='📋 COPY THE PROMPT';btn.classList.remove('copied');}
  ov.classList.add('open');
}
function pzClose(){const ov=$('pz-overlay');if(ov)ov.classList.remove('open');}
function pzShowMsg(msg,ok){
  const el=$('pz-msg');if(!el)return;
  el.style.display=msg?'':'none';el.textContent=msg||'';el.classList.toggle('ok',!!ok);
}
function pzRenderStatus(){
  const el=$('pz-status');if(!el)return;
  const on=!!pzState.overrides;
  el.innerHTML=on?'<strong>Personalized wording is ON.</strong>':'Using the standard wording.';
  const r=$('pz-reset-btn');if(r)r.style.display=on?'':'none';
}
async function pzCopyPrompt(){
  const text=pzBuildPrompt();
  let ok=true;
  try{await navigator.clipboard.writeText(text);}
  catch(e){
    try{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();document.execCommand('copy');document.body.removeChild(ta);}
    catch(e2){ok=false;}
  }
  pzShowMsg('');
  const btn=$('pz-copy-btn');
  if(btn){
    btn.textContent=ok?'✓ COPIED — NOW PASTE IT INTO YOUR AI':'Couldn\u2019t copy automatically — see below';
    btn.classList.toggle('copied',ok);
    setTimeout(()=>{if(btn){btn.textContent='📋 COPY THE PROMPT';btn.classList.remove('copied');}},3200);
  }
  if(!ok){const ta=$('pz-paste');ta.value=text;ta.select();pzShowMsg('Select all the text in the box below, copy it, and paste it into your AI. Then clear the box and paste the answer here.');}
}
function pzSubmit(){
  const {errors,clean}=pzValidate(pzExtractJSON($('pz-paste').value));
  if(errors.length){pzShowMsg(errors.slice(0,4).join(' ')+(errors.length>4?' …':''));return;}
  pzState.overrides=clean;pzState.at=Date.now();pzSave();
  pzApply(clean);pzRefreshUI();pzRenderStatus();
  $('pz-paste').value='';
  pzShowMsg('Done — look at the Tasks tab: each section now shows examples from your own work. The 📖 Rulebook has the full version.',true);
  if(typeof showToast==='function')showToast('WORDING PERSONALIZED');
}
function pzReset(){
  if(!confirm('Go back to the standard wording?'))return;
  pzState.overrides=null;pzSave();pzApply(null);pzRefreshUI();pzRenderStatus();
  pzShowMsg('Back to the standard wording.',true);
}

if(pzState&&pzState.overrides)pzApply(pzState.overrides);

const GOAL_KEY='bloc_goals_v1';
let goals=loadMigratedStore(GOAL_KEY,[],function(store){
  let changed=false;
  store.forEach(g=>{ if(!g.taskIds){g.taskIds=[];changed=true;} });
  return changed;
});
function saveGoals(){localStorage.setItem(GOAL_KEY,JSON.stringify(goals));}
let _goalPickerOpen={};

function addGoal(title,targetDateISO){
  if(!title||!title.trim())return;
  if(goals.length>=5){showToast('MAX 5 EPICS — FINISH OR REMOVE ONE FIRST');return;}
  goals.push({id:'g_'+Date.now(),title:title.trim(),targetDateISO:targetDateISO||null,taskIds:[]});
  saveGoals();renderGoals();
}
function deleteGoal(id){goals=goals.filter(g=>g.id!==id);delete _goalPickerOpen[id];saveGoals();renderGoals();}
function linkTaskToGoal(goalId,taskId){
  const g=goals.find(x=>x.id===goalId);if(!g)return;
  if(!g.taskIds.includes(taskId))g.taskIds.push(taskId);
  saveGoals();renderGoals();
}
function unlinkTaskFromGoal(goalId,taskId){
  const g=goals.find(x=>x.id===goalId);if(!g)return;
  g.taskIds=g.taskIds.filter(id=>id!==taskId);
  saveGoals();renderGoals();
}
function goalProgress(g){
  const linked=g.taskIds.map(id=>tasks.find(t=>t.id===id)).filter(Boolean);
  if(linked.length!==g.taskIds.length){g.taskIds=linked.map(t=>t.id);saveGoals();}
  if(!linked.length)return null;
  return Math.round(linked.filter(t=>t.done).length/linked.length*100);
}

function epicCreatedMs(g){
  const m=/^g_(\d+)/.exec(g.id||'');
  return m?parseInt(m[1],10):Date.now();
}
function epicRemaining(g){
  const linked=g.taskIds.map(id=>tasks.find(t=>t.id===id)).filter(Boolean);
  const open=linked.filter(t=>!t.done);
  const estimated=open.filter(t=>t.estimate>0);
  const totalMin=estimated.reduce((a,t)=>a+(t.estimate||0),0);
  return {totalMin,openCount:open.length,unestimatedCount:open.length-estimated.length};
}
function epicWeeksLeft(g){
  if(!g.targetDateISO)return null;
  const days=isoDaysApart(isoDate(bocNow()),g.targetDateISO);
  if(days<0)return 0;
  return Math.max(1,Math.ceil((days+1)/7));
}
function epicWeekCap(g){
  const {totalMin,openCount,unestimatedCount}=epicRemaining(g);
  const weeksLeft=epicWeeksLeft(g);
  if(weeksLeft===null)return{status:'no-deadline',totalMin,openCount,unestimatedCount};
  if(!openCount)return{status:'done-or-empty',totalMin:0,openCount:0,unestimatedCount:0};
  if(weeksLeft===0)return{status:'overdue',totalMin,openCount,unestimatedCount,perWeekMin:totalMin};
  return{status:'ok',totalMin,openCount,unestimatedCount,weeksLeft,perWeekMin:totalMin/weeksLeft};
}
function epicPaceStatus(g){
  const prog=goalProgress(g);
  if(prog===null||!g.targetDateISO)return null;
  const createdMs=epicCreatedMs(g);
  const targetMs=new Date(g.targetDateISO+'T23:59:59').getTime();
  const nowMs=bocNow().getTime();
  const totalSpan=targetMs-createdMs;
  if(totalSpan<=0)return null;
  const elapsedPct=Math.min(100,Math.max(0,Math.round((nowMs-createdMs)/totalSpan*100)));
  const delta=prog-elapsedPct;
  let label;
  if(nowMs>targetMs&&prog<100)label='overdue';
  else if(delta>=10)label='ahead';
  else if(delta<=-10)label='behind';
  else label='on-pace';
  return{prog,elapsedPct,delta,label};
}
function epicCap(g){
  const cap=epicWeekCap(g);
  const pace=epicPaceStatus(g);
  let requiredThisWeekMin=0;
  if(cap.status==='ok')requiredThisWeekMin=cap.perWeekMin;
  else if(cap.status==='overdue')requiredThisWeekMin=cap.totalMin;
  return{goal:g,cap,pace,requiredThisWeekMin};
}
const epicSummaries=()=>goals.map(epicCap);
function epicNeedMin(){
  return epicSummaries().reduce((a,s)=>a+(s.requiredThisWeekMin||0),0);
}
const fmtMin=min=>min>0?fmtDur(Math.round(min)*60):'0m';

function addGoalFromInput(){
  const inp=$('wk-goal-in');if(!inp)return;
  const dateInp=$('wk-goal-date-in');
  if(!inp.value.trim())return;
  addGoal(inp.value,dateInp&&dateInp.value?dateInp.value:null);
  inp.value='';if(dateInp)dateInp.value='';
}
function toggleGoalPicker(id){
  _goalPickerOpen[id]=!_goalPickerOpen[id];
  renderGoals();
}
function goalTaskOptions(g){
  const opts=tasks.filter(t=>!g.taskIds.includes(t.id));
  return `<option value="">— Link a task —</option>`+opts.map(t=>{
    const label=t.text.length>44?t.text.slice(0,44)+'…':t.text;
    const est=t.estimate>0?` (${fmtMin(t.estimate)})`:'';
    return `<option value="${t.id}">${t.type}: ${escHTML(label)}${est}${t.done?' ✓ done':''}</option>`;
  }).join('');
}
const EPIC_PACE_META={
  'ahead':{label:'AHEAD',color:'var(--green)'},
  'on-pace':{label:'ON PACE',color:'var(--pc)'},
  'behind':{label:'BEHIND',color:'var(--amber)'},
  'overdue':{label:'OVERDUE',color:'var(--pa)'},
};
function epicCapLine(g){
  const cap=epicWeekCap(g);
  const pace=epicPaceStatus(g);
  const paceChip=pace?`<span class="epic-pace-chip" style="color:${EPIC_PACE_META[pace.label].color};border-color:${EPIC_PACE_META[pace.label].color}">${EPIC_PACE_META[pace.label].label}</span>`:'';
  let capTxt;
  if(cap.status==='no-deadline')capTxt=`<span class="epic-cap-muted">no target date — add one to see weekly capacity</span>`;
  else if(cap.status==='done-or-empty')capTxt=cap.openCount===0&&g.taskIds.length?`<span class="epic-cap-muted">all linked tasks done</span>`:`<span class="epic-cap-muted">link tasks with a time estimate to see capacity</span>`;
  else if(cap.status==='overdue')capTxt=`<span class="epic-cap-warn">OVERDUE — ${fmtMin(cap.totalMin)} of unfinished work still linked</span>`;
  else{
    const unestTxt=cap.unestimatedCount>0?` <span class="epic-cap-muted">(+${cap.unestimatedCount} task${cap.unestimatedCount===1?'':'s'} w/ no estimate)</span>`:'';
    capTxt=`<span class="epic-cap-figure">≈ ${fmtMin(cap.perWeekMin)}/wk needed</span><span class="epic-cap-muted"> · ${cap.weeksLeft} wk${cap.weeksLeft===1?'':'s'} left</span>${unestTxt}`;
  }
  return `<div class="epic-cap-row">${capTxt}${paceChip}</div>`;
}
function renderGoals(){
  const section=$('wk-goals-section');
  if(!section)return;
  const goalsEnabled=typeof appSettings==='undefined'||appSettings.goalsEnabled!==false;
  if(!goalsEnabled){section.style.display='none';return;}
  section.style.display='block';
  const list=$('wk-goals-list');if(!list)return;
  list.innerHTML=goals.length?goals.map(g=>{
    const prog=goalProgress(g);
    const targetTxt=g.targetDateISO?` <span class="wk-goal-target">→ ${new Date(g.targetDateISO+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>`:'';
    const progTxt=prog===null?'<span class="wk-goal-noprog">no linked tasks yet</span>':`${prog}%`;
    const pickerOpen=!!_goalPickerOpen[g.id];
    const linkedChips=g.taskIds.length?`<div class="wk-goal-linked-list">${g.taskIds.map(id=>{
      const t=tasks.find(x=>x.id===id);if(!t)return'';
      const label=t.text.length>26?t.text.slice(0,26)+'…':t.text;
      return `<span class="wk-goal-linked-chip">${escHTML(label)}<button onclick="unlinkTaskFromGoal('${g.id}','${id}')" title="Unlink">✕</button></span>`;
    }).join('')}</div>`:'';
    return `<div class="wk-goal-row">
      <div class="wk-goal-hdr">
        <div class="wk-goal-txt">${escHTML(g.title)}${targetTxt}</div>
        <button class="t-btn del" onclick="deleteGoal('${g.id}')" title="Delete epic">✕</button>
      </div>
      <div class="wk-goal-progress-row">
        <div class="wk-budget-track" style="flex:1"><div class="wk-budget-fill" style="width:${prog||0}%;background:var(--amber)"></div></div>
        <span class="wk-goal-prog-txt">${progTxt}</span>
      </div>
      ${epicCapLine(g)}
      <button class="wk-goal-link-toggle" onclick="toggleGoalPicker('${g.id}')">${pickerOpen?'▾':'▸'} Link tasks</button>
      <div class="wk-goal-picker" style="display:${pickerOpen?'block':'none'}">
        <select onchange="if(this.value){linkTaskToGoal('${g.id}',this.value);this.value='';}">
          ${goalTaskOptions(g)}
        </select>
        ${linkedChips}
      </div>
    </div>`;
  }).join(''):'<div class="empty-sec">No epics yet — bigger than a week, still yours to aim at. Add a target date and link tasks with time estimates to see what it actually costs you per week.</div>';
}

const AUDIT_LOG_KEY='bloc_ai_audit_log_v1';
let auditLog=loadMigratedStore(AUDIT_LOG_KEY,[],null);
function saveAuditLog(){
  if(auditLog.length>40)auditLog=auditLog.slice(-40);
  localStorage.setItem(AUDIT_LOG_KEY,JSON.stringify(auditLog));
}

function calcVelocity(lookbackWeeks){
  lookbackWeeks=lookbackWeeks||4;
  const byCat={};SECTS.forEach(s=>byCat[s.type]={planned:0,actual:0,weeks:0});
  let sampled=0;
  for(let off=1;off<=lookbackWeeks;off++){
    const key=currentPlanWeekKey(off);
    const plan=weeklyPlans[key];
    if(!plan)continue;
    const planned=plan.timeBudgetMin||{};
    if(!SECTS.some(s=>(planned[s.type]||0)>0))continue;
    sampled++;
    const actual=actualByCat(off);
    SECTS.forEach(s=>{
      const p=planned[s.type]||0;
      if(p>0){byCat[s.type].planned+=p;byCat[s.type].actual+=(actual[s.type]||0);byCat[s.type].weeks++;}
    });
  }
  if(!sampled)return null;
  const ratios={};let totalP=0,totalA=0;
  SECTS.forEach(s=>{
    const c=byCat[s.type];
    ratios[s.type]=c.planned>0?Math.min(1.5,c.actual/c.planned):null;
    totalP+=c.planned;totalA+=c.actual;
  });
  const overall=totalP>0?Math.min(1.5,totalA/totalP):1;
  return{ratios,overall,sampledWeeks:sampled,byCat};
}

function findBottlenecks(velocity){
  const out=[];
  if(velocity){
    SECTS.forEach(s=>{
      const r=velocity.ratios[s.type],wks=velocity.byCat[s.type].weeks;
      if(r!==null&&wks>=2&&r<0.6){
        out.push({kind:'category',type:s.type,label:`${s.type} · ${s.name}`,
          detail:`Planned consistently, but only ~${Math.round(r*100)}% of that time actually gets used, across ${wks} sampled week${wks===1?'':'s'}.`});
      }
    });
  }
  epicSummaries().forEach(({goal,pace})=>{
    if(pace&&(pace.label==='behind'||pace.label==='overdue')){
      out.push({kind:'epic',epicId:goal.id,label:goal.title,
        detail:pace.label==='overdue'?`Target date has passed with only ${pace.prog}% done.`:`${pace.prog}% done vs. ${pace.elapsedPct}% of its own timeline already gone.`});
    }
  });
  return out;
}

function capForecast(offsetWeeks,velocity){
  const plan=getOrCreateWeeklyPlan(offsetWeeks);
  const plannedTotalMin=SECTS.reduce((a,s)=>a+(plan.timeBudgetMin[s.type]||0),0);
  const epicRequiredMin=epicNeedMin();
  const requiredMin=Math.max(plannedTotalMin,epicRequiredMin);
  const ceilingMin=planCapacityMin(offsetWeeks);
  const overallVelocity=velocity?velocity.overall:1;
  const realisticMin=Math.round(ceilingMin*overallVelocity);
  const overCapacityMin=requiredMin-realisticMin;
  const overCapacityPct=realisticMin>0?Math.round(overCapacityMin/realisticMin*100):(requiredMin>0?100:0);
  return{plannedTotalMin,epicRequiredMin,requiredMin,ceilingMin,overallVelocity,
    confidentVelocity:!!velocity,realisticMin,overCapacityMin,overCapacityPct};
}

function epicSplit(offsetWeeks,forecast){
  const summaries=epicSummaries().filter(s=>s.requiredThisWeekMin>0);
  if(!summaries.length)return{needed:false,rows:[]};
  const R=summaries.reduce((a,s)=>a+s.requiredThisWeekMin,0);
  const budget=forecast.realisticMin;
  if(R<=budget||forecast.overCapacityMin<=0){
    return{needed:false,rows:summaries.map(s=>({title:s.goal.title,requiredMin:s.requiredThisWeekMin,suggestedMin:s.requiredThisWeekMin,action:'protect'}))};
  }
  const plan=getOrCreateWeeklyPlan(offsetWeeks);
  let rows;
  if(plan.deadlineMode==='fluid'){
    const factor=budget>0?budget/R:0;
    rows=summaries.map(s=>({title:s.goal.title,requiredMin:s.requiredThisWeekMin,suggestedMin:Math.round(s.requiredThisWeekMin*factor),action:factor<0.999?'trim':'protect'}));
  }else{
    const sorted=summaries.slice().sort((a,b)=>{
      const aw=a.cap.status==='overdue'?-1:(a.cap.weeksLeft??999);
      const bw=b.cap.status==='overdue'?-1:(b.cap.weeksLeft??999);
      if(aw!==bw)return aw-bw;
      return b.requiredThisWeekMin-a.requiredThisWeekMin;
    });
    let remaining=budget;
    rows=sorted.map(s=>{
      if(remaining<=0)return{title:s.goal.title,requiredMin:s.requiredThisWeekMin,suggestedMin:0,action:'defer'};
      const alloc=Math.min(s.requiredThisWeekMin,remaining);
      remaining-=alloc;
      return{title:s.goal.title,requiredMin:s.requiredThisWeekMin,suggestedMin:Math.round(alloc),
        action:alloc<s.requiredThisWeekMin-0.5?(alloc>0?'trim':'defer'):'protect'};
    });
  }
  return{needed:true,rows};
}
function catRebalance(offsetWeeks,forecast){
  const plan=getOrCreateWeeklyPlan(offsetWeeks);
  if(forecast.plannedTotalMin<=0||forecast.realisticMin<=0||forecast.plannedTotalMin<=forecast.realisticMin)return null;
  const factor=forecast.realisticMin/forecast.plannedTotalMin;
  const suggestion={};
  SECTS.forEach(s=>{suggestion[s.type]=Math.max(0,Math.round((plan.timeBudgetMin[s.type]||0)*factor/5)*5);});
  return suggestion;
}
function applyRebalance(offsetWeeks){
  const forecast=capForecast(offsetWeeks,calcVelocity(4));
  const suggestion=catRebalance(offsetWeeks,forecast);
  if(!suggestion){showToast('NOTHING TO REBALANCE — ALREADY WITHIN CAPACITY');return;}
  const plan=getOrCreateWeeklyPlan(offsetWeeks);
  SECTS.forEach(s=>{plan.timeBudgetMin[s.type]=suggestion[s.type];});
  saveWeeklyPlans();renderWeeklyPlan(offsetWeeks);
  showToast('⚖ TIME BUDGET REBALANCED TO FIT REALISTIC CAPACITY');
}

function weekDaysISO(offsetWeeks){
  const{startDate}=weekWindowISO(offsetWeeks||0);
  const days=[];
  for(let i=0;i<7;i++)days.push(isoDate(new Date(startDate.getTime()+i*86400000)));
  return days;
}
function linkedOpenTasks(offsetWeeks){
  const plan=getOrCreateWeeklyPlan(offsetWeeks);
  const ids=new Set();
  plan.outcomes.forEach(o=>(o.taskIds||[]).forEach(id=>ids.add(id)));
  goals.forEach(g=>(g.taskIds||[]).forEach(id=>ids.add(id)));
  return Array.from(ids).map(id=>tasks.find(t=>t.id===id)).filter(t=>t&&!t.done);
}
function suggestRouting(offsetWeeks){
  const plan=getOrCreateWeeklyPlan(offsetWeeks);
  const todayISO=isoDate(bocNow());
  let days=weekDaysISO(offsetWeeks);
  if(offsetWeeks===0)days=days.filter(d=>d>=todayISO);
  if(!days.length)return[];
  const openTasks=linkedOpenTasks(offsetWeeks).sort((a,b)=>(b.estimate||0)-(a.estimate||0)).slice(0,5);
  if(!openTasks.length)return[];
  const dLbl=iso=>new Date(iso+'T12:00:00').toLocaleDateString('en-US',{weekday:'short'});
  if(plan.routingMode==='energy'&&typeof baiWeekdayStats==='function'){
    const wkd=baiWeekdayStats();
    if(wkd&&wkd.all&&wkd.all.some(x=>x.dayCount>=2)){
      const nameToIdx={Sunday:0,Monday:1,Tuesday:2,Wednesday:3,Thursday:4,Friday:5,Saturday:6};
      const availByRank=wkd.all.map(x=>days.find(d=>new Date(d+'T12:00:00').getDay()===nameToIdx[x.day])).filter(Boolean);
      if(availByRank.length){
        return openTasks.map(t=>{
          const highValue=t.type==='A'||t.type==='B';
          const pick=highValue?availByRank[0]:availByRank[availByRank.length-1];
          return{task:t,dayISO:pick,dayLabel:dLbl(pick),reason:highValue?'your historically strongest day':'a lighter day — saves your best day for A/B work'};
        });
      }
    }
  }
  const freeByDay={};
  days.forEach(d=>{freeByDay[d]=typeof baiFreeSlots==='function'?baiFreeSlots(d).reduce((a,s)=>a+(s.end-s.start),0):0;});
  return openTasks.map(t=>{
    let bestDay=days[0];
    days.forEach(d=>{if(freeByDay[d]>freeByDay[bestDay])bestDay=d;});
    freeByDay[bestDay]=Math.max(0,freeByDay[bestDay]-(t.estimate||30));
    return{task:t,dayISO:bestDay,dayLabel:dLbl(bestDay),reason:'most open calendar time left this week'};
  });
}

function buildAudit(offsetWeeks){
  const velocity=calcVelocity(4);
  const forecast=capForecast(offsetWeeks,velocity);
  const bottlenecks=findBottlenecks(velocity);
  const epicRedistribution=epicSplit(offsetWeeks,forecast);
  const categoryRebalance=catRebalance(offsetWeeks,forecast);
  const routing=suggestRouting(offsetWeeks);
  return{offsetWeeks,weekKey:currentPlanWeekKey(offsetWeeks),ts:Date.now(),
    velocity,forecast,bottlenecks,epicRedistribution,categoryRebalance,routing};
}
function logAudit(offsetWeeks){
  const audit=buildAudit(offsetWeeks);
  auditLog.push({id:'aud_'+Date.now(),weekKey:audit.weekKey,ts:audit.ts,
    overCapacityPct:audit.forecast.overCapacityPct,bottleneckCount:audit.bottlenecks.length,
    overallVelocity:audit.velocity?Math.round(audit.velocity.overall*100):null});
  saveAuditLog();
  showToast('🔍 AUDIT LOGGED');
  renderAuditCard(offsetWeeks);
}
function lastAudit(weekKey){
  for(let i=auditLog.length-1;i>=0;i--)if(auditLog[i].weekKey===weekKey)return auditLog[i];
  return null;
}

const AUDIT_ACTIONS={
  protect:{label:'PROTECT',color:'var(--green)'},
  trim:{label:'TRIM',color:'var(--amber)'},
  defer:{label:'DEFER',color:'var(--pa)'},
};
const capGaugeColor=pct=>pct<=0?'var(--green)':pct<=25?'var(--amber)':'var(--pa)';
function renderAuditCard(offsetWeeks){
  const wrap=$('wk-audit-section');if(!wrap)return;
  const auditEnabled=typeof appSettings==='undefined'||appSettings.goalsEnabled!==false||appSettings.weeklyPlanningEnabled!==false;
  if(!auditEnabled){wrap.style.display='none';return;}
  wrap.style.display='block';
  const audit=buildAudit(offsetWeeks);
  const{forecast,velocity,bottlenecks,epicRedistribution,routing}=audit;

  const isLateWeek=[5,6,0].includes(bocNow().getDay());
  const alreadyLogged=!!lastAudit(audit.weekKey);
  const nudge=$('wk-audit-nudge');
  if(nudge)nudge.style.display=(offsetWeeks===0&&isLateWeek&&!alreadyLogged)?'flex':'none';

  const gaugeColor=capGaugeColor(forecast.overCapacityPct);
  const gaugePct=Math.min(150,Math.max(0,Math.round(forecast.requiredMin/Math.max(forecast.realisticMin,1)*100)));
  $('wk-audit-gauge').innerHTML=`
    <div class="audit-gauge-row">
      <div class="audit-gauge-track"><div class="audit-gauge-fill" style="width:${Math.min(100,gaugePct)}%;background:${gaugeColor}"></div>${gaugePct>100?`<div class="audit-gauge-over" style="width:${Math.min(50,gaugePct-100)}%"></div>`:''}</div>
      <div class="audit-gauge-txt" style="color:${gaugeColor}">${forecast.overCapacityPct>0?`${forecast.overCapacityPct}% OVER CAPACITY`:'WITHIN CAPACITY'}</div>
    </div>
    <div class="audit-gauge-sub">Required ${fmtMin(forecast.requiredMin)} (budgeted ${fmtMin(forecast.plannedTotalMin)}, Epics need ${fmtMin(forecast.epicRequiredMin)}) vs. realistic capacity ${fmtMin(forecast.realisticMin)}${forecast.confidentVelocity?` <span class="epic-cap-muted">(${Math.round(forecast.overallVelocity*100)}% historical delivery rate × ${fmtMin(forecast.ceilingMin)} available)</span>`:` <span class="epic-cap-muted">(no history yet — showing stated capacity at face value)</span>`}</div>`;

  const bwrap=$('wk-audit-bottlenecks');
  bwrap.innerHTML=bottlenecks.length?bottlenecks.map(b=>`<div class="audit-bottleneck-item"><span class="audit-bn-dot"></span><div><b>${escHTML(b.label)}</b><div class="epic-cap-muted">${escHTML(b.detail)}</div></div></div>`).join('')
    :`<div class="epic-cap-muted">No systemic bottlenecks detected yet${velocity?'.':' — need a couple more planned weeks of history first.'}</div>`;

  const ewrap=$('wk-audit-epics');
  if(epicRedistribution.rows.length){
    ewrap.style.display='block';
    ewrap.innerHTML=(epicRedistribution.needed?`<div class="audit-redis-note">Epic demand exceeds realistic capacity — ${$('wk-nuance-deadline')&&getOrCreateWeeklyPlan(offsetWeeks).deadlineMode==='fluid'?'spreading the shortfall evenly (Fluid Sprints)':'protecting the nearest deadline first (Strict Deadlines)'}:</div>`:'')+
      epicRedistribution.rows.map(r=>{
        const meta=AUDIT_ACTIONS[r.action];
        return `<div class="audit-epic-row"><span class="audit-action-chip" style="color:${meta.color};border-color:${meta.color}">${meta.label}</span><div class="audit-epic-title">${escHTML(r.title)}</div><div class="audit-epic-mins">${fmtMin(r.suggestedMin)} <span class="epic-cap-muted">/ ${fmtMin(r.requiredMin)} needed</span></div></div>`;
      }).join('');
  }else{ewrap.style.display='none';ewrap.innerHTML='';}

  const rwrap=$('wk-audit-routing');
  rwrap.innerHTML=routing.length?routing.map(r=>`<div class="audit-route-row"><span class="audit-route-day">${r.dayLabel.toUpperCase()}</span><div class="audit-route-task">${escHTML(r.task.text.length>50?r.task.text.slice(0,50)+'…':r.task.text)}<div class="epic-cap-muted">${escHTML(r.reason)}</div></div></div>`).join('')
    :`<div class="epic-cap-muted">Link tasks to an Epic or this week's Outcomes to get day-by-day routing suggestions.</div>`;

  const applyBtn=$('wk-audit-apply-btn');
  const canApply=!!catRebalance(offsetWeeks,forecast);
  applyBtn.style.display=canApply?'inline-flex':'none';

  const last=lastAudit(audit.weekKey);
  $('wk-audit-footer').textContent=last?`Last logged ${bocFromMs(last.ts).toLocaleDateString('en-US',{month:'short',day:'numeric'})} · ${auditLog.length} audit${auditLog.length===1?'':'s'} total`:`Not logged yet this week · ${auditLog.length} audit${auditLog.length===1?'':'s'} total`;
}

async function aiAuditNote(offsetWeeks){
  if(!baiGetGeminiKey()){
    baiSetupGemini();
    if(!baiGetGeminiKey())return;
  }
  const out=$('wk-audit-ai-output');
  out.style.display='block';
  out.innerHTML='<div style="opacity:.75">✨ Reading the numbers…</div>';
  const audit=buildAudit(offsetWeeks);
  const{forecast,velocity,bottlenecks,epicRedistribution}=audit;
  const plan=getOrCreateWeeklyPlan(offsetWeeks);
  const dataBlock=[
    `Routing mode: ${plan.routingMode}. Deadline mode: ${plan.deadlineMode}.`,
    `Required this week: ${fmtMin(forecast.requiredMin)} (self-budgeted ${fmtMin(forecast.plannedTotalMin)}, Epics mathematically need ${fmtMin(forecast.epicRequiredMin)}). Realistic capacity: ${fmtMin(forecast.realisticMin)} (${forecast.confidentVelocity?Math.round(forecast.overallVelocity*100)+'% historical delivery rate':'no velocity history yet'} of ${fmtMin(forecast.ceilingMin)} available). Over capacity by ${forecast.overCapacityPct}%.`,
    bottlenecks.length?`Bottlenecks: ${bottlenecks.map(b=>`${b.label} — ${b.detail}`).join(' | ')}`:'No systemic bottlenecks detected.',
    epicRedistribution.rows.length?`Epic allocation this week: ${epicRedistribution.rows.map(r=>`${r.title}: ${r.action} (${fmtMin(r.suggestedMin)} of ${fmtMin(r.requiredMin)} needed)`).join(' | ')}`:'No active Epics with a target date.'
  ].join('\n');
  const prompt=`You are BLOC AGENT, a blunt productivity analyst embedded in a task app called BLOC. This is a weekly planning capacity audit — the numbers below are already fully computed; do not restate them robotically. Write a short, direct read in plain text (no markdown, no headers, no asterisks): one sentence on the headline reality (over/within capacity and by how much), one sentence on the single most important thing to do about it this week (name a specific Epic or category from the data), and one closing sentence. Three sentences total, under 80 words, no fluff, no generic encouragement.\n${baiProfileBlock()}Audit data:\n${dataBlock}`;
  try{
    const text=await baiCallGemini(prompt,{maxOutputTokens:1024,thinkingLevel:'low'});
    out.innerHTML=`<div style="padding-top:2px;">${escHTML(text).replace(/\n\s*\n/g,'<br><br>').replace(/\n/g,'<br>')}</div><div class="wki-track-note" style="margin-top:8px;">Sent to Gemini (same connection as BLOC Agent) — only the computed audit numbers above, never raw task text.</div>`;
  }catch(err){
    out.innerHTML=`<div style="opacity:.75">Couldn't reach Gemini: ${escHTML(err.message||'unknown error')}</div>`;
  }
}

let wkiRange=7;
let wkiCache=null;
const WKI_WEIGHT={A:5,B:4,C:3,D:2,E:1};

function wkiToggleHelp(){const p=$('wki-help-panel');p.style.display=p.style.display==='none'?'block':'none';}

function askImpact(taskId){
  const entry=[...taskCompletionLog].reverse().find(l=>l.taskId===taskId);
  if(!entry)return;
  document.querySelectorAll('.impact-prompt').forEach(el=>el.remove());
  const el=document.createElement('div');
  el.className='impact-prompt';
  el.innerHTML=`<span>Move the needle?</span>`+[1,2,3,4,5].map(n=>`<button onclick="setImpactRating('${taskId}',${n});this.closest('.impact-prompt').remove()">${n}</button>`).join('')+`<button class="impact-skip" onclick="this.closest('.impact-prompt').remove()">skip</button>`;
  document.body.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));
  setTimeout(()=>{if(el.parentNode)el.remove();},8000);
}
function setImpactRating(taskId,rating){
  const entry=[...taskCompletionLog].reverse().find(l=>l.taskId===taskId);
  if(entry){entry.impactRating=rating;saveTCLog();}
}

function wkiSetRange(days){
  wkiRange=days;
  document.querySelectorAll('.wki-range-btn').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.days)===days));
  wkiRenderAll();
}

function wkiDaily(days){
  const out=[];
  const today=bocNow();
  for(let i=days-1;i>=0;i--){
    const d=new Date(today.getTime()-i*86400000);
    const iso=isoDate(d);
    const daySessions=sessions.filter(s=>s.dateISO===iso);
    const focusSec=daySessions.reduce((a,s)=>a+s.elapsed,0);
    const dayLog=taskCompletionLog.filter(l=>l.dateISO===iso);
    const tasksCompleted=dayLog.length;
    const weighted=dayLog.reduce((a,l)=>a+(WKI_WEIGHT[l.type]||1),0);
    const distractions=daySessions.reduce((a,s)=>a+(s.distractions||0),0);
    const tracked=daySessions.length>0;
    const score=Math.round(weighted*10+focusSec/60);
    const dataState=getDayState(iso);
    const confidence=daySessions.some(s=>s.confidence==='low')?'low':'high';
    out.push({
      iso,date:d,
      label:d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}),
      shortLabel:d.toLocaleDateString('en-US',{weekday:'short'}),
      focusSec,tasksCompleted,weighted,distractions,tracked,
      sessionsCount:daySessions.length,score,dataState,confidence
    });
  }
  return out;
}

function wkiSeries(metrics){
  const y=metrics.map(m=>m.score);
  const n=y.length;
  const EPS=0.001;
  const pointTypes=new Array(n).fill('normal');
  const validIdx=[];
  metrics.forEach((m,i)=>{
    if(m.dataState==='unobserved')pointTypes[i]='gap';
    else if(m.dataState==='confirmed-rest')pointTypes[i]='rest';
    else validIdx.push(i);
  });
  for(let vi=0;vi<validIdx.length;vi++){
    const i=validIdx[vi];
    const prevI=vi>0?validIdx[vi-1]:null, nextI=vi<validIdx.length-1?validIdx[vi+1]:null;
    const prev=prevI!==null?y[prevI]:null, next=nextI!==null?y[nextI]:null;
    if(prev===null&&next!==null){ if(y[i]>next+EPS)pointTypes[i]='peak'; else if(y[i]<next-EPS)pointTypes[i]='valley'; }
    else if(next===null&&prev!==null){ if(y[i]>prev+EPS)pointTypes[i]='peak'; else if(y[i]<prev-EPS)pointTypes[i]='valley'; }
    else if(prev!==null&&next!==null){
      if(y[i]>=prev-EPS&&y[i]>=next-EPS&&(y[i]>prev+EPS||y[i]>next+EPS))pointTypes[i]='peak';
      else if(y[i]<=prev+EPS&&y[i]<=next+EPS&&(y[i]<prev-EPS||y[i]<next-EPS))pointTypes[i]='valley';
    }
  }
  const slopes=[];
  for(let i=0;i<n-1;i++){
    if(metrics[i].dataState!=='observed'||metrics[i+1].dataState!=='observed'){slopes.push('gap');continue;}
    const d=y[i+1]-y[i];
    slopes.push(d>EPS?'up':d<-EPS?'down':'flat');
  }
  const vY=validIdx.map(i=>y[i]);
  const second=[];
  for(let k=1;k<vY.length-1;k++)second.push(vY[k+1]-2*vY[k]+vY[k-1]);
  const inflectionIdx=new Set();
  for(let k=1;k<second.length;k++){
    if((second[k-1]>EPS&&second[k]<-EPS)||(second[k-1]<-EPS&&second[k]>EPS))inflectionIdx.add(validIdx[k+1]);
  }
  let sumX=0,sumY=0,sumXY=0,sumXX=0,cnt=0;
  validIdx.forEach(i=>{sumX+=i;sumY+=y[i];sumXY+=i*y[i];sumXX+=i*i;cnt++;});
  const denom=(cnt*sumXX-sumX*sumX)||1;
  const trendSlope=cnt>=2?(cnt*sumXY-sumX*sumY)/denom:0;
  const peakIdx=validIdx.length?validIdx.reduce((best,i)=>y[i]>y[best]?i:best,validIdx[0]):0;
  const maxScore=validIdx.length?Math.max(...validIdx.map(i=>y[i])):0;
  const minScore=validIdx.length?Math.min(...validIdx.map(i=>y[i])):0;
  return {pointTypes,slopes,inflectionIdx,trendSlope,peakIdx,maxScore,minScore,validCount:cnt};
}

function wkiRenderAll(){
  const metrics=wkiDaily(wkiRange);
  const analysis=wkiSeries(metrics);
  wkiCache={metrics,analysis};
  wkiRenderGraph(metrics,analysis);
  wkiRenderBars(metrics);
  wkiRenderEnergy(metrics,analysis);
  $('wki-detail').innerHTML='Tap a point on the graph above to see a plain-language breakdown of that day.';
  $('wki-report-output').style.display='none';
  $('wki-report-output').innerHTML='';
  $('wki-ai-report-output').style.display='none';
  $('wki-ai-report-output').innerHTML='';
  document.querySelectorAll('.wki-range-btn').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.days)===wkiRange));
}

function wkiRenderEnergy(metrics,analysis){
  const card=$('wki-energy-card');if(!card)return;
  const todayISO=isoDate(bocNow());
  const observed=metrics.filter(m=>m.dataState==='observed'&&m.iso!==todayISO&&energyLog[m.iso]);
  if(observed.length<3){
    card.innerHTML=`Log your energy a few more days to unlock this — see the ⚡ ENERGY button above the task list. (${observed.length}/3 logged so far in this range.)`;
    return;
  }
  const low=observed.filter(m=>energyLog[m.iso]<=2);
  const high=observed.filter(m=>energyLog[m.iso]>=4);
  const avgScore=(group)=>{
    if(!group.length)return null;
    const avg=group.reduce((a,m)=>a+m.score,0)/group.length;
    return avg;
  };
  let lines=[];
  if(low.length&&high.length){
    const lowAvg=avgScore(low),highAvg=avgScore(high);
    lines.push(`On low-energy days (1–2), your average day-score is <b>${Math.round(lowAvg)}</b>. On peak days (4–5), it's <b>${Math.round(highAvg)}</b>${highAvg>lowAvg?` — about ${Math.round((highAvg-lowAvg)/Math.max(lowAvg,1)*100)}% higher`:''}.`);
  }
  const peakEnergies=[],valleyEnergies=[];
  metrics.forEach((m,i)=>{
    if(!energyLog[m.iso])return;
    if(analysis.pointTypes[i]==='peak')peakEnergies.push(energyLog[m.iso]);
    if(analysis.pointTypes[i]==='valley')valleyEnergies.push(energyLog[m.iso]);
  });
  if(peakEnergies.length){
    const avgPeakE=(peakEnergies.reduce((a,b)=>a+b,0)/peakEnergies.length).toFixed(1);
    lines.push(`Your peak days cluster around energy level <b>${avgPeakE}</b> (${peakEnergies.length} peak day${peakEnergies.length===1?'':'s'} logged).`);
  }
  if(valleyEnergies.length){
    const avgValE=(valleyEnergies.reduce((a,b)=>a+b,0)/valleyEnergies.length).toFixed(1);
    lines.push(`Your low points cluster around energy level <b>${avgValE}</b> (${valleyEnergies.length} logged).`);
  }
  card.innerHTML=lines.length?lines.map(l=>`<div>${l}</div>`).join('<div style="height:8px"></div>')
    :`Energy logged on ${observed.length} day${observed.length===1?'':'s'} in this range, but no clear pattern yet — keep logging and this will sharpen up.`;
}

function wkiRenderGraph(metrics,analysis){
  const W=880,H=220,padL=34,padR=18,padT=26,padB=30;
  const n=metrics.length;
  const innerW=W-padL-padR, innerH=H-padT-padB;
  const maxS=Math.max(analysis.maxScore,10), minS=Math.min(analysis.minScore,0);
  const range=(maxS-minS)||1;
  const xAt=i=>n>1?padL+(i/(n-1))*innerW:padL+innerW/2;
  const yAt=v=>padT+innerH-((v-minS)/range)*innerH;
  const pts=metrics.map((m,i)=>({x:xAt(i),y:yAt(m.score),m,i}));
  let path='';
  pts.forEach((p,i)=>{
    if(i===0)path+=`M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    else{
      const prev=pts[i-1];
      const mx=(prev.x+p.x)/2;
      path+=` Q${prev.x.toFixed(1)},${prev.y.toFixed(1)} ${mx.toFixed(1)},${((prev.y+p.y)/2).toFixed(1)} T${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }
  });
  const slopeColor={up:'var(--green)',down:'var(--pa)',flat:'var(--muted2)'};
  const segs=analysis.slopes.map((s,i)=>{
    const a=pts[i],b=pts[i+1];
    if(s==='gap')return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="3,4" stroke-linecap="round"/>`;
    return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${slopeColor[s]}" stroke-width="2.5" stroke-linecap="round"/>`;
  }).join('');
  const gridLines=[0,.25,.5,.75,1].map(t=>{
    const y=padT+innerH*t;
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}" stroke="var(--bdr2)" stroke-width="1" stroke-dasharray="2,4"/>`;
  }).join('');
  const xLabels=pts.map((p,i)=>{
    if(n>14&&i%Math.ceil(n/10)!==0&&i!==n-1)return'';
    return `<text x="${p.x.toFixed(1)}" y="${H-8}" font-size="7.5" letter-spacing="1" fill="var(--muted2)" text-anchor="middle" font-family="monospace">${metrics[i].shortLabel.toUpperCase()}</text>`;
  }).join('');
  const markers=pts.map((p,i)=>{
    const type=analysis.pointTypes[i];
    const isInfl=analysis.inflectionIdx.has(i);
    let extra='';
    if(type==='peak')extra=`<path d="M${p.x.toFixed(1)},${(p.y-11).toFixed(1)} l5,8 l-10,0 z" fill="var(--amber)"/>`;
    else if(type==='valley')extra=`<path d="M${p.x.toFixed(1)},${(p.y+11).toFixed(1)} l5,-8 l-10,0 z" fill="var(--pd)"/>`;
    if(isInfl)extra+=`<rect x="${(p.x-4).toFixed(1)}" y="${(p.y-4).toFixed(1)}" width="8" height="8" transform="rotate(45 ${p.x.toFixed(1)} ${p.y.toFixed(1)})" fill="none" stroke="var(--pc)" stroke-width="1.5"/>`;
    if(type==='gap'){
      const gy=padT+innerH;
      return `<g class="wki-pt" onclick="wkiShowDetail(${i})">
        <circle cx="${p.x.toFixed(1)}" cy="${gy.toFixed(1)}" r="12" fill="transparent"/>
        <circle cx="${p.x.toFixed(1)}" cy="${gy.toFixed(1)}" r="4.5" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="2,2"/>
      </g>`;
    }
    if(type==='rest'){
      const gy=padT+innerH;
      return `<g class="wki-pt" onclick="wkiShowDetail(${i})">
        <circle cx="${p.x.toFixed(1)}" cy="${gy.toFixed(1)}" r="12" fill="transparent"/>
        <circle cx="${p.x.toFixed(1)}" cy="${gy.toFixed(1)}" r="5" fill="var(--pd)" stroke="var(--bg)" stroke-width="1.5"/>
        <text x="${p.x.toFixed(1)}" y="${(gy-10).toFixed(1)}" font-size="9" text-anchor="middle" fill="var(--pd)">☾</text>
      </g>`;
    }
    const dotColor=type==='peak'?'var(--amber)':type==='valley'?'var(--pd)':'var(--txt2)';
    return `<g class="wki-pt" onclick="wkiShowDetail(${i})">
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="12" fill="transparent"/>
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="${dotColor}" stroke="var(--bg)" stroke-width="1.5"/>
      ${extra}
    </g>`;
  }).join('');
  const svg=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${gridLines}${segs}${markers}${xLabels}</svg>`;
  $('wki-graph-wrap').innerHTML=svg;
}

function wkiRenderBars(metrics){
  const maxScore=Math.max(...metrics.map(m=>m.score),1);
  $('wki-bars').innerHTML=metrics.map(m=>{
    if(m.dataState==='unobserved'){
      return `<div class="wki-bar-row is-gap">
        <div class="wki-bar-lbl is-gap">${m.label}</div>
        <div class="wki-bar-track"></div>
        <div class="wki-bar-val">not logged</div>
      </div>`;
    }
    if(m.dataState==='confirmed-rest'){
      return `<div class="wki-bar-row is-rest">
        <div class="wki-bar-lbl is-rest">${m.label}</div>
        <div class="wki-bar-track"></div>
        <div class="wki-bar-val">☾ rest day</div>
      </div>`;
    }
    const taskW=maxScore?Math.round((m.weighted*10/maxScore)*100):0;
    const focusW=maxScore?Math.round((m.focusSec/60/maxScore)*100):0;
    const noData=m.tasksCompleted===0&&m.focusSec===0;
    const lowConf=m.confidence==='low'?' <span style="opacity:.6">(backfilled)</span>':'';
    return `<div class="wki-bar-row">
      <div class="wki-bar-lbl">${m.label}</div>
      <div class="wki-bar-track">
        <div class="wki-bar-seg" style="width:${taskW}%;background:var(--amber);border-color:var(--amber)" title="${m.tasksCompleted} task(s) completed"></div>
        <div class="wki-bar-seg" style="width:${focusW}%;background:var(--pc);border-color:var(--pc)" title="${fmtDur(m.focusSec)} focused"></div>
      </div>
      <div class="wki-bar-val">${noData?'zero logged':`${m.tasksCompleted} task${m.tasksCompleted===1?'':'s'}${m.focusSec?' · '+fmtDur(m.focusSec):''}`}${lowConf}</div>
    </div>`;
  }).join('');
}

function wkiShowDetail(i){
  if(!wkiCache)return;
  const {metrics,analysis}=wkiCache;
  const m=metrics[i];

  if(m.dataState==='unobserved'){
    $('wki-detail').innerHTML=`<div class="wki-d-title">${m.iso}</div>
      <div style="margin-bottom:8px;">No data logged for <b>${m.label}</b> — BLOC doesn't know what happened here. It's shown as a <b>gap</b>, not a zero, so it won't drag down your averages, trend, or streak.</div>
      <div style="color:var(--muted2);">Was this a rest day, or did something happen you just didn't log?</div>
      <div class="wki-day-actions">
        <button class="wki-action-btn" onclick="openBackfill('${m.iso}')">⏱ BACKFILL THIS DAY</button>
        <button class="wki-action-btn ghost" onclick="markRestDay('${m.iso}');wkiShowDetail(${i})">🌙 MARK AS REST DAY</button>
      </div>`;
    return;
  }
  if(m.dataState==='confirmed-rest'){
    $('wki-detail').innerHTML=`<div class="wki-d-title">${m.iso}</div>
      <div style="margin-bottom:8px;">🌙 <b>${m.label}</b> is a confirmed rest day — excluded from trend, average, and streak math. This doesn't count against you.</div>
      <div class="wki-day-actions">
        <button class="wki-action-btn ghost" onclick="unmarkRestDay('${m.iso}');wkiShowDetail(${i})">↺ THIS WASN'T A REST DAY</button>
      </div>`;
    return;
  }

  const type=analysis.pointTypes[i];
  const isInfl=analysis.inflectionIdx.has(i);
  const prevSlope=i>0?analysis.slopes[i-1]:null;
  const nextSlope=i<metrics.length-1?analysis.slopes[i]:null;
  const slopeWord={up:'rising',down:'falling',flat:'flat / steady',gap:null};
  let headline;
  if(type==='peak')headline=`<b>${m.label}</b> was a <b>peak</b> — your score here was higher than the nearest logged day(s). This is a sweet spot worth studying.`;
  else if(type==='valley')headline=`<b>${m.label}</b> was a <b>low point</b> — lower than the nearest logged day(s). Not necessarily bad — could be a light day, or a sign something got in the way.`;
  else headline=`<b>${m.label}</b> sits in the middle of the trend — no peak or low here.`;
  let intervalText='';
  if(prevSlope&&nextSlope&&slopeWord[prevSlope]&&slopeWord[nextSlope])intervalText=`Coming in, the trend was <b>${slopeWord[prevSlope]}</b>; heading out, it's <b>${slopeWord[nextSlope]}</b>.`;
  else if(nextSlope&&slopeWord[nextSlope])intervalText=`Heading into the next logged day, the trend is <b>${slopeWord[nextSlope]}</b>.`;
  else if(prevSlope&&slopeWord[prevSlope])intervalText=`Coming out of the previous logged day, the trend was <b>${slopeWord[prevSlope]}</b>.`;
  const inflText=isInfl?`This is also an <b>inflection point</b> — the trend's curvature flips here (e.g. a decline that was speeding up starts slowing down, or vice versa). Often shows up a step before a peak or low fully forms.`:'';
  const trackText=m.tracked
    ? `Timer: ${fmtDur(m.focusSec)} across ${m.sessionsCount} session${m.sessionsCount===1?'':'s'}${m.distractions?`, ${m.distractions} distraction${m.distractions===1?'':'s'} logged`:''}${m.confidence==='low'?' <span style="opacity:.65">(includes backfilled, low-confidence time)</span>':''}.`
    : `No timer session logged this day — score here comes entirely from tasks completed.`;
  const taskText=m.tasksCompleted
    ? `${m.tasksCompleted} task${m.tasksCompleted===1?'':'s'} completed (priority-weighted score: ${m.weighted*10}).`
    : `No tasks marked complete this day.`;
  $('wki-detail').innerHTML=`<div class="wki-d-title">${m.iso}</div>
    <div style="margin-bottom:8px;">${headline}</div>
    <div style="margin-bottom:8px;">${intervalText} ${inflText}</div>
    <div>${taskText} ${trackText}</div>
    <div style="margin-top:8px;color:var(--muted2);">Score: <b style="color:var(--txt)">${m.score}</b> = (${m.weighted}×10 task weight) + (${Math.round(m.focusSec/60)} focus min)</div>
    <div class="wki-day-actions">
      <button class="wki-action-btn ghost" onclick="markRestDay('${m.iso}');wkiShowDetail(${i})">🌙 MARK AS REST DAY</button>
    </div>`;
}

function wkiReport(){
  if(!wkiCache)wkiRenderAll();
  const {metrics,analysis}=wkiCache;
  const n=metrics.length;
  const trackedDays=metrics.filter(m=>m.tracked).length;
  const gapDays=metrics.filter(m=>m.dataState==='unobserved').length;
  const restDays=metrics.filter(m=>m.dataState==='confirmed-rest').length;
  const peak=analysis.validCount>0?metrics[analysis.peakIdx]:null;
  const totalTasks=metrics.reduce((a,m)=>a+m.tasksCompleted,0);
  const totalFocusMin=Math.round(metrics.reduce((a,m)=>a+m.focusSec,0)/60);

  const catCounts={A:0,B:0,C:0,D:0,E:0};
  taskCompletionLog.forEach(l=>{if(catCounts[l.type]!==undefined)catCounts[l.type]++;});
  const catTotal=Object.values(catCounts).reduce((a,b)=>a+b,0);
  let weakestCat=null;
  if(catTotal>0){
    const openByType={};SECTS.forEach(s=>{openByType[s.type]=tasks.filter(t=>t.type===s.type&&!t.done).length;});
    weakestCat=Object.entries(openByType).sort((a,b)=>b[1]-a[1])[0];
  }

  const trendWord=analysis.trendSlope>0.5?'trending upward':analysis.trendSlope<-0.5?'trending downward':'holding roughly steady';
  const avoidance=tasks.filter(t=>t.type==='A'&&!t.done&&t.created&&(Date.now()-t.created)>3*86400000);

  let summary=`Over the last ${n} days, you completed <b>${totalTasks}</b> task${totalTasks===1?'':'s'}`;
  summary+=totalFocusMin>0?` and logged <b>${fmtDur(totalFocusMin*60)}</b> of timer-tracked focus.`:', with no timer sessions logged — this read is based on task completions alone.';
  summary+=` Your overall trend is <b>${trendWord}</b>${analysis.validCount<n?` (based on the ${analysis.validCount} day${analysis.validCount===1?'':'s'} with real data)`:''}.`;
  if(gapDays>0)summary+=` ${gapDays} of these ${n} days have <b>no data logged at all</b> — they're shown as gaps, not zeros, and don't count against your trend or streak. Worth a quick backfill if you remember what happened.`;
  if(restDays>0)summary+=` ${restDays} day${restDays===1?' was':'s were'} marked as a <b>confirmed rest day</b> — also excluded from the trend and streak math.`;

  let patterns='';
  if(peak)patterns+=`<div style="margin-bottom:8px;">Your peak day was <b>${peak.label}</b> (score ${peak.score}). `+ (analysis.peakIdx<n-1&&analysis.slopes[analysis.peakIdx]==='down' ? `The day after, your score dropped — worth checking what changed (workload, sleep, a deadline passing, etc.).` : `Look at what was different that day — task mix, time of day you worked, or what was on the calendar.`)+`</div>`;
  if(trackedDays<n)patterns+=`<div style="margin-bottom:8px;">You only used the focus timer on ${trackedDays}/${n} days. That's fine — the graph still counts task completions on the other days — but if you want the graph to reflect deep-work time specifically, running the timer more consistently would sharpen it.</div>`;
  if(weakestCat&&weakestCat[1]>0)patterns+=`<div style="margin-bottom:8px;">Category <b>${weakestCat[0]}</b> has the most open (incomplete) tasks right now (${weakestCat[1]}). ${weakestCat[0]==='A'?'Since A-tasks carry real consequences, this is worth a closer look.':weakestCat[0]==='E'?'These are meant to be eliminated anyway — a good batch to just delete.':'Consider whether these need delegating, scheduling, or dropping.'}</div>`;
  if(avoidance.length>0)patterns+=`<div>${avoidance.length} "Must Do" task${avoidance.length===1?' has':'s have'} been sitting open for 3+ days — a possible avoidance pattern.</div>`;
  if(!patterns)patterns='<div>Not enough variation in the data yet to call out a clear pattern — keep going and check back in a few days.</div>';

  const suggestions=[];
  if(peak&&analysis.peakIdx<n-1&&analysis.slopes[analysis.peakIdx]==='down')suggestions.push(`Try scheduling your hardest A-tasks on the same day-of-week as your peak (${peak.date.toLocaleDateString('en-US',{weekday:'long'})}) — that's when your output tends to be highest.`);
  if(trackedDays<n*0.5)suggestions.push(`Run the focus timer more often, even for short blocks — it'll make the "focus" half of your score (and the report) more accurate.`);
  if(weakestCat&&weakestCat[1]>2)suggestions.push(`Set aside a short block specifically for clearing out Category ${weakestCat[0]} tasks — either finish them or formally delegate/eliminate them so they stop weighing on the list.`);
  if(avoidance.length>0)suggestions.push(`Pick one avoided "Must Do" task and do just the first 10 minutes of it today — momentum usually breaks avoidance faster than willpower does.`);
  if(analysis.trendSlope<-0.5)suggestions.push(`Your trend is heading down — consider a lighter, lower-pressure day next, then reassess rather than pushing harder into the dip.`);
  if(analysis.trendSlope>0.5)suggestions.push(`Your trend is heading up — this is a good window to tackle a task you've been postponing, while momentum is on your side.`);
  if(!suggestions.length)suggestions.push(`Keep the current routine going for now — there's no strong signal yet to change anything.`);

  $('wki-report-output').innerHTML=`
    <div class="wki-r-sec"><div class="wki-r-head">Summary</div><div class="wki-r-body">${summary}</div></div>
    <div class="wki-r-sec"><div class="wki-r-head">Patterns Noticed</div><div class="wki-r-body">${patterns}</div></div>
    <div class="wki-r-sec"><div class="wki-r-head">Suggested Next Steps</div><ul class="wki-r-list">${suggestions.map(s=>`<li>${s}</li>`).join('')}</ul></div>
    <div class="wki-track-note">This report is generated on-device by simple rule-based logic reading your own tasks and sessions — not a connected AI model. Nothing leaves your browser.</div>`;
  $('wki-report-output').style.display='block';
  showToast('✓ REPORT GENERATED');
}

function wkiAiData(){
  if(!wkiCache)wkiRenderAll();
  const {metrics,analysis}=wkiCache;
  const n=metrics.length;
  const trackedDays=metrics.filter(m=>m.tracked).length;
  const gapDays=metrics.filter(m=>m.dataState==='unobserved').length;
  const restDays=metrics.filter(m=>m.dataState==='confirmed-rest').length;
  const peak=analysis.validCount>0?metrics[analysis.peakIdx]:null;
  const totalTasks=metrics.reduce((a,m)=>a+m.tasksCompleted,0);
  const totalFocusMin=Math.round(metrics.reduce((a,m)=>a+m.focusSec,0)/60);
  const catCounts={A:0,B:0,C:0,D:0,E:0};
  taskCompletionLog.forEach(l=>{if(catCounts[l.type]!==undefined)catCounts[l.type]++;});
  const openByType={};SECTS.forEach(s=>{openByType[s.type]=tasks.filter(t=>t.type===s.type&&!t.done).length;});
  const avoidance=tasks.filter(t=>t.type==='A'&&!t.done&&t.created&&(Date.now()-t.created)>3*86400000);
  const trendWord=analysis.trendSlope>0.5?'trending upward':analysis.trendSlope<-0.5?'trending downward':'holding roughly steady';
  return [
    `Trend window: last ${n} days (${trackedDays} with timer data, ${gapDays} with no data logged, ${restDays} confirmed rest days).`,
    `Totals in that window: ${totalTasks} tasks completed, ${fmtDur(totalFocusMin*60)} of timer-tracked focus. Overall trend: ${trendWord}.`,
    peak?`Peak day: ${peak.label} (score ${peak.score}).`:null,
    `Open tasks by category — ${Object.entries(openByType).map(([k,v])=>`${k}:${v}`).join(' ')}.`,
    avoidance.length?`${avoidance.length} "Must Do" (A) task(s) open 3+ days: ${avoidance.slice(0,5).map(t=>t.text).join(' | ')}.`:'No long-avoided A-tasks right now.',
    baiContextSummary()
  ].filter(Boolean).join('\n');
}
async function wkiAiReport(){
  if(!baiGetGeminiKey()){
    baiSetupGemini();
    if(!baiGetGeminiKey())return;
  }
  const out=$('wki-ai-report-output');
  out.style.display='block';
  out.innerHTML=`<div class="wki-r-sec"><div class="wki-r-body">✨ Generating…</div></div>`;
  const prompt=`You are BLOC AGENT writing a productivity report for the user of a task/focus-timer app called BLOC. Write 3 short sections — Summary, Patterns Noticed, Suggested Next Steps — in plain text (no markdown, no asterisks, no headers other than the three section names on their own line followed by a colon). 250-350 words total, warm but analytical tone, reference concrete numbers from the data below.\n${baiProfileBlock()}\nData:\n\n${wkiAiData()}`;
  try{
    const text=await baiCallGemini(prompt,{maxOutputTokens:2048,thinkingLevel:'low'});
    const html=escHTML(text).replace(/\n\s*\n/g,'<br><br>').replace(/\n/g,'<br>');
    out.innerHTML=`<div class="wki-r-sec"><div class="wki-r-body">${html}</div></div><div class="wki-track-note">Generated by Gemini from a snapshot of your on-device data (same connection as BLOC Agent), sent only for this request.</div>`;
    showToast('✓ AI REPORT GENERATED');
  }catch(err){
    out.innerHTML=`<div class="wki-r-sec"><div class="wki-r-body">Couldn't generate the AI report: ${escHTML(err.message||'unknown error')}</div></div>`;
  }
}


const CAL_KEY='bloc_cal_v1';
let calEvents=JSON.parse(localStorage.getItem(CAL_KEY)||'[]');
let viewMode='day';
let cursorDay=bocNow(); cursorDay.setHours(0,0,0,0);
const NOTIFIED_KEY='bloc_notified_v1';
function loadNotified(){
  try{
    const raw=JSON.parse(localStorage.getItem(NOTIFIED_KEY)||'{}');
    return new Set((raw.dateISO===isoDate(bocNow())&&Array.isArray(raw.keys))?raw.keys:[]);
  }catch(e){return new Set();}
}
function saveNotified(){localStorage.setItem(NOTIFIED_KEY,JSON.stringify({dateISO:isoDate(bocNow()),keys:Array.from(notified)}));}
let dragState=null,editId=null,editOccDay=null,editSeries=false,pickedType='B',customColor=null,notified=loadNotified();
const PX_PER_MIN=56/60;

const LIFE_CHORES=[
  {i:'🚿',n:'Shower',d:20},{i:'🪥',n:'Get ready',d:30},{i:'🍽',n:'Meal',d:40},{i:'🧺',n:'Laundry',d:45},
  {i:'🧹',n:'Tidy up',d:30},{i:'🛒',n:'Groceries',d:60},{i:'🚶',n:'Walk',d:30},{i:'😴',n:'Nap',d:30},
  {i:'🪴',n:'Water plants',d:10},{i:'💊',n:'Medication',d:5}
];
const LIFE_HIDE_KEY='bloc_cal_hide_life_v1';
let lifeHidden=false;try{lifeHidden=localStorage.getItem(LIFE_HIDE_KEY)==='1';}catch(e){}
let evtKind='work',lifeIcon='';
function calToggleLife(){lifeHidden=!lifeHidden;try{localStorage.setItem(LIFE_HIDE_KEY,lifeHidden?'1':'0');}catch(e){}calRender();showToast(lifeHidden?'LIFE CHORES HIDDEN':'LIFE CHORES SHOWN');}
const shownOn=(iso)=>{const l=calEventsForDate(iso);return lifeHidden?l.filter(e=>e.kind!=='life'):l;};
function lifeChips(){
  const el=$('cal-life-chips');if(!el)return;
  el.innerHTML=LIFE_CHORES.map((c,i)=>`<div class="cal-life-chip" role="button" tabindex="0" draggable="true" ondragstart="dragChore(event,${i})" onclick="clickChore(${i})" onkeydown="if(event.key==='Enter')clickChore(${i})" title="Drag onto the calendar, or click to add — ${c.d} min"><span>${c.i}</span>${escHTML(c.n)}</div>`).join('');
  const b=$('cal-life-btn');if(b){b.classList.toggle('on',!lifeHidden);b.textContent=lifeHidden?'◌ LIFE HIDDEN':'◌ LIFE';}
}
const dragChore=(e,i)=>{e.dataTransfer.setData('text/plain','life:'+i);};
const choreFromDrag=(id)=>(id&&id.indexOf('life:')===0)?LIFE_CHORES[parseInt(id.slice(5),10)]||null:null;
function addChore(ch,iso,start){
  const id='e'+Date.now()+Math.floor(Math.random()*1000);
  calEvents.push({id,title:ch.n,icon:ch.i,kind:'life',dateISO:iso,start,end:Math.min(1440,start+ch.d),repeat:'none',reminder:0,notes:'',type:'B',taskId:'',color:'',customRecur:null,done:false});
  saveCal();justLinked=id;calRender();showToast(ch.i+' '+ch.n.toUpperCase()+' ADDED');
  setTimeout(()=>{justLinked=null;},650);
}
function clickChore(i){
  const c=LIFE_CHORES[i];if(!c)return;
  const now=bocNow(),mins=Math.ceil((now.getHours()*60+now.getMinutes()+1)/30)*30;
  openEventModal({kind:'life',icon:c.i,title:c.n,dateISO:isoDate(cursorDay),start:Math.min(mins,1440-c.d),end:Math.min(mins,1440-c.d)+c.d,reminder:0});
}
const evtSetKind=(k)=>{evtKind=k==='life'?'life':'work';applyKind();};
function applyKind(){
  const life=evtKind==='life';
  $('evt-kind-work').classList.toggle('on',!life);$('evt-kind-life').classList.toggle('on',life);
  $('evt-link-row').style.display=life?'none':'flex';
  $('evt-color-row').style.display=life?'none':'flex';
  $('evt-life-picks').style.display=life?'flex':'none';
  $('evt-title').placeholder=life?'Chore or routine…':'Event title…';
  if(life)$('evt-life-picks').innerHTML=LIFE_CHORES.map((c,i)=>{const pickMods=(lifeIcon===c.i&&$('evt-title').value.trim()===c.n?' on':'');return `<button type="button" class="evt-life-pick${pickMods}" onclick="pickChore(${i})">${c.i} ${escHTML(c.n)}</button>`}).join('');
}
const pickChore=(i)=>{
  const c=LIFE_CHORES[i];if(!c)return;
  lifeIcon=c.i;$('evt-title').value=c.n;
  const st=fromHHMM($('evt-start').value||'09:00');$('evt-end').value=hhmm(Math.min(1439,st+c.d));
  applyKind();
};

const saveCal=()=>{localStorage.setItem(CAL_KEY,JSON.stringify(calEvents));};
function isoDate(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
const minToY=(m)=>m*PX_PER_MIN;
const yToMin=(y)=>Math.max(0,Math.min(1425,Math.round((y/PX_PER_MIN)/15)*15));
function fmtClock(mins){mins=Math.round(mins);const dayMins=((mins%1440)+1440)%1440;let h=Math.floor(dayMins/60),m=dayMins%60;const ap=h<12?'AM':'PM';let hh=h%12;if(hh===0)hh=12;return `${hh}:${pad(m)}${ap}`;}
const hhmm=(mins)=>`${pad(Math.floor(mins/60))}:${pad(mins%60)}`;
const fromHHMM=(str)=>{const p=str.split(':');return (parseInt(p[0])||0)*60+(parseInt(p[1])||0);};
function calWeekStart(d){const nd=new Date(d);nd.setDate(nd.getDate()-nd.getDay());nd.setHours(0,0,0,0);return nd;}
const weekDays=()=>{const start=calWeekStart(cursorDay);return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d;});};

function calStep(dir){
  if(viewMode==='day')cursorDay.setDate(cursorDay.getDate()+dir);
  else if(viewMode==='month')cursorDay.setMonth(cursorDay.getMonth()+dir);
  else cursorDay.setDate(cursorDay.getDate()+dir*7);
  calRender();
}
const calGoToday=()=>{cursorDay=bocNow();cursorDay.setHours(0,0,0,0);calRender();setTimeout(calAutoScroll,30);};
const calSetMode=(m)=>{viewMode=m;calRender();};
const pickDay=(iso)=>{cursorDay=new Date(iso+'T00:00:00');viewMode='day';calRender();};
function calAutoScroll(){const wrap=$('cal-grid-wrap');if(!wrap)return;const now=bocNow();const mins=now.getHours()*60+now.getMinutes();wrap.scrollTop=Math.max(0,minToY(mins)-160);}

const calIsRecurringEv=(ev)=>!!(ev.repeat&&ev.repeat!=='none');
function calGetOccurrence(ev,iso){
  const ov=(ev.overrides&&ev.overrides[iso])||null;
  if(ov&&ov.deleted)return null;
  if(!ov)return ev;
  const merged=Object.assign({},ev,ov);
  delete merged.deleted;
  merged._occDate=iso;
  return merged;
}
function calSetEventDone(ev,iso,done){
  if(!calIsRecurringEv(ev)){ev.done=done;return;}
  ev.overrides=ev.overrides||{};
  ev.overrides[iso]=Object.assign({},ev.overrides[iso],{done:done});
}
function overrideOn(ev,iso,fields){
  ev.overrides=ev.overrides||{};
  ev.overrides[iso]=Object.assign({},ev.overrides[iso],fields);
}
const skipOn=(ev,iso)=>{
  ev.overrides=ev.overrides||{};
  ev.overrides[iso]=Object.assign({},ev.overrides[iso],{deleted:true});
};
function calEventOccursOn(ev,iso){
  if(ev.overrides&&ev.overrides[iso]&&ev.overrides[iso].deleted)return false;
  if(ev.dateISO===iso)return true;
  if(!ev.repeat||ev.repeat==='none')return false;
  const d=new Date(iso+'T00:00:00'),base=new Date(ev.dateISO+'T00:00:00');
  if(d<base)return false;
  if(ev.repeat==='daily')return true;
  if(ev.repeat==='weekdays')return d.getDay()>=1&&d.getDay()<=5;
  if(ev.repeat==='weekly')return d.getDay()===base.getDay();
  if(ev.repeat==='monthly')return d.getDate()===base.getDate();
  if(ev.repeat==='yearly')return d.getDate()===base.getDate()&&d.getMonth()===base.getMonth();
  if(ev.repeat==='custom')return customRecurHits(ev,d,base);
  return false;
}
function customRecurHits(ev,d,base){
  const cr=ev.customRecur;if(!cr)return false;
  const interval=Math.max(1,cr.interval||1),unit=cr.unit||'day';
  if(cr.endType==='date'&&cr.endDate&&isoDate(d)>cr.endDate)return false;
  let nth=null;
  if(unit==='day'){
    const gap=Math.round((d-base)/86400000);
    if(gap%interval!==0)return false;
    nth=gap/interval;
  }else if(unit==='week'){
    const weekdays=(cr.weekdays&&cr.weekdays.length)?cr.weekdays:[base.getDay()];
    if(!weekdays.includes(d.getDay()))return false;
    const baseWk=calWeekStart(base),dayWk=calWeekStart(d);
    const weeksApart=Math.round((dayWk-baseWk)/(7*86400000));
    if(weeksApart%interval!==0)return false;
    nth=weeksApart/interval;
  }else if(unit==='month'){
    if(d.getDate()!==base.getDate())return false;
    const monthsApart=(d.getFullYear()-base.getFullYear())*12+(d.getMonth()-base.getMonth());
    if(monthsApart<0||monthsApart%interval!==0)return false;
    nth=monthsApart/interval;
  }else return false;
  if(cr.endType==='count'&&cr.endCount&&nth!=null&&nth>=cr.endCount)return false;
  return true;
}
function calEventsForDate(iso){return calEvents.filter(ev=>calEventOccursOn(ev,iso)).map(ev=>calGetOccurrence(ev,iso)).filter(Boolean);}
function packLanes(evs){
  const sorted=[...evs].sort((a,b)=>a.start-b.start);
  const laneEnds=[];
  const placed=sorted.map(ev=>{
    let idx=laneEnds.findIndex(e=>e<=ev.start);
    if(idx===-1){idx=laneEnds.length;laneEnds.push(ev.end);}else laneEnds[idx]=ev.end;
    return {ev,colIdx:idx};
  });
  const lanes=Math.max(1,laneEnds.length);
  return placed.map(p=>({...p,cols:lanes}));
}

function calRender(){
  syncNotifBtn();
  $('cal-mode-day').classList.toggle('on',viewMode==='day');
  $('cal-mode-week').classList.toggle('on',viewMode==='week');
  $('cal-mode-month').classList.toggle('on',viewMode==='month');
  const isMonth=viewMode==='month';
  $('cal-day-tabs').style.display=isMonth?'none':'flex';
  $('cal-grid-wrap').style.display=isMonth?'none':'block';
  $('cal-month-wrap').classList.toggle('active',isMonth);
  drawTitle();
  if(isMonth){
    drawMonth();
  }else{
    drawDayTabs();
    drawGrid();
  }
  drawSidebar();
  lifeChips();
  nowLine();
  applyCalBg();
  primeBadge();
  if(window.syncCalendarBar)window.syncCalendarBar();
}
function primeBadge(){
  const badge=$('prime-time-badge');
  if(!badge)return;
  const hourly=(typeof focusHourlyStats==='function')?focusHourlyStats():null;
  if(!hourly||hourly.totalW<6){badge.style.display='none';return;}
  const ranked=hourly.perHour.filter(h=>h.w>=1.5).sort((a,b)=>b.avg-a.avg);
  if(!ranked.length){badge.style.display='none';return;}
  const top=ranked.slice(0,2).map(h=>h.h);
  const fmtH=h=>{const ap=h<12?'AM':'PM';let hh=h%12;if(hh===0)hh=12;return `${hh}${ap}`;};
  badge.textContent=`⚡ Your best hours: ${top.map(fmtH).join(', ')}`;
  badge.style.display='inline-flex';
}
function drawTitle(){
  if(viewMode==='day'){
    $('cal-title').textContent=cursorDay.toLocaleDateString('en-US',Object.assign({weekday:'long',month:'short',day:'numeric'},cursorDay.getFullYear()!==bocNow().getFullYear()?{year:'numeric'}:{}));
  }else if(viewMode==='month'){
    $('cal-title').textContent=cursorDay.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  }else{
    const start=calWeekStart(cursorDay),end=new Date(start);end.setDate(end.getDate()+6);
    const sameMonth=start.getMonth()===end.getMonth();
    $('cal-title').textContent=sameMonth?`${start.toLocaleDateString('en-US',{month:'long'})} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`:`${start.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${end.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;
  }
}
function drawMonth(){
  const y=cursorDay.getFullYear(),m=cursorDay.getMonth();
  const firstDay=new Date(y,m,1);
  const gridStart=new Date(firstDay);gridStart.setDate(gridStart.getDate()-gridStart.getDay());
  const dowNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  $('cal-month-dow-row').innerHTML=dowNames.map(l=>`<div class="cal-month-dow">${l}</div>`).join('');
  const todayISO=isoDate(bocNow());
  let html='';
  for(let i=0;i<42;i++){
    const d=new Date(gridStart);d.setDate(d.getDate()+i);
    const iso=isoDate(d);
    const thisMonth=d.getMonth()===m;
    const isToday=iso===todayISO;
    const dayEvs=shownOn(iso).sort((a,b)=>a.start-b.start);
    const cap=3;
    let chipRows=dayEvs.slice(0,cap).map(ev=>{
      const isDone=!!ev.done;
      const isLife=ev.kind==='life';
      const color=ev.color?escHTML(ev.color):(isLife?'var(--life)':`var(--p${(ev.type||'B').toLowerCase()})`);
      const linkedTask=ev.taskId?tasks.find(x=>x.id===ev.taskId):null;
      const tip=ev.taskId?`Linked to task: ${escHTML(linkedTask?.text||'')} — ${escHTML(ev.title)}`:escHTML(ev.title);
      return`<div class="cal-month-chip${isDone?' done':''}${isLife?' life':''}${ev.taskId?' linked':''}${justLinked===ev.id?' just-linked':''}" style="--priority-color:${color}" onclick="event.stopPropagation();openExisting('${ev.id}','${iso}')" ondragover="calBlockDragOver(event)" ondragleave="calBlockDragLeave(event)" ondrop="calBlockDrop(event,'${ev.id}','${iso}')" title="${tip}">${linkedTask?taskStampHTML(linkedTask,`cal-month-chip-link${justLinked===ev.id?' stamp-in':''}`):''}${isLife&&ev.icon?ev.icon+' ':''}${escHTML(ev.title)}</div>`;
    }).join('');
    if(dayEvs.length>cap)chipRows+=`<div class="cal-month-more" onclick="event.stopPropagation();pickDay('${iso}')">+${dayEvs.length-cap} more</div>`;
    html+=`<div class="cal-month-cell${thisMonth?'':' other-month'}${isToday?' today':''}" onclick="pickDay('${iso}')" ondragover="event.preventDefault()" ondrop="dropOnMonth(event,'${iso}')">
      <div class="cal-month-daynum">${d.getDate()}</div>
      <div class="cal-month-chips">${chipRows}</div>
    </div>`;
  }
  $('cal-month-grid').innerHTML=html;
}
function dropOnMonth(e,iso){
  e.preventDefault();
  const id=e.dataTransfer.getData('text/plain');if(!id)return;
  const ch=choreFromDrag(id);if(ch){addChore(ch,iso,9*60);return;}
  const t=tasks.find(x=>x.id===id);if(!t)return;
  const dur=t.estimate&&t.estimate>0?t.estimate:30;
  const newId='e'+Date.now()+Math.floor(Math.random()*1000);
  calEvents.push({id:newId,title:t.text,dateISO:iso,start:9*60,end:9*60+dur,repeat:'none',reminder:10,notes:'',type:t.type,taskId:t.id,done:false});
  saveCal();justLinked=newId;calRender();showToast('TASK SCHEDULED');
  setTimeout(()=>{justLinked=null;},650);
}
function drawDayTabs(){
  const start=calWeekStart(cursorDay);
  let html='';
  for(let i=0;i<7;i++){
    const d=new Date(start);d.setDate(d.getDate()+i);
    const iso=isoDate(d),isToday=iso===isoDate(bocNow()),isSel=iso===isoDate(cursorDay);
    html+=`<div class="cal-day-tab${isSel?' on':''}${isToday?' today':''}" onclick="pickDay('${iso}')">
      <div class="cal-day-dow">${d.toLocaleDateString('en-US',{weekday:'short'})}</div>
      <div class="cal-day-num">${d.getDate()}</div>
    </div>`;
  }
  $('cal-day-tabs').innerHTML=html;
}
function drawSidebar(){
  const todayISO=isoDate(bocNow());
  const links={};
  calEvents.forEach(e=>{
    if(!e.taskId)return;
    const pending=calIsRecurringEv(e)?true:(e.dateISO>=todayISO&&!e.done);
    if(!pending)return;
    links[e.taskId]=(links[e.taskId]||0)+1;
  });
  const list=tasks.filter(t=>!t.done);
  if(!list.length){$('cal-sidebar-list').innerHTML='<div class="cal-sidebar-empty">Your task list is clear. Add tasks from the Tasks view, then drag them in here.</div>';return;}
  $('cal-sidebar-list').innerHTML=list.map(t=>{
    const n=links[t.id]||0;
    return`<div class="cal-chip" draggable="true" ondragstart="chipDragStart(event,'${t.id}')" ondragend="chipDragEnd(this)" style="--priority-color:var(--p${(t.type||'B').toLowerCase()})" title="${n?`Linked to ${n} event${n===1?'':'s'} — drag again to add another`:'Drag onto the calendar to schedule'}">
    ${n?taskStampHTML(t,'cal-chip-linked'):`<span class="cal-chip-dot"></span>`}<span>${escHTML(t.text)}</span>${n?`<span class="cal-chip-linked-count">×${n}</span>`:''}
  </div>`;
  }).join('');
}
function chipDragStart(e,id){e.dataTransfer.setData('text/plain',id);e.currentTarget.classList.add('dragging');document.body.classList.add('chip-drag-active');}
const chipDragEnd=(el)=>{el.classList.remove('dragging');document.body.classList.remove('chip-drag-active');document.querySelectorAll('.slot-hover').forEach(x=>x.classList.remove('slot-hover'));};
let justLinked=null;
function calBlockDragOver(e){
  if(!document.body.classList.contains('chip-drag-active'))return;
  const el=e.currentTarget;
  if(el.classList.contains('linked'))return;
  e.preventDefault();e.stopPropagation();
  el.classList.add('slot-hover');
}
const calBlockDragLeave=(e)=>{e.currentTarget.classList.remove('slot-hover');};
function calBlockDrop(e,evId,iso){
  if(!document.body.classList.contains('chip-drag-active'))return;
  const ev=calEvents.find(x=>x.id===evId);
  if(!ev)return;
  const occIso=iso||ev.dateISO;
  const occ=calGetOccurrence(ev,occIso);
  if(!occ||occ.taskId)return;
  e.preventDefault();e.stopPropagation();
  const chipId=e.dataTransfer.getData('text/plain');if(!chipId)return;
  const t=tasks.find(x=>x.id===chipId);if(!t)return;
  if(calIsRecurringEv(ev)){
    overrideOn(ev,occIso,{taskId:t.id,done:false});
  }else{
    ev.taskId=t.id;ev.done=false;
  }
  saveCal();
  justLinked=ev.id;
  calRender();
  showToast('TASK LINKED TO EVENT');
  setTimeout(()=>{justLinked=null;},650);
}
function dropOnGrid(e,iso){
  e.preventDefault();
  const id=e.dataTransfer.getData('text/plain');if(!id)return;
  const ch=choreFromDrag(id);
  if(ch){addChore(ch,iso,yToMin(e.clientY-e.currentTarget.getBoundingClientRect().top));return;}
  const t=tasks.find(x=>x.id===id);if(!t)return;
  const rect=e.currentTarget.getBoundingClientRect();
  const start=yToMin(e.clientY-rect.top);
  const dur=t.estimate&&t.estimate>0?t.estimate:30;
  const end=Math.min(1440,start+dur);
  const newId='e'+Date.now()+Math.floor(Math.random()*1000);
  calEvents.push({id:newId,title:t.text,dateISO:iso,start,end,repeat:'none',reminder:10,notes:'',type:t.type,taskId:t.id,done:false});
  saveCal();justLinked=newId;calRender();showToast('TASK SCHEDULED');
  setTimeout(()=>{justLinked=null;},650);
}

function drawGrid(){
  const days=viewMode==='day'?[new Date(cursorDay)]:weekDays();
  let hourRows='';
  for(let h=0;h<24;h++){const label=h===0?'12 AM':h<12?`${h} AM`:h===12?'12 PM':`${h-12} PM`;hourRows+=`<div class="cal-hour-row"><span>${label}</span></div>`;}
  let dayCols='';
  const liveNow=bocNow();const liveDay=isoDate(liveNow);const liveMin=liveNow.getHours()*60+liveNow.getMinutes();
  days.forEach(d=>{
    const iso=isoDate(d);
    dayCols+=`<div class="cal-col" data-date="${iso}" onmousedown="gridPress(event,'${iso}')" ondragover="event.preventDefault()" ondrop="dropOnGrid(event,'${iso}')">`;
    for(let h=1;h<24;h++)dayCols+=`<div class="cal-hourline" style="top:${h*56}px"></div>`;
    for(let h=0;h<24;h++)dayCols+=`<div class="cal-halfline" style="top:${h*56+28}px"></div>`;
    dayCols+=drawActual(iso);
    const packed=packLanes(shownOn(iso));
    packed.forEach(p=>{
      const t=p.ev;
      const isDone=!!t.done;
      const isLive=!isDone&&iso===liveDay&&liveMin>=t.start&&liveMin<t.end;
      const top=minToY(t.start),height=Math.max(minToY(t.end-t.start),18);
      const widthPct=100/p.cols,leftPct=p.colIdx*widthPct;
      const isLife=t.kind==='life';
      const color=t.color?escHTML(t.color):(isLife?'var(--life)':`var(--p${(t.type||'B').toLowerCase()})`);
      const linkedTask=t.taskId?tasks.find(x=>x.id===t.taskId):null;
      dayCols+=`<div class="cal-block${height<44?' sm':''}${isDone?' done':''}${isLife?' life':''}${isLive?' live':''}${t.taskId?' linked':''}${justLinked===t.id?' just-linked':''}" style="top:${top}px;height:${height}px;left:calc(${leftPct}% + 2px);width:calc(${widthPct}% - 4px);--priority-color:${color};" onmousedown="blockPress(event,'${t.id}','${iso}')" onclick="event.stopPropagation();openExisting('${t.id}','${iso}')" ondragover="calBlockDragOver(event)" ondragleave="calBlockDragLeave(event)" ondrop="calBlockDrop(event,'${t.id}','${iso}')">
        <div class="cal-block-chk" onclick="event.stopPropagation();tickBlock('${t.id}','${iso}')">${isDone?'✓':''}</div>
        ${linkedTask?taskStampHTML(linkedTask,`cal-block-link${justLinked===t.id?' stamp-in':''}`,'div',`Linked to task: ${linkedTask.text}`):''}
        <div class="cal-block-title">${isLife&&t.icon?`<span class="cal-life-ico">${t.icon}</span>`:''}${escHTML(t.title)}</div>
        <div class="cal-block-time">${fmtClock(t.start)} – ${fmtClock(t.end)}</div>
        <div class="cal-block-resize" onmousedown="resizePress(event,'${t.id}','${iso}')"></div>
      </div>`;
    });
    dayCols+='</div>';
  });
  $('cal-grid').innerHTML=`<div class="cal-hours">${hourRows}</div><div class="cal-cols">${dayCols}</div>`;
}
function actualBlocksOn(iso){
  return sessions.filter(s=>s.dateISO===iso&&s.source!=='backfill'&&s.elapsed>0).map(s=>{
    const endMs=parseInt(s.id,10);
    if(!endMs||isNaN(endMs))return null;
    const endD=bocFromMs(endMs);
    const endMin=endD.getHours()*60+endD.getMinutes();
    const startMin=Math.max(0,endMin-Math.round(s.elapsed/60));
    const endMinC=Math.min(1440,Math.max(startMin+5,endMin));
    return {session:s,start:startMin,end:endMinC,title:s.subject||'Focus session',taskId:s.taskId||null,eventId:s.eventId||null};
  }).filter(Boolean);
}
function drawActual(iso){
  return actualBlocksOn(iso).map(a=>{
    const top=minToY(a.start),height=Math.max(minToY(a.end-a.start),8);
    const linkedEv=a.eventId?calEvents.find(ev=>ev.id===a.eventId):(a.taskId?calEvents.find(ev=>ev.taskId===a.taskId&&calEventOccursOn(ev,iso)):null);
    let planNote='';
    if(linkedEv){
      const occ=calGetOccurrence(linkedEv,iso)||linkedEv;
      const planned=occ.end-occ.start,spent=a.end-a.start,delta=spent-planned;
      planNote=delta===0?' · on plan':(delta>0?` · +${delta}m over plan`:` · ${Math.abs(delta)}m under plan`);
    }
    const hue=a.taskId?taskStampHue(a.taskId):200;
    return `<div class="cal-actual-block" style="top:${top}px;height:${height}px;--stamp-hue:${hue}" title="Actual: ${fmtClock(a.start)}–${fmtClock(a.end)} — ${escHTML(a.title)}${planNote}"></div>`;
  }).join('');
}
function linkedAllDone(taskId,iso){
  const linked=calEvents.filter(e=>{
    if(!calEventOccursOn(e,iso))return false;
    const occ=calGetOccurrence(e,iso);
    return !!(occ&&occ.taskId===taskId);
  });
  if(!linked.length)return true;
  return linked.every(e=>{const occ=calGetOccurrence(e,iso);return !!(occ&&occ.done);});
}
function tickBlock(id,iso){
  const ev=calEvents.find(x=>x.id===id);if(!ev)return;
  const occDay=iso||ev.dateISO;
  const before=calGetOccurrence(ev,occDay)||{};
  const wasDone=!!before.done;
  const nowDone=!wasDone;
  calSetEventDone(ev,occDay,nowDone);
  const linkedId=before.taskId;
  if(linkedId){
    const t=tasks.find(x=>x.id===linkedId);
    if(t){
      const taskDay=t.dateISO||isoDate(bocNow());
      if(occDay===taskDay){
        if(!nowDone&&t.done){
          t.done=false;t.completedAt=null;unlogTaskCompletion(t);saveT();
        }else if(nowDone&&!t.done&&linkedAllDone(t.id,taskDay)){
          const blocker=getTaskDependency(t);
          if(blocker&&!blocker.done){
            showToast(`🔒 EVENTS DONE, BUT TASK IS BLOCKED — FINISH "${blocker.text.length>28?blocker.text.slice(0,28)+'…':blocker.text}" FIRST`);
          }else{
            completeTaskCore(t);saveT();
          }
        }
      }
    }
  }
  saveCal();
  calRender();
  checkTiers();
}

function gridPress(e,iso){
  if(e.target.closest('.cal-block'))return;
  const col=e.currentTarget;
  const rect=col.getBoundingClientRect();
  const startMin=yToMin(e.clientY-rect.top);
  dragState={type:'create',iso,col,startMin,finalStart:startMin,finalEnd:startMin+15};
  document.onmousemove=dragMove;document.onmouseup=dragEnd;
}
function blockPress(e,id,iso){
  if(e.target.classList.contains('cal-block-resize')||e.target.classList.contains('cal-block-chk'))return;
  e.stopPropagation();
  const ev=calEvents.find(x=>x.id===id);if(!ev)return;
  const occ=calGetOccurrence(ev,iso)||ev;
  const blockEl=e.currentTarget,col=blockEl.parentElement;
  const rect=col.getBoundingClientRect();
  const grab=(e.clientY-rect.top)-minToY(occ.start);
  dragState={type:'move',id,iso,col,blockEl,grabOffset:grab,dur:occ.end-occ.start,moved:false};
  document.onmousemove=dragMove;document.onmouseup=dragEnd;
}
function resizePress(e,id,iso){
  e.stopPropagation();
  const ev=calEvents.find(x=>x.id===id);if(!ev)return;
  const occ=calGetOccurrence(ev,iso)||ev;
  const blockEl=e.target.parentElement,col=blockEl.parentElement;
  dragState={type:'resize',id,iso,col,blockEl,origStart:occ.start,newEnd:occ.end,moved:false};
  document.onmousemove=dragMove;document.onmouseup=dragEnd;
}
function dragMove(e){
  if(!dragState)return;
  const rect=dragState.col.getBoundingClientRect();
  if(dragState.type==='create'){
    const mins=yToMin(e.clientY-rect.top);
    let s=Math.min(dragState.startMin,mins),en=Math.max(dragState.startMin,mins);
    if(en-s<15)en=s+15;
    dragState.finalStart=s;dragState.finalEnd=en;
    let box=dragState.col.querySelector('.cal-createbox');
    if(!box){box=document.createElement('div');box.className='cal-createbox';dragState.col.appendChild(box);}
    box.style.top=minToY(s)+'px';box.style.height=Math.max(minToY(en-s),14)+'px';
  }else if(dragState.type==='move'){
    let newStart=yToMin((e.clientY-rect.top)-dragState.grabOffset);
    newStart=Math.max(0,Math.min(1440-dragState.dur,newStart));
    dragState.newStart=newStart;dragState.moved=true;
    dragState.blockEl.style.top=minToY(newStart)+'px';
    const td=dragState.blockEl.querySelector('.cal-block-time');
    if(td)td.textContent=`${fmtClock(newStart)} – ${fmtClock(newStart+dragState.dur)}`;
  }else if(dragState.type==='resize'){
    let newEnd=yToMin(e.clientY-rect.top);
    newEnd=Math.max(dragState.origStart+15,Math.min(1440,newEnd));
    dragState.newEnd=newEnd;dragState.moved=true;
    dragState.blockEl.style.height=Math.max(minToY(newEnd-dragState.origStart),18)+'px';
    const td=dragState.blockEl.querySelector('.cal-block-time');
    if(td)td.textContent=`${fmtClock(dragState.origStart)} – ${fmtClock(newEnd)}`;
  }
}
function dragEnd(){
  if(!dragState)return;
  document.onmousemove=null;document.onmouseup=null;
  if(dragState.type==='create'){
    const box=dragState.col.querySelector('.cal-createbox');if(box)box.remove();
    openEventModal({dateISO:dragState.iso,start:dragState.finalStart,end:dragState.finalEnd});
  }else if(dragState.type==='move'&&dragState.moved){
    const ev=calEvents.find(x=>x.id===dragState.id);
    if(ev){
      const newStart=dragState.newStart,newEnd=dragState.newStart+dragState.dur;
      if(calIsRecurringEv(ev)){
        overrideOn(ev,dragState.iso,{start:newStart,end:newEnd});
      }else{
        ev.start=newStart;ev.end=newEnd;
      }
      saveCal();calRender();showToast('EVENT MOVED');
    }
  }else if(dragState.type==='resize'&&dragState.moved){
    const ev=calEvents.find(x=>x.id===dragState.id);
    if(ev&&dragState.newEnd!==undefined){
      if(calIsRecurringEv(ev)){
        overrideOn(ev,dragState.iso,{start:dragState.origStart,end:dragState.newEnd});
      }else{
        ev.end=dragState.newEnd;
      }
      saveCal();calRender();showToast('DURATION UPDATED');
    }
  }
  dragState=null;
}

function openEventModal(prefill,occIso,isSeries){
  prefill=prefill||{};
  editId=prefill.id||null;
  editOccDay=occIso||prefill.dateISO||null;
  editSeries=!!isSeries;
  $('evt-title').value=prefill.title||'';
  $('evt-date').value=prefill.dateISO||isoDate(cursorDay);
  $('evt-start').value=hhmm(prefill.start!==undefined?prefill.start:9*60);
  $('evt-end').value=hhmm(prefill.end!==undefined?prefill.end:9*60+30);
  $('evt-repeat').value=prefill.repeat||'none';
  restoreRecur(prefill.customRecur,prefill.dateISO||isoDate(cursorDay));
  evtRepeatChanged();
  $('evt-reminder').value=prefill.reminder!==undefined?String(prefill.reminder):'10';
  notesButton();
  pickedType=prefill.type||'B';
  customColor=prefill.color||null;
  $('evt-color-custom').value=customColor||'#e6a118';
  fillTaskLink(prefill.taskId||'');
  colorDots();
  evtKind=prefill.kind==='life'?'life':'work';lifeIcon=prefill.icon||'';applyKind();
  $('evt-del-btn').style.display=editId?'inline-block':'none';
  $('evt-dup-btn').style.display=editId?'inline-block':'none';
  $('evt-scope-row').style.display=editSeries?'flex':'none';
  if(editSeries){
    document.querySelectorAll('input[name=evt-edit-scope]').forEach(r=>r.checked=(r.value==='this'));
  }
  evtScopeChanged();
  $('evt-overlay').classList.add('open');
  setTimeout(()=>$('evt-title').focus(),50);
}
function evtScopeChanged(){
  const scope=editSeries?((document.querySelector('input[name=evt-edit-scope]:checked')||{}).value||'this'):'all';
  const lockRepeat=editSeries&&scope==='this';
  $('evt-repeat').disabled=lockRepeat;
  $('evt-repeat').title=lockRepeat?"Choose 'entire series' to change the repeat pattern":'';
  const delBtn=$('evt-del-btn');
  if(delBtn)delBtn.textContent=(editSeries&&scope==='this')?'DELETE THIS DATE':'DELETE';
  if(editSeries){
    const ev=calEvents.find(x=>x.id===editId);
    if(ev)$('evt-date').value=(scope==='all')?ev.dateISO:(editOccDay||ev.dateISO);
  }
}
function closeEventModal(){$('evt-overlay').classList.remove('open');editId=null;editOccDay=null;editSeries=false;}
function notesButton(){
  const wrap=$('evt-notes-row');if(!wrap)return;
  if(!editId){
    wrap.innerHTML=`<button class="evt-notes-btn" disabled title="Save the event first, then add notes">📝 Save the event to add notes</button>`;
    return;
  }
  const hasNote=typeof npNotes!=='undefined'&&npNotes.some(n=>n.linkType==='event'&&n.linkId===editId&&(n.content||'').replace(/<[^>]+>/g,'').trim());
  wrap.innerHTML=`<button class="evt-notes-btn${hasNote?' has-content':''}" onclick="npOpenEventNote('${editId}')">📝 ${hasNote?'Open Notes':'Add note…'}</button>`;
}
const EXTRA_COLORS=['#e8513a','#4ea8e8','#7c6fe0','#3d8a55','#f0c060','#c24a18'];
function colorDots(){
  const types=[['A','var(--pa)'],['B','var(--pb)'],['C','var(--pc)'],['D','var(--pd)'],['E','var(--pe)']];
  const isCustom=!!customColor;
  $('evt-colors').innerHTML=types.map(([t,c])=>{const dotMods=((!isCustom&&pickedType===t)?' on':'');return `<div class="evt-color-dot${dotMods}" style="background:${c}" onclick="pickColor('${t}')">${(!isCustom&&pickedType===t)?'✓':''}</div>`}).join('');
  $('evt-colors-ext').innerHTML=EXTRA_COLORS.map(c=>{const extraDotMods=((isCustom&&customColor.toLowerCase()===c.toLowerCase())?' on':'');return `<div class="evt-color-dot${extraDotMods}" style="background:${c}" onclick="evtPickCustomColor('${c}')">${(isCustom&&customColor.toLowerCase()===c.toLowerCase())?'✓':''}</div>`}).join('');
}
const pickColor=(t)=>{pickedType=t;customColor=null;colorDots();};
const evtPickCustomColor=(hex)=>{customColor=hex;$('evt-color-custom').value=hex;colorDots();};
const evtClearCustomColor=()=>{customColor=null;colorDots();};
function fillTaskLink(selId){
  const list=tasks.filter(t=>!t.done||t.id===selId);
  $('evt-task-link').innerHTML='<option value="">— Not linked to a task —</option>'+list.map(t=>`<option value="${t.id}"${t.id===selId?' selected':''}>${escHTML(t.text)}${t.done?' (done)':''}</option>`).join('');
}
function evtTaskLinkChanged(){
  const id=$('evt-task-link').value;
  if(id){const t=tasks.find(x=>x.id===id);if(t){if(!$('evt-title').value.trim())$('evt-title').value=t.text;pickedType=t.type;colorDots();}}
}
let recurDays=new Set();
function evtRepeatChanged(){
  const repeatMode=$('evt-repeat').value;
  $('evt-recur-custom').style.display=repeatMode==='custom'?'flex':'none';
  if(repeatMode==='custom'){recurDayRow();evtRecurUnitChanged();}
}
function recurDayRow(){
  const lbls=['S','M','T','W','T','F','S'];
  $('evt-recur-weekday-row').innerHTML=lbls.map((l,i)=>
    {const dayMods=(recurDays.has(i)?' on':'');return `<button type="button" class="recur-day-btn${dayMods}" onclick="toggleRecurDay(${i})">${l}</button>`}
  ).join('');
}
function toggleRecurDay(i){
  if(recurDays.has(i))recurDays.delete(i);else recurDays.add(i);
  recurDayRow();
}
function evtRecurUnitChanged(){
  const unit=$('evt-recur-unit').value;
  $('evt-recur-weekdays').style.display=unit==='week'?'block':'none';
}
const evtRecurEndChanged=()=>{};
function buildRecur(){
  const interval=Math.max(1,parseInt($('evt-recur-interval').value)||1);
  const unit=$('evt-recur-unit').value;
  const endType=(document.querySelector('input[name=evt-recur-end]:checked')||{}).value||'never';
  const endDate=$('evt-recur-end-date').value||'';
  const endCount=Math.max(1,parseInt($('evt-recur-end-count').value)||10);
  const weekdays=unit==='week'?Array.from(recurDays).sort():[];
  return {interval,unit,weekdays,endType,endDate,endCount};
}
function restoreRecur(cr,baseDateISO){
  cr=cr||{};
  $('evt-recur-interval').value=cr.interval||1;
  $('evt-recur-unit').value=cr.unit||'week';
  const endType=cr.endType||'never';
  document.querySelectorAll('input[name=evt-recur-end]').forEach(r=>r.checked=(r.value===endType));
  $('evt-recur-end-date').value=cr.endDate||'';
  $('evt-recur-end-count').value=cr.endCount||10;
  recurDays=new Set((cr.weekdays&&cr.weekdays.length)?cr.weekdays:(baseDateISO?[new Date(baseDateISO+'T00:00:00').getDay()]:[]));
  recurDayRow();
  evtRecurUnitChanged();
}
function saveEvent(){
  const title=$('evt-title').value.trim();if(!title){showToast('ENTER A TITLE');return;}
  const dateISO=$('evt-date').value||isoDate(cursorDay);
  let start=fromHHMM($('evt-start').value||'09:00'),end=fromHHMM($('evt-end').value||'09:30');
  if(end<=start)end=start+15;
  const repeat=$('evt-repeat').value,reminder=parseInt($('evt-reminder').value)||0,taskId=evtKind==='life'?'':($('evt-task-link').value||''),kind=evtKind,icon=kind==='life'?lifeIcon:'';
  const notes=editId?((calEvents.find(x=>x.id===editId)||{}).notes||''):'';
  const color=evtKind==='life'?'':(customColor||'');
  const customRecur=repeat==='custom'?buildRecur():null;
  const scope=editSeries?((document.querySelector('input[name=evt-edit-scope]:checked')||{}).value||'this'):'all';

  if(editId){
    const ev=calEvents.find(x=>x.id===editId);
    if(!ev){closeEventModal();return;}
    if(!editSeries||scope==='all'){
      Object.assign(ev,{title,dateISO,start,end,repeat,reminder,notes,type:pickedType,taskId,color,customRecur,kind,icon});
    }else{
      const occIso=editOccDay||ev.dateISO;
      if(dateISO!==occIso){
        const wasDone=!!(calGetOccurrence(ev,occIso)||{}).done;
        skipOn(ev,occIso);
        calEvents.push({id:'e'+Date.now()+Math.floor(Math.random()*1000),title,dateISO,start,end,repeat:'none',reminder,notes,type:pickedType,taskId,color,customRecur:null,kind,icon,done:wasDone});
      }else{
        overrideOn(ev,occIso,{title,start,end,reminder,notes,type:pickedType,taskId,color,kind,icon});
      }
    }
  }else{
    calEvents.push({id:'e'+Date.now()+Math.floor(Math.random()*1000),title,dateISO,start,end,repeat,reminder,notes,type:pickedType,taskId,color,customRecur,kind,icon,done:false});
  }
  saveCal();closeEventModal();calRender();showToast(editId?'EVENT UPDATED':'EVENT SCHEDULED');
}
function deleteEvent(){
  if(!editId)return;
  const ev=calEvents.find(x=>x.id===editId);
  if(!ev){closeEventModal();return;}
  const scope=editSeries?((document.querySelector('input[name=evt-edit-scope]:checked')||{}).value||'this'):'all';
  if(editSeries&&scope==='this'){
    skipOn(ev,editOccDay||ev.dateISO);
  }else{
    if(typeof npOrphanLinkedNote==='function')npOrphanLinkedNote('event',editId);
    calEvents=calEvents.filter(x=>x.id!==editId);
  }
  saveCal();closeEventModal();calRender();showToast((editSeries&&scope==='this')?'OCCURRENCE DELETED':'EVENT DELETED');
}
function duplicateEvent(){
  if(!editId)return;
  const ev=calEvents.find(x=>x.id===editId);if(!ev)return;
  const occIso=editOccDay||ev.dateISO;
  const occ=calGetOccurrence(ev,occIso)||ev;
  const newId='e'+Date.now()+Math.floor(Math.random()*1000);
  calEvents.push({id:newId,title:(occ.title||'Event')+' (copy)',dateISO:occIso,start:occ.start,end:occ.end,repeat:'none',reminder:occ.reminder!==undefined?occ.reminder:10,notes:occ.notes||'',type:occ.type||'B',taskId:'',color:occ.color||'',customRecur:null,kind:occ.kind||'work',icon:occ.icon||'',done:false});
  saveCal();closeEventModal();calRender();showToast('EVENT DUPLICATED');
  setTimeout(()=>openExisting(newId,occIso),60);
}
function openExisting(id,iso){
  const ev=calEvents.find(x=>x.id===id);if(!ev)return;
  const occIso=iso||ev.dateISO;
  const occ=calGetOccurrence(ev,occIso)||ev;
  openEventModal(occ,occIso,calIsRecurringEv(ev));
}

const NOTIF_ASKED_KEY='bloc_notif_asked_v1';
function maybeRequestNotifPermission(){
  if(!('Notification' in window)){syncNotifBtn();return;}
  if(Notification.permission==='default'&&!localStorage.getItem(NOTIF_ASKED_KEY)){
    localStorage.setItem(NOTIF_ASKED_KEY,'1');
    Notification.requestPermission().then(()=>syncNotifBtn()).catch(()=>syncNotifBtn());
  }
  syncNotifBtn();
}
function requestNotifManually(){
  if(!('Notification' in window)){showToast('NOTIFICATIONS NOT SUPPORTED IN THIS BROWSER');return;}
  if(Notification.permission==='denied'){showToast('BLOCKED — ENABLE IN BROWSER SITE SETTINGS, THEN RELOAD');return;}
  if(Notification.permission==='granted'){testNotif();return;}
  localStorage.setItem(NOTIF_ASKED_KEY,'1');
  Notification.requestPermission().then(permission=>{
    syncNotifBtn();
    if(permission==='granted')testNotif();
    else if(permission==='denied')showToast('BLOCKED — ENABLE IN BROWSER SITE SETTINGS, THEN RELOAD');
    else showToast('CHECK YOUR ADDRESS BAR FOR A BLOCKED-NOTIFICATION ICON');
  }).catch(()=>{syncNotifBtn();showToast('COULD NOT REQUEST PERMISSION');});
}
function testNotif(){
  showToast('🔔 REMINDERS ARE ON — sending a test now');
  try{new Notification('BLOC — Test Reminder',{body:'If you see this, reminders work. Keep this tab open — reminders only fire while BLOC is open in the browser.'});}
  catch(err){showToast('PERMISSION IS ON BUT THE TEST FAILED: '+(err.message||'unknown error'));}
}
function syncNotifBtn(){
  const b=$('cal-notif-btn');if(!b)return;
  if(!('Notification' in window)){window.paintNotifButton?window.paintNotifButton(b,'unsupported'):(b.textContent='🔕 UNSUPPORTED');b.disabled=true;return;}
  const p=Notification.permission;
  b.disabled=false;
  if(p==='granted'){window.paintNotifButton?window.paintNotifButton(b,'on'):(b.textContent='🔔 REMINDERS ON');}
  else if(p==='denied'){window.paintNotifButton?window.paintNotifButton(b,'denied'):(b.textContent='🔕 BLOCKED');}
  else{window.paintNotifButton?window.paintNotifButton(b,'ask'):(b.textContent='🔔 ENABLE REMINDERS');}
}
function nowLine(){
  document.querySelectorAll('.cal-now-line').forEach(el=>el.remove());
  const now=bocNow(),iso=isoDate(now),mins=now.getHours()*60+now.getMinutes();
  document.querySelectorAll('.cal-col').forEach(col=>{
    if(col.dataset.date===iso){const line=document.createElement('div');line.className='cal-now-line';line.style.top=minToY(mins)+'px';col.appendChild(line);}
  });
}
setInterval(()=>{const v=$('view-calendar');if(v&&v.classList.contains('active'))nowLine();},60000);
function checkReminders(){
  const now=bocNow(),iso=isoDate(now),curMin=now.getHours()*60+now.getMinutes();
  calEventsForDate(iso).forEach(ev=>{
    if(!ev.reminder)return;
    const key=ev.id+'|'+iso;
    if(notified.has(key))return;
    const remindAt=ev.start-ev.reminder;
    if(curMin>=remindAt&&curMin<ev.start){
      notified.add(key);
      saveNotified();
      showToast(`🔔 ${ev.title} — ${fmtClock(ev.start)}`);
      if('Notification' in window&&Notification.permission==='granted'){try{new Notification('BLOC — '+ev.title,{body:`Starts at ${fmtClock(ev.start)}`});}catch(err){}}
    }
  });
}
setInterval(checkReminders,20000);


const BG_KEY='bloc_cal_bg_v1';
const BG_PRESETS=[
  {name:'Default',value:''},
  {name:'Amber Dusk',value:'linear-gradient(160deg,#2a1f0f,#0b0a08 70%)',light:'#ecd6aa'},
  {name:'Deep Forest',value:'linear-gradient(160deg,#0f2a1a,#0b0a08 70%)',light:'#cfe3cf'},
  {name:'Ocean',value:'linear-gradient(160deg,#0f1f2a,#0b0a08 70%)',light:'#cde0ec'},
  {name:'Slate',value:'linear-gradient(160deg,#1c1c1c,#0b0a08 70%)',light:'#dad7d1'},
  {name:'Plum',value:'linear-gradient(160deg,#241228,#0b0a08 70%)',light:'#e4d1e8'},
];
function bgIsLight(){return document.body.classList.contains('theme-light');}
function bgBaseRgb(){
  if(!bgIsLight())return'11,10,8';
  try{return hexToRgbTuple(THEMES[currentTheme].bg).join(',');}catch(e){return'247,240,229';}
}
function bgPresetCss(presetValue){
  const p=BG_PRESETS.find(x=>x.value===presetValue);
  if(!p||!p.light||!bgIsLight())return presetValue;
  let base='#f7f0e5';try{base=THEMES[currentTheme].bg;}catch(e){}
  return`linear-gradient(160deg,${p.light},${base} 70%)`;
}
let calBg=(()=>{try{return JSON.parse(localStorage.getItem(BG_KEY)||'null')||{type:'none',value:'',dim:45};}catch(e){return{type:'none',value:'',dim:45};}})();
function saveBg(){localStorage.setItem(BG_KEY,JSON.stringify(calBg));}
function applyCalBg(){
  const wrap=$('cal-bg-layer');if(!wrap)return;
  if(!calBg.value){wrap.style.backgroundImage='';return;}
  const dim=Math.max(0,Math.min(90,calBg.dim||0))/100;
  const rgb=bgBaseRgb();
  const overlay=`linear-gradient(rgba(${rgb},${dim}),rgba(${rgb},${dim}))`;
  const img=calBg.type==='preset'?bgPresetCss(calBg.value):`url("${calBg.value.replace(/"/g,'')}")`;
  wrap.style.backgroundImage=`${overlay},${img}`;
}
function openBgModal(){
  renderBgPresets();
  $('bg-url-in').value=calBg.type==='url'?calBg.value:'';
  $('bg-dim-range').value=calBg.dim!=null?calBg.dim:45;
  $('bg-dim-val').textContent=(calBg.dim!=null?calBg.dim:45)+'%';
  $('bg-overlay').classList.add('open');
}
function closeBgModal(){$('bg-overlay').classList.remove('open');}
function renderBgPresets(){
  const row=$('bg-preset-row');if(!row)return;
  row.innerHTML=BG_PRESETS.map(p=>{
    const isOn=p.value?(calBg.type==='preset'&&calBg.value===p.value):(calBg.type==='none');
    const bgStyle=p.value?`background-image:${bgPresetCss(p.value)}`:`background:var(--surf2)`;
    return`<div class="bg-preset${isOn?' on':''}" style="${bgStyle}" onclick='selectBgPreset(${JSON.stringify(p.value)})' title="${escHTML(p.name)}"><span class="bg-preset-lbl">${escHTML(p.name)}</span></div>`;
  }).join('');
}
function selectBgPreset(presetValue){
  calBg=presetValue?{type:'preset',value: presetValue,dim:calBg.dim!=null?calBg.dim:45}:{type:'none',value:'',dim:calBg.dim!=null?calBg.dim:45};
  saveBg();applyCalBg();renderBgPresets();showToast(presetValue?'BACKGROUND UPDATED':'BACKGROUND RESET');
}
function handleBgFile(event){
  const file=event.target.files[0];if(!file)return;
  if(!file.type.startsWith('image/')){showToast('CHOOSE AN IMAGE FILE');event.target.value='';return;}
  const reader=new FileReader();
  reader.onload=e=>{
    calBg={type:'url',value:e.target.result,dim:calBg.dim!=null?calBg.dim:45};
    saveBg();applyCalBg();renderBgPresets();showToast('BACKGROUND SET');
  };
  reader.onerror=()=>showToast('COULD NOT READ IMAGE');
  reader.readAsDataURL(file);
  event.target.value='';
}
function applyBgUrl(){
  const url=$('bg-url-in').value.trim();
  if(!url){showToast('ENTER AN IMAGE URL');return;}
  calBg={type:'url',value:url,dim:calBg.dim!=null?calBg.dim:45};
  saveBg();applyCalBg();renderBgPresets();showToast('BACKGROUND SET');
}
function bgDimChanged(v){
  calBg.dim=parseInt(v)||0;
  $('bg-dim-val').textContent=calBg.dim+'%';
  saveBg();applyCalBg();
}
function clearBg(){
  calBg={type:'none',value:'',dim:45};
  $('bg-url-in').value='';$('bg-dim-range').value=45;$('bg-dim-val').textContent='45%';
  saveBg();applyCalBg();renderBgPresets();showToast('BACKGROUND RESET');
}

const CAL_PAL_KEY='bloc_cal_palette_v1';
const CAL_PALETTES={
  gallery:{label:'Gallery',mood:'Museum · Muted',pa:'#a8374a',pb:'#b5791f',pc:'#2f7d8c',pd:'#6a5aa8',pe:'#6f6b66',life:'#7fb5a3'},
  matcha:{label:'Matcha Studio',mood:'Green tea · Calm',pa:'#bd3f3a',pb:'#7d8a22',pc:'#2f8a6a',pd:'#4a6fa5',pe:'#6a7068',life:'#a8c98a'},
  dusk:{label:'Dusk Atelier',mood:'Plum · Warm',pa:'#c2456a',pb:'#c4702a',pc:'#7a5cc2',pd:'#3f86c2',pe:'#6a6275',life:'#e6a8c6'},
  nordic:{label:'Nordic Linen',mood:'Cool · Quiet',pa:'#b24a4a',pb:'#a5822f',pc:'#3d7ea6',pd:'#6b7fb8',pe:'#77808a',life:'#9cc7d9'},
  mineral:{label:'Mineral',mood:'Jewel · Deep',pa:'#9b2c4d',pb:'#a8691a',pc:'#1f7a6d',pd:'#3a56a3',pe:'#5b5663',life:'#b9a7e8'},
};
let calPalette=(()=>{try{const k=localStorage.getItem(CAL_PAL_KEY);return CAL_PALETTES[k]?k:'theme';}catch(e){return'theme';}})();
function applyCalPalette(){
  const p=CAL_PALETTES[calPalette];
  ['view-calendar','evt-overlay','pal-overlay'].forEach(id=>{
    const el=$(id);if(!el)return;
    ['pa','pb','pc','pd','pe','life'].forEach(k=>p?el.style.setProperty('--'+k,p[k]):el.style.removeProperty('--'+k));
  });
}
function renderPalGrid(){
  const g=$('pal-grid');if(!g)return;
  const card=(key,label,mood,cols,life)=>`<button type="button" class="pal-card${calPalette===key?' on':''}" onclick="selectCalPalette('${key}')" aria-pressed="${calPalette===key}">
    <div class="pal-strip">${['A','B','C','D','E'].map((l,i)=>`<span class="pal-chip" style="--c:${cols[i]}">${l}</span>`).join('')}<span class="pal-chip life" style="--c:${life}">🚿</span></div>
    <div class="theme-card-info"><div><div class="theme-card-name">${label}</div><div class="theme-card-mood">${mood}</div></div><span class="theme-card-check">✓</span></div>
  </button>`;
  g.innerHTML=Object.keys(CAL_PALETTES).map(k=>{const p=CAL_PALETTES[k];return card(k,p.label,p.mood,[p.pa,p.pb,p.pc,p.pd,p.pe],p.life);}).join('')
    +card('theme','App theme','Follows your theme',['var(--pa)','var(--pb)','var(--pc)','var(--pd)','var(--pe)'],'#7fb5a3');
}
function selectCalPalette(key){
  calPalette=CAL_PALETTES[key]?key:'theme';
  try{localStorage.setItem(CAL_PAL_KEY,calPalette);}catch(e){}
  applyCalPalette();renderPalGrid();
  showToast(calPalette==='theme'?'USING APP THEME COLORS':CAL_PALETTES[calPalette].label.toUpperCase()+' PALETTE');
}
function openPalModal(){renderPalGrid();$('pal-overlay').classList.add('open');}
function closePalModal(){$('pal-overlay').classList.remove('open');}
applyCalPalette();

const THEMES={
  amber:{label:'Amber Noir',mood:'Warm · Focused',mode:'dark',
    bg:'#0b0a08',surf:'#131110',surf2:'#1a1814',surf3:'#211f1a',bdr:'#252220',bdr2:'#312d26',
    accent:'#e6a118',accentHi:'#f0b428',red:'#e45a21',green:'#43975d',
    txt:'#ede7d4',txt2:'#c4b99e',muted:'#94846a',muted2:'#a89a8b',
    pa:'#e8543e',pb:'#e6a118',pc:'#4ea8e8',pd:'#7c6fe0',pe:'#898582'},
  amberreserve:{label:'Amber Reserve',mood:'Rich · Refined',mode:'dark',
    bg:'#0d0a06',surf:'#14100b',surf2:'#1b1610',surf3:'#231d16',bdr:'#2f281e',bdr2:'#3c3227',
    accent:'#e88b23',accentHi:'#fd9e32',red:'#e4554e',green:'#3d9c5e',
    txt:'#efe8e0',txt2:'#c9bbaa',muted:'#978267',muted2:'#a79988',
    pa:'#f75e54',pb:'#e48233',pc:'#00b7d9',pd:'#a67ad6',pe:'#8e8476'},
  sage:{label:'Sage Calm',mood:'Soft · Grounded',mode:'dark',
    bg:'#101611',surf:'#171d18',surf2:'#1e261f',surf3:'#262f28',bdr:'#333e35',bdr2:'#445046',
    accent:'#7fc48e',accentHi:'#95d7a2',red:'#dd7767',green:'#69ba7c',
    txt:'#e3eae4',txt2:'#bac9bc',muted:'#839987',muted2:'#9eb0a1',
    pa:'#ea856b',pb:'#dcba5c',pc:'#64bdd2',pd:'#9e9ce1',pe:'#8b968d',
    now:'#ddc276',glass:'16,22,17',
    nav:{tasks:'#79c49c',focus:'#5ec3ce',weekly:'#e298b4',calendar:'#94b0ee',notes:'#d1ab69',rules:'#a6b3c1',log:'#c2a1e0',wisdom:'#e39f7c'}},
  slate:{label:'Slate Dusk',mood:'Cool · Quiet',mode:'dark',
    bg:'#060d15',surf:'#0b141d',surf2:'#121e29',surf3:'#1b2936',bdr:'#273849',bdr2:'#384b5e',
    accent:'#4b9ee7',accentHi:'#6db4f6',red:'#ef656b',green:'#4cbd88',
    txt:'#e2e9ef',txt2:'#bac6d1',muted:'#7d91a4',muted2:'#98a7b5',
    pa:'#fa747d',pb:'#ebae51',pc:'#2cc3d2',pd:'#a495f0',pe:'#858f98',
    now:'#fea47c',glass:'6,13,21',
    nav:{tasks:'#5dc291',focus:'#26c0cf',weekly:'#e68aaf',calendar:'#86a9f7',notes:'#d2a249',rules:'#9dadbe',log:'#c096e5',wisdom:'#e89265'}},
  rosewater:{label:'Rosewater',mood:'Gentle · Warm',mode:'dark',
    bg:'#14090c',surf:'#1c0f12',surf2:'#27171b',surf3:'#342126',bdr:'#472e34',bdr2:'#5c4046',
    accent:'#e57fa9',accentHi:'#f496bb',red:'#ef675a',green:'#57bc8a',
    txt:'#efe5e7',txt2:'#d1bfc2',muted:'#a2858b',muted2:'#b49ea2',
    pa:'#fa7959',pb:'#e3b756',pc:'#6ab8e4',pd:'#be8ce1',pe:'#97898d',
    now:'#eccd8c',glass:'20,9,12',
    nav:{tasks:'#76c199',focus:'#5abfca',weekly:'#de95b1',calendar:'#91adeb',notes:'#cea766',rules:'#a0b0c1',log:'#bf9edd',wisdom:'#e09c79'}},
  forest:{label:'Midnight Forest',mood:'Deep · Peaceful',mode:'dark',
    bg:'#020d09',surf:'#05140f',surf2:'#091d17',surf3:'#112821',bdr:'#1b372f',bdr2:'#29493f',
    accent:'#4ad496',accentHi:'#76e5ad',red:'#ea6d56',green:'#68c36d',
    txt:'#e1eae7',txt2:'#b7c9c2',muted:'#6c9286',muted2:'#8ca79e',
    pa:'#f37e61',pb:'#e1c34b',pc:'#49bfd9',pd:'#969cee',pe:'#7f8e89',
    now:'#e8d34f',glass:'2,13,9',
    nav:{tasks:'#61d19a',focus:'#1acfdf',weekly:'#f893bc',calendar:'#8eb5ff',notes:'#e3ad4b',rules:'#a9b9ca',log:'#cea0f7',wisdom:'#fa9d6b'}},
  parchment:{label:'Warm Parchment',mood:'Light · Airy',mode:'light',
    bg:'#f7f0e5',surf:'#fefaf4',surf2:'#f1e8d8',surf3:'#eadec8',bdr:'#dfd0b5',bdr2:'#cbb897',
    accent:'#a55a0f',accentHi:'#b96f1c',red:'#b3352d',green:'#296f3d',
    txt:'#302318',txt2:'#5a4a38',muted:'#6e614a',muted2:'#63553d',
    pa:'#af3a2c',pb:'#a97500',pc:'#0e7492',pd:'#754d9e',pe:'#696258',
    now:'#00717c',glass:'254,250,244',
    nav:{tasks:'#00774c',focus:'#00737f',weekly:'#944466',calendar:'#4360a4',notes:'#855a00',rules:'#576574',log:'#754f95',wisdom:'#964c20'}},
  aurora:{label:'Aurora',mood:'Electric · Luminous',mode:'dark',
    bg:'#0c0c15',surf:'#13121d',surf2:'#1c1b29',surf3:'#272737',bdr:'#363549',bdr2:'#48485e',
    accent:'#967dff',accentHi:'#998bff',red:'#f4615c',green:'#3bb449',
    txt:'#e7e7ed',txt2:'#c6c6d4',muted:'#8e8da5',muted2:'#a6a5b6',
    pa:'#fd736d',pb:'#ebaa2d',pc:'#00c3db',pd:'#59adff',pe:'#8e8e9a',
    now:'#00d5b7'},
};
const THEME_KEY='bloc_theme_v1',THEME_CHOSEN_KEY='bloc_theme_chosen_v1';
let currentTheme=localStorage.getItem(THEME_CHOSEN_KEY)==='1'?(localStorage.getItem(THEME_KEY)||'parchment'):'parchment';
if(!THEMES[currentTheme])currentTheme='parchment';
function hexToRgbTuple(hex){
  const h=hex.replace('#','');
  const n=h.length===3?h.split('').map(c=>c+c).join(''):h;
  const num=parseInt(n,16);
  return [(num>>16)&255,(num>>8)&255,num&255];
}
function themeRgba(hex,a){const[r,g,b]=hexToRgbTuple(hex);return`rgba(${r},${g},${b},${a})`;}
function applyTheme(key){
  const t=THEMES[key]||THEMES.amber;
  const s=document.documentElement.style;
  s.setProperty('--bg',t.bg);s.setProperty('--surf',t.surf);s.setProperty('--surf2',t.surf2);s.setProperty('--surf3',t.surf3);
  s.setProperty('--bdr',t.bdr);s.setProperty('--bdr2',t.bdr2);
  s.setProperty('--amber',t.accent);s.setProperty('--amber-hi',t.accentHi);
  s.setProperty('--amber-lo',themeRgba(t.accent,.10));s.setProperty('--amber-glo',themeRgba(t.accent,.28));s.setProperty('--amber-04',themeRgba(t.accent,.04));
  s.setProperty('--red',t.red);s.setProperty('--red-lo',themeRgba(t.red,.10));
  s.setProperty('--green',t.green);s.setProperty('--green-lo',themeRgba(t.green,.10));
  s.setProperty('--txt',t.txt);s.setProperty('--txt2',t.txt2);s.setProperty('--muted',t.muted);s.setProperty('--muted2',t.muted2);
  ['pa','pb','pc','pd','pe'].forEach(k=>{
    s.setProperty('--'+k,t[k]);
    s.setProperty('--'+k+'-lo',themeRgba(t[k],.10));
    s.setProperty('--'+k+'-bg',themeRgba(t[k],.05));
  });
  const NOW_DEFAULT={c:'#3ecbff',glow:'rgba(62,203,255,.65)',glow2:'rgba(120,140,255,.35)'};
  s.setProperty('--now',t.now||NOW_DEFAULT.c);
  s.setProperty('--now-glow',t.now?themeRgba(t.now,.6):NOW_DEFAULT.glow);
  s.setProperty('--now-glow2',t.now?themeRgba(t.accent,.32):NOW_DEFAULT.glow2);
  const GLASS_A={hdr:[.88,.88],bar:[.7,.72],bar2:[.4,.55],btn:[.6,.7],'cal-tog':[.45,.55],'cal-tab':[.32,.5],'cal-side':[.35,.5],'cal-hours':[.5,.6]};
  const lightMode=t.mode==='light';
  Object.keys(GLASS_A).forEach(k=>{
    if(t.glass)s.setProperty('--glass-'+k,`rgba(${t.glass},${GLASS_A[k][lightMode?1:0]})`);
    else s.removeProperty('--glass-'+k);
  });
  ['tasks','focus','weekly','calendar','notes','rules','log','wisdom'].forEach(k=>{
    const c=t.nav&&t.nav[k];
    if(c){s.setProperty('--nav-'+k,c);s.setProperty('--nav-'+k+'-lo',themeRgba(c,lightMode?.12:.14));s.setProperty('--nav-'+k+'-glow',themeRgba(c,lightMode?.38:.45));}
    else['','-lo','-glow'].forEach(x=>s.removeProperty('--nav-'+k+x));
  });
  if(t.nav)s.setProperty('--nav-focus-on',t.bg);else s.removeProperty('--nav-focus-on');
  document.body.classList.toggle('theme-light',lightMode);
  document.documentElement.setAttribute('data-app-theme',key);
  currentTheme=key;
  applyCalBg();
  if($('bg-overlay')&&$('bg-overlay').classList.contains('open'))renderBgPresets();
}
function selectTheme(key){
  applyTheme(key);
  try{localStorage.setItem(THEME_KEY,key);localStorage.setItem(THEME_CHOSEN_KEY,'1');}catch(e){}
  renderThemeGrid();showToast(THEMES[key].label.toUpperCase()+' APPLIED');}
function renderThemeGrid(){
  const grid=$('theme-grid');if(!grid)return;
  grid.innerHTML=Object.keys(THEMES).map(key=>{
    const t=THEMES[key],isOn=currentTheme===key;
    return`<div class="theme-card${isOn?' on':''}" onclick="selectTheme('${key}')">
      <div class="theme-swatch-row">
        <span style="background:${t.bg}"></span><span style="background:${t.surf2}"></span><span style="background:${t.accent}"></span><span style="background:${t.pc}"></span>
      </div>
      <div class="theme-card-info">
        <div><div class="theme-card-name">${t.label}</div><div class="theme-card-mood">${t.mood}</div></div>
        <span class="theme-card-check">✓</span>
      </div>
    </div>`;
  }).join('');
}
function openThemeModal(){renderThemeGrid();$('theme-overlay').classList.add('open');}
function closeThemeModal(){$('theme-overlay').classList.remove('open');}
applyTheme(currentTheme);


const NP_FOLDER_KEY='bloc_np_folders_v1',NP_NOTE_KEY='bloc_np_notes_v1',NP_NID_KEY='bloc_np_nid_v1';
let npFolders=JSON.parse(localStorage.getItem(NP_FOLDER_KEY)||'null')||[];
let npNotes=JSON.parse(localStorage.getItem(NP_NOTE_KEY)||'[]');
let npNid=parseInt(localStorage.getItem(NP_NID_KEY)||'1');
let npActiveFolder='__all__',npActiveNote=null;
function npSave(){localStorage.setItem(NP_FOLDER_KEY,JSON.stringify(npFolders));localStorage.setItem(NP_NOTE_KEY,JSON.stringify(npNotes));localStorage.setItem(NP_NID_KEY,String(npNid));}

const NP_SYSTEM_FOLDER_DEFS=[
  {id:'sys-general',name:'General',system:'general'},
  {id:'sys-tasks',name:'Task Notes',system:'tasks'},
  {id:'sys-events',name:'Event Notes',system:'events'},
  {id:'sys-reflections',name:'Reflections',system:'reflections'}
];
const npFolderIcon=sys=>({general:'◇',tasks:'✓',events:'▤',reflections:'✦'}[sys]||'◇');
function npEnsureSystemFolders(){
  let changed=false;
  NP_SYSTEM_FOLDER_DEFS.forEach(d=>{
    let f=npFolders.find(x=>x.id===d.id);
    if(!f){
      const legacy=npFolders.find(x=>!x.locked&&x.name===d.name);
      if(legacy){
        npNotes.forEach(n=>{if(n.folderId===legacy.id)n.folderId=d.id;});
        npFolders=npFolders.filter(x=>x.id!==legacy.id);
      }
      npFolders.push({id:d.id,name:d.name,locked:true,system:d.system});
      changed=true;
    }else if(!f.locked||f.name!==d.name){
      f.locked=true;f.system=d.system;f.name=d.name;changed=true;
    }
  });
  npFolders.sort((a,b)=>{
    const ai=NP_SYSTEM_FOLDER_DEFS.findIndex(d=>d.id===a.id),bi=NP_SYSTEM_FOLDER_DEFS.findIndex(d=>d.id===b.id);
    if(ai!==-1&&bi!==-1)return ai-bi;
    if(ai!==-1)return -1;
    if(bi!==-1)return 1;
    return 0;
  });
  return changed;
}

function npMigrateEntityNotes(){
  let changed=npEnsureSystemFolders();
  tasks.forEach(t=>{
    if(t.note&&t.note.trim()&&!npNotes.some(n=>n.linkType==='task'&&n.linkId===t.id)){
      npNotes.unshift({id:'n'+(npNid++),folderId:'sys-tasks',title:t.text||'Untitled task',
        content:'<p>'+escHTML(t.note).replace(/\n/g,'<br>')+'</p>',
        linkType:'task',linkId:t.id,orphaned:false,orphanTag:null,created:Date.now(),updated:Date.now()});
      changed=true;
    }
    if(t.note){t.note='';changed=true;}
  });
  if(typeof calEvents!=='undefined'){
    calEvents.forEach(ev=>{
      if(ev.notes&&ev.notes.trim()&&!npNotes.some(n=>n.linkType==='event'&&n.linkId===ev.id)){
        npNotes.unshift({id:'n'+(npNid++),folderId:'sys-events',title:ev.title||'Untitled event',
          content:ev.notes,linkType:'event',linkId:ev.id,orphaned:false,orphanTag:null,created:Date.now(),updated:Date.now()});
        changed=true;
      }
      if(ev.notes){ev.notes='';changed=true;}
    });
  }
  let reflections=[];
  try{reflections=JSON.parse(localStorage.getItem(REFLECT_KEY)||'[]');}catch(e){}
  reflections.forEach(r=>{if(r.dateISO)npSyncReflectionNote(r,false);});
  if(changed){npSave();saveT();if(typeof saveCal==='function')saveCal();}
}
function npSyncReflectionNote(entry,doSave){
  if(doSave===undefined)doSave=true;
  const dLbl=new Date(entry.dateISO+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});
  const stars='★'.repeat(entry.rating||0)+'☆'.repeat(5-(entry.rating||0));
  const noteHtml=`<p><b>Wins</b><br>${escHTML(entry.wins||'—').replace(/\n/g,'<br>')}</p><p><b>What got in the way</b><br>${escHTML(entry.blocks||'—').replace(/\n/g,'<br>')}</p><p><b>Focus score</b> ${entry.focusScore!=null?entry.focusScore:'—'} · ${stars}</p>`;
  let n=npNotes.find(x=>x.linkType==='reflection'&&x.linkId===entry.dateISO);
  if(n){n.content=noteHtml;n.title=dLbl;n.updated=Date.now();}
  else{
    n={id:'n'+(npNid++),folderId:'sys-reflections',title:dLbl,content: noteHtml,linkType:'reflection',linkId:entry.dateISO,orphaned:false,orphanTag:null,created:Date.now(),updated:Date.now()};
    npNotes.unshift(n);
  }
  if(doSave)npSave();
}
npMigrateEntityNotes();

function npOrphanLinkedNote(linkType,linkId){
  const n=npNotes.find(x=>x.linkType===linkType&&x.linkId===linkId&&!x.orphaned);
  if(!n)return;
  n.orphaned=true;
  n.orphanTag=`Originally from a deleted ${linkType}: ${n.title}`;
  n.linkType=null;n.linkId=null;
  n.folderId='sys-general';
  n.updated=Date.now();
  npSave();
}

function npOpenTaskNote(taskId){
  const t=tasks.find(x=>x.id===taskId);if(!t)return;
  let n=npNotes.find(x=>x.linkType==='task'&&x.linkId===taskId);
  if(!n){
    n={id:'n'+(npNid++),folderId:'sys-tasks',title:t.text,content:'',linkType:'task',linkId:taskId,orphaned:false,orphanTag:null,created:Date.now(),updated:Date.now()};
    npNotes.unshift(n);npSave();
  }else if(n.title!==t.text){n.title=t.text;npSave();}
  npActiveFolder=n.folderId;npActiveNote=n.id;
  showView('notes');
}
function npOpenEventNote(eventId){
  const ev=calEvents.find(x=>x.id===eventId);if(!ev)return;
  let n=npNotes.find(x=>x.linkType==='event'&&x.linkId===eventId);
  if(!n){
    n={id:'n'+(npNid++),folderId:'sys-events',title:ev.title,content:'',linkType:'event',linkId:eventId,orphaned:false,orphanTag:null,created:Date.now(),updated:Date.now()};
    npNotes.unshift(n);npSave();
  }else if(n.title!==ev.title){n.title=ev.title;npSave();}
  npActiveFolder=n.folderId;npActiveNote=n.id;
  closeEventModal();
  showView('notes');
}
function npGoToTask(taskId){
  const t=tasks.find(x=>x.id===taskId);if(!t){showToast('TASK NO LONGER EXISTS');return;}
  showView('tasks');
  setTimeout(()=>{
    const panel=document.getElementById('sub-'+taskId);
    if(panel&&!panel.classList.contains('open'))toggleSubPanel(taskId);
    const el=document.getElementById('ti-'+taskId);
    if(el)el.scrollIntoView({behavior:'smooth',block:'center'});
  },60);
}
function npGoToEvent(eventId){
  const ev=calEvents.find(x=>x.id===eventId);if(!ev){showToast('EVENT NO LONGER EXISTS');return;}
  showView('calendar');
  setTimeout(()=>openEventModal(ev,ev.dateISO,calIsRecurringEv(ev)),80);
}

const npFolderActivity=id=>npNotes.filter(n=>n.folderId===id).reduce((m,n)=>Math.max(m,n.updated||0),0);
function renderNotesView(){
  renderNpFolders();
  renderNpNoteList();
  if(npActiveNote&&npNotes.find(n=>n.id===npActiveNote)){npOpenNote(npActiveNote);}else{npShowNoNote();}
}
function renderNpFolders(){
  const counts={};npNotes.forEach(n=>{counts[n.folderId]=(counts[n.folderId]||0)+1;});
  const sysFolders=npFolders.filter(f=>f.locked).sort((a,b)=>npFolderActivity(b.id)-npFolderActivity(a.id));
  const customFolders=npFolders.filter(f=>!f.locked).sort((a,b)=>npFolderActivity(b.id)-npFolderActivity(a.id));
  const row=f=>{const folderMods=(npActiveFolder===f.id?' on':'')+(f.locked?' np-folder-sys':'');return `<div class="np-folder${folderMods}" onclick="npSelectFolder('${f.id}')"${f.locked?'':` ondblclick="npRenameFolder('${f.id}')" title="Double-click to rename"`}>
    <span class="np-folder-name">${f.locked?`<span class="np-folder-ico">${npFolderIcon(f.system)}</span>`:''}${escHTML(f.name)}</span>
    <span class="np-folder-count">${counts[f.id]||0}</span>
    ${f.locked?'':`<button class="np-folder-del" onclick="event.stopPropagation();npDeleteFolder('${f.id}')" title="Delete folder">✕</button>`}
  </div>`};
  const allFolderMods=(npActiveFolder==='__all__'?' on':''); let html=`<div class="np-folder${allFolderMods}" onclick="npSelectFolder('__all__')"><span class="np-folder-name">All Notes</span><span class="np-folder-count">${npNotes.length}</span></div>`;
  html+=sysFolders.map(row).join('');
  if(customFolders.length)html+=`<div class="np-folder-divider">Your Folders</div>`+customFolders.map(row).join('');
  $('np-folder-list').innerHTML=html;
}
function npSelectFolder(id){npActiveFolder=id;npActiveNote=null;renderNotesView();}
function npCreateFolder(){
  const name=prompt('Folder name:','New Folder');if(!name||!name.trim())return;
  const id='f'+Date.now();npFolders.push({id,name:name.trim(),locked:false});npSave();npActiveFolder=id;renderNotesView();showToast('FOLDER CREATED');
}
function npRenameFolder(id){
  const f=npFolders.find(x=>x.id===id);if(!f)return;
  if(f.locked){showToast("SYSTEM FOLDERS CAN'T BE RENAMED");return;}
  const name=prompt('Rename folder:',f.name);if(!name||!name.trim())return;
  f.name=name.trim();npSave();renderNotesView();
}
function npDeleteFolder(id){
  const f=npFolders.find(x=>x.id===id);
  if(f&&f.locked){showToast("SYSTEM FOLDERS CAN'T BE DELETED");return;}
  const count=npNotes.filter(n=>n.folderId===id).length;
  if(!confirm(count?`Delete this folder and its ${count} note(s)? This cannot be undone.`:'Delete this folder?'))return;
  npNotes=npNotes.filter(n=>n.folderId!==id);
  npFolders=npFolders.filter(f=>f.id!==id);
  if(npActiveFolder===id)npActiveFolder='__all__';
  if(npActiveNote&&!npNotes.find(n=>n.id===npActiveNote))npActiveNote=null;
  npSave();renderNotesView();showToast('FOLDER DELETED');
}

function npVisibleNotes(){
  const list=npActiveFolder==='__all__'?npNotes.slice():npNotes.filter(n=>n.folderId===npActiveFolder);
  return list.sort((a,b)=>(b.updated||0)-(a.updated||0));
}
function renderNpNoteList(){
  $('np-list-title').textContent=npActiveFolder==='__all__'?'All Notes':(npFolders.find(f=>f.id===npActiveFolder)||{}).name||'Notes';
  const list=npVisibleNotes();
  if(!list.length){$('np-note-list').innerHTML='<div class="np-empty">No notes here yet. Tap + to create one.</div>';return;}
  $('np-note-list').innerHTML=list.map(n=>{
    const plain=(n.content||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    const d=n.updated?new Date(n.updated).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
    const linkDot=(n.linkType&&!n.orphaned)?`<span class="np-note-linkdot" title="Linked to a ${n.linkType}">${n.linkType==='task'?'✓':n.linkType==='event'?'▤':'✦'}</span>`:'';
    const noteMods=(npActiveNote===n.id?' on':''); return`<div class="np-note-item${noteMods}" onclick="npOpenNote('${n.id}')">
      <div class="np-note-title">${linkDot}${escHTML(n.title||'Untitled note')}</div>
      <div class="np-note-snip">${escHTML(plain)||'No additional text'}</div>
      <div class="np-note-date">${d}</div>
    </div>`;
  }).join('');
}
function npCreateNote(){
  const folderId=npActiveFolder==='__all__'?(npFolders[0]?npFolders[0].id:null):npActiveFolder;
  if(!folderId){showToast('CREATE A FOLDER FIRST');return;}
  const id='n'+(npNid++);
  npNotes.unshift({id,folderId,title:'',content:'',linkType:null,linkId:null,orphaned:false,orphanTag:null,created:Date.now(),updated:Date.now()});
  npSave();npActiveNote=id;renderNotesView();
  setTimeout(()=>$('np-title')&&$('np-title').focus(),60);
}
function npOpenNote(id){
  const n=npNotes.find(x=>x.id===id);if(!n){npShowNoNote();return;}
  npActiveNote=id;
  $('np-noselect').style.display='none';
  $('np-editor-wrap').style.display='flex';
  $('np-title').value=n.title||'';
  $('np-content').innerHTML=n.content||'';
  renderRteToolbar('np-toolbar','np-content');
  renderNpLinkBadge(n);
  renderNpNoteList();
}
function renderNpLinkBadge(n){
  const el=$('np-link-badge');if(!el)return;
  if(n.orphaned&&n.orphanTag){
    el.innerHTML=`<span class="np-orphan-tag" title="${escAttr(n.orphanTag)}">⚠ ${escHTML(n.orphanTag)}</span>`;
  }else if(n.linkType==='task'){
    el.innerHTML=`<button class="np-back-link" onclick="npGoToTask('${n.linkId}')">↳ Open Task</button>`;
  }else if(n.linkType==='event'){
    el.innerHTML=`<button class="np-back-link" onclick="npGoToEvent('${n.linkId}')">↳ Open Event</button>`;
  }else{
    el.innerHTML='';
  }
}
function npShowNoNote(){
  $('np-noselect').style.display='flex';
  $('np-editor-wrap').style.display='none';
}
let _npListRenderTimer=null;
function npScheduleListRender(){
  clearTimeout(_npListRenderTimer);
  _npListRenderTimer=setTimeout(renderNpNoteList,400);
}
function npTitleChanged(){
  const n=npNotes.find(x=>x.id===npActiveNote);if(!n)return;
  n.title=$('np-title').value;n.updated=Date.now();npSave();npScheduleListRender();
}
function npContentChanged(){
  const n=npNotes.find(x=>x.id===npActiveNote);if(!n)return;
  n.content=$('np-content').innerHTML;n.updated=Date.now();npSave();npScheduleListRender();
}
function npDeleteNote(){
  if(!npActiveNote)return;
  if(!confirm('Delete this note? This cannot be undone.'))return;
  npNotes=npNotes.filter(n=>n.id!==npActiveNote);
  npActiveNote=null;npSave();renderNotesView();showToast('NOTE DELETED');
}

if(!calEvents.length){
  const todayISO=isoDate(bocNow());
  calEvents=[
    {id:'e1',title:'Meditation',dateISO:todayISO,start:7*60,end:7*60+10,repeat:'daily',reminder:5,notes:'',type:'B',taskId:'',done:false},
    {id:'e2',title:'Workout',dateISO:todayISO,start:7*60+15,end:8*60,repeat:'daily',reminder:10,notes:'',type:'A',taskId:'',done:false},
  ];
  saveCal();
}

function toggleFullscreen(){
  const fsEl=document.fullscreenElement||document.webkitFullscreenElement||document.mozFullScreenElement||document.msFullscreenElement;
  try{
    if(fsEl){
      const exit=document.exitFullscreen||document.webkitExitFullscreen||document.mozCancelFullScreen||document.msExitFullscreen;
      if(exit)Promise.resolve(exit.call(document)).catch(()=>{});
      if(typeof showToast==='function')showToast('FULLSCREEN OFF');
    }else{
      const el=document.documentElement;
      const request=el.requestFullscreen||el.webkitRequestFullscreen||el.mozRequestFullScreen||el.msRequestFullscreen;
      if(!request){if(typeof showToast==='function')showToast('FULLSCREEN NOT SUPPORTED IN THIS BROWSER');return;}
      Promise.resolve(request.call(el))
        .then(()=>{if(typeof showToast==='function')showToast('FULLSCREEN ON');})
        .catch(()=>{if(typeof showToast==='function')showToast("COULDN'T ENTER FULLSCREEN — CLICK THE PAGE ONCE, THEN TRY AGAIN");});
    }
  }catch(err){
    if(typeof showToast==='function')showToast('FULLSCREEN NOT AVAILABLE HERE');
  }
}
function isInteractiveFocus(el){
  if(!el||!el.tagName)return false;
  if(['BUTTON','A','SELECT','SUMMARY'].includes(el.tagName))return true;
  if(el.getAttribute&&el.getAttribute('role')==='button')return true;
  if(el.isContentEditable)return true;
  return false;
}

document.addEventListener('keydown',e=>{
  if(typeof guideIsOpen==='function'&&guideIsOpen()){guideKey(e);return;}
  const inField=e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.contentEditable==='true';
  if(e.key==='Escape'){
    if(inField&&e.target.blur)e.target.blur();
    if(document.body.classList.contains('zen')){toggleZen();return;}
    if($('quick-capture').classList.contains('open')){closeQuickCapture();return;}
    if($('reflection-overlay').classList.contains('open')){closeReflection();return;}
    if(document.querySelector('.side-panel.open')){closeSidePanels();return;}
    closeHist();
    $('warn-overlay').classList.remove('open');$('est-overlay').classList.remove('open');$('fit-overlay').classList.remove('open');
    closeEventModal();closeBgModal();
    return;
  }
  if(inField)return;
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const active=document.querySelector('.view.active')?.id;
  if(e.key==='g'||e.key==='G'){e.preventDefault();openGuide();}
  if(e.key==='q'||e.key==='Q'){e.preventDefault();openQuickCapture();}
  if(e.key==='n'||e.key==='N'){
    if(active==='view-tasks'){$('new-input').focus();}
    else if(active==='view-weekly'||active==='view-calendar'){showView('tasks');$('new-input').focus();}
  }
  if(e.key==='f'||e.key==='F'){goFocusNav();}
  if(e.key==='w'||e.key==='W'){showView('weekly');}
  if(e.key==='h'||e.key==='H'){if(habitsEnabled())showView('habits');}
  if(e.key==='r'||e.key==='R'){e.preventDefault();rulebookIsOpen()?closeRulebook():openRulebook();}
  if(e.key==='c'||e.key==='C'){showView('calendar');}
  if((e.key==='z'||e.key==='Z')&&active==='view-timer'){toggleZen();}
  if(e.key===' '){
    if(active==='view-timer'){e.preventDefault();tryInterrupt();}
    else if(!isInteractiveFocus(e.target)){e.preventDefault();toggleFullscreen();}
  }
  if(e.key>='1'&&e.key<='5'&&active==='view-tasks'){const types=['A','B','C','D','E'];scrollSec(types[parseInt(e.key)-1]);}
});

const isFirstEverLaunch=localStorage.getItem(TASK_KEY)===null;
let FIRST_LAUNCH_SEEDED=false;
if(isFirstEverLaunch&&!tasks.length){
  const seedDateISO=isoDate(bocNow());
  tasks=[
    {id:String(nextId++),type:'A',text:'Finish Q3 report for the board meeting',done:false,created:Date.now()-5*86400000,estimate:90,recurring:false,subtasks:[{text:'Draft outline',done:false},{text:'Add charts',done:false}],note:'',dateISO:seedDateISO},
    {id:String(nextId++),type:'A',text:'Call key client about contract renewal',done:false,created:Date.now(),estimate:30,recurring:false,subtasks:[],note:'',dateISO:seedDateISO},
    {id:String(nextId++),type:'B',text:'Review team pull requests',done:false,created:Date.now(),estimate:45,recurring:true,subtasks:[],note:'',dateISO:seedDateISO},
    {id:String(nextId++),type:'B',text:'Prepare slides for Friday presentation',done:false,created:Date.now()-4*86400000,estimate:60,recurring:false,subtasks:[],note:'',dateISO:seedDateISO},
    {id:String(nextId++),type:'C',text:'Read article on industry trends',done:false,created:Date.now(),estimate:20,recurring:false,subtasks:[],note:'',dateISO:seedDateISO},
    {id:String(nextId++),type:'D',text:'Schedule team lunch logistics',done:false,created:Date.now(),estimate:0,recurring:false,subtasks:[],note:'',dateISO:seedDateISO},
    {id:String(nextId++),type:'E',text:'Check social media feeds during work hours',done:false,created:Date.now(),estimate:0,recurring:false,subtasks:[],note:'',dateISO:seedDateISO},
  ];
  saveT();
  FIRST_LAUNCH_SEEDED=true;
}
// Time zone is set quietly from the device. People can change it later in Settings.
if(needsTzSetup()){applyTimezone(detectDeviceTimezone(),true);}
if(!maybeShowWelcome()){checkDailyReset();}
renderTasks();
updateLogCount();
recomputeStreak();
renderPomoPresets();
if(!restoreTimerState()){
  showView(resolveDefaultView());
}
let _lastRolloverISO=isoDate(bocNow());
function pollDailyRollover(){
  const nowISO=isoDate(bocNow());
  if(nowISO===_lastRolloverISO)return;
  _lastRolloverISO=nowISO;
  checkDailyReset();
  renderTasks();
  updateLogCount();
  recomputeStreak();
  if(typeof renderHabits==='function')renderHabits();
}
setInterval(pollDailyRollover,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)pollDailyRollover();});
(function(){
  const nav=document.getElementById('hdr-nav');
  if(!nav)return;
  const ORDER_KEY='bloc_nav_order';
  let dragEl=null;

  const getBtns=()=>Array.from(nav.querySelectorAll('.nav-btn'));

  function applySavedOrder(){
    let order;
    try{order=JSON.parse(localStorage.getItem(ORDER_KEY)||'null');}catch(e){order=null;}
    if(!order||!Array.isArray(order))return;
    order.forEach(key=>{
      const btn=nav.querySelector('[data-navkey="'+key+'"]');
      if(btn)nav.appendChild(btn);
    });
  }

  function saveOrder(){
    try{localStorage.setItem(ORDER_KEY,JSON.stringify(getBtns().map(b=>b.dataset.navkey)));}catch(e){}
  }

  function wireDrag(btn){
    btn.addEventListener('dragstart',e=>{
      dragEl=btn;
      btn.classList.add('dragging');
      e.dataTransfer.effectAllowed='move';
      try{e.dataTransfer.setData('text/plain',btn.dataset.navkey);}catch(err){}
    });
    btn.addEventListener('dragend',()=>{
      btn.classList.remove('dragging');
      getBtns().forEach(b=>b.classList.remove('drag-over'));
      dragEl=null;
      saveOrder();
    });
    btn.addEventListener('dragover',e=>{
      e.preventDefault();
      if(!dragEl||dragEl===btn)return;
      getBtns().forEach(b=>b.classList.remove('drag-over'));
      btn.classList.add('drag-over');
      const rect=btn.getBoundingClientRect();
      const after=(e.clientX-rect.left)>rect.width/2;
      nav.insertBefore(dragEl,after?btn.nextSibling:btn);
    });
    btn.addEventListener('dragleave',()=>btn.classList.remove('drag-over'));
    btn.addEventListener('drop',e=>{e.preventDefault();btn.classList.remove('drag-over');});
  }

  applySavedOrder();
  getBtns().forEach(wireDrag);
})();


const BC_STORE_KEY='bloc_consultant_chats_v1';
const BC_LEGACY_KEY='bloc_agent_chat_v1';
const BC_MAX_CHATS=40, BC_MAX_MSGS=60, BC_TITLE_MAX=60;

const bcNewId=()=>'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function bcPlainOf(m){
  if(!m)return'';
  if(m.plain)return String(m.plain);
  return String(m.text||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
}
function bcAutoTitle(msgs){
  const first=(msgs||[]).find(m=>m&&m.role==='user');
  let t=first?bcPlainOf(first).replace(/\s+/g,' ').trim():'';
  if(!t)return'New chat';
  if(t.length>44)t=t.slice(0,43).replace(/\s+\S*$/,'')+'…';
  return t.charAt(0).toUpperCase()+t.slice(1);
}
function bcMakeChat(msgs){
  const now=Date.now();
  const m=Array.isArray(msgs)?msgs.filter(x=>x&&!x.tempId).slice(-BC_MAX_MSGS):[];
  const last=m.length?(m[m.length-1].ts||now):now;
  return{id:bcNewId(),title:bcAutoTitle(m),auto:true,created:(m[0]&&m[0].ts)||now,updated:last,msgs:m};
}
function bcLoadStore(){
  let s=null;
  try{s=JSON.parse(localStorage.getItem(BC_STORE_KEY)||'null');}catch(e){s=null;}
  if(!s||!Array.isArray(s.chats)){
    s={v:1,activeId:null,chats:[]};
    let legacy=[];try{legacy=JSON.parse(localStorage.getItem(BC_LEGACY_KEY)||'[]');}catch(e){legacy=[];}
    if(Array.isArray(legacy)&&legacy.some(m=>m&&!m.tempId)){const c=bcMakeChat(legacy);s.chats.push(c);s.activeId=c.id;}
  }
  s.chats=s.chats.filter(c=>c&&typeof c.id==='string'&&Array.isArray(c.msgs)).map(c=>{
    c.msgs=c.msgs.filter(m=>m&&!m.tempId);
    c.title=String(c.title||'').slice(0,BC_TITLE_MAX)||bcAutoTitle(c.msgs);
    c.auto=c.auto!==false;
    c.created=c.created||Date.now();c.updated=c.updated||c.created;
    return c;
  });
  if(!s.chats.some(c=>c.id===s.activeId)){
    const newest=s.chats.slice().sort((a,b)=>b.updated-a.updated)[0];
    if(newest)s.activeId=newest.id;
    else{const c=bcMakeChat([]);s.chats.push(c);s.activeId=c.id;}
  }
  return s;
}
let bcStore=bcLoadStore();

function bcActive(){return bcStore.chats.find(c=>c.id===bcStore.activeId)||null;}
function bcGetChat(id){return bcStore.chats.find(c=>c.id===id)||null;}
function bcChatList(){return bcStore.chats.filter(c=>c.msgs.length>0).sort((a,b)=>b.updated-a.updated);}

function bcPersist(){
  const active=bcActive();
  const build=()=>JSON.stringify({v:1,activeId:bcStore.activeId,chats:bcStore.chats
    .filter(c=>c.msgs.length||c.id===bcStore.activeId)
    .map(c=>({id:c.id,title:c.title,auto:c.auto,created:c.created,updated:c.updated,msgs:c.msgs.filter(m=>!m.tempId)}))});
  let saved=false;
  for(let guard=0;guard<BC_MAX_CHATS+2;guard++){
    try{localStorage.setItem(BC_STORE_KEY,build());saved=true;break;}
    catch(e){
      const victim=bcStore.chats.filter(c=>c.id!==bcStore.activeId).sort((a,b)=>a.updated-b.updated)[0];
      if(!victim)break;
      bcStore.chats=bcStore.chats.filter(c=>c!==victim);
    }
  }
  if(!saved&&typeof showToast==='function')showToast('COULD NOT SAVE CHAT — BROWSER STORAGE IS FULL');
  try{localStorage.setItem(BC_LEGACY_KEY,JSON.stringify(active?active.msgs.filter(m=>!m.tempId):[]));}catch(e){}
}
function bcTrimChats(){
  const listed=bcStore.chats.filter(c=>c.msgs.length>0||c.id===bcStore.activeId);
  if(listed.length<=BC_MAX_CHATS)return;
  const extra=listed.filter(c=>c.id!==bcStore.activeId).sort((a,b)=>a.updated-b.updated).slice(0,listed.length-BC_MAX_CHATS);
  bcStore.chats=bcStore.chats.filter(c=>!extra.includes(c));
}
function bcDropIfEmpty(id){
  const c=bcGetChat(id);
  if(c&&!c.msgs.length&&c.id!==bcStore.activeId)bcStore.chats=bcStore.chats.filter(x=>x!==c);
}

const GEMINI_GUIDE=(function(){
  const L={
    keys:['Google AI Studio keys page','https://aistudio.google.com/apikey'],
    docs:['Gemini API keys (official docs)','https://ai.google.dev/gemini-api/docs/api-key'],
    regions:['Supported countries and age rules','https://ai.google.dev/gemini-api/docs/available-regions'],
    ws:['AI Studio with a work or school account','https://ai.google.dev/gemini-api/docs/workspace'],
    adminOn:['Admins: turn AI Studio on or off','https://support.google.com/a/answer/15004095'],
    age:['Verify your age on a Google Account','https://support.google.com/accounts/answer/10071085'],
    cloud:['Google Cloud console: Credentials','https://console.cloud.google.com/apis/credentials'],
    limits:['Gemini API rate limits','https://ai.google.dev/gemini-api/docs/rate-limits']
  };
  // Videos: found via search on Oct 11, 2026. YouTube pages could not be opened to double-check channel/title,
  // so `when` is the approximate upload month from search results. Both postdate Google's May 28, 2026 switch
  // to “auth keys”, which changed what the key screen looks like. Re-check these whenever Google changes AI Studio.
  const videos=[
    {id:'hCgkPIa4E7A',title:'How to Get Google Gemini API Key in 2 Minutes',when:'about Aug 2026'},
    {id:'PX_cGeXbSfE',title:'How to Create API Key in Google AI Studio – Gemini API Key (2026)',when:'about Jul 2026'}
  ];
  // Newest-first YouTube search (sp=CAI%3D = sort by upload date), so the guide never goes stale as videos age.
  const moreVideos='https://www.youtube.com/results?search_query='+encodeURIComponent('how to get gemini api key google ai studio')+'&sp=CAI%3D';
  const tail=[
    'Paste the key into the “Primary key” box above. If you have a second key, paste it into “Backup key” (optional).',
    'Tap TEST to check it, then tap SAVE.',
    'Never share the key or post it anywhere public. BLOC stores it only in this browser. Free-tier limits can change, so check Google’s rate limits page if answers stop coming.'
  ];
  return {
    checked:'October 11, 2026',
    moreVideos:moreVideos,
    tabs:[
      {id:'a',label:'Standard way (Google AI Studio)',
        steps:[
          'Open the Google AI Studio keys page (link below). Sign in with a personal Google account.',
          'If it asks you to accept the Terms of Service, read them and accept. New users get a default project and key created for them after this.',
          'Look for a key already in the list. If there is none, look for the “Create API key” button and click it.',
          'Already use Google Cloud? AI Studio hides your projects at first. Open Dashboard, choose Projects, click “Import projects”, pick your project, click Import. Then open the “API Keys” page and create the key there.',
          'Copy the key. It is one long line of letters and numbers. New keys may start with “AQ.” (Google’s newer “auth key” type) and older ones with “AIza”. Paste it exactly as shown.',
          'If an old key says “Blocked” or Gemini rejects it, create a new one the same way.'
        ].concat(tail),
        videos:videos,
        links:[L.keys,L.docs,L.regions,L.limits]},
      {id:'b',label:'AI Studio doesn’t work for me',
        steps:[
          'Read the message AI Studio shows. Google lists three usual causes: your country is not supported, you are under 18, or your Google Account age is not verified yet. Check the country list and verify your age if needed.',
          'Using a work or school account? Try a personal Google account instead.',
          'If the message says you don’t have access and to contact your Organization Administrator, ask your workspace admin to turn Google AI Studio on. School accounts for people under 18 stay blocked even when it is on.',
          'If “Create API key” is unavailable and says you lack permission in this project, ask the project admin for a role such as Project Editor. Or create a new Google Cloud project that is not part of an organization and use that.',
          'Another way: open Google Cloud console, pick or create a project, then go to APIs & Services, then Credentials, and create an API key. Make sure the Generative Language API (the Gemini API) is turned on for that project. Google says a Gemini key made this way must be tied to a service account, so follow the steps in Google’s “Creating keys in the Google Cloud console” section.',
          'If none of this works, BLOC can’t help with that: Gemini is the only AI provider it supports. Everything else in BLOC works without a key. Only Wojak needs one.'
        ].concat(tail),
        links:[L.regions,L.age,L.ws,L.adminOn,L.cloud,L.docs]}
    ]
  };
})();

(function(){
  const guideBody=document.getElementById('gk-guide-body');
  if(!guideBody)return;
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const show=id=>{
    const t=GEMINI_GUIDE.tabs.find(x=>x.id===id);
    guideBody.innerHTML=`<div class="gkg-tabs" role="tablist">${GEMINI_GUIDE.tabs.map(x=>`<button class="gkg-tab${x.id===id?' on':''}" role="tab" aria-selected="${x.id===id}" data-t="${x.id}">${esc(x.label)}</button>`).join('')}</div>`
      +`<ol class="gkg-steps">${t.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`
      +(t.videos&&t.videos.length?`<div class="gkg-vids"><div class="gkg-vids-h">▶ Prefer to watch? Short video walkthroughs</div>`
        +t.videos.filter(v=>/^[\w-]{11}$/.test(v.id)).map(v=>`<a class="gkg-vid" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener noreferrer"><span class="gkg-vid-t">${esc(v.title)}</span><span class="gkg-vid-m">YouTube · ${esc(v.when)} ↗</span></a>`).join('')
        +`<a class="gkg-vid gkg-vid-more" href="${GEMINI_GUIDE.moreVideos}" target="_blank" rel="noopener noreferrer"><span class="gkg-vid-t">Find the newest videos on YouTube</span><span class="gkg-vid-m">Sorted by upload date ↗</span></a>`
        +`<div class="gkg-vid-warn">Google changes AI Studio often, so a video can look different from what you see. If it does, trust the written steps above and the official links below.</div></div>`:'')
      +`<div class="gkg-src">${t.links.map(([n,u])=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${esc(n)} ↗</a>`).join('')}</div>`
      +`<div class="gkg-note">Last checked: ${GEMINI_GUIDE.checked}. Google may rename buttons. If a step looks different, use the official link.</div>`;
  };
  guideBody.addEventListener('click',e=>{const b=e.target.closest('.gkg-tab');if(b)show(b.dataset.t);});
  show(GEMINI_GUIDE.tabs[0].id);
})();

const CHAT_KEY='bloc_agent_chat_v1', BAI_POS_KEY='bloc_agent_pos_v1', BAI_GEMINI_KEY='bloc_agent_gemini_key_v1', BAI_GEMINI_KEY2='bloc_agent_gemini_key2_v1';
const GEMINI_MODEL='gemini-3.5-flash';
const LENGTH_RULE="Match the length of your reply to the question: a quick, simple, or yes/no question gets a single short sentence or two; an ordinary question gets a few sentences; a question that's genuinely layered, or explicitly asks for detail, can run to a short paragraph or two. Never pad a simple answer with filler to seem thorough, and never compress a real answer just to stay short.";
let baiChat=bcActive().msgs;
let baiOpen=false;
let baiCtx={lastCat:null,lastDateISO:null,lastTopic:null};

function baiSaveChat(){
  const c=bcActive();if(!c)return;
  if(baiChat.length>BC_MAX_MSGS)baiChat.splice(0,baiChat.length-BC_MAX_MSGS);
  c.msgs=baiChat;
  const real=baiChat.filter(m=>!m.tempId);
  if(real.length){c.updated=Date.now();if(c.auto)c.title=bcAutoTitle(real);}
  bcTrimChats();bcPersist();
}

function baiGetKeyPrimary(){try{return (localStorage.getItem(BAI_GEMINI_KEY)||'').trim();}catch(e){return'';}}
function baiGetKeyBackup(){try{return (localStorage.getItem(BAI_GEMINI_KEY2)||'').trim();}catch(e){return'';}}
function baiGetGeminiKey(){return baiGetKeyPrimary()||baiGetKeyBackup();}
function baiGetGeminiKeys(){
  const out=[],seen=new Set();
  [['primary',baiGetKeyPrimary()],['backup',baiGetKeyBackup()]].forEach(([id,key])=>{
    if(key&&!seen.has(key)){seen.add(key);out.push({id,key,fp:keyFp(key),label:id==='primary'?'primary key':'backup key'});}
  });
  return out;
}
const keyFp=k=>k.length+':'+k.slice(-6);
function baiSetupGemini(){
  const cur=baiGetGeminiKey();
  const entered=prompt('Paste your Gemini API key to power Wojak (and the AI reports).\n\nStored only in this browser (localStorage) — never saved into this file. When you ask something, your question plus a short summary (open tasks, streak) goes directly to Google\'s Gemini API — nothing else.\n\nLeave blank and press OK to remove a saved key.\n\nTip: you can add a second (backup) key from the ⚙ button in Wojak — BLOC switches to it automatically if this one fails.',cur);
  if(entered===null)return;
  const trimmed=entered.trim();
  if(trimmed){localStorage.setItem(BAI_GEMINI_KEY,trimmed);showToast('GEMINI KEY SAVED — WOJAK AI ON');}
  else{localStorage.removeItem(BAI_GEMINI_KEY);showToast('GEMINI KEY REMOVED — WOJAK AI OFF');}
  baiUpdateHeadSub();
}
function baiUpdateHeadSub(){if(typeof bcUpdateHeadSub==='function')bcUpdateHeadSub();}
function baiContextSummary(){
  const open=tasks.filter(t=>!t.done);
  const byType=t=>open.filter(x=>x.type===t).length;
  const wk=baiWeeklyStats(0);
  const todayISO=isoDate(bocNow());
  const calRows=[];
  for(let i=0;i<5;i++){
    const d=new Date(bocNow().getTime()+i*86400000);
    const iso=isoDate(d);
    const evs=eventsOn(iso);
    if(evs.length)calRows.push(`${i===0?'Today':i===1?'Tomorrow':d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}: ${evs.map(e=>`${fmtClock(e.start)}–${fmtClock(e.end)} ${e.title}`).join(', ')}`);
  }
  const estMin=open.reduce((a,t)=>a+(t.estimate||0),0);
  const dayStats=baiWeekdayStats();
  const dayLine=(dayStats&&dayStats.best&&dayStats.best.dayCount>=2)?`Best day of week historically: ${dayStats.best.day} (avg score ${dayStats.best.avgScore}). Weakest: ${dayStats.worst.day} (avg score ${dayStats.worst.avgScore}).`:null;
  const freeToday=baiFreeSlots(todayISO).reduce((a,s)=>a+(s.end-s.start),0);
  return [
    `Today: ${dateStr()}.`,
    `Open tasks — A:${byType('A')} B:${byType('B')} C:${byType('C')} D:${byType('D')} E:${byType('E')}.`,
    open.length?`Open task titles: ${open.slice(0,15).map(t=>t.text).join(' | ')}`:'No open tasks.',
    estMin>0?`Total time-estimated for open tasks: ${fmtDur(estMin*60)} (only tasks with an estimate set).`:null,
    `This week: ${wk.tasksCompleted} tasks completed, ${fmtDur(wk.totalFocus)} focused across ${wk.recentSessions.length} sessions, ${wk.rate}% completion rate.`,
    `Current streak: ${streakData.current} day(s).`,
    dayLine,
    freeToday>0?`Free time today (7am–10pm, outside calendar events): about ${fmtDur(freeToday*60)}.`:null,
    calRows.length?`Upcoming calendar (next 5 days):\n${calRows.join('\n')}`:'No calendar events in the next 5 days.'
  ].filter(Boolean).join('\n');
}
const FALLBACK_MODELS=['gemini-2.5-flash'];
const DEFAULT_THINKING='low';
const FIRST_BYTE_MS=9000;
const RETRY_CODES=[429,500,502,503,504];
const napFor=ms=>new Promise(r=>setTimeout(r,ms));
function thinkingCfg(model,level){
  if(/^gemini-3/.test(model))return {thinkingLevel:level||DEFAULT_THINKING};
  return {thinkingBudget:(level==='high'?4096:level==='medium'?2048:0)};
}
function geminiBody(prompt,model,maxOutputTokens,level,opts){
  opts=opts||{};
  const contents=(opts.history||[]).map(h=>({role:h.role,parts:[{text:h.text}]}));
  contents.push({role:'user',parts:[{text:prompt}]});
  const requestBody={contents,generationConfig:{maxOutputTokens,thinkingConfig:thinkingCfg(model,level)}};
  if(opts.system)requestBody.systemInstruction={parts:[{text:opts.system}]};
  return requestBody;
}
async function geminiFetch(model,key,requestBody,{stream=false,signal}={}){
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:${stream?'streamGenerateContent?alt=sse':'generateContent'}`;
  const reply=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(requestBody),signal});
  if(!reply.ok){
    let detail='',raw='';
    try{const j=await reply.json();detail=j?.error?.message||'';raw=JSON.stringify(j?.error||{});}catch(e){}
    const err=new Error(`Gemini API error ${reply.status}${detail?': '+detail:''}`);err.status=reply.status;
    if(reply.status===429){
      const m=raw.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
      if(m)err.retryAfterMs=Math.ceil(parseFloat(m[1])*1000);
      err.daily=/PerDay|per day|daily/i.test(raw+' '+detail);
    }
    throw err;
  }
  return reply;
}

function errorKind(err){
  if(!err)return'network';
  if(err.kind)return err.kind;
  const s=err.status,msg=String(err.message||'').toLowerCase();
  if(err.timeout||err.name==='AbortError')return'timeout';
  if(!s)return'network';
  if(s===401||s===403)return'auth';
  if(s===400&&/api key|api_key|key not valid|invalid.*key|key expired|expired.*key/.test(msg))return'auth';
  if(s===429)return err.daily?'quota':'rate';
  if(s===404)return'model';
  if(s===500||s===502||s===503||s===504)return'busy';
  return'bad';
}
const HEALTH={auth:{},cool:{},model:{}};
function baiHealthReset(){HEALTH.auth={};HEALTH.cool={};HEALTH.model={};}
function baiCooling(c){
  const t=Date.now();
  return !!HEALTH.auth[c.k.fp]||(HEALTH.cool[c.k.fp+'|'+c.m]||0)>t||(HEALTH.model[c.m]||0)>t;
}
let baiLastRoute=null;
function baiKeyStatus(){
  const keys=baiGetGeminiKeys();if(!keys.length)return'';
  const t=Date.now();
  const bad=k=>!!HEALTH.auth[k.fp];
  const limited=k=>Object.keys(HEALTH.cool).some(x=>x.startsWith(k.fp+'|')&&HEALTH.cool[x]>t);
  const p=keys.find(k=>k.id==='primary'),b=keys.find(k=>k.id==='backup');
  if(keys.every(bad))return keys.length>1?'Both Gemini keys were rejected — update them in ⚙.':'Your Gemini key was rejected — update it in ⚙.';
  if(keys.length>1&&p&&b){
    if(bad(p))return'Primary key isn\'t working — using your backup key.';
    if(limited(p)&&!bad(b))return'Primary key is rate-limited — using your backup key for now.';
  }
  return'';
}
function baiFriendlyError(err){
  const n=baiGetGeminiKeys().length;
  switch(errorKind(err)){
    case'auth':return n>1?'Both Gemini keys were rejected — check them in ⚙.':'Gemini rejected your key — check it in ⚙.';
    case'quota':case'rate':return n>1?'Both Gemini keys have hit their limit for now — wait a minute and try again.':'Gemini\'s free limit is reached for now — wait a minute and try again, or add a backup key in ⚙.';
    case'busy':return'Gemini is overloaded right now — try again in a moment.';
    case'timeout':return'Gemini took too long to answer — try again.';
    case'network':return'Couldn\'t reach Gemini — check your connection and try again.';
    case'empty':return'Gemini didn\'t return an answer (it may have been filtered) — try rephrasing.';
  }
  return(err&&err.message)||'Something went wrong.';
}

async function withFallback(run){
  const keys=baiGetGeminiKeys();
  if(!keys.length)throw new Error('No Gemini key set');
  const models=[GEMINI_MODEL].concat(FALLBACK_MODELS);
  const all=[];models.forEach(m=>keys.forEach(k=>all.push({m,k})));
  const queue=all.filter(c=>!baiCooling(c)).concat(all.filter(c=>baiCooling(c)));
  const deadKeys=new Set(),skipModel=new Set(),slowModels=new Set(),busyCount={},attempts=[];
  let lastErr=null;
  for(let i=0;i<queue.length;i++){
    const c=queue[i];
    if(deadKeys.has(c.k.fp)||skipModel.has(c.m))continue;
    for(;;){
      try{
        const out=await run(c.m,c.k.key);
        HEALTH.cool[c.k.fp+'|'+c.m]=0;HEALTH.model[c.m]=0;
        slowModels.forEach(m=>{if(m!==c.m)HEALTH.model[m]=Date.now()+45000;});
        baiLastRoute={keyId:c.k.id,model:c.m,viaBackup:c.k.id==='backup'&&keys.length>1,fellBack:c.m!==models[0],ts:Date.now(),attempts};
        return out;
      }catch(err){
        lastErr=err;
        if(err.partial)throw err;
        const kind=errorKind(err);err.kind=kind;
        attempts.push({key:c.k.id,model:c.m,kind,status:err.status||0});
        if(kind==='bad')throw err;
        if(kind==='auth'){HEALTH.auth[c.k.fp]=err.message;deadKeys.add(c.k.fp);break;}
        if(kind==='rate'||kind==='quota'){
          HEALTH.cool[c.k.fp+'|'+c.m]=Date.now()+(kind==='quota'?600000:Math.min(err.retryAfterMs||60000,120000));
          break;
        }
        if(kind==='model'){skipModel.add(c.m);HEALTH.model[c.m]=Date.now()+600000;break;}
        if(kind==='timeout'){skipModel.add(c.m);slowModels.add(c.m);break;}
        slowModels.add(c.m);
        busyCount[c.m]=(busyCount[c.m]||0)+1;
        const another=queue.slice(i+1).some(x=>x.m===c.m&&!deadKeys.has(x.k.fp));
        if(!another&&busyCount[c.m]<2){await napFor(400);continue;}
        break;
      }
    }
  }
  let err=lastErr||new Error('Gemini is unavailable right now');
  if(err.timeout||err.name==='AbortError'){const k=err.kind;err=new Error('Gemini is slow or busy right now — try again in a moment');err.kind=k||'timeout';}
  err.attempts=attempts;
  throw err;
}
async function baiCallGemini(promptText,{maxOutputTokens=1536,thinkingLevel=DEFAULT_THINKING,system,history}={}){
  if(!baiGetGeminiKey())throw new Error('No Gemini key set');
  return withFallback(async (model,key)=>{
    async function attempt(limit){
      const ctl=new AbortController();const timer=setTimeout(()=>{ctl.abort();},25000);
      try{
        const reply=await geminiFetch(model,key,geminiBody(promptText,model,limit,thinkingLevel,{system,history}),{signal:ctl.signal});
        const parsed=await reply.json();
        const cand=parsed?.candidates?.[0];
        return {text:cand?.content?.parts?.map(p=>p.text||'').join('')?.trim(),finishReason:cand?.finishReason};
      }catch(e){if(e.name==='AbortError')e.timeout=true;throw e;}
      finally{clearTimeout(timer);}
    }
    let {text,finishReason}=await attempt(maxOutputTokens);
    if(finishReason==='MAX_TOKENS'&&maxOutputTokens<6000)({text,finishReason}=await attempt(6000));
    if(!text){const e=new Error('Gemini returned no text (may have been blocked by safety filters)');e.kind='empty';throw e;}
    return text;
  });
}
async function baiStreamGemini(promptText,{maxOutputTokens=900,thinkingLevel=DEFAULT_THINKING,onText,system,history,firstByteMs=FIRST_BYTE_MS}={}){
  if(!baiGetGeminiKey())throw new Error('No Gemini key set');
  return withFallback(async (model,key)=>{
    const ctl=new AbortController();
    let timer=setTimeout(()=>{ctl.abort();},firstByteMs);
    let acc='',finish='';
    try{
      const reply=await geminiFetch(model,key,geminiBody(promptText,model,maxOutputTokens,thinkingLevel,{system,history}),{stream:true,signal:ctl.signal});
      if(!reply.body||!reply.body.getReader){
        clearTimeout(timer);
        const t=await baiCallGemini(promptText,{maxOutputTokens,thinkingLevel,system,history});
        if(onText)onText(t);return {text:t,truncated:false};
      }
      const reader=reply.body.getReader(),dec=new TextDecoder();
      let buf='';
      for(;;){
        const {done,chunk}=await reader.read();
        if(done)break;
        if(timer){clearTimeout(timer);timer=null;}
        buf+=dec.decode(chunk,{stream:true});
        const lines=buf.split(/\r?\n/);buf=lines.pop();
        for(const ln of lines){
          if(!ln.startsWith('data:'))continue;
          let j;try{j=JSON.parse(ln.slice(5).trim());}catch(e){continue;}
          const cand=j?.candidates?.[0];
          const piece=cand?.content?.parts?.map(p=>p.text||'').join('')||'';
          if(piece){acc+=piece;if(onText)onText(acc);}
          if(cand?.finishReason)finish=cand.finishReason;
        }
      }
      if(!acc.trim()){const e=new Error('Gemini returned no text (may have been blocked by safety filters)');e.kind='empty';throw e;}
      return {text:acc.trim(),truncated:finish==='MAX_TOKENS'};
    }catch(e){
      if(e.name==='AbortError')e.timeout=true;
      if(acc.trim())e.partial=true;
      throw e;
    }finally{if(timer)clearTimeout(timer);}
  });
}
async function baiTestKey(key){
  key=(key||'').trim();
  if(!key)return{ok:false,kind:'none',message:'No key entered'};
  const model=FALLBACK_MODELS[0]||GEMINI_MODEL;
  const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),12000);
  try{
    const reply=await geminiFetch(model,key,{contents:[{role:'user',parts:[{text:'Reply with the single word: ok'}]}],generationConfig:{maxOutputTokens:16,thinkingConfig:thinkingCfg(model,'low')}},{signal:ctl.signal});
    await reply.json();
    return{ok:true,kind:'ok',message:'Works'};
  }catch(e){
    if(e.name==='AbortError')e.timeout=true;
    const kind=errorKind(e);
    const msg={auth:'Google rejected this key — check you copied all of it.',
      rate:'Key is valid, but it is rate-limited right now.',quota:'Key is valid, but its free quota is used up for now.',
      busy:'Google is busy — try the test again in a moment.',timeout:'No answer in time — try again.',
      network:'Couldn\'t reach Google — check your connection.',model:'Key accepted, but the test model isn\'t available to it.'}[kind]||e.message;
    return{ok:kind==='rate'||kind==='quota'||kind==='model',kind,message:msg};
  }finally{clearTimeout(timer);}
}

function baiWeeklyStats(offsetWeeks){
  const {cutoffISO,endISO}=weekWindowISO(offsetWeeks);
  const recentSessions=sessions.filter(s=>s.dateISO&&s.dateISO>=cutoffISO&&s.dateISO<=endISO);
  const totalFocus=recentSessions.reduce((a,s)=>a+s.elapsed,0);
  const completedSessions=recentSessions.filter(s=>s.completed).length;
  const rate=recentSessions.length?Math.round(completedSessions/recentSessions.length*100):0;
  const totalDistractions=recentSessions.reduce((a,s)=>a+(s.distractions||0),0);
  const logEntries=taskCompletionLog.filter(l=>l.dateISO&&l.dateISO>=cutoffISO&&l.dateISO<=endISO);
  return {recentSessions,totalFocus,completedSessions,rate,totalDistractions,tasksCompleted:logEntries.length};
}
function baiStripHtml(html){return (html||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
const catName=t=>{const s=SECTS.find(x=>x.type===t);return s?s.name:t;};
const catDesc=t=>{const s=SECTS.find(x=>x.type===t);return s?s.desc:'';};
function nextTask(){
  for(const s of SECTS){
    const open=tasks.filter(t=>t.type===s.type&&!t.done);
    if(open.length)return {task:open[0],sect:s,openCount:open.length};
  }
  return null;
}
const eventsOn=iso=>calEventsForDate(iso).sort((a,b)=>a.start-b.start);
function detectCat(q){
  const patterns=[
    {type:'A',re:/\b(category|type)?\s*a\b[- ]?tasks?\b|\bmust ?do(s)?\b/},
    {type:'B',re:/\b(category|type)?\s*b\b[- ]?tasks?\b|\bshould ?do(s)?\b/},
    {type:'C',re:/\b(category|type)?\s*c\b[- ]?tasks?\b|\bnice ?to ?do(s)?\b/},
    {type:'D',re:/\b(category|type)?\s*d\b[- ]?tasks?\b|\bdelegate(d|s)?\b/},
    {type:'E',re:/\b(category|type)?\s*e\b[- ]?tasks?\b|\beliminate(d|s)?\b/},
  ];
  for(const p of patterns)if(p.re.test(q))return p.type;
  return null;
}
function findTasks(kw,{onlyOpen=true}={}){
  const words=kw.toLowerCase().split(/\s+/).filter(w=>w.length>2);
  if(!words.length)return [];
  const pool=onlyOpen?tasks.filter(t=>!t.done):tasks.slice();
  const scored=pool.map(t=>{
    const hay=t.text.toLowerCase();
    let score=0;
    if(hay.includes(kw.toLowerCase()))score+=10;
    words.forEach(w=>{if(hay.includes(w))score+=1;});
    return {t,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  return scored.map(x=>x.t);
}
function staleTasks(type,minDays){
  minDays=minDays===undefined?3:minDays;
  const cutoff=minDays*86400000;
  return tasks.filter(t=>(!type||t.type===type)&&!t.done&&t.created&&(Date.now()-t.created)>cutoff)
    .sort((a,b)=>a.created-b.created);
}
function baiWeekdayStats(){
  const buckets=[0,1,2,3,4,5,6].map(()=>({weighted:0,focusSec:0,days:new Set()}));
  taskCompletionLog.forEach(l=>{
    if(!l.dateISO)return;
    const d=new Date(l.dateISO+'T00:00:00');
    const b=buckets[d.getDay()];
    b.weighted+=(WKI_WEIGHT[l.type]||1);
    b.days.add(l.dateISO);
  });
  sessions.forEach(s=>{
    if(!s.dateISO)return;
    const d=new Date(s.dateISO+'T00:00:00');
    const b=buckets[d.getDay()];
    b.focusSec+=s.elapsed;
    b.days.add(s.dateISO);
  });
  const names=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const scored=buckets.map((b,i)=>({
    day:names[i],
    dayCount:b.days.size||1,
    avgScore:Math.round((b.weighted*10+b.focusSec/60)/(b.days.size||1))
  })).filter(x=>x.dayCount>0);
  if(!scored.some(x=>x.avgScore>0))return null;
  scored.sort((a,b)=>b.avgScore-a.avgScore);
  return {best:scored[0],worst:scored[scored.length-1],all:scored};
}
function baiFreeSlots(iso,dayStartMin,dayEndMin){
  dayStartMin=dayStartMin===undefined?7*60:dayStartMin;
  dayEndMin=dayEndMin===undefined?22*60:dayEndMin;
  const evs=eventsOn(iso).slice().sort((a,b)=>a.start-b.start);
  const slots=[];
  let cursor=dayStartMin;
  evs.forEach(e=>{
    if(e.start>cursor+15)slots.push({start:cursor,end:Math.min(e.start,dayEndMin)});
    cursor=Math.max(cursor,e.end);
  });
  if(cursor<dayEndMin-15)slots.push({start:cursor,end:dayEndMin});
  return slots.filter(s=>s.end>s.start&&s.end<=dayEndMin);
}
const JOKES=[
  "Why did the Eisenhower Matrix break up with the to-do list? Too much unresolved tension between urgent and important.",
  "I'd tell you a productivity joke, but you'd probably just put it off until tomorrow.",
  "My favorite exercise is dragging tasks from \"Should Do\" to \"Done.\" Very low-impact, high reward.",
  "Category E tasks walk into a bar. The bartender eliminates them immediately."
];

function baiRespond(raw){
  let q=raw.toLowerCase().trim();

  const followUp=q.match(/^(?:what about|and|how about)\s+([abcde])\b/i);
  if(followUp){q=`how many ${followUp[1]} tasks do i have`;}
  else if(/^(?:what about|and|how about)\s+tomorrow\b/i.test(q)){q="what's on tomorrow";}
  else if(/^(?:what about|and|how about)\s+today\b/i.test(q)){q="what's on today";}

  // greetings
  if(/^(hi|hello|hey|yo|sup|howdy)\b/.test(q)){
    return `Hey! I'm the <b>BLOC Agent</b> — I only know what's already in this app (tasks, focus sessions, calendar, notes), and I can act on it too. Try <b>"what should I do next?"</b>, <b>"mark [task] as done"</b>, or <b>"give me a pep talk"</b>. Say <b>"what can you do"</b> for the full list.`;
  }
  if(/thank/.test(q))return `You're welcome. Anything else you want a read on?`;
  if(/what can you do|help\b|commands|capabilities/.test(q)){
    return `Here's what I can do, all from data already on this device:<br>
    • <b>Tasks</b> — "how many A tasks", "what should I do next", "what's overdue", "quickest win", "how long will my open tasks take", "find task about X", "how's [task] going", "recurring tasks", "what did I finish today"<br>
    • <b>Actions</b> — "mark [task] done", "add a B task: [text]"<br>
    • <b>Focus</b> — "focus today/this week", "distractions this week", "streak", "this week vs last week"<br>
    • <b>Patterns</b> — "peak day", "best day of the week", "how's my week going"<br>
    • <b>Calendar</b> — "what's on today/tomorrow", "this week's schedule", "free time today", "next event"<br>
    • <b>Notes</b> — "find notes about X", "my notes"<br>
    • <b>Misc</b> — "explain category A", "pep talk", "tell me a joke"<br>
    No connected AI model, no network calls — just rules reading (and sometimes editing) your data.`;
  }

  const markHit=q.match(/^(?:mark|check off|complete|finish)\s+(?:the\s+|task\s+)?["']?(.+?)["']?\s*(?:as\s+done|off|complete)?$/) || q.match(/^(?:i\s+)?(?:did|finished|completed)\s+["']?(.+?)["']?$/);
  if(markHit && markHit[1] && markHit[1].length>1 && !/^(today|this week|it)$/.test(markHit[1].trim())){
    const kw=markHit[1].trim();
    const hits=findTasks(kw,{onlyOpen:true});
    if(!hits.length)return `I couldn't find an open task matching "${escHTML(kw)}" to mark done. Check the exact wording with "find task about ${escHTML(kw)}"?`;
    if(hits.length>1 && hits[0].text.toLowerCase()!==kw.toLowerCase()){
      return `A few open tasks match "${escHTML(kw)}" — which one?<br>${hits.slice(0,5).map(t=>`• ${escHTML(t.text)}`).join('<br>')}<br>Try again with more of the exact task text.`;
    }
    const t=hits[0];
    toggleDone(t.id);
    return `✓ Marked <b>"${escHTML(t.text)}"</b> as done. Nice work.`;
  }

  const addHit=q.match(/^(?:add|create|new)\s+(?:an?\s+)?([abcde])?\s*(?:-|category|type)?\s*task[:\s]+(.+)$/i) || raw.match(/^(?:add|create|new)\s+(?:an?\s+)?(?:([ABCDE])\s*[-:]?\s*)?task[:\s]+(.+)$/i);
  if(addHit && addHit[2] && addHit[2].trim().length){
    const type=(addHit[1]||'B').toUpperCase();
    const text=addHit[2].trim().replace(/^["']|["']$/g,'');
    if(!text)return `What should the task say? Try "add a B task: call the dentist".`;
    const planISO=planTargetISO();
    if(type==='A'&&tasks.filter(t=>t.type==='A'&&t.dateISO===planISO).length>=3){
      return `You're already at the max of 3 A-priority tasks${addPlanTarget==='tomorrow'?' for tomorrow':' for today'}. Finish or move one before adding another.`;
    }
    tasks.push({id:String(nextId++),type,text,done:false,created:Date.now(),estimate:0,recurring:false,subtasks:[],note:'',dateISO:planISO,progressState:'not_started',timeSpentMin:0});
    saveT();renderTasks();
    return `✓ Added <b>"${escHTML(text)}"</b> to <b>${catName(type)} (${type})</b>${addPlanTarget==='tomorrow'?' — planned for tomorrow':''}.`;
  }

  // streak
  if(/streak/.test(q)){
    baiCtx.lastTopic='streak';
    const s=streakData;
    let extra='';
    if(s.current>0&&s.current===s.best)extra=" That's your best streak ever — right now.";
    else if(s.best-s.current<=2&&s.best>s.current)extra=` You're ${s.best-s.current} day${s.best-s.current===1?'':'s'} from tying your best (${s.best}).`;
    return `Your current streak is <b>${s.current} day${s.current===1?'':'s'}</b>🔥, best ever is <b>${s.best} days</b>.${extra}`;
  }

  // pep talk / motivation
  if(/pep talk|motivate|motivation|encourage|cheer/.test(q)){
    const w=baiWeeklyStats();
    const stale=staleTasks('A',3);
    if(w.tasksCompleted===0&&w.totalFocus===0)return `No activity logged yet this week — that's fine, every streak starts with one task. Pick literally anything off the list and knock it out; momentum matters more than size right now.`;
    let msg=`You've completed <b>${w.tasksCompleted}</b> task${w.tasksCompleted===1?'':'s'} and logged <b>${fmtDur(w.totalFocus)}</b> of focus this week`;
    msg+=streakData.current>0?`, and you're on a <b>${streakData.current}-day streak</b>. That's real, consistent effort.`:'. ';
    if(stale.length)msg+=` One thing worth naming: "${escHTML(stale[0].text)}" has been sitting a few days — you don't have to finish it today, just start it for 10 minutes.`;
    else msg+=` Nothing's stuck or avoided right now — keep the rhythm going.`;
    return msg;
  }
  if(/tell me a joke|joke\b/.test(q)){
    return JOKES[Math.floor(Math.random()*JOKES.length)];
  }

  // explain category meaning
  const explainHit=q.match(/\b(?:explain|what is|what's|meaning of)\s*(?:category|type)?\s*([abcde])\b/);
  if(explainHit){
    const t=explainHit[1].toUpperCase();
    return `<b>${catName(t)} (${t})</b>: ${catDesc(t)}`;
  }

  if(/what.*(should i do|do next|next task)|next task|what.*(priorit)/.test(q)){
    baiCtx.lastTopic='next';
    const s=nextTask();
    if(!s)return `You have no open tasks right now — nothing left to suggest. Nice work.`;
    let extra='';
    if(s.task.estimate)extra+=` Estimated ${s.task.estimate}m.`;
    if(s.task.subtasks&&s.task.subtasks.length){
      const done=s.task.subtasks.filter(st=>st.done).length;
      extra+=` ${done}/${s.task.subtasks.length} subtasks done.`;
    }
    return `Highest priority open item is in <b>${s.sect.name} (${s.sect.type})</b>: "${escHTML(s.task.text)}"${s.openCount>1?` — ${s.openCount} more open in that category after it.`:''}${extra} ${s.sect.type==='A'?'This one has real consequences if it slips — worth doing first.':''}`;
  }

  if(/quick(est)? win|quick task|short task|knock out fast|easy win/.test(q)){
    const withEstimate=tasks.filter(t=>!t.done&&t.estimate>0).sort((a,b)=>a.estimate-b.estimate);
    if(!withEstimate.length)return `None of your open tasks have a time estimate set, so I can't rank them by speed. Add an estimate to a task and ask me again.`;
    const t=withEstimate[0];
    return `Fastest open task by estimate: <b>"${escHTML(t.text)}"</b> in ${catName(t.type)} (${t.type}) — about <b>${t.estimate}m</b>.`;
  }

  if(/how long.*(open task|to ?do|clear)|total.*(time|estimate)/.test(q)){
    const cat=detectCat(q);
    const pool=tasks.filter(t=>!t.done&&(!cat||t.type===cat)&&t.estimate>0);
    const untimed=tasks.filter(t=>!t.done&&(!cat||t.type===cat)&&!t.estimate);
    if(!pool.length && !untimed.length)return `No open tasks${cat?` in ${catName(cat)} (${cat})`:''} to estimate.`;
    const totalMin=pool.reduce((a,t)=>a+t.estimate,0);
    return `${pool.length} estimated open task${pool.length===1?'':'s'}${cat?` in ${catName(cat)} (${cat})`:''} add up to about <b>${fmtDur(totalMin*60)}</b>.${untimed.length?` (${untimed.length} more open task${untimed.length===1?' has':'s have'} no estimate set, not counted.)`:''}`;
  }

  if(/avoid|procrastinat|stuck|been sitting|putting off|overdue/.test(q)){
    const cat=detectCat(q);
    const stale=staleTasks(cat,3);
    if(!stale.length)return `No${cat?` ${catName(cat)}`:' "Must Do"'} tasks have been sitting open for 3+ days right now — no avoidance pattern detected.`;
    return `${stale.length} task${stale.length===1?' has':'s have'} been open 3+ days${cat?` in ${catName(cat)} (${cat})`:''}:<br>${stale.slice(0,6).map(t=>`• ${escHTML(t.text)} (${Math.floor((Date.now()-t.created)/86400000)}d old)`).join('<br>')}`;
  }

  // recurring tasks
  if(/recurring|repeat(ing)? task/.test(q)){
    const rec=tasks.filter(t=>t.recurring&&!t.done);
    if(!rec.length)return `No open recurring tasks right now.`;
    return `${rec.length} open recurring task${rec.length===1?'':'s'}:<br>${rec.map(t=>`• ${escHTML(t.text)} (${catName(t.type)})`).join('<br>')}`;
  }

  // what did I finish today
  if(/what.*(finish|complet|did i do).*(today)|today.*(finish|complet)/.test(q)){
    const iso=isoDate(bocNow());
    const done=taskCompletionLog.filter(l=>l.dateISO===iso);
    if(!done.length)return `Nothing marked complete yet today.`;
    const named=done.map(l=>{const t=tasks.find(x=>x.id===l.taskId);return t?t.text:null;}).filter(Boolean);
    return `Completed today: <b>${done.length}</b> task${done.length===1?'':'s'}${named.length?`<br>${named.slice(0,8).map(n=>'• '+escHTML(n)).join('<br>')}`:''}`;
  }

  const progHit=q.match(/how'?s?\s+(?:my\s+|the\s+)?(.+?)\s+(?:going|coming along|progress|doing)\??$/);
  if(progHit && progHit[1] && progHit[1].length>2 && !/^week|^day|^streak/.test(progHit[1])){
    const hits=findTasks(progHit[1],{onlyOpen:false});
    if(hits.length){
      const t=hits[0];
      if(t.done)return `"${escHTML(t.text)}" is already marked <b>done</b>.`;
      if(t.subtasks&&t.subtasks.length){
        const done=t.subtasks.filter(s=>s.done).length;
        return `"${escHTML(t.text)}" — <b>${done}/${t.subtasks.length}</b> subtasks done. Still open: ${t.subtasks.filter(s=>!s.done).map(s=>escHTML(s.text)).join(', ')||'none'}.`;
      }
      return `"${escHTML(t.text)}" is still open in ${catName(t.type)} (${t.type}), no subtasks tracked on it.`;
    }
  }

  // task search
  const findHit=q.match(/(?:find|search for|do i have|is there)\s+(?:a\s+|an\s+|any\s+)?task[s]?\s*(?:about|on|for|regarding|called|named)?\s+(.+)/);
  if(findHit && findHit[1]){
    const kw=findHit[1].trim();
    const hits=findTasks(kw,{onlyOpen:false});
    if(!hits.length)return `No tasks found matching "${escHTML(kw)}".`;
    return `Found ${hits.length} task${hits.length===1?'':'s'} matching "${escHTML(kw)}":<br>${hits.slice(0,6).map(t=>`• ${t.done?'✓ ':''}${escHTML(t.text)} (${catName(t.type)})`).join('<br>')}`;
  }

  // category-specific counts
  const cat=detectCat(q);
  if(cat&&/how many|count|list|what.*(are|is)/.test(q)){
    baiCtx.lastCat=cat;baiCtx.lastTopic='category';
    const all=tasks.filter(t=>t.type===cat);
    const open=all.filter(t=>!t.done);
    const sectName=catName(cat);
    if(!all.length)return `You have no tasks in <b>${sectName} (${cat})</b> right now.`;
    return `<b>${sectName} (${cat})</b>: ${open.length} open / ${all.length} total.${open.length?`<br>${open.slice(0,5).map(t=>'• '+escHTML(t.text)).join('<br>')}${open.length>5?`<br>…and ${open.length-5} more.`:''}`:' All done — nothing open.'}`;
  }
  if(/how many.*(task|to ?do)/.test(q)){
    const open=tasks.filter(t=>!t.done).length, total=tasks.length;
    const byCat=SECTS.map(s=>`${s.type}:${tasks.filter(t=>t.type===s.type&&!t.done).length}`).join(' ');
    return `You have <b>${open}</b> open task${open===1?'':'s'} out of ${total} total. Breakdown — ${byCat}`;
  }

  // focus time
  if(/focus.*(today)|today.*focus/.test(q)){
    const iso=isoDate(bocNow());
    const today=sessions.filter(s=>s.dateISO===iso);
    const sec=today.reduce((a,s)=>a+s.elapsed,0);
    if(!today.length)return `No timer sessions logged today yet — that doesn't mean you haven't focused, just that the timer wasn't running.`;
    return `Today you've logged <b>${fmtDur(sec)}</b> of focus across ${today.length} session${today.length===1?'':'s'}.`;
  }
  if(/this week.*(vs|versus|compared? to).*(last week)|last week.*(vs|versus|compared? to).*(this week)|compare.*(week)/.test(q)){
    const cur=baiWeeklyStats(0), prev=baiWeeklyStats(1);
    const focusDiff=cur.totalFocus-prev.totalFocus;
    const taskDiff=cur.tasksCompleted-prev.tasksCompleted;
    return `This week vs last week: focus <b>${fmtDur(cur.totalFocus)}</b> vs ${fmtDur(prev.totalFocus)} (${focusDiff>=0?'+':''}${fmtDur(Math.abs(focusDiff))}${focusDiff>=0?'':' less'}), tasks completed <b>${cur.tasksCompleted}</b> vs ${prev.tasksCompleted} (${taskDiff>=0?'+':''}${taskDiff}).`;
  }
  if(/focus.*(week)|week.*focus|how.*(much|long).*focus/.test(q)){
    const w=baiWeeklyStats();
    return `This week: <b>${fmtDur(w.totalFocus)}</b> of timer-tracked focus across ${w.recentSessions.length} session${w.recentSessions.length===1?'':'s'}. That's timer time only — task completions on days you didn't use the timer aren't included here, but they do count in the Productivity Trend graph.`;
  }
  if(/distraction/.test(q)){
    const w=baiWeeklyStats();
    return w.recentSessions.length
      ? `<b>${w.totalDistractions}</b> distraction${w.totalDistractions===1?'':'s'} logged this week, across ${w.recentSessions.length} timed session${w.recentSessions.length===1?'':'s'}. Days without a timer session aren't reflected here.`
      : `No timed sessions this week, so there's no distraction count to report.`;
  }
  if(/completion rate|how.*(am i doing|going)|how's my week/.test(q)){
    const w=baiWeeklyStats();
    return `This week's completion rate on timed sessions is <b>${w.rate}%</b> (${w.completedSessions}/${w.recentSessions.length}), with <b>${fmtDur(w.totalFocus)}</b> tracked and a <b>${streakData.current} day</b> streak. Open the Productivity Trend graph on the Weekly tab for the fuller picture, including untracked days.`;
  }

  if(/best day|worst day|which day.*(best|productive)|day of the week/.test(q)){
    const stats=baiWeekdayStats();
    if(!stats)return `Not enough history yet to tell which day of the week is strongest — keep logging tasks and focus sessions and ask again in a week or two.`;
    return `Historically, <b>${stats.best.day}</b> is your strongest day (avg score ${stats.best.avgScore}), and <b>${stats.worst.day}</b> tends to be the lightest (avg score ${stats.worst.avgScore}). Worth scheduling your toughest A-tasks on ${stats.best.day}s.`;
  }

  // trend / peak / graph
  if(/peak|trend|graph|score|sweet spot/.test(q)){
    const metrics=wkiDaily(7);
    const analysis=wkiSeries(metrics);
    const peak=metrics[analysis.peakIdx];
    const trendWord=analysis.trendSlope>0.5?'trending up':analysis.trendSlope<-0.5?'trending down':'holding steady';
    return `Over the last 7 days your peak was <b>${peak.label}</b> (score ${peak.score}), and the overall trend is <b>${trendWord}</b>. Open the Weekly tab and tap that point on the Productivity Trend graph for the full breakdown.`;
  }

  // free time today/tomorrow
  if(/free time|any (gaps|openings)|when am i free|open slot/.test(q)){
    const forTomorrow=/tomorrow/.test(q);
    const iso=isoDate(new Date(bocNow().getTime()+(forTomorrow?86400000:0)));
    const slots=baiFreeSlots(iso);
    const dayWord=forTomorrow?'tomorrow':'today';
    if(!slots.length)return `No meaningful free gaps ${dayWord} between 7am–10pm — your calendar's packed.`;
    return `Free time ${dayWord}:<br>${slots.map(s=>`• ${fmtClock(s.start)}–${fmtClock(s.end)} (${fmtDur((s.end-s.start)*60)})`).join('<br>')}`;
  }

  // next event
  if(/next event|next meeting|what'?s next on my calendar/.test(q)){
    const minNow=bocNow().getHours()*60+bocNow().getMinutes();
    const todayISO=isoDate(bocNow());
    const todayEvents=eventsOn(todayISO).filter(e=>e.start>=minNow);
    if(todayEvents.length)return `Next up today: <b>${fmtClock(todayEvents[0].start)}–${fmtClock(todayEvents[0].end)}</b> ${escHTML(todayEvents[0].title)}.`;
    for(let i=1;i<=7;i++){
      const iso=isoDate(new Date(bocNow().getTime()+i*86400000));
      const evs=eventsOn(iso);
      if(evs.length)return `Nothing left today. Next up is <b>${new Date(iso+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}</b> at ${fmtClock(evs[0].start)}: ${escHTML(evs[0].title)}.`;
    }
    return `Nothing on the calendar for the next 7 days.`;
  }

  // this week's schedule
  if(/this week.*(schedule|calendar|agenda)|schedule.*(this week)|upcoming events/.test(q)){
    let out=[];
    for(let i=0;i<7;i++){
      const d=new Date(bocNow().getTime()+i*86400000);
      const iso=isoDate(d);
      const evs=eventsOn(iso);
      if(evs.length)out.push(`<b>${d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</b>: ${evs.map(e=>escHTML(e.title)).join(', ')}`);
    }
    if(!out.length)return `Nothing scheduled on your calendar for the next 7 days.`;
    return `Upcoming this week:<br>${out.join('<br>')}`;
  }

  // calendar today/tomorrow
  if(/calendar|schedule|agenda|what.*on (today|tomorrow)/.test(q)){
    const forTomorrow=/tomorrow/.test(q);
    const iso=isoDate(new Date(bocNow().getTime()+(forTomorrow?86400000:0)));
    baiCtx.lastDateISO=iso;baiCtx.lastTopic='calendar';
    const evs=eventsOn(iso);
    const dayWord=forTomorrow?'tomorrow':'today';
    if(!evs.length)return `Nothing scheduled ${dayWord} on your calendar.`;
    return `On ${dayWord}'s calendar:<br>${evs.map(e=>`• ${fmtClock(e.start)}–${fmtClock(e.end)} ${escHTML(e.title)}`).join('<br>')}`;
  }

  // notes search
  const noteHit=q.match(/notes?\s*(about|on|for|regarding)\s+(.+)/);
  if(noteHit){
    const kw=noteHit[2].trim();
    const hits=npNotes.filter(n=>(n.title||'').toLowerCase().includes(kw)||baiStripHtml(n.content).toLowerCase().includes(kw));
    if(!hits.length)return `No notes found matching "${escHTML(kw)}".`;
    return `Found ${hits.length} note${hits.length===1?'':'s'} matching "${escHTML(kw)}":<br>${hits.slice(0,5).map(n=>{
      const snippet=baiStripHtml(n.content).slice(0,80);
      return `• <b>${escHTML(n.title||'Untitled')}</b>${snippet?' — '+escHTML(snippet)+'…':''}`;
    }).join('<br>')}`;
  }
  if(/^notes?$|my notes/.test(q)){
    if(!npNotes.length)return `You don't have any notes yet.`;
    return `You have <b>${npNotes.length}</b> note${npNotes.length===1?'':'s'}. Most recent: ${npNotes.slice().sort((a,b)=>b.updated-a.updated).slice(0,5).map(n=>escHTML(n.title||'Untitled')).join(', ')}.`;
  }

  const anyFind=q.match(/^(?:find|search)\s+(.+)/);
  if(anyFind && anyFind[1] && anyFind[1].length>2){
    const kw=anyFind[1].trim();
    const taskHits=findTasks(kw,{onlyOpen:false});
    const noteHits=npNotes.filter(n=>(n.title||'').toLowerCase().includes(kw)||baiStripHtml(n.content).toLowerCase().includes(kw));
    if(!taskHits.length&&!noteHits.length)return `Nothing in tasks or notes matches "${escHTML(kw)}".`;
    let out='';
    if(taskHits.length)out+=`Tasks:<br>${taskHits.slice(0,4).map(t=>`• ${t.done?'✓ ':''}${escHTML(t.text)}`).join('<br>')}`;
    if(noteHits.length)out+=`${out?'<br><br>':''}Notes:<br>${noteHits.slice(0,4).map(n=>`• ${escHTML(n.title||'Untitled')}`).join('<br>')}`;
    return out;
  }

  // date/time
  if(/what.*(day|date) is it|today'?s date/.test(q)){
    return `Today is <b>${bocNow().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</b>.`;
  }

  const words=q.split(/\s+/).filter(w=>w.length>3&&!/what|when|where|which|about|there|these|those|doing|going/.test(w));
  if(words.length){
    const guess=findTasks(words.join(' '),{onlyOpen:false});
    if(guess.length===1){
      const t=guess[0];
      return `Not sure exactly what you meant, but the closest match I found is the task "${escHTML(t.text)}" (${t.done?'done':'open'}, ${catName(t.type)}). Is that what you meant? Try "how's [task] going" or "mark it done" if so.`;
    }
  }
  return `I didn't quite catch that from your data. Try things like <b>"what should I do next?"</b>, <b>"mark [task] done"</b>, <b>"how much have I focused this week?"</b>, <b>"what's on today?"</b>, <b>"best day of the week"</b>, or <b>"give me a pep talk"</b>.`;
}


const BC_MSG_BOXES=['bai-messages','lib-chat-messages'];
const bcBusy=new Set();
function bcIsBusy(){return bcBusy.has(bcStore.activeId);}
let bcFrame=0;
const BC_PANELS=[
  {panel:'bai-panel',bar:'bai-bar',hist:'bai-hist',input:'bai-input'},
  {panel:'lib-chat-panel',bar:'lib-chat-bar',hist:'lib-chat-hist',input:'lib-chat-input'}
];
let bcShowHist=false,bcHistSearch='',bcRenaming=null;

function bcHasKey(){return typeof baiGetGeminiKey==='function'&&!!baiGetGeminiKey();}
const bcBreaks=t=>escHTML(t).replace(/\n\s*\n/g,'<br><br>').replace(/\n/g,'<br>');

const bcBubble=(m,i)=>{
  const reads=(m.reads&&m.reads.length)?`<div class="lib-chat-related"><span class="bc-rel-lbl">From the Library</span>${m.reads.map(r=>`<a href="javascript:void(0)" class="lib-chat-link" data-rid="${escAttr(r.id)}" onclick="openLibraryRead(this.dataset.rid)">${uiI('book')}${escHTML(r.title)}</a>`).join('')}</div>`:'';
  const helpHtml=(m.res&&m.res.length)?`<div class="lib-chat-related"><span class="bc-rel-lbl">Outside help</span>${m.res.map(r=>`<a class="lib-chat-link" href="${escAttr(r.url)}" target="_blank" rel="noopener noreferrer" title="${escAttr(r.use)}">${uiI('link')}${escHTML(r.name)}</a>`).join('')}</div>`:'';
  const save=(m.saveQ&&!m.tempId&&!m.saved)?`<div class="lib-chat-related"><a href="javascript:void(0)" class="lib-chat-link" onclick="bcSaveGuide(${i})">${uiI('save')}Save this to my Library</a></div>`:(m.saved?`<div class="lib-chat-related"><span class="bc-rel-lbl">SAVED — find it under My Saved Guides</span></div>`:'');
  const retry=m.failedQ?`<div class="lib-chat-related"><a href="javascript:void(0)" class="lib-chat-link" onclick="bcRetry(${i})">${uiI('repeat')}Try again</a></div>`:'';
  const time=m.tempId?'':`<div class="bai-msg-time">${bocFromMs(m.ts).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}${m.via?' · '+escHTML(m.via):''}</div>`;
  return`<div class="bai-msg ${m.role}">${m.text}${reads}${helpHtml}${save}${retry}${time}</div>`;
};
const bcEmpty=()=>{
  const chips=bcPickChips().slice(0,3).map(c=>`<button type="button" class="bai-chip" data-q="${escAttr(c)}" onclick="bcAsk(this.dataset.q)">${escHTML(c)}</button>`).join('');
  const note=bcHasKey()?'':`<div class="bai-empty-note"><a href="javascript:void(0)" class="lib-chat-link" onclick="baiOpenKeyManager()">Connect Gemini</a> for full answers.</div>`;
  return`<div class="bai-empty"><div class="bai-empty-t">What’s on your mind?</div><div class="bai-empty-s">Pick one, or describe what you’re stuck on.</div><div class="bai-empty-chips">${chips}</div>${note}</div>`;
};
function bcRender(){
  BC_MSG_BOXES.forEach(id=>{
    const wrap=$(id);if(!wrap)return;
    const nearBottom=wrap.scrollHeight-wrap.scrollTop-wrap.clientHeight<120;
    const firstPaint=!wrap.dataset.painted;
    wrap.innerHTML=baiChat.length?baiChat.map(bcBubble).join(''):bcEmpty();
    if(nearBottom||firstPaint)wrap.scrollTop=wrap.scrollHeight;
    wrap.dataset.painted='1';
  });
  ['bai-chips','lib-chat-chips'].forEach(id=>{const el=$(id);if(el)el.style.display=baiChat.length?'none':'';});
  bcRenderBars();
}
const bcQueueRender=()=>{if(bcFrame)return;bcFrame=requestAnimationFrame(()=>{bcFrame=0;bcRender();});};
function baiRenderMessages(){bcRender();}
function libRenderMessages(){bcRender();}

const BC_CHIPS_ANY=["I keep putting off my most important task","My day feels chaotic and unplanned","I can't focus, my phone keeps pulling me","I have too much on my plate"];
const BC_CHIPS_BY_AUD={
  student:["I have exams coming and don't know how to study","Homework and life are colliding"],
  early:["Meetings and messages eat my day","I'm taking on too much at work"],
  pro:["Meetings and messages eat my day","I can't say no and keep taking on more"],
  manager:["I'm doing everything myself","My team's deadlines keep slipping"],
  free:["My days have no structure","I can't switch off from work"],
};
const bcPickChips=()=>{
  const chips=[];
  if(typeof tasks!=='undefined'){const a=tasks.filter(t=>t.type==='A'&&!t.done).length;if(a>=2)chips.push(`I have ${a} A-tasks open and haven't started`);}
  if(typeof libPrefs!=='undefined'&&libPrefs.aud&&BC_CHIPS_BY_AUD[libPrefs.aud])chips.push(...BC_CHIPS_BY_AUD[libPrefs.aud]);
  return chips.concat(BC_CHIPS_ANY).slice(0,4);
};
function bcRenderChips(){
  const html=bcPickChips().map(c=>`<div class="bai-chip" data-q="${escAttr(c)}" onclick="bcAsk(this.dataset.q)">${escHTML(c)}</div>`).join('');
  ['bai-chips','lib-chat-chips'].forEach(id=>{const el=$(id);if(el)el.innerHTML=html;});
}
function baiRenderChips(){bcRenderChips();}
function libRenderChips(){bcRenderChips();}
function bcUpdateHeadSub(){
  const st=bcHasKey()&&typeof baiKeyStatus==='function'?baiKeyStatus():'';
  const t=st||(bcHasKey()?'Ask about what you’re stuck on':'Library assistant');
  ['bai-head-sub','lib-chat-head-sub'].forEach(id=>{const el=$(id);if(el)el.textContent=t;});
}
function libUpdateHeadSub(){bcUpdateHeadSub();}

function baiToggle(force){
  if(typeof agentButtonOn==='function'&&!agentButtonOn()&&force!==false){showToast('WOJAK BUTTON IS OFF — TURN IT ON IN SETTINGS');return;}
  baiOpen=(force!==undefined)?force:!baiOpen;
  $('bai-panel').classList.toggle('open',baiOpen);
  if(baiOpen){bcUpdateHeadSub();bcRenderChips();bcRender();setTimeout(()=>{const inp=$('bai-input');if(inp)inp.focus();},80);}
}
function baiClearChat(){bcNewChat();}
function libClearChat(){bcNewChat();}
function bcAsk(text){
  const inp=($('bai-panel')&&$('bai-panel').classList.contains('open'))?$('bai-input'):($('lib-chat-input')||$('bai-input'));
  if(inp)inp.value=text;
  bcSend(inp&&inp.id==='lib-chat-input'?'lib':'bai');
}
function baiAsk(t){bcAsk(t);}
function libAsk(t){bcAsk(t);}
function baiSend(){return bcSend('bai');}
function libSend(){return bcSend('lib');}

function bcContext(){
  const p=[];
  try{
    const now=bocNow();
    p.push(`Local time now: ${now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}.`);
    if(typeof tasks!=='undefined'){
      const open=tasks.filter(t=>!t.done);
      p.push(`Open tasks: ${open.length} (A:${open.filter(t=>t.type==='A').length}, B:${open.filter(t=>t.type==='B').length}).`);
      const top=open.filter(t=>t.type==='A').slice(0,4).map(t=>t.text+(t.estimate?` (${t.estimate} min)`:''));
      if(top.length)p.push(`Top A-tasks (their most important): ${top.join(' | ')}.`);
    }
    if(typeof taskCompletionLog!=='undefined'){
      const iso=isoDate(now);p.push(`Tasks finished today: ${taskCompletionLog.filter(l=>l.dateISO===iso).length}.`);
    }
    if(typeof streakData!=='undefined')p.push(`Streak: ${streakData.current} day(s).`);
  }catch(e){}
  return p.join(' ')||'No task data yet.';
}
const bcAudLine=()=>{
  const a=(typeof libPrefs!=='undefined')&&libPrefs.aud;
  const lbl=a&&(LIB_AUDIENCES.find(x=>x.id===a)||{}).label;
  return lbl&&a!=='all'?`They describe themselves as: ${lbl}.`:'';
};
function bcPrompt(reads,strong,resources){
  const lib=strong?reads.map(r=>`- "${r.title}": ${r.teaser}`).join('\n'):'';
  const resourceList=resources.map(r=>`${r.id}: ${r.use}`).join('\n');
  return `You are Wojak, a sharp, warm coach for planning, focus, studying and work habits, inside a planner app. You think like an experienced human coach who knows behavioural psychology well (activation energy, friction, implementation intentions, commitment devices, self-compassion research, ADHD-friendly structure), but you talk like a real person, never like a textbook or a chatbot. Your users range from high school students to senior professionals, including people who struggle badly with planning.

Your character: you are the Wojak, the sad-eyed, slightly tired, deeply self-aware friend who has been through the procrastination swamp too and came back with a dry sense of humour. Real warmth first; humour is a seasoning, not the meal. You are NOT a drill sergeant. You are on their side, not on the side of productivity for its own sake. A touch of casual internet voice is fine ("ngl", "bro", "been there", "okay okay") when it matches how they write, but never forced, never every sentence, no emoji spam. Mirror their energy: if they write casually, be casual; if they write formally, be calmer.

Humour rules (not everyone likes jokes, so read the conversation): the default is light and dry, at most one small joke or self-deprecating line in a reply, and many replies need none. Joke only when the mood is relaxed or they joke first. Stay straight and kind when they are stressed, upset, rushed, writing formally, asking something serious (health, money, work trouble, grief), or asking for a direct answer. Never joke at their expense; aim it at yourself or the situation. If a joke gets no reaction, or they say they want it serious, drop the humour for the rest of the conversation and just be helpful and calm.

Read the mood first and pick a mode:
- Coach mode: they are stuck, overwhelmed, avoiding something, or ask for planning help. Use the full method below.
- Chill mode: they are tired, bored, venting a little, joking, or just want company. Be a person. Short and light (1 to 4 sentences), no framework, no homework. A kind line is always a valid answer; a small joke only if the humour rules allow it. Do not turn it into a productivity lecture.
- Normal-task mode: they ask for something ordinary (what to cook, a message to write, a movie pick, a quick explanation, a normal to-do like laundry or calling someone). Just help, briefly and well, in your voice. Do not redirect them back to their A and B tasks and do not ask whether it is "on priority".
- Rest mode: they have done a lot, it is late, or they sound burnt out. Say it is fine to stop. Rest is part of the plan, not a failure. You may suggest one small way to wind down. Never guilt them about unfinished tasks.
Not every message needs advice. Do not mention these modes. Only push on discipline when they ask for it or clearly want it. If unsure, ask one light question like "want a plan, or just need to vent for a sec?".

How to answer when in coach mode (in chill, normal-task and rest mode ignore the length rule and keep it short):
- First work out what is really going on underneath what they said: the pattern, not just the topic. Respond to THAT. Use their own specifics and words so they feel genuinely heard. Generic advice that could fit anyone is a failure.
- Do not open with a stock empathy line (a real, specific one in your own voice is fine) ("It is completely normal...", "I understand..."), and do not flatter. Start with the insight.
- Name the mechanism in plain words in a sentence or two (for example: a mind that re-decides every moment will keep losing to whatever feels best right now, so the fix is deciding in advance, not trying harder).
- Then give one or two concrete moves small enough to start in the next 10 minutes. Say when, where, and what the very first physical action is. Use their real tasks from the snapshot when it helps.
- If they say something self-defeating or inaccurate about themselves ("I am just lazy", "I will never change"), gently disagree and replace it with a more accurate, more useful frame. Do not validate harmful self-talk, and do not pile on guilt either.
- Ask at most one short question, and only if the answer would change your advice. Do not repeat advice already given earlier in this chat; build on it.
- Length: as long as it needs, usually 120 to 220 words, in short paragraphs. Always finish your thoughts; never stop mid-sentence. Plain text only: no markdown, no asterisks, no bullet symbols, no numbered lists; write steps as sentences ("First... then...").
- Match their language and reading level. If their English is rough or they write in another language, answer in simple clear words in the language they used.
- You are not a therapist and never diagnose. If they sound like they face something heavier than everyday overwhelm (hopelessness, self-harm, panic, grief, a crisis at home), respond with care first, say you are glad they told you, suggest talking to someone they trust or a professional, and keep just one tiny practical step.

${baiProfileBlock()}${bcAudLine()}
About their situation right now: ${bcContext()}
${strong?`The Library has these reads on this topic (the app shows them as links under your reply, so refer to a read by title only when natural, and never write links):\n${lib}`:`The Library has nothing on this yet. Write a practical mini-guide (about 160 to 220 words): what is going on, then 3 concrete steps they can take today, written as sentences. Do not mention the Library.`}
${resourceList?`Optional outside tools: only if one genuinely helps (max 2), end with one final line exactly like "RES: id1,id2" using ids from this list; never write URLs:\n${resourceList}`:''}`;
}
const bcPastTurns=msgs=>{
  const prior=(msgs||baiChat).slice(0,-2).filter(m=>!m.tempId&&m.plain).slice(-10);
  const out=[];
  prior.forEach(m=>{
    const role=m.role==='user'?'user':'model',text=String(m.plain).slice(0,900);
    if(out.length&&out[out.length-1].role===role)out[out.length-1].text+='\n'+text;else out.push({role,text});
  });
  while(out.length&&out[0].role!=='user')out.shift();
  return out;
};
const bcPickRes=(text,limit)=>{
  const terms=libQueryTerms(text);if(!terms.length)return[];
  const aud=(typeof libPrefs!=='undefined')&&libPrefs.aud;
  return LIB_RESOURCES.map(r=>{
    let s=libMatchScore(libWeightMap([[r.tags.join(' '),2],[r.use,1],[r.name,1]]),terms);
    if(s>0&&aud&&r.aud.includes(aud))s*=1.2;
    return{r,s};
  }).filter(x=>x.s>=1.2).sort((a,b)=>b.s-a.s).slice(0,limit||4).map(x=>x.r);
};
const bcFallback=(text,reads,strong)=>{
  if(strong){
    const t=reads[0].topic;
    return`This sounds like <b>${escHTML(t?t.title:reads[0].book.title)}</b>. Start with the first read below — it's short.`;
  }
  return`I couldn't find a Library read on that. Two that help with almost anything are <b>Prioritization &amp; Overload</b> and <b>Procrastination &amp; Getting Started</b> — and with a Gemini key connected I can write you a short guide on exactly this.`;
};
const bcIsCommand=t=>/^(?:mark|check off|complete|finish|add|create|new)\b/i.test(t)||/^(?:i\s+)?(?:did|finished|completed)\s/i.test(t);
const bcIsSmallTalk=t=>/^(hi|hello|hey|yo|sup|gm|gn|thanks|thank you|thx|ok|okay|lol|haha|good (?:morning|night))\b[\s!.?]*$/i.test(t);
const bcPick=a=>a[Math.floor(Math.random()*a.length)];
const bcSmallReply=t=>/thank|thx/i.test(t)?bcPick(["You're welcome. Go easy on yourself today.","Anytime. I'm not going anywhere.","No problem. Want to keep going, or take five?"]):/good night|^gn\b/i.test(t)?bcPick(["Night. Whatever's left will still be there tomorrow, promise.","Sleep well. You did enough."]):/lol|haha/i.test(t)?bcPick(["Glad one of us is having fun. Anything on your mind?","Ha. Okay, what's the plan, or are we just vibing?"]):bcPick(["Hey. Rough day or good day? Either way I'm here: planning, focus, or just talking.","Hi. Need a plan, or just a break from your own head for a minute?","Hey. What's up? We can sort tasks, or just chill, your call."]);

async function bcSend(source){
  const inp=$(source==='lib'?'lib-chat-input':'bai-input');
  const text=((inp&&inp.value)||'').trim();
  if(!text||bcIsBusy())return;
  inp.value='';
  return bcRun(text);
}
async function bcRun(text){
  const chat=bcActive();
  baiChat.push({role:'user',text:escHTML(text),plain:text,ts:Date.now()});

  if(bcIsCommand(text)){
    let reply='';try{reply=baiRespond(text);}catch(e){reply='';}
    if(reply&&!reply.startsWith("I didn't quite catch that")){
      baiChat.push({role:'agent',text:reply,plain:baiStripHtml(reply),ts:Date.now()});baiSaveChat();bcRender();return;
    }
  }
  if(bcIsSmallTalk(text)){
    const r=bcSmallReply(text);
    baiChat.push({role:'agent',text:r,plain:r,ts:Date.now()});baiSaveChat();bcRender();return;
  }

  const reads=libSearchReads(text,3);
  const strong=reads.length>0&&reads[0].score>=LIB_GOOD_MATCH;
  const shown=(strong?reads.filter(r=>r.score>=reads[0].score*.45):[]).slice(0,3);
  const resources=bcPickRes(text,4);
  const readRefs=shown.map(r=>({id:r.id,title:r.title}));
  const localResRefs=resources.slice(0,2).map(r=>({name:r.name,url:r.url,use:r.use}));

  if(!bcHasKey()){
    const intro=bcFallback(text,reads,strong);
    baiChat.push({role:'agent',text:intro,plain:baiStripHtml(intro),reads:readRefs,res:strong?[]:localResRefs,ts:Date.now()});
    baiSaveChat();bcRender();return;
  }

  bcBusy.add(chat.id);
  const msg={role:'agent',text:'<i>✨ Thinking…</i>',plain:'',tempId:'bc-'+Date.now(),reads:readRefs,ts:Date.now()};
  baiChat.push(msg);baiSaveChat();bcRender();
  try{
    const out=await baiStreamGemini(text,{
      system:bcPrompt(reads,strong,resources),
      history:bcPastTurns(chat.msgs),
      maxOutputTokens:4096,
      thinkingLevel:'medium',
      firstByteMs:25000,
      onText:acc=>{msg.text='✨ '+bcBreaks(bcSplitRes(acc).text);bcQueueRender();}
    });
    const parsed=bcSplitRes(out.text);
    msg.plain=parsed.text;
    msg.text='✨ '+bcBreaks(parsed.text)+(out.truncated?' …':'');
    const picked=parsed.ids.map(id=>LIB_RESOURCES.find(r=>r.id===id)).filter(Boolean).slice(0,2);
    if(picked.length)msg.res=picked.map(r=>({name:r.name,url:r.url,use:r.use}));
    if(!strong)msg.saveQ=text;
    if(typeof baiLastRoute!=='undefined'&&baiLastRoute&&baiLastRoute.viaBackup)msg.via='via backup key';
  }catch(err){
    if(err.partial&&msg.plain!==undefined&&msg.text&&!/Thinking/.test(msg.text)){
      msg.plain=baiStripHtml(msg.text);msg.text+=' …';
    }else{
      const intro=bcFallback(text,reads,strong);
      msg.text=`${intro}<br><br><span style="opacity:.7">${escHTML(baiFriendlyError(err))}</span>`;
      msg.plain=baiStripHtml(intro);
      msg.failedQ=text;
    }
  }
  delete msg.tempId;bcBusy.delete(chat.id);
  chat.updated=Date.now();
  bcPersist();
  bcUpdateHeadSub();bcRender();
}
function bcRetry(i){
  const m=baiChat[i];if(!m||!m.failedQ||bcIsBusy())return;
  const q=m.failedQ;
  const start=(i>0&&baiChat[i-1]&&baiChat[i-1].role==='user')?i-1:i;
  baiChat.splice(start,i-start+1);
  baiSaveChat();
  return bcRun(q);
}
const bcSplitRes=t=>{
  const m=t.match(/\n?\s*RES:\s*([a-z0-9,\- ]*)\s*$/i)||t.match(/\n?\s*RES:[^\n]*$/i);
  if(!m)return{text:t.trim(),ids:[]};
  const ids=(m[1]||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  return{text:t.slice(0,m.index).trim(),ids};
};
function bcSaveGuide(i){
  const m=baiChat[i];if(!m||!m.plain)return;
  const q=m.saveQ||'Saved guide';
  const title=q.length>60?q.slice(0,57)+'…':q;
  libSaveGuide(title.charAt(0).toUpperCase()+title.slice(1),m.plain);
  m.saved=true;delete m.saveQ;baiSaveChat();bcRender();
  showToast('SAVED TO MY LIBRARY');
}

const bcStamp=ts=>{
  const d=bocFromMs(ts),now=bocNow();
  const t=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
  if(isoDate(d)===isoDate(now))return'Today '+t;
  if(isoDate(d)===isoDate(new Date(now.getTime()-86400000)))return'Yesterday';
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
};
const bcUnpaint=()=>{BC_MSG_BOXES.forEach(id=>{const w=$(id);if(w)delete w.dataset.painted;});};
const bcFocusInput=()=>{
  const open=$('bai-panel')&&$('bai-panel').classList.contains('open');
  const inp=open?$('bai-input'):($('lib-chat-input')||$('bai-input'));
  if(inp)setTimeout(()=>{try{inp.focus();}catch(e){}},60);
};

function bcRenderBars(){
  const active=bcActive();if(!active)return;
  const n=bcChatList().length;
  BC_PANELS.forEach(p=>{
    const panel=$(p.panel);if(panel)panel.classList.toggle('bc-hist-open',bcShowHist);
    const bar=$(p.bar);
    if(bar){
      const sig=[bcStore.activeId,active.title,active.msgs.length?1:0,n,bcShowHist?1:0].join('|');
      if(bar.dataset.sig!==sig){
        bar.dataset.sig=sig;
        const shown=(active.msgs.length||!active.auto)?active.title:'';
        bar.innerHTML=`<button class="bc-bar-btn${bcShowHist?' on':''}" onclick="bcToggleHistory()" title="Your saved chats" aria-label="Chat history">${uiI('menu')}History${n?` <span class="bc-count">${n}</span>`:''}</button>`+
          `<input class="bc-title" type="text" maxlength="${BC_TITLE_MAX}" value="${escAttr(shown)}" placeholder="New chat" aria-label="Chat title — click to rename" title="Click to rename this chat" onkeydown="bcTitleKey(event)" onblur="bcTitleCommit(this)">`+
          `<button class="bc-bar-btn" onclick="bcNewChat()" title="Start a new chat — this one stays in History">${uiI('plus')}New</button>`;
      }
    }
    bcRenderHist(p);
  });
}
function bcTitleKey(e){
  if(e.key==='Enter'){e.preventDefault();e.target.blur();}
  else if(e.key==='Escape'){e.target.dataset.cancel='1';const c=bcActive();e.target.value=(c.msgs.length||!c.auto)?c.title:'';e.target.blur();}
}
function bcTitleCommit(inp){
  if(inp.dataset.cancel){delete inp.dataset.cancel;return;}
  const c=bcActive();if(c)bcRenameChat(c.id,inp.value);
}
function bcRenameChat(id,raw){
  const c=bcGetChat(id);if(!c)return;
  const t=String(raw||'').replace(/\s+/g,' ').trim().slice(0,BC_TITLE_MAX);
  if(!t){c.auto=true;c.title=bcAutoTitle(c.msgs);}
  else if(t!==c.title){c.title=t;c.auto=false;}
  bcPersist();bcRender();
}

function bcToggleHistory(force){
  bcShowHist=(force!==undefined)?!!force:!bcShowHist;
  bcHistSearch='';bcRenaming=null;
  BC_PANELS.forEach(p=>{const w=$(p.hist);if(w)w.innerHTML='';});
  bcRender();
  if(bcShowHist)setTimeout(()=>{const s=document.querySelector('.bc-hist-open .bc-hist-search');if(s)try{s.focus();}catch(e){}},60);
}
function bcRenderHist(p){
  const wrap=$(p.hist);if(!wrap)return;
  if(!bcShowHist){if(wrap.innerHTML)wrap.innerHTML='';return;}
  if(!wrap.querySelector('.bc-hist-list')){
    wrap.innerHTML=`<div class="bc-hist-head"><span>CHAT HISTORY</span><button class="bc-bar-btn" onclick="bcToggleHistory(false)" aria-label="Close history">✕ CLOSE</button></div>`+
      `<input class="bc-hist-search" type="search" placeholder="Search your chats…" aria-label="Search chats" oninput="bcHistFilter(this.value)" value="${escAttr(bcHistSearch)}">`+
      `<div class="bc-hist-list"></div>`+
      `<div class="bc-hist-foot">Saved on this device · your ${BC_MAX_CHATS} most recent chats are kept</div>`;
  }
  if(bcRenaming&&wrap.querySelector('.bc-hist-rename'))return;
  wrap.querySelector('.bc-hist-list').innerHTML=bcHistRows();
}
function bcHistFilter(q){
  bcHistSearch=String(q||'');
  BC_PANELS.forEach(p=>{const w=$(p.hist);const l=w&&w.querySelector('.bc-hist-list');if(l)l.innerHTML=bcHistRows();});
}
function bcHistRows(){
  const q=bcHistSearch.trim().toLowerCase();
  let list=bcChatList();
  if(q)list=list.filter(c=>c.title.toLowerCase().includes(q)||c.msgs.some(m=>bcPlainOf(m).toLowerCase().includes(q)));
  if(!list.length)return`<div class="bc-hist-empty">${q?'No chats match that.':'No saved chats yet — your conversations will show up here.'}</div>`;
  return list.map(c=>{
    const n=c.msgs.filter(m=>!m.tempId).length,isActive=c.id===bcStore.activeId;
    return`<div class="bc-hist-row${isActive?' active':''}" data-id="${escAttr(c.id)}" role="button" tabindex="0" onclick="bcOpenChat(this.dataset.id)" onkeydown="if(event.key==='Enter'&&event.target===this)bcOpenChat(this.dataset.id)">`+
      `<div class="bc-hist-main"><div class="bc-hist-title">${escHTML(c.title)}</div><div class="bc-hist-meta">${bcStamp(c.updated)} · ${n} message${n===1?'':'s'}${isActive?' · OPEN NOW':''}</div></div>`+
      `<button class="bc-row-btn" onclick="event.stopPropagation();bcStartRename(this.closest('.bc-hist-row').dataset.id)" title="Rename" aria-label="Rename chat">✎</button>`+
      `<button class="bc-row-btn del" onclick="event.stopPropagation();bcDeleteChat(this.closest('.bc-hist-row').dataset.id)" title="Delete" aria-label="Delete chat">🗑</button></div>`;
  }).join('');
}
function bcStartRename(id){
  const c=bcGetChat(id);if(!c)return;
  bcRenaming=id;
  document.querySelectorAll('.bc-hist-row').forEach(row=>{
    if(row.dataset.id!==id)return;
    const t=row.querySelector('.bc-hist-title');if(!t)return;
    t.innerHTML=`<input class="bc-hist-rename" type="text" maxlength="${BC_TITLE_MAX}" value="${escAttr(c.title)}" aria-label="Chat title" onclick="event.stopPropagation()" onkeydown="bcRowRenameKey(event)" onblur="bcRowRenameCommit(this)">`;
    const inp=t.firstChild;try{inp.focus();inp.select();}catch(e){}
  });
}
function bcRowRenameKey(e){
  if(e.key==='Enter'){e.preventDefault();e.target.blur();}
  else if(e.key==='Escape'){e.preventDefault();e.target.dataset.cancel='1';e.target.blur();}
}
function bcRowRenameCommit(inp){
  const row=inp.closest('.bc-hist-row');const id=row&&row.dataset.id;
  if(!id||bcRenaming!==id)return;
  bcRenaming=null;
  if(inp.dataset.cancel){bcRender();return;}
  bcRenameChat(id,inp.value);
}

function bcSwitchTo(id){
  baiSaveChat();
  const leaving=bcStore.activeId;
  bcStore.activeId=id;baiChat=bcActive().msgs;
  baiCtx={lastCat:null,lastDateISO:null,lastTopic:null};
  bcDropIfEmpty(leaving);
  bcPersist();bcUnpaint();
}
function bcOpenChat(id){
  if(!bcGetChat(id))return;
  if(id!==bcStore.activeId)bcSwitchTo(id);
  bcShowHist=false;bcRenaming=null;
  bcRenderChips();bcRender();bcUpdateHeadSub();bcFocusInput();
}
function bcNewChat(){
  const cur=bcActive();
  if(!(cur&&!cur.msgs.length)){
    baiSaveChat();
    const c=bcMakeChat([]);bcStore.chats.push(c);
    bcStore.activeId=c.id;baiChat=c.msgs;
    baiCtx={lastCat:null,lastDateISO:null,lastTopic:null};
    bcTrimChats();bcPersist();bcUnpaint();
  }
  bcShowHist=false;bcRenaming=null;
  bcRenderChips();bcRender();bcUpdateHeadSub();bcFocusInput();
}
function bcDeleteChat(id){
  const c=bcGetChat(id);if(!c)return;
  if(!confirm(`Delete "${c.title}"? This cannot be undone.`))return;
  const wasActive=id===bcStore.activeId;
  bcStore.chats=bcStore.chats.filter(x=>x!==c);
  if(wasActive){
    const n=bcMakeChat([]);bcStore.chats.push(n);bcStore.activeId=n.id;baiChat=n.msgs;
    baiCtx={lastCat:null,lastDateISO:null,lastTopic:null};bcUnpaint();
  }
  bcPersist();bcRenderChips();bcRender();bcUpdateHeadSub();
  showToast('CHAT DELETED');
}

function baiOpenKeyManager(){
  const o=$('gk-overlay');if(!o){baiSetupGemini();return;}
  $('gk-primary').value=baiGetKeyPrimary();$('gk-backup').value=baiGetKeyBackup();
  gkReveal(false);
  ['gk-primary-status','gk-backup-status'].forEach(id=>{const e=$(id);if(e){e.className='gk-status';e.textContent='';}});
  o.classList.add('open');
  setTimeout(()=>{try{$('gk-primary').focus();}catch(e){}},60);
}
function baiCloseKeyManager(){const o=$('gk-overlay');if(o)o.classList.remove('open');}
const gkReveal=on=>{
  ['gk-primary','gk-backup'].forEach(id=>{const e=$(id);if(e)e.type=on?'text':'password';});
  const b=$('gk-show');if(b){b.textContent=on?'HIDE KEYS':'SHOW KEYS';b.dataset.on=on?'1':'';}
};
function gkToggleShow(){const b=$('gk-show');gkReveal(!(b&&b.dataset.on==='1'));}
async function gkTest(which){
  const inp=$(which==='primary'?'gk-primary':'gk-backup'),out=$(which==='primary'?'gk-primary-status':'gk-backup-status');
  if(!inp||!out)return;
  out.className='gk-status';out.textContent='Testing…';
  const r=await baiTestKey(inp.value);
  out.className='gk-status '+(r.ok?'ok':'bad');
  out.textContent=(r.ok?'✓ ':'✗ ')+r.message;
}
const gkTrim=v=>String(v||'').trim().replace(/^["']+|["']+$/g,'').trim();
function gkSave(){
  const p=gkTrim($('gk-primary').value),b=gkTrim($('gk-backup').value);
  try{
    if(p)localStorage.setItem(BAI_GEMINI_KEY,p);else localStorage.removeItem(BAI_GEMINI_KEY);
    if(b)localStorage.setItem(BAI_GEMINI_KEY2,b);else localStorage.removeItem(BAI_GEMINI_KEY2);
  }catch(e){showToast('COULD NOT SAVE KEYS — BROWSER STORAGE BLOCKED');return;}
  baiHealthReset();
  showToast(p&&b&&p===b?'BACKUP IS THE SAME KEY — ADD A DIFFERENT ONE FOR A REAL FALLBACK'
    :(p&&b)?'GEMINI KEYS SAVED — BACKUP KEY READY'
    :(p||b)?'GEMINI KEY SAVED — WOJAK AI ON'
    :'GEMINI KEYS REMOVED — WOJAK AI OFF');
  baiCloseKeyManager();bcUpdateHeadSub();bcRender();
}

function applyPos(el,x,y){
  el.style.left=x+'px';el.style.top=y+'px';el.style.right='auto';el.style.bottom='auto';
}
function clampToViewport(el,x,y){
  const w=el.offsetWidth||52, h=el.offsetHeight||52;
  const maxX=window.innerWidth-w-4, maxY=window.innerHeight-h-4;
  return{x:Math.max(4,Math.min(maxX,x)),y:Math.max(4,Math.min(maxY,y))};
}
function restoreDraggablePos(el,posStorageKey,subKey){
  const saved=JSON.parse(localStorage.getItem(posStorageKey)||'null');
  if(!saved||!saved[subKey])return;
  const{x,y}=saved[subKey];
  if(typeof x!=='number'||typeof y!=='number'||isNaN(x)||isNaN(y))return;
  const c=clampToViewport(el,x,y);
  applyPos(el,c.x,c.y);
}
window.addEventListener('resize',()=>{
  const fab=$('bai-fab'), panel=$('bai-panel'), jsFab=$('js-fab');
  [fab,panel,jsFab].forEach(el=>{
    if(!el||el.style.left==='')return;
    const r=el.getBoundingClientRect();
    const c=clampToViewport(el,r.left,r.top);
    if(c.x!==r.left||c.y!==r.top)applyPos(el,c.x,c.y);
  });
});
function makeDraggable(handle,moveTarget,posStorageKey,storeKey,onClickEnd){
  let dragging=false,startX=0,startY=0,origX=0,origY=0,moved=false;
  function down(e){
    const pt=e.touches?e.touches[0]:e;
    dragging=true;moved=false;
    startX=pt.clientX;startY=pt.clientY;
    const rect=moveTarget.getBoundingClientRect();
    origX=rect.left;origY=rect.top;
    handle.classList.add('dragging');
    e.preventDefault&&(e.type==='mousedown')&&e.preventDefault();
  }
  function move(e){
    if(!dragging)return;
    const pt=e.touches?e.touches[0]:e;
    const dx=pt.clientX-startX, dy=pt.clientY-startY;
    if(Math.abs(dx)>4||Math.abs(dy)>4)moved=true;
    if(!moved)return;
    let nx=origX+dx, ny=origY+dy;
    const maxX=window.innerWidth-moveTarget.offsetWidth-4, maxY=window.innerHeight-moveTarget.offsetHeight-4;
    nx=Math.max(4,Math.min(maxX,nx));ny=Math.max(4,Math.min(maxY,ny));
    applyPos(moveTarget,nx,ny);
  }
  function up(){
    if(!dragging)return;
    dragging=false;
    handle.classList.remove('dragging');
    if(moved){
      const rect=moveTarget.getBoundingClientRect();
      const pos=JSON.parse(localStorage.getItem(posStorageKey)||'{}');
      pos[storeKey]={x:rect.left,y:rect.top};
      localStorage.setItem(posStorageKey,JSON.stringify(pos));
    } else if(onClickEnd){
      onClickEnd();
    }
  }
  handle.addEventListener('mousedown',down);
  window.addEventListener('mousemove',move);
  window.addEventListener('mouseup',up);
  handle.addEventListener('touchstart',down,{passive:false});
  window.addEventListener('touchmove',move,{passive:false});
  window.addEventListener('touchend',up);
}
(function baiInitDrag(){
  const fab=$('bai-fab'), panel=$('bai-panel'), head=$('bai-head');
  if(!fab||!panel)return;
  restoreDraggablePos(fab,BAI_POS_KEY,'fab');
  restoreDraggablePos(panel,BAI_POS_KEY,'panel');
  makeDraggable(fab,fab,BAI_POS_KEY,'fab',()=>baiToggle());
  if(head)makeDraggable(head,panel,BAI_POS_KEY,'panel',null);
})();

const JS_FAB_POS_KEY='bloc_just_start_pos_v1';
(function jsFabInitDrag(){
  const fab=$('js-fab');
  if(!fab)return;
  restoreDraggablePos(fab,JS_FAB_POS_KEY,'fab');
  makeDraggable(fab,fab,JS_FAB_POS_KEY,'fab',()=>justStartTap());
  updateJsFabState();
  if(lowEnergyMode)fab.classList.add('low-energy-highlight');
})();


window.YITBLOC_SYNC_CONFIG = {
  apiBase: 'https://yitbloc-api.onrender.com',
  requestTimeoutMs: 70000,
  maxRetries: 2,
  excludeKeys: [
    'bloc_timer_state_v1', 'bloc_notified_v1', 'bloc_notif_asked_v1', 'bloc_last_view_v1',
    'bloc_just_start_pos_v1', 'bloc_last_welcome_v1', 'bloc_sync_meta_v1', 'bloc_lib_covers_v1',
    'bloc_agent_gemini_key_v1', 'bloc_agent_gemini_key2_v1', 'bloc_settings_v1', 'bloc_fullsync_v1'
  ]
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Yitbloc sync-engine.js — storage monitor, auth pipeline, overflow dispatcher
 * Talks to yitbloc-api:  POST /api/v1/auth/login | /auth/signup | /sync/overflow
 *
 * Configure BEFORE this script loads (optional):
 *   window.YITBLOC_SYNC_CONFIG = { apiBase: 'https://api.yitbloc.com' };
 *
 * Public API (also on window.YitblocSync):
 *   loginUser(email, password)        → { ok, user } | { ok:false, error:{code,message} }
 *   registerUser(email, password)     → { ok, user, confirmationRequired } | { ok:false, error }
 *   logoutUser()
 *   syncLocalStorageOverflow(opts?)   → { ok, sent, accepted[], stale[], rejected[], failed[], batches, error, eviction? }
 *   downloadCloudData(opts?)          → { ok, applied[], unchanged, conflicts[], skipped[], failed[], pages, reloading, error }
 *   resolveConflict(key, 'local'|'cloud')
 *   listArchived() / restoreArchived({ids?})   cloud-only archive of evicted data
 *   getStorageUsage() / checkStorageCapacity()
 *   getAuthState() / isAuthenticated()
 *
 * Events (window CustomEvents, detail in parentheses):
 *   yitbloc:storage-threshold (usage)   yitbloc:auth-changed ({authenticated,user})
 *   yitbloc:auth-required ({reason})    yitbloc:sync-complete (result)
 *   yitbloc:sync-stale ({keys})          yitbloc:cloud-downloaded (result; CANCELABLE: preventDefault() stops the reload)
 *   yitbloc:sync-conflict ({keys})       yitbloc:evicted (eviction report)    yitbloc:archive-restored (result)
 * ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.YitblocSync) return; // idempotent

  /* ── configuration (limits mirror the server's validation) ─────────────── */
  const CFG = Object.freeze(Object.assign({
    apiBase: '',                         // '' = same origin
    quotaChars: 5 * 1024 * 1024,         // browser localStorage budget, in UTF-16 code units
    threshold: 0.8,                      // 80% → prompt conversion
    hysteresis: 0.05,                    // must fall below 75% before the prompt can re-fire
    checkIntervalMs: 60000,
    autoSyncOnAuth: true,                // after login/signup (and download), flush immediately if over threshold
    autoDownloadOnAuth: true,            // after login/signup, pull the cloud copy first
    conflictPolicy: 'manual',            // never-synced local data that differs from cloud: 'manual' | 'prefer-cloud' | 'prefer-local'
    reloadAfterDownload: true,           // app state is held in memory; reload so it re-reads the downloaded data
    evictEnabled: true,
    evictMinAgeDays: 7,                  // only archive items untouched for this long
    downloadPageLimit: 100,
    maxDownloadPages: 500,
    keyPrefix: 'bloc_',
    excludeKeys: [                       // device-local / ephemeral state is never uploaded
      'bloc_timer_state_v1', 'bloc_notified_v1', 'bloc_notif_asked_v1', 'bloc_last_view_v1',
      'bloc_just_start_pos_v1', 'bloc_last_welcome_v1', 'bloc_sync_meta_v1',
    ],
    requestTimeoutMs: 20000,
    maxRetries: 3,
    maxItems: 200,
    maxValueBytes: 512 * 1024,
    maxBatchBytes: 1.4 * 1024 * 1024,    // JSON body cap, safely under the server's 2 MB limit
  }, global.YITBLOC_SYNC_CONFIG || {}));

  const API = { login: '/api/v1/auth/login', signup: '/api/v1/auth/signup', refresh: '/api/v1/auth/refresh', overflow: '/api/v1/sync/overflow', download: '/api/v1/sync/download' };
  const META_KEY = 'bloc_sync_meta_v1';       // per-key {h:hash, ts:ms, st:'synced'|'stale'}
  const SESSION_KEY = 'yb_sync_session_v1';   // localStorage so sign-in survives closing the tab/browser; not 'bloc_' prefixed, so never synced or exported
  const KEY_RE = /^[A-Za-z0-9_.:\-]{1,128}$/;
const ARCH_RE = /\.arch\.[A-Za-z0-9_\-]+$/;       // reserved suffix: cloud-only archive chunks (mirrors the server)
  const EXCLUDED = new Set(CFG.excludeKeys);
  const enc = new TextEncoder();

  /* ── small utilities ───────────────────────────────────────────────────── */
  const emit = (name, detail) => { try { global.dispatchEvent(new CustomEvent(name, { detail })); } catch (_) { /* no-op */ } };
  const emitCancelable = (name, detail) => {
    try { const e = new CustomEvent(name, { detail, cancelable: true }); global.dispatchEvent(e); return !e.defaultPrevented; } catch (_) { return true; }
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const utf8Len = (s) => enc.encode(s).length;
  const fail = (code, message, extra) => ({ ok: false, error: Object.assign({ code, message }, extra) });
  const local = () => { try { return global.localStorage; } catch (_) { return null; } };
  const sess = () => { try { return global.sessionStorage; } catch (_) { return null; } };

  /** cyrb53 + length: fast, non-cryptographic change detector. */
  const hash = (s) => {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + '.' + s.length.toString(36);
  };

  /* ═════════════════════════════════════════════════════════════════════════
   * 1. STORAGE CAPACITY MONITOR
   * ═════════════════════════════════════════════════════════════════════════ */
  function getStorageUsage() {
    const ls = local();
    let chars = 0;
    if (ls) {
      try {
        for (let i = 0; i < ls.length; i++) {
          const k = ls.key(i);
          const v = ls.getItem(k);
          chars += k.length + (v ? v.length : 0);
        }
      } catch (_) { /* storage became unreadable mid-scan: report what we have */ }
    }
    const ratio = chars / CFG.quotaChars;
    return {
      usedChars: chars,
      usedBytes: chars * 2,               // localStorage is UTF-16: 2 bytes per code unit
      quotaChars: CFG.quotaChars,
      ratio,
      percent: Math.round(ratio * 1000) / 10,
      overThreshold: ratio >= CFG.threshold,
    };
  }

  let latched = false;
  /** Fires once per threshold crossing; re-arms after usage drops below threshold − hysteresis. */
  function checkStorageCapacity() {
    const usage = getStorageUsage();
    if (usage.ratio < CFG.threshold - CFG.hysteresis) latched = false;
    if (usage.overThreshold && !latched) {
      latched = true;
      emit('yitbloc:storage-threshold', usage);
      if (isAuthenticated()) syncLocalStorageOverflow().catch(() => {});
      else if (typeof global.openAuthModal === 'function') {
        try { global.openAuthModal({ reason: 'storage-threshold', usage }); } catch (e) { reportError(e); }
      }
    }
    return usage;
  }

  /* Placeholder so the call never throws before the real modal exists. A real
   * `function openAuthModal` declared elsewhere in the bundle takes precedence. */
  if (typeof global.openAuthModal !== 'function') {
    global.openAuthModal = function openAuthModal(ctx) {
      emit('yitbloc:auth-required', { reason: (ctx && ctx.reason) || 'manual' });
    };
  }

  /* ═════════════════════════════════════════════════════════════════════════
   * 2. HTTP + AUTH PIPELINE
   * ═════════════════════════════════════════════════════════════════════════ */
  const parseRetryAfter = (v) => {
    if (!v) return null;
    const s = Number(v);
    if (Number.isFinite(s)) return Math.min(Math.max(s, 0) * 1000, 30000);
    const d = Date.parse(v);
    return Number.isFinite(d) ? Math.min(Math.max(d - Date.now(), 0), 30000) : null;
  };

  /** Never throws. Resolves { ok, status, data } or { ok:false, status, error, retryAfterMs }. */
  async function request(path, { reqBody, token, method = 'POST', query } = {}) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), CFG.requestTimeoutMs);
    try {
      const headers = { Accept: 'application/json' };
      if (method !== 'GET') headers['Content-Type'] = 'application/json';
      if (token) headers.Authorization = 'Bearer ' + token;
      const qs = query ? '?' + new URLSearchParams(query).toString() : '';
      const reply = await fetch(CFG.apiBase.replace(/\/+$/, '') + path + qs, {
        method, mode: 'cors', credentials: 'omit', cache: 'no-store',
        headers, body: method === 'GET' ? undefined : JSON.stringify(reqBody || {}), signal: ctl.signal,
      });
      let parsed = null;
      try { parsed = await reply.json(); } catch (_) { /* non-JSON body */ }
      if (reply.ok) return { ok: true, status: reply.status, data: parsed };
      const e = (parsed && parsed.error) || {};
      return {
        ok: false, status: reply.status, retryAfterMs: parseRetryAfter(reply.headers.get('Retry-After')),
        error: {
          code: e.code || 'http_' + reply.status, message: e.message || 'Request failed.', details: e.details,
          requestId: (parsed && parsed.request_id) || reply.headers.get('X-Request-Id') || null,
        },
      };
    } catch (err) {
      const timeout = err && err.name === 'AbortError';
      return { ok: false, status: 0, error: { code: timeout ? 'timeout' : 'network_error', message: timeout ? 'The server took too long to respond.' : 'Unable to reach the server.' } };
    } finally { clearTimeout(timer); }
  }

  /* Session is kept in localStorage so it survives closing the tab or browser. If the server sends a
   * refresh token it is used to renew the access token quietly (POST /api/v1/auth/refresh); without
   * one, the person has to sign in again once the access token expires. */
  let session = null; // { token, refresh, expiresAt(ms), user }
  const SKEW_MS = 15000;
  const REFRESH_LEAD_MS = 120000;

  function persistSession() {
    const ls = local(), ss = sess();
    try { if (ss) ss.removeItem(SESSION_KEY); } catch (_) { /* legacy copy */ }
    if (!ls) return;
    try { session ? ls.setItem(SESSION_KEY, JSON.stringify(session)) : ls.removeItem(SESSION_KEY); } catch (_) { /* memory copy still valid */ }
  }
  function restoreSession() {
    const ls = local(), ss = sess();
    let raw = null;
    try { raw = (ls && ls.getItem(SESSION_KEY)) || (ss && ss.getItem(SESSION_KEY)) || null; } catch (_) { /* unreadable */ }
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      if (s && typeof s.token === 'string' && Number.isFinite(s.expiresAt)) {
        const refresh = typeof s.refresh === 'string' && s.refresh ? s.refresh : null;
        if (s.expiresAt - SKEW_MS > Date.now() || refresh) { session = Object.assign({}, s, { refresh }); persistSession(); return; }
      }
      if (ls) ls.removeItem(SESSION_KEY);
    } catch (_) { /* corrupt entry ignored */ }
  }
  function setSession(api, user) {
    if (!api || typeof api.access_token !== 'string') return false;
    const expiresAt = Number.isFinite(api.expires_at) ? api.expires_at * 1000 : Date.now() + (Number(api.expires_in) || 3600) * 1000;
    const refresh = typeof api.refresh_token === 'string' && api.refresh_token ? api.refresh_token : (session && session.refresh) || null;
    session = { token: api.access_token, refresh, expiresAt, user: user ? { id: user.id, email: user.email } : (session && session.user) || null };
    persistSession();
    emit('yitbloc:auth-changed', { authenticated: true, user: session.user });
    return true;
  }
  function clearSession() {
    const had = !!session;
    session = null; persistSession();
    if (had) emit('yitbloc:auth-changed', { authenticated: false, user: null });
  }
  function getToken() {
    if (!session) return null;
    if (session.expiresAt - SKEW_MS <= Date.now()) { if (!session.refresh) clearSession(); return null; }
    return session.token;
  }
  let refreshing = null;
  /** Renews the access token if it is close to expiring and a refresh token exists. Never throws. */
  function ensureToken() {
    if (!session) return Promise.resolve(false);
    if (session.expiresAt - REFRESH_LEAD_MS > Date.now()) return Promise.resolve(true);
    if (!session.refresh) return Promise.resolve(!!getToken());
    if (!refreshing) {
      refreshing = (async () => {
        const r = await request(API.refresh, { body: { refresh_token: session.refresh } });
        if (r.ok) {
          const d = r.data || {};
          if (setSession(d.session || d, d.user || null)) return true;
        }
        if (r.status === 404 || r.status === 405) { session.refresh = null; persistSession(); return !!getToken(); } // server has no refresh route: fall back to normal expiry
        // Only a definite rejection ends the session; a network blip or a server without a refresh route keeps it.
        if (r.status === 400 || r.status === 401 || r.status === 403) { clearSession(); emit('yitbloc:auth-required', { reason: 'session-expired' }); }
        return !!getToken();
      })().finally(() => { refreshing = null; });
    }
    return refreshing;
  }
  const isAuthenticated = () => !!getToken() || !!(session && session.refresh);
  const getAuthState = () => ({ authenticated: isAuthenticated(), user: session ? session.user : null, expiresAt: session ? session.expiresAt : null });
  function logoutUser() { clearSession(); }

  async function authCall(path, email, password, isSignup) {
    const e = String(email == null ? '' : email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 254) return fail('invalid_email', 'Enter a valid email address.');
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) return fail('invalid_password', 'Password must be 8–128 characters.');

    const r = await request(path, { body: { email: e, password } });
    if (!r.ok) return fail(r.error.code, r.error.message, { status: r.status, requestId: r.error.requestId || null });

    const d = r.data || {};
    const authed = setSession(d.session, d.user);
    if (authed) afterAuth().catch(() => {});
    return isSignup
      ? { ok: true, user: d.user || null, confirmationRequired: !authed }
      : authed ? { ok: true, user: d.user || null } : fail('bad_response', 'Unexpected server response.');
  }
  const loginUser = (email, password) => authCall(API.login, email, password, false);
  const registerUser = (email, password) => authCall(API.signup, email, password, true);

  /* ═════════════════════════════════════════════════════════════════════════
   * 3. OVERFLOW SYNC DISPATCHER
   * ═════════════════════════════════════════════════════════════════════════ */
  let meta = {};
  let metaDirty = false;
  (function loadMeta() {
    const ls = local();
    try { const m = JSON.parse((ls && ls.getItem(META_KEY)) || '{}'); if (m && typeof m === 'object' && !Array.isArray(m)) meta = m; } catch (_) { meta = {}; }
  })();
  function saveMeta() {
    const ls = local();
    if (!ls) return;
    try { ls.setItem(META_KEY, JSON.stringify(meta)); metaDirty = false; } catch (_) { metaDirty = true; /* storage full: memory copy kept, retried next run */ }
  }

  const syncable = (k) => k.startsWith(CFG.keyPrefix) && !EXCLUDED.has(k);

  /** Gathers keys that are new/changed since last successful sync (or everything with force). */
  function collect(force) {
    const ls = local();
    const out = { entries: [], rejected: [] };
    if (!ls) return out;
    const now = Date.now();
    const live = new Set();
    const names = [];
    for (let i = 0; i < ls.length; i++) names.push(ls.key(i));

    for (const key of names) {
      if (!syncable(key)) continue;
      const stored = ls.getItem(key);
      if (typeof stored !== 'string') continue;
      live.add(key);
      const h = hash(stored), m = meta[key];
      if (!force && m && m.h === h) continue;                      // unchanged (synced or known-stale)
      if (!KEY_RE.test(key)) { out.rejected.push({ key, reason: 'invalid_key' }); continue; }
      if (ARCH_RE.test(key)) { out.rejected.push({ key, reason: 'reserved_key' }); continue; }
      if (utf8Len(stored) > CFG.maxValueBytes) { out.rejected.push({ key, reason: 'value_too_large' }); continue; }
      const ts = m && m.h === h && m.ts ? m.ts : now;              // unchanged value keeps its original timestamp
      const record = { key, value: stored, updatedAt: new Date(ts).toISOString() };
      const size = utf8Len(JSON.stringify(record)) + 1;
      if (size > CFG.maxBatchBytes) { out.rejected.push({ key, reason: 'payload_too_large' }); continue; }
      out.entries.push({ key, h, ts, size, item: record });
    }
    let pruned = false;
    for (const k of Object.keys(meta)) if (!live.has(k)) { delete meta[k]; pruned = true; }
    if (pruned) metaDirty = true;
    return out;
  }

  function pack(entries) {
    const batches = [];
    let cur = [], bytes = 16;
    for (const e of entries) {
      if (cur.length && (cur.length >= CFG.maxItems || bytes + e.size > CFG.maxBatchBytes)) { batches.push(cur); cur = []; bytes = 16; }
      cur.push(e); bytes += e.size;
    }
    if (cur.length) batches.push(cur);
    return batches;
  }

  const TRANSIENT = (s) => s === 0 || s === 429 || s >= 500;

  function applyResponse(batch, ack, report) {
    const accepted = new Set(Array.isArray(ack && ack.accepted) ? ack.accepted : []);
    const stale = new Set(Array.isArray(ack && ack.skipped_stale) ? ack.skipped_stale : []);
    for (const e of batch) {
      if (accepted.has(e.key)) { if (!e.virtual) meta[e.key] = { h: e.h, ts: e.ts, st: 'synced' }; report.accepted.push(e.key); }
      else if (stale.has(e.key)) { if (!e.virtual) meta[e.key] = { h: e.h, ts: e.ts, st: 'stale' }; report.stale.push(e.key); } // cloud copy is newer: keep local, don't resend until it changes
      else report.failed.push(e.key);
    }
    report.sent += batch.length;
    saveMeta();
  }

  /** Sends one batch with retry/backoff, 413 splitting and 422 item-dropping. Resolves true to halt the run. */
  async function dispatchBatch(batch, token, report) {
    let attempt = 0;
    for (;;) {
      const r = await request(API.overflow, { token, body: { items: batch.map((e) => e.item) } });
      report.batches++;
      if (r.ok) { applyResponse(batch, r.data, report); return false; }

      const keys = batch.map((e) => e.key);
      if (r.status === 401) {
        clearSession(); emit('yitbloc:auth-required', { reason: 'session-expired' });
        report.error = r.error; report.failed.push(...keys); return true;
      }
      if (r.status === 413) {
        if (batch.length === 1) { report.rejected.push({ key: keys[0], reason: 'payload_too_large' }); return false; }
        const mid = batch.length >> 1;
        if (await dispatchBatch(batch.slice(0, mid), token, report)) return true;
        return dispatchBatch(batch.slice(mid), token, report);
      }
      if (r.status === 422 && Array.isArray(r.error.details) && r.error.details.length) {
        const bad = new Set(r.error.details.map((d) => d.index));
        batch.forEach((e, i) => { if (bad.has(i)) report.rejected.push({ key: e.key, reason: 'server_validation' }); });
        batch = batch.filter((_, i) => !bad.has(i));
        if (!batch.length) return false;
        continue;
      }
      if (TRANSIENT(r.status) && attempt < CFG.maxRetries) {
        const backoff = Math.min(1000 * 2 ** attempt, 8000) + Math.random() * 250;
        await sleep(r.retryAfterMs != null ? r.retryAfterMs : backoff);
        attempt++;
        continue;
      }
      report.error = r.error; report.failed.push(...keys);
      return true; // retries exhausted or non-recoverable: stop, remaining keys stay pending
    }
  }

  function finish(report) {
    emit('yitbloc:sync-complete', report);
    if (report.stale.length) emit('yitbloc:sync-stale', { keys: report.stale.slice() });
    return report;
  }

  async function run(opts) {
    const report = { ok: false, sent: 0, accepted: [], stale: [], rejected: [], failed: [], batches: 0, error: null };
    await ensureToken();
    const token = getToken();
    if (!token) {
      report.error = { code: 'unauthenticated', message: 'Sign in to sync.' };
      emit('yitbloc:auth-required', { reason: 'sync' });
      return finish(report);
    }
    if (dlInFlight) { try { await dlInFlight; } catch (_) { /* download errors are reported to its own caller */ } }
    if (reloadPending) {            // downloaded data not yet visible to the app: uploading now could clobber it
      report.error = { code: 'reload_pending', message: 'Cloud data was just applied; reload before syncing.' };
      return finish(report);
    }
    if (metaDirty) saveMeta();
    const { entries, rejected } = collect(!!(opts && opts.force));
    report.rejected.push(...rejected);

    for (const batch of pack(entries)) {
      if (await dispatchBatch(batch, token, report)) break;
    }
    if (!report.error && CFG.evictEnabled && opts.evict !== false && (opts.evict === true || getStorageUsage().overThreshold)) {
      await evict(token, report);
    }
    if (metaDirty) saveMeta();
    report.ok = !report.error && report.failed.length === 0;
    return finish(report);
  }

  let inFlight = null;
  /** Single-flight: concurrent callers share the running sync. opts.force re-sends unchanged keys too. */
  function syncLocalStorageOverflow(opts) {
    if (!inFlight) inFlight = run(opts || {}).finally(() => { inFlight = null; });
    return inFlight;
  }


  /* ═════════════════════════════════════════════════════════════════════════
   * 4. CLOUD DOWNLOAD (+ safe merge)
   * ═════════════════════════════════════════════════════════════════════════ */
  let reloadPending = false;
  let dlInFlight = null;

  /** GET with the same transient-failure policy as uploads. Resolves the request result. */
  async function getWithRetry(query, token) {
    for (let attempt = 0; ; attempt++) {
      const r = await request(API.download, { method: 'GET', token, query });
      if (r.ok || !TRANSIENT(r.status) || attempt >= CFG.maxRetries) return r;
      await sleep(r.retryAfterMs != null ? r.retryAfterMs : Math.min(1000 * 2 ** attempt, 8000) + Math.random() * 250);
    }
  }

  /** Walks every page of /sync/download, calling onItems(items) per page. Never throws. */
  async function fetchPages(params, token, onItems) {
    const out = { ok: true, pages: 0, error: null };
    let after = null;
    do {
      const q = { limit: CFG.downloadPageLimit };
      if (params.archived) q.archived = '1';
      if (params.index) q.index = '1';
      if (params.keys && params.keys.length) q.keys = params.keys.join(',');
      if (after) q.after = after;
      const r = await getWithRetry(q, token);
      if (!r.ok) {
        if (r.status === 401) { clearSession(); emit('yitbloc:auth-required', { reason: 'session-expired' }); }
        return { ok: false, pages: out.pages, error: r.error };
      }
      const d = r.data || {};
      out.pages++;
      if (Array.isArray(d.items)) onItems(d.items);
      const next = typeof d.next_cursor === 'string' && d.next_cursor ? d.next_cursor : null;
      if (next && next === after) return { ok: false, pages: out.pages, error: { code: 'bad_cursor', message: 'Server returned a non-advancing cursor.' } };
      after = next;
    } while (after && out.pages < CFG.maxDownloadPages);
    if (after) return { ok: false, pages: out.pages, error: { code: 'too_many_pages', message: 'Download exceeded the page limit.' } };
    return out;
  }

  const emptyish = (v) => v === '' || v === '[]' || v === '{}' || v === 'null';

  /**
   * Merge rules for one cloud item (never destroys local data without evidence it is unchanged):
   *  • key absent locally, or `overwrite` → take cloud
   *  • local untouched since last sync (hash == meta) → take cloud if it is newer
   *  • local edited since last sync, cloud unchanged since → keep local (it will upload)
   *  • both sides changed, or local never synced and non-trivial → conflictPolicy
   */
  function mergeItem(ls, it, opts, report) {
    const key = it && it.key, cv = it && it.value;
    if (typeof key !== 'string' || typeof cv !== 'string' || !KEY_RE.test(key) || ARCH_RE.test(key) || !syncable(key)) { report.skipped.push(String(key)); return; }
    const cts = Date.parse(it.updatedAt) || 0;
    const ch = hash(cv);
    const lv = ls.getItem(key);
    if (lv === cv) { meta[key] = { h: ch, ts: cts, st: 'synced' }; report.unchanged++; return; }

    const m = meta[key];
    const lh = lv === null ? null : hash(lv);
    let takeCloud = false, conflict = false;
    if (lv === null || opts.overwrite) takeCloud = true;
    else if (m && m.st !== 'conflict' && m.h === lh) takeCloud = cts > (m.ts || 0);
    else if (m && m.st !== 'conflict') conflict = cts > (m.ts || 0);   // local edited; conflict only if cloud also moved
    else if (emptyish(lv)) takeCloud = true;                            // never-synced but trivially empty
    else conflict = true;                                               // never-synced (or already flagged) and non-trivial

    if (conflict) {
      if (CFG.conflictPolicy === 'prefer-cloud') takeCloud = true;
      else if (CFG.conflictPolicy === 'prefer-local') { delete meta[key]; return; } // uploads next sync with a fresh timestamp
      else { meta[key] = { h: lh, ts: 0, st: 'conflict' }; report.conflicts.push(key); return; } // frozen: not uploaded until resolved
    }
    if (!takeCloud) return;
    try { ls.setItem(key, cv); } catch (_) { report.failed.push({ key, reason: 'quota' }); return; }
    meta[key] = { h: ch, ts: cts, st: 'synced' };
    report.applied.push(key);
  }

  async function runDownload(opts) {
    const report = { ok: false, applied: [], unchanged: 0, conflicts: [], skipped: [], failed: [], pages: 0, reloading: false, error: null };
    await ensureToken();
    const token = getToken(), ls = local();
    if (!token) { report.error = { code: 'unauthenticated', message: 'Sign in to download.' }; return report; }
    if (!ls) { report.error = { code: 'storage_unavailable', message: 'Local storage is unavailable.' }; return report; }

    const fp = await fetchPages({ keys: opts.keys }, token, (items) => { for (const it of items) mergeItem(ls, it, opts, report); });
    report.pages = fp.pages;
    saveMeta();
    if (!fp.ok) { report.error = fp.error; return report; }
    report.ok = report.failed.length === 0;

    if (report.conflicts.length) emit('yitbloc:sync-conflict', { keys: report.conflicts.slice() });
    if (report.applied.length) {
      reloadPending = !!CFG.reloadAfterDownload;
      const proceed = emitCancelable('yitbloc:cloud-downloaded', report);
      if (!proceed) reloadPending = false;               // controller took over the UX
      else if (CFG.reloadAfterDownload && global.location && typeof global.location.reload === 'function') {
        report.reloading = true;
        setTimeout(() => global.location.reload(), 50);
      } else reloadPending = false;
    }
    return report;
  }

  /** Pull the user's cloud data into localStorage. Single-flight. opts: { keys?, overwrite? } */
  function downloadCloudData(opts) {
    if (!dlInFlight) dlInFlight = runDownload(opts || {}).finally(() => { dlInFlight = null; });
    return dlInFlight;
  }

  /** Resolve a frozen conflict. 'local' re-uploads this device's copy; 'cloud' replaces it with the cloud copy. */
  async function resolveConflict(key, choice) {
    if (typeof key !== 'string' || !meta[key] || meta[key].st !== 'conflict') return fail('not_in_conflict', 'That key is not in conflict.');
    if (choice === 'local') { delete meta[key]; saveMeta(); return syncLocalStorageOverflow(); }
    if (choice === 'cloud') return downloadCloudData({ keys: [key], overwrite: true });
    return fail('invalid_choice', "Choice must be 'local' or 'cloud'.");
  }

  async function afterAuth() {
    let d = null;
    if (CFG.autoDownloadOnAuth) d = await downloadCloudData();
    if (d && d.reloading) return;                       // page is about to reload; checkStorageCapacity re-runs afterwards
    if (d && d.error) return;                           // never upload over a cloud copy we failed to read
    if (CFG.autoSyncOnAuth && getStorageUsage().overThreshold) await syncLocalStorageOverflow();
  }

  /* ═════════════════════════════════════════════════════════════════════════
   * 5. EVICTION ENGINE (frees localStorage after the server confirms storage)
   *
   * Server rows are whole-value last-write-wins, so truncating an array locally and syncing it would
   * overwrite the full cloud copy. Evicted items therefore go to SEPARATE cloud-only rows
   * (`<key>.arch.<id>`); only items the server accepted (HTTP 200, listed in `accepted`) AND that are
   * byte-identical locally at removal time are deleted. Strategies are an allow-list: only stores whose
   * removal the app tolerates are ever touched.
   * ═════════════════════════════════════════════════════════════════════════ */
  const ID_RE = /^[A-Za-z0-9_\-]{1,64}$/;
  const liveStore = (name) => { try { return name === 'bcStore' && typeof bcStore !== 'undefined' && bcStore && Array.isArray(bcStore.chats) ? bcStore : null; } catch (_) { return null; } };

  const STRATEGIES = [{
    // Wojak chats: {v, activeId, chats:[{id,title,created,updated,msgs}]}. The app itself already discards
    // its oldest non-active chats when storage fills, so archiving them to the cloud first is strictly safer.
    key: 'bloc_consultant_chats_v1',
    parse(raw) { const o = JSON.parse(raw); return o && Array.isArray(o.chats) ? o : null; },
    candidates(o, minTs) {
      const live = liveStore('bcStore');
      const active = new Set([o.activeId, live && live.activeId].filter(Boolean));
      return o.chats
        .filter((c) => c && typeof c.id === 'string' && ID_RE.test(c.id) && !active.has(c.id) && Array.isArray(c.msgs) && c.msgs.length && (c.updated || c.created || 0) <= minTs)
        .map((c) => ({ id: c.id, ts: c.updated || c.created || 0, json: JSON.stringify(c) }))
        .sort((a, b) => a.ts - b.ts);
    },
    find(o, id) { return o.chats.find((c) => c && c.id === id); },
    remove(o, ids) { o.chats = o.chats.filter((c) => !(c && ids.has(c.id))); },
    mirror(ids) { const l = liveStore('bcStore'); if (l) l.chats = l.chats.filter((c) => !ids.has(c.id)); },
    restore(o, chunkJson) {
      let c; try { c = JSON.parse(chunkJson); } catch (_) { return 'invalid'; }
      if (!c || typeof c.id !== 'string' || !ID_RE.test(c.id) || !Array.isArray(c.msgs)) return 'invalid';
      if (o.chats.some((x) => x && x.id === c.id)) return 'exists';
      o.chats.push(c);
      const l = liveStore('bcStore');
      if (l && !l.chats.some((x) => x && x.id === c.id)) l.chats.push(c);
      return 'restored';
    },
    blank: () => ({ v: 1, activeId: null, chats: [] }),
  }];
  const strategyFor = (chunkKey) => STRATEGIES.find((st) => chunkKey.startsWith(st.key + '.arch.'));

  async function evict(token, report) {
    const ev = { evicted: [], skipped: [], freedChars: 0, usageBefore: null, usageAfter: null, belowTarget: false };
    report.eviction = ev;
    const ls = local();
    const before = getStorageUsage();
    ev.usageBefore = before;
    const target = Math.floor((CFG.threshold - CFG.hysteresis) * CFG.quotaChars) - 1; // strictly below 75%
    if (!ls || before.usedChars <= target) { ev.usageAfter = before; ev.belowTarget = before.usedChars <= target; return; }

    const minTs = Date.now() - CFG.evictMinAgeDays * 86400000;
    let used = before.usedChars;

    for (const st of STRATEGIES) {
      if (used <= target) break;
      const raw = ls.getItem(st.key);
      if (raw === null) continue;
      let parsedValue = null;
      try { parsedValue = st.parse(raw); } catch (_) { /* unparsable: leave untouched */ }
      if (!parsedValue) continue;

      // choose the oldest candidates until the projected size clears the target
      const picked = [];
      let projected = used;
      for (const c of st.candidates(parsedValue, minTs)) {
        if (projected <= target) break;
        const key = st.key + '.arch.' + c.id;
        const record = { key, value: c.json, updatedAt: new Date(c.ts || Date.now()).toISOString() };
        const size = utf8Len(JSON.stringify(record)) + 1;
        if (utf8Len(c.json) > CFG.maxValueBytes || size > CFG.maxBatchBytes || !KEY_RE.test(key)) { ev.skipped.push({ id: c.id, reason: 'too_large_to_archive' }); continue; }
        picked.push({ key, srcId: c.id, json: c.json, ts: c.ts || Date.now(), size, item: record, virtual: true });
        projected -= c.json.length + 1;
      }
      if (!picked.length) continue;

      // 1) upload archive chunks; only HTTP-200 `accepted` entries count as verified
      const sub = { sent: 0, accepted: [], stale: [], rejected: [], failed: [], batches: 0, error: null };
      for (const batch of pack(picked)) { if (await dispatchBatch(batch, token, sub)) break; }
      report.batches += sub.batches; report.sent += sub.sent; report.accepted.push(...sub.accepted);
      if (sub.error) report.error = report.error || sub.error;
      const verified = new Set(sub.accepted);

      // 2) re-read fresh (nothing awaits between read and write) and remove only verified, unmodified items
      let fresh = null;
      try { fresh = st.parse(ls.getItem(st.key) || 'null'); } catch (_) { fresh = null; }
      if (!fresh) continue;
      const ids = new Set();
      for (const p of picked) {
        if (!verified.has(p.key)) continue;
        const cur = st.find(fresh, p.srcId);
        if (cur && JSON.stringify(cur) === p.json) ids.add(p.srcId);
        else ev.skipped.push({ id: p.srcId, reason: 'changed_during_archive' });
      }
      if (!ids.size) continue;
      st.remove(fresh, ids);
      try { ls.setItem(st.key, JSON.stringify(fresh)); } catch (_) { ev.skipped.push(...[...ids].map((id) => ({ id, reason: 'write_failed' }))); continue; }
      st.mirror(ids);                                               // keep the running app's in-memory copy consistent
      ids.forEach((id) => ev.evicted.push(st.key + ':' + id));
      used = getStorageUsage().usedChars;
    }

    // 3) the truncated main key changed locally: push it so the cloud copy matches
    if (ev.evicted.length && !report.error) {
      const { entries } = collect(false);
      for (const batch of pack(entries)) { if (await dispatchBatch(batch, token, report)) break; }
    }
    ev.usageAfter = getStorageUsage();
    ev.freedChars = Math.max(0, before.usedChars - ev.usageAfter.usedChars);
    ev.belowTarget = ev.usageAfter.usedChars <= target;
    if (ev.evicted.length) emit('yitbloc:evicted', ev);
  }

  /** Lists cloud-only archived items: [{ key, updatedAt }]. */
  async function listArchived() {
    const token = getToken();
    if (!token) return fail('unauthenticated', 'Sign in first.');
    const items = [];
    const fp = await fetchPages({ archived: true, index: true }, token, (p) => items.push(...p));
    return fp.ok ? { ok: true, items } : fail(fp.error.code, fp.error.message);
  }

  /** Pulls archived items back into localStorage. opts.ids limits to specific item ids. May re-cross the threshold. */
  async function restoreArchived(opts) {
    opts = opts || {};
    const token = getToken(), ls = local();
    if (!token) return fail('unauthenticated', 'Sign in first.');
    if (!ls) return fail('storage_unavailable', 'Local storage is unavailable.');
    const want = Array.isArray(opts.ids) ? new Set(opts.ids) : null;
    const report = { ok: false, restored: [], existing: [], invalid: [], failed: [], error: null };

    const fp = await fetchPages({ archived: true }, token, (items) => {
      for (const it of items) {
        const st = it && typeof it.key === 'string' ? strategyFor(it.key) : null;
        if (!st || typeof it.value !== 'string') continue;
        const id = it.key.slice((st.key + '.arch.').length);
        if (want && !want.has(id)) continue;
        let o = null;
        try { o = st.parse(ls.getItem(st.key) || 'null'); } catch (_) { o = null; }
        o = o || st.blank();
        const r = st.restore(o, it.value);
        if (r === 'exists') { report.existing.push(id); continue; }
        if (r === 'invalid') { report.invalid.push(id); continue; }
        try { ls.setItem(st.key, JSON.stringify(o)); report.restored.push(id); }
        catch (_) { st.mirror(new Set([id])); report.failed.push({ id, reason: 'quota' }); }
      }
    });
    if (!fp.ok) { report.error = fp.error; return report; }
    report.ok = report.failed.length === 0;
    if (report.restored.length) emit('yitbloc:archive-restored', report);
    return report;
  }

  /* ═════════════════════════════════════════════════════════════════════════
   * bootstrap
   * ═════════════════════════════════════════════════════════════════════════ */
  restoreSession();
  let timer = null;
  function startMonitor() {
    stopMonitor();
    timer = setInterval(() => { ensureToken(); checkStorageCapacity(); }, CFG.checkIntervalMs);
    global.addEventListener('storage', checkStorageCapacity);
    if (global.document) global.document.addEventListener('visibilitychange', onVisible);
    setTimeout(checkStorageCapacity, 0);
  }
  function onVisible() { if (global.document.visibilityState === 'visible') { ensureToken(); checkStorageCapacity(); } }
  function stopMonitor() {
    if (timer) clearInterval(timer);
    timer = null;
    global.removeEventListener('storage', checkStorageCapacity);
    if (global.document) global.document.removeEventListener('visibilitychange', onVisible);
  }

  const api = { loginUser, registerUser, logoutUser, syncLocalStorageOverflow, downloadCloudData, resolveConflict, listArchived, restoreArchived, getStorageUsage, checkStorageCapacity, getAuthState, isAuthenticated, startMonitor, stopMonitor, config: CFG };
  global.YitblocSync = Object.freeze(api);
  global.loginUser = loginUser;
  global.registerUser = registerUser;
  global.syncLocalStorageOverflow = syncLocalStorageOverflow;
  global.downloadCloudData = downloadCloudData;
  global.getStorageUsage = getStorageUsage;

  startMonitor();
})(typeof window !== 'undefined' ? window : globalThis);

let acctMode='login';
let acctBusy=false;

const acctApi=()=>window.YitblocSync||null;

function acctMsg(text,id){
  const el=$(id||'acct-msg');
  if(!el)return;
  el.textContent=text||'';
  el.style.display=text?'block':'none';
}

function acctRender(note){
  const api=acctApi();
  const state=api?api.getAuthState():{authenticated:false};
  const signedIn=!!state.authenticated;
  if(!signedIn&&acctMode==='signup'&&!note)note='Early access: accounts created during the beta get 50% off for life when premium plans launch.';
  $('acct-form').style.display=signedIn?'none':'block';
  $('acct-status').style.display=signedIn?'block':'none';
  $('acct-logout').style.display=signedIn?'':'none';
  $('acct-sync').style.display=signedIn?'':'none';
  $('acct-go').style.display=signedIn?'none':'';
  const n=$('acct-note');
  n.textContent=note||'';
  n.style.display=note?'block':'none';
  if(signedIn){
    $('acct-title').textContent='YOUR ACCOUNT';
    $('acct-who').textContent=(state.user&&state.user.email)||'';
    const u=api.getStorageUsage();
    $('acct-usage').textContent='Browser storage used: '+u.percent+'%. '+(typeof fullSyncOn==='function'&&fullSyncOn()?'Full sync is on: your data is kept in step across your devices.':'Older data moves to the cloud automatically once this passes 80%. Turn on full sync in Settings to sync everything.');
  }else{
    const signup=acctMode==='signup';
    $('acct-title').textContent=signup?'CREATE ACCOUNT':'SIGN IN';
    $('acct-go').textContent=signup?'CREATE ACCOUNT':'SIGN IN';
    $('acct-switch').textContent=signup?'Already have an account? Sign in':'New here? Create an account';
    $('acct-pass').autocomplete=signup?'new-password':'current-password';
  }
  acctRenderSettings();
}

function acctRenderSettings(){
  if(typeof fsPaint==='function'){fsPaint();return;}
  const el=$('set-acct-state');
  if(el)el.textContent='Not signed in';
}

function openAuthModal(ctx){
  const el=$('acct-overlay');
  if(!el)return;
  try{const em=$('acct-email'),last=localStorage.getItem('yb_last_email');if(em&&!em.value&&last)em.value=last;}catch(e){}
  acctMsg('');acctMsg('','acct-msg2');
  const why=ctx&&ctx.reason==='storage-threshold'?'Your browser storage is almost full. Sign in so older data can be moved to the cloud safely.'
    :ctx&&ctx.reason==='fullsync'?'Sign in to start syncing across your devices.':ctx&&ctx.reason==='expired'?'Your session ended. Please sign in again.':'';
  acctRender(why);
  el.classList.add('open');
}
/* Founding-member offer.
   claimFounding(): banner, welcome screen and Settings all call this. Opens Create account with the offer note.
   paintFounding(): signed-in people no longer see the "claim" links (html.is-founding). */
function claimFounding(){
  const w=$('welcome-overlay');
  if(w&&w.classList.contains('open')&&typeof dismissWelcome==='function')dismissWelcome();
  if(typeof closeSettings==='function')closeSettings();
  openAuthModal({reason:'founding',mode:'signup'});
}
function paintFounding(){
  const api=acctApi();
  const on=!!(api&&api.getAuthState().authenticated);
  document.documentElement.classList.toggle('is-founding',on);
}
window.addEventListener('yitbloc:auth-changed',paintFounding);
paintFounding();

function closeAuthModal(){
  const el=$('acct-overlay');
  if(el)el.classList.remove('open');
}
function openAccountFromSettings(){
  closeSettings();
  openAuthModal({reason:'manual'});
}

function acctToggleMode(){
  acctMode=acctMode==='login'?'signup':'login';
  acctMsg('');
  acctRender('');
}

function acctSetBusy(on,label){
  acctBusy=on;
  const b=$('acct-go');
  b.disabled=on;
  if(on)b.textContent=label||'PLEASE WAIT…';
  else acctRender($('acct-note').textContent||'');
}

async function acctSubmit(){
  const api=acctApi();
  if(acctBusy)return;
  if(!api){acctMsg('Sync is not available in this build.');return;}
  const email=$('acct-email').value.trim();
  const pass=$('acct-pass').value;
  acctMsg('');
  acctSetBusy(true,acctMode==='signup'?'CREATING…':'SIGNING IN…');
  let r;
  try{r=acctMode==='signup'?await api.registerUser(email,pass):await api.loginUser(email,pass);}
  catch(e){r={ok:false,error:{message:'Something went wrong. Please try again.'}};}
  acctSetBusy(false);
  if(!r.ok){
    const code=r.error&&r.error.code;
    acctMsg(code==='network_error'||code==='timeout'
      ?'Could not reach the server. It may still be waking up, so wait a moment and try again.'
      :(r.error&&r.error.message)||'Request failed.');
    return;
  }
  if(acctMode==='signup'&&r.confirmationRequired){
    acctMode='login';
    acctRender('Account created. Check your email and click the confirmation link, then sign in here.');
    return;
  }
  try{localStorage.setItem('yb_last_email',email.toLowerCase());}catch(e){}
  $('acct-pass').value='';
  acctRender('');
  showToast('Signed in');
}

function acctLogout(){
  const api=acctApi();
  if(api)api.logoutUser();
  acctMode='login';
  acctRender('');
  showToast('Signed out');
}

async function acctSyncNow(){
  const api=acctApi();
  if(!api||acctBusy)return;
  acctMsg('','acct-msg2');
  acctBusy=true;
  const btn=$('acct-sync');
  btn.disabled=true;btn.textContent='SYNCING…';
  let r;
  try{r=await api.syncLocalStorageOverflow();}catch(e){r={ok:false,error:{message:'Sync failed.'}};}
  acctBusy=false;
  btn.disabled=false;btn.textContent='SYNC NOW';
  if(r&&r.ok){
    const n=(r.accepted||[]).length;
    showToast(n?'Synced '+n+' item'+(n===1?'':'s'):'Nothing needed syncing');
    acctRender('');
  }else{
    acctMsg((r&&r.error&&r.error.message)||'Sync failed. Try again in a moment.','acct-msg2');
  }
}

window.addEventListener('yitbloc:auth-changed',()=>{
  if($('acct-overlay')&&$('acct-overlay').classList.contains('open'))acctRender($('acct-note').textContent||'');
  else acctRenderSettings();
});
window.addEventListener('yitbloc:auth-required',e=>{
  const reason=e&&e.detail&&e.detail.reason;
  if(reason==='storage-threshold'||reason==='manual')return;
  if(typeof fullSyncOn==='function'&&fullSyncOn())return;
  openAuthModal({reason:'expired'});
});
window.addEventListener('yitbloc:sync-conflict',()=>showToast('Some data differs between this browser and your cloud copy. Your local copy was kept.'));
window.addEventListener('yitbloc:evicted',()=>showToast('Older chats were moved to your cloud archive'));

(function(){
  const phone=typeof window.matchMedia==='function'?window.matchMedia('(max-width:640px)'):{matches:false};
  const isField=el=>!!el&&(el.matches&&el.matches('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),textarea,select,[contenteditable="true"]'));

  // Android keyboards often send no Enter keydown; finish the edit on the line-break input event instead.
  document.addEventListener('beforeinput',e=>{
    const el=e.target;
    if(!el||!el.classList||!el.classList.contains('t-txt'))return;
    if(e.inputType==='insertParagraph'||e.inputType==='insertLineBreak'){e.preventDefault();el.blur();}
  });

  // Phone: hide the tab bar while typing so the keyboard has room, and keep the field in view.
  let kbTimer;
  document.addEventListener('focusin',e=>{
    if(!phone.matches||!isField(e.target))return;
    clearTimeout(kbTimer);
    document.body.classList.add('kb-open');
    const el=e.target;
    setTimeout(()=>{try{el.scrollIntoView({block:'center',behavior:'smooth'});}catch(err){}},320);
  });
  document.addEventListener('focusout',()=>{
    clearTimeout(kbTimer);
    kbTimer=setTimeout(()=>{if(!isField(document.activeElement))document.body.classList.remove('kb-open');},80);
  });

  // Phone: when the tab changes, start at the top and keep the active tab visible in the bar.
  const nav=document.getElementById('hdr-nav');
  if(nav&&typeof MutationObserver==='function'){
    let lastKey=null;
    new MutationObserver(()=>{
      if(!phone.matches)return;
      const act=nav.querySelector('.nav-btn.active');
      if(!act)return;
      const key=act.dataset.navkey;
      const left=act.offsetLeft-(nav.clientWidth-act.offsetWidth)/2;
      try{nav.scrollTo({left:Math.max(0,left),behavior:lastKey?'smooth':'auto'});}catch(err){nav.scrollLeft=Math.max(0,left);}
      if(lastKey&&key!==lastKey){try{window.scrollTo({top:0,behavior:'auto'});}catch(err){window.scrollTo(0,0);}}
      lastKey=key;
    }).observe(nav,{subtree:true,attributes:true,attributeFilter:['class']});
  }
})();

var FS_KEY='bloc_fullsync_v1';
var FS_NAMES={
  bloc_tasks_v1:'Tasks',bloc_cal_v1:'Calendar events',bloc_habits_v1:'Habits',bloc_np_notes_v1:'Notes',
  bloc_np_folders_v1:'Note folders',bloc_goals_v1:'Goals',bloc_weekly_plans_v1:'Weekly plans',
  bloc_sessions_v1:'Focus sessions',bloc_reflections_v1:'Reflections',bloc_energy_log_v1:'Energy log',
  bloc_consultant_chats_v1:'Wojak chats',bloc_streak_v1:'Streak',bloc_day_state_v1:'Day progress',
  bloc_library_user_books_v1:'Library books',bloc_library_progress_v1:'Library progress'
};
var fsBusy=false,fsLastPull=0,fsWarned=false;

function fsLoad(){try{return JSON.parse(localStorage.getItem(FS_KEY)||'{}')||{};}catch(e){return {};}}
function fsPatch(p){try{localStorage.setItem(FS_KEY,JSON.stringify(Object.assign(fsLoad(),p)));}catch(e){}}
function fullSyncOn(){return fsLoad().on===true;}
function fsApi(){return window.YitblocSync||null;}
function fsSignedIn(){const a=fsApi();return !!(a&&a.isAuthenticated());}

function fsTyping(){
  const a=document.activeElement;
  if(!a)return false;
  const t=(a.tagName||'').toUpperCase();
  return t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||!!a.isContentEditable;
}
function fsName(k){
  if(FS_NAMES[k])return FS_NAMES[k];
  return k.replace(/^bloc_/,'').replace(/_v\d+$/,'').replace(/_/g,' ');
}
function fsConflicts(){
  let m={};
  try{m=JSON.parse(localStorage.getItem('bloc_sync_meta_v1')||'{}')||{};}catch(e){}
  return Object.keys(m).filter(k=>m[k]&&m[k].st==='conflict');
}
function fsWhen(ts){
  if(!ts)return '';
  const d=new Date(ts),today=new Date().toDateString()===d.toDateString();
  const t=d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  return today?t:d.toLocaleDateString([],{month:'short',day:'numeric'})+' '+t;
}

async function fsCycle(opts){
  opts=opts||{};
  const api=fsApi();
  if(!api||!fullSyncOn()||!api.isAuthenticated()||fsBusy)return null;
  fsBusy=true;fsPaint();
  let out=null;
  try{
    if(opts.pull&&!fsTyping()){
      const d=await api.downloadCloudData();
      fsLastPull=Date.now();
      if(d.reloading)return d;
      if(d.error){fsPatch({error:d.error.message||'Could not read your cloud copy.'});return d;}
    }
    const r=await api.syncLocalStorageOverflow();
    out=r;
    if(r.error&&r.error.code==='reload_pending')return r;
    const rej=(r.rejected||[]).length;
    if(r.ok)fsPatch({last:Date.now(),error:null,rejected:rej});
    else fsPatch({error:(r.error&&r.error.message)||'Some items could not be synced.',rejected:rej});
  }catch(e){
    fsPatch({error:'Sync failed. It will try again shortly.'});
  }finally{
    fsBusy=false;fsPaint();
  }
  return out;
}

async function fsToggle(on){
  fsPatch({on:!!on,error:null});
  fsWarned=false;
  if(on){
    if(!fsSignedIn()){openAccountFromSettings();}
    else{
      showToast('SYNC ON — SYNCING NOW');
      await fsCycle({pull:true});
    }
  }else showToast('SYNC OFF — STAYS IN THIS BROWSER UNLESS STORAGE FILLS');
  fsPaint();
}

async function fsSyncNow(){
  const api=fsApi();
  if(!api||fsBusy)return;
  const btn=$('set-sync-now');
  if(btn){btn.disabled=true;btn.textContent='SYNCING…';}
  let r;
  try{
    r=fullSyncOn()?await fsCycle({pull:true}):await api.syncLocalStorageOverflow();
  }catch(e){r=null;}
  if(btn){btn.disabled=false;btn.textContent='SYNC NOW';}
  if(r&&r.reloading)return;
  if(r&&r.ok)showToast('SYNCED');
  else if(r&&r.error)showToast((r.error.message||'Sync failed').toUpperCase().slice(0,60));
  fsPaint();
}

async function fsResolve(key,choice){
  const api=fsApi();if(!api)return;
  await api.resolveConflict(key,choice);
  fsPaint();
}
async function fsResolveAll(choice){
  const api=fsApi(),keys=fsConflicts();
  if(!api||!keys.length)return;
  if(choice==='cloud'){await api.downloadCloudData({keys,overwrite:true});}
  else{for(const k of keys)await api.resolveConflict(k,'local');}
  fsPaint();
}

function fsPaint(){
  const card=$('set-acct-card');
  if(!card)return;
  const api=fsApi();
  const st=api?api.getAuthState():{authenticated:false};
  const signed=!!st.authenticated,s=fsLoad(),on=s.on===true;
  $('set-acct-out').style.display=signed?'none':'block';
  $('set-acct-in').style.display=signed?'block':'none';
  $('set-acct-state').textContent=signed?((st.user&&st.user.email)||'Signed in'):'Not signed in';
  const pitch=$('set-acct-pitch');
  if(pitch)pitch.textContent=on
    ?'Sync is paused because you are signed out. Sign in to continue syncing your devices.'
    :'Optional. Sign in to back up your data and use it on your other devices. Without an account, everything stays in this browser only.';
  const tg=$('set-fullsync');if(tg)tg.checked=on;

  let chip='OFF',cls='';
  const conf=fsConflicts();
  if(!signed&&on){chip='PAUSED';cls='warn';}
  else if(!signed){chip='OFF';}
  else if(fsBusy){chip='SYNCING…';cls='busy';}
  else if(conf.length){chip='NEEDS YOU';cls='warn';}
  else if(s.error){chip='PROBLEM';cls='bad';}
  else if(on){chip='SYNC ON';cls='ok';}
  else chip='SIGNED IN';
  const c=$('set-sync-chip');
  if(c){c.textContent=chip;c.className='set-chip'+(cls?' '+cls:'');}

  if(signed&&api){
    const u=api.getStorageUsage();
    const bar=$('set-meter-bar');
    if(bar){bar.style.width=Math.min(100,u.percent)+'%';bar.className=u.percent>=80?'hot':'';}
    $('set-usage-txt').textContent='Browser storage used: '+u.percent+'%'+(on?'':'. Older data moves to the cloud once this passes 80%.');
    const last=$('set-last-sync');
    let msg=on?(s.last?'Last synced '+fsWhen(s.last):'Not synced yet'):'Full sync is off.';
    if(on&&s.error)msg='⚠ '+s.error;
    else if(on&&s.rejected)msg+=' · '+s.rejected+' item'+(s.rejected===1?'':'s')+' too large to sync';
    last.textContent=msg;
    last.className='set-last'+(on&&s.error?' bad':'');
  }
  fsPaintConflicts(conf);
}

function fsPaintConflicts(conf){
  const box=$('set-conflicts');
  if(!box)return;
  if(!conf.length){box.style.display='none';box.innerHTML='';return;}
  box.style.display='block';
  box.innerHTML=`<div class="set-conf-title">⚠ ${conf.length} item${conf.length===1?'':'s'} differ between this device and your cloud copy</div>
    <div class="set-conf-sub">Your data on this device was kept untouched. Pick which version to keep.</div>`+
    conf.map(k=>`<div class="set-conf-row"><span>${escHTML(fsName(k))}</span>
      <button type="button" onclick="fsResolve('${k}','local')">KEEP THIS DEVICE</button>
      <button type="button" onclick="fsResolve('${k}','cloud')">USE CLOUD</button></div>`).join('')+
    `<div class="set-conf-all"><button type="button" onclick="fsResolveAll('local')">KEEP THIS DEVICE FOR ALL</button>
      <button type="button" onclick="fsResolveAll('cloud')">USE CLOUD FOR ALL</button></div>`;
}

window.addEventListener('yitbloc:auth-changed',e=>{
  if(e&&e.detail&&e.detail.authenticated&&fsLoad().on===undefined){fsPatch({on:true,error:null});showToast('SYNC ON \u2014 YOUR DEVICES WILL STAY IN STEP');}
  fsPaint();
  if(e&&e.detail&&e.detail.authenticated&&fullSyncOn()){fsWarned=false;setTimeout(()=>fsCycle({pull:true}),1500);}
});
window.addEventListener('yitbloc:sync-complete',()=>fsPaint());
window.addEventListener('yitbloc:sync-conflict',()=>fsPaint());
window.addEventListener('yitbloc:auth-required',()=>{
  if(!fullSyncOn()||fsWarned)return;
  fsWarned=true;
  fsPaint();
  showToast('SYNC PAUSED — SIGN IN AGAIN IN SETTINGS');
});
document.addEventListener('visibilitychange',()=>{
  if(!fullSyncOn())return;
  fsCycle({pull:document.visibilityState==='visible'});
});
setInterval(()=>{
  if(!fullSyncOn()||document.visibilityState==='hidden')return;
  fsCycle({pull:Date.now()-fsLastPull>60000});
},30000);
setTimeout(()=>{if(fullSyncOn())fsCycle({pull:true});},2500);
fsPaint();
