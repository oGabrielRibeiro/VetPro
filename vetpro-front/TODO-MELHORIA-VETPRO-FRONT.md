# TODO - Melhorias VetPro Frontend

## 📋 Análise do Frontend

Este documento lista as melhorias recomendadas para o projeto frontend do VetPro, baseado na análise do código existente.

---

## 🔴 Alta Prioridade

### 1. Substituir biblioteca xlsx por exceljs

- [x] 1.1 Verificar se a substituição foi feita corretamente em `src/utils/exportUtils.js`
- [x] 1.2 Testar exportação de pacientes para Excel
- [x] 1.3 Testar exportação de consultas para Excel

### 2. Tratamento de Erros e Feedbak do Usuário

- [x] 2.1 Adicionar FeedbackBanner para erros de API em todas as páginas (Parcial - já existe em App.jsx)
- [ ] 2.2 Implementar toast notifications para success/error
- [ ] 2.3 Adicionar loading states consistentes
- [x] 2.4 Melhorar mensagens de erro em `src/utils/errorMessages.js`

### 3. Validação de Formulários

- [x] 3.1 Adicionar validação com React Hook Form e Yup (Implementado em PatientForm)
- [x] 3.2 Validar formatos de email, telefone
- [x] 3.3 Validar datas (não permitir datas futuras para consultas)
- [x] 3.4 Adicionar máscara para telefone

---

## 🟡 Média Prioridade

### 4. Componentização e Reutilização

- [x] 4.1 Criar componente Input reutilizável
- [x] 4.2 Criar componente Select reutilizável
- [x] 4.3 Criar componente DatePicker
- [ ] 4.4 Extrair campos específicos por espécie para componentes separados
- [x] 4.5 Criar componente Table reutilizável para listagens

### 5. Gerenciamento de Estado

- [x] 5.1 Avaliar uso do React Context para estado global (AuthContext já existe)
- [x] 5.2 Implementar React Query para cache de dados (já configurado)
- [x] 5.3 Adicionar offline queue para operações offline (já implementado)

### 6. Performance

- [x] 6.1 Implementar lazy loading para rotas (React.lazy já usado em App.jsx)
- [ ] 6.2 Adicionar memoização em componentes pesado
- [ ] 6.3 Otimizar re-renders com useMemo/useCallback
- [ ] 6.4 Implementar virtualização em listas grandes

---

## 🟢 Baixa Prioridade

### 7. UI/UX Melhorias

- [x] 7.1 Adicionar skeletons para loading states (Skeleton.jsx criado)
- [x] 7.2 Implementar animações com framer-motion (já instalado)
- [ ] 7.3 Adicionar tooltips explicativos
- [ ] 7.4 Melhorar responsividade em dispositivos móveis
- [x] 7.5 Adicionar empty states para listas vazias

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

## 🎯 Progresso Atual (2026-02-25)

### Concluído:
- ✅ ExportUtils usando exceljs
- ✅ FeedbackBanner integrado
- ✅ Formulário de paciente com React Hook Form + Yup
- ✅ Validação de campos (nome, espécie, raça, idade, tutor)
- ✅ Máscara de telefone implementada
- ✅ Componentes reutilizáveis: Input, Select, DatePicker, Table, Skeleton
- ✅ React Query configurado
- ✅ Offline queue implementado
- ✅ Lazy loading de rotas

### Em Andamento:
- 🔄 Teste final do formulário de paciente (PatientForm)
- 🔄 Validação e submissão para API

### Pendente:
- ⏳ Toast notifications
- ⏳ Loading states consistentes
- ⏳ Memoização e otimização de performance

---

## 📁 Estrutura de Componentes

```
src/
├── components/
│   ├── AppIcon.jsx
│   ├── BeforeAfterSlider.jsx
│   ├── ConsultationForm.jsx
│   ├── ConsultationPreview.jsx
│   ├── DashboardCharts.jsx
│   ├── ExamCompareSlider.jsx
│   ├── FeedbackBanner.jsx
│   ├── FieldModeConsultation.jsx
│   ├── FloatingFormActions.jsx
│   ├── Input.jsx              # NOVO - Componente de input reutilizável
│   ├── LoadingDot.jsx
│   ├── LoadingSpinner.jsx     # NOVO
│   ├── PatientForm.jsx        # ATUALIZADO - Com React Hook Form
│   ├── QuickConsultation.jsx
│   ├── Select.jsx             # NOVO - Componente de select reutilizável
│   ├── Sidebar.jsx
│   ├── Skeleton.jsx          # NOVO
│   ├── SpeciesIcon.jsx
│   ├── Table.jsx             # NOVO - Componente de tabela reutilizável
│   ├── DatePicker.jsx        # NOVO
│   └── VoiceTextarea.jsx
├── contexts/
│   └── AuthContext.js
├── hooks/
│   ├── useApi.js
│   ├── useDarkMode.js
│   ├── useDashboard.js
│   └── useToast.js           # NOVO - Hook para toast notifications
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
│   ├── api.js
│   └── offlineQueue.js
└── utils/
    ├── consultationContext.js
    ├── consultationNotes.js
    ├── errorMessages.js
    ├── exportUtils.js
    ├── queryClient.js
    └── validationSchemas.js  # NOVO - Schemas de validação Yup
```

