const patientService = require('../services/patientService');

jest.mock('../lib/prisma', () => ({
  patient: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
}));

const prisma = require('../lib/prisma');

describe('patientService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchPatients', () => {
    it('deve buscar pacientes por termo', async () => {
      const mockPatients = [
        { id: '1', name: 'Rex', specie: 'cão' },
        { id: '2', name: 'Rex Junior', specie: 'cão' },
      ];

      prisma.patient.findMany.mockResolvedValue(mockPatients);

      const result = await patientService.searchPatients(
        'user123',
        'clinic1',
        'Rex',
      );

      expect(result).toEqual(mockPatients);
      expect(prisma.patient.findMany).toHaveBeenCalled();
    });

    it('deve listar todos os pacientes sem termo de busca', async () => {
      const mockPatients = [{ id: '1', name: 'Rex' }];
      prisma.patient.findMany.mockResolvedValue(mockPatients);

      const result = await patientService.searchPatients('user123', 'clinic1');

      expect(result).toEqual(mockPatients);
    });
  });

  describe('getPatientById', () => {
    it('deve retornar paciente pelo ID', async () => {
      const mockPatient = { id: '1', name: 'Rex' };
      prisma.patient.findUnique.mockResolvedValue(mockPatient);

      const result = await patientService.getPatientById('user123', '1');

      expect(result).toEqual(mockPatient);
    });

    it('deve retornar null quando paciente não encontrado', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      const result = await patientService.getPatientById('user123', '999');

      expect(result).toBeNull();
    });
  });

  describe('createPatient', () => {
    it('deve criar um novo paciente', async () => {
      const patientData = {
        name: 'Rex',
        specie: 'cão',
        breed: 'Labrador',
        ownerName: 'João',
        ownerPhone: '11999999999',
        userId: 'user123',
        clinicId: 'clinic1',
      };

      const mockCreated = { id: '1', ...patientData };
      prisma.patient.create.mockResolvedValue(mockCreated);

      const result = await patientService.createPatient(patientData);

      expect(result).toEqual(mockCreated);
      expect(prisma.patient.create).toHaveBeenCalledWith({
        data: patientData,
      });
    });
  });

  describe('updatePatient', () => {
    it('deve atualizar um paciente', async () => {
      const updateData = { name: 'Rex Atualizado', weight: 25 };
      const mockUpdated = { id: '1', name: 'Rex Atualizado', weight: 25 };

      prisma.patient.update.mockResolvedValue(mockUpdated);

      const result = await patientService.updatePatient(
        'user123',
        '1',
        updateData,
      );

      expect(result).toEqual(mockUpdated);
    });
  });
});
