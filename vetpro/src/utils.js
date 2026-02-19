// Formatação de datas
export const formatDateForInput = (date) => {
  return date.toISOString().split('T')[0];
};

export const formatDateBR = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
};

export const formatDateTimeBR = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Geração de dados para relatórios
export const getInitialDateRange = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 5);
  return {
    startDate: formatDateForInput(startDate),
    endDate: formatDateForInput(endDate)
  };
};

export const filterConsultationsByDate = (consultations, startDateStr, endDateStr) => {
  const startDate = new Date(startDateStr);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(endDateStr);
  endDate.setHours(23, 59, 59, 999);
  
  return consultations.filter(consultation => {
    const consultDate = new Date(consultation.date);
    consultDate.setHours(0, 0, 0, 0);
    return consultDate >= startDate && consultDate <= endDate;
  });
};

export const generateMonthlyData = (startDateStr, endDateStr) => {
  const monthlyData = {};
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  
  let currentDate = new Date(startDate);
  currentDate.setDate(1);
  
  while (currentDate <= endDate) {
    const monthKey = currentDate.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
    monthlyData[monthKey] = 0;
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  return monthlyData;
};

// Geração de número de prontuário
export const generateRecordNumber = (consultations) => {
  const year = new Date().getFullYear();
  const sequential = String(consultations.length + 1).padStart(3, '0');
  return `VET-${year}-${sequential}`;
};

// Validação de formulários
export const validatePatientForm = (form) => {
  const errors = [];
  
  if (!form.name.trim()) errors.push("Nome do paciente é obrigatório");
  if (!form.species) errors.push("Espécie é obrigatória");
  if (form.species === "Mamífero" && !form.subcategory) errors.push("Categoria é obrigatória para mamíferos");
  if (!form.breed.trim()) errors.push("Raça é obrigatória");
  if (!form.age.trim()) errors.push("Idade é obrigatória");
  if (!form.ownerName.trim()) errors.push("Nome do tutor é obrigatório");
  
  return errors;
};

export const validateConsultationForm = (form) => {
  const errors = [];
  
  if (!form.patientId) errors.push("Selecione um paciente");
  if (!form.chiefComplaint.trim()) errors.push("Queixa principal é obrigatória");
  
  return errors;
};