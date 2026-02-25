# TODO - Melhorias VetPro

## 🔴 Alta Prioridade

### 1. Sistema de Análise IA + Heurística (Modo Offline)

- [x] 1.1 Adicionar função analyzeWithAI para separar speakers e extrair campos clínicos
- [x] 1.2 Modificar analyzeFieldConversation para rodar IA e Heurística em paralelo
- [x] 1.3 Combinar resultados - IA com prioridade, Heurística como fallback
- [x] 1.4 Fallback automático para heurística quando sem internet

### 2. Substituir logger simples por Winston (Logs Estruturados)

- [x] 2.1 Instalar winston e winston-daily-rotate-file
- [x] 2.2 Criar novo logger estruturado em `vetpro-backend/src/utils/logger.js`
- [x] 2.3 Configurar rotação de arquivos de log
- [x] 2.4 Configurar formato JSON estruturado

### 3. Substituir todos console.\* pelo logger estruturado

- [x] 3.1 Substituir em `vetpro-backend/src/services/websocketService.js`
- [x] 3.2 Substituir em `vetpro-backend/src/services/recordChatAssistService.js`
- [x] 3.3 Substituir em `vetpro-backend/src/services/promptService.js`
- [x] 3.4 Substituir em `vetpro-backend/src/services/oauthService.js`
- [x] 3.5 Substituir em `vetpro-backend/src/services/heuristicService.js`
- [x] 3.6 Substituir em `vetpro-backend/src/services/cacheService.js`
- [x] 3.7 Substituir em `vetpro-backend/src/services/aiPromptService.js`
- [x] 3.8 Substituir em `vetpro-backend/src/scripts/*.js`
- [x] 3.9 Substituir em `vetpro-backend/src/routes/oauthRoutes.js`
- [x] 3.10 Substituir em `vetpro-backend/src/controllers/*.js`

## 🟡 Média Prioridade

### 4. Adicionar mais testes unitários

- [x] 4.1 Testes para patientService
- [x] 4.2 Testes para authService
- [x] 4.3 Testes para consultationController
- [x] 4.4 Testes para patientController

### 5. Limpar código não utilizado

- [x] 5.1 Remover imports não utilizados
- [x] 5.2 Remover variáveis não utilizadas

## 🟢 Baixa Prioridade

### 6. Melhorias de documentação

- [ ] 6.1 Atualizar README.md
- [ ] 6.2 Documentar endpoints restantes

---

## ✅ Resultados

- **Testes**: 40 testes passando (5 suites)
- **Logger**: Winston com rotação de arquivos
- **Console**: Substituído por logger estruturado em todos os serviços
- **IA + Heurística**: Sistema híbrido rodando em paralelo com fallback offline

## 📋 Como funciona a análise IA + Heurística

1. **Entrada**: Transcrição de áudio ou texto da consulta
2. **Processamento paralelo**:
   - **IA (OpenAI GPT-4o-mini)**: Separa speakers (Tutor/Veterinário) e extrai campos clínicos detalhados
   - **Heurística**: Sistema tradicional de extração de campos
3. **Combinação**: IA tem prioridade, heurística como backup
4. **Fallback**: Se não tiver internet, usa apenas heurística

_Last updated: 2026-02-25_
