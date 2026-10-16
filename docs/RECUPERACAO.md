# Recuperacao Entre Saberes — Neon + Cloudflare

## Regras de seguranca
- Trabalhar na branch GitHub `recuperacao-neon-cloudflare` e na branch Neon `recuperacao-entre-saberes`.
- Nao alterar producao antes de validacao, copia recuperavel e plano de rollback.
- Nao versionar dumps SQL contendo dados pessoais, senhas, tokens, credenciais, arquivos privados ou connection strings.
- Custo autorizado: R$ 0. Nao ativar recursos pagos ou assumir despesas.
- A recuperacao dos registros depende da validacao do dump de 13/10/2026.

## Etapas
1. Conferir integridade dos backups, estrutura das tabelas e referencias entre dados.
2. Importar dados originais em `recuperacao.importacao_bruta` na branch de testes; comparar contagens e identificadores.
3. Projetar esquema definitivo PostgreSQL e migrar dados sem dependencias do Supabase.
4. Substituir chamadas Supabase por API autenticada em Cloudflare Workers e Neon.
5. Implementar login seguro, redefinicao de senha e autorizacao por perfil. Nao expor Neon ao navegador.
6. Migrar midias para armazenamento autorizado, preservando referencias e verificando acesso.
7. Testar publicacoes, cursos, aulas, jogos, edicao, arquivos, responsividade, privacidade e recuperacao.
8. Publicar somente apos testes e rollback comprovados.

## Monetizacao posterior
- Conteudo basico gratuito; cursos e materiais premium opcionais.
- Nao cobrar sem politica de precos, termos, privacidade, meio de pagamento aprovado e demonstracao do custo por transacao.

## Situacao inicial
- Staging Neon criado e vazio antes da importacao.
- Codigo e backups disponiveis para auditoria.
- Cloudflare de testes ainda nao conectado por ferramenta autenticada.
