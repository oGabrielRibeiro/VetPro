import {
  buildReturnConsultationInitialData,
  isReturnConsultationType,
  resolveConsultationContext,
} from "./consultationContext";

describe("consultationContext utils", () => {
  it("resolveConsultationContext deve retornar contexto padrão para valor inválido", () => {
    const result = resolveConsultationContext("qualquer-coisa");
    expect(result).toEqual(
      expect.objectContaining({
        label: "Consulta geral",
        shortLabel: "Consulta",
      }),
    );
  });

  it("isReturnConsultationType deve identificar retorno com variação de caixa", () => {
    expect(isReturnConsultationType("RETORNO")).toBe(true);
    expect(isReturnConsultationType("nova")).toBe(false);
  });

  it("buildReturnConsultationInitialData deve montar payload inicial de retorno", () => {
    const source = {
      id: "consult-1",
      weight: 13.4,
      diagnosis: "Gastrite",
      treatment: "Dieta + antiemético",
    };

    const result = buildReturnConsultationInitialData(source);

    expect(result).toEqual({
      consultationType: "retorno",
      previousConsultationId: "consult-1",
      weight: 13.4,
      chiefComplaint: "",
      diagnosis: "Gastrite",
      treatment: "Dieta + antiemético",
    });
  });

  it("buildReturnConsultationInitialData deve retornar null quando não há source", () => {
    expect(buildReturnConsultationInitialData(null)).toBeNull();
  });
});

