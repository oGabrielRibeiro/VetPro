import * as yup from "yup";

// Schema de validação para Paciente
export const patientSchema = yup.object().shape({
  name: yup
    .string()
    .required("Nome do paciente é obrigatório")
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),

  species: yup.string().required("Espécie é obrigatória"),

  subcategory: yup.string().when("species", {
    is: (species) => species === "Mamífero",
    then: (schema) =>
      schema.required("Subcategoria é obrigatória para mamíferos"),
    otherwise: (schema) => schema.optional(),
  }),

  breed: yup
    .string()
    .required("Raça é obrigatória")
    .min(2, "Raça deve ter pelo menos 2 caracteres"),

  sex: yup.string().optional(),

  // Age pode ser número (do cálculo automático) ou string (digitado manualmente)
  age: yup.lazy((value) => {
    if (typeof value === "number") {
      return yup
        .number()
        .nullable()
        .positive("Idade deve ser um número positivo");
    }
    return yup.string().optional();
  }),

  birthDate: yup.string().optional(),

  weight: yup
    .number()
    .positive("Peso deve ser um número positivo")
    .nullable()
    .transform((value, original) => (original === "" ? null : value)),

  color: yup.string().optional(),

  microchip: yup.string().optional(),

  porte: yup.string().optional(),

  ownerName: yup
    .string()
    .required("Nome do tutor é obrigatório")
    .min(2, "Nome do tutor deve ter pelo menos 2 caracteres"),

  ownerPhone: yup.string().optional(),

  ownerAltPhone: yup.string().optional(),

  ownerEmail: yup.string().optional().email("E-mail deve ser válido"),

  ownerAddress: yup.string().optional(),
});

// Schema para Agendamento
export const appointmentSchema = yup.object().shape({
  patientId: yup.string().required("Selecione um paciente"),

  date: yup
    .string()
    .required("Data é obrigatória")
    .test("not-past", "Não é possível agendar para datas passadas", (value) => {
      if (!value) return false;
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    }),

  time: yup.string().required("Horário é obrigatório"),

  reason: yup
    .string()
    .required("Motivo é obrigatório")
    .min(5, "Motivo deve ter pelo menos 5 caracteres"),

  type: yup.string().required("Tipo de atendimento é obrigatório"),
});

// Schema para Consulta
export const consultationSchema = yup.object().shape({
  patientId: yup.string().required("Selecione um paciente"),

  consultationType: yup.string().required("Tipo de consulta é obrigatório"),

  chiefComplaint: yup
    .string()
    .required("Queixa principal é obrigatória")
    .min(5, "Descreva a queixa com mais detalhes"),

  date: yup
    .string()
    .required("Data da consulta é obrigatória")
    .test(
      "not-future",
      "Não é possível registrar consulta em data futura",
      (value) => {
        if (!value) return false;
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return selectedDate <= today;
      },
    ),
});

// Função auxiliar para formatar telefone
export const formatPhone = (value) => {
  if (!value) return value;
  const phoneNumber = value.replace(/\D/g, "");
  const phoneNumberLength = phoneNumber.length;

  if (phoneNumberLength < 3) return phoneNumber;
  if (phoneNumberLength < 4) {
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
  }
  if (phoneNumberLength < 5) {
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 3)}-${phoneNumber.slice(3)}`;
  }
  if (phoneNumberLength < 6) {
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 3)}-${phoneNumber.slice(3)}`;
  }
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 3)}-${phoneNumber.slice(3)}`;
  }
  if (phoneNumberLength < 8) {
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 3)}-${phoneNumber.slice(3)}`;
  }
  if (phoneNumberLength < 9) {
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7)}`;
  }
  if (phoneNumberLength < 10) {
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 6)}-${phoneNumber.slice(6, 10)}`;
  }
  return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
};

// Função auxiliar para formatar CPF
export const formatCpf = (value) => {
  if (!value) return value;
  const cpf = value.replace(/\D/g, "");
  if (cpf.length < 4) return cpf;
  if (cpf.length < 7) {
    return `${cpf.slice(0, 3)}.${cpf.slice(3)}`;
  }
  if (cpf.length < 10) {
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`;
  }
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`;
};

// Função para validar CPF
export const isValidCpf = (cpf) => {
  if (!cpf) return false;
  const cleanCpf = cpf.replace(/\D/g, "");

  if (cleanCpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCpf)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCpf.charAt(i - 1)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.charAt(9))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCpf.charAt(i - 1)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.charAt(10))) return false;

  return true;
};
