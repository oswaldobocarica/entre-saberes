import { DurableObject } from "cloudflare:workers";
/* Entre Saberes 4.0. Server module: never include service credentials in browser files.
   Runtime: Cloudflare Workers/Pages with ASSETS, Web Crypto and HTMLRewriter. */
export const VERSION='4.0';
const MAX_UPLOAD=30*1024*1024, MAX_HTML=8*1024*1024;
const DEFAULT_URL='https://aundupwnaoveahudttku.supabase.co';
const DEFAULT_KEY='sb_publishable_rPBcx4j5q77Q7swXv0ZvkQ_AyySgQ9z';
const MIME={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
const JOB_LIST='id,title,author_name,original_name,bytes,status,ocr_mode,revision,publication_id,created_at,updated_at,warnings,error_message';
const ERRORS={
 forbidden:[403,'Acesso n\u00e3o autorizado.'],owner_only:[403,'Somente a conta propriet\u00e1ria pode excluir coment\u00e1rios.'],
 not_found:[404,'Registro n\u00e3o encontrado.'],publication_not_found:[404,'Publica\u00e7\u00e3o indispon\u00edvel.'],
 daily_quota:[429,'Limite de 12 importa\u00e7\u00f5es por conta em 24 horas.'],active_quota:[429,'Existem 3 importa\u00e7\u00f5es em andamento. Conclua ou descarte uma antes de continuar.'],
 already_started:[409,'A convers\u00e3o j\u00e1 foi iniciada. Atualize o hist\u00f3rico; n\u00e3o envie novamente.'],
 revision_conflict:[409,'O documento foi alterado em outra aba. Reabra o resultado antes de salvar.'],
 not_editable:[409,'Este resultado n\u00e3o est\u00e1 dispon\u00edvel para edi\u00e7\u00e3o.'],
 review_required:[400,'Revise o material e confirme a revis\u00e3o antes de publicar.'],
 rate_limited:[429,'Aguarde antes de enviar outro coment\u00e1rio. Limite de 5 em 15 minutos.'],
 invalid_comment:[400,'Informe um nome de 2 a 80 caracteres e um coment\u00e1rio de 3 a 3.000 caracteres.'],
 publication_deleted:[409,'A publica\u00e7\u00e3o vinculada foi exclu\u00edda. N\u00e3o ser\u00e1 recriada automaticamente.'],
 invalid_metadata:[400,'Revise os campos de t\u00edtulo, autoria, resumo e curso.'],invalid_filename:[400,'Formato ou nome de arquivo inv\u00e1lido.']
};
class HttpError extends Error{constructor(status,message,code='request_error'){super(message);this.status=status;this.code=code}}
const fail=(s,m,c)=>{throw new HttpError(s,m,c)};
function database(env){const raw=env.SUPABASE_URL||DEFAULT_URL;const u=new URL(raw);if(u.protocol!=='https:')fail(503,'Configura\u00e7\u00e3o do banco inv\u00e1lida.');return u.origin}
function serviceReady(env){return !!env.SUPABASE_SERVICE_ROLE_KEY}
function converterReady(env){return serviceReady(env)&&(!!env.DOCLING||(!!env.DOCLING_URL&&!!env.DOCLING_API_KEY))}
function commentsReady(env){return serviceReady(env)&&String(env.COMMENTS_IP_SALT||'').length>=32&&(!env.TURNSTILE_SECRET_KEY||!!env.TURNSTILE_SITE_KEY)}
function json(value,status=200,headers={}){return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-entre-saberes-version':VERSION,...headers}})}
async function textLimited(source,limit){
 if(Number(source.headers.get('content-length')||0)>limit)fail(413,'Conte\u00fado maior que o limite permitido.');
 const reader=source.body?.getReader();if(!reader)return '';
 const decoder=new TextDecoder();let length=0,parts=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();fail(413,'Conte\u00fado maior que o limite permitido.')}parts.push(decoder.decode(value,{stream:true}));}parts.push(decoder.decode());return parts.join('')}finally{reader.releaseLock()}
}
async function parseJSON(source,limit=65536){const t=await textLimited(source,limit);try{return JSON.parse(t)}catch{fail(502,'Resposta inv\u00e1lida do servi\u00e7o.','invalid_json')}}
async function bodyJSON(request,limit=65536){if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))fail(415,'Envie os dados em JSON.');try{return await parseJSON(request,limit)}catch(e){if(e.code==='invalid_json')fail(400,'JSON inv\u00e1lido.');throw e}}
async function timedFetch(url,options={},ms=18000){try{return await fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(ms)})}catch{fail(502,'O servi\u00e7o externo n\u00e3o respondeu. Tente novamente; n\u00e3o repita o envio do arquivo.','upstream_unavailable')}}
function keyHeaders(key){const h={apikey:key};if(!key.startsWith('sb_'))h.authorization='Bearer '+key;return h}
async function rest(env,path,{method='GET',body,publicAccess=false,limit=MAX_HTML*3,headers={}}={}){
 if(!publicAccess&&!serviceReady(env))fail(503,'Configure a chave de servi\u00e7o no servidor Cloudflare.','server_not_configured');
 const key=publicAccess?(env.SUPABASE_ANON_KEY||DEFAULT_KEY):env.SUPABASE_SERVICE_ROLE_KEY;
 const r=await timedFetch(database(env)+'/rest/v1/'+path,{method,headers:{...keyHeaders(key),'content-type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
 if(!r.ok){const e=await parseJSON(r,16000).catch(()=>({}));const known=ERRORS[e.message];if(known)fail(known[0],known[1],e.message);if(['PGRST202','PGRST205','42P01','42883'].includes(e.code))fail(503,'A migra\u00e7\u00e3o V40 ainda n\u00e3o foi aplicada no Supabase.','migration_missing');fail(r.status===401||r.status===403?503:502,'O banco n\u00e3o concluiu a opera\u00e7\u00e3o. Verifique as permiss\u00f5es e a migra\u00e7\u00e3o V40.','database_error');}
 if(r.status===204)return null;return parseJSON(r,limit);
}
const rpc=(env,name,params)=>rest(env,'rpc/'+name,{method:'POST',body:params});
export async function authenticate(request,env){
 const authorization=request.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9._~-]{20,8192}$/.test(authorization))fail(401,'Entre novamente no painel.','login_required');
 const r=await timedFetch(database(env)+'/auth/v1/user',{headers:{apikey:env.SUPABASE_ANON_KEY||DEFAULT_KEY,authorization}},10000);
 if(!r.ok)fail(401,'Sess\u00e3o expirada. Entre novamente no painel.','login_required');
 const user=await parseJSON(r,64000);if(!validUUID(user.id))fail(401,'Sess\u00e3o inv\u00e1lida.');
 const access=await rpc(env,'es40_access',{p_actor:user.id});
 if(!access?.can_edit)fail(403,'Perfil editorial ativo obrigat\u00f3rio.','forbidden');
 return {id:user.id,...access};
}
export function validUUID(v){return typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)}
function uuid(v){if(!validUUID(v))fail(400,'Identificador inv\u00e1lido.');return v}
function pageOffset(v,max=10000){const n=Number(v||0);if(!Number.isInteger(n)||n<0||n>max)fail(400,'P\u00e1gina inv\u00e1lida.');return n}
function plain(v,max,min=0){if(typeof v!=='string')fail(400,'Campo de texto inv\u00e1lido.');v=v.trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');if(v.length<min||v.length>max)fail(400,'Tamanho de campo inv\u00e1lido.');return v}
export function normalizedFile(name){const ext=String(name).split('.').pop().toLowerCase();if(!MIME[ext])fail(400,'Use PDF, DOCX ou PPTX.');const stem=String(name).slice(0,-ext.length-1).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,95)||'apostila';return {name:stem+'.'+ext,mime:MIME[ext],ext}}
function capabilities(env){return {version:VERSION,api:true,comments_configured:commentsReady(env),converter_configured:converterReady(env),database_checked:false,max_upload_bytes:MAX_UPLOAD,max_html_bytes:MAX_HTML,turnstile_site_key:env.TURNSTILE_SITE_KEY||null}}
async function signedURL(env,path,seconds=600){
 const r=await timedFetch(database(env)+'/storage/v1/object/sign/apostilas/'+path.split('/').map(encodeURIComponent).join('/'),{method:'POST',headers:{...keyHeaders(env.SUPABASE_SERVICE_ROLE_KEY),'content-type':'application/json'},body:JSON.stringify({expiresIn:seconds})});
 if(!r.ok)fail(409,'O arquivo original ainda n\u00e3o est\u00e1 dispon\u00edvel. Conclua o envio.','source_missing');
 const data=await parseJSON(r,16000),value=data.signedURL||data.signedUrl;
 if(!value)fail(502,'N\u00e3o foi poss\u00edvel gerar o acesso tempor\u00e1rio ao original.');
 const base=database(env);const pathValue=value.startsWith('/storage/v1/')?value:'/storage/v1/'+value.replace(/^\//,'');const target=new URL(/^https:\/\//.test(value)?value:base+pathValue);if(target.origin!==database(env))fail(502,'Endere\u00e7o de armazenamento inesperado.');return target.href;
}
async function checkMagic(source,ext){
 const r=await timedFetch(source,{headers:{Range:'bytes=0-1023'}},10000);if(!r.ok)fail(409,'O envio do original n\u00e3o foi conclu\u00eddo.');
 const reader=r.body.getReader();let bytes=[];try{while(bytes.length<1024){const x=await reader.read();if(x.done)break;bytes.push(...x.value.slice(0,1024-bytes.length))}}finally{await reader.cancel();reader.releaseLock()}
 const a=new Uint8Array(bytes),pdf=new TextDecoder().decode(a).includes('%PDF-'),zip=a[0]===80&&a[1]===75&&a[2]===3&&a[3]===4;
 if(ext==='pdf'?!pdf:!zip)fail(400,'O conte\u00fado do arquivo n\u00e3o corresponde ao formato informado.');
}
async function docling(env,path,{method='GET',body}={}){
 if(!converterReady(env))fail(503,'O conversor Docling ainda n\u00e3o est\u00e1 dispon\u00edvel no servidor.','converter_not_configured');
 const payload=body===undefined?undefined:JSON.stringify(body);
 let r;
 if(env.DOCLING){
  try{
   const stub=env.DOCLING.getByName('entre-saberes-docling');
   const target=new URL(path,'http://container');
   r=await stub.fetch(target,{method,headers:{'content-type':'application/json'},body:payload});
  }catch{
   fail(502,'O conversor interno n\u00e3o respondeu. Aguarde a inicializa\u00e7\u00e3o e tente novamente.','upstream_unavailable');
  }
 }else{
  const base=new URL(env.DOCLING_URL);if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)fail(503,'DOCLING_URL deve ser uma base HTTPS sem credenciais.');
  r=await timedFetch(env.DOCLING_URL.replace(/\/+$/,'')+path,{method,headers:{'X-Api-Key':env.DOCLING_API_KEY,'content-type':'application/json'},body:payload},30000);
 }
 if(!r.ok){if(r.status===404)fail(502,'A tarefa expirou ou a rota Docling n\u00e3o existe. Verifique a vers\u00e3o/configura\u00e7\u00e3o do conversor.','converter_task_missing');if(r.status===401||r.status===403)fail(503,'A chave de acesso ao Docling foi recusada.','converter_auth');if(r.status===422)fail(502,'A configura\u00e7\u00e3o enviada n\u00e3o corresponde ao esquema do Docling instalado. Consulte /docs no servidor.','converter_schema');fail(502,'O Docling n\u00e3o concluiu a opera\u00e7\u00e3o.','converter_error');}
 return parseJSON(r,24*1024*1024);
}
const ALLOW_TAGS=new Set('p br hr h1 h2 h3 h4 h5 h6 div section article span strong b em i u s sub sup blockquote pre code ul ol li dl dt dd table caption thead tbody tfoot tr th td figure figcaption img a details summary'.split(' '));
const DROP_TAGS=new Set('script style head iframe frame object embed svg math noscript template form input button textarea select link meta base canvas video audio source'.split(' '));
export async function sanitizeHTML(input,env={}){
 if(typeof input!=='string'||new TextEncoder().encode(input).length>MAX_HTML)fail(413,'O HTML excede 8 MB. Divida a apostila em unidades menores.');
 if(typeof HTMLRewriter==='undefined')fail(503,'O conversor requer o runtime Cloudflare com HTMLRewriter.');
 let removedImages=0;
 const result=await new HTMLRewriter().on('*',{element(el){
  const tag=el.tagName.toLowerCase();if(DROP_TAGS.has(tag)){el.remove();return}if(!ALLOW_TAGS.has(tag)){el.removeAndKeepContent();return}
  const attrs=Object.fromEntries(el.attributes);for(const [name] of [...el.attributes])el.removeAttribute(name);
  if(tag==='h1'){el.tagName='h2'}
  if(tag==='a'&&attrs.href){try{const link=new URL(attrs.href);if(['https:','http:'].includes(link.protocol)&&!link.username&&!link.password){el.setAttribute('href',link.href);el.setAttribute('target','_blank');el.setAttribute('rel','noopener noreferrer')}}catch{}}
  if(tag==='img'){
   let src=attrs.src||'',ok=/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/.test(src);
   if(!ok){try{const u=new URL(src);ok=u.origin===database(env)&&u.pathname.startsWith('/storage/v1/object/public/media/')}catch{}}
   if(!ok){el.remove();removedImages++;return}el.setAttribute('src',src);el.setAttribute('alt',(attrs.alt||'').slice(0,400));el.setAttribute('loading','lazy');el.setAttribute('decoding','async');
  }
  if(['td','th'].includes(tag)){for(const a of ['colspan','rowspan']){const n=Number(attrs[a]);if(Number.isInteger(n)&&n>1&&n<=50)el.setAttribute(a,String(n))}if(tag==='th'&&['row','col','rowgroup','colgroup'].includes(attrs.scope))el.setAttribute('scope',attrs.scope)}
  if(tag==='ol'&&/^-?\d{1,4}$/.test(attrs.start||''))el.setAttribute('start',attrs.start);
 },comments(comment){comment.remove()}}).transform(new Response(input, {headers:{'content-type':'text/html;charset=utf-8'}})).text();
 return {html:result,removed_images:removedImages};
}
async function ownJob(env,id,actor){const rows=await rest(env,'es40_document_jobs?id=eq.'+uuid(id)+'&created_by=eq.'+actor.id+'&select=*&limit=1');if(!rows[0])fail(404,'Importa\u00e7\u00e3o n\u00e3o encontrada.','not_found');return rows[0]}
const patchJob=(env,id,patch)=>rest(env,'es40_document_jobs?id=eq.'+uuid(id),{method:'PATCH',body:{...patch,updated_at:new Date().toISOString()}});
async function pollJob(env,job){
 if(job.status!=='processing'||!job.task_id)return job;
 if(job.last_polled_at&&Date.now()-Date.parse(job.last_polled_at)<5000)return job;
 await patchJob(env,job.id,{last_polled_at:new Date().toISOString()});
 const t=encodeURIComponent(job.task_id),state=await docling(env,'/v1/status/poll/'+t);
 if(['failure','error','cancelled'].includes(state.task_status)){await patchJob(env,job.id,{status:'error',error_message:'O Docling informou falha. Confira o original, o idioma de OCR e os limites do servidor.'});return {...job,status:'error',error_message:'O Docling informou falha na convers\u00e3o.'}}
 if(state.task_status!=='success')return {...job,task_position:state.task_position??null};
 const result=await docling(env,'/v1/result/'+t),doc=result.document;
 if(!doc||!['success','partial_success'].includes(result.status)||!doc.html_content){await patchJob(env,job.id,{status:'error',error_message:'O conversor terminou sem HTML legivel.'});fail(422,'O conversor terminou sem HTML leg\u00edvel. Confira o documento e o modo OCR.','empty_conversion')}
 const clean=await sanitizeHTML(doc.html_content,env);
 const warnings=['Convers\u00e3o autom\u00e1tica: revise a ordem de leitura, t\u00edtulos, tabelas, legendas, f\u00f3rmulas e exerc\u00edcios.'];
 if(result.status==='partial_success'||result.errors?.length)warnings.push('Convers\u00e3o parcial: alguns elementos podem estar ausentes. Compare todas as p\u00e1ginas com o original.');
 if(clean.removed_images)warnings.push(clean.removed_images+' imagem(ns) externa(s) ou em formato n\u00e3o permitido foram removidas.');
 let structure=doc.json_content||null;if(typeof structure==='string'){try{structure=JSON.parse(structure)}catch{structure=null}}
 if(JSON.stringify(structure).length>4*1024*1024){structure=null;warnings.push('A estrutura JSON excedeu 4 MB; apenas o HTML foi preservado nesta importa\u00e7\u00e3o.')}
 await rpc(env,'es40_finish_job',{p_job:job.id,p_html:clean.html,p_structure:structure,p_warnings:warnings});
 return {...job,status:'ready',content_html:clean.html,structure,warnings,revision:job.revision+1};
}
async function conversions(request,env,url,actor){
 const match=url.pathname.match(/^\/api\/conversions(?:\/([a-f0-9-]{36})(?:\/(start|original|publish|discard))?)?$/i);if(!match)fail(404,'Rota n\u00e3o encontrada.');
 const [,id,action]=match;
 if(!id){
  if(request.method==='GET'){const offset=pageOffset(url.searchParams.get('offset'));const rows=await rest(env,'es40_document_jobs?created_by=eq.'+actor.id+'&select='+JOB_LIST+'&order=created_at.desc&limit=20&offset='+offset);return json({jobs:rows,offset,has_more:rows.length===20})}
  if(request.method!=='POST')fail(405,'M\u00e9todo n\u00e3o permitido.');
  if(!converterReady(env))fail(503,'Configure o servi\u00e7o Docling antes de enviar apostilas.','converter_not_configured');
  const b=await bodyJSON(request),file=normalizedFile(b.name);if(b.rights!==true)fail(400,'Confirme que tem autoriza\u00e7\u00e3o para publicar o material.');
  if(!Number.isInteger(b.bytes)||b.bytes<=0||b.bytes>MAX_UPLOAD)fail(413,'Envie um arquivo de at\u00e9 30 MB.');
  if(!['auto','off','scan'].includes(b.ocr_mode))fail(400,'Modo OCR inv\u00e1lido.');
  const job=await rpc(env,'es40_new_job',{p_actor:actor.id,p_title:plain(b.title,240,2),p_name:file.name,p_bytes:b.bytes,p_mime:file.mime,p_ocr:b.ocr_mode});
  return json({id:job.id,storage_path:job.storage_path,mime_type:file.mime,bucket:'apostilas'},201);
 }
 const job=await ownJob(env,id,actor);
 if(request.method==='GET'&&!action){let updated;try{updated=await pollJob(env,job)}catch(e){if(e.status===413||['converter_task_missing','empty_conversion'].includes(e.code))await patchJob(env,job.id,{status:'error',error_message:e.message});throw e}const {task_id,structure,...safe}=updated;return json({job:safe})}
 if(request.method==='GET'&&action==='original')return json({url:await signedURL(env,job.storage_path,600),expires_in:600});
 if(request.method==='POST'&&action==='start'){
  const source=await signedURL(env,job.storage_path,3600);await checkMagic(source,job.original_name.split('.').pop());
  await rpc(env,'es40_claim_job',{p_actor:actor.id,p_job:id});
  try{
   const options={to_formats:['html','json'],image_export_mode:'embedded',do_ocr:job.ocr_mode!=='off',force_ocr:job.ocr_mode==='scan',table_mode:'accurate'};
   if(env.DOCLING_OCR_PRESET)options.ocr_preset=env.DOCLING_OCR_PRESET;
   if(env.DOCLING_OCR_LANGS)options.ocr_lang=env.DOCLING_OCR_LANGS.split(',').map(s=>s.trim()).filter(Boolean);
   const task=await docling(env,'/v1/convert/source/async',{method:'POST',body:{http_sources:[{url:source}],options}});
   if(!task.task_id||!/^[A-Za-z0-9_-]{1,200}$/.test(task.task_id))fail(502,'O Docling n\u00e3o devolveu um identificador de tarefa v\u00e1lido.');
   await patchJob(env,id,{status:'processing',task_id:task.task_id,error_message:null});
   return json({id,status:'processing'},202);
  }catch(e){await patchJob(env,id,{status:'error',error_message:'Falha ao iniciar ou confirmar a tarefa. Verifique o servidor Docling antes de reenviar.'}).catch(()=>{});throw e}
 }
 if(request.method==='POST'&&action==='discard'){
  if(!['uploaded','error'].includes(job.status))fail(409,'Somente envios n\u00e3o iniciados ou com erro podem ser descartados.');
  await patchJob(env,id,{status:'error',error_message:'Envio descartado pelo autor.'});return json({ok:true});
 }
 if(request.method==='PUT'&&!action){
  const b=await bodyJSON(request,MAX_HTML*2+256000),clean=await sanitizeHTML(b.html,env);
  if(!Number.isInteger(b.revision))fail(400,'Revis\u00e3o inv\u00e1lida.');
  const result=await rpc(env,'es40_save_job',{p_actor:actor.id,p_job:id,p_revision:b.revision,p_html:clean.html,p_title:plain(b.title,240,2),p_author:plain(b.author_name,200,2),p_summary:plain(b.summary||'',4000),p_course:plain(b.course_name||'',240)});
  return json({...result,removed_images:clean.removed_images});
 }
 if(request.method==='POST'&&action==='publish'){
  const b=await bodyJSON(request);if(b.reviewed!==true)fail(400,'Confirme a revis\u00e3o do documento.');
  if(!Number.isInteger(b.revision)||typeof b.publish!=='boolean')fail(400,'Op\u00e7\u00e3o de publica\u00e7\u00e3o inv\u00e1lida.');
  return json(await rpc(env,'es40_publish_job',{p_actor:actor.id,p_job:id,p_revision:b.revision,p_publish:b.publish,p_reviewed:true}));
 }
 fail(405,'M\u00e9todo n\u00e3o permitido.');
}
export async function hashIP(ip,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(salt),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ip));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function validateCaptcha(env,request,b){
 if(!env.TURNSTILE_SECRET_KEY)return;
 const token=plain(b.captcha_token||'',2048,1);
 const r=await timedFetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:token,remoteip:request.headers.get('cf-connecting-ip')||undefined})},10000);
 const data=await parseJSON(r,16000);
 if(!data.success||data.hostname!==new URL(request.url).hostname||data.action!=='comment')fail(400,'A verifica\u00e7\u00e3o antispam expirou. Tente novamente.','captcha_failed');
}
async function comments(request,env,url){
 if(request.method==='GET'){const pid=uuid(url.searchParams.get('publication')),offset=pageOffset(url.searchParams.get('offset'));const rows=await rest(env,'rpc/es40_public_comments',{method:'POST',body:{p_publication:pid,p_offset:offset},publicAccess:true});return json({comments:rows,has_more:rows.length===20,offset})}
 if(request.method!=='POST')fail(405,'M\u00e9todo n\u00e3o permitido.');
 if(!commentsReady(env))fail(503,'Os coment\u00e1rios ainda dependem da configura\u00e7\u00e3o do servidor.','comments_not_configured');
 const b=await bodyJSON(request,16000);if(b.website)fail(400,'Envio n\u00e3o aceito.');if(b.consent!==true)fail(400,'Confirme que o nome e o coment\u00e1rio poder\u00e3o ser publicados ap\u00f3s aprova\u00e7\u00e3o.');
 const pid=uuid(b.publication_id),name=plain(b.author_name,80,2),content=plain(b.body,3000,3);
 await validateCaptcha(env,request,b);
 const ip=request.headers.get('cf-connecting-ip');if(!ip)fail(503,'Prote\u00e7\u00e3o de envio indispon\u00edvel fora do Cloudflare.','ip_unavailable');
 const id=await rpc(env,'es40_comment_submit',{p_publication:pid,p_name:name,p_body:content,p_rate_key:await hashIP(ip,env.COMMENTS_IP_SALT)});
 return json({id,status:'pending',message:'Coment\u00e1rio recebido. Aguardando aprova\u00e7\u00e3o.'},201);
}
async function adminComments(request,env,url,actor){
 if(!actor.is_admin)fail(403,'A modera\u00e7\u00e3o exige perfil de administrador.');
 const id=url.pathname.split('/')[4];
 if(request.method==='POST'&&id){const b=await bodyJSON(request);if(!['approve','reject','delete'].includes(b.action))fail(400,'A\u00e7\u00e3o inv\u00e1lida.');return json(await rpc(env,'es40_moderate_comment',{p_actor:actor.id,p_comment:uuid(id),p_action:b.action}))}
 if(request.method!=='GET'||id)fail(405,'M\u00e9todo n\u00e3o permitido.');
 const status=url.searchParams.get('status')||'pending';if(!['pending','approved','rejected'].includes(status))fail(400,'Filtro inv\u00e1lido.');
 const offset=pageOffset(url.searchParams.get('offset')),rows=await rest(env,'es40_comments?status=eq.'+status+'&select=id,publication_id,author_name,body,status,created_at,moderated_at,publications(titulo)&order=created_at.desc,id.desc&limit=30&offset='+offset);
 return json({comments:rows,has_more:rows.length===30,offset,can_delete:actor.is_owner});
}
function stripMarkup(s){return String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()}
export function normalizeCrossref(item){return {title:stripMarkup(item.title?.[0]||'Sem t\u00edtulo'),authors:(item.author||[]).slice(0,16).map(a=>[a.given,a.family].filter(Boolean).join(' ')),journal:stripMarkup(item['container-title']?.[0]||''),year:item.published?.['date-parts']?.[0]?.[0]||item.issued?.['date-parts']?.[0]?.[0]||null,doi:String(item.DOI||''),url:item.DOI?'https://doi.org/'+encodeURI(item.DOI):null,abstract:stripMarkup(item.abstract||'').slice(0,1200)}}
async function scielo(request,env,url,ctx){
 if(request.method!=='GET')fail(405,'M\u00e9todo n\u00e3o permitido.');
 const q=plain(url.searchParams.get('q')||'',240,2),page=pageOffset(url.searchParams.get('page')||0,99);
 const keyURL=new URL('/api/scielo',url.origin);keyURL.searchParams.set('q',q);keyURL.searchParams.set('page',page);
 const cache=globalThis.caches?.default,cacheKey=new Request(keyURL);if(cache){const hit=await cache.match(cacheKey);if(hit)return hit}
 const endpoint=new URL('https://api.crossref.org/prefixes/10.1590/works');endpoint.searchParams.set('query',q);endpoint.searchParams.set('rows','10');endpoint.searchParams.set('offset',String(page*10));if(env.CROSSREF_CONTACT_EMAIL)endpoint.searchParams.set('mailto',env.CROSSREF_CONTACT_EMAIL);
 const r=await timedFetch(endpoint,{headers:{accept:'application/json','user-agent':'EntreSaberes/4.0 (research metadata; https://oswaldobocarica.com.br)'}},20000);
 if(!r.ok)fail(502,'A fonte bibliogr\u00e1fica est\u00e1 indispon\u00edvel. Use a busca oficial SciELO.','research_unavailable');
 const data=await parseJSON(r,4*1024*1024),m=data.message;if(!Array.isArray(m?.items))fail(502,'Resposta bibliogr\u00e1fica inesperada.');
 const response=json({source:'Crossref',scope:'Metadados do prefixo DOI 10.1590; cobertura parcial, n\u00e3o representa toda a Rede SciELO.',query:q,page,total:m['total-results']||0,items:m.items.map(normalizeCrossref),has_more:(page+1)*10<(m['total-results']||0)&&page<99},200,{'cache-control':'public,max-age=600'});
 if(cache&&ctx?.waitUntil)ctx.waitUntil(cache.put(cacheKey,response.clone()));return response;
}
const ALIASES=new Map(['cursos','cursos-pagos','aulas','teens-tech','senhores-professores','otica-do-estado','buscar','biblioteca','memorias','pesquisa','pesquisa-scielo','sobre','certificado','login-aluno','meus-cursos','article','aula','curso','categoria','autor','programa','arquivo','cadastro-aluno','cadastro-colaborador','validar-certificado'].map(s=>['/'+s,'/'+s+'.html']));ALIASES.set('/','/index.html');ALIASES.set('/index','/index.html');ALIASES.set('/validar-certificado','/certificado.html');ALIASES.set('/eja-tec','/aulas.html');ALIASES.set('/admin','/admin/index.html');ALIASES.set('/admin/','/admin/index.html');
function secure(response,path){const h=new Headers(response.headers);h.set('x-content-type-options','nosniff');h.set('referrer-policy','strict-origin-when-cross-origin');h.set('permissions-policy','camera=(), microphone=(), geolocation=()');h.set('x-frame-options','SAMEORIGIN');h.set('x-entre-saberes-version',VERSION);
 if(path.startsWith('/admin'))h.set('content-security-policy',"default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src 'self' blob:; object-src 'none'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");
 if(/html|javascript|text\/css/.test(h.get('content-type')||''))h.set('cache-control','no-store,max-age=0');return new Response(response.body,{status:response.status,headers:h})}
