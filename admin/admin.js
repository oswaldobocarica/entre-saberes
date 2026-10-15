const cfg=window.ENTRE_SABERES_CONFIG;
// Compatibilidade de autenticação: evita bloqueios de sessão entre abas/navegador.
const authLock=async (_name,_acquireTimeout,fn)=>await fn();
const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{
  auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:false,
    storageKey:'entre-saberes-cms-auth-v19',
    lock:authLock
  }
});
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const slugify=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,120);
let currentUser=null,currentProfile=null,currentPosts=[],categories=[],quill=null;
const OWNER_DELETE_EMAIL='oswaldobocarica@gmail.com';
let backendPermissions={checked:false,authenticated:false,email:'',papel:'',can_edit:false,can_delete:false,error:''};
let currentEditingPost=null;
function canDeleteAnything(){return backendPermissions.checked===true && backendPermissions.can_delete===true;}

const SYSTEM_VERSION='4.0';
const SYSTEM_UPDATES=[
  {version:'4.0',date:'02/10/2026',title:'Leitura adaptativa e fluxo editorial integrado',items:['Corrigida a largura disponivel ao lado do menu e a navegacao em monitores verticais.','Controle de texto de 50% a 200%, com passo de 1 ponto percentual.','Importacao de apostilas com historico, revisao e publicacao; requer configuracao dos servicos.','Comentarios com aprovacao, reprovacao e exclusao protegidas no servidor.','Compartilhamento social e acesso visivel a pesquisa SciELO, com cobertura bibliografica explicitada.','Mantidas as publicacoes, cursos e respostas de atividades das versoes anteriores.']},
  {version:'3.9',date:'30/09/2026',title:'Navegação, acessibilidade, respostas e pesquisa SciELO',items:['Padronizada a trilha de pão no alto das páginas e criado o botão Voltar ao topo no canto inferior direito.','Adicionados controles A−, A e A+ para redimensionamento persistente do texto e revisadas proporções tipográficas e responsividade.','Criado painel administrativo de respostas da Aula 10, com questões sorteadas, respostas, resultado e atividades práticas.','Criada pesquisa SciELO integrada, preservando a navegação do Entre Saberes.','Reforçada a proteção do painel administrativo com validação de perfil antes da abertura e encerramento automático por inatividade.']},
  {version:'3.7',date:'30/09/2026',title:'Teens Tech e gestão segura de editores',items:['Teens Tech ganhou uma página pública mais convidativa, com criações, Shorts, projetos, microcursos e percurso da ideia até a publicação.','A página inicial passou a destacar o novo núcleo Teens Tech para ampliar descoberta e engajamento.','Criado cadastro de colaborador sem privilégio automático: o proprietário promove editores posteriormente pelo e-mail da conta.','Adicionada gestão de Equipe Editorial no CMS, visível apenas para a conta proprietária.','Exclusões permanecem exclusivas de oswaldobocarica@gmail.com.']},
  {version:'3.6',date:'30/09/2026',title:'Eficiência, eficácia e efetividade do CMS',items:['Permissões críticas passaram a ser confirmadas pelo Supabase na sessão autenticada, e não apenas pelo e-mail exibido no navegador.','Dashboard ganhou diagnóstico de sessão: conta autenticada, perfil editorial, permissão de edição e permissão de exclusão.','Edição preserva o autor original da publicação, evitando troca involuntária de autoria ao salvar.','Corrigida a concorrência no carregamento de categorias durante a edição e reforçada a biblioteca de mídia para localizar arquivos em subpastas por data.','Exclusão continua reservada exclusivamente a oswaldobocarica@gmail.com.']},
  {version:'3.5.1',date:'30/09/2026',title:'Correção da conta proprietária e proteção de exclusão',items:['Corrigido o editor de publicações: o botão Editar volta a abrir e carregar o conteúdo existente.','Exclusões visíveis no CMS ficam restritas exclusivamente à conta oswaldobocarica@gmail.com.','Cursos Pagos passa a se chamar Cursos Livres e EJA-TEC passa a se chamar Aulas na interface.','Adicionados os núcleos Teens Tech, Senhores Professores e Ótica do Estado à navegação pública.']},
  {version:'3.4',date:'30/09/2026',title:'Recuperação dos cursos e editor resiliente',items:['Restabelecida a compatibilidade com os cursos livres criados nas versões anteriores.','O editor de publicações agora possui modo visual completo e um editor de contingência caso a biblioteca externa não carregue.','Cursos Livres passa a aparecer explicitamente no painel administrativo.','Preservadas publicações antigas, futuras publicações e edição direta.']},
  {version:'3.3',date:'30/09/2026',title:'Compatibilidade das publicações e carregamento robusto',items:['Corrigido o travamento em Carregando... ao abrir publicações antigas.','O portal agora aceita palavras-chave e estilos editoriais gravados em formatos de versões anteriores.','Adicionadas mensagens de erro visíveis e botão para tentar novamente, evitando telas indefinidamente carregando.','Atualizados cache e arquivos do Cloudflare para impedir mistura entre JavaScript antigo e páginas novas.']},
  {version:'3.2',date:'30/09/2026',title:'Administração e implantação Cloudflare',items:['Adicionado histórico de atualizações exclusivo para administradores.','O resumo da versão mais recente é apresentado ao administrador no primeiro acesso após a atualização.','Incluído _worker.js na raiz para implantação em Cloudflare Pages/Workers com Static Assets.','Mantida a edição dinâmica das publicações existentes e das futuras publicações armazenadas no Supabase.']},
  {version:'3.1',date:'30/09/2026',title:'Restauração funcional e dinâmica',items:['Restaurado o login protegido do painel administrativo.','Recuperada a leitura dinâmica das publicações do Supabase.','Restauradas Biblioteca, Memórias, busca, autores, categorias e navegação dinâmica.','Cursos Livres voltaram a abrir páginas individuais e a área EAD permaneceu integrada.']},
  {version:'2.7',date:'28/09/2026',title:'Edição direta e contextual',items:['Criados atalhos para editar publicação, curso e aula diretamente a partir do conteúdo.','Adicionado retorno ao conteúdo após a edição.']},
  {version:'2.6',date:'24/09/2026',title:'Gravação administrativa robusta',items:['Corrigido o salvamento administrativo de cursos, módulos, aulas, atividades e EJA-TEC.','Reforçadas as funções seguras de gravação no Supabase.']},
  {version:'2.5',date:'24/09/2026',title:'Base EAD e EJA-TEC',items:['Criadas estruturas para cursos livres, matrículas, progresso, atividades e materiais.','Criada administração de aulas e materiais do EJA-TEC.']},
  {version:'2.3',date:'22/09/2026',title:'Navegação lateral',items:['Adicionado menu lateral recolhível e adaptação para dispositivos móveis.']},
  {version:'2.0',date:'21/09/2026',title:'Navegação dinâmica',items:['Publicações passaram a alimentar páginas, categorias, autores e cursos dinamicamente.','Reduzida a dependência da página de busca para localizar conteúdos.']},
  {version:'1.9',date:'21/09/2026',title:'Identificação acadêmica e impressão',items:['Adicionados autor/pesquisador, vínculo, instituição, modalidade editorial e mês/ano.','Adicionadas impressão/PDF e referência acadêmica.']},
  {version:'1.8',date:'21/09/2026',title:'Pesquisa científica e ABNT',items:['Adicionados mecanismos de busca, caminho de pão e referência ABNT pronta para copiar.']},
  {version:'1.7',date:'21/09/2026',title:'Editor tipográfico',items:['Ampliadas fontes, tamanhos, cores e controles do editor.','Adicionada edição manual da data e do horário de publicação.']}
];

