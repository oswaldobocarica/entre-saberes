# Entre Saberes — preparação de implantação segura

**Situação diagnosticada:** em 19/10/2026, a execução do GitHub Actions [39331773892](https://github.com/oswaldobocarica/entre-saberes/actions/runs/39331773892) falhou ao enviar o Worker principal ao Cloudflare. Os erros registrados foram **9106 (Authentication failed)**, **6003** e **6111 (formato inválido de Authorization)**.

## Alterações propostas (ainda não implantadas)

- Desabilitar Cloudflare Containers/Docling, Durable Object de contêiner e agendamento de 5 em 5 minutos. Esses serviços estavam presentes na configuração de produção e não foram autorizados dentro do orçamento R$ 0.
- Preservar o código histórico e os dados atuais, sem habilitar conversão de documentos enquanto não houver alternativa gratuita e aprovada.
- Ajustar exportação escalar do Worker que pode impedir a inicialização em algumas versões da plataforma.
- Exigir autorização manual explícita no workflow de deploy e verificar a presença/formato do token e a identidade da conta antes do deploy.
- Executar testes de compilação e configuração no GitHub sem publicação, sem credenciais e sem mexer no domínio.

## Passo exclusivo do proprietário

1. Entrar na [página de tokens do Cloudflare](https://dash.cloudflare.com/profile/api-tokens) e criar novo token de API restrito à conta e permissões necessárias para editar Workers.
2. Abrir o GitHub do repositório **oswaldobocarica/entre-saberes**, em **Settings → Secrets and variables → Actions**.
3. Atualizar o segredo **CLOUDFLARE_API_TOKEN** com somente o valor do token, sem o prefixo Bearer, sem aspas ou espaços extras.
4. **Não enviar o token em mensagens.** Nenhum segredo deve ser inserido no HTML ou JavaScript público.
5. Aprovar uma implantação produtiva apenas após verificar a importação das mídias, o login, os backups e o plano de reversão.

## Bloqueios preservados

Este ajuste fica em uma branch e pull request, sem mudar o Worker ou o DNS de produção. A publicação continua manual e exige confirmação explícita. O token correto sozinho não recupera as 11 mídias nem reativa matrículas, pagamentos, login antigo e certificados.

**Objetivo:** impedir custos e falhas evitáveis, mantendo a homologação separada.
