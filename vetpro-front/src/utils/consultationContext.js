export const CONSULTATION_TYPE_OPTIONS = [
  { value: "nova", label: "Consulta geral" },
  { value: "medicacao", label: "Prescricao / Medicacao" },
  { value: "vacinacao", label: "Vacinacao" },
  { value: "anestesia", label: "Anestesia" },
  { value: "procedimento", label: "Procedimento cirurgico" },
  { value: "internacao", label: "Evolucao / Internacao" },
  { value: "retorno", label: "Retorno" },
  { value: "laudo", label: "Laudo / Atestado" },
];

const CONSULTATION_CONTEXT_MAP = {
  nova: {
    label: "Consulta geral",
    shortLabel: "Consulta",
  },
  vacinacao: {
    label: "Vacinacao",
    shortLabel: "Vacinacao",
  },
  medicacao: {
    label: "Prescricao / Medicacao",
    shortLabel: "Medicacao",
  },
  anestesia: {
    label: "Anestesia",
    shortLabel: "Anestesia",
  },
  procedimento: {
    label: "Procedimento cirurgico",
    shortLabel: "Procedimento",
  },
  internacao: {
    label: "Evolucao / Internacao",
    shortLabel: "Internacao",
  },
  retorno: {
    label: "Retorno",
    shortLabel: "Retorno",
  },
  laudo: {
    label: "Laudo / Atestado",
    shortLabel: "Laudo",
  },
};

export function resolveConsultationContext(type = "nova") {
  const key = String(type || "nova").trim().toLowerCase();
  return CONSULTATION_CONTEXT_MAP[key] || CONSULTATION_CONTEXT_MAP.nova;
}

export function isReturnConsultationType(type = "") {
  return String(type || "").trim().toLowerCase() === "retorno";
}

export function buildReturnConsultationInitialData(sourceConsultation) {
  if (!sourceConsultation) return null;
  return {
    consultationType: "retorno",
    previousConsultationId: sourceConsultation.id,
    weight: sourceConsultation.weight,
    chiefComplaint: "",
    diagnosis: sourceConsultation.diagnosis || "",
    treatment: sourceConsultation.treatment || "",
  };
}
