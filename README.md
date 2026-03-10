# VetPro

Sistema de prontuarios veterinarios com frontend, backend e Postgres.

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

Observacao: `up.ps1` continua disponivel como atalho com validacoes adicionais de bootstrap.

**Rodar em outras maquinas**
- Por padrao, o frontend detecta automaticamente o host atual e usa `:5000/api`.
- Se precisar fixar manualmente, no `.env` ajuste `VITE_API_BASE_URL` para o IP/hostname da maquina que hospeda o backend.
  Exemplo: `http://192.168.0.10:5000/api`
- Compatibilidade: `REACT_APP_API_BASE_URL` continua aceito como fallback legado.
- Garanta que as portas `3000` e `5000` estejam liberadas no firewall da maquina host.
- Sempre que alterar `VITE_API_BASE_URL`, recrie o frontend com `docker compose up --build -d`.

**Changelog e releases**
- Changelog oficial: `CHANGELOG.md`
- Guia de release: `RELEASE.md`
- Script de release (sincroniza versao front/back + cria secao no changelog):
```powershell
pwsh .\scripts\release.ps1 -Version 1.1.0
```
- Script com `git commit + git tag` automaticos:
```powershell
pwsh .\scripts\release.ps1 -Version 1.1.0 -WithGit
```

**Seguranca (revisao mensal de dependencias)**
- Registro de riscos aceitos: `SECURITY-RISK-REGISTER.md`
- Gerar relatorio mensal de auditoria (frontend + backend):
```powershell
pwsh .\scripts\security-monthly-check.ps1
```
