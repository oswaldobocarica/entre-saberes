-- Entre Saberes: staging isolado para migracao de backups Supabase -> Neon.
-- Executar SOMENTE na branch Neon recuperacao-entre-saberes.
-- Nao executa exclusoes nem altera tabelas da aplicacao.
CREATE SCHEMA IF NOT EXISTS recuperacao;
CREATE TABLE IF NOT EXISTS recuperacao.importacao_bruta (
  origem_tabela text NOT NULL,
  numero_linha integer NOT NULL CHECK (numero_linha > 0),
  dados jsonb NOT NULL,
  importado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (origem_tabela, numero_linha)
);
-- Consultas de auditoria apos importar:
-- SELECT origem_tabela, count(*) FROM recuperacao.importacao_bruta GROUP BY 1 ORDER BY 1;
-- SELECT count(*) FROM recuperacao.importacao_bruta;
