# Changelog

Todas as mudancas importantes deste projeto serao documentadas neste arquivo.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e versionamento semantico [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]
### UI/UX
- Removido o `styles.css` antigo e redundante para evitar conflito com os tokens centralizados em `index.css`.
- Consolidacao de tokens de tipografia e radius no `index.css` e ajuste de contraste de textos secundarios no modo escuro.
- Base unificada de cards e inputs (`vp-card` / `vp-input-field`) aplicada em componentes e formularios chave.
- Hierarquia tipografica padronizada (`vp-h1`, `vp-h2`, `vp-h3`, `vp-overline`, `vp-subtitle`, `vp-helper`) nas telas principais.
- Ajuste de safe-area no mobile para evitar sobreposicao do header e da navegacao inferior.
- Agrupamento colapsavel em formularios longos (QuickConsultation e ConsultationForm) para reduzir scroll.
- Altura minima touch padronizada (>= 44px) em tabs/segmentos e calendario com confirmacao explicita.
- Skeletons adicionados aos relatorios para evitar saltos visuais durante carregamento.
- Debounce aplicado em buscas e filtros (Pacientes, Consultas, Agenda) para reduzir recalculos durante digitacao.
- Transicoes sutis adicionadas nos estados de loading/erro/empty das principais telas.
- Safe-area aplicado nas acoes flutuantes para evitar sobreposicao em dispositivos com notch.
- Script de auditoria de classes CSS adicionado para identificar estilos possivelmente nao utilizados.
- Validacao por campo no ConsultationForm com foco automatico e destaque visual nos campos obrigatorios.
- Documentacao rapida de tokens e componentes base em `vetpro-front/UI-DESIGN-SYSTEM.md`.
- Ajustes de contraste AA adicionais (texto secundario/muted e placeholders) e variantes dark para alertas info/erro.
- Checklist de evidencias UI/UX consolidado em `TODO-UI-UX.md`.
- Roteiro de validacao UI/UX adicionado em `docs/UIUX-VALIDACAO.md` com helper `scripts/uiux-validate.ps1`.
- Formularios especificos de consulta adicionados no frontend (anestesia e prescricao) com dados customizados.
- Modo Campo agora alterna para formularios especificos (anestesia/medicacao) quando selecionado.
- PDF do prontuario agora inclui resumo de anestesia quando `consultationType=anestesia`.
- PDF de anestesia ganhou layout dedicado com legenda e tabela de monitorizacao.
- PDF de anestesia agora exibe cabecalho completo da clinica (logo, nome, endereco, contato).
- Legenda e rotulos da tabela de monitorizacao da anestesia ajustados (PAM/EtCO2 com marcadores) para ficar mais fiel ao modelo impresso.
- Tabela de monitorizacao da anestesia recebeu dimensoes mais quadradas e legenda ampliada (PASV) para aproximar do layout impresso.
- Formulario de anestesia ganhou campos adicionais (sonda e resgate) e PDF passou a exibir esses dados e suporte (oxigenio/ventilacao).
- Novos formularios dedicados para procedimento, internacao, vacinacao, retorno e laudo foram adicionados ao frontend.
- PDF agora gera layouts dedicados para medicacao, procedimento, internacao, vacinacao, retorno e laudo com assinatura do veterinario.
- Captura de assinatura do tutor adicionada para anestesia e procedimento, com renderizacao no PDF.
- Assinaturas de consentimento agora sao persistidas em tabela dedicada com metadados de captura.
- Upload de anexos agora limita fotos clinicas por consulta (configuravel via `MAX_CLINICAL_PHOTOS`).

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
- Pipeline de gold dataset para campo com scripts `ai:gold:build` e `ai:gold:validate`, gerando `src/ai/benchmarks/field-assist-gold-dataset.json` e `field-assist-rubric.json`.
- Documento operacional `docs/FIELD-ASSIST-GOLD-DATASET.md` com fluxo de geracao/validacao e estrutura oficial da base.
- Endpoint de feedback supervisionado por campo (`POST /api/consultations/field-assist/feedback`) com persistencia em JSONL para telemetria anonima opcional.
- Scripts de aprendizado continuo: `ai:feedback:report` (revisao mensal) e `ai:feedback:export` (export supervisionado para treino).
- Guia de governanca e aprovacao tecnica do pipeline IA em `docs/FIELD-ASSIST-GOVERNANCE.md`.
- Checklist de release 1.0 adicionado ao `RELEASE.md` e resumo de status no `README.md`.

