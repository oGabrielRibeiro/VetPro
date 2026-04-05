# VetPro

Sistema de prontuarios veterinarios com frontend, backend e Postgres.

## Status de Release 1.0 (resumo rapido)
- [x] UI/UX consolidado (tokens, acessibilidade, mobile, checklist por tela).
- [x] Fluxo de release documentado + changelog central.
- [x] Dependencias criticas revisadas + registro de riscos.
- [ ] Validacao clinica final com amostra real multi-especie (audio/IA).
- [ ] Treinamento do time para registrar mudancas no `CHANGELOG.md` a cada PR.
- [ ] Execucao do roteiro de uso real (login -> paciente -> consulta -> receita/PDF).

Documentos de apoio:
- UI/UX: `docs/UIUX-VALIDACAO.md`
- Design system: `vetpro-front/UI-DESIGN-SYSTEM.md`
- Release: `docs/RELEASE.md`
- Riscos: `docs/SECURITY-RISK-REGISTER.md`
- Migracoes: `docs/DB-MIGRATIONS.md`
- Atualizacoes: `docs/UPDATE-STRATEGY.md`
- Compatibilidade: `docs/VERSION-COMPAT.md`
- Modelos de consulta: `docs/CONSULTATION-MODELS.md`
- Validacao de release: `docs/RELEASE-VALIDATION.md`

**Subir com Docker**
1. Copie `.env.example` para `.env` e ajuste as variaveis se necessario.
2. Suba os containers:

```powershell
docker compose up --build -d
```

Ou use o script:
```powershell
.\up.ps1
```

Modo desenvolvimento (backend/infra em Docker + frontend local):
```powershell
.\up.ps1 -Mode dev
```

3. Acesse:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

**Fluxo rapido de testes (sem `up.ps1`)**
No backend, agora existe um fluxo padrao para validar localmente:

```powershell
cd vetpro-backend
npm run verify:local
```

Isso executa:
1. `infra:up` (sobe apenas `postgres` e `redis` via Docker Compose)
2. `lint`
3. `test --runInBand`
4. `smoke:checklist`

Scripts utilitarios:

```powershell
cd vetpro-backend
npm run infra:up
npm run infra:status
npm run infra:down
```

Observacao: `dev.ps1` continua disponivel como atalho de compatibilidade e redireciona para `up.ps1 -Mode dev`.

**Rodar em outras maquinas**
- Por padrao, o frontend detecta automaticamente o host atual e usa `:5000/api`.
- Se precisar fixar manualmente, no `.env` ajuste `VITE_API_BASE_URL` para o IP/hostname da maquina que hospeda o backend.
  Exemplo: `http://192.168.0.10:5000/api`
- Compatibilidade: `REACT_APP_API_BASE_URL` continua aceito como fallback legado.
- Garanta que as portas `3000` e `5000` estejam liberadas no firewall da maquina host.
- Sempre que alterar `VITE_API_BASE_URL`, recrie o frontend com `docker compose up --build -d`.

**Changelog e releases**
- Changelog oficial: `CHANGELOG.md`
- Guia de release: `docs/RELEASE.md`
- Script de release (sincroniza versao front/back + cria secao no changelog):
```powershell
pwsh .\scripts\release.ps1 -Version 1.1.0
```
- Script com `git commit + git tag` automaticos:
```powershell
pwsh .\scripts\release.ps1 -Version 1.1.0 -WithGit
```

**Processo de PR**
- Toda mudanca relevante deve ser registrada em `CHANGELOG.md` (secao `Unreleased`).
- Atualize a documentacao quando alterar variaveis de ambiente ou scripts.

**Seguranca (revisao mensal de dependencias)**
- Registro de riscos aceitos: `docs/SECURITY-RISK-REGISTER.md`
- Gerar relatorio mensal de auditoria (frontend + backend):
```powershell
pwsh .\scripts\security-monthly-check.ps1
```

**Backup e smoke pós-deploy**
```powershell
pwsh .\scripts\backup-postgres.ps1
pwsh .\scripts\smoke-post-deploy.ps1 -BaseUrl http://localhost:5000
```

**Aplicar migracoes com backup + smoke**
```powershell
pwsh .\scripts\apply-migrations.ps1
```

**Update paralelo (build + migracao + troca rapida)**
```powershell
pwsh .\scripts\parallel-update.ps1
```
