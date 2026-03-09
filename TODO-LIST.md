# TODO List - Proxima Sprint

## Plano dedicado IA/Audio
- [ ] Executar backlog tecnico completo em [`TODO-AUDIO-IA-PARSER.md`](TODO-AUDIO-IA-PARSER.md) para elevar precisao do pipeline de transcricao/parser/IA/heuristica.

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

## P1 - Dependencias e vulnerabilidades
- [ ] Backend: atualizar `multer` para versao sem advisories.
- [ ] Backend: revisar migracao de `bcrypt` para versao segura (avaliar impacto major).
- [ ] Frontend: planejar saida de `react-scripts` (ou upgrade controlado) para reduzir vulns herdadas.
- [ ] Executar `npm audit` após upgrades e registrar baseline.

## P1 - Vulnerabilidades reportadas (OSV/GitHub)
- [ ] `bcrypt@5.1.1`: analisar cadeia transitiva vulneravel (`node-pre-gyp`/`tar`) e validar migracao para `bcrypt@6` ou substituicao por `bcryptjs`.
- [ ] `swagger-jsdoc@6.2.8`: revisar CVEs transitivas sem remediation automatica e aplicar mitigacao por isolamento de uso (apenas ambiente interno/dev), alem de monitoramento de upstream.
- [ ] `express-rate-limit@8.2.1`: revisar advisory direto sem fix disponivel e aplicar mitigacoes compensatorias:
- [ ] limitar superfícies expostas sensiveis (auth/upload),
- [ ] reforcar WAF/reverse proxy rate-limit,
- [ ] hardening de configuracoes e monitoramento de abuso.
- [ ] Criar issue de risco aceito com prazo e dono para cada dependencia sem patch.
- [ ] Reavaliar mensalmente `npm audit` e OSV ate existir versao corrigida.

## P2 - Performance e robustez de I/O
- [ ] Trocar operacoes `fs.*Sync` de runtime por assíncronas em `cloudStorageService`.
- [ ] Garantir criacao de diretorio de upload de logo no middleware (`uploads/clinics`).
- [ ] Revisar manipulacao de arquivos temporarios e limpeza em erros.

## P2 - UX e confiabilidade funcional
- [ ] Completar remocao de popups nativos e padronizar modais in-app.
- [ ] Consolidar comportamento desktop/mobile de barras de acao em todas as telas.
- [ ] Revisar preenchimento por audio de campos de porte com cenarios reais (small/large).
- [ ] Adicionar testes de regressao para campos especificos (sobrepreenchimento e subpreenchimento).

## P2 - Changelog e atualizacoes
- [x] Adotar `CHANGELOG.md` como fonte unica de mudancas por release.
- [ ] Treinar time para registrar mudancas em `Unreleased` a cada PR relevante.
- [x] Padronizar uso do script `scripts/release.ps1` para preparar versao.
- [x] Definir checklist de release no `RELEASE.md` como processo oficial.

## Checklist de validacao final
- [x] Backend: `npm run lint`
- [x] Backend: `npm test -- --runInBand`
- [x] Backend: `npm run smoke:checklist`
- [x] Frontend: `npm run build`
- [x] Frontend: `npm test -- --watchAll=false`
