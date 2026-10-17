import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('arquivos essenciais da vitrine existem', () => {
  for (const file of ['index.html', 'styles.css', 'jogos.html', 'aulas.html', 'cursos.html', 'biblioteca.html', '_worker.js', 'wrangler.jsonc']) {
    assert.ok(existsSync(new URL('../' + file, import.meta.url)), 'Arquivo ausente: ' + file);
  }
});

test('pagina inicial oferece navegacao para conteudo publico', () => {
  const html = read('index.html');
  for (const href of ['jogos.html', 'aulas.html', 'cursos.html', 'biblioteca.html']) {
    assert.ok(html.includes('href="' + href + '"'), 'Link ausente: ' + href);
  }
});

test('configuracao de homologacao nao inclui containers ou cron', () => {
  const raw = read('wrangler.jsonc').replace(/\/\/[^\n]*$/gm, '');
  const config = JSON.parse(raw);
  assert.equal(config.name, 'calm-voice-5d27');
  assert.equal(config.containers, undefined);
  assert.equal(config.triggers, undefined);
});

test('backend nao incorpora chave privada de banco no codigo', () => {
  const worker = read('_worker.js');
  assert.ok(worker.includes('env.SUPABASE_SERVICE_ROLE_KEY'));
  assert.doesNotMatch(worker, /(?:service_role|sb_secret_)[A-Za-z0-9_-]{20,}/i);
});

test('integracao Neon ainda nao foi homologada: diagnostico', () => {
  const worker = read('_worker.js');
  assert.match(worker, /SUPABASE_URL/);
  assert.match(worker, /auth\/v1\/user/);
});
