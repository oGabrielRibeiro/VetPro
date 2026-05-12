const rateLimitModule = require('express-rate-limit');
const rateLimit = rateLimitModule.rateLimit || rateLimitModule;
const { ipKeyGenerator } = rateLimitModule;
const { getRateLimitScale } = require('../config/environmentProfile');

// Redis Store para armazenamento distribuído (não-memory)
function createRedisStore(prefix) {
  return undefined; // Requer ioredis/redis conectado
}

// Rate limiter geral para todas as rotas
const scale = getRateLimitScale();
const generalLimiter = rateLimit({
  windowMs: Number(process.env.GENERAL_RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000,
  max: Math.max(1, Math.round(Number(process.env.GENERAL_RATE_LIMIT_MAX || 100) * scale)),
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.path === '/health' ||
    req.path === '/health/live' ||
    req.path === '/health/ready' ||
    req.path === '/' ||
    req.headers['x-skip-rate-limit'] === 'true',
});

// Rate limiter mais estricto para rotas de autenticação
const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000,
  max: Math.max(1, Math.round(Number(process.env.AUTH_RATE_LIMIT_MAX || 5) * scale)),
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skip: (req) => req.headers['x-skip-rate-limit'] === 'true',
});

// Rate limiter para rotas de criação (pacientes, consultas)
const createLimiter = rateLimit({
  windowMs: Number(process.env.CREATE_RATE_LIMIT_WINDOW_MINUTES || 1) * 60 * 1000,
  max: Math.max(1, Math.round(Number(process.env.CREATE_RATE_LIMIT_MAX || 30) * scale)),
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
  max: Math.max(1, Math.round(Number(process.env.UPLOAD_RATE_LIMIT_MAX || 8) * scale)),
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
  max: Math.max(1, Math.round(Number(process.env.USER_ACTION_LIMIT_MAX || 50) * scale)),
  message: {
    error: 'Too many actions, please slow down.',
    retryAfter: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Limitar por usuário autenticado (ID) ou por IP se não autenticado
    if (req.user?.id) return `user:${req.user.id}`;
    return `ip:${ipKeyGenerator(req.ip)}`;
  },
  skip: (req) => req.headers['x-skip-rate-limit'] === 'true',
});

module.exports = {
  generalLimiter,
  authLimiter,
  createLimiter,
  uploadLimiter,
  userActionLimiter,
};
