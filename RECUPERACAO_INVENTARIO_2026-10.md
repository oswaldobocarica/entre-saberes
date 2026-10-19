# Recuperação Entre Saberes — inventário verificado

Data da verificação: 2026-10-18/19.

## Fontes preservadas

- GitHub: oswaldobocarica/entre-saberes, branch recuperacao-neon-cloudflare.
- Neon: projeto quiet-wind-19017788, branch recuperacao-entre-saberes (br-noisy-sunset-b69mvw89), banco neondb.
- A tabela recuperacao.importacao_bruta contém 216 registros de 18 tabelas de origem, verificados por SELECT GROUP BY.
- Tabelas de aplicação: app.publications (6), app.courses (11), app.lessons (10), conforme contagem anterior.

## Inventário da importação bruta

| Origem | Registros |
|---|---:|
| aulas_quiz_atividades | 1 |
| aulas_quiz_etapas_praticas | 2 |
| aulas_quiz_questoes | 30 |
| aulas_quiz_tentativa_itens | 70 |
| aulas_quiz_tentativas | 7 |
| badges | 6 |
| categories | 9 |
| certificate_templates | 1 |
| course_modules | 10 |
| course_skills | 11 |
| courses | 11 |
| learning_tracks | 3 |
| lms_courses | 11 |
| profiles | 3 |
| publication_categories | 5 |
| publications | 6 |
| skills | 21 |
| track_courses | 9 |
| **Total** | **216** |

## Impedimentos técnicos verificados

- config.js, admin/admin.js e _worker.js dependem do Supabase antigo, incluindo Auth, REST, Storage e RPC.
- Neon PostgreSQL não substitui diretamente a API e a autenticação Supabase.
- Conteúdos de mídia e anexos ainda exigem auditoria; registros de metadados não provam presença dos arquivos.

## Regras de recuperação

1. Não alterar branch main, domínio principal ou produção sem homologação.
2. Não expor credenciais, dados pessoais ou registros de alunos em repositório público.
3. Manter cópia de segurança dos dados antes de qualquer migração.
4. Implementar login administrativo seguro e API compatível em ambiente isolado.
5. Testar publicações, cursos, aulas, jogos e gravação antes da implantação.
6. Não contratar serviços pagos ou consumir créditos medidos sem autorização.

Este inventário documenta evidências verificadas; não declara o site restaurado.
