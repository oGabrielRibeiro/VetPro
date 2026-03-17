# AI Benchmark CI (Audio/Field)

## Objetivo
Executar benchmark automatizado com relatório versionado e gate de regressão para pipeline de áudio/IA.

## Comandos
- `npm run ai:benchmark:ci`
  - Executa em sequência:
    - `ai:evaluate`
    - `ai:evaluate:mobile`
    - `ai:evaluate:field-dataset:simulated`
    - `ai:quality:dashboard`
    - `ai:quality:alerts`
    - `ai:regression:suite`
  - Gera:
    - `logs/ai-benchmarks/ai-benchmark-ci-<timestamp>.json`
    - `logs/ai-benchmarks/ai-benchmark-ci-latest.json`

- `npm run ai:regression:suite`
  - Executa casos críticos repetíveis (mesmo dataset com ASR simulado multi-runs).
  - Compara com baseline:
    - `src/ai/benchmarks/field-assist-baseline.json`

## Baseline
- Arquivo: `src/ai/benchmarks/field-assist-baseline.json`
- Thresholds atuais:
  - `minRuns`
  - `minAvgGlobalScore`
  - `minDiagnosisConsistency`
  - `minTreatmentConsistency`
  - `minExamConsistency`

## Flags úteis
- `node src/scripts/run-ai-benchmarks-ci.js --skip-mobile`
- `node src/scripts/run-ai-benchmarks-ci.js --skip-field-dataset`
- `node src/scripts/run-ai-benchmarks-ci.js --skip-regression-suite`