const adminQuery=new URLSearchParams(location.search);
let contextualReturnUrl=adminQuery.get('return')||'';
function setContextReturn(label='Voltar ao conteúdo'){
  const a=$('#contextReturn');if(!a)return;
  if(!contextualReturnUrl){a.hidden=true;return}
  a.hidden=false;a.textContent='← '+label;a.href=contextualReturnUrl;
}
function fillCourseEditor(c){
  if(!c)return;$('#courseId').value=c.id;$('#courseTitle').value=c.titulo||'';$('#courseDescription').value=c.descricao||'';$('#courseHours').value=c.carga_horaria||10;$('#courseImage').value=c.imagem_url||'';$('#courseStatus').value=c.status||'rascunho';$('#courseCertificate').checked=!!c.certificado_ativo;window.scrollTo({top:0,behavior:'smooth'});
}
function fillEjatecEditor(l){
  if(!l)return;$('#ejatecId').value=l.id;$('#ejatecTitle').value=l.titulo||'';$('#ejatecDiscipline').value=l.disciplina||'';$('#ejatecClass').value=l.turma||'';$('#ejatecModule').value=l.modulo||'';$('#ejatecDate').value=l.data_aula||'';$('#ejatecObjective').value=l.objetivo||'';$('#ejatecContent').value=l.conteudo||'';$('#ejatecActivity').value=l.atividade||'';$('#ejatecStatus').value=l.status||'rascunho';window.scrollTo({top:0,behavior:'smooth'});
}
async function handleAdminDeepLink(){
  const editId=adminQuery.get('edit'),courseId=adminQuery.get('course'),ejatecId=adminQuery.get('ejatec'),view=adminQuery.get('view');
  if(contextualReturnUrl)setContextReturn(editId?'Voltar à publicação':courseId?'Voltar ao curso':ejatecId?'Voltar às Aulas':'Voltar ao site');
  if(editId){
    const {data,error}=await sb.from('publications').select('*').eq('id',editId).maybeSingle();
    if(error||!data){notice('Não foi possível abrir esta publicação diretamente no editor.'+(error?' '+error.message:''),'error');showView('publications');return}
    await editPost(data);notice('Edição direta aberta. Ao salvar, esta mesma publicação será atualizada.');return;
  }
  if(courseId){
    showView('courses');await loadLearningAdmin();const c=lmsCourses.find(x=>x.id===courseId);if(c){fillCourseEditor(c);notice('Curso aberto diretamente para edição.')}else notice('Curso não encontrado para edição.','error');return;
  }
  if(ejatecId){
    showView('ejatec');await loadEjatecAdmin();const l=ejatecRows.find(x=>x.id===ejatecId);if(l){fillEjatecEditor(l);notice('Aula aberta diretamente para edição.')}else notice('Aula não encontrada.','error');return;
  }
  if(view&&['dashboard','publications','editor','media','categories','courses','students','ejatec','activity-responses','editors','updates','conversions','comments'].includes(view))showView(view);
}


const EDITOR_FONTS={
  georgia:'Georgia',merriweather:'Merriweather',lora:'Lora',playfair:'Playfair Display',montserrat:'Montserrat',opensans:'Open Sans',roboto:'Roboto',sourcesans:'Source Sans 3',serif:'Serifada',sans:'Sem serifa',monospace:'Monoespaçada'
};
const FIELD_DEFAULTS={
  title:{font:'georgia',size:'52',align:'left',color:'#202a33'},
  subtitle:{font:'sourcesans',size:'22',align:'left',color:'#5c6872'},
  summary:{font:'sourcesans',size:'18',align:'left',color:'#40515e'}
};
function cssFont(key){return ({georgia:"Georgia,serif",merriweather:"'Merriweather',serif",lora:"'Lora',serif",playfair:"'Playfair Display',serif",montserrat:"'Montserrat',sans-serif",opensans:"'Open Sans',sans-serif",roboto:"Roboto,sans-serif",sourcesans:"'Source Sans 3',sans-serif",serif:"Georgia,'Times New Roman',serif",sans:"Arial,Helvetica,sans-serif",monospace:"'Courier New',monospace"})[key]||"Georgia,serif"}
function initFieldStyleControls(){
  document.querySelectorAll('[data-style-field]').forEach(box=>{
    const name=box.dataset.styleField,def=FIELD_DEFAULTS[name];
    const fs=box.querySelector('[data-style="font"]');
    fs.innerHTML=Object.entries(EDITOR_FONTS).map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
    const ss=box.querySelector('[data-style="size"]');
    const sizes=name==='title'?[32,36,40,44,48,52,60,68]:name==='subtitle'?[16,18,20,22,24,28,32]:[14,16,18,20,22,24];
    ss.innerHTML=sizes.map(v=>`<option value="${v}">${v} px</option>`).join('');
    fs.value=def.font;ss.value=def.size;box.querySelector('[data-style="align"]').value=def.align;box.querySelector('[data-style="color"]').value=def.color;
    box.querySelectorAll('[data-style]').forEach(ctrl=>ctrl.addEventListener('change',()=>applyFieldStyle(name)));
    applyFieldStyle(name);
  });
}
function styleTarget(name){return name==='title'?$('#postTitle'):name==='subtitle'?$('#postSubtitle'):$('#postSummary')}
function getFieldStyles(){const out={};document.querySelectorAll('[data-style-field]').forEach(box=>{const n=box.dataset.styleField;out[n]={font:box.querySelector('[data-style="font"]').value,size:box.querySelector('[data-style="size"]').value,align:box.querySelector('[data-style="align"]').value,color:box.querySelector('[data-style="color"]').value}});return out}
function setFieldStyles(styles={}){document.querySelectorAll('[data-style-field]').forEach(box=>{const n=box.dataset.styleField,v={...FIELD_DEFAULTS[n],...(styles[n]||{})};box.querySelector('[data-style="font"]').value=v.font;box.querySelector('[data-style="size"]').value=String(v.size);box.querySelector('[data-style="align"]').value=v.align;box.querySelector('[data-style="color"]').value=v.color;applyFieldStyle(n)})}
function applyFieldStyle(name){const box=document.querySelector(`[data-style-field="${name}"]`),t=styleTarget(name);if(!box||!t)return;t.style.fontFamily=cssFont(box.querySelector('[data-style="font"]').value);t.style.fontSize=box.querySelector('[data-style="size"]').value+'px';t.style.textAlign=box.querySelector('[data-style="align"]').value;t.style.color=box.querySelector('[data-style="color"]').value}
function addToolbarTooltips(){
  const map={'.ql-bold':'Negrito','.ql-italic':'Itálico','.ql-underline':'Sublinhado','.ql-strike':'Tachado','.ql-color':'Cor do texto','.ql-background':'Cor de fundo','.ql-align':'Alinhamento','.ql-list[value="ordered"]':'Lista numerada','.ql-list[value="bullet"]':'Lista com marcadores','.ql-indent[value="-1"]':'Diminuir recuo','.ql-indent[value="+1"]':'Aumentar recuo','.ql-blockquote':'Citação em bloco','.ql-code-block':'Bloco de código','.ql-link':'Inserir link','.ql-image':'Inserir imagem','.ql-clean':'Limpar formatação','.ql-font':'Fonte','.ql-size':'Tamanho da fonte','.ql-header':'Título / subtítulo'};
  Object.entries(map).forEach(([sel,title])=>document.querySelectorAll(`#view-editor ${sel}`).forEach(el=>{el.title=title;el.setAttribute('aria-label',title)}));
}
function abntAuthor(name){const parts=String(name||'ENTRE SABERES').trim().split(/\s+/);if(parts.length<2)return parts[0].toUpperCase();const last=parts.pop().toUpperCase();return `${last}, ${parts.join(' ')}`}
function articleCitation(p){if(!p?.titulo)return 'Salve a publicação para visualizar a referência.';const author=abntAuthor(p.autor_nome||$('#postAuthorName')?.value||currentProfile?.nome||'Entre Saberes');const year=new Date(p.publicado_em||Date.now()).getFullYear();const url=`${location.origin}/article.html?id=${encodeURIComponent(p.id||'')}`;return `${author}. ${p.titulo}. Entre Saberes, Franca, ${year}. Disponível em: ${url}. Acesso em: ${new Date().toLocaleDateString('pt-BR')}.`}
function updateCitationPreview(p){const el=$('#citationPreview');if(el)el.textContent=articleCitation(p||{id:$('#postId').value,titulo:$('#postTitle').value,publicado_em:publishedAtIso(),autor_nome:$('#postAuthorName')?.value||currentProfile?.nome})}


