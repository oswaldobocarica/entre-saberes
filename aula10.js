(()=>{
'use strict';
const cfg=window.ENTRE_SABERES_CONFIG;
if(!cfg||!window.supabase)return;
const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const KEY='entre-saberes-aula10-v1';
let state={attemptId:null,name:'',phone:'',questions:[],index:0};

function setStep(step){
  document.querySelectorAll('[data-step-indicator]').forEach(el=>el.classList.toggle('is-active',el.dataset.stepIndicator===step));
}
function show(id){
  ['#a10Case','#a10Register','#a10Quiz','#a10Finish','#a10Result','#a10Practical'].forEach(s=>{const el=$(s);if(el)el.hidden=s!==id});
  const map={'#a10Case':'case','#a10Register':'case','#a10Quiz':'quiz','#a10Finish':'quiz','#a10Result':'result','#a10Practical':'practical'};
  setStep(map[id]||'case');
  document.querySelector('#aula10')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function saveLocal(){localStorage.setItem(KEY,JSON.stringify({attemptId:state.attemptId,name:state.name,phone:state.phone,finalized:false}))}
function clearLocal(){localStorage.removeItem(KEY)}
async function auditRpc(name,args){try{const {error}=await sb.rpc(name,args);if(error)console.warn(name,error.message)}catch(err){console.warn(name,err)}}
function normalizeRows(data){
  return (data||[]).map(r=>({
    attemptId:r.tentativa_id,
    name:r.nome_aluno,
    order:Number(r.ordem),
    id:Number(r.questao_id),
    text:r.enunciado,
    options:{A:r.alternativa_a,B:r.alternativa_b,C:r.alternativa_c,D:r.alternativa_d},
    answer:r.resposta_marcada||null
  })).sort((a,b)=>a.order-b.order);
}
async function startQuiz(name,phone,quiet=false){
  const msg=$('#a10RegisterMsg');
  if(msg&&!quiet)msg.textContent='Preparando suas 10 questões...';
  const {data,error}=await sb.rpc('iniciar_quiz_aula10',{p_nome:name,p_telefone:phone});
  if(error){
    if(msg)msg.textContent=error.message||'Não foi possível iniciar a atividade.';
    if(!quiet)show('#a10Register');
    throw error;
  }
  const qs=normalizeRows(data);
  if(!qs.length)throw new Error('Nenhuma questão foi sorteada.');
  state={attemptId:qs[0].attemptId,name:qs[0].name||name,phone,questions:qs,index:0};
  const firstUnanswered=qs.findIndex(x=>!x.answer);
  state.index=firstUnanswered>=0?firstUnanswered:0;
  saveLocal();
  auditRpc('es_aula10_registrar_inicio',{p_tentativa_id:String(state.attemptId),p_nome:state.name,p_telefone:state.phone,p_questoes:state.questions});
  renderQuestion();
  show('#a10Quiz');
}
function renderQuestion(){
  const q=state.questions[state.index];
  if(!q)return;
  $('#a10QuestionCount').textContent=`Questão ${state.index+1} de ${state.questions.length}`;
  $('#a10Question').textContent=q.text;
  $('#a10MiniProgress').style.width=`${((state.index+1)/state.questions.length)*100}%`;
  $('#a10Options').innerHTML=Object.entries(q.options).map(([key,text])=>`<label class="aula10-option"><input type="radio" name="a10answer" value="${key}" ${q.answer===key?'checked':''}><span><strong>${key})</strong> ${esc(text)}</span></label>`).join('');
  $('#a10Prev').disabled=state.index===0;
  $('#a10Next').textContent=state.index===state.questions.length-1?'Revisar e finalizar →':'Próxima questão →';
  $('#a10QuizMsg').textContent='';
}
async function saveCurrent(){
  const selected=document.querySelector('input[name="a10answer"]:checked')?.value;
  if(!selected){$('#a10QuizMsg').textContent='Marque uma alternativa antes de continuar.';return false}
  const q=state.questions[state.index];
  const {error}=await sb.rpc('responder_quiz_aula10',{p_tentativa_id:state.attemptId,p_telefone:state.phone,p_questao_id:q.id,p_resposta:selected});
  if(error){$('#a10QuizMsg').textContent=error.message||'Não foi possível salvar sua resposta.';return false}
  q.answer=selected;
  auditRpc('es_aula10_registrar_resposta',{p_tentativa_id:String(state.attemptId),p_telefone:state.phone,p_questao_id:String(q.id),p_resposta:selected});
  return true;
}
async function finalize(){
  const btn=$('#a10FinishBtn'),msg=$('#a10FinishMsg');
  btn.disabled=true;msg.textContent='Corrigindo sua atividade...';
  const {data,error}=await sb.rpc('finalizar_quiz_aula10',{p_tentativa_id:state.attemptId,p_telefone:state.phone});
  btn.disabled=false;
  if(error){msg.textContent=error.message||'Não foi possível finalizar.';return}
  renderResult(data||[]);
  auditRpc('es_aula10_registrar_finalizacao',{p_tentativa_id:String(state.attemptId),p_telefone:state.phone,p_resultado:data||[]});
  localStorage.setItem(KEY,JSON.stringify({attemptId:state.attemptId,name:state.name,phone:state.phone,finalized:true}));
  show('#a10Result');
}
function renderResult(rows){
  if(!rows.length)return;
  const first=rows[0];
  const total=Number(first.total_questoes||10),hits=Number(first.total_acertos||0),percent=Number(first.percentual||0);
  $('#a10ScoreText').textContent=`${state.name}, você acertou ${hits} de ${total} questões.`;
  $('#a10ScorePercent').textContent=`${Number.isInteger(percent)?percent:percent.toFixed(2)}%`;
  $('#a10Review').innerHTML=rows.map(r=>{
    const ok=!!r.acertou;
    return `<details class="${ok?'is-correct':'is-wrong'}"><summary>Questão ${r.ordem} — ${ok?'Acertou ✓':'Revisar ✕'}</summary><p><strong>Enunciado:</strong> ${esc(r.enunciado)}</p><p><strong>Sua resposta:</strong> ${esc(r.resposta_aluno||'')}</p>${ok?'':`<p><strong>Resposta correta:</strong> ${esc(r.resposta_correta||'')}</p>`}<p><strong>Comentário:</strong> ${esc(r.explicacao||'')}</p></details>`;
  }).join('');
}
async function restore(){
  let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}
  if(!saved?.attemptId||!saved?.phone||!saved?.name)return;
  state.attemptId=saved.attemptId;state.phone=saved.phone;state.name=saved.name;
  if(saved.finalized){
    const {data,error}=await sb.rpc('finalizar_quiz_aula10',{p_tentativa_id:saved.attemptId,p_telefone:saved.phone});
    if(!error&&data?.length){renderResult(data);auditRpc('es_aula10_registrar_finalizacao',{p_tentativa_id:String(saved.attemptId),p_telefone:saved.phone,p_resultado:data});show('#a10Result')}
    return;
  }
  try{await startQuiz(saved.name,saved.phone,true)}catch{clearLocal()}
}

const read=$('#a10ReadConfirm'),cont=$('#a10Continue');
if(read&&cont){read.addEventListener('change',()=>{cont.disabled=!read.checked});cont.addEventListener('click',()=>show('#a10Register'))}
$('#a10RegisterForm')?.addEventListener('submit',async e=>{e.preventDefault();const name=$('#a10Name').value.trim(),phone=$('#a10Phone').value.trim();if(!name||!phone)return;try{await startQuiz(name,phone)}catch(err){console.error(err)}});
$('#a10Prev')?.addEventListener('click',()=>{if(state.index>0){state.index--;renderQuestion()}});
$('#a10Next')?.addEventListener('click',async()=>{if(!(await saveCurrent()))return;if(state.index<state.questions.length-1){state.index++;renderQuestion()}else{show('#a10Finish')}});
$('#a10FinishBtn')?.addEventListener('click',finalize);
$('#a10GoPractical')?.addEventListener('click',()=>show('#a10Practical'));

async function savePractical(tipo,textareaSel,statusSel){
  const box=$(textareaSel),msg=$(statusSel); if(!box||!msg)return;
  const texto=box.value.trim(); if(texto.length<10){msg.textContent='Escreva sua resposta antes de salvar.';return}
  if(!state.attemptId||!state.phone){msg.textContent='Conclua primeiro a atividade de 10 questões para vincular esta resposta.';return}
  msg.textContent='Salvando…';
  const {error}=await sb.rpc('es_aula10_registrar_pratica',{p_tentativa_id:String(state.attemptId),p_telefone:state.phone,p_tipo:tipo,p_texto:texto});
  msg.textContent=error?('Não foi possível salvar: '+error.message):'Resposta salva no portal. O administrador poderá consultá-la.';
}
$('#a10SaveEmail')?.addEventListener('click',()=>savePractical('email_eja','#a10EmailResponse','#a10EmailStatus'));
$('#a10SaveOuvidoria')?.addEventListener('click',()=>savePractical('ouvidoria','#a10OuvidoriaResponse','#a10OuvidoriaStatus'));
$('#a10OpenEmail')?.addEventListener('click',e=>{const t=$('#a10EmailResponse')?.value.trim();if(t)e.currentTarget.href='mailto:andreguarizo@gmail.com?cc=educacao%40franca.sp.gov.br&bcc=setoreja%40franca.sp.gov.br&subject='+encodeURIComponent('Como eu me sinto participando das aulas do EJA no Itinerário Auxiliar Administrativo do 1º Termo.')+'&body='+encodeURIComponent(t)});
$('#a10OpenOuvidoria')?.addEventListener('click',e=>{const t=$('#a10OuvidoriaResponse')?.value.trim();if(t)e.currentTarget.href='mailto:ouvidoria@franca.sp.leg.br?subject='+encodeURIComponent('Serviços de limpeza urbana no meu bairro')+'&body='+encodeURIComponent(t)});

restore().catch(console.error);
})();
