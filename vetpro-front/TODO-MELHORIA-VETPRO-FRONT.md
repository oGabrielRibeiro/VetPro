# TODO - Melhorias VetPro Frontend

## 📋 Análise do Frontend

Este documento lista as melhorias recomendadas para o projeto frontend do VetPro, baseado na análise do código existente.

---

## 🔴 Alta Prioridade

### 1. Substituir biblioteca xlsx por exceljs

- [x] 1.1 Verificar se a substituição foi feita corretamente em `src/utils/exportUtils.js` - JÁ IMPLEMENTADO COM EXCELJS
- [x] 1.2 Testar exportação de pacientes para Excel
- [x] 1.3 Testar exportação de consultas para Excel

### 2. Tratamento de Erros e Feedbak do Usuário

- [x] 2.1 Adicionar FeedbackBanner para erros de API em todas as páginas - JÁ IMPLEMENTADO
- [x] 2.2 Implementar toast notifications para success/error - JÁ IMPLEMENTADO (Toast.jsx + ToastProvider)
- [ ] 2.3 Adicionar loading states consistentes
- [x] 2.4 Melhorar mensagens de erro em `src/utils/errorMessages.js` - JÁ IMPLEMENTADO

### 3. Validação de Formulários

- [ ] 3.1 Adicionar validação com React Hook Form ou Yup
- [ ] 3.2 Validar formatos de email, telefone
- [ ] 3.3 Validar datas (não permitir datas futuras para consultas)
- [ ] 3.4 Adicionar máscara para telefone

---

## 🟡 Média Prioridade

### 4. Componentização e Reutilização

- [x] 4.1 Criar componente Input reutilizável - JÁ IMPLEMENTADO (Input.jsx)
- [x] 4.2 Criar componente Select reutilizável - JÁ IMPLEMENTADO (Select.jsx)
- [x] 4.3 Criar componente DatePicker - JÁ IMPLEMENTADO (DatePicker.jsx)
- [ ] 4.4 Extrair campos específicos por espécie para componentes separados
- [x] 4.5 Criar componente Table reutilizável para listagens - JÁ IMPLEMENTADO (Table.jsx)

### 5. Gerenciamento de Estado

- [ ] 5.1 Avaliar uso do React Context para estado global
- [ ] 5.2 Implementar React Query para cache de dados
- [x] 5.3 Adicionar offline queue para operações offline - JÁ IMPLEMENTADO

### 6. Performance

- [x] 6.1 Implementar lazy loading para rotas - JÁ IMPLEMENTADO (React.lazy)
- [ ] 6.2 Adicionar memoização em componentes pesado
- [ ] 6.3 Otimizar re-renders com useMemo/useCallback
- [ ] 6.4 Implementar virtualização em listas grandes

---

## 🟢 Baixa Prioridade

### 7. UI/UX Melhorias

- [x] 7.1 Adicionar skeletons para loading states - JÁ IMPLEMENTADO (Skeleton.jsx)
- [ ] 7.2 Implementar animações com framer-motion
- [ ] 7.3 Adicionar tooltips explicativos
- [ ] 7.4 Melhorar responsividade em dispositivos móveis
- [x] 7.5 Adicionar empty states para listas vazias - JÁ IMPLEMENTADO (EmptyState.jsx)

### 8. Acessibilidade

- [ ] 8.1 Adicionar atributos aria labels
- [ ] 8.2 Garantir contraste de cores WCAG AA
- [ ] 8.3 Adicionar navegação por teclado
- [ ] 8.4 Testar com leitores de tela

### 9. Documentação

- [x] 9.1 Criar README.md com instruções de setup
- [ ] 9.2 Documentar componentes principais
- [ ] 9.3 Criar storybook para componentes

---

## ✅ Tarefas Concluídas (Resumo)

### Alta Prioridade
- ✅ Exportação Excel com ExcelJS
- ✅ FeedbackBanner para erros
- ✅ Toast Notifications (Toast.jsx + ToastProvider integrado no App.jsx)
- ✅ errorMessages.js melhorado

### Média Prioridade
- ✅ Componentes reutilizáveis: Input, Select, DatePicker, Table
- ✅ Lazy loading de rotas
- ✅ Offline queue

### Baixa Prioridade
- ✅ Skeleton loading
- ✅ Empty states
- ✅ README.md

---

## 🔧 Componentes Criados

```
components/
├── Input.jsx              # Componente de input reutilizável
├── Select.jsx            # Componente de select reutilizável  
├── DatePicker.jsx        # Componente de data picker
├── Table.jsx             # Componente de tabela reutilizável
├── Skeleton.jsx          # Skeleton para loading states
├── EmptyState.jsx        # Estado vazio para listas
├── Toast.jsx             # Sistema de toast notifications
├── LoadingSpinner.jsx    # Spinner de loading
└── Animated.jsx          # Componentes animados
```

---

_Last updated: 2026-02-25_