function notice(text,type='ok'){const el=$('#globalMsg');el.innerHTML=`<div class="notice ${type==='error'?'error':''}">${esc(text)}</div>`;setTimeout(()=>el.innerHTML='',5000)}
function status(el,text,ok=false){el.textContent=text;el.className='status '+(ok?'ok':'error')}
function renderSessionHealth(){
  const set=(id,value,cls='')=>{const el=$(id);if(!el)return;el.textContent=value;el.className='cms-health-value '+cls};
  set('#healthConnection',backendPermissions.checked?'Conectado':'Verificando…',backendPermissions.checked?'ok':'warn');
  set('#healthEmail',backendPermissions.email||currentUser?.email||'—');
  set('#healthRole',backendPermissions.papel||currentProfile?.papel||'—');
  set('#healthEdit',backendPermissions.can_edit?'Autorizada':'Não confirmada',backendPermissions.can_edit?'ok':'warn');
  set('#healthDelete',backendPermissions.can_delete?'AUTORIZADA — conta proprietária':'Bloqueada',backendPermissions.can_delete?'ok':'locked');
  const detail=$('#healthDetail');
  if(detail) detail.textContent=backendPermissions.error?`Diagnóstico: ${backendPermissions.error}`:`Permissões validadas na sessão autenticada do portal. A exclusão é exclusiva de ${OWNER_DELETE_EMAIL}.`;
}
async function refreshBackendPermissions(showMessage=false){
  backendPermissions={checked:false,authenticated:!!currentUser,email:String(currentUser?.email||'').trim().toLowerCase(),papel:currentProfile?.papel||'',can_edit:false,can_delete:false,error:''};
  renderSessionHealth();
  try{
    const {data,error}=await sb.rpc('es_admin_session_health');
    if(error)throw error;
    const d=(data&&typeof data==='object')?data:{};
    backendPermissions={checked:true,authenticated:!!d.authenticated,email:String(d.email||currentUser?.email||'').trim().toLowerCase(),papel:String(d.papel||currentProfile?.papel||''),can_edit:d.can_edit===true,can_delete:d.can_delete===true,error:''};
    if(backendPermissions.can_delete && backendPermissions.email!==OWNER_DELETE_EMAIL){
      backendPermissions.can_delete=false;
      backendPermissions.error='O banco retornou uma autorização de exclusão incompatível com a conta proprietária esperada. Exclusão bloqueada por segurança.';
    }
  }catch(err){
    backendPermissions.checked=true;
    backendPermissions.can_edit=['administrador','editor'].includes(String(currentProfile?.papel||'').toLowerCase());
    backendPermissions.can_delete=false;
    backendPermissions.error='A validação segura de permissões não respondeu. Execute a MIGRACAO_V37_TEENS_EDITORES.sql. Detalhe: '+(err?.message||String(err));
  }
  renderSessionHealth();
  configureOwnerControls();
  if(currentPosts.length)renderPostRows(currentPosts);
  if($('#deleteBtn'))$('#deleteBtn').hidden=!canDeleteAnything();
  if(showMessage)notice(backendPermissions.error||'Diagnóstico de sessão atualizado.',backendPermissions.error?'error':'ok');
  return backendPermissions;
}
$('#refreshHealth')?.addEventListener('click',()=>refreshBackendPermissions(true));
function showLogin(){$('#loginView').hidden=false;$('#panelView').hidden=true}
function showView(name){if(name==='comments'&&!isAdministrator())return;if(name==='updates'&&!isAdministrator())return;if(name==='editors'&&!canDeleteAnything())return;$$('.cms-view').forEach(v=>v.hidden=true);const target=$(`#view-${name}`);if(!target)return;target.hidden=false;$$('.cms-sidebar button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$('#pageTitle').textContent=({dashboard:'Dashboard',publications:'Publicações',editor:'Editor de publicação',media:'Mídia e arquivos',categories:'Categorias',courses:'Cursos Livres',students:'Alunos e matrículas',ejatec:'Aulas','activity-responses':'Respostas das atividades',editors:'Equipe editorial',conversions:'Importar apostila',comments:'Comentários',updates:'Atualizações do sistema'})[name]||'Painel';if(name==='dashboard'){refreshStats();renderSessionHealth();}if(name==='publications')loadPosts();if(name==='media')loadMedia();if(name==='categories')loadCategoriesAdmin();if(name==='editor'&&!$('#postId')?.value)loadCategoryChecks();if(name==='courses')loadLearningAdmin();if(name==='students')loadStudentAdmin();if(name==='ejatec')loadEjatecAdmin();if(name==='activity-responses')loadActivityResponses();if(name==='editors')loadEditors();if(name==='updates')renderUpdateLog();if(['conversions','comments'].includes(name))window.ESAdmin40?.open(name)}


const ADMIN_IDLE_MS=30*60*1000; let adminIdleTimer=null;
function resetAdminIdle(){if(adminIdleTimer)clearTimeout(adminIdleTimer);if(!currentUser)return;adminIdleTimer=setTimeout(async()=>{try{await sb.auth.signOut({scope:'local'})}catch{}try{sessionStorage.setItem('entre-saberes-admin-timeout','1')}catch{}location.reload()},ADMIN_IDLE_MS)}
['pointerdown','keydown','touchstart','scroll'].forEach(ev=>window.addEventListener(ev,resetAdminIdle,{passive:true}));
try{if(sessionStorage.getItem('entre-saberes-admin-timeout')==='1'){sessionStorage.removeItem('entre-saberes-admin-timeout');setTimeout(()=>status($('#loginMsg'),'Sessão administrativa encerrada por segurança após 30 minutos sem atividade.'),50)}}catch{}

async function boot(){
  try{
    const result=await Promise.race([sb.auth.getSession(),timeout(6000)]);
    const session=result?.data?.session||null;
    if(session) openPanel(session.user); else showLogin();
  }catch(err){
    showLogin();
    status($('#loginMsg'),'Sessão anterior não pôde ser restaurada. Entre novamente.');
  }
}

$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const el=$('#loginMsg');
  const email=$('#email').value.trim();
  const password=$('#password').value;
  status(el,'Entrando…',true);
  try{
    const result=await Promise.race([
      sb.auth.signInWithPassword({email,password}),
      timeout(12000)
    ]);
    const {data,error}=result||{};
    if(error){status(el,'Não foi possível entrar: '+error.message);return}
    if(!data?.user){status(el,'Login realizado, mas o usuário não foi retornado.');return}
    status(el,'Acesso autorizado.',true);
    openPanel(data.user);
  }catch(err){
    const msg=err?.message==='tempo excedido'
      ? 'A autenticação demorou demais. Feche outras abas do painel e tente novamente.'
      : 'Erro de conexão: '+(err?.message||String(err));
    status(el,msg);
  }
});

$('#logout').onclick=async()=>{
  try{await Promise.race([sb.auth.signOut({scope:'local'}),timeout(5000)])}catch{}
  try{localStorage.removeItem('entre-saberes-cms-auth-v19')}catch{}
  location.reload();
};

function timeout(ms){return new Promise((_,reject)=>setTimeout(()=>reject(new Error('tempo excedido')),ms))}
function isAdministrator(){return ['administrador','admin'].includes(String(currentProfile?.papel||'').toLowerCase())}
function renderUpdateEntry(u,current=false){return `<article class="cms-update-item ${current?'cms-update-current':''}"><div class="cms-update-head"><div><span class="cms-badge ${current?'ok':''}">v${esc(u.version)}</span><h4>${esc(u.title)}</h4></div><span class="cms-update-date">${esc(u.date)}</span></div><ul>${u.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul></article>`}
function renderUpdateLog(){const box=$('#updateLogList');if(!box)return;box.innerHTML=SYSTEM_UPDATES.map((u,i)=>renderUpdateEntry(u,i===0)).join('')}
function configureAdminUpdates(){const commentsNav=document.querySelector("#commentsNav");if(commentsNav)commentsNav.hidden=!isAdministrator();const nav=$('#updatesNav');if(nav)nav.hidden=!isAdministrator();if(isAdministrator())renderUpdateLog()}
function configureOwnerControls(){const nav=$('#editorsNav');if(nav)nav.hidden=!canDeleteAnything();if(!canDeleteAnything()&&$('#view-editors')&&!$('#view-editors').hidden)showView('dashboard')}
function maybeShowUpdateModal(){if(!isAdministrator())return;const key=`entre-saberes-update-seen-${SYSTEM_VERSION}`;if(localStorage.getItem(key)==='1')return;const modal=$('#updateModal'),body=$('#updateModalBody');if(!modal||!body)return;body.innerHTML=renderUpdateEntry(SYSTEM_UPDATES[0],true);modal.hidden=false}
function acknowledgeUpdate(){try{localStorage.setItem(`entre-saberes-update-seen-${SYSTEM_VERSION}`,'1')}catch{}const modal=$('#updateModal');if(modal)modal.hidden=true}
$('#closeUpdateModal')?.addEventListener('click',acknowledgeUpdate);
$('#ackUpdateModal')?.addEventListener('click',acknowledgeUpdate);
$('#openAllUpdates')?.addEventListener('click',()=>{acknowledgeUpdate();showView('updates')});
$('#updateModal')?.addEventListener('click',e=>{if(e.target.id==='updateModal')acknowledgeUpdate()});

async function verifyProfile(user){
  try{
    const req=sb.from('profiles').select('id,nome,papel,ativo').eq('id',user.id).maybeSingle();
    const {data,error}=await Promise.race([req,timeout(6000)]);
    if(error) throw error;
    if(!data||data.ativo!==true||!['administrador','admin','editor'].includes(String(data.papel||'').toLowerCase())) return false;
    currentProfile=data; $('#who').textContent=`${data.nome||user.email} • ${data.papel}`; configureAdminUpdates(); if(isAdministrator())setTimeout(maybeShowUpdateModal,180); return true;
  }catch(err){console.error('Falha ao validar perfil',err);return false}
}

