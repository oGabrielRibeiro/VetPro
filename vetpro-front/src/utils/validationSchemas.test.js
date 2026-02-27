import { formatCpf, formatPhone, isValidCpf } from "./validationSchemas";

describe("validationSchemas utils", () => {
  it("formatPhone deve formatar telefone com 11 dígitos", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
  });

  it("formatCpf deve formatar CPF completo", () => {
    expect(formatCpf("12345678909")).toBe("123.456.789-09");
  });

  it("isValidCpf deve validar CPF correto", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
  });

  it("isValidCpf deve rejeitar CPF inválido", () => {
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123.456.789-00")).toBe(false);
  });
});

