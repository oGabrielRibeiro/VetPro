# TODO - Melhorias VetPro

## 🔴 Alta Prioridade

### 1. Substituir logger simples por Winston (Logs Estruturados)
- [x] 1.1 Instalar winston e winston-daily-rotate-file
- [x] 1.2 Criar novo logger estruturado em `vetpro-backend/src/utils/logger.js`
- [x] 1.3 Configurar rotação de arquivos de log
- [x] 1.4 Configurar formato JSON estruturado

### 2. Substituir todos console.* pelo logger estruturado
- [x] 2.1 Substituir em `vetpro-backend/src/services/websocketService.js`
- [x] 2.2 Substituir em `vetpro-backend/src/services/recordChatAssistService.js`
- [x] 2.3 Substituir em `vetpro-backend/src/services/promptService.js`
- [x] 2.4 Substituir em `vetpro-backend/src/services/oauthService.js`
- [x] 2.5 Substituir em `vetpro-backend/src/services/heuristicService.js`
- [x] 2.6 Substituir em `vetpro-backend/src/services/cacheService.js`
- [x] 2.7 Substituir em `vetpro-backend/src/services/aiPromptService.js`
- [x] 2.8 Substituir em `vetpro-backend/src/scripts/*.js`
- [x] 2.9 Substituir em `vetpro-backend/src/routes/oauthRoutes.js`
- [x] 2.10 Substituir em `vetpro-backend/src/controllers/*.js`

## 🟡 Média Prioridade

### 3. Adicionar mais testes unitários
- [x] 3.1 Testes para patientService
- [x] 3.2 Testes para authService
- [x] 3.3 Testes para consultationController
- [x] 3.4 Testes para patientController

### 4. Limpar código não utilizado
- [ ] 4.1 Remover imports não utilizados
- [ ] 4.2 Remover variáveis não utilizadas

## 🟢 Baixa Prioridade

### 5. Melhorias de documentação
- [ ] 5.1 Atualizar README.md
- [ ] 5.2 Documentar endpoints restantes

---

## ✅ Resultados

- **Testes**: 40 testes passando (5 suites)
- **Logger**: Winston com rotação de arquivos
- **Console**: Substituído por logger estruturado em todos os serviços

_Last updated: 2026-02-24_
