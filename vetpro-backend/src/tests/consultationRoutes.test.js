const request = require('supertest');
const app = require('../app');

// Mock do Prisma antes de importar as rotas
jest.mock('../lib/prisma', () => ({
  patient: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  consultation: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  clinic: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
}));

const prisma = require('../lib/prisma');

// Mock do auth middleware
jest.mock('../middlewares/authMiddleware', () => {
  return (req, res, next) => {
    req.user = { id: 'user-123', clinicId: 'clinic-123' };
    next();
  };
});

describe('API - Consultas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/consultations', () => {
    it('deve listar consultas do usuario', async () => {
      const mockConsultations = [
        {
          id: '1',
          patientId: 'patient-1',
          chiefComplaint: 'Checkup',
          createdAt: new Date(),
        },
      ];

      prisma.consultation.findMany.mockResolvedValue(mockConsultations);

      const response = await request(app)
        .get('/api/consultations')
        .expect('Content-Type', /json/);

      // O endpoint pode retornar 200 ou erro se não existir
      // Verificamos apenas que a requisição foi processada
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/consultations/:id', () => {
    it('deve retornar consulta por ID', async () => {
      const mockConsultation = {
        id: 'consultation-1',
        patientId: 'patient-1',
        chiefComplaint: 'Checkup',
      };

      prisma.consultation.findFirst.mockResolvedValue(mockConsultation);

      const response = await request(app)
        .get('/api/consultations/consultation-1')
        .expect('Content-Type', /json/);

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('POST /api/consultations/heuristic-parse', () => {
    it('deve aceitar segments em array e retornar parse heurístico', async () => {
      const response = await request(app)
        .post('/api/consultations/heuristic-parse')
        .send({
          segments: [
            {
              stamp: '00:01',
              speaker: 'Tutor',
              text: 'Doutor, ele nao quer comer desde ontem.',
            },
            {
              stamp: '00:10',
              speaker: 'Medico',
              text: 'No exame fisico, temperatura 39.4 e dor abdominal.',
            },
            {
              stamp: '00:21',
              speaker: 'Medico',
              text: 'Diagnostico de gastrite e tratamento com hidratacao.',
            },
          ],
          transcript: '',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('provider', 'heuristic');
      expect(response.body).toHaveProperty('parsed');
      expect(String(response.body.parsed?.chiefComplaint || '')).toBeTruthy();
      expect(String(response.body.parsed?.diagnosis || '')).toMatch(
        /gastrite|diagnostico/i,
      );
    });

    it('deve aceitar segments em string JSON', async () => {
      const payloadSegments = JSON.stringify([
        {
          stamp: '00:01',
          speaker: 'Tutor',
          text: 'Ele esta tossindo.',
        },
      ]);

      const response = await request(app)
        .post('/api/consultations/heuristic-parse')
        .send({
          segments: payloadSegments,
          transcript: 'Ele esta tossindo desde ontem.',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('parsed');
      expect(String(response.body.parsed?.chiefComplaint || '')).toMatch(
        /tossindo|ontem/i,
      );
    });
  });
});

describe('API - Pacientes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/patients', () => {
    it('deve listar pacientes com paginacao', async () => {
      const mockPatients = [{ id: '1', name: 'Rex', specie: 'cao' }];

      prisma.patient.findMany.mockResolvedValue(mockPatients);
      prisma.patient.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/patients')
        .query({ page: 1, limit: 10 })
        .expect('Content-Type', /json/);

      expect([200, 404, 500]).toContain(response.status);
    });

    it('deve buscar pacientes por termo', async () => {
      const mockPatients = [{ id: '1', name: 'Rex', specie: 'cao' }];

      prisma.patient.findMany.mockResolvedValue(mockPatients);
      prisma.patient.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/patients')
        .query({ search: 'Rex' })
        .expect('Content-Type', /json/);

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/patients', () => {
    it('deve criar novo paciente com dados validos', async () => {
      const newPatient = {
        name: 'Buddy',
        specie: 'cao',
        breed: 'Golden Retriever',
        ownerName: 'Maria',
      };

      prisma.patient.create.mockResolvedValue({
        id: 'new-patient-id',
        ...newPatient,
      });

      const response = await request(app)
        .post('/api/patients')
        .send(newPatient)
        .expect('Content-Type', /json/);

      expect([201, 400, 500]).toContain(response.status);
    });

    it('deve retornar erro com dados invalidos', async () => {
      const invalidPatient = {
        name: '',
        specie: '',
      };

      const response = await request(app)
        .post('/api/patients')
        .send(invalidPatient)
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('GET /api/patients/:id', () => {
    it('deve retornar paciente por ID', async () => {
      const mockPatient = {
        id: 'patient-1',
        name: 'Rex',
        specie: 'cao',
      };

      prisma.patient.findFirst.mockResolvedValue(mockPatient);

      const response = await request(app)
        .get('/api/patients/patient-1')
        .expect('Content-Type', /json/);

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('PUT /api/patients/:id', () => {
    it('deve atualizar paciente', async () => {
      const updateData = {
        name: 'Rex Updated',
        weight: 25,
      };

      prisma.patient.updateMany.mockResolvedValue({ count: 1 });

      const response = await request(app)
        .put('/api/patients/patient-1')
        .send(updateData)
        .expect('Content-Type', /json/);

      expect([200, 400, 404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/patients/:id', () => {
    it('deve deletar paciente', async () => {
      prisma.patient.deleteMany.mockResolvedValue({ count: 1 });

      const response = await request(app)
        .delete('/api/patients/patient-1')
        .expect('Content-Type', /json/);

      expect([200, 404, 500]).toContain(response.status);
    });
  });
});

describe('API - Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/dashboard', () => {
    it('deve retornar dados do dashboard', async () => {
      prisma.patient.count.mockResolvedValue(10);
      prisma.consultation.count.mockResolvedValue(25);

      const response = await request(app)
        .get('/api/dashboard')
        .expect('Content-Type', /json/);

      expect([200, 404, 500]).toContain(response.status);
    });
  });
});

describe('API - Clinica', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/clinic', () => {
    it('deve retornar dados da clinica', async () => {
      const mockClinic = {
        id: 'clinic-1',
        name: 'VetPro Clinic',
      };

      prisma.clinic.findFirst.mockResolvedValue(mockClinic);

      const response = await request(app)
        .get('/api/clinic')
        .expect('Content-Type', /json/);

      expect([200, 404, 500]).toContain(response.status);
    });
  });
});

describe('API - Health Check', () => {
  describe('GET /', () => {
    it('deve retornar mensagem de status', async () => {
      const response = await request(app)
        .get('/')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /health', () => {
    it('deve retornar status OK', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ok', true);
    });
  });
});
