const rateLimit = require('express-rate-limit');

// Rate limiter geral para todas as rotas
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requisições por janela
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Não aplicar rate limit para health checks
    return req.path === '/health' || req.path === '/';
  },
});

// Rate limiter mais estricto para rotas de autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 tentativas de login por janela
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
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // máximo 30 criações por minuto
  message: {
    error: 'Too many create requests, please slow down.',
    retryAfter: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para upload de arquivos
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // máximo 10 uploads por minuto
  message: {
    error: 'Too many upload requests, please slow down.',
    retryAfter: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  authLimiter,
  createLimiter,
  uploadLimiter,
};
