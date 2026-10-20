/* Wojak voice-over. ON by default, but it only speaks when you tap Listen (auto-read is off).
   - Adds a "Listen" button under each Wojak reply (can be switched off in Settings → Wojak voice-over).
   - Optional: read new replies automatically.
   - Voice quality: ranks the device's voices so natural / neural / enhanced ones win and the low-quality
     "Google ..." browser voices come last. The person can also pick any voice by hand.
   - Optional OpenAI voice, reusing the key already saved under Settings → Voice & Greeting.
   Own storage key (bloc_wojak_voice_v1). Nothing is spoken, sent or stored unless the person turns it on. */
(function(){
  'use strict';
  var KEY='bloc_wojak_voice_v1';
  var DEF={on:true,auto:false,engine:'browser',voiceURI:'',rate:1,pitch:1,oaVoice:'alloy'};
  var OA_STYLE='Speak like a friendly, relaxed person in normal conversation: natural everyday pace and intonation, warm and clear. Not slow, not monotone, not dramatic. A little dry humour only where the words are actually joking.';
  var cfg=load();
  function load(){try{var c=Object.assign({},DEF,JSON.parse(localStorage.getItem(KEY)||'null')||{});
    if(c.rate===0.92&&c.pitch===0.9){c.rate=DEF.rate;c.pitch=DEF.pitch;}   // old slow/low defaults -> normal speech
    return c;}catch(e){return Object.assign({},DEF);}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(cfg));}catch(e){}}
  function $(id){return document.getElementById(id);}
  function hasKey(){try{return typeof appSettings!=='undefined'&&!!(appSettings&&appSettings.openaiApiKey);}catch(e){return false;}}
  function hasTTS(){return 'speechSynthesis' in window&&typeof SpeechSynthesisUtterance!=='undefined';}
  function engine(){return cfg.engine==='openai'&&hasKey()?'openai':'browser';}

  /* ---------- voices ---------- */
  var voices=[];
  function score(v){
    var n=v.name||'',l=(v.lang||'').toLowerCase(),s=0;
    if(/natural|neural|online/i.test(n))s+=60;
    if(/premium|enhanced|siri/i.test(n))s+=50;
    if(/^en[-_](us|gb|au|ie|ca)/.test(l))s+=20;else if(l.indexOf('en')===0)s+=10;
    if(v.localService)s+=5;
    if(/google/i.test(n))s-=60;
    if(/espeak|compact/i.test(n))s-=40;
    return s;
  }
  function ranked(){
    var en=voices.filter(function(v){return (v.lang||'').toLowerCase().indexOf('en')===0;});
    var pool=en.length?en:voices.slice();
    return pool.sort(function(a,b){return score(b)-score(a);});
  }
  function pickVoice(){
    if(cfg.voiceURI){for(var i=0;i<voices.length;i++)if(voices[i].voiceURI===cfg.voiceURI)return voices[i];}
    return ranked()[0]||null;
  }
  function refreshVoices(){voices=hasTTS()?speechSynthesis.getVoices():[];syncUI();}

  /* ---------- speaking ---------- */
  var cur={key:null,token:0,audio:null,abort:null};
  function mark(){
    [].forEach.call(document.querySelectorAll('.wj-listen'),function(b){
      var on=b.getAttribute('data-k')===cur.key;
      b.classList.toggle('on',on);
      b.lastChild.textContent=on?'Stop':'Listen';
      b.setAttribute('aria-label',on?'Stop listening':'Listen to this reply');
    });
  }
  function stop(){
    cur.token++;
    if(hasTTS()){try{speechSynthesis.cancel();}catch(e){}}
    if(cur.abort){try{cur.abort.abort();}catch(e){} cur.abort=null;}
    if(cur.audio){try{cur.audio.pause();}catch(e){} cur.audio=null;}
    cur.key=null;mark();
  }
  function finish(my){if(my===cur.token){cur.key=null;cur.audio=null;mark();}}
  // Long text is spoken sentence by sentence: some browsers cut a single long utterance off after ~15 seconds.
  function chunks(text){
    var parts=text.match(/[^.!?\n]+[.!?]*\s*/g)||[text],out=[],buf='';
    parts.forEach(function(p){
      if((buf+p).length>200&&buf){out.push(buf.trim());buf='';}
      buf+=p;
    });
    if(buf.trim())out.push(buf.trim());
    return out;
  }
  function speakBrowser(text,my){
    if(!hasTTS()){finish(my);return;}
    var parts=chunks(text),i=0,voice=pickVoice();
    (function next(){
      if(my!==cur.token)return;
      if(i>=parts.length){finish(my);return;}
      var u=new SpeechSynthesisUtterance(parts[i++]);
      if(voice){u.voice=voice;u.lang=voice.lang;}
      u.rate=cfg.rate;u.pitch=cfg.pitch;u.volume=1;
      u.onend=next;
      u.onerror=function(){finish(my);};
      speechSynthesis.speak(u);
    })();
  }
  function speakOpenAI(text,my){
    var ctl=typeof AbortController!=='undefined'?new AbortController():null;
    cur.abort=ctl;
    return fetch('https://api.openai.com/v1/audio/speech',{
      method:'POST',
      signal:ctl?ctl.signal:undefined,
      headers:{'Authorization':'Bearer '+appSettings.openaiApiKey,'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-4o-mini-tts',voice:cfg.oaVoice||'alloy',input:text.slice(0,4000),instructions:OA_STYLE})
    }).then(function(r){if(!r.ok)throw new Error('tts '+r.status);return r.blob();})
      .then(function(blob){
        if(my!==cur.token)return true;
        var url=URL.createObjectURL(blob),a=new Audio(url);
        cur.audio=a;
        a.onended=a.onerror=function(){try{URL.revokeObjectURL(url);}catch(e){} finish(my);};
        return a.play().then(function(){return true;});
      })
      .catch(function(){return false;});
  }
  function speak(text,key){
    if(!text)return;
    stop();
    var my=cur.token;cur.key=key;mark();
    if(engine()==='openai'){
      speakOpenAI(text,my).then(function(ok){if(!ok&&my===cur.token)speakBrowser(text,my);}); // fall back quietly
    }else speakBrowser(text,my);
  }

  /* ---------- reading a reply ---------- */
  function hash(s){var h=5381,i=s.length;while(i)h=(h*33)^s.charCodeAt(--i);return String(h>>>0);}
  function textOf(bubble){
    var c=bubble.cloneNode(true);
    [].forEach.call(c.querySelectorAll('.lib-chat-related,.bai-msg-time,.wj-listen'),function(n){n.remove();});
    [].forEach.call(c.querySelectorAll('p,li,div,br'),function(n){n.insertAdjacentText('afterend',' ');});
    return (c.textContent||'').replace(/[✨◆]/g,'').replace(/https?:\/\/\S+/g,'').replace(/\s+/g,' ').trim();
  }
  var ICON='<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-volume"/></svg>';
  function decorate(){
    var all=document.querySelectorAll('.bai-msg.agent');
    [].forEach.call(all,function(b){
      var time=b.querySelector('.bai-msg-time');
      if(!time||b.querySelector('.wj-listen'))return;       // no time stamp = still "Thinking…"
      var txt=textOf(b);if(!txt)return;
      var btn=document.createElement('button');
      btn.type='button';btn.className='wj-listen';btn.setAttribute('data-k',hash(txt));
      btn.setAttribute('aria-label','Listen to this reply');
      btn.innerHTML=ICON+'<span>Listen</span>';
      b.insertBefore(btn,time);
    });
    mark();
  }
  function removeButtons(){[].forEach.call(document.querySelectorAll('.wj-listen'),function(b){b.remove();});}

  /* ---------- watch the chat ---------- */
  var pendingCount=-1,raf=0;
  function visibleBox(){
    var ids=['bai-messages','lib-chat-messages'];
    for(var i=0;i<ids.length;i++){var el=$(ids[i]);if(el&&el.getClientRects().length>0)return el;/* rendered and on screen; works for fixed panels */}
    return null;
  }
  function scan(){
    if(!cfg.on)return;
    decorate();
    var box=visibleBox();if(!box)return;
    var agents=box.querySelectorAll('.bai-msg.agent');
    var thinking=[].some.call(agents,function(a){return !a.querySelector('.bai-msg-time');});
    var count=box.querySelectorAll('.bai-msg').length;
    if(thinking){pendingCount=count;return;}
    if(pendingCount<0)return;
    var waited=pendingCount;pendingCount=-1;
    // Only a reply that just replaced a "Thinking…" bubble is read automatically; history is never read out.
    if(!cfg.auto||count!==waited)return;
    var last=box.lastElementChild;
    if(!last||!last.classList.contains('agent')||last.querySelector('[onclick^="bcRetry"]'))return;
    var txt=textOf(last);
    if(txt)speak(txt,hash(txt));
  }
  var mo=typeof MutationObserver!=='undefined'?new MutationObserver(function(){
    if(raf)return;raf=requestAnimationFrame(function(){raf=0;scan();});
  }):null;
  function attach(){
    if(!mo)return;
    ['bai-messages','lib-chat-messages'].forEach(function(id){
      var el=$(id);if(el&&!el.__wj){el.__wj=1;mo.observe(el,{childList:true});}
    });
  }
  document.addEventListener('click',function(e){
    var btn=e.target.closest&&e.target.closest('.wj-listen');if(!btn)return;
    e.preventDefault();
    var k=btn.getAttribute('data-k');
    if(cur.key===k){stop();return;}
    speak(textOf(btn.closest('.bai-msg')),k);
  });

  /* ---------- settings panel (Settings → Wojak voice-over) ---------- */
  function syncUI(){
    var on=$('wj-on');if(!on)return;
    on.checked=!!cfg.on;
    $('wj-auto').checked=!!cfg.auto;
    $('wj-sub').style.display=cfg.on?'':'none';
    var eng=$('wj-engine'),oa=eng.querySelector('option[value="openai"]');
    oa.disabled=!hasKey();
    oa.textContent=hasKey()?'OpenAI voice (sends the reply text to OpenAI)':'OpenAI voice (add a key in Voice & Greeting first)';
    eng.value=engine();
    $('wj-browser-fields').style.display=engine()==='browser'?'':'none';
    $('wj-oa-fields').style.display=engine()==='openai'?'':'none';
    $('wj-oavoice').value=cfg.oaVoice||'alloy';
    var sel=$('wj-voice'),list=ranked(),chosen=pickVoice();
    sel.innerHTML='';
    if(!list.length){var o=document.createElement('option');o.textContent=hasTTS()?'No voices found yet':'This browser has no speech voices';sel.appendChild(o);}
    list.forEach(function(v,i){
      var o=document.createElement('option');o.value=v.voiceURI;
      o.textContent=v.name+' ('+v.lang+')'+(i===0&&!/google/i.test(v.name)?' — recommended':'');
      sel.appendChild(o);
    });
    if(chosen)sel.value=chosen.voiceURI;
    $('wj-rate').value=cfg.rate;$('wj-rate-val').textContent=cfg.rate.toFixed(2)+'×';
    var hint=$('wj-hint'),poor=chosen&&/google/i.test(chosen.name)&&engine()==='browser';
    hint.textContent=poor
      ?'Only low-quality voices were found on this device. For a better sound, install a natural or enhanced voice in your system settings (Windows: Settings → Time & language → Speech; Mac: Accessibility → Spoken Content), or use the OpenAI voice.'
      :'Applies instantly. Nothing is spoken unless you tap Listen'+(cfg.auto?' or a new reply arrives':'')+'.';
  }
  function bind(){
    var on=$('wj-on');if(!on||on.__wj)return;on.__wj=1;
    on.addEventListener('change',function(){cfg.on=on.checked;save();if(cfg.on){scan();}else{stop();removeButtons();pendingCount=-1;}syncUI();});
    $('wj-auto').addEventListener('change',function(){cfg.auto=$('wj-auto').checked;save();syncUI();});
    $('wj-engine').addEventListener('change',function(){cfg.engine=$('wj-engine').value;save();syncUI();});
    $('wj-voice').addEventListener('change',function(){cfg.voiceURI=$('wj-voice').value;save();});
    $('wj-oavoice').addEventListener('change',function(){cfg.oaVoice=$('wj-oavoice').value;save();});
    $('wj-rate').addEventListener('input',function(){cfg.rate=parseFloat($('wj-rate').value)||1;$('wj-rate-val').textContent=cfg.rate.toFixed(2)+'×';save();});
    $('wj-test').addEventListener('click',function(){speak('Hey, I’m Wojak. Tap Listen under any reply and I’ll read it out to you.','wj-test');});
    var acc=$('wj-acc');if(acc)acc.addEventListener('toggle',function(){if(acc.open)refreshVoices();});
  }

  /* ---------- start ---------- */
  var tries=0,iv=setInterval(function(){bind();attach();if(++tries>40)clearInterval(iv);},250);
  if(hasTTS()){refreshVoices();speechSynthesis.onvoiceschanged=refreshVoices;}
  bind();attach();syncUI();scan();
  // Closing the panel stops the voice.
  try{
    var origToggle=window.baiToggle;
    if(typeof origToggle==='function')window.baiToggle=function(){
      var r=origToggle.apply(this,arguments);
      var p=$('bai-panel');if(p&&!p.classList.contains('open'))stop();
      return r;
    };
  }catch(e){}
  var st=document.createElement('style');st.id='wojak-voice-css';
  st.textContent=
    '.wj-listen{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:4px 11px;border-radius:999px;border:1px solid var(--bdr2);background:transparent;color:var(--muted);font:600 12px var(--sans);cursor:pointer}'+
    '.wj-listen:hover{color:var(--txt)}.wj-listen.on{color:var(--amber);border-color:var(--amber)}'+
    '.wj-listen svg{width:14px;height:14px;flex:none}'+
    '#wj-rate{width:100%}.wj-rate-row{display:flex;align-items:center;gap:10px}.wj-rate-row span{min-width:48px;text-align:right;color:var(--muted);font-size:12px}';
  document.head.appendChild(st);
})();
