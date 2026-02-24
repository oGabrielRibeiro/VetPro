const { ZodError } = require('zod');
const {
  validateBody,
  validateQuery,
  validateParams,
} = require('../middlewares/validationMiddleware');

describe('Validation Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = { body: {}, query: {}, params: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('validateBody', () => {
    it('deve chamar next() com dados válidos', () => {
      const schema = {
        parse: jest.fn().mockReturnValue({ name: 'Test', age: 25 }),
      };

      validateBody(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body).toEqual({ name: 'Test', age: 25 });
    });

    it('deve retornar 400 com dados inválidos', () => {
      const schema = {
        parse: jest.fn().mockImplementation(() => {
          throw new ZodError([{ path: ['name'], message: 'Required' }]);
        }),
      };

      validateBody(schema)(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erro de validação',
        details: [{ path: ['name'], message: 'Required' }],
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateQuery', () => {
    it('deve validar query params', () => {
      mockReq.query = { page: '1', limit: '10' };
      const schema = {
        parse: jest.fn().mockReturnValue({ page: 1, limit: 10 }),
      };

      validateQuery(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateParams', () => {
    it('deve validar params', () => {
      mockReq.params = { id: '123' };
      const schema = {
        parse: jest.fn().mockReturnValue({ id: '123' }),
      };

      validateParams(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
