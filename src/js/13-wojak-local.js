/* Wojak local AI (Ollama). OPTIONAL, off by default; nothing leaves your device.
   Client:     official ollama-js (MIT), bundled in js/ollama-js.bundle.js.
   Agent loop: adapted from ollama-js examples/tools/calculator.ts (chat -> run tool calls -> chat again).
   This file is only the adapter: Bloc's existing functions become tools, with guards. If the local model
   fails, Wojak falls back to Gemini (when a key exists), so it is never worse than before. */
(function(){
  'use strict';
  var KEY='bloc_wojak_local_v1',DEF={on:false,host:'http://127.0.0.1:11434',model:'llama3.1:8b'};
  var cfg;try{cfg=Object.assign({},DEF,JSON.parse(localStorage.getItem(KEY)||'null')||{});}catch(e){cfg=Object.assign({},DEF);}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(cfg));}catch(e){}}
  function $(id){return document.getElementById(id);}
  function client(){return new OllamaLib.Ollama({host:cfg.host});}

  /* ---- tools: thin wrappers over what Bloc already has (read-only) ---- */
  function spec(name,description,props){return{type:'function',function:{name:name,description:description,parameters:{type:'object',required:Object.keys(props),properties:props}}};}
  var TOOLS={
    getOpenTasks:{spec:spec('getOpenTasks','List the user\'s open tasks (type A = most important)',{}),
      run:function(){return tasks.filter(function(t){return !t.done;}).slice(0,15).map(function(t){return{text:t.text,type:t.type,minutes:t.estimate||null};});}},
    getStreak:{spec:spec('getStreak','Get the user\'s current and best day streak',{}),
      run:function(){return{current:streakData.current,best:streakData.best};}},
    searchLibrary:{spec:spec('searchLibrary','Search the BLOC Library for short reads that match a struggle',{query:{type:'string',description:'What the user is struggling with'}}),
      run:function(a){return libSearchReads(String(a.query||'').slice(0,200),3).map(function(r){return{id:r.id,title:r.title,summary:r.teaser};});}}
  };
  var SPECS=Object.keys(TOOLS).map(function(k){return TOOLS[k].spec;});

  /* ---- agent loop (from the official example) with guards ---- */
  async function localChat(text,opts){
    var c=client(),timer=setTimeout(function(){c.abort();},90000);   // guard: 90 s ceiling
    var messages=[{role:'system',content:opts.system||''}]
      .concat((opts.history||[]).map(function(h){return{role:h.role==='model'?'assistant':'user',content:h.text};}))
      .concat([{role:'user',content:text}]);
    try{
      for(var round=0;round<3;round++){                              // guard: at most 3 tool rounds
        var chatReply=await c.chat({model:cfg.model,messages:messages,tools:SPECS});
        var m=chatReply.message;
        if(!m.tool_calls||!m.tool_calls.length)return(m.content||'').trim();
        messages.push(m);
        m.tool_calls.forEach(function(call){
          var t=TOOLS[call.function.name],out;                      // guard: only known tools run
          try{out=t?t.run(call.function.arguments||{}):'unknown tool';}catch(e){out='tool failed';}
          messages.push({role:'tool',content:JSON.stringify(out)});
        });
      }
      return((await c.chat({model:cfg.model,messages:messages})).message.content||'').trim();
    }finally{clearTimeout(timer);}
  }

  /* ---- plug into Wojak: local model first, Gemini as the safety net ---- */
  var origStream=window.baiStreamGemini,origHas=window.bcHasKey;
  window.bcHasKey=function(){return cfg.on||origHas.apply(this,arguments);};
  window.baiStreamGemini=async function(text,opts){
    opts=opts||{};
    if(!cfg.on)return origStream.apply(this,arguments);
    try{
      var out=await localChat(text,opts);
      if(!out)throw new Error('empty');
      if(opts.onText)opts.onText(out);
      return{text:out,truncated:false};
    }catch(e){
      if(origHas.call(window))return origStream.apply(this,arguments);   // fall back to Gemini
      var err=new Error('Local AI is not answering. Is Ollama running? You can also add a Gemini key as a backup.');err.localAI=true;throw err;
    }
  };
  var origFriendly=window.baiFriendlyError;
  if(typeof origFriendly==='function')window.baiFriendlyError=function(e){return e&&e.localAI?e.message:origFriendly.apply(this,arguments);};

  /* ---- settings panel ---- */
  function status(msg,bad){var s=$('wl-status');if(s){s.textContent=msg;s.style.color=bad?'var(--red,#c0392b)':'';}}
  function sync(){
    if(!$('wl-on'))return;
    $('wl-on').checked=cfg.on;$('wl-sub').style.display=cfg.on?'':'none';
    $('wl-host').value=cfg.host;$('wl-model').value=cfg.model;
  }
  async function test(){
    status('Checking…');
    try{
      var list=await client().list(),names=(list.models||[]).map(function(m){return m.name;});
      var has=names.some(function(n){return n===cfg.model||n.split(':')[0]===cfg.model;});
      status(has?'Connected. Model ready.':'Connected, but "'+cfg.model+'" is not installed. Run: ollama pull '+cfg.model,!has);
    }catch(e){status('Cannot reach Ollama at '+cfg.host+'. Is it running? See the setup note above.',true);}
  }
  function bind(){
    var on=$('wl-on');if(!on||on.__wl)return;on.__wl=1;
    on.addEventListener('change',function(){cfg.on=on.checked;save();sync();if(typeof bcUpdateHeadSub==='function')bcUpdateHeadSub();});
    $('wl-host').addEventListener('change',function(){cfg.host=$('wl-host').value.trim()||DEF.host;save();});
    $('wl-model').addEventListener('change',function(){cfg.model=$('wl-model').value.trim()||DEF.model;save();});
    $('wl-test').addEventListener('click',test);
    sync();
  }
  bind();var n=0,iv=setInterval(function(){bind();if(++n>40)clearInterval(iv);},250);
})();
