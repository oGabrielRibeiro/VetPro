# TODO List - Proxima Sprint

## Plano dedicado UI/UX
- [x] Executar backlog de experiencia e aparencia em [`TODO-UI-UX.md`](TODO-UI-UX.md), com revisao completa de telas desktop/mobile e padronizacao visual.

## Plano dedicado IA/Audio
- [ ] Executar backlog tecnico completo em [`TODO-AUDIO-IA-PARSER.md`](TODO-AUDIO-IA-PARSER.md) para elevar precisao do pipeline de transcricao/parser/IA/heuristica.
- [x] Integrar dataset real de campo (`dataset_treinamento_veterinario_apolo`) em fluxo de avaliacao local (`npm run ai:evaluate:field-dataset` no backend).
- [x] Reforcar pipeline de transcricao no modo campo com `language=pt`, fallback inteligente para transcript quando Whisper vier com baixo sinal clinico e reclassificacao de speaker por trecho.
- [x] Criar benchmark sem audio real via simulacao de ruído ASR (`npm run ai:evaluate:field-dataset:simulated`) para validar consistencia do parser/IA somente com transcript.
- [x] Estabilizar campo de tratamento com selecao por aderencia ao transcript + normalizacao canonica de conduta para reduzir variacao entre rodadas com ruido ASR.
- [x] Estabilizar preenchimento de `diagnosis` e `physicalExam` com normalizacao clinica orientada por contexto para reduzir oscilacao de campo em transcricoes ruidosas.
- [x] Adicionar `quality` no `field-assist` com confianca por campo e gates anti-ruido para reduzir preenchimento conversacional indevido.
- [x] Melhorar `treatment` com regras de negacao (`sem/nao`) e temporalidade (`24h`, `48h`, `2x/dia`) para consistencia entre rodadas simuladas.
- [x] Implementar heuristicas de contradicao clinica (`sem febre` vs `febre alta`, dor/hidratacao, negacao de antibiotico) com resolucao automatica e telemetria em `quality.contradictions`.
- [x] Implementar ensemble leve (regex + contexto) no merge final para campos narrativos (`chiefComplaint`/`anamnesis`) sem sacrificar estabilidade de `diagnosis`/`physicalExam`/`treatment`.
- [x] Entregar classificacao de porte por evidencias no backend com log de decisao (`quality.porteDecision`) e preenchimento de `parsed.porte`.
- [x] Aplicar schema estrito para resposta IA no `field-assist` com saneamento de tipos/chaves e metrica `quality.aiSchema.droppedFieldsCount`.
- [x] Normalizar terminologia clinica no merge final (`afebril`, `TRC/TPC`, `FC/FR`, dose `mg/kg`, frequencias `SID/BID/TID/QID`) para aumentar consistencia de preenchimento.
- [x] Implementar reconciliacao final por prioridade no merge (`evidencia estruturada > heuristica > IA`) com trilha de auditoria em `quality.reconciliation`.
- [x] Validar audio antes da IA no `field-assist` (mime/type, duracao minima quando detectavel, sinal/ruido em WAV) com telemetria em `quality.audioValidation`.
- [x] Implementar cascata de transcricao no `field-assist` (`openai_whisper_verbose_pt` -> `openai_whisper_verbose_auto` -> fallback local) com metadados por tentativa em `quality.transcriptionMeta`.
- [x] Reforcar diarizacao Tutor/Vet no `field-assist` com score de confianca por segmento, fallback conservador para `Indefinido` e resumo em `quality.diarization`.
- [x] Padronizar pre-processamento de audio WAV no `field-assist` (downmix mono, resample 16kHz, trim de silencio e normalizacao de ganho) com metrica em `quality.audioStandardization`.
- [x] Revisar parser heuristico core com normalizacao pre-parse de termos ASR (FC/FR/TPC, `mg/kg`, frequencias SID/BID/TID) e sanitizacao por campo antes do merge final.
- [x] Endurecer anti-sobrepreenchimento de ficha de porte com deduplicacao semantica entre campos especificos (similaridade alta/assinatura textual), preservando o campo com maior evidencia.
- [x] Exigir semantica por chave + grounding no transcript para cada campo especifico de porte, descartando valores plausiveis sem ancoragem textual.
- [x] Finalizar parser numerico dedicado para campos de porte e vitais (`ECC`, `daysInMilk`, `parity`, `temperatura`, `FC`, `FR`) com grounding numerico no transcript.
- [x] Implementar dicionario tecnico de extracao guiada por porte/especie (arquivo versionado + merge com labels nativos) para melhorar cobertura de campos especificos.
- [x] Implementar modo conservador no `field-assist` (threshold configuravel por request/env) para suprimir campos de baixa confianca e sinalizar revisao em `quality`.
- [x] Versionar prompt do `field-assist` com registro de versao/changelog e telemetria de prompt selecionado em `quality.aiPrompt`.
- [x] Implementar prompt por contexto clinico no `field-assist` (`nova`, `retorno`, `emergencia`, `campo`) com selecao via request e rastreio em `quality.aiPrompt.contextMode`.
- [x] Adicionar few-shots curados por porte/especie e casos limite no prompt do `field-assist`, com rastreio de exemplos selecionados em `quality.aiPrompt`.
- [x] Implementar self-check da IA por campo com justificativa de evidencia (`autoavaliacao`) e bloqueio de campos sem aderencia no `field-assist`.
- [x] Implementar observabilidade por estagio no `field-assist` com `requestId`, latencia por etapa e resumo em `quality.pipeline`.
- [x] Adicionar persistencia opcional de artefatos de debug do `field-assist` em dev (`FIELD_ASSIST_DEBUG_ARTIFACTS=true`).
- [x] Entregar dashboard automatizado de qualidade do `field-assist` (`ai:quality:dashboard`) com agregacao de latencia, confianca e taxa de revisao.
- [x] Entregar alerta de regressao (`ai:quality:alerts`) com thresholds configuraveis e exit code para CI.
- [x] Automatizar benchmark de IA em fluxo CI (`ai:benchmark:ci`) com relatorio versionado em `logs/ai-benchmarks`.
- [x] Criar suite de regressao repetivel (`ai:regression:suite`) com baseline versionado em `src/ai/benchmarks/field-assist-baseline.json`.

