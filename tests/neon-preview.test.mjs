import test from 'node:test';
import assert from 'node:assert/strict';
const preview=await import('../neon/worker.js').catch(()=>({}));
const request=(path,method='GET',host='preview.example')=>new Request('https://'+host+path,{method});
function serve(req,env={}){assert.equal(typeof preview.fetchPreview,'function');return preview.fetchPreview(req,env)}
test('configuracao publica ativa API mas nao contem credenciais',async()=>{
  const r=await serve(request('/config.js?v=1'),{NEON_DATABASE_URL:'postgres://secret@host'});
  assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/javascript/);
  const js=await r.text();assert.match(js,/publicApiBase/);assert.doesNotMatch(js,/postgres|secret@|supabase/);
});
test('homologacao nao funciona acidentalmente no dominio de producao',async()=>{
  for(const host of ['oswaldobocarica.com.br','www.oswaldobocarica.com.br'])assert.equal((await serve(request('/', 'GET', host))).status,503);
});
test('fontes secrets arquivos e administracao nao sao servidos',async()=>{
  for(const path of ['/neon/database.js','/.env','/.dev.vars','/tests/neon-api.test.mjs','/wrangler.homologacao.jsonc','/package.json','/%2eenv','/backup/dados.json','/docs/RECUPERACAO.md','/admin/']){
    let read=false;const r=await serve(request(path),{ASSETS:{fetch:async()=>{read=true;return new Response('secret')}}});
    assert.ok(r.status===404||r.status===503,path);assert.equal(read,false,path);
  }
});
test('assets de leitura continuam disponiveis e nao indexaveis',async()=>{
  const r=await serve(request('/styles.css'),{ASSETS:{fetch:async()=>new Response('body{}',{headers:{'content-type':'text/css'}})}});
  assert.equal(r.status,200);assert.equal(await r.text(),'body{}');assert.match(r.headers.get('x-robots-tag'),/noindex/);
});
test('POST e API desconhecida nao atingem os assets',async()=>{
  assert.equal((await serve(request('/index.html','POST'))).status,405);
  assert.equal((await serve(request('/api/admin'))).status,503);
});
test('api sem secret retorna falha explicita e HEAD nao retorna corpo',async()=>{
  assert.equal((await serve(request('/api/public/publications'))).status,503);
  const r=await serve(request('/config.js','HEAD'));assert.equal(r.status,200);assert.equal(await r.text(),'');
});
test('caminhos administrativos codificados tambem ficam bloqueados',async()=>{
  for(const path of ['/%61dmin/index.html','/admin%2findex.html','/%2561dmin/index.html']){
    let read=false;const r=await serve(request(path),{ASSETS:{fetch:async()=>{read=true;return new Response('admin')}}});
    assert.ok(r.status===404||r.status===503,path);assert.equal(read,false,path);
  }
});
