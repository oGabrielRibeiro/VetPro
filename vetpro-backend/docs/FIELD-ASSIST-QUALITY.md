# Field-Assist Quality Dashboard e Alertas

## Dashboard
- Comando: `npm run ai:quality:dashboard`
- Entrada padrão: `logs/field-assist-artifacts/*.json`
- Saídas:
  - `logs/field-assist-quality-<timestamp>.json`
  - `logs/field-assist-quality-<timestamp>.md`
  - `logs/field-assist-quality-latest.json`
  - `logs/field-assist-quality-latest.md`

### Métricas calculadas
- `needsReviewRate`
- `lowConfidenceAvgCount`
- `aiSelfCheckAvgScore`
- `transcriptionFallbackRate`
- `totalLatency.avgMs`
- `totalLatency.p95Ms`
- `stageLatency.<stage>.avgMs/p95Ms`

## Alertas de regressão
- Comando: `npm run ai:quality:alerts`
- Entrada padrão: `logs/field-assist-quality-latest.json`
- Retorno:
  - `exit 0`: sem regressão
  - `exit 1`: regressão detectada
  - `exit 2`: dashboard ausente

### Thresholds padrão
- `minSamples = 5`
- `maxNeedsReviewRate = 0.35`
- `maxP95TotalMs = 12000`
- `minAiSelfCheckAvgScore = 0.6`
- `maxLowConfidenceAvgCount = 2.5`
- `maxTranscriptionFallbackRate = 0.5`

### Overrides por env
- `FIELD_ASSIST_MAX_NEEDS_REVIEW_RATE`
- `FIELD_ASSIST_MAX_P95_TOTAL_MS`
- `FIELD_ASSIST_MIN_SELF_CHECK_SCORE`
- `FIELD_ASSIST_MAX_LOW_CONFIDENCE_AVG`
- `FIELD_ASSIST_MAX_FALLBACK_RATE`