export async function collectResults(env){
 if(!converterReady(env))return;
 const pending=await rest(env,'es40_document_jobs?status=eq.processing&select=*&order=last_polled_at.asc.nullsfirst&limit=5');
 for(const job of pending){try{await pollJob(env,job)}catch(e){if(e.status===413||['converter_task_missing','empty_conversion'].includes(e.code))await patchJob(env,job.id,{status:'error',error_message:e.message}).catch(()=>{});}}
}
export class DoclingContainer extends DurableObject {
 ready;
 async fetch(request){
  const container=this.ctx.container;
  if(!container?.running)this.ready=undefined;
  this.ready??=this.startAndWait().catch(error=>{this.ready=undefined;throw error});
  await this.ready;
  const url=new URL(request.url);url.protocol='http:';url.host='container';
  const forwarded=new Request(url,request);forwarded.headers.delete('host');
  return container.getTcpPort(5001).fetch(forwarded);
 }
 async startAndWait(){
  const container=this.ctx.container;
  await container.setInactivityTimeout(5*60*1000);
  if(!container.running)container.start();
  const port=container.getTcpPort(5001);
  let lastError;
  for(let attempt=0;attempt<480;attempt++){
   try{
    const response=await port.fetch('http://container/docs');
    if(response.ok)return;
    lastError=new Error('Docling readiness '+response.status);
   }catch(error){lastError=error}
   await scheduler.wait(250);
  }
  throw new Error('Docling n\u00e3o ficou pronto no tempo esperado',{cause:lastError});
 }
}

