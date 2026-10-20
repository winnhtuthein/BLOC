/* Banner state. Loaded synchronously right after the banner markup, so it runs before first paint
   and a dismissed banner never flashes. Storage key: bloc_beta_banner_dismissed ('true' once closed). */
(function(){
  var KEY='bloc_beta_banner_dismissed', root=document.documentElement, el=document.getElementById('beta-banner');
  var gone=false;
  try{ gone=localStorage.getItem(KEY)==='true'; }catch(e){}
  if(gone){ el.remove(); root.style.setProperty('--beta-h','0px'); root.style.setProperty('--beta-off','0px'); return; }
  var h=0, ticking=false;
  function measure(){ h=el.offsetHeight; root.style.setProperty('--beta-h',h+'px'); sync(); }
  function sync(){ ticking=false; root.style.setProperty('--beta-off',Math.max(0,h-(window.pageYOffset||0))+'px'); }
  function onScroll(){ if(!ticking){ ticking=true; requestAnimationFrame(sync); } }
  measure();
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',measure);
  if(window.ResizeObserver) new ResizeObserver(measure).observe(el);
  document.getElementById('beta-x').addEventListener('click',function(){
    try{ localStorage.setItem(KEY,'true'); }catch(e){}
    window.removeEventListener('scroll',onScroll); window.removeEventListener('resize',measure);
    el.remove();
    root.style.setProperty('--beta-h','0px'); root.style.setProperty('--beta-off','0px');
  });
})();
