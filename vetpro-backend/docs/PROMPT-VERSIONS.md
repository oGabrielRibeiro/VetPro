# Prompt Versions (Field Assist)

## Objetivo
Rastrear versoes de prompt usadas no pipeline IA de campo e facilitar auditoria de regressao.

## Prompt Catalog

### `field_assist_extraction_v1.0.0` (ativo)
- Data: 2026-03-10
- Escopo: diarizacao, extracao estruturada e melhoria textual em um unico prompt.
- Mudancas:
  - Padrao estrito de preenchimento com `"Não informado na consulta"` para campos sem evidencia.
  - Estrutura JSON obrigatoria para identificacao, anamnese, exame fisico, avaliacao e plano.
  - Registro de versao retornado em `quality.aiPrompt.version`.

## Observabilidade
- O backend retorna:
  - `quality.aiPrompt.version`
  - `quality.aiPrompt.requestedVersion`
  - `quality.aiPrompt.fallbackApplied`
  - `quality.aiPrompt.contextMode`
  - `quality.aiPrompt.fewShotCount`
  - `quality.aiPrompt.fewShotExampleIds`
  - `quality.aiSelfCheck.score`
  - `quality.aiSelfCheck.acceptedFields`
  - `quality.aiSelfCheck.evaluatedFields`
  - `quality.aiSelfCheck.byField`

## Configuracao
- Variavel opcional: `FIELD_ASSIST_PROMPT_VERSION`
- Se a versao solicitada nao existir, o backend aplica fallback para a versao ativa e marca `fallbackApplied=true`.
- Contexto clinico pode ser enviado via request em `promptContextMode` (aceita: `nova`, `retorno`, `emergencia`, `campo`).
- Variavel opcional: `FIELD_ASSIST_FEWSHOT_MAX` (padrao: 2, limite interno: 4).
- A resposta da IA deve incluir `autoavaliacao` com evidencias por campo; o backend aplica self-check e remove campos sem evidencia/grounding suficiente.
