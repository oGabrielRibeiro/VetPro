# Registro de Riscos de Seguranca (Dependencias)

## RISCO-2026-001 - `swagger-jsdoc@6.2.8` (vulnerabilidades transitivas sem patch)
- Status: Aceito temporariamente com mitigacao
- Escopo: Backend (`vetpro-backend`)
- Dependencia: `swagger-jsdoc@6.2.8`
- Tipo: Transitiva / sem remediation automatica no momento
- Impacto potencial: Exposicao adicional caso documentacao OpenAPI fique publica em ambiente de producao.
- Mitigacao aplicada:
  - Swagger isolado para ambiente interno/dev.
  - Em producao, `/api-docs` e `/api-docs.json` retornam `404` por padrao.
  - Habilitacao explicita apenas via `ENABLE_SWAGGER_DOCS=true`.
- Dono: Time Backend
- Data de abertura: 2026-03-10
- Prazo de reavaliacao: 2026-04-10
- Frequencia de revisao: Mensal
- Plano de saida:
  - Monitorar release oficial com correcao.
  - Atualizar dependencia quando houver versao corrigida.
  - Remover excecao deste registro apos validacao em ambiente de homologacao.

## Rotina de revisao mensal
- Executar: `pwsh .\scripts\security-monthly-check.ps1`
- Evidencia: relatorio em `security\reports\`.
