# Field Assist Governance (P2)

## Objetivo
Padronizar melhoria continua do pipeline de audio/transcricao/parser/IA com controle tecnico e trilha de auditoria.

## Loop supervisionado
1. Captura de feedback por campo no frontend (`aceitar` / `rejeitar`), com telemetria anonima opcional.
2. Persistencia backend em `logs/field-assist-feedback/feedback-YYYY-MM.jsonl`.
3. Export para treino supervisionado:
```bash
npm run ai:feedback:export -- --month=YYYY-MM --min-score=0.45
```
4. Saida em:
- `src/ai/benchmarks/field-assist-supervised-training.jsonl`

## Revisao mensal
Gerar relatorio consolidado:
```bash
npm run ai:feedback:report -- --month=YYYY-MM
```

Checklist mensal:
- Top campos rejeitados por volume.
- Fontes com maior taxa de rejeicao (`ai`, `heuristic`, `evidence`).
- Casos com `needsReview` elevado.
- Ajustes sugeridos em dicionarios/prompt/regras.

## Processo de aprovacao tecnica (mudancas IA)
Toda mudanca em prompt, heuristica, parser ou dicionario deve incluir:
1. Motivacao do ajuste e risco de regressao.
2. Evidencia de benchmark (`ai:benchmark:ci`) e regressao (`ai:regression:suite`).
3. Impacto esperado por campo (cobertura/precisao/sobrepreenchimento).
4. Plano de rollback.

Gate de aprovacao:
- 1 aprovacao tecnica de backend.
- 1 aprovacao funcional de produto/clinico.
- Atualizacao obrigatoria de `CHANGELOG.md` e TODOs.

## Politica de rollout
- Fase 1: validar em ambiente de homologacao com relatorio de feedback.
- Fase 2: liberar para producao com monitoramento diario de `needsReview`.
- Fase 3: consolidar no baseline da proxima release.
