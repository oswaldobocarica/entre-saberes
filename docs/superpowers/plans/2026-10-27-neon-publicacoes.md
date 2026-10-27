# Correcao da leitura publica Neon - Implementation Plan

> For agentic workers: execute inline with executing-plans and TDD.

**Goal:** Conectar as publicacoes do banco recuperado ao portal em homologacao, sem alterar producao.
**Architecture:** Worker isolado, driver oficial Neon somente no servidor, API parametrizada somente de leitura. Paginas existentes usam a API apenas quando publicApiBase estiver configurado. O modo legado continua sem alteracao de configuracao.
**Tech Stack:** Node 22, Cloudflare Workers, @neondatabase/serverless, node:test.
**Spec:** Continuidade autorizada nesta conversa; preservar dados e dominio; sem recarga ou contratacao.

## Global Constraints
- Branch remota: integracao-neon-homologacao-20261027; base baa083314bb92ce873077503d3419d86711d923e.
- Nao alterar main, wrangler.jsonc, config.js ou dados no Neon.
- Credencial NEON_DATABASE_URL somente como secret do servidor; nunca em codigo publico.
- Publicar somente registros published/publicado, com published_at nao nulo e nao futuro.
- Nenhum endpoint de gravacao, autenticacao alternativa ou exposicao da importacao bruta.

## Review Focus
- Parametros repetidos, filtros desconhecidos e preview nao podem contornar publicacao.
- Respostas e logs nao podem conter credenciais nem mensagens brutas do PostgreSQL.
- Falha do banco nao equivale a acervo vazio e nao causa fallback para outro banco.
- Limites 1..100 e offset 0..10000 devem ser validados antes do SQL.
- Configuracao de homologacao nao deve apontar ao Worker ou dominio de producao.

### Task 1: API de leitura
Files: neon/publicacoes.js, neon/database.js, neon/api.js; tests/neon-api.test.mjs.
Interfaces: createReadOnlySql(env), handlePublicApi(request, env, {sqlFactory}), listarPublicacoesPublicas(sql, limite, offset), obterPublicacaoPublica(sql, {id,slug}).
- [ ] Escrever testes para detalhe, paginacao, validacao e ausencia de segredos.
- [ ] Executar e observar falhas esperadas.
- [ ] Implementar consultas parametrizadas e transacao readOnly, testar novamente.

### Task 2: Cliente e homologacao
Files: neon-public-client.js, portal.js, cms-public.js, neon/worker.js, wrangler.homologacao.jsonc, .assetsignore.
- [ ] Testar cliente com paginacao, HTTP falho, endereco externo e timeout.
- [ ] Integrar por configuracao explicita, manter modo legado.
- [ ] Testar isolamento de assets/administracao e ausencia de credenciais na configuracao publica.

### Task 3: Verificacao e entrega
Files: package.json, .github/workflows/validar-recuperacao.yml, docs/NEON_HOMOLOGACAO.md.
- [ ] Incluir todos os testes em npm test e a branch na validacao CI.
- [ ] Executar testes locais, leitura SQL no Neon e CI/dry-run quando acessivel.
- [ ] Commit atomico somente na branch isolada; nao acionar deploy de producao.
- [ ] Relatar exatamente os testes executados e o bloqueio de login/secret para deploy.
