export const CONSULTATION_TYPE_OPTIONS = [
  { value: "nova", label: "Consulta geral" },
  { value: "vacinacao", label: "Vacinacao" },
  { value: "anestesia", label: "Anestesia" },
  { value: "retorno", label: "Retorno" },
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
  anestesia: {
    label: "Anestesia",
    shortLabel: "Anestesia",
  },
  retorno: {
    label: "Retorno",
    shortLabel: "Retorno",
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
