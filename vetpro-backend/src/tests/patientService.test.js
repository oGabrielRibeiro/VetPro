const patientService = require('../services/patientService');

jest.mock('../lib/prisma', () => ({
  patient: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
}));

const prisma = require('../lib/prisma');

describe('patientService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPatients', () => {
    it('deve buscar pacientes com paginacao', async () => {
      const mockPatients = [
        { id: '1', name: 'Rex', specie: 'cao' },
        { id: '2', name: 'Rex Junior', specie: 'cao' },
      ];

      prisma.patient.findMany.mockResolvedValue(mockPatients);
      prisma.patient.count.mockResolvedValue(2);

      const result = await patientService.getPatients('user123', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('getPatientById', () => {
    it('deve retornar paciente pelo ID', async () => {
      const mockPatient = { id: '1', name: 'Rex', specie: 'cao' };
      prisma.patient.findFirst.mockResolvedValue(mockPatient);

      const result = await patientService.getPatientById('user123', '1');

      expect(result).toEqual({ ...mockPatient, species: mockPatient.specie });
    });

    it('deve retornar null quando paciente nao encontrado', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);

      const result = await patientService.getPatientById('user123', '999');

      expect(result).toBeNull();
    });
  });

  describe('createPatient', () => {
    it('deve criar um novo paciente', async () => {
      const patientData = {
        name: 'Rex',
        specie: 'cao',
        breed: 'Labrador',
        ownerName: 'Joao',
        ownerPhone: '11999999999',
      };

      const mockCreated = {
        id: '1',
        ...patientData,
        userId: 'user123',
        clinicId: 'clinic1',
      };
      prisma.patient.create.mockResolvedValue(mockCreated);

      const result = await patientService.createPatient(
        'user123',
        'clinic1',
        patientData,
      );

      expect(result).toEqual(mockCreated);
      expect(prisma.patient.create).toHaveBeenCalled();
    });

    it('deve lancar erro quando nome vazio', async () => {
      const patientData = {
        name: '',
        specie: 'cao',
        ownerName: 'Joao',
      };

      await expect(
        patientService.createPatient('user123', 'clinic1', patientData),
      ).rejects.toThrow('Nome do paciente e obrigatorio.');
    });

    it('deve lancar erro quando especie vazia', async () => {
      const patientData = {
        name: 'Rex',
        specie: '',
        ownerName: 'Joao',
      };

      await expect(
        patientService.createPatient('user123', 'clinic1', patientData),
      ).rejects.toThrow('Especie e obrigatoria.');
    });

    it('deve lancar erro quando tutor vazio', async () => {
      const patientData = {
        name: 'Rex',
        specie: 'cao',
        ownerName: '',
      };

      await expect(
        patientService.createPatient('user123', 'clinic1', patientData),
      ).rejects.toThrow('Tutor obrigatorio para criar paciente.');
    });
  });

  describe('updatePatient', () => {
    it('deve atualizar um paciente', async () => {
      const updateData = {
        name: 'Rex Atualizado',
        specie: 'cao',
        weight: 25,
        ownerName: 'Joao',
      };
      const mockUpdated = { count: 1 };

      prisma.patient.updateMany.mockResolvedValue(mockUpdated);

      const result = await patientService.updatePatient(
        'user123',
        '1',
        updateData,
      );

      expect(result.count).toBe(1);
    });

    it('deve lancar erro quando especie ausente na atualizacao', async () => {
      const updateData = { name: 'Rex Atualizado' };

      await expect(
        patientService.updatePatient('user123', '1', updateData),
      ).rejects.toThrow('Especie e obrigatoria.');
    });
  });

  describe('deletePatient', () => {
    it('deve deletar um paciente', async () => {
      prisma.patient.deleteMany.mockResolvedValue({ count: 1 });

      const result = await patientService.deletePatient('user123', '1');

      expect(result.count).toBe(1);
    });
  });
});
