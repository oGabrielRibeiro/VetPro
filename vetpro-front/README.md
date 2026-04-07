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

## 📦 Scripts Completos

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento (http://localhost:3000) |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build local |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes E2E (Playwright) |
| `npm run lint` | ESLint - verificar erros |
| `npm run lint:fix` | ESLint - corrigir automaticamente |
| `npm run format` | Prettier - formatar código |
| `npm run format:check` | Prettier - verificar formatação |
| `npm run storybook` | Storybook docs |

## 🧪 Testes e Qualidade

### Executar testes unitários
```bash
npm test
```

### Executar testes E2E
```bash
npm run test:e2e
```

## 🏗️ Estrutura do Projeto

```
vetpro-front/
├── src/
│   ├── App.jsx              # Raíz da app
│   ├── pages/               # Páginas principais
│   │   ├── Dashboard.jsx
│   │   ├── Appointments.jsx
│   │   ├── Consultations.jsx
│   │   └── Patients.jsx
│   ├── components/          # Componentes reutilizáveis
│   │   ├── ConsultationForm.jsx
│   │   ├── PatientForm.jsx
│   │   └── ...
│   ├── services/            # API clients
│   ├── utils/               # Utilitários
│   └── hooks/               # Hooks customizados
└── public/                  # Assets estáticos
```

## 📱 Design System

### Tokens
Gerencia tokens de design:
```bash
npm run tokens:build
```

### Componentes Principais
- Dialog (Modal)
- DropdownMenu
- Select
- Toast (Notificações)
- Tooltip
- Popover

Baseado em **Radix UI** para acessibilidade WCAG.

## 🔧 Boas Práticas

### Type Checking (TypeScript opcional)
A configuração do Vite suporta TypeScript. Para ativar, renomeie arquivos `.jsx` para `.tsx`.

### Componentes Documentados
- PropTypes em andamento
- JSDoc em funções críticas
- Storybook para componentes visuais

## 🐛 Solução de Problemas

### Porta 3000 em uso
```bash
lsof -ti:3000 | xargs kill -9
```

### Limpar cache completo
```bash
rm -rf node_modules package-lock.json
npm install
```

### Verificar Node versão
```bash
node -v  # deve ser >= 20 < 21
```

## 📦 Build de Produção

### 1. Configurar variáveis
```bash
echo "VITE_API_BASE_URL=http://localhost:5000/api" > .env.production.local
```

### 2. Executar build
```bash
npm run build
```

## 📱 Mobile HTTPS

Para capturar áudio no Chrome mobile, configure HTTPS.

## 📈 Métricas

- **Build otimizado**: em progresso
- **Cobertura de testes**: 0% → 80% (em progresso)
- **ESLint**: ✅ Configurado
- **Prettier**: ✅ Configurado
- **Peso dos components**: Otimizado
