const consultationService = require('../services/consultationService');

// Mock do Prisma
jest.mock('../lib/prisma', () => ({
  consultation: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  $transaction: jest.fn((callback) =>
    callback({
      consultation: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    }),
  ),
}));

const prisma = require('../lib/prisma');

describe('consultationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildPatientSyncDataFromConsultation', () => {
    it('deve retornar objeto vazio quando weight for inválido', () => {
      const result = consultationService.buildPatientSyncDataFromConsultation(
        { weight: 'invalid' },
        { weight: 10 },
      );
      expect(result).toEqual({});
    });

    it('deve retornar weight quando for válido e diferente do atual', () => {
      const result = consultationService.buildPatientSyncDataFromConsultation(
        { weight: 15 },
        { weight: 10 },
      );
      expect(result).toEqual({ weight: 15 });
    });

    it('deve retornar objeto vazio quando weight for muito pequeno', () => {
      const result = consultationService.buildPatientSyncDataFromConsultation(
        { weight: 0.001 },
        { weight: 10 },
      );
      expect(result).toEqual({});
    });

    it('deve retornar objeto vazio quando weight for muito grande', () => {
      const result = consultationService.buildPatientSyncDataFromConsultation(
        { weight: 2001 },
        { weight: 10 },
      );
      expect(result).toEqual({});
    });
  });

  describe('normalizeText', () => {
    it('deve normalizar texto com acentos', () => {
      const result = consultationService.normalizeText('ação');
      expect(result).toBe('acao');
    });

    it('deve remover espaços extras', () => {
      const result = consultationService.normalizeText('  teste  ');
      expect(result).toBe('teste');
    });

    it('deve lidar com string vazia', () => {
      const result = consultationService.normalizeText('');
      expect(result).toBe('');
    });
  });

  describe('isMeaningfulProfileValue', () => {
    it('deve retornar false para "não informado"', () => {
      expect(
        consultationService.isMeaningfulProfileValue('não informado'),
      ).toBe(false);
    });

    it('deve retornar false para "nao informado"', () => {
      expect(
        consultationService.isMeaningfulProfileValue('nao informado'),
      ).toBe(false);
    });

    it('deve retornar true para valores significativos', () => {
      expect(
        consultationService.isMeaningfulProfileValue('alergia a frango'),
      ).toBe(true);
    });

    it('deve retornar false para string vazia', () => {
      expect(consultationService.isMeaningfulProfileValue('')).toBe(false);
    });
  });

  describe('sanitizePersistentProfileUpdate', () => {
    it('deve retornar null para entrada inválida', () => {
      expect(
        consultationService.sanitizePersistentProfileUpdate(null),
      ).toBeNull();
      expect(
        consultationService.sanitizePersistentProfileUpdate(undefined),
      ).toBeNull();
      expect(
        consultationService.sanitizePersistentProfileUpdate('string'),
      ).toBeNull();
    });

    it('deve validar campos para porte pequeno', () => {
      const result = consultationService.sanitizePersistentProfileUpdate({
        porte: 'pequeno',
        fields: {
          allergyHistory: 'alergia testada',
          chronicDiseases: '',
        },
      });
      expect(result).toEqual({
        porte: 'pequeno',
        fields: { allergyHistory: 'alergia testada' },
      });
    });

    it('deve validar campos para porte grande', () => {
      const result = consultationService.sanitizePersistentProfileUpdate({
        porte: 'grande',
        fields: {
          farmName: 'Fazenda Teste',
          productionSystem: 'bovino',
        },
      });
      expect(result).toEqual({
        porte: 'grande',
        fields: { farmName: 'Fazenda Teste', productionSystem: 'bovino' },
      });
    });
  });

  describe('mergePatientPersistentProfile', () => {
    it('deve fazer merge de perfis corretamente', () => {
      const currentProfile = {
        pequeno: {
          fields: { allergyHistory: 'alergia anterior' },
        },
      };

      const nextUpdate = {
        porte: 'pequeno',
        fields: { allergyHistory: 'nova alergia' },
      };

      const result = consultationService.mergePatientPersistentProfile(
        currentProfile,
        nextUpdate,
      );
      expect(result.pequeno.fields.allergyHistory).toBe('nova alergia');
    });

    it('deve retornar null para atualização inválida', () => {
      const result = consultationService.mergePatientPersistentProfile(
        {},
        null,
      );
      expect(result).toBeNull();
    });
  });
});