async function openPanel(user){
  currentUser=user; currentProfile=null;
  $('#loginView').hidden=true; $('#panelView').hidden=false; $('#who').textContent=`${user.email} • validando acesso…`;
  const allowed=await verifyProfile(user);
  if(!allowed){try{await sb.auth.signOut({scope:'local'})}catch{} currentUser=null; currentProfile=null; $('#panelView').hidden=true; $('#loginView').hidden=false; status($('#loginMsg'),'A conta foi autenticada, mas não possui perfil administrativo/editor ativo.'); return}
  initQuill(); initFieldStyleControls(); showView('dashboard'); resetAdminIdle(); loadCategoriesBase().catch(()=>{}); await refreshBackendPermissions().catch(()=>{}); setTimeout(()=>handleAdminDeepLink().catch(err=>notice('Falha ao abrir a edição direta: '+(err?.message||String(err)),'error')),0);
}

let fallbackEditorActive=false;
function initFallbackEditor(reason='Editor visual externo indisponível'){
  fallbackEditorActive=true;
  const rich=$('#richEditor'),fb=$('#richEditorFallback'),msg=$('#editorEngineMsg');
  if(rich)rich.hidden=true;if(fb)fb.hidden=false;
  if(msg)msg.textContent=reason+'; o editor interno foi ativado automaticamente.';
  if(!fb||document.querySelector('.cms-fallback-toolbar'))return;
  const bar=document.createElement('div');bar.className='cms-fallback-toolbar';
  bar.innerHTML=`<select data-fb="formatBlock" title="Parágrafo / título"><option value="p">Parágrafo</option><option value="h2">Título 2</option><option value="h3">Título 3</option><option value="blockquote">Citação</option></select><select data-fb-font title="Fonte"><option value="Georgia">Georgia</option><option value="Merriweather">Merriweather</option><option value="Lora">Lora</option><option value="Arial">Arial</option><option value="Montserrat">Montserrat</option><option value="Roboto">Roboto</option></select><button type="button" data-cmd="bold" title="Negrito"><b>B</b></button><button type="button" data-cmd="italic" title="Itálico"><i>I</i></button><button type="button" data-cmd="underline" title="Sublinhado"><u>U</u></button><button type="button" data-cmd="justifyLeft" title="Alinhar à esquerda">☰</button><button type="button" data-cmd="justifyCenter" title="Centralizar">≡</button><button type="button" data-cmd="justifyFull" title="Justificar">☷</button><button type="button" data-cmd="insertOrderedList" title="Lista numerada">1.</button><button type="button" data-cmd="insertUnorderedList" title="Lista com marcadores">•</button><input type="color" data-fb-color title="Cor do texto"><button type="button" data-cmd="createLink" title="Inserir link">🔗</button><button type="button" data-cmd="removeFormat" title="Limpar formatação">Tx</button>`;
  fb.parentNode.insertBefore(bar,fb);
  bar.querySelectorAll('[data-cmd]').forEach(b=>b.addEventListener('click',()=>{fb.focus();let val=null;if(b.dataset.cmd==='createLink')val=prompt('Endereço do link (https://...)')||null;document.execCommand(b.dataset.cmd,false,val)}));
  bar.querySelector('[data-fb="formatBlock"]')?.addEventListener('change',e=>{fb.focus();document.execCommand('formatBlock',false,e.target.value)});
  bar.querySelector('[data-fb-font]')?.addEventListener('change',e=>{fb.focus();document.execCommand('fontName',false,e.target.value)});
  bar.querySelector('[data-fb-color]')?.addEventListener('input',e=>{fb.focus();document.execCommand('foreColor',false,e.target.value)});
}
function initQuill(){
  if(quill||fallbackEditorActive)return;
  if(!window.Quill){initFallbackEditor('A biblioteca Quill não carregou');return;}
  try{
    const Font=Quill.import('formats/font');
    Font.whitelist=['serif','sans','georgia','merriweather','lora','playfair','montserrat','opensans','roboto','sourcesans','monospace'];
    Quill.register(Font,true);
    const Size=Quill.import('attributors/style/size');
    Size.whitelist=['12px','14px','16px','18px','20px','24px','28px','32px','40px','48px'];
    Quill.register(Size,true);
    quill=new Quill('#richEditor',{
      theme:'snow',placeholder:'Escreva o conteúdo aqui…',
      modules:{toolbar:[
        [{'font':Font.whitelist}],[{'size':Size.whitelist}],[{'header':[1,2,3,4,false]}],
        ['bold','italic','underline','strike'],[{'color':[]},{'background':[]}],[{'align':[]}],
        [{'list':'ordered'},{'list':'bullet'}],[{'indent':'-1'},{'indent':'+1'}],['blockquote','code-block'],['link','image'],['clean']
      ]}
    });
    const msg=$('#editorEngineMsg');if(msg)msg.textContent='Editor visual completo ativo.';
    addToolbarTooltips();
  }catch(err){console.error('Falha ao iniciar editor visual',err);initFallbackEditor('Falha ao iniciar o editor visual');}
}
function editorClear(){if(quill){quill.setText('');quill.history?.clear?.();}else if($('#richEditorFallback'))$('#richEditorFallback').innerHTML='';}
function editorSetHtml(html=''){if(quill){if(html&&/<[^>]+>/.test(html))quill.root.innerHTML=html;else quill.setText(html||'');}else{initFallbackEditor();$('#richEditorFallback').innerHTML=html||'';}}
function editorGetHtml(){if(quill){const h=quill.root.innerHTML;return h==='<p><br></p>'?'':h;}return ($('#richEditorFallback')?.innerHTML||'').trim();}
function editorInsertHtml(html){if(quill){const r=quill.getSelection(true)||{index:quill.getLength()};quill.clipboard.dangerouslyPasteHTML(r.index,html,'user');}else{initFallbackEditor();const fb=$('#richEditorFallback');fb.focus();document.execCommand('insertHTML',false,html);}}