export default {async fetch(request,env,ctx){const url=new URL(request.url);
 try{
  if(!['GET','HEAD'].includes(request.method)&&request.headers.get('origin')!==url.origin)fail(403,'Origem da solicita\u00e7\u00e3o n\u00e3o autorizada.','origin_rejected');
  if(url.pathname==='/api/health'||url.pathname==='/api/config'){if(request.method!=='GET')fail(405,'M\u00e9todo n\u00e3o permitido.');return json(capabilities(env))}
  if(url.pathname==='/api/scielo')return await scielo(request,env,url,ctx);
  if(url.pathname==='/api/scielo-proxy')fail(410,'A consulta agora utiliza /pesquisa-scielo. A reprodu\u00e7\u00e3o integral de sites externos foi desativada.');
  if(url.pathname==='/api/comments')return await comments(request,env,url);
  if(url.pathname.startsWith('/api/admin/')||url.pathname.startsWith('/api/conversions')){
   const actor=await authenticate(request,env);
   if(url.pathname==='/api/admin/session'&&request.method==='GET')return json({...capabilities(env),database_checked:true,access:actor});
   if(url.pathname.startsWith('/api/admin/comments'))return await adminComments(request,env,url,actor);
   if(url.pathname.startsWith('/api/conversions'))return await conversions(request,env,url,actor);
   fail(404,'Rota n\u00e3o encontrada.');
  }
  if(url.pathname==='/api/cursos'&&request.method==='GET'){const rows=await rest(env,'lms_courses?select=id,codigo,titulo,slug,descricao,carga_horaria,imagem_url,status,certificado_ativo,preco&status=eq.publicado&order=criado_em.desc',{publicAccess:true});return json({ok:true,courses:rows})}
  if(url.pathname.startsWith('/api/'))fail(404,'Rota de API n\u00e3o encontrada.');
  if(!['GET','HEAD'].includes(request.method))fail(405,'M\u00e9todo n\u00e3o permitido.');
  if(/(?:^|\/)\.|\.(?:sql|md|toml|jsonc|yml|yaml)$|\/historico\/|\/tests\/|_worker\.js$|package(?:-lock)?\.json$|LEIA-ME|CLOUDFLARE-SETUP/i.test(url.pathname))fail(404,'Arquivo n\u00e3o p\u00fablico.');
  if(!env.ASSETS)fail(503,'Configure a vincula\u00e7\u00e3o ASSETS do Cloudflare.');
  if(url.pathname==='/admin')return new Response(null,{status:308,headers:{location:'/admin/'+url.search,'cache-control':'no-store'}});
  const target=new URL(request.url);if(ALIASES.has(target.pathname))target.pathname=ALIASES.get(target.pathname);
  return secure(await env.ASSETS.fetch(new Request(target,request)),url.pathname);
 }catch(e){const error=e instanceof HttpError?e:new HttpError(500,'N\u00e3o foi poss\u00edvel concluir a solicita\u00e7\u00e3o.','internal_error');return json({ok:false,error:error.message,code:error.code},error.status,error.status===429?{'retry-after':'60'}:{})}
},async scheduled(event,env,ctx){ctx.waitUntil(collectResults(env))}};