## P0 - Seguranca e autenticação
- [x] Remover uso de `token` na URL no frontend (PDF, imagens, downloads).
- [x] Implementar download via API autenticada + `blob` para arquivos/PDF.
- [x] Restringir `query.token` no backend para fluxo legado temporário ou remover totalmente.
- [x] Migrar callback OAuth para fluxo sem token em query (`code` + troca server-side).
- [x] Implementar handler no frontend para `oauth/callback` e `oauth/complete-register` usando `code`.
- [x] Revisar logs para garantir que token nunca seja persistido.

## P0 - Consistencia de contrato (Paciente)
- [x] Definir regra oficial para update de paciente: `PUT` completo ou `PATCH` parcial.
- [x] Alinhar `validationMiddleware` e `patientService` para o mesmo contrato.
- [x] Cobrir cenarios de update parcial/completo com testes de rota e service.

## P1 - Qualidade de codigo e CI
- [x] Corrigir erros de `npm run lint` no backend (atualmente quebrado).
- [x] Tratar warnings relevantes (`no-console`, `no-lonely-if`, `prettier`) em scripts/servicos.
- [x] Garantir pipeline local: `lint + test + smoke` sem falhas.
- [x] Reforcar `up.ps1` com validacao de stack frontend (Vite) e aviso para variavel legada `REACT_APP_API_BASE_URL`.

## P1 - Dependencias e vulnerabilidades
- [x] Backend: atualizar `multer` para versao sem advisories.
- [x] Backend: revisar migracao de `bcrypt` para versao segura (avaliar impacto major).
- [x] Frontend: migrar de `react-scripts` para `Vite` (build/test/dev + Docker) para reduzir cadeia vulneravel herdada.
- [x] Executar `npm audit` após upgrades e registrar baseline.

## P1 - Vulnerabilidades reportadas (OSV/GitHub)
- [x] `bcrypt@5.1.1`: analisar cadeia transitiva vulneravel (`node-pre-gyp`/`tar`) e validar migracao para `bcrypt@6` ou substituicao por `bcryptjs`.
- [x] `swagger-jsdoc@6.2.8`: revisar CVEs transitivas sem remediation automatica e aplicar mitigacao por isolamento de uso (apenas ambiente interno/dev), alem de monitoramento de upstream.
- [x] `express-rate-limit@8.2.1`: corrigido via upgrade para `8.3.1` (advisory direto resolvido).
- [x] limitar superfícies expostas sensiveis (auth/upload),
- [x] reforcar WAF/reverse proxy rate-limit,
- [x] hardening de configuracoes e monitoramento de abuso.
- [x] Criar issue de risco aceito com prazo e dono para cada dependencia sem patch.
- [x] Reavaliar mensalmente `npm audit` e OSV ate existir versao corrigida.

