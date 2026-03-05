# TODO List - Proxima Sprint

## P0 - Seguranca e autenticação
- [ ] Remover uso de `token` na URL no frontend (PDF, imagens, downloads).
- [ ] Implementar download via API autenticada + `blob` para arquivos/PDF.
- [ ] Restringir `query.token` no backend para fluxo legado temporário ou remover totalmente.
- [ ] Revisar logs para garantir que token nunca seja persistido.

## P0 - Consistencia de contrato (Paciente)
- [ ] Definir regra oficial para update de paciente: `PUT` completo ou `PATCH` parcial.
- [ ] Alinhar `validationMiddleware` e `patientService` para o mesmo contrato.
- [ ] Cobrir cenarios de update parcial/completo com testes de rota e service.

## P1 - Qualidade de codigo e CI
- [ ] Corrigir erros de `npm run lint` no backend (atualmente quebrado).
- [ ] Tratar warnings relevantes (`no-console`, `no-lonely-if`, `prettier`) em scripts/servicos.
- [ ] Garantir pipeline local: `lint + test + smoke` sem falhas.

## P1 - Dependencias e vulnerabilidades
- [ ] Backend: atualizar `multer` para versao sem advisories.
- [ ] Backend: revisar migracao de `bcrypt` para versao segura (avaliar impacto major).
- [ ] Frontend: planejar saida de `react-scripts` (ou upgrade controlado) para reduzir vulns herdadas.
- [ ] Executar `npm audit` após upgrades e registrar baseline.

## P2 - Performance e robustez de I/O
- [ ] Trocar operacoes `fs.*Sync` de runtime por assíncronas em `cloudStorageService`.
- [ ] Garantir criacao de diretorio de upload de logo no middleware (`uploads/clinics`).
- [ ] Revisar manipulacao de arquivos temporarios e limpeza em erros.

## P2 - UX e confiabilidade funcional
- [ ] Completar remocao de popups nativos e padronizar modais in-app.
- [ ] Consolidar comportamento desktop/mobile de barras de acao em todas as telas.
- [ ] Revisar preenchimento por audio de campos de porte com cenarios reais (small/large).
- [ ] Adicionar testes de regressao para campos especificos (sobrepreenchimento e subpreenchimento).

## Checklist de validacao final
- [ ] Backend: `npm run lint`
- [ ] Backend: `npm test -- --runInBand`
- [ ] Backend: `npm run smoke:checklist`
- [ ] Frontend: `npm run build`
- [ ] Frontend: `npm test -- --watchAll=false`
