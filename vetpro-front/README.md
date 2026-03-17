# VetPro - Sistema de Prontuários Veterinários

Sistema completo para gestão de prontuários veterinários com suporte a múltiplas espécies, relatórios inteligentes e exportação de PDF profissional.

## ✨ Funcionalidades

- **Login seguro** com persistência de sessão
- **Dashboard** com métricas em tempo real
- **Gestão de pacientes** com suporte a múltiplas espécies:
  - Mamíferos (Canino, Felino, Equino, Bovino, Caprino, Ovino, Suíno)
  - Aves
  - Répteis
  - Peixes
  - Outros
- **Prontuários inteligentes** com campos adaptativos por espécie
- **Relatórios completos**:
  - Consultas por mês (gráfico em tabela)
  - Distribuição por espécie
  - Distribuição por tipo de consulta (Geral, Retorno, Vacinação)
  - Métricas chave (total de consultas, pacientes únicos, taxa de retorno)
- **Perfil do veterinário** com upload de foto e assinatura digital

## Stack de build/teste

- Build/dev: `Vite`
- Testes: `Vitest` (ambiente `jsdom`)

Comandos:

```bash
npm run dev
npm run build
npm run check:no-native-popups
npm run test
```

## Design System

Tokens e componentes base: `UI-DESIGN-SYSTEM.md`

## Mobile + HTTPS (microfone no Chrome)

Para liberar captura de audio em celular (IP da rede local), rode frontend e backend em HTTPS.

### 1. Backend HTTPS

No `vetpro-backend/.env`:

```env
HOST=0.0.0.0
PORT=5000
HTTPS=true
HTTPS_KEY_PATH=./certs/dev-key.pem
HTTPS_CERT_PATH=./certs/dev-cert.pem
```

### 2. Frontend HTTPS

Crie `vetpro-front/.env.development.local`:

```env
HTTPS=true
SSL_CRT_FILE=../vetpro-backend/certs/dev-cert.pem
SSL_KEY_FILE=../vetpro-backend/certs/dev-key.pem
```

### 3. Certificado local (mkcert)

1. Instale `mkcert`.
2. Rode `mkcert -install`.
3. Gere o certificado com seu IP local:

```bash
mkcert 192.168.0.12 localhost 127.0.0.1
```

Renomeie os arquivos gerados para:
- `vetpro-backend/certs/dev-cert.pem`
- `vetpro-backend/certs/dev-key.pem`

### 4. Reinicie os dois projetos

- Backend: `npm run dev` em `vetpro-backend`
- Frontend: `npm run dev` em `vetpro-front`