## P2 - Performance e robustez de I/O
- [x] Trocar operacoes `fs.*Sync` de runtime por assíncronas em `cloudStorageService`.
- [x] Garantir criacao de diretorio de upload de logo no middleware (`uploads/clinics`).
- [x] Revisar manipulacao de arquivos temporarios e limpeza em erros.

## P2 - UX e confiabilidade funcional
- [x] Completar remocao de popups nativos e padronizar modais in-app.
- [x] Consolidar comportamento desktop/mobile de barras de acao em todas as telas.
- [x] Revisar preenchimento por audio de campos de porte com cenarios reais (small/large).
- [x] Adicionar testes de regressao para campos especificos (sobrepreenchimento e subpreenchimento).

## P0 - Assinaturas e anexos clinicos
- [x] Implementar assinatura simples do tutor (modal com canvas) para aceite de procedimento.
- [x] Permitir assinatura do documento gerado durante anestesia (reutilizar o mesmo modal).
- [x] Gerar PDF com assinatura embutida e metadados (data/hora, usuario, paciente, consentimento).
- [x] Persistir assinaturas de consentimento em tabela dedicada para auditoria.
- [x] Salvar evidencias de aceite (imagem da assinatura + log de quem assinou).
- [x] Validar upload de anexos na ficha clinica com limite configuravel de imagens (ex.: 4).

## P1 - Atualizacoes sem impacto em banco
- [ ] Definir estrategia de migracoes versionadas (sem breaking change) com rollback seguro.
- [ ] Adicionar backup automatico antes de atualizar (dump Postgres).
- [ ] Adicionar `smoke:post-deploy` para validar rotas criticas apos update.
- [ ] Documentar compatibilidade de versao (frontend/backend) e janela de deprecacao.

## P1 - Seguranca anti-abuso (captcha e defesas basicas)
- [ ] Adicionar captcha no login/registro/recuperacao de senha (configuravel por env).
- [ ] Habilitar rate-limit mais rigoroso em auth e endpoints sensiveis.
- [ ] Adicionar bloqueio temporario apos N tentativas falhas (lockout progressivo).
- [ ] Logar eventos de seguranca (login falho, captcha falho, bloqueio).

## P0 - Tipos de consulta (novos modelos de formulario)
- [x] Criar modelo "Consulta Medicamentosa" (prescricao/posologia/tempo/alertas).
- [x] Criar modelo "Anestesia" (pre, intra e pos) com assinatura do tutor e monitoring.
- [x] Criar modelo "Procedimento Cirurgico" com consentimento e registro de tecnica/anestesico.
- [x] Criar modelo "Evolucao/Internacao" (checks diarios, sinais vitais, medicacao).
- [x] Criar modelo "Vacina/Vermifugacao" (lote, validade, fabricante, proxima dose).
- [x] Criar modelo "Retorno/Follow-up" (reavaliacao e resposta ao tratamento).
- [x] Criar modelo "Atestado/Laudo" (documento oficial com assinatura e anexos).
- [x] Criar modelo "Prescricao isolada" (uso rapido em campo, sem prontuario completo).
- [ ] Definir campos minimos por modelo com base em boas praticas de registro clinico.
- [ ] Importar modelo PDF de anestesia do cliente quando disponivel e mapear campos.
- [ ] Importar modelo de medicamento do cliente quando disponivel e mapear campos.
- [ ] Personalizacao de templates: logo da clinica, nome, endereco e contatos puxados do perfil do vet.
- [ ] Permitir escolha de layout de receita (templates diferentes) e salvar preferencia por clinica.

## P2 - Changelog e atualizacoes
- [x] Adotar `CHANGELOG.md` como fonte unica de mudancas por release.
- [ ] Treinar time para registrar mudancas em `Unreleased` a cada PR relevante.
- [x] Padronizar uso do script `scripts/release.ps1` para preparar versao.
- [x] Definir checklist de release no `RELEASE.md` como processo oficial.

## Release 1.0 - Pendencias finais
- [ ] Validacao final clinica multi-especie com amostra real (audio/IA) e aceite.
- [ ] Executar roteiro completo de uso real (login -> paciente -> consulta -> receita/PDF).
- [ ] Treinar time para registrar mudancas no `CHANGELOG.md` por PR.
- [ ] Gerar release oficial (mover `Unreleased` para `1.0.0` com data, atualizar versoes e tag).

## Checklist de validacao final
- [x] Backend: `npm run lint`
- [x] Backend: `npm test -- --runInBand`
- [x] Backend: `npm run smoke:checklist`
- [x] Frontend: `npm run build`
- [x] Frontend: `npm run test`
