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

**Rodar em outras maquinas**
- No `.env`, ajuste `REACT_APP_API_BASE_URL` para o IP/hostname da maquina que hospeda o backend.
  Exemplo: `http://192.168.0.10:5000/api`
- Garanta que as portas `3000` e `5000` estejam liberadas no firewall da maquina host.