---

## 🔧 Tecnologias Usadas

| Categoria | Tecnologia |
|-----------|------------|
| Estado | React Query + Context |
| Validação | React Hook Form + Yup |
| Data | date-fns |
| Excel | exceljs |
| UI | Tailwind CSS |
| Animações | framer-motion |

_Last updated: 2026-02-25_

favicon.ico:1  GET http://localhost:3000/favicon.ico 404 (Not Found)
createFormControl.ts:750 Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'name')
    at J (createFormControl.ts:750:31)
    at D (DatePicker.jsx:98:9)
    at onChange (DatePicker.jsx:164:36)
    at Object.Re (react-dom.production.min.js:54:317)
    at Ve (react-dom.production.min.js:54:471)
    at react-dom.production.min.js:55:35
    at Mr (react-dom.production.min.js:105:68)
    at zr (react-dom.production.min.js:106:380)
    at react-dom.production.min.js:117:104
    at lu (react-dom.production.min.js:273:42)
J @ createFormControl.ts:750
D @ DatePicker.jsx:98
onChange @ DatePicker.jsx:164
Re @ react-dom.production.min.js:54
Ve @ react-dom.production.min.js:54
(anonymous) @ react-dom.production.min.js:55
Mr @ react-dom.production.min.js:105
zr @ react-dom.production.min.js:106
(anonymous) @ react-dom.production.min.js:117
lu @ react-dom.production.min.js:273
Pe @ react-dom.production.min.js:52
$r @ react-dom.production.min.js:109
Qt @ react-dom.production.min.js:74
Wt @ react-dom.production.min.js:73
createFormControl.ts:750 Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'name')
    at J (createFormControl.ts:750:31)
    at D (DatePicker.jsx:98:9)
    at onChange (DatePicker.jsx:164:36)
    at Object.Re (react-dom.production.min.js:54:317)
    at Ve (react-dom.production.min.js:54:471)
    at react-dom.production.min.js:55:35
    at Mr (react-dom.production.min.js:105:68)
    at zr (react-dom.production.min.js:106:380)
    at react-dom.production.min.js:117:104
    at lu (react-dom.production.min.js:273:42)
J @ createFormControl.ts:750
D @ DatePicker.jsx:98
onChange @ DatePicker.jsx:164
Re @ react-dom.production.min.js:54
Ve @ react-dom.production.min.js:54
(anonymous) @ react-dom.production.min.js:55
Mr @ react-dom.production.min.js:105
zr @ react-dom.production.min.js:106
(anonymous) @ react-dom.production.min.js:117
lu @ react-dom.production.min.js:273
Pe @ react-dom.production.min.js:52
$r @ react-dom.production.min.js:109
Qt @ react-dom.production.min.js:74
Wt @ react-dom.production.min.js:73
createFormControl.ts:750 Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'name')
    at J (createFormControl.ts:750:31)
    at D (DatePicker.jsx:94:9)
    at onChange (DatePicker.jsx:198:36)
    at Object.Re (react-dom.production.min.js:54:317)
    at Ve (react-dom.production.min.js:54:471)
    at react-dom.production.min.js:55:35
    at Mr (react-dom.production.min.js:105:68)
    at zr (react-dom.production.min.js:106:380)
    at react-dom.production.min.js:117:104
    at lu (react-dom.production.min.js:273:42)
