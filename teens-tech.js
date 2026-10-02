(()=>{
  'use strict';
  const cfg=window.ENTRE_SABERES_CONFIG;
  const host=document.querySelector('#teenPublications');
  if(!host||!cfg||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt=d=>{try{return new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}catch{return ''}};
  async function load(){
    try{
      const {data:cat,error:ce}=await sb.from('categories').select('id').eq('slug','teens-tech').maybeSingle();
      if(ce)throw ce;
      if(!cat){host.innerHTML='<div class="notice">O núcleo Teens Tech está sendo preparado. As primeiras criações aparecerão aqui em breve.</div>';return}
      const {data:rels,error:re}=await sb.from('publication_categories').select('publication_id').eq('category_id',cat.id);if(re)throw re;
      const ids=(rels||[]).map(x=>x.publication_id);if(!ids.length){host.innerHTML='<div class="notice">As primeiras criações Teens Tech estão chegando. Este espaço será atualizado automaticamente conforme os jovens autores forem publicados.</div>';return}
      const {data:posts,error:pe}=await sb.from('publications').select('*').in('id',ids).eq('status','publicado').order('publicado_em',{ascending:false}).limit(12);if(pe)throw pe;
      const rows=posts||[];
      if(!rows.length){host.innerHTML='<div class="notice">Ainda não há publicações Teens Tech disponíveis.</div>';return}
      host.innerHTML=rows.map(p=>`<article class="post-card teen-post-card">${p.imagem_capa?`<a href="article.html?id=${encodeURIComponent(p.id)}"><img class="post-cover" src="${esc(p.imagem_capa)}" alt=""></a>`:''}<div class="post-card-body"><div class="post-meta"><span class="tag">Teens Tech</span>${p.publicado_em?`<span>${esc(fmt(p.publicado_em))}</span>`:''}</div><h3><a href="article.html?id=${encodeURIComponent(p.id)}">${esc(p.titulo)}</a></h3>${p.subtitulo?`<p>${esc(p.subtitulo)}</p>`:p.resumo?`<p>${esc(p.resumo)}</p>`:''}<div class="post-author">${esc(p.autor_nome||'Jovem autor')}</div><a class="text-link" href="article.html?id=${encodeURIComponent(p.id)}">Ler criação →</a></div></article>`).join('');
    }catch(err){console.error(err);host.innerHTML='<div class="notice error">Não foi possível carregar as criações neste momento.</div>'}
  }
  load();
})();
