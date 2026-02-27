jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
  },
}));

const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middlewares/authMiddleware');

function createRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authMiddleware', () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  it('deve retornar TOKEN_MISSING quando não há Authorization', async () => {
    const req = { headers: {} };
    const res = createRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TOKEN_MISSING' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 500 quando JWT_SECRET não está definido', async () => {
    process.env.JWT_SECRET = '';
    const req = { headers: { authorization: 'Bearer token' } };
    const res = createRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar TOKEN_EXPIRED quando token expira', async () => {
    jwt.verify.mockImplementation(() => {
      const error = new Error('expired');
      error.name = 'TokenExpiredError';
      throw error;
    });
    const req = { headers: { authorization: 'Bearer expired-token' } };
    const res = createRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TOKEN_EXPIRED' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar USER_INVALID quando usuário não existe', async () => {
    jwt.verify.mockReturnValue({ userId: 'user-123' });
    prisma.user.findUnique.mockResolvedValue(null);

    const req = { headers: { authorization: 'Bearer valid-token' } };
    const res = createRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'USER_INVALID' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve autenticar e chamar next quando token e usuário são válidos', async () => {
    jwt.verify.mockReturnValue({ userId: 'user-123' });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-123',
      clinicId: 'clinic-1',
      email: 'vet@clinic.com',
      name: 'Dr Vet',
    });

    const req = { headers: { authorization: 'Bearer valid-token' } };
    const res = createRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(req.user).toEqual(
      expect.objectContaining({
        id: 'user-123',
        clinicId: 'clinic-1',
        email: 'vet@clinic.com',
        name: 'Dr Vet',
      }),
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

