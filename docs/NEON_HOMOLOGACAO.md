# Leitura publica Neon - homologacao de 27/10/2026

## Escopo entregue

API de listagem paginada e leitura individual das publicacoes recuperadas; cliente HTTP de mesma origem; integracao condicional na pagina inicial, Biblioteca, autoria, relacionados e artigo. Entrada Cloudflare isolada em `neon/worker.js`, selecionada apenas por `wrangler.homologacao.jsonc`.

`config.js`, `_worker.js`, `wrangler.jsonc` e a branch main nao sao modificados por esta etapa. As paginas mantem o caminho legado quando `publicApiBase` nao esta configurado. O Worker de homologacao fornece essa configuracao em `/config.js`; nao e necessario incluir uma senha ou URL de banco no navegador.

## Seguranca e limites

- Somente GET/HEAD. Nenhuma rota de escrita ou substituicao da autenticacao administrativa.
- Consultas SQL parametrizadas; transacao `readOnly: true` e timeout de 10 segundos pelo driver oficial.
- Somente registros com status `published`/`publicado`, data nao nula e nao futura.
- Listagem de 1 a 100 registros por pagina, offset ate 10000. O cliente pagina ate 500 registros para os componentes existentes.
- Projecao explicita de campos, sem importacao bruta, perfis, respostas de alunos ou mensagens internas do banco.
- Credencial somente no secret `NEON_DATABASE_URL` do Worker. Preferir role dedicada, sem escrita, autorizada somente a consultar `app.publications`.
- `NEON_EXPECTED_HOST` pode fixar o host da branch recuperada; usar o host real obtido pelo painel, sem adivinha-lo.
- Falhas HTTP geram aviso, nunca uma falsa listagem vazia. Sem fallback silencioso para Supabase quando o modo Neon estiver ativo.
- Administracao bloqueada na homologacao. Fontes e arquivos de configuracao nao sao servidos como assets. O Worker recusa os dois hosts de producao como protecao contra configuracao acidental.
- HTML dos artigos continua usando DOMPurify quando disponivel e texto escapado quando o sanitizador nao carregar.

## Base de dados correta

Projeto `quiet-wind-19017788`, branch `br-noisy-sunset-b69mvw89` (`recuperacao-entre-saberes`), banco `neondb`.
Nao apontar a credencial para a branch vazia `production`.

Leituras em 27/10/2026 confirmaram 216 registros brutos, 6 publicacoes, 11 cursos e 10 aulas. As 6 publicacoes passam pelo filtro de visibilidade; nenhum slug e incompativel e nenhum texto esta vazio. Foram somente SELECTs: nenhuma migracao, alteracao de registro ou copia de seguranca foi executada nesta etapa.

## Como validar e publicar apenas o preview

1. Executar `npm install --no-audit --no-fund`, `npm test` e `npm run check:neon`.
2. Confirmar a conta Cloudflare e o Worker `entre-saberes-homologacao`. Nao executar o deploy de producao do workflow antigo.
3. Cadastrar a conexao da branch recuperada exclusivamente como secret:
   `npx wrangler secret put NEON_DATABASE_URL --config wrangler.homologacao.jsonc`
   Inserir a credencial no prompt protegido, nunca em commit, comentario ou conversa.
4. Depois das validacoes, publicar somente o preview:
   `npx wrangler deploy --config wrangler.homologacao.jsonc`
5. Usar o endereco workers.dev efetivamente devolvido pelo Cloudflare. Confirmar `/api/public/health` com HTTP 200, `database_checked: true` e `publications_count: 6`; testar inicial, biblioteca, artigos, falha controlada, ausencia de acesso administrativo e ausencia de secrets na rede.
6. Nao apontar o dominio principal antes da homologacao e de um plano de reversao. Gerar/revisar o lockfile antes da promocao para producao.

O workflow de validacao faz somente testes e dry-run; ele nao publica.

## Verificacao executada nesta etapa

- 35 testes Node locais passaram (os 3 testes anteriores de publicacoes mais 32 novos).
- 8 verificacoes Chromium offline passaram, usando fixtures explicitas de rede/dados. Validaram renderizacao, escape de HTML, preview editorial bloqueado, aviso de erro e preservacao do caminho legado. Nao sao testes do site real com o banco real.
- O filtro temporal/status tambem foi executado no PostgreSQL com casos sinteticos em CTE, sem criar tabelas: apenas os 2 casos publicos/passados foram visiveis.
- Verificacao integral do repositorio e compilacao dependem do resultado do CI; nao presumir sucesso sem ler a execucao.
- Teste opcional de navegador: `python tests/neon-browser.py` com Playwright e Chromium disponiveis; `CHROMIUM_EXECUTABLE` permite selecionar o executavel.

## Ainda nao entregue

Deploy e teste real do preview; acesso autenticado Cloudflare na nova conta TinyFish; autenticacao e gravacao administrativas; cursos/matriculas/certificados; categorias, metadados editoriais, busca e midias; correcao DNS/roteamento de www.

A classificacao editorial ausente no schema recuperado nao e inventada: a API usa tipo generico e as paginas tematicas indicam a pendencia. Vencimento de sessao TinyFish nao e tratado como falha do banco ou dependencia de funcionamento do site.
