# Entre Saberes — piloto WordPress + GitHub + Cloudflare

## Objetivo
Validar publicacao editorial sem alterar a producao, sem expor dados pessoais e sem contratar recursos pagos.

## Limites
- Nao modificar a branch principal, DNS ou deploy de producao.
- Nao exportar usuarios, senhas, notas, tentativas ou dados pessoais para GitHub.
- Manter a branch isolada do Neon como copia de recuperacao.
- Nao habilitar Containers, cron ou recursos faturaveis para o piloto.
- Nao presumir que Cloudflare Pages executa PHP/WordPress.

## Arquitetura do piloto
1. WordPress em instalacao de teste com hospedagem PHP e MySQL/MariaDB ja disponivel, caso exista.
2. Conteudo editorial de teste, sem dados pessoais, exportado como HTML estatico.
3. GitHub armazena apenas arquivos estaticos publicados e codigo de automacao, em branch de teste.
4. Cloudflare hospeda somente a exportacao estatica em ambiente de preview separado, apos validacao de custo e configuracao.
5. Jogos HTML podem permanecer estaticos; login, avaliacao e certificados exigem backend seguro independente.

## Validacoes antes de publicar
- Confirmar tipo de WordPress: WordPress.com ou WordPress instalado em hospedagem propria.
- Confirmar se existe hospedagem PHP/MySQL sem custo adicional.
- Validar processo de exportacao estatica, URLs, imagens e links internos.
- Verificar se nenhum dado pessoal foi exportado.
- Validar preview em dominio de teste, sem alterar o dominio principal.
- Testar retorno/rollback antes de considerar qualquer migracao.

## Estado
Documento de planejamento criado na branch de recuperacao. Nenhum WordPress conectado, nenhuma publicacao realizada.
