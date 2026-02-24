const { z } = require('zod');
const {
  validate,
  createPatientSchema,
  createConsultationSchema,
} = require('../middlewares/validationMiddleware');

describe('Validation Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = { body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('validate', () => {
    const schemaWithRequired = z.object({
      name: z.string().min(1, 'Nome e obrigatorio'),
      age: z.number().int().positive(),
    });

    it('deve chamar next() com dados validos', () => {
      mockReq.body = { name: 'Test', age: 25 };

      const middleware = validate(schemaWithRequired);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.validatedData).toEqual({ name: 'Test', age: 25 });
    });

    it('deve retornar 400 com dados invalidos', () => {
      mockReq.body = { name: '' };

      const middleware = validate(schemaWithRequired);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Dados inválidos',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('deve retornar erro quando campo obrigatorio ausente', () => {
      mockReq.body = { name: '' };

      const middleware = validate(schemaWithRequired);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('deve pular validacao quando corpo vazio', () => {
      mockReq.body = {};

      const middleware = validate(createPatientSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('schemas individually', () => {
    it('createPatientSchema deve validar dados corretos', () => {
      const data = {
        name: 'Rex',
        specie: 'cao',
        ownerName: 'Joao',
      };

      const result = createPatientSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('createConsultationSchema deve validar dados corretos', () => {
      const data = {
        patientId: '123e4567-e89b-12d3-a456-426614174000',
        consultationType: 'consulta',
      };

      const result = createConsultationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
