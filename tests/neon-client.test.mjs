import test from 'node:test';
import assert from 'node:assert/strict';
const clientModule=await import('../neon-public-client.js').catch(()=>({}));
const origin='https://preview.example';
function create(options={}){assert.equal(typeof clientModule.createPublicClient,'function');return clientModule.createPublicClient('/api/public',{origin,...options})}
const item=i=>({id:String(i),titulo:'Teste '+i,status:'publicado'});
test('cliente pagina sem ultrapassar cem registros por chamada',async()=>{
  const requests=[];
  const client=create({fetchImpl:async(url,options)=>{
    const parsed=new URL(url);requests.push(parsed);
    assert.equal(options.method,'GET');assert.equal(options.redirect,'error');
    assert.equal(options.signal instanceof AbortSignal,true);
    const offset=Number(parsed.searchParams.get('offset'));
    const limit=Number(parsed.searchParams.get('limit'));
    assert.ok(limit<=100);
    return Response.json({publications:Array.from({length:limit},(_,i)=>item(i+offset))});
  }});
  const rows=await client.list(250);
  assert.equal(rows.length,250);
  assert.deepEqual(requests.map(x=>Number(x.searchParams.get('offset'))),[0,100,200]);
  assert.deepEqual(requests.map(x=>Number(x.searchParams.get('limit'))),[100,100,50]);
});
test('cliente para quando pagina vem incompleta',async()=>{
  let calls=0;const client=create({fetchImpl:async()=>{calls++;return Response.json({publications:[item(1)]})}});
  assert.equal((await client.list(500)).length,1);assert.equal(calls,1);
});
test('erro HTTP nao vira acervo vazio',async()=>{
  const client=create({fetchImpl:async()=>new Response('backend failure',{status:502})});
  await assert.rejects(()=>client.list(30),/502/);
});
test('JSON ou formato invalido e rejeitado',async()=>{
  for(const make of [()=>new Response('invalid'),()=>Response.json({publications:null}),()=>Response.json({publications:[null]})]){
    const client=create({fetchImpl:async()=>make()});
    await assert.rejects(()=>client.list(30));
  }
});
test('cliente nao aceita servidor externo nem caminhos inesperados',()=>{
  assert.equal(typeof clientModule.createPublicClient,'function');
  for(const base of ['https://evil.test/api/public','//evil.test/api/public','/admin','/api/public?key=x']){
    assert.throws(()=>clientModule.createPublicClient(base,{origin}));
  }
});
test('cliente recusa limites invalidos antes de fetch',async()=>{
  const client=create({fetchImpl:()=>{throw Error('fetch nao deve ocorrer')}});
  for(const limit of [0,501,-1,1.5,null,true,'x'])await assert.rejects(()=>client.list(limit),RangeError);
});
test('detalhe inexistente retorna null e os filtros sao codificados',async()=>{
  let called;
  const client=create({fetchImpl:async url=>{called=new URL(url);return new Response(null,{status:404})}});
  assert.equal(await client.get({slug:'titulo-de-teste'}),null);
  assert.equal(called.pathname,'/api/public/publication');
  assert.equal(called.searchParams.get('slug'),'titulo-de-teste');
});
test('detalhe valida identificacao unica e preserva conteudo para sanitizador',async()=>{
  const client=create({fetchImpl:async()=>Response.json({publication:{...item(1),conteudo:'<p>texto</p>'}})});
  assert.equal((await client.get({slug:'teste'})).conteudo,'<p>texto</p>');
  for(const filter of [{},{id:'a',slug:'b'}])await assert.rejects(()=>client.get(filter),RangeError);
});
test('timeout cancela requisicao e produz erro legivel',async()=>{
  const client=create({timeoutMs:10,fetchImpl:(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}))});
  await assert.rejects(()=>client.list(10),/tempo/i);
});
