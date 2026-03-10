# Changelog

Todas as mudancas importantes deste projeto serao documentadas neste arquivo.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e versionamento semantico [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added
- Estrutura inicial de changelog e fluxo de release.
- Script `scripts/release.ps1` com opcao de `commit + tag` automaticos.
- Guia de release em `RELEASE.md` e instrucoes no `README.md`.
- Scripts de conveniencia no backend para testes sem `up.ps1`: `infra:up`, `infra:down`, `infra:status`, `verify:local`.
- Registro de riscos de seguranca em `SECURITY-RISK-REGISTER.md`.
- Script `scripts/security-monthly-check.ps1` para gerar relatorio mensal de `npm audit` (frontend + backend).
- Script `vetpro-front/scripts/check-no-native-popups.js` para bloquear reintroducao de `alert/confirm/prompt` no frontend.
- Script backend `ai:evaluate:field-dataset` para avaliar o agente de campo usando dataset real (`dataset_treinamento_veterinario_apolo`, JSON + WAV) e gerar relatorio em `vetpro-backend/logs`.
- Script backend `ai:evaluate:field-dataset:simulated` para benchmark sem audio real, com simulacao de ruído ASR em multiplas rodadas.

### Changed
- Frontend passou a abrir/download de PDF/arquivos via API autenticada + `blob`.
- Auth bootstrap no frontend passou a concluir OAuth por `code` (`/oauth/callback` e `/oauth/complete-register`) sem token em URL.
- Contrato de atualizacao de paciente padronizado: `PUT` para atualizacao completa e `PATCH` para atualizacao parcial.
- Frontend migrou de `react-scripts` para `Vite` (dev/build/test), mantendo porta `3000` e compatibilidade de env com fallback legado.
- Backend lint estabilizado com correcoes de estilo/regras em services e scripts de suporte.
- Script `up.ps1` reforcado com checks de inicializacao (`.env`, health backend/frontend e resumo de containers).
- `up.ps1` agora valida se o frontend esta em stack Vite e alerta quando apenas `REACT_APP_API_BASE_URL` estiver definido no `.env`.
- `up.ps1` deixou de alertar falso positivo de `DATABASE_URL` quando configuracao `POSTGRES_*` ja esta presente.
- Backend passou a expor Swagger apenas fora de producao por padrao; em producao exige `ENABLE_SWAGGER_DOCS=true`.
- Backend atualizado com patches de seguranca sem breaking change: `multer@2.1.1`, `express-rate-limit@8.3.1` e cadeia `@aws-sdk/*` mais recente.
- Backend migrou de `bcrypt` para `bcryptjs` para eliminar cadeia nativa vulneravel (`node-pre-gyp`/`tar`) sem impacto funcional no fluxo de autenticacao.
- Fluxo Docker do frontend passou a buildar artefatos em `dist` com `VITE_API_BASE_URL` (e fallback `REACT_APP_API_BASE_URL`).
- Rotinas de I/O backend passaram a evitar `fs.*Sync` em pontos de runtime criticos (`cloudStorageService`, geracao de receita e limpeza de conta).
- Barras de acao de consulta foram consolidadas para comportamento responsivo consistente em desktop/mobile, removendo uso de `fixed` que causava sobreposicao de campos.
- Pipeline heuristico de campos especificos (porte) foi reforcado com sanitizacao semantica, limpeza de prefixos conversacionais e deduplicacao entre campos para reduzir sobrepreenchimento.
- Pipeline de audio do Modo Campo passou a enviar `language=pt` para transcricao Whisper e a reclassificar speaker dos segmentos retornados pelo ASR com heuristica de contexto clinico.
- Modo Campo passou a selecionar campos do plano (`treatment`, `medications`, `examDetails`, `returnRecommendation`) com base em aderencia ao transcript, reduzindo dependencia de texto generativo com baixa ancoragem.
- Modo Campo passou a aplicar normalizacao clinica orientada por contexto nos campos `diagnosis` e `physicalExam`, melhorando previsibilidade do preenchimento em transcricoes com ruído.

### Fixed
- Removido envio de token por query string no frontend (`token` em URL).
- OAuth callback migrado para `code` de uso unico + endpoint de troca (`/api/oauth/exchange-code`).
- Update parcial de paciente deixou de sobrescrever campos nao enviados com nulos/defaults.
- `smoke-checklist` agora imprime diagnostico direto no terminal (alem do logger) para facilitar troubleshooting de CI/local.
- Pipeline backend validado em ambiente local: `npm run lint`, `npm test -- --runInBand` e `npm run smoke:checklist` executando sem falhas.
- Checklist frontend validado em ambiente local: `npm run build` e `npm test -- --watchAll=false` executando sem falhas.
- Checklist frontend atualizado e validado em ambiente local: `npm run build` e `npm run test` executando sem falhas no fluxo Vite/Vitest.
- `npm run test` do frontend agora valida automaticamente ausencia de popups nativos antes dos testes (`check:no-native-popups`).
- Ajustado layout de acoes em `QuickConsultation` e `FieldModeConsultation` para evitar "campos flutuantes" e manter leitura dos formularios no mobile.
- Corrigido preenchimento inconsistente de ficha de porte quando o audio traz falas conversacionais (ex.: "Certo, Ricardo..."), reduzindo poluicao em massa de campos nao relacionados.
- Extração por labels em campos de porte passou a respeitar melhor limites de bloco/speaker (`Tutor/Vet`) para evitar "vazamento" de um campo para o seguinte.
- Cobertura de regressao adicionada no backend para cenarios de sobrepreenchimento e subpreenchimento de campos especificos de grande porte.
- Interceptor HTTP do frontend passou a tratar `401` com fluxo mais robusto de expiracao/refresh (quando `refreshToken` existir), reduzindo cascata de erros por sessao expirada.
- Abertura de PDF/blob em nova aba agora preabre a guia no clique e navega apos o download, evitando falha "Nao foi possivel abrir nova aba" por bloqueio de popup.
- Mensagens de erro `400` no frontend agora exibem detalhes de validacao por campo (quando backend retorna `details`), facilitando identificar rapidamente o motivo de falha ao salvar consulta.
- Salvamento de consulta agora tenta focar e rolar para o primeiro campo invalido informado pelo backend (`details[0].field`) em `QuickConsultation` e `FieldModeConsultation`.
- Loader de ambiente do backend agora monta `DATABASE_URL` automaticamente via `POSTGRES_*` quando ausente (com fallback de host para execucao local fora de container).
- Baseline de seguranca backend atualizado com `npm audit` sem vulnerabilidades apos upgrades e limpeza de dependencias.
- `field-assist` agora aplica fallback para transcricao textual fornecida quando o retorno do Whisper vier com baixo sinal clinico, reduzindo perda de informacao em audios ruidosos.
- Avaliador `ai:evaluate:field-dataset` passou a incluir cobertura de campos de porte (vacinacao, vermifugacao e sinais de exame fisico) no score.
- Campo `treatment` do assistente de campo agora recebe normalizacao canonica de conduta (ex.: suporte hidrico, ajuste nutricional, monitoramento), melhorando consistencia em testes com transcricao ruidosa.
- Regressao de preenchimento do assistente de campo ampliada com casos para priorizacao por aderencia e estabilizacao de `diagnosis`/`physicalExam`.

### Security
- Removido fallback de autenticacao por `query.token` no backend (agora apenas `Authorization: Bearer`).
- Logger backend passou a aplicar redaction global para campos/strings sensiveis (`authorization`, `token`, `refreshToken`, `password`, `secret`, `api key`).

## [1.0.0] - 2026-03-09

### Added
- Estrutura base de frontend e backend do VetPro.