### Changed
- `Consultation` agora aceita `customFormData` (JSON) para armazenar dados de modelos especificos.
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
- `field-assist` passou a retornar bloco `quality` com `fieldConfidence`, `lowConfidenceFields` e `needsReview` para observabilidade clinica de preenchimento.
- Normalizacao de `treatment` passou a considerar negacao e temporalidade (ex.: "sem antibiotico", "retorno em 48h", "2x/dia") para reduzir contradicoes e variacao entre rodadas.
- `field-assist` passou a detectar contradicoes clinicas no transcript/rascunho (febre, dor, hidratacao, antibiotico) e resolver conflitos priorizando evidencias objetivas.
- Merge final ganhou ensemble leve (regex + contexto + score de ancoragem) para campos narrativos (`chiefComplaint` e `anamnesis`), preservando trilha estabilizada nos campos criticos.
- `field-assist` agora classifica porte por evidencias fortes (especie, contexto de campo e termos clinicos) e expõe log em `quality.porteDecision`, além de preencher `parsed.porte`.
- `field-assist` passou a aplicar schema estrito na resposta da IA (tipagem/chaves permitidas), descartando campos invalidos e expondo telemetria em `quality.aiSchema`.
- Merge final passou a normalizar terminologia clinica (negacoes como `afebril`, siglas `TPC/FC/FR`, dose `mg/kg` e frequencias `SID/BID/TID/QID`) para maior consistencia entre rodadas.
- Merge final do `field-assist` passou a reconciliar campos por prioridade (`evidence > heuristic > ai`) e agora expõe auditoria da origem por campo em `quality.reconciliation`.
- `field-assist` agora valida audio antes da transcricao IA (mime/type, tamanho, duracao minima quando detectavel e proxy de sinal/ruido em WAV), bloqueando entrada invalida e expondo metadados em `quality.audioValidation`.
- `field-assist` passou a usar cascata de transcricao (`openai_whisper_verbose_pt` -> `openai_whisper_verbose_auto` -> fallback local por transcript/segments) com telemetria de tentativas, latencia e provider selecionado em `quality.transcriptionMeta`.
- Diarizacao do `field-assist` foi reforcada com score de confianca por segmento e fallback conservador para `Indefinido` em baixa confianca, com resumo operacional em `quality.diarization` (`counts`, `avgConfidence`, `lowConfidenceSegments`, `needsReview`).
- Pipeline de entrada de audio no `field-assist` ganhou padronizacao local para WAV PCM (downmix mono, resample para 16kHz, trim de silencio e normalizacao de ganho), com rastreabilidade em `quality.audioStandardization`.
- Parser heuristico core do `field-assist` passou a normalizar texto clinico antes da extração (siglas FC/FR/TPC, unidades `mg/kg` e frequencias SID/BID/TID), elevando consistencia da priorizacao por falante/contexto antes do merge com IA.
- Heuristica de campos especificos (porte) ganhou deduplicacao semantica entre campos com base em assinatura textual/similaridade, reduzindo reaproveitamento da mesma frase em multiplos campos e mantendo o valor com maior evidencia por chave.
- Sanitizacao de campos especificos (porte) passou a exigir semantica por chave + grounding no transcript (com ancoragem por label), removendo preenchimentos plausiveis sem evidencia textual suficiente.
- Sanitizacao de campos especificos passou a aceitar grounding numerico curto no transcript (ex.: `3,5`, `4`) e a permitir valores curtos apenas para chaves numericas, preservando `ECC`/`paridade` validos.
- Extracao heuristica de campos especificos passou a usar dicionario tecnico versionado por porte/especie (`src/ai/specificFieldExtractionDictionary.json`) com merge de sinonimos na etapa guiada.
- `field-assist` ganhou modo conservador configuravel (`conservativeMode` e `conservativeMinConfidence` via request, com fallback por env) para suprimir campos abaixo do limiar e expor trilha em `quality.conservativeMode`.
- README do frontend atualizado para uso com Vite (`npm run dev`) e referencia ao design system.
- Prompts do `field-assist` passaram a ser versionados em registro dedicado (`fieldAssistPromptRegistry`) com `prompt_version` resolvido por request/env e fallback automatico para versao ativa.
- Prompt do `field-assist` passou a aplicar contexto clinico explicito (`nova`, `retorno`, `emergencia`, `campo`) por request (`promptContextMode`) com instrucoes contextuais no system/user prompt.
- Registro de prompt do `field-assist` passou a selecionar few-shots curados por contexto/porte/especie e casos limite (negacao, ambiguidade, ruido), injetando bloco de exemplos no system prompt.
- Prompt do `field-assist` passou a exigir bloco `autoavaliacao` com evidencias por campo no JSON da IA para suportar validação de self-check antes do merge final.
- `field-assist` passou a registrar telemetria de pipeline por estagio com `requestId` e latencia (`audio_standardization`, `audio_validation`, `transcription`, `ai_analysis`, `heuristic_parse`, `reconciliation_merge`, `quality_gate`, `contradiction_resolution`) em `quality.pipeline`.
- Backend ganhou serviço e scripts de observabilidade (`fieldAssistQualityService`, `ai:quality:dashboard`, `ai:quality:alerts`) para consolidar métricas operacionais e bloquear regressões por threshold em CI.
- Pipeline de benchmark IA ganhou orquestrador CI (`ai:benchmark:ci`) com relatório versionado em `logs/ai-benchmarks` e rastreio por etapa.
- Avaliador `ai:evaluate:field-dataset:simulated` passou a calcular consistencia com assinatura semantica por campo critico (`diagnosis`, `treatment`, `physicalExam`), reduzindo falso negativo por variacao textual superficial.
- Revisao rapida do Modo Campo foi reforcada com contraste no modo escuro, badges de confianca/origem por campo e destaque visual de campos aceitos/rejeitados.
- Tela de login recebeu refinamento UX com microcopy comercial, segmentacao visual mais clara de `Entrar/Criar conta`, padrao de campos com tokens globais e mensagens acionaveis para erros de conectividade/CORS.
- Dashboard, Pacientes e Agenda receberam padronizacao UI/UX com estados explicitos de `loading/empty/error`, filtros/formularios com classes reutilizaveis (`vp-input`/`vp-label`) e melhorias de legibilidade mobile/desktop.
- Tela de Consultas recebeu estados de `loading/empty/error` e filtros padronizados com componentes de formulario reutilizaveis.
- Quick Consultation no mobile passou a exibir CTA principal mais claro ("Salvar consulta") e agrupamento de acoes secundarias para reduzir ambiguidade.
- Preview de prontuario/PDF ganhou feedback in-app para abrir PDF, visualizar/baixar arquivo e upload de anexos, com opcao de retry em falhas de carregamento.
- Relatorios passaram a respeitar estado global de `loading/error` com acao de retry na propria tela, alinhando comportamento com Dashboard/Pacientes/Agenda.
- Perfil passou a ter fluxo de salvamento assíncrono robusto (`Salvando...`, bloqueio de acao concorrente e erro in-app), reduzindo falhas silenciosas no update de conta.
- Frontend ganhou base de design system em `src/components/ui` (`VpButton`, `VpCard`, `VpBadge`, `VpAlert`) e pagina interna `UIPlayground` para validacao visual rapida.
- Navegacao em desenvolvimento passou a expor acesso ao `UIPlayground` (desktop sidebar + mobile), sem impacto no menu de producao.
- Componentes `Input` e `Select` foram alinhados aos estilos globais (`vp-label`/`vp-input`) com melhoria de acessibilidade (`htmlFor`/`id`, `aria-invalid`) e consistencia de erro.
- `VpButton` ganhou estados padronizados de `loading`, `disabled` e `active`, com reforco de `focus-visible` e suporte a icones esquerda/direita.
- Acoes principais de `Consultations`, `Reports` e `Profile` passaram a usar `VpButton`, reduzindo variacao visual/funcional entre telas.
- Microcopy global foi alinhada para PT-BR em navegacao/cabecalho (`Workspace` -> `Central`, `Dashboard` -> `Inicio/Visao Geral`, `UI Playground` -> `Laboratorio UI`).
- Tela de Relatorios substituiu termo em ingles (`Business Intelligence`) e ganhou mensagem de erro mais acionavel para recuperacao do periodo.
- Fluxos clinicos (`QuickConsultation`, `FieldModeConsultation`, `ConsultationPreview`) receberam padronizacao de microcopy nas acoes principais (`Salvar consulta`, `Salvar + gerar receita`, `Editar manualmente`, `Abrir PDF`) e textos de apoio.
- Mensagens de erro/sucesso dos fluxos de receita e anexos ficaram mais acionaveis, orientando formato/tamanho de audio, bloqueio de popup e tentativa de recuperacao.
- Placeholders e rotulos dos campos clinicos/vitais foram padronizados em `QuickConsultation` e `FieldModeConsultation` (queixa, anamnese, exame fisico, diagnostico, conduta, procedimentos, medicacao, exames e recomendacao de retorno).
- `ConfirmDialog`, seletor de paciente (`App`) e modal de porte (`FieldModeConsultation`) ganharam semantica de dialogo (`role="dialog"`, `aria-modal`, rotulos/descricoes) e fechamento via tecla `Esc`.
- `FeedbackBanner` e `Toast` passaram a expor `role`/`aria-live` por severidade (`alert` para erro/aviso, `status` para info/sucesso), melhorando leitura por tecnologias assistivas.
- `ConsultationPreview` agora expõe semantica de modal com `aria-labelledby` e fechamento por `Esc`.
- `Table` ganhou melhorias de acessibilidade para uso via teclado em linhas clicaveis (`tabIndex`, `Enter/Espaco`) e semantica de coluna (`scope="col"`), com suporte opcional a `caption` acessivel.
- `DatePicker` recebeu associacao explicita de label/input (`id`/`htmlFor`), atributos ARIA (`aria-expanded`, `aria-controls`, `aria-invalid`) e abertura por teclado.
- Navegacao principal (desktop/mobile) passou a anunciar pagina ativa via `aria-current`, e `FloatingFormActions` ganhou semantica de regiao para leitores de tela.
- Densidade mobile foi ajustada com alvos de toque maiores em acoes compactas (`btn-sm` >= 44px), botoes de lista em `Appointments` e controles de anexos em `ConsultationPreview`.
- Navegacao inferior mobile recebeu altura minima por item para reduzir toques acidentais e melhorar ergonomia.

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
- Gates de qualidade por campo agora bloqueiam preenchimento conversacional sem evidencia clinica (saudacoes/fillers), reduzindo sobrepreenchimento por ruido.
- Regras de preservacao por evidencia no transcript foram adicionadas para evitar limpeza excessiva de `diagnosis`, `physicalExam` e `treatment` quando houver contexto clinico valido.
- Resposta do `field-assist` agora inclui lista de contradicoes em `quality.contradictions` para auditoria clinica e revisão rápida.
- Corrigido descarte indevido de campos numericos curtos em ficha de porte (`bodyConditionScore`, `parity`) causado por retorno antecipado na validação de grounding.
- Corrigido descarte de `forage` quando preenchido por sinonimos tecnicos (`forragem`, `capineira`) ao expandir semantica de validacao do campo.
- Ajustado score/limiar do modo conservador para evitar supressao excessiva por padrão, mantendo comportamento estrito quando solicitado com limiar maior.
- `field-assist` agora expõe metadados de prompt em `quality.aiPrompt` (`version`, `requestedVersion`, `fallbackApplied`) para auditoria de regressao.
- `field-assist` agora expõe `quality.aiPrompt.contextMode` para rastrear o contexto clinico efetivamente usado na chamada da IA.
- `field-assist` agora expõe metrica de few-shot em `quality.aiPrompt` (`fewShotCount`, `fewShotExampleIds`) para auditoria de cobertura do prompt.
- `field-assist` agora executa `aiSelfCheck` por campo (grounding + evidencia) e bloqueia campos da IA sem aderencia suficiente ao transcript, expondo relatorio em `quality.aiSelfCheck`.
- Em desenvolvimento, o `field-assist` agora pode persistir artefatos de debug por request em `logs/field-assist-artifacts` quando `FIELD_ASSIST_DEBUG_ARTIFACTS=true`.
- Dashboard de qualidade agora é publicado em `logs/field-assist-quality-*.json/.md` e `field-assist-quality-latest.*`, com alertas de regressão por `needsReview`, `p95`, `selfCheck` e fallback de transcrição.
- Adicionada suíte de regressão repetível para áudio/campo (`ai:regression:suite`) baseada em baseline versionado (`src/ai/benchmarks/field-assist-baseline.json`) para validar consistência entre múltiplas rodadas simuladas.
- `field-assist` ganhou etapa de recuperacao pós-`quality_gate` para repor campos criticos (`diagnosis`, `physicalExam`, `treatment`) quando houver evidencia clinica no transcript e supressao excessiva no modo conservador.
- Modo Campo agora permite aceitar/rejeitar sugestoes por campo com captura opcional de correcao manual e recomendacao explicita de revisao quando houver baixa confianca/contradicoes.
- `FeedbackBanner` corrigido para usar semantica visual vermelha em `type=error` (antes havia tonalidade de aviso).

### Security
- Removido fallback de autenticacao por `query.token` no backend (agora apenas `Authorization: Bearer`).
- Logger backend passou a aplicar redaction global para campos/strings sensiveis (`authorization`, `token`, `refreshToken`, `password`, `secret`, `api key`).

## [1.0.0] - 2026-03-09

### Added
- Estrutura base de frontend e backend do VetPro.


