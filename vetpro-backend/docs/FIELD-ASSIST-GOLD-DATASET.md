# Field Assist Gold Dataset

Este documento define o dataset "gold" para avaliacao regressiva do pipeline de audio/transcricao/parser/IA.

## Arquivos
- `src/ai/benchmarks/field-assist-gold-dataset.json`
- `src/ai/benchmarks/field-assist-rubric.json`

## Objetivo
- Garantir base padrao com >= 200 casos anonimizados.
- Cobrir pequeno/grande porte, cenarios clinicos e variacoes de transcricao.
- Fornecer rubrica unica por campo: `exato`, `parcial`, `incorreto`, `nao_informado`.

## Comandos
- Gerar dataset + rubrica:
```bash
npm run ai:gold:build
```

- Validar consistencia e anonimização:
```bash
npm run ai:gold:validate
```

## Estrutura de cada caso
- `id`: identificador estavel.
- `split`: `train | dev | test`.
- `mode`: `nova | retorno`.
- `porte`: `pequeno | grande`.
- `species`: inferencia de especie (`canino`, `felino`, `bovino`, `equino`, etc.).
- `scenario`: `consulta_nova`, `retorno`, `emergencia`, `preventivo`.
- `transcript`: texto anonimo.
- `audio`: referencia anonima (`gold_audio_xxxx.wav`) + status.
- `target`: campos esperados para avaliacao.

## Rubrica
- `fieldWeights`: peso por campo core.
- `specificFieldWeights`: peso para campos especificos de porte.
- `partialMatchRules`: regras para classificar "parcial".
- `gatingRules`: penalidade para sobrepreenchimento, alucinacao e contradicao.

## Observacoes
- O dataset e gerado de forma deterministica para manter repetibilidade.
- A validacao falha se detectar padrao de dado sensivel (cpf, telefone, email) no transcript.