$$('.cms-sidebar button[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));
$('#quickNew').onclick=()=>newPost();
document.addEventListener('click',e=>{if(e.target.closest('[data-open-editor]'))newPost();const b=e.target.closest('[data-view-jump]');if(b)showView(b.dataset.viewJump)});

async function refreshStats(){const [a,b,c]=await Promise.all([sb.from('publications').select('*',{count:'exact',head:true}),sb.from('publications').select('*',{count:'exact',head:true}).eq('status','publicado'),sb.from('publications').select('*',{count:'exact',head:true}).eq('status','rascunho')]);$('#statTotal').textContent=a.count??0;$('#statPublished').textContent=b.count??0;$('#statDrafts').textContent=c.count??0;try{const {data}=await sb.storage.from(cfg.mediaBucket).list('cms',{limit:1000});$('#statMedia').textContent=data?.length??0}catch{$('#statMedia').textContent='—'}}

async function loadPosts(){const {data,error}=await sb.from('publications').select('*').order('atualizado_em',{ascending:false}).limit(200);if(error){notice(error.message,'error');return}currentPosts=data||[];renderPostRows(currentPosts)}
function renderPostRows(rows){$('#postRows').innerHTML=rows.map(p=>`<tr><td><strong>${esc(p.titulo)}</strong><br><small>${esc(p.slug||'')}</small></td><td>${esc((p.tipo||'').replaceAll('_',' '))}</td><td>${esc(p.status||'')}</td><td>${p.atualizado_em?new Date(p.atualizado_em).toLocaleString('pt-BR'):''}</td><td><div class="cms-actions"><button class="button secondary" data-edit="${p.id}">Editar</button><button class="button secondary" data-preview="${p.id}">Ver</button>${canDeleteAnything()?`<button class="button danger" data-delete="${p.id}">Excluir</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="5">Nenhuma publicação.</td></tr>'}
$('#postSearch').oninput=e=>{const q=e.target.value.toLowerCase().trim();renderPostRows(currentPosts.filter(p=>!q||`${p.titulo} ${p.resumo||''} ${p.tipo||''}`.toLowerCase().includes(q)))};
document.addEventListener('click',async e=>{const edit=e.target.closest('[data-edit]');if(edit){const p=currentPosts.find(x=>x.id===edit.dataset.edit);if(p)await editPost(p)}const prev=e.target.closest('[data-preview]');if(prev)window.open(`../article.html?id=${encodeURIComponent(prev.dataset.preview)}&preview=1`,'_blank');const del=e.target.closest('[data-delete]');if(del&&!canDeleteAnything()){notice('Exclusão bloqueada: somente a conta proprietária pode excluir conteúdos.','error');return}if(del&&confirm('Excluir esta publicação?')){const {error}=await sb.from('publications').delete().eq('id',del.dataset.delete);if(error)notice(error.message,'error');else{notice('Publicação excluída.');loadPosts()}}});

function toLocalDateTimeInput(value){
  if(!value)return '';
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return '';
  const pad=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function publishedAtIso(){
  const value=$('#postPublishedAt').value;
  if(!value)return null;
  const d=new Date(value);
  return Number.isNaN(d.getTime())?null:d.toISOString();
}

function clearEditor(){currentEditingPost=null;$('#postId').value='';$('#postTitle').value='';$('#postSubtitle').value='';$('#postSummary').value='';$('#postType').value='artigo';$('#postAuthorName').value=currentProfile?.nome||currentUser?.email||'';$('#postCourseName').value='';$('#postEditorialMode').value='';$('#postAffiliationType').value='independente';$('#postInstitution').value='';$('#postPeriod').value='';toggleInstitution();$('#postStatus').value='rascunho';$('#postFeatured').checked=false;$('#postPublishedAt').value='';$('#postKeywords').value='';$('#coverUrl').value='';$('#coverPreview').hidden=true;editorClear();$('#deleteBtn').hidden=true;setFieldStyles({});updateCitationPreview();$$('#categoryChecks input').forEach(x=>x.checked=false)}
async function newPost(){clearEditor();showView('editor')}
async function editPost(p){clearEditor();currentEditingPost=p;$('#postId').value=p.id;$('#postTitle').value=p.titulo||'';$('#postSubtitle').value=p.subtitulo||'';$('#postSummary').value=p.resumo||'';setFieldStyles(normalizeStyleAdmin(p.estilo_editorial));$('#postType').value=p.tipo||'artigo';$('#postAuthorName').value=p.autor_nome||currentProfile?.nome||'';$('#postCourseName').value=p.curso_nome||'';$('#postEditorialMode').value=p.modalidade_editorial||'';$('#postAffiliationType').value=p.vinculo_tipo||'independente';$('#postInstitution').value=p.instituicao||'';$('#postPeriod').value=p.periodo_publicacao||'';toggleInstitution();$('#postStatus').value=p.status||'rascunho';$('#postFeatured').checked=!!p.destaque;$('#postPublishedAt').value=toLocalDateTimeInput(p.publicado_em);$('#postKeywords').value=normalizeKeywordsAdmin(p.palavras_chave).join(', ');$('#coverUrl').value=p.imagem_capa||'';updateCoverPreview();if(p.conteudo)editorSetHtml(p.conteudo);$('#deleteBtn').hidden=!canDeleteAnything();showView('editor');updateCitationPreview(p);await loadCategoryChecks(p.id)}

$('#postForm').addEventListener('submit',async e=>{e.preventDefault();status($('#saveMsg'),'Salvando…',true);const id=$('#postId').value,title=$('#postTitle').value.trim();if(!title){status($('#saveMsg'),'Informe o título.');return}const html=editorGetHtml();const payload={titulo:title,subtitulo:$('#postSubtitle').value.trim()||null,resumo:$('#postSummary').value.trim()||null,conteudo:html||null,tipo:$('#postType').value,status:$('#postStatus').value,imagem_capa:$('#coverUrl').value.trim()||null,palavras_chave:$('#postKeywords').value.split(',').map(x=>x.trim()).filter(Boolean),destaque:$('#postFeatured').checked,autor_id:currentEditingPost?.autor_id||currentUser.id,autor_nome:$('#postAuthorName').value.trim()||currentProfile?.nome||currentUser.email,curso_nome:$('#postCourseName').value.trim()||null,modalidade_editorial:$('#postEditorialMode').value.trim()||null,vinculo_tipo:$('#postAffiliationType').value,instituicao:$('#postAffiliationType').value==='instituicao'?($('#postInstitution').value.trim()||null):null,periodo_publicacao:$('#postPeriod').value||null,estilo_editorial:getFieldStyles(),atualizado_em:new Date().toISOString()};if(!id)payload.slug=slugify(title)+'-'+Date.now().toString().slice(-6);const chosenPublishedAt=publishedAtIso();
if(payload.status==='publicado'){
  payload.publicado_em=chosenPublishedAt || (id && (currentEditingPost?.publicado_em||currentPosts.find(x=>x.id===id)?.publicado_em)) || new Date().toISOString();
}else if(chosenPublishedAt){
  payload.publicado_em=chosenPublishedAt;
}let saved,error;if(id){({data:saved,error}=await sb.from('publications').update(payload).eq('id',id).select().single())}else{({data:saved,error}=await sb.from('publications').insert(payload).select().single())}if(error){status($('#saveMsg'),'Erro: '+error.message);return}await saveCategoryRelations(saved.id);currentEditingPost=saved;$('#postId').value=saved.id;$('#deleteBtn').hidden=!canDeleteAnything();status($('#saveMsg'),'Publicação salva.',true);notice('Publicação salva com sucesso.');updateCitationPreview(saved);await loadPosts()});
$('#previewBtn').onclick=()=>{const id=$('#postId').value;if(!id){status($('#saveMsg'),'Salve a publicação antes de visualizar.');return}window.open(`../article.html?id=${encodeURIComponent(id)}&preview=1`,'_blank')};
$('#deleteBtn').onclick=async()=>{const id=$('#postId').value;if(!canDeleteAnything()){status($('#saveMsg'),'Exclusão bloqueada: somente a conta proprietária pode excluir conteúdos.');return}if(!id||!confirm('Excluir esta publicação?'))return;const {error}=await sb.from('publications').delete().eq('id',id);if(error)status($('#saveMsg'),error.message);else{notice('Publicação excluída.');clearEditor();showView('publications')}};

async function loadCategoriesBase(){const {data}=await sb.from('categories').select('*').order('nome');categories=data||[]}
async function loadCategoryChecks(postId){await loadCategoriesBase();let selected=[];if(postId){const {data}=await sb.from('publication_categories').select('category_id').eq('publication_id',postId);selected=(data||[]).map(x=>x.category_id)}$('#categoryChecks').innerHTML=categories.map(c=>`<label><input type="checkbox" value="${c.id}" ${selected.includes(c.id)?'checked':''}> <span>${esc(c.nome)}</span></label>`).join('')||'<p>Nenhuma categoria.</p>'}
async function saveCategoryRelations(postId){try{await sb.from('publication_categories').delete().eq('publication_id',postId);const ids=$$('#categoryChecks input:checked').map(x=>x.value);if(ids.length){const {error}=await sb.from('publication_categories').insert(ids.map(category_id=>({publication_id:postId,category_id})));if(error)console.warn(error)}}catch(e){console.warn(e)}}

async function loadCategoriesAdmin(){await loadCategoriesBase();$('#categoryList').innerHTML=categories.map(c=>`<div class="cms-category-item"><div><strong>${esc(c.nome)}</strong>${c.descricao?`<br><small>${esc(c.descricao)}</small>`:''}</div></div>`).join('')||'<p>Nenhuma categoria.</p>'}
$('#categoryForm').addEventListener('submit',async e=>{e.preventDefault();const nome=$('#categoryName').value.trim(),descricao=$('#categoryDescription').value.trim()||null;const {error}=await sb.from('categories').insert({nome,slug:slugify(nome),descricao});if(error)notice(error.message,'error');else{$('#categoryName').value='';$('#categoryDescription').value='';notice('Categoria adicionada.');loadCategoriesAdmin()}});

function safeFileName(name){const dot=name.lastIndexOf('.'),ext=dot>=0?name.slice(dot).toLowerCase():'';const base=(dot>=0?name.slice(0,dot):name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/(^-|-$)/g,'').slice(0,80)||'arquivo';return base+ext}
async function uploadFile(file,folder='cms'){const path=`${folder}/${new Date().toISOString().slice(0,10)}/${Date.now()}-${safeFileName(file.name)}`;const {error}=await sb.storage.from(cfg.mediaBucket).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});if(error)throw error;const {data}=sb.storage.from(cfg.mediaBucket).getPublicUrl(path);return {path,url:data.publicUrl,name:file.name,type:file.type,size:file.size}}

$('#coverUploadBtn').onclick=()=>$('#coverFile').click();
$('#coverFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{status($('#saveMsg'),'Enviando capa…',true);const up=await uploadFile(file,'cms/capas');$('#coverUrl').value=up.url;updateCoverPreview();status($('#saveMsg'),'Capa enviada.',true)}catch(err){status($('#saveMsg'),'Falha no upload: '+err.message)}};
$('#coverUrl').oninput=updateCoverPreview;
function updateCoverPreview(){const url=$('#coverUrl').value.trim();const img=$('#coverPreview');if(url){img.src=url;img.hidden=false}else img.hidden=true}

$('#insertMediaBtn').onclick=()=>$('#inlineFile').click();
$('#inlineFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{notice('Enviando arquivo…');const up=await uploadFile(file,'cms/conteudo');if(file.type.startsWith('image/'))editorInsertHtml(`<p><img src="${esc(up.url)}" alt="${esc(file.name)}" style="max-width:100%;height:auto"></p>`);else{const wrapper=`../arquivo.html?url=${encodeURIComponent(up.url)}&nome=${encodeURIComponent(file.name)}`;editorInsertHtml(`<p><a href="${esc(wrapper)}">📎 ${esc(file.name)}</a></p>`);}notice('Arquivo inserido no conteúdo.')}catch(err){notice('Falha no upload: '+err.message,'error')}e.target.value=''};

$('#mediaUpload').onchange=async e=>{const files=[...e.target.files];if(!files.length)return;let done=0;for(const file of files){try{$('#uploadProgress').textContent=`Enviando ${done+1}/${files.length}: ${file.name}`;await uploadFile(file,'cms/biblioteca');done++}catch(err){notice(`Falha em ${file.name}: ${err.message}`,'error')}}$('#uploadProgress').textContent=`${done} arquivo(s) enviado(s).`;e.target.value='';loadMedia()};
async function listStorageRecursive(prefix,depth=0){
  if(depth>3)return [];
  const {data,error}=await sb.storage.from(cfg.mediaBucket).list(prefix,{limit:1000,sortBy:{column:'created_at',order:'desc'}});
  if(error)throw error;
  let out=[];
  for(const item of data||[]){
    const path=prefix?`${prefix}/${item.name}`:item.name;
    if(item.id){
      const {data:urlData}=sb.storage.from(cfg.mediaBucket).getPublicUrl(path);
      out.push({name:item.name,path,url:urlData.publicUrl,metadata:item.metadata||{},created_at:item.created_at});
    }else if(item.name && item.name!=='.emptyFolderPlaceholder'){
      out=out.concat(await listStorageRecursive(path,depth+1));
    }
  }
  return out;
}
async function loadMedia(){
  const grid=$('#mediaGrid');grid.innerHTML='<p>Carregando…</p>';
  const folders=['cms/biblioteca','cms/conteudo','cms/capas'];let all=[];
  try{for(const folder of folders)all=all.concat(await listStorageRecursive(folder));}
  catch(err){grid.innerHTML=`<div class="notice error">Não foi possível carregar a biblioteca de mídia: ${esc(err?.message||String(err))}</div>`;return}
  const seen=new Set();all=all.filter(f=>!seen.has(f.path)&&seen.add(f.path));
  all.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  grid.innerHTML=all.map(f=>{const img=/\.(png|jpe?g|webp|gif|svg)$/i.test(f.name);return `<article class="cms-media-card"><div class="cms-media-thumb">${img?`<img src="${esc(f.url)}" alt="">`:'<div class="cms-media-icon">📄</div>'}</div><div class="cms-media-name" title="${esc(f.name)}">${esc(f.name)}</div><div class="cms-media-actions"><button class="button secondary" data-copy-url="${esc(f.url)}" title="Copiar endereço direto do arquivo">Copiar URL</button><a class="button secondary" href="../arquivo.html?url=${encodeURIComponent(f.url)}&nome=${encodeURIComponent(f.name)}" target="_blank" title="Abrir ficha pública com citação ABNT">Ficha / ABNT</a>${canDeleteAnything()?`<button class="button danger" data-remove-file="${esc(f.path)}">Excluir</button>`:''}</div></article>`}).join('')||'<p>Nenhum arquivo enviado.</p>';
  $('#statMedia').textContent=all.length;
}
function toggleInstitution(){const independent=$('#postAffiliationType')?.value==='independente';const wrap=$('#institutionWrap');if(wrap)wrap.hidden=independent;}
$('#postAffiliationType')?.addEventListener('change',toggleInstitution);
['postTitle','postSubtitle','postSummary','postPublishedAt','postAuthorName','postCourseName','postEditorialMode','postInstitution','postPeriod'].forEach(id=>$('#'+id)?.addEventListener('input',()=>updateCitationPreview()));

document.addEventListener('click',async e=>{const cp=e.target.closest('[data-copy-url]');if(cp){await navigator.clipboard.writeText(cp.dataset.copyUrl);notice('URL copiada.')}const rm=e.target.closest('[data-remove-file]');if(rm&&!canDeleteAnything()){notice('Exclusão bloqueada: somente a conta proprietária pode excluir arquivos.','error');return}if(rm&&confirm('Excluir este arquivo da biblioteca?')){const {error}=await sb.storage.from(cfg.mediaBucket).remove([rm.dataset.removeFile]);if(error)notice(error.message,'error');else{notice('Arquivo excluído.');loadMedia()}}});


// Cursos Livres, alunos/matrículas e Aulas
const LMS_PRICE=59.90;
function adminSlug(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,120)}
let lmsCourses=[],lmsModules=[],lmsLessons=[],ejatecRows=[];

async function checkLearningPermission(targetId){
  const el=$(targetId);
  if(!el)return true;
  try{
    const {data,error}=await sb.rpc('admin_learning_health');
    if(error)throw error;
    const ok=!!data?.can_manage;
    status(el, ok ? `Permissão confirmada: ${data?.papel||'administrador/editor'}.` : 'Seu login está ativo, mas a permissão de gravação EAD não foi confirmada.', ok);
    return ok;
  }catch(err){
    status(el,'Não foi possível validar a permissão: '+(err?.message||String(err)));
    return false;
  }
}

async function loadLearningAdmin(){
  checkLearningPermission('#learningPermissionMsg');
  const c=await sb.from('lms_courses').select('*').order('criado_em',{ascending:false});
  if(c.error){notice('Falha ao carregar cursos: '+c.error.message,'error');}
  lmsCourses=c.data||[];
  const m=await sb.from('lms_modules').select('*').order('posicao');lmsModules=m.data||[];
  const l=await sb.from('lms_lessons').select('*').order('posicao');lmsLessons=l.data||[];
  renderLearningAdmin();
}
function renderLearningAdmin(){
  if($('#courseList'))$('#courseList').innerHTML=lmsCourses.map(c=>`<div class="cms-mini-item"><div><strong>${esc(c.titulo)}</strong><br><span class="cms-badge ${c.status==='publicado'?'ok':'warn'}">${esc(c.status)}</span> <small>${c.carga_horaria} h • R$ 59,90</small></div><button class="button secondary" type="button" data-edit-course="${c.id}">Editar</button></div>`).join('')||'<p>Nenhum curso cadastrado.</p>';
  const courseOpts='<option value="">Selecione...</option>'+lmsCourses.map(c=>`<option value="${c.id}">${esc(c.titulo)}</option>`).join('');
  if($('#moduleCourse'))$('#moduleCourse').innerHTML=courseOpts;
  const moduleOpts='<option value="">Selecione...</option>'+lmsModules.map(m=>{const c=lmsCourses.find(x=>x.id===m.course_id);return `<option value="${m.id}">${esc(c?.titulo||'Curso')} → ${esc(m.titulo)}</option>`}).join('');
  if($('#lessonModule'))$('#lessonModule').innerHTML=moduleOpts;
  const lessonOpts='<option value="">Selecione...</option>'+lmsLessons.map(l=>{const m=lmsModules.find(x=>x.id===l.module_id),c=lmsCourses.find(x=>x.id===m?.course_id);return `<option value="${l.id}">${esc(c?.titulo||'Curso')} → ${esc(m?.titulo||'Módulo')} → ${esc(l.titulo)}</option>`}).join('');
  if($('#activityLesson'))$('#activityLesson').innerHTML=lessonOpts;
  if($('#courseFileLesson'))$('#courseFileLesson').innerHTML=lessonOpts;
}
$('#courseForm')?.addEventListener('submit',async e=>{e.preventDefault();const el=$('#courseSaveMsg');status(el,'Salvando curso...',true);const payload={id:$('#courseId').value||null,titulo:$('#courseTitle').value.trim(),slug:adminSlug($('#courseTitle').value),descricao:$('#courseDescription').value.trim()||null,carga_horaria:Number($('#courseHours').value||10),imagem_url:$('#courseImage').value.trim()||null,status:$('#courseStatus').value,certificado_ativo:$('#courseCertificate').checked};const {data,error}=await sb.rpc('admin_save_lms_course',{p_payload:payload});if(error){status(el,'Erro ao salvar: '+error.message);notice('Curso não foi salvo: '+error.message,'error');return}status(el,'Curso salvo com sucesso.',true);notice('Curso salvo com sucesso.');clearCourseForm();await loadLearningAdmin()});
function clearCourseForm(){if(!$('#courseForm'))return;$('#courseId').value='';$('#courseTitle').value='';$('#courseDescription').value='';$('#courseHours').value='10';$('#courseImage').value='';$('#courseStatus').value='rascunho';$('#courseCertificate').checked=true}
$('#courseClear')?.addEventListener('click',clearCourseForm);
document.addEventListener('click',e=>{const b=e.target.closest('[data-edit-course]');if(!b)return;const c=lmsCourses.find(x=>x.id===b.dataset.editCourse);if(c)fillCourseEditor(c)});
$('#moduleForm')?.addEventListener('submit',async e=>{e.preventDefault();const el=$('#moduleSaveMsg');status(el,'Criando módulo...',true);const payload={course_id:$('#moduleCourse').value,titulo:$('#moduleTitle').value.trim(),descricao:$('#moduleDescription').value.trim()||null,posicao:Number($('#modulePosition').value||1)};const {error}=await sb.rpc('admin_create_lms_module',{p_payload:payload});if(error){status(el,'Erro: '+error.message);return}status(el,'Módulo criado.',true);e.target.reset();await loadLearningAdmin()});
$('#lessonForm')?.addEventListener('submit',async e=>{e.preventDefault();const el=$('#lessonSaveMsg');status(el,'Criando aula...',true);const payload={module_id:$('#lessonModule').value,titulo:$('#lessonTitleAdmin').value.trim(),conteudo:$('#lessonContentAdmin').value.trim()||null,video_url:$('#lessonVideoAdmin').value.trim()||null,posicao:Number($('#lessonPosition').value||1),publicado:$('#lessonPublished').checked};const {error}=await sb.rpc('admin_create_lms_lesson',{p_payload:payload});if(error){status(el,'Erro: '+error.message);return}status(el,'Aula criada.',true);e.target.reset();$('#lessonPublished').checked=true;await loadLearningAdmin()});
$('#activityForm')?.addEventListener('submit',async e=>{e.preventDefault();const el=$('#activitySaveMsg');status(el,'Criando atividade...',true);let opts=$('#activityOptions').value.split('\n').map(x=>x.trim()).filter(Boolean);if($('#activityType').value==='true_false')opts=['Verdadeiro','Falso'];const payload={lesson_id:$('#activityLesson').value,titulo:$('#activityTitle').value.trim(),tipo:$('#activityType').value,pergunta:$('#activityQuestion').value.trim()||null,opcoes:opts,resposta_correta:$('#activityCorrect').value.trim()||null};const {error}=await sb.rpc('admin_create_lms_activity',{p_payload:payload});if(error){status(el,'Erro: '+error.message);return}status(el,'Atividade criada.',true);e.target.reset()});
$('#courseFileForm')?.addEventListener('submit',async e=>{e.preventDefault();const lessonId=$('#courseFileLesson').value,file=$('#courseFileInput').files[0],title=$('#courseFileTitle').value.trim();if(!file)return;const lesson=lmsLessons.find(x=>x.id===lessonId),mod=lmsModules.find(x=>x.id===lesson?.module_id);if(!mod)return;const path=`${mod.course_id}/${lessonId}/${Date.now()}-${safeFileName(file.name)}`;status($('#courseFileMsg'),'Enviando...',true);const up=await sb.storage.from('course-files').upload(path,file,{contentType:file.type||undefined});if(up.error){status($('#courseFileMsg'),up.error.message);return}const {error}=await sb.rpc('admin_register_course_file',{p_payload:{lesson_id:lessonId,titulo:title,storage_path:path,file_name:file.name,mime_type:file.type||null}});if(error)status($('#courseFileMsg'),error.message);else{status($('#courseFileMsg'),'Material enviado e protegido.',true);e.target.reset()}});

async function loadStudentAdmin(){
  const req=await sb.from('lms_access_requests').select('*,lms_courses(titulo)').order('criado_em',{ascending:false});
  const rows=req.data||[];
  $('#studentRequests').innerHTML=rows.map(r=>`<div class="cms-student-row"><div><strong>${esc(r.nome_completo)}</strong><br><small>${esc(r.email)}${r.whatsapp?' • '+esc(r.whatsapp):''}${r.cpf?' • CPF '+esc(r.cpf):''}${r.data_nascimento?' • Nasc. '+new Date(r.data_nascimento+'T12:00:00').toLocaleDateString('pt-BR'):''}${r.cidade?' • '+esc(r.cidade):''}${r.estado?'/'+esc(r.estado):''}</small></div><div><strong>${esc(r.lms_courses?.titulo||'Curso')}</strong><br><small>${new Date(r.criado_em).toLocaleString('pt-BR')}</small></div><div><span class="cms-badge ${r.status==='aprovado'?'ok':'warn'}">${esc(r.status)}</span><br><small>Pagamento: ${esc(r.pagamento_status)}</small></div><div class="cms-actions">${r.status!=='aprovado'?`<button class="button" data-approve-request="${r.id}">Confirmar pagamento e liberar</button>`:''}<button class="button secondary" data-reject-request="${r.id}">Recusar</button></div></div>`).join('')||'<p>Nenhuma solicitação.</p>';
  const enr=await sb.from('lms_enrollments').select('*,lms_courses(titulo)').order('matriculado_em',{ascending:false});
  $('#activeEnrollments').innerHTML=(enr.data||[]).map(e=>`<div class="cms-mini-item"><div><strong>${esc(e.lms_courses?.titulo||'Curso')}</strong><br><small>Usuário: ${esc(e.user_id)} • ${new Date(e.matriculado_em).toLocaleString('pt-BR')}</small></div><span class="cms-badge ${e.status==='ativo'?'ok':'warn'}">${esc(e.status)}</span></div>`).join('')||'<p>Nenhuma matrícula.</p>';
}
document.addEventListener('click',async e=>{const a=e.target.closest('[data-approve-request]');if(a){const {data:r,error}=await sb.from('lms_access_requests').select('*').eq('id',a.dataset.approveRequest).single();if(error)return notice(error.message,'error');if(!r.auth_user_id)return notice('O cadastro ainda não possui usuário autenticado vinculado. Peça ao aluno para confirmar o e-mail ou refazer o cadastro.','error');const en=await sb.from('lms_enrollments').upsert({user_id:r.auth_user_id,course_id:r.course_id,status:'ativo'},{onConflict:'user_id,course_id'});if(en.error)return notice(en.error.message,'error');await sb.from('lms_access_requests').update({status:'aprovado',pagamento_status:'confirmado'}).eq('id',r.id);notice('Pagamento confirmado e curso liberado.');loadStudentAdmin()}const x=e.target.closest('[data-reject-request]');if(x){await sb.from('lms_access_requests').update({status:'recusado',pagamento_status:'recusado'}).eq('id',x.dataset.rejectRequest);notice('Solicitação recusada.');loadStudentAdmin()}});

async function loadEjatecAdmin(){checkLearningPermission('#ejatecPermissionMsg');const r=await sb.from('ejatec_lessons').select('*').order('data_aula',{ascending:false}).order('posicao');if(r.error)notice('Falha ao carregar Aulas: '+r.error.message,'error');ejatecRows=r.data||[];renderEjatecAdmin()}
function renderEjatecAdmin(){if($('#ejatecList'))$('#ejatecList').innerHTML=ejatecRows.map(l=>`<div class="cms-mini-item"><div><strong>${esc(l.titulo)}</strong><br><small>${esc(l.disciplina||'')} ${l.turma?'• '+esc(l.turma):''} ${l.data_aula?'• '+new Date(l.data_aula+'T12:00:00').toLocaleDateString('pt-BR'):''}</small><br><span class="cms-badge ${l.status==='publicado'?'ok':'warn'}">${esc(l.status)}</span></div><button class="button secondary" data-edit-ejatec="${l.id}">Editar</button></div>`).join('')||'<p>Nenhuma aula cadastrada.</p>';if($('#ejatecMaterialLesson'))$('#ejatecMaterialLesson').innerHTML='<option value="">Selecione...</option>'+ejatecRows.map(l=>`<option value="${l.id}">${esc(l.titulo)}</option>`).join('')}
function clearEjatec(){if(!$('#ejatecForm'))return;$('#ejatecId').value='';$('#ejatecTitle').value='';$('#ejatecDiscipline').value='';$('#ejatecClass').value='';$('#ejatecModule').value='';$('#ejatecDate').value='';$('#ejatecObjective').value='';$('#ejatecContent').value='';$('#ejatecActivity').value='';$('#ejatecStatus').value='rascunho'}
$('#ejatecClear')?.addEventListener('click',clearEjatec);
$('#ejatecForm')?.addEventListener('submit',async e=>{e.preventDefault();const el=$('#ejatecSaveMsg');status(el,'Salvando aula...',true);const payload={id:$('#ejatecId').value||null,titulo:$('#ejatecTitle').value.trim(),disciplina:$('#ejatecDiscipline').value.trim()||null,turma:$('#ejatecClass').value.trim()||null,modulo:$('#ejatecModule').value.trim()||null,data_aula:$('#ejatecDate').value||null,objetivo:$('#ejatecObjective').value.trim()||null,conteudo:$('#ejatecContent').value.trim()||null,atividade:$('#ejatecActivity').value.trim()||null,status:$('#ejatecStatus').value};const {error}=await sb.rpc('admin_save_ejatec_lesson',{p_payload:payload});if(error){status(el,'Erro ao salvar: '+error.message);notice('A aula não foi salva: '+error.message,'error');return}status(el,'Aula salva com sucesso.',true);notice('Aula salva.');clearEjatec();await loadEjatecAdmin()});
document.addEventListener('click',e=>{const b=e.target.closest('[data-edit-ejatec]');if(!b)return;const l=ejatecRows.find(x=>x.id===b.dataset.editEjatec);if(l)fillEjatecEditor(l)});
$('#ejatecMaterialForm')?.addEventListener('submit',async e=>{e.preventDefault();const lessonId=$('#ejatecMaterialLesson').value,file=$('#ejatecMaterialFile').files[0],title=$('#ejatecMaterialTitle').value.trim();if(!file)return;const path=`${lessonId}/${new Date().toISOString().slice(0,10)}/${Date.now()}-${safeFileName(file.name)}`;status($('#ejatecMaterialMsg'),'Enviando material...',true);const up=await sb.storage.from('eja-tec').upload(path,file,{contentType:file.type||undefined});if(up.error){status($('#ejatecMaterialMsg'),up.error.message);return}const {error}=await sb.rpc('admin_register_ejatec_material',{p_payload:{lesson_id:lessonId,titulo:title,storage_path:path,file_name:file.name,mime_type:file.type||null}});if(error)status($('#ejatecMaterialMsg'),error.message);else{status($('#ejatecMaterialMsg'),'Material inserido com sucesso.',true);e.target.reset()}});


// ===== Gestão segura da equipe editorial v3.7 =====
async function loadEditors(){
  const box=$('#editorAccessList');if(!box)return;
  if(!canDeleteAnything()){box.innerHTML='<p>Apenas a conta proprietária pode gerenciar editores.</p>';return}
  box.innerHTML='<p>Carregando editores…</p>';
  const {data,error}=await sb.rpc('es_editor_list');
  if(error){box.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;return}
  const rows=Array.isArray(data)?data:(Array.isArray(data?.editors)?data.editors:[]);
  box.innerHTML=rows.map(r=>`<div class="cms-editor-access-row"><div><strong>${esc(r.nome||r.email)}</strong><br><small>${esc(r.email)} • ${esc(r.papel||'editor')}</small></div><div><span class="cms-badge ${r.ativo?'ok':'warn'}">${r.ativo?'Ativo':'Inativo'}</span></div><div>${String(r.email||'').toLowerCase()===OWNER_DELETE_EMAIL?'<span class="cms-badge ok">Proprietário</span>':`<button class="button secondary" data-revoke-editor="${esc(r.email)}">Retirar acesso editorial</button>`}</div></div>`).join('')||'<p>Nenhum editor adicional habilitado.</p>';
}
$('#refreshEditors')?.addEventListener('click',loadEditors);
$('#editorAccessForm')?.addEventListener('submit',async e=>{
  e.preventDefault();if(!canDeleteAnything())return notice('Somente a conta proprietária pode habilitar editores.','error');
  const email=$('#editorAccessEmail').value.trim().toLowerCase(),nome=$('#editorAccessName').value.trim()||null,el=$('#editorAccessMsg');
  status(el,'Validando a conta...',true);
  const {data,error}=await sb.rpc('es_editor_grant',{p_email:email,p_nome:nome});
  if(error){status(el,'Não foi possível habilitar: '+error.message);return}
  if(data?.ok===false){status(el,data.message||'Conta não localizada.');return}
  status(el,'Editor habilitado com sucesso.',true);e.target.reset();notice('Acesso editorial concedido.');loadEditors();
});
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-revoke-editor]');if(!b)return;if(!canDeleteAnything())return;
  if(!confirm(`Retirar o acesso editorial de ${b.dataset.revokeEditor}? A conta não será apagada.`))return;
  const {data,error}=await sb.rpc('es_editor_revoke',{p_email:b.dataset.revokeEditor});
  if(error)return notice(error.message,'error');
  notice(data?.message||'Acesso editorial retirado.');loadEditors();
});


