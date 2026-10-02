(()=>{
  'use strict';
  const cfg=window.ENTRE_SABERES_CONFIG,form=document.querySelector('#collaboratorForm'),msg=document.querySelector('#collabMsg'),ok=document.querySelector('#collabSuccess');
  if(!cfg||!window.supabase||!form)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
  const say=(t,bad=false)=>{msg.textContent=t;msg.className='status '+(bad?'error':'ok')};
  form.addEventListener('submit',async e=>{
    e.preventDefault();const name=document.querySelector('#collabName').value.trim(),email=document.querySelector('#collabEmail').value.trim(),password=document.querySelector('#collabPassword').value,confirm=document.querySelector('#collabConfirm').value;
    if(password!==confirm){say('As senhas não coincidem.',true);return}
    say('Criando sua conta...');
    const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:name,requested_role:'editor'}}});
    if(error){say(error.message,true);return}
    form.hidden=true;ok.hidden=false;
  });
})();
