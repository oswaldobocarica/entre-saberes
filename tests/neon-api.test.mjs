import test from 'node:test';
import assert from 'node:assert/strict';
import * as publications from '../neon/publicacoes.js';
const api = await import('../neon/api.js').catch(() => ({}));
const db = await import('../neon/database.js').catch(() => ({}));
const ID='12345678-1234-4234-8234-123456789abc';
const env={NEON_DATABASE_URL:'postgresql://readonly:example@ep-test.sa-east-1.aws.neon.tech/neondb?sslmode=require'};
const row={id:ID,slug:'teste',title:'Titulo',summary:'Resumo',author_name:'Autor',published_at:'2026-10-01T12:00:00Z',body:'Texto integral',private_token:'NAO_EXPOR'};
const req=(path,method='GET')=>new Request('https://preview.example'+path,{method});
const handle=(request,sql=async()=>[row],config=env)=>{
  assert.equal(typeof api.handlePublicApi,'function','API de leitura ainda nao conectada');
  return api.handlePublicApi(request,config,{sqlFactory:async()=>sql});
};

test('paginacao e parametrizada e corpo nao aparece na listagem',async()=>{
  let params;
  const rows=await publications.listarPublicacoesPublicas((strings,...values)=>{
    params=values;
    assert.match(strings.join('?'),/OFFSET/);
    assert.doesNotMatch(strings.join('?'),/SELECT\s+\*/i);
    return [row];
  },2,10);
  assert.deepEqual(params,[2,10]);
  assert.equal('conteudo' in rows[0],false);
  assert.equal('private_token' in rows[0],false);
});
test('offsets invalidos sao rejeitados antes de consultar',async()=>{
  for(const offset of [-1,1.5,10001,'abc',null,true]){
    let called=false;
    await assert.rejects(()=>publications.listarPublicacoesPublicas(()=>{called=true;return[]},2,offset),RangeError);
    assert.equal(called,false);
  }
});
test('detalhe por UUID usa parametro e filtro de publicacao',async()=>{
  assert.equal(typeof publications.obterPublicacaoPublica,'function');
  const data=await publications.obterPublicacaoPublica((strings,...params)=>{
    assert.deepEqual(params,[ID]);
    assert.match(strings.join('?'),/lower\(status\) IN \('publicado', 'published'\)/);
    assert.match(strings.join('?'),/published_at <= now\(\)/);
    return [row];
  },{id:ID});
  assert.equal(data.conteudo,'Texto integral');
  assert.equal('private_token' in data,false);
});
test('detalhe por slug e parametrizado e registro ausente retorna null',async()=>{
  assert.equal(typeof publications.obterPublicacaoPublica,'function');
  assert.equal(await publications.obterPublicacaoPublica((strings,...values)=>{
    assert.deepEqual(values,['teste']);return[];
  },{slug:'teste'}),null);
});
test('identificadores invalidos ou ambiguos nao chegam ao SQL',async()=>{
  assert.equal(typeof publications.obterPublicacaoPublica,'function');
  for(const filter of [{},{id:'1 OR 1=1'},{id:ID,slug:'teste'},{slug:'../admin'},{slug:'x'.repeat(201)}]){
    let called=false;
    await assert.rejects(()=>publications.obterPublicacaoPublica(()=>{called=true;return[]},filter),RangeError);
    assert.equal(called,false);
  }
});
test('API responde listagem publica normalizada',async()=>{
  const response=await handle(req('/api/public/publications?limit=2&offset=0'));
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'),null);
  const body=await response.json();
  assert.equal(body.publications[0].titulo,'Titulo');
  assert.equal(body.source,'neon');
});
test('API retorna detalhe e 404 para ausente',async()=>{
  const found=await handle(req('/api/public/publication?id='+ID));
  assert.equal((await found.json()).publication.conteudo,'Texto integral');
  assert.equal((await handle(req('/api/public/publication?slug=ausente'),async()=>[])).status,404);
});
test('POST PUT PATCH DELETE e OPTIONS sao recusados sem acessar banco',async()=>{
  for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS']){
    let called=false;
    const r=await handle(req('/api/public/publications',method),async()=>{called=true;return[]});
    assert.equal(r.status,405);assert.equal(called,false);
  }
});
test('parametros invalidos repetidos ou de preview sao 400',async()=>{
  for(const path of ['/publications?limit=0','/publications?limit=101','/publications?limit=1.5','/publications?limit=1&limit=2','/publications?offset=-1','/publications?status=draft','/publication?slug=teste&preview=1','/publication?id=x','/publication?slug=teste&slug=outro']){
    let called=false;
    const r=await handle(req('/api/public'+path),async()=>{called=true;return[]});
    assert.equal(r.status,400,path);assert.equal(called,false,path);
  }
});
test('falha de configuracao e 503 e nao equivale a acervo vazio',async()=>{
  assert.equal(typeof api.handlePublicApi,'function');
  const r=await api.handlePublicApi(req('/api/public/publications'),{});
  assert.equal(r.status,503);
  assert.equal((await r.json()).code,'neon_not_configured');
});
test('erro bruto de banco e credencial nunca vazam na resposta',async()=>{
  const r=await handle(req('/api/public/publications'),async()=>{throw Error(env.NEON_DATABASE_URL+' NAO_EXPOR')});
  assert.equal(r.status,502);
  const text=await r.text();
  assert.doesNotMatch(text,/postgresql|readonly|NAO_EXPOR|ep-test/);
});
test('saude verifica uma consulta e nao apenas presenca de secret',async()=>{
  let called=false;
  const r=await handle(req('/api/public/health'),async()=>{called=true;return[{visible_publications:6}]});
  const body=await r.json();
  assert.equal(r.status,200);assert.equal(called,true);
  assert.equal(body.database_checked,true);assert.equal(body.publications_count,6);
  const fail=await handle(req('/api/public/health'),async()=>{throw Error('unavailable')});
  assert.equal(fail.status,502);
});
test('rota desconhecida nao consulta e rota externa retorna null',async()=>{
  assert.equal(await handle(req('/index.html')),null);
  let called=false;
  const r=await handle(req('/api/public/users'),async()=>{called=true;return[]});
  assert.equal(r.status,404);assert.equal(called,false);
});
test('HEAD preserva status mas nao tem corpo',async()=>{
  const r=await handle(req('/api/public/publications','HEAD'));
  assert.equal(r.status,200);assert.equal(await r.text(),'');
});
test('adaptador recusa host nao Neon antes de importar driver',async()=>{
  assert.equal(typeof db.createReadOnlySql,'function');
  for(const value of ['', 'https://example.com', 'postgres://a:b@evil.test/neondb','postgres://a:b@evilneon.tech/neondb']){
    await assert.rejects(()=>db.createReadOnlySql({NEON_DATABASE_URL:value}),e=>e.code==='neon_not_configured');
  }
});
test('adaptador cria transacao somente leitura com timeout',async()=>{
  assert.equal(typeof db.createReadOnlySql,'function');
  const driver=(strings,...params)=>({strings,params});
  driver.transaction=async(queries,options)=>{
    assert.equal(options.readOnly,true);
    assert.equal(options.fetchOptions.signal instanceof AbortSignal,true);
    assert.equal(options.fetchOptions.redirect,'error');
    assert.deepEqual(queries[0].params,['valor']);
    return [[{valor:1}]];
  };
  const sql=await db.createReadOnlySql(env,()=>driver);
  assert.deepEqual(await sql`SELECT ${'valor'}`,[{valor:1}]);
});
