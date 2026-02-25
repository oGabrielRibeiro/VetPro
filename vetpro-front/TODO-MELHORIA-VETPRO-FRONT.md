# TODO - Melhorias VetPro Frontend

## 📋 Análise do Frontend

Este documento lista as melhorias recomendadas para o projeto frontend do VetPro, baseado na análise do código existente.

---

## 🔴 Alta Prioridade

### 1. Substituir biblioteca xlsx por exceljs

- [ ] 1.1 Verificar se a substituição foi feita corretamente em `src/utils/exportUtils.js`
- [ ] 1.2 Testar exportação de pacientes para Excel
- [ ] 1.3 Testar exportação de consultas para Excel

### 2. Tratamento de Erros e Feedbak do Usuário

- [ ] 2.1 Adicionar FeedbackBanner para erros de API em todas as páginas
- [ ] 2.2 Implementar toast notifications para success/error
- [ ] 2.3 Adicionar loading states consistentes
- [ ] 2.4 Melhorar mensagens de erro em `src/utils/errorMessages.js`

### 3. Validação de Formulários

- [ ] 3.1 Adicionar validação com React Hook Form ou Yup
- [ ] 3.2 Validar formatos de email, telefone
- [ ] 3.3 Validar datas (não permitir datas futuras para consultas)
- [ ] 3.4 Adicionar máscara para telefone

---

## 🟡 Média Prioridade

### 4. Componentização e Reutilização

- [ ] 4.1 Criar componente Input reutilizável
- [ ] 4.2 Criar componente Select reutilizável
- [ ] 4.3 Criar componente DatePicker
- [ ] 4.4 Extrair campos específicos por espécie para componentes separados
- [ ] 4.5 Criar componente Table reutilizável para listagens

### 5. Gerenciamento de Estado

- [ ] 5.1 Avaliar uso do React Context para estado global
- [ ] 5.2 Implementar React Query para cache de dados
- [ ] 5.3 Adicionar offline queue para operações offline

### 6. Performance

- [ ] 6.1 Implementar lazy loading para rotas
- [ ] 6.2 Adicionar memoização em componentes pesado
- [ ] 6.3 Otimizar re-renders com useMemo/useCallback
- [ ] 6.4 Implementar virtualização em listas grandes

---

## 🟢 Baixa Prioridade

### 7. UI/UX Melhorias

- [ ] 7.1 Adicionar skeletons para loading states
- [ ] 7.2 Implementar animações com framer-motion
- [ ] 7.3 Adicionar tooltips explicativos
- [ ] 7.4 Melhorar responsividade em dispositivos móveis
- [ ] 7.5 Adicionar empty states para listas vazias

### 8. Acessibilidade

- [ ] 8.1 Adicionar atributos aria labels
- [ ] 8.2 Garantir contraste de cores WCAG AA
- [ ] 8.3 Adicionar navegação por teclado
- [ ] 8.4 Testar com leitores de tela

### 9. Documentação

- [ ] 9.1 Criar README.md com instruções de setup
- [ ] 9.2 Documentar componentes principais
- [ ] 9.3 Criar storybook para componentes

---

## 📊 Estrutura de Componentes Atual

```
vetpro-front/src/
├── components/
│   ├── AppIcon.jsx
│   ├── BeforeAfterSlider.jsx
│   ├── ConsultationForm.jsx       # Formulário de consultas
│   ├── ConsultationPreview.jsx
│   ├── DashboardCharts.jsx
│   ├── ExamCompareSlider.jsx
│   ├── FeedbackBanner.jsx
│   ├── FieldModeConsultation.jsx
│   ├── FloatingFormActions.jsx
│   ├── LoadingDot.jsx
│   ├── PatientForm.jsx             # Formulário de pacientes
│   ├── QuickConsultation.jsx
│   ├── Sidebar.jsx
│   ├── SpeciesIcon.jsx
│   └── VoiceTextarea.jsx
├── contexts/
│   └── AuthContext.js
├── hooks/
│   ├── useApi.js
│   └── useDashboard.js
├── pages/
│   ├── Appointments.jsx
│   ├── CompareExams.jsx
│   ├── Consultations.jsx
│   ├── Dashboard.jsx
│   ├── Login.jsx
│   ├── Patients.jsx
│   ├── Profile.jsx
│   └── Reports.jsx
├── services/
│   ├── api.js                     # Axios com interceptors
│   └── offlineQueue.js            # Fila offline
└── utils/
    ├── consultationContext.js
    ├── consultationNotes.js
    ├── errorMessages.js
    ├── exportUtils.js             # Exportação Excel/PDF
    └── queryClient.js
```

---

## 🎯 Pontos de Atenção

### ConsultationForm.jsx
- Formulário muito grande (~600 linhas)
- Recomendação: Dividir em componentes menores
- Campos específicos por espécie misturados no componente principal

### PatientForm.jsx
- Validação básica implementada
- Recomendação: Adicionar máscaras e validação mais robusta

### API Service
- Interceptadores bem implementados
- Recomendação: Adicionar retry logic para requests falhados

---

## 🔧 Tecnologias Recomendadas

| Categoria | Atual | Recomendado |
|-----------|-------|-------------|
| Estado | useState/useEffect | React Query |
| Validação | Manual | React Hook Form + Yup |
| Data | date-fns | Manter (já adequado) |
| Excel | exceljs | Manter |
| UI | Tailwind + Components | Manter + Storybook |

---

## 📝 Tarefas Técnicas Específicas

### 1. Adicionar ValidationSchema para PatientForm
```
javascript
// Exemplo com Yup
const patientSchema = yup.object().shape({
  name: yup.string().required('Nome é obrigatório'),
  species: yup.string().required('Espécie é obrigatória'),
  breed: yup.string().required('Raça é obrigatória'),
  age: yup.string().required('Idade é obrigatória'),
  ownerName: yup.string().required('Nome do tutor é obrigatório'),
  ownerEmail: yup.string().email('Email inválido'),
  ownerPhone: yup.string().matches(/^\(\d{2}\)\s\d{5}-\d{4}$/, 'Telefone inválido'),
});
```

### 2. Criar hook usePatients
```
javascript
// Para gerenciar estado de pacientes com cache
const usePatients = () => {
  return useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get('/patients'),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};
```

### 3. Adicionar Loading Skeleton
```
javascript
// Componente reutilizável
const PatientListSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-16 bg-gray-200 rounded-lg" />
    ))}
  </div>
);
```

---

_Last updated: 2026-02-25_
