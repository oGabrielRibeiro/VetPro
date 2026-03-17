# VetPro UI Design System (Resumo rapido)

Este documento descreve os tokens e componentes base usados no frontend do VetPro,
para manter consistencia visual entre telas desktop e mobile.

## Tokens globais (CSS variables)

Os tokens vivem em `vetpro-front/src/index.css` dentro de `:root` e `.dark`.

### Cores
- `--vp-primary`, `--vp-primary-strong`, `--vp-accent`
- `--vp-bg`, `--vp-card`, `--vp-border`
- `--vp-text`, `--vp-text-secondary`, `--vp-text-muted`

### Tipografia
- `--vp-font-body` (texto principal)
- `--vp-font-mono` (codigo/IDs)

### Layout e motion
- `--vp-radius`, `--vp-radius-sm`, `--vp-radius-md`, `--vp-radius-lg`
- `--vp-shadow`
- `--vp-transition`

## Componentes base (classes)

### Cards
- `vp-card` + variantes: `vp-card--flat`, `vp-card--dashed`

### Inputs
- `vp-input-field` (inputs/textarea/selects custom)
- `vp-input` (inputs com radius maior)
- `vp-label` (labels padronizados)

### Tipografia utilitaria
- `vp-overline`, `vp-h1`, `vp-h2`, `vp-h3`, `vp-subtitle`, `vp-helper`

### Botoes
- `btn` + tamanhos: `btn-sm`, `btn-md`, `btn-lg`, `btn-block`
- Variantes: `btn-success`, `btn-primary`, `btn-neutral`, `btn-info-soft`,
  `btn-warn-soft`, `btn-danger-soft`

### Segmentos
- `vp-segment` e `vp-segment-btn` (toggle em duas colunas)

### Alerts e feedback
- `vp-alert-error`, `vp-alert-info`
- `subtle-enter`, `subtle-fade` (transicoes leves)

### Safe-area mobile
- `vp-mobile-content` (padding top/bottom para header e action bar)
- `vp-safe-bottom` (garante area segura no rodape)

## Regras de uso rapido

1. Sempre preferir `vp-card` e `vp-input-field` ao montar novas telas.
2. Em mobile, envolver o conteudo principal com `vp-mobile-content`.
3. Para titulos de pagina, usar `vp-h1`; para secoes, `vp-h2`/`vp-h3`.
4. Se existir CTA principal, usar `btn-success` e manter apenas um destaque por contexto.
5. Usar `subtle-fade` para estados `loading`, `empty` e `error`.

## Onde revisar/alterar
- Tokens: [index.css](C:/Cliente/HSS/VetPro/vetpro-front/src/index.css)
- Padrões de uso: consultar `src/pages` e `src/components`.

