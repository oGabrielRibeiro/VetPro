jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'uuid-123'),
}));

jest.mock('../lib/prisma', () => ({
  patient: {
    findFirst: jest.fn(),
  },
  appointment: {
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

const prisma = require('../lib/prisma');
const appointmentService = require('../services/appointmentService');

describe('appointmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listAppointments', () => {
    it('deve aplicar filtros e ordenação corretamente', async () => {
      prisma.appointment.findMany.mockResolvedValue([{ id: 'apt-1' }]);

      const result = await appointmentService.listAppointments(
        'user-1',
        'clinic-1',
        {
          dateFrom: '2026-02-01',
          dateTo: '2026-02-28',
          patientId: 'patient-1',
          status: 'agendado',
        },
      );

      expect(result).toEqual([{ id: 'apt-1' }]);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            clinicId: 'clinic-1',
            patientId: 'patient-1',
            status: 'agendado',
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
          orderBy: [{ date: 'asc' }, { time: 'asc' }, { createdAt: 'desc' }],
        }),
      );
    });
  });

  describe('createAppointment', () => {
    it('deve rejeitar quando faltam campos obrigatórios', async () => {
      await expect(
        appointmentService.createAppointment('user-1', 'clinic-1', {
          patientId: '',
          date: '',
          time: '',
          reason: '',
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('deve rejeitar quando paciente não pertence ao usuário/clínica', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);

      await expect(
        appointmentService.createAppointment('user-1', 'clinic-1', {
          patientId: 'patient-1',
          date: '2026-02-27',
          time: '10:30',
          reason: 'Retorno',
        }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('deve criar agendamento com defaults normalizados', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.appointment.create.mockResolvedValue({ id: 'uuid-123' });

      const result = await appointmentService.createAppointment(
        'user-1',
        'clinic-1',
        {
          patientId: 'patient-1',
          date: '2026-02-27',
          time: '10:30',
          reason: 'Retorno em 7 dias',
        },
      );

      expect(result).toEqual({ id: 'uuid-123' });
      expect(prisma.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'uuid-123',
          userId: 'user-1',
          clinicId: 'clinic-1',
          patientId: 'patient-1',
          time: '10:30',
          reason: 'Retorno em 7 dias',
          type: 'consulta',
          status: 'agendado',
          linkedConsultationId: null,
          date: expect.any(Date),
        }),
      });
    });
  });

  describe('updateAppointment', () => {
    it('deve retornar 404 quando agendamento não existe', async () => {
      prisma.appointment.findFirst.mockResolvedValue(null);

      await expect(
        appointmentService.updateAppointment('user-1', 'clinic-1', 'apt-1', {
          reason: 'Novo motivo',
        }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('deve atualizar agendamento válido', async () => {
      prisma.appointment.findFirst.mockResolvedValue({
        id: 'apt-1',
        userId: 'user-1',
        clinicId: 'clinic-1',
        patientId: 'patient-1',
        date: new Date('2026-02-27T00:00:00.000Z'),
        time: '09:00',
        reason: 'Consulta',
        type: 'consulta',
        status: 'agendado',
      });
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.appointment.update.mockResolvedValue({ id: 'apt-1' });

      const result = await appointmentService.updateAppointment(
        'user-1',
        'clinic-1',
        'apt-1',
        {
          time: '11:00',
          reason: 'Revisão',
        },
      );

      expect(result).toEqual({ id: 'apt-1' });
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'apt-1' },
        data: expect.objectContaining({
          patientId: 'patient-1',
          time: '11:00',
          reason: 'Revisão',
          type: 'consulta',
          status: 'agendado',
          linkedConsultationId: null,
          date: expect.any(Date),
        }),
      });
    });
  });

  describe('deleteAppointment', () => {
    it('deve retornar 404 quando agendamento não existe', async () => {
      prisma.appointment.findFirst.mockResolvedValue(null);

      await expect(
        appointmentService.deleteAppointment('user-1', 'clinic-1', 'apt-1'),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('deve deletar quando agendamento existe', async () => {
      prisma.appointment.findFirst.mockResolvedValue({ id: 'apt-1' });
      prisma.appointment.delete.mockResolvedValue({ id: 'apt-1' });

      await appointmentService.deleteAppointment('user-1', 'clinic-1', 'apt-1');

      expect(prisma.appointment.delete).toHaveBeenCalledWith({
        where: { id: 'apt-1' },
      });
    });
  });
});