let aula10AdminRows=[];
function fmtDate(v){if(!v)return '—';try{return new Date(v).toLocaleString('pt-BR')}catch{return v}}
function renderActivityRows(){const tbody=$('#activityResponseRows');if(!tbody)return;const term=($('#activityResponseSearch')?.value||'').trim().toLowerCase(),st=$('#activityResponseStatus')?.value||'';const rows=aula10AdminRows.filter(r=>(!term||String(r.nome_aluno||'').toLowerCase().includes(term)||String(r.telefone||'').toLowerCase().includes(term))&&(!st||(st==='concluida'?!!r.finalizado_em:!r.finalizado_em)));tbody.innerHTML=rows.map(r=>`<tr><td><strong>${esc(r.nome_aluno||'—')}</strong></td><td>${esc(r.telefone||'—')}</td><td>${esc(fmtDate(r.iniciado_em))}</td><td>${r.finalizado_em?'<span class="cms-badge ok">Concluída</span>':'<span class="cms-badge">Em andamento</span>'}</td><td>${r.finalizado_em?`${esc(r.total_acertos??0)}/${esc(r.total_questoes??10)} • ${esc(r.percentual??0)}%`:'—'}</td><td><button class="button secondary" type="button" data-a10-detail="${esc(r.tentativa_externa)}">Ver respostas</button></td></tr>`).join('')||'<tr><td colspan="6">Nenhuma resposta encontrada.</td></tr>'}
async function loadActivityResponses(){const msg=$('#activityResponsesMsg');status(msg,'Carregando respostas...',true);const {data,error}=await sb.rpc('es_admin_aula10_attempts');if(error){aula10AdminRows=[];renderActivityRows();status(msg,'Não foi possível carregar. Execute a MIGRACAO_V39_NAVEGACAO_RESPOSTAS_SEGURANCA.sql no Supabase. Detalhe: '+error.message);return}aula10AdminRows=Array.isArray(data)?data:[];status(msg,`${aula10AdminRows.length} participação(ões) localizada(s).`,true);renderActivityRows()}
async function openActivityDetail(id){const box=$('#activityResponseDetail'),body=$('#activityDetailBody');box.hidden=false;body.innerHTML='<p>Carregando detalhes…</p>';box.scrollIntoView({behavior:'smooth',block:'start'});const {data,error}=await sb.rpc('es_admin_aula10_attempt_detail',{p_tentativa_id:id});if(error){body.innerHTML=`<div class="notice error">${esc(error.message)}</div>`;return}const d=data||{},a=d.attempt||{},ans=Array.isArray(d.respostas)?d.respostas:[];$('#activityDetailTitle').textContent=a.nome_aluno||'Detalhes da atividade';$('#activityDetailMeta').textContent=`${a.telefone||''} • início ${fmtDate(a.iniciado_em)}${a.finalizado_em?' • finalizada '+fmtDate(a.finalizado_em):''}`;body.innerHTML=`<div class="cms-response-summary"><strong>Resultado: ${esc(a.total_acertos??0)}/${esc(a.total_questoes??ans.length)} • ${esc(a.percentual??0)}%</strong></div><div class="cms-response-list">${ans.map(q=>`<article class="cms-response-item ${q.acertou===true?'correct':q.acertou===false?'wrong':''}"><div class="cms-response-qhead"><strong>Questão ${esc(q.ordem)}</strong><span>${q.acertou===true?'✓ Acertou':q.acertou===false?'✕ Errou':'Sem correção'}</span></div><p>${esc(q.enunciado||'')}</p><p><b>Resposta do aluno:</b> ${esc(q.resposta||'—')}</p>${q.resposta_correta?`<p><b>Resposta correta:</b> ${esc(q.resposta_correta)}</p>`:''}${q.explicacao?`<p><b>Comentário:</b> ${esc(q.explicacao)}</p>`:''}</article>`).join('')}</div><div class="cms-learning-grid"><article class="cms-learning-card"><h4>Atividade prática 1 — E-mail EJA</h4><p class="cms-response-text">${esc(a.atividade_email||'Não registrada.')}</p></article><article class="cms-learning-card"><h4>Atividade prática 2 — Ouvidoria</h4><p class="cms-response-text">${esc(a.atividade_ouvidoria||'Não registrada.')}</p></article></div>`}
$('#refreshActivityResponses')?.addEventListener('click',loadActivityResponses);$('#activityResponseSearch')?.addEventListener('input',renderActivityRows);$('#activityResponseStatus')?.addEventListener('change',renderActivityRows);$('#closeActivityDetail')?.addEventListener('click',()=>{$('#activityResponseDetail').hidden=true});document.addEventListener('click',e=>{const b=e.target.closest('[data-a10-detail]');if(b)openActivityDetail(b.dataset.a10Detail)});

boot();

window.ES40AdminBridge={get client(){return sb},get user(){return currentUser},get profile(){return currentProfile}};
