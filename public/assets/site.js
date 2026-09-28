const FALLBACK_COURSES=[
{codigo:"001/2026",titulo:"Colaborador Nota 1000",subtitulo:"Educação, Cordialidade, Proatividade e Disposição",carga_horaria:50},
{codigo:"002/2026",titulo:"Atendimento ao Cliente",subtitulo:"Comunicação, Experiência e Excelência Profissional",carga_horaria:20},
{codigo:"003/2026",titulo:"Reposição de Mercadorias",subtitulo:"Validade, Organização e Exposição",carga_horaria:20},
{codigo:"004/2026",titulo:"Operador de Caixa",subtitulo:"Atendimento, Controle e Segurança",carga_horaria:30},
{codigo:"005/2026",titulo:"Auxiliar Financeiro",subtitulo:"Controle, Competências e Intraempreendedorismo",carga_horaria:40},
{codigo:"006/2026",titulo:"Estoquista e Controle de Mercadorias",subtitulo:"Recebimento, Armazenamento e Controle",carga_horaria:30},
{codigo:"007/2026",titulo:"Vendas no Comércio",subtitulo:"Necessidades, Soluções e Relacionamento",carga_horaria:20},
{codigo:"008/2026",titulo:"Auxiliar Administrativo no Comércio",subtitulo:"Organização, Documentos e Rotinas Administrativas",carga_horaria:40},
{codigo:"009/2026",titulo:"Prevenção de Perdas",subtitulo:"Cultura do Cuidado e Responsabilidade",carga_horaria:20},
{codigo:"010/2026",titulo:"Liderança Inicial e Intraempreendedorismo no Comércio",subtitulo:"Liderança, Iniciativa e Melhoria Contínua",carga_horaria:30},
{codigo:"011/2026",titulo:"Currículo Profissional",subtitulo:"Apresentação, Competências e Empregabilidade",carga_horaria:6}
];
async function loadCourses(){
 const cfg=window.ENTRE_SABERES_CONFIG||{};
 if(cfg.supabaseUrl&&cfg.supabaseAnonKey){
  try{
   const r=await fetch(cfg.supabaseUrl+"/rest/v1/courses?select=codigo,titulo,subtitulo,carga_horaria&status_curso=eq.publicado&order=numero_sequencial.asc",{headers:{apikey:cfg.supabaseAnonKey,Authorization:"Bearer "+cfg.supabaseAnonKey}});
   if(r.ok){const j=await r.json();if(Array.isArray(j)&&j.length)return j;}
  }catch(e){}
 }
 return FALLBACK_COURSES;
}
function courseCards(list){
 return list.map(c=>'<article class="card"><div class="code">'+(c.codigo||"")+'</div><h3>'+c.titulo+'</h3><p>'+(c.subtitulo||"")+'</p><div class="meta">'+c.carga_horaria+' horas</div></article>').join("");
}
document.addEventListener("DOMContentLoaded",async()=>{const el=document.querySelector("[data-courses]");if(el)el.innerHTML=courseCards(await loadCourses());});
window.EntreSaberes={loadCourses,FALLBACK_COURSES};