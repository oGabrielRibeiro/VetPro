const rateLimit = require('express-rate-limit');

// Redis Store para armazenamento distribuído (não-memory)
function createRedisStore(prefix) {
  return undefined; // Requer ioredis/redis conectado
}

// Rate limiter geral para todas as rotas
const generalLimiter = rateLimit({
  windowMs: Number(process.env.GENERAL_RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000,
  max: Number(process.env.GENERAL_RATE_LIMIT_MAX || 100),
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/',
});

// Rate limiter mais estricto para rotas de autenticação
const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 5),
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Rate limiter para rotas de criação (pacientes, consultas)
const createLimiter = rateLimit({
  windowMs: Number(process.env.CREATE_RATE_LIMIT_WINDOW_MINUTES || 1) * 60 * 1000,
  max: Number(process.env.CREATE_RATE_LIMIT_MAX || 30),
  message: {
    error: 'Too many create requests, please slow down.',
    retryAfter: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para upload de arquivos
const uploadLimiter = rateLimit({
  windowMs: Number(process.env.UPLOAD_RATE_LIMIT_WINDOW_MINUTES || 1) * 60 * 1000,
  max: Number(process.env.UPLOAD_RATE_LIMIT_MAX || 8),
  message: {
    error: 'Too many upload requests, please slow down.',
    retryAfter: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter por usuário autenticado (mais efetivo que por IP)
const userActionLimiter = rateLimit({
  windowMs: Number(process.env.USER_ACTION_LIMIT_WINDOW_MINUTES || 1) * 60 * 1000,
  max: Number(process.env.USER_ACTION_LIMIT_MAX || 50),
  message: {
    error: 'Too many actions, please slow down.',
    retryAfter: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Limitar por usuário autenticado (ID) ou por IP se não autenticado
    return req.user?.id || req.ip;
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  createLimiter,
  uploadLimiter,
  userActionLimiter,
};
