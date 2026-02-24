const consultationService = require('../services/consultationService');

describe('ConsultationService', () => {
  describe('buildPatientSyncDataFromConsultation', () => {
    it('deve retornar peso quando válido', () => {
      const result = consultationService.buildPatientSyncDataFromConsultation(
        { weight: 10.5 },
        { weight: 5.0 },
      );
      expect(result).toEqual({ weight: 10.5 });
    });

    it('deve retornar vazio quando peso inválido', () => {
      const result = consultationService.buildPatientSyncDataFromConsultation(
        { weight: -5 },
        {},
      );
      expect(result).toEqual({});
    });

    it('deve retornar vazio quando peso não mudou', () => {
      const result = consultationService.buildPatientSyncDataFromConsultation(
        { weight: 10.0 },
        { weight: 10.0 },
      );
      expect(result).toEqual({});
    });
  });

  describe('normalizeText', () => {
    it('deve normalizar texto com acentos', () => {
      const result = consultationService.normalizeText('Joãoção');
      expect(result).toBe('joaocao');
    });

    it('deve trim e lowercase', () => {
      const result = consultationService.normalizeText('  TESTE  ');
      expect(result).toBe('teste');
    });
  });

  describe('isMeaningfulProfileValue', () => {
    it('deve retornar true para valor significativo', () => {
      expect(consultationService.isMeaningfulProfileValue('Vacinado')).toBe(
        true,
      );
    });

    it('deve retornar false para texto vazio', () => {
      expect(consultationService.isMeaningfulProfileValue('')).toBe(false);
    });

    it('deve retornar false para "não informado"', () => {
      expect(
        consultationService.isMeaningfulProfileValue('não informado'),
      ).toBe(false);
    });
  });
});
