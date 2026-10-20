/* turning the main "Wojak button" toggle ON must show the button in every layout.
   Before, Simple/Focus layout also needed a second, buried "Show Wojak" switch (off by default). */
(function(){
  document.addEventListener('change',function(e){
    var t=e.target;if(!t||t.id!=='set-agent-btn'||!t.checked)return;
    try{
      if(typeof setFocusAgentVisible==='function')setFocusAgentVisible(true);
      var f=document.getElementById('set-focus-agent');if(f)f.checked=true;
    }catch(err){}
  },true);
})();
