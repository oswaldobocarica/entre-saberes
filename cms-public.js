const cfg = window.ENTRE_SABERES_CONFIG;
const esc = v => String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmt = v => { try { return v ? new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeStyle:'short'}).format(new Date(v)) : ''; } catch { return String(v||''); } };
const periodFmt=(period,published)=>{const s=String(period||'');if(/^\d{4}-\d{2}$/.test(s)){const [y,m]=s.split('-');return `${m}/${y}`}if(/^\d{2}\/\d{4}$/.test(s))return s;if(published){const d=new Date(published);if(!Number.isNaN(d.getTime()))return `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}return ''};
const typeLabel=v=>String(v||'conteúdo').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const FONT_MAP={georgia:"Georgia,serif",merriweather:"'Merriweather',serif",lora:"'Lora',serif",playfair:"'Playfair Display',serif",montserrat:"'Montserrat',sans-serif",opensans:"'Open Sans',sans-serif",roboto:"Roboto,sans-serif",sourcesans:"'Source Sans 3',sans-serif",serif:"Georgia,'Times New Roman',serif",sans:"Arial,Helvetica,sans-serif",monospace:"'Courier New',monospace"};
function normalizeKeywords(value){
  if(Array.isArray(value)) return value.map(v=>String(v).trim()).filter(Boolean);
  if(value==null) return [];
  if(typeof value==='string'){
    const s=value.trim(); if(!s) return [];
    try { const j=JSON.parse(s); if(Array.isArray(j)) return j.map(v=>String(v).trim()).filter(Boolean); } catch {}
    return s.split(/[,;|]/).map(v=>v.trim()).filter(Boolean);
  }
  if(typeof value==='object') return Object.values(value).map(v=>String(v).trim()).filter(Boolean);
  return [String(value).trim()].filter(Boolean);
}
function normalizeStyle(value){
  if(!value) return {};
  if(typeof value==='object'&&!Array.isArray(value)) return value;
  if(typeof value==='string'){try{const j=JSON.parse(value);return j&&typeof j==='object'?j:{}}catch{return {}}}
  return {};
}
function safeStyle(x,defaults){const o={...defaults,...normalizeStyle(x)};return `font-family:${FONT_MAP[o.font]||FONT_MAP[defaults.font]};font-size:${Math.max(12,Math.min(72,parseInt(o.size)||parseInt(defaults.size)))}px;text-align:${['left','center','right','justify'].includes(o.align)?o.align:defaults.align};color:${/^#[0-9a-f]{6}$/i.test(o.color||'')?o.color:defaults.color}`}
function abntAuthor(name){const p=String(name||'ENTRE SABERES').trim().split(/\s+/);if(p.length<2)return p[0].toUpperCase();const last=p.pop().toUpperCase();return `${last}, ${p.join(' ')}`}
function citation(data){const author=abntAuthor(data.autor_nome||'Entre Saberes');const d=new Date(data.publicado_em||Date.now());const y=Number.isNaN(d.getTime())?new Date().getFullYear():d.getFullYear();const url=`${location.origin}/article.html?id=${encodeURIComponent(data.id)}`;const inst=data.vinculo_tipo==='instituicao'&&data.instituicao?` ${data.instituicao}.`:'';return `${author}. ${data.titulo}.${inst} Entre Saberes, Franca, ${y}. Disponível em: ${url}. Acesso em: ${new Date().toLocaleDateString('pt-BR')}.`}
async function copyText(text,btn){try{await navigator.clipboard.writeText(text);const old=btn.textContent;btn.textContent='Copiado!';setTimeout(()=>btn.textContent=old,1600)}catch{}}
function sanitizeHtml(html){
  const value=String(html||'');
  if(window.DOMPurify?.sanitize) return window.DOMPurify.sanitize(value);
  // Fail closed: no untrusted HTML is connected when the sanitizer is unavailable.
  return '<p class="es-inline-notice">A biblioteca de leitura segura n\u00e3o carregou. O conte\u00fado est\u00e1 sendo exibido como texto.</p><pre>'+esc(value)+'</pre>';
}
function renderLoadError(host,title,message,detail=''){
  host.innerHTML=`<div class="scientific-article article-load-error"><div class="eyebrow">Entre Saberes</div><h1>${esc(title)}</h1><p>${esc(message)}</p>${detail?`<details><summary>Detalhes técnicos</summary><code>${esc(detail)}</code></details>`:''}<p><button class="button" type="button" onclick="location.reload()">Tentar novamente</button> <a class="button secondary" href="biblioteca.html">Voltar à Biblioteca</a></p></div>`;
}
async function loadArticle(){
  const host=document.querySelector('#articleHost'); if(!host)return;
  try{
    if(!cfg||!cfg.supabaseUrl||!cfg.supabasePublishableKey||!window.supabase) throw new Error('Configuração do Supabase não foi carregada.');
    const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
    const q=new URLSearchParams(location.search),id=q.get('id'),slug=q.get('slug'),preview=q.get('preview')==='1';
    if(!id&&!slug){renderLoadError(host,'Publicação não encontrada','O endereço não contém o identificador da publicação.');return}
    let req=sb.from('publications').select('*');
    if(id)req=req.eq('id',id); else req=req.eq('slug',slug);
    if(!preview)req=req.eq('status','publicado');
    const {data,error}=await req.maybeSingle();
    if(error){console.error('Erro ao carregar publicação:',error);renderLoadError(host,'Não foi possível carregar esta publicação','O portal conseguiu abrir a página, mas o Supabase recusou ou não conseguiu concluir a leitura.',error.message||String(error));return}
    if(!data){renderLoadError(host,'Publicação não encontrada','O conteúdo pode estar em revisão, arquivado ou ainda não publicado.');return}
    document.title=`${data.titulo||'Publicação'} — Entre Saberes`;
    const crumb=document.querySelector('#crumbCurrent'); if(crumb)crumb.textContent=data.titulo||'Publicação';
    host.dataset.publicationId=data.id;host.dataset.publicationStatus=data.status||'';
    const raw=String(data.conteudo||'');
    const body=/<[^>]+>/.test(raw)?sanitizeHtml(raw):raw.split(/\n{2,}/).map(p=>`<p>${esc(p).replaceAll('\n','<br>')}</p>`).join('');
    const st=normalizeStyle(data.estilo_editorial),keywords=normalizeKeywords(data.palavras_chave),ref=citation(data);
    host.innerHTML=`<article class="scientific-article"><header class="article-header"><div class="article-kicker">${esc(data.modalidade_editorial||typeLabel(data.tipo))}${preview?'<span class="preview-badge">pré-visualização</span>':''}</div><h1 style="${safeStyle(st.title,{font:'georgia',size:'56',align:'left',color:'#172936'})}">${esc(data.titulo||'Sem título')}</h1>${data.subtitulo?`<p class="article-subtitle" style="${safeStyle(st.subtitle,{font:'sourcesans',size:'22',align:'left',color:'#52616b'})}">${esc(data.subtitulo)}</p>`:''}<div class="scientific-id-line"><strong>${esc(data.modalidade_editorial||typeLabel(data.tipo))}</strong><span>•</span><span>${esc(data.vinculo_tipo==='instituicao'?(data.instituicao||'Instituição não informada'):'Pesquisador independente')}</span>${periodFmt(data.periodo_publicacao,data.publicado_em)?`<span>•</span><span>${esc(periodFmt(data.periodo_publicacao,data.publicado_em))}</span>`:''}</div><div class="article-meta-line"><span><strong>Pesquisador(a):</strong> <a href="autor.html?nome=${encodeURIComponent(data.autor_nome||'Entre Saberes')}">${esc(data.autor_nome||'Entre Saberes')}</a></span>${data.curso_nome?`<span><strong>Curso / programa:</strong> <a href="programa.html?nome=${encodeURIComponent(data.curso_nome)}">${esc(data.curso_nome)}</a></span>`:''}${data.publicado_em?`<span><strong>Publicado:</strong> ${esc(fmt(data.publicado_em))}</span>`:''}</div>${data.resumo?`<section class="article-abstract"><strong>Resumo</strong><p style="${safeStyle(st.summary,{font:'sourcesans',size:'18',align:'justify',color:'#40515e'})}">${esc(data.resumo)}</p></section>`:''}</header>${data.imagem_capa?`<figure class="article-cover-wrap"><img class="article-cover" src="${esc(data.imagem_capa)}" alt="Imagem de capa da publicação"></figure>`:''}<div class="article-layout"><aside class="article-tools"><a href="buscar.html" title="Pesquisar no acervo">Pesquisar</a><button id="copyCitationSide" type="button" title="Copiar referência ABNT">Citar</button><button id="printArticle" type="button" title="Imprimir ou salvar esta publicação em PDF">Imprimir / PDF</button><a href="#referencia" title="Ir para a referência bibliográfica">Referência</a></aside><div class="rich-body">${body||'<p>Conteúdo ainda não informado.</p>'}</div></div>${keywords.length?`<div class="article-tags">${keywords.map(t=>`<a class="tag" href="buscar.html?q=${encodeURIComponent(t)}">${esc(t)}</a>`).join('')}</div>`:''}<section class="citation-box" id="referencia"><div><div class="eyebrow">Como citar este conteúdo</div><h2>Referência ABNT</h2></div><p id="abntText">${esc(ref)}</p><div class="citation-actions"><button class="button" id="copyCitation" type="button">Copiar referência</button><button class="button secondary" id="printArticleBottom" type="button">Imprimir / salvar PDF</button></div></section><div class="print-rights">Todo o conteúdo deste site pode e deve ser utilizado em trabalhos e pesquisas, desde que esteja devidamente referenciado.</div></article>`;
    document.querySelector('#copyCitation')?.addEventListener('click',e=>copyText(ref,e.currentTarget));
    document.querySelector('#copyCitationSide')?.addEventListener('click',e=>copyText(ref,e.currentTarget));
    document.querySelector('#printArticle')?.addEventListener('click',()=>window.print());
    document.querySelector('#printArticleBottom')?.addEventListener('click',()=>window.print());
    window.dispatchEvent(new CustomEvent('entre-saberes:article-loaded',{detail:{id:data.id}}));
  }catch(err){console.error('Falha inesperada ao montar publicação:',err);renderLoadError(host,'Falha ao montar a publicação','Os dados foram encontrados, mas um formato antigo ou incompatível impediu a exibição. A v3.4 trata automaticamente os formatos anteriores.',err?.message||String(err));}
}
loadArticle();
