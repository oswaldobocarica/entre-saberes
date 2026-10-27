import test from 'node:test';
import assert from 'node:assert/strict';
import { listarPublicacoesPublicas, normalizarPublicacao } from '../neon/publicacoes.js';

test('normaliza somente campos publicos', () => {
  const p = normalizarPublicacao({id:'a',slug:'abc',title:'Teste',summary:null,author_name:'Autor',published_at:'2026-10-01',private_token:'segredo'});
  assert.equal(p.titulo,'Teste');
  assert.equal(p.resumo,'');
  assert.equal('private_token' in p,false);
});
test('recusa limites invalidos antes da consulta', async () => {
  for (const limit of [0,101,-1,1.5,'abc']) {
    await assert.rejects(() => listarPublicacoesPublicas(() => { throw Error('SQL nao deveria executar'); },limit),RangeError);
  }
});
test('retorna publicacoes normalizadas usando parametro de consulta', async () => {
  const sql=(strings,...params) => {
    assert.equal(params[0],2);
    assert.match(strings.join('?'),/published_at <= now\(\)/);
    return [{id:'1',slug:'teste',title:'Artigo',summary:'Resumo',author_name:'Autora',published_at:'2026-10-01'}];
  };
  const rows=await listarPublicacoesPublicas(sql,2);
  assert.equal(rows.length,1);
  assert.equal(rows[0].titulo,'Artigo');
});
