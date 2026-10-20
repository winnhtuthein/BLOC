/* Focus Block setup */
(function(){
  'use strict';
  var $=function(id){return document.getElementById(id)};

  window.openCustomDur=function(){
    if($('custom-row').hidden){durOpen=true;durChips();}
    var h=$('custom-h');h.focus();h.select();
  };
  window.toggleDurEdit=function(){durEditing=!durEditing;durChips();};

  var box=$('focus-task-custom'),combo=$('focus-combo'),list=$('focus-combo-list'),btn=$('focus-combo-btn'),sel=$('focus-task-select');
  if(!box||!combo||!list||!sel)return;
  var items=[],act=-1,justFocused=false;

  var isOpen=function(){return !list.hidden};
  function setOpen(on){
    list.hidden=!on;
    combo.dataset.open=on?'1':'0';
    box.setAttribute('aria-expanded',on?'true':'false');
    if(!on){act=-1;box.removeAttribute('aria-activedescendant');}
  }

  function render(filter){
    var q=(filter||'').trim().toLowerCase(),html='',n=0;items=[];
    Array.prototype.forEach.call(sel.children,function(g){
      if(g.tagName!=='OPTGROUP')return;
      var rows=Array.prototype.filter.call(g.children,function(o){return !q||o.dataset.text.toLowerCase().indexOf(q)>-1});
      if(!rows.length)return;
      html+='<li class="combo-grp" role="presentation">'+escHTML(g.label)+'</li>';
      rows.forEach(function(o){
        var i=n++;items.push(o);
        html+='<li class="combo-opt'+(o.value&&o.value===sel.value?' cur':'')+'" role="option" id="fc-'+i+'" data-i="'+i+'"'+(o.value===sel.value?' aria-selected="true"':'')+(o.disabled?' aria-disabled="true" title="Blocked until its dependency is done"':'')+'>'+escHTML(o.textContent)+'</li>';
      });
    });
    if(!n)html='<li class="combo-none" role="presentation">'+(q?'No pending task matches — your text will be used as a custom name.':'No pending tasks. Type a name to focus on anything.')+'</li>';
    list.innerHTML=html;
    var first=items.findIndex(function(o){return !o.disabled});
    move(q?first:-1,true);
  }

  function move(i,quiet){
    var prev=list.querySelector('.act');if(prev)prev.classList.remove('act');
    act=i;
    if(i<0){box.removeAttribute('aria-activedescendant');return;}
    var el=$('fc-'+i);if(!el)return;
    el.classList.add('act');box.setAttribute('aria-activedescendant',el.id);
    if(!quiet)el.scrollIntoView({block:'nearest'});
  }

  function step(dir){
    var i=act,tries=items.length;
    while(tries--){
      i+=dir;
      if(i<0)i=items.length-1;else if(i>=items.length)i=0;
      if(items[i]&&!items[i].disabled)return move(i);
    }
  }

  function pick(i){
    var o=items[i];if(!o||o.disabled)return;
    sel.value=o.value;box.value=o.dataset.text;
    setOpen(false);
  }

  function open(filter){render(filter);setOpen(true);}

  box.addEventListener('focus',function(){justFocused=true;box.select();});
  box.addEventListener('mouseup',function(e){if(justFocused){e.preventDefault();justFocused=false;}});
  box.addEventListener('click',function(){if(!isOpen())open('');});
  box.addEventListener('input',function(){
    var picked=sel.options[sel.selectedIndex];
    if(picked&&picked.dataset.text!==box.value.trim())sel.value='';
    open(box.value);
  });
  box.addEventListener('keydown',function(e){
    if(e.key==='ArrowDown'){e.preventDefault();if(!isOpen())open('');else step(1);}
    else if(e.key==='ArrowUp'&&isOpen()){e.preventDefault();step(-1);}
    else if(e.key==='Enter'&&isOpen()&&act>-1){e.preventDefault();pick(act);}
    else if(e.key==='Escape'&&isOpen()){e.preventDefault();e.stopPropagation();setOpen(false);}
    else if(e.key==='Tab')setOpen(false);
  });
  box.addEventListener('blur',function(){justFocused=false;});
  btn.addEventListener('mousedown',function(e){e.preventDefault();});
  btn.addEventListener('click',function(){if(isOpen())setOpen(false);else{box.focus();open('');}});
  list.addEventListener('mousedown',function(e){e.preventDefault();});
  list.addEventListener('click',function(e){var li=e.target.closest('.combo-opt');if(li)pick(+li.dataset.i);});
  list.addEventListener('mousemove',function(e){var li=e.target.closest('.combo-opt');if(li&&+li.dataset.i!==act&&li.getAttribute('aria-disabled')!=='true')move(+li.dataset.i,true);});
  document.addEventListener('mousedown',function(e){if(isOpen()&&!combo.contains(e.target))setOpen(false);});
  document.addEventListener('touchstart',function(e){if(isOpen()&&!combo.contains(e.target))setOpen(false);},{passive:true});
})();