J @ createFormControl.ts:750
D @ DatePicker.jsx:94
onChange @ DatePicker.jsx:198
Re @ react-dom.production.min.js:54
Ve @ react-dom.production.min.js:54
(anonymous) @ react-dom.production.min.js:55
Mr @ react-dom.production.min.js:105
zr @ react-dom.production.min.js:106
(anonymous) @ react-dom.production.min.js:117
lu @ react-dom.production.min.js:273
Pe @ react-dom.production.min.js:52
$r @ react-dom.production.min.js:109
Qt @ react-dom.production.min.js:74
Wt @ react-dom.production.min.js:73
PatientForm.jsx:88 Button clicked!
PatientForm.jsx:91 Validation result: true
PatientForm.jsx:95 Form data after validation: {name: 'zeze', species: 'Mamífero', subcategory: 'Bovino', breed: 'Nelore', sex: 'Macho', …}
App.jsx:454  POST http://localhost:5000/api/patients 400 (Bad Request)
(anonymous) @ xhr.js:198
xhr @ xhr.js:15
dt @ dispatchRequest.js:51
Promise.then
_request @ Axios.js:172
request @ Axios.js:41
(anonymous) @ Axios.js:233
(anonymous) @ bind.js:12
(anonymous) @ App.jsx:454
onSubmit @ App.jsx:790
onClick @ PatientForm.jsx:96
await in onClick
Re @ react-dom.production.min.js:54
Ve @ react-dom.production.min.js:54
(anonymous) @ react-dom.production.min.js:55
Mr @ react-dom.production.min.js:105
zr @ react-dom.production.min.js:106
(anonymous) @ react-dom.production.min.js:117
lu @ react-dom.production.min.js:273
Pe @ react-dom.production.min.js:52
$r @ react-dom.production.min.js:109
Qt @ react-dom.production.min.js:74
Wt @ react-dom.production.min.js:73
App.jsx:460 Erro ao adicionar paciente: AxiosError: Request failed with status code 400
    at Ne (settle.js:19:12)
    at XMLHttpRequest.v (xhr.js:59:7)
    at gt.request (Axios.js:46:41)
    at async App.jsx:454:13
(anonymous) @ App.jsx:460
await in (anonymous)
onSubmit @ App.jsx:790
onClick @ PatientForm.jsx:96
await in onClick
Re @ react-dom.production.min.js:54
Ve @ react-dom.production.min.js:54
(anonymous) @ react-dom.production.min.js:55
Mr @ react-dom.production.min.js:105
zr @ react-dom.production.min.js:106
(anonymous) @ react-dom.production.min.js:117
lu @ react-dom.production.min.js:273
Pe @ react-dom.production.min.js:52
$r @ react-dom.production.min.js:109
Qt @ react-dom.production.min.js:74
Wt @ react-dom.production.min.js:73
PatientForm.jsx:88 Button clicked!
PatientForm.jsx:91 Validation result: true
PatientForm.jsx:95 Form data after validation: {name: 'zeze', species: 'Mamífero', subcategory: 'Bovino', breed: 'Nelore', sex: 'Macho', …}age: "4"birthDate: ""breed: "Nelore"color: "Preto e Branco"microchip: "45568"name: "zeze"ownerAddress: "Rua 9 , 99"ownerAltPhone: ""ownerEmail: "tutor@gmail.com"ownerName: "Jão"ownerPhone: "(12) 93903-2440"porte: "Grande"sex: "Macho"species: "Mamífero"subcategory: "Bovino"weight: "102"[[Prototype]]: Object
App.jsx:454  POST http://localhost:5000/api/patients 400 (Bad Request)
(anonymous) @ xhr.js:198
xhr @ xhr.js:15
dt @ dispatchRequest.js:51
Promise.then
_request @ Axios.js:172
request @ Axios.js:41
(anonymous) @ Axios.js:233
(anonymous) @ bind.js:12
(anonymous) @ App.jsx:454
onSubmit @ App.jsx:790
onClick @ PatientForm.jsx:96
await in onClick
Re @ react-dom.production.min.js:54
Ve @ react-dom.production.min.js:54
(anonymous) @ react-dom.production.min.js:55
Mr @ react-dom.production.min.js:105
zr @ react-dom.production.min.js:106
(anonymous) @ react-dom.production.min.js:117
lu @ react-dom.production.min.js:273
Pe @ react-dom.production.min.js:52
$r @ react-dom.production.min.js:109
Qt @ react-dom.production.min.js:74
Wt @ react-dom.production.min.js:73
App.jsx:460 Erro ao adicionar paciente: AxiosError: Request failed with status code 400
    at Ne (settle.js:19:12)
    at XMLHttpRequest.v (xhr.js:59:7)
    at gt.request (Axios.js:46:41)
    at async App.jsx:454:13
(anonymous) @ App.jsx:460
await in (anonymous)
onSubmit @ App.jsx:790
onClick @ PatientForm.jsx:96
await in onClick
Re @ react-dom.production.min.js:54
Ve @ react-dom.production.min.js:54
(anonymous) @ react-dom.production.min.js:55
Mr @ react-dom.production.min.js:105
zr @ react-dom.production.min.js:106
(anonymous) @ react-dom.production.min.js:117
lu @ react-dom.production.min.js:273
Pe @ react-dom.production.min.js:52
$r @ react-dom.production.min.js:109
Qt @ react-dom.production.min.js:74
Wt @ react-dom.production.min.js:73
(index):1 Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received
(index):1 Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received
(index):1 Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received
(index):1 Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received
