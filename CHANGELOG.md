# Changelog

Todas as mudancas importantes deste projeto serao documentadas neste arquivo.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e versionamento semantico [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added
- Estrutura inicial de changelog e fluxo de release.
- Script `scripts/release.ps1` com opcao de `commit + tag` automaticos.
- Guia de release em `RELEASE.md` e instrucoes no `README.md`.

### Changed
- Frontend passou a abrir/download de PDF/arquivos via API autenticada + `blob`.
- Auth bootstrap no frontend passou a concluir OAuth por `code` (`/oauth/callback` e `/oauth/complete-register`) sem token em URL.
- Contrato de atualizacao de paciente padronizado: `PUT` para atualizacao completa e `PATCH` para atualizacao parcial.
- Backend lint estabilizado com correcoes de estilo/regras em services e scripts de suporte.
- Script `up.ps1` reforcado com checks de inicializacao (`.env`, health backend/frontend e resumo de containers).

### Fixed
- Removido envio de token por query string no frontend (`token` em URL).
- OAuth callback migrado para `code` de uso unico + endpoint de troca (`/api/oauth/exchange-code`).
- Update parcial de paciente deixou de sobrescrever campos nao enviados com nulos/defaults.
- `smoke-checklist` agora imprime diagnostico direto no terminal (alem do logger) para facilitar troubleshooting de CI/local.
- Pipeline backend validado em ambiente local: `npm run lint`, `npm test -- --runInBand` e `npm run smoke:checklist` executando sem falhas.
- Checklist frontend validado em ambiente local: `npm run build` e `npm test -- --watchAll=false` executando sem falhas.

### Security
- Removido fallback de autenticacao por `query.token` no backend (agora apenas `Authorization: Bearer`).
- Logger backend passou a aplicar redaction global para campos/strings sensiveis (`authorization`, `token`, `refreshToken`, `password`, `secret`, `api key`).

## [1.0.0] - 2026-03-09

### Added
- Estrutura base de frontend e backend do VetPro.


