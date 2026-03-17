# TODO - UI/UX (Experiencia e Aparencia)

## Objetivo
Melhorar consistencia visual, legibilidade, usabilidade e fluidez das telas desktop/mobile do VetPro, reduzindo friccao de uso em fluxos clinicos.

## Escopo de revisao
- Layout global: navegação, hierarquia visual, spacing, densidade.
- Formularios clinicos: legibilidade, validacao, estados de erro/sucesso.
- Modo Campo e Prontuario: foco em velocidade de uso e clareza.
- Feedback de sistema: loading, empty state, toasts, banners, dialogs.
- Acessibilidade: contraste, foco, navegação por teclado, alvos touch.

## Metas de qualidade (SLO UI/UX interno)
- [x] Contraste AA (WCAG) nos blocos principais em modo claro/escuro.
- [x] Todos os fluxos criticos com estados completos: `loading`, `empty`, `error`, `success`.
- [x] 0 sobreposicao de CTA/flutuantes em mobile e desktop.
- [ ] Tempo de entendimento da tela inicial < 5s (proposta de valor + acoes primarias).
- [x] Formularios principais com erro de validacao claro por campo e foco automatico.

## P0 - Consistencia visual e legibilidade
- [x] Definir e consolidar tokens de UI (cor, radius, spacing, sombra, tipografia) em fonte unica.
- [x] Unificar variacoes de card/botao/input (evitar estilos divergentes entre paginas).
- [x] Corrigir contraste de textos secundarios/labels no modo escuro.
- [x] Revisar hierarquia tipografica (titulos, subtitulos, labels, helper text).
- [x] Remover estilos redundantes/conflitantes entre `index.css` e `styles.css`.

## P0 - Mobile first real
- [x] Revisar breakpoints e comportamento dos headers fixos para evitar cortes/overflow.
- [x] Garantir barras de acao com area segura (`safe-area`) sem cobrir campos.
- [x] Padronizar altura minima touch (>= 44px) em botoes, tabs e seletores.
- [x] Ajustar formularios longos com agrupamento/colapsaveis para reduzir scroll cansativo.
- [x] Garantir calendario/date picker sem fechar antes de confirmar data completa.

## P0 - Fluxos criticos (produto)
- [x] Login: reforcar clareza de erro de conectividade/CORS e proximos passos.
- [x] Novo prontuario (Quick + Campo): CTA principal sempre claro e unico por contexto.
- [x] Pacientes: revisar fluxo de editar/atualizar e mensagens de erro por campo.
- [x] PDF/receita/prontuario: padronizar feedback de abertura/download (inclusive bloqueio popup).
- [x] Revisao rapida de prontuario: melhorar contraste, agrupamento e destaque de alteracoes.

## P1 - Componentizacao e design system
- [x] Criar guia de componentes base (Button/Input/Select/Card/Badge/Alert/Modal/Toast).
- [x] Definir variantes oficiais por severidade (`info/success/warn/error`) e tamanho.
- [x] Extrair classes utilitarias repetidas para componentes/shared styles.
- [x] Padronizar icones e estados (`disabled`, `loading`, `active`, `focus-visible`).
- [x] Criar pagina interna de preview de componentes (UI playground simples).

## P1 - Microcopy e comunicacao
- [x] Revisar textos de interface para PT-BR consistente (sem mistura de termos ingles).
- [x] Padronizar mensagens de erro acionaveis (o que ocorreu + como resolver).
- [x] Padronizar rotulos e placeholders dos campos clinicos e de porte.
- [x] Revisar naming de acoes para reduzir ambiguidade ("Salvar", "Salvar + Receita", etc.).
- [x] Padronizar nomenclatura global de navegacao e cabecalho (ex.: `Workspace`, `Dashboard`, `UI Playground`) para PT-BR.

## P1 - Acessibilidade e ergonomia
- [x] Revisar navegacao por teclado (tab order, foco visivel, escape em modais).
- [x] Garantir labels associadas a todos os inputs e mensagens com `aria-live` quando necessario.
- [x] Verificar semantica em tabelas, dialogs e controles customizados.
- [x] Ajustar tamanho e espacamento de elementos densos em telas pequenas.
- [x] Melhorar acessibilidade de modais principais (dialog semantics, `aria-modal`, fechamento via `Esc` e foco inicial no `ConfirmDialog`).
- [x] Padronizar feedback assistivo em banners/toasts com `role` e `aria-live` conforme severidade.

## P2 - Percepcao de performance
- [x] Skeleton/loading coerente por tela (evitar “saltos” de layout).
- [x] Debounce/throttle em interacoes de filtro/busca com feedback visual.
- [x] Melhorar transicoes (sutis) em mudancas de estado sem poluir UX.
- [x] Revisar bundle CSS utilitario e estilos nao usados.

## Auditoria por tela (checklist rapido)
- [x] `Login.jsx`
- [x] `Dashboard.jsx`
- [x] `Patients.jsx`
- [x] `Appointments.jsx`
- [x] `Consultations.jsx`
- [x] `QuickConsultation.jsx`
- [x] `FieldModeConsultation.jsx`
- [x] `ConsultationPreview.jsx`
- [x] `Reports.jsx`
- [x] `Profile.jsx`

## Criterios de pronto (Definition of Done)
- [x] Checklist por tela concluido com evidencias (antes/depois).
- [x] Sem regressao visual em mobile (<= 390px), tablet e desktop.
- [x] Build e testes frontend passando.
- [x] Tokens/componentes documentados e reutilizados nos fluxos principais.
- [x] Validacao final com roteiro de uso real (login -> paciente -> consulta -> receita/PDF).

## Evidencias (2026-03-17)
- `Login.jsx`: erro/alerta (vp-alert-error), feedback e foco ok; contraste revisado no dark.
- `Dashboard.jsx`: loading/empty/error presentes; cards com tokens `vp-*` e contraste revisado.
- `Patients.jsx`: loading/empty/error presentes; cards com contraste ajustado em dark; CTA principal unico.
- `Appointments.jsx`: loading/empty/error presentes; CTA principal destacado; estados com `subtle-fade`.
- `Consultations.jsx`: loading/empty/error presentes; feedback e CTA consistente.
- `QuickConsultation.jsx`: agrupamento colapsavel; feedback de sucesso/erro via banners/toasts.
- `FieldModeConsultation.jsx`: feedback de sucesso/erro; estados de processamento de audio.
- `ConsultationPreview.jsx`: sucesso/erro de anexos e PDF; fallback para popup bloqueado.
- `Reports.jsx`: loading/empty/error com skeletons e empty states.
- `Profile.jsx`: loading/erro de salvar/deletar com feedback.
- `Roteiro UI/UX`: checklist consolidado em `docs/UIUX-VALIDACAO.md` e helper em `scripts/uiux-validate.ps1`.
