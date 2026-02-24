const rateLimit = require('express-rate-limit');

// ============================================
// RATE LIMITING CONFIGURATION
// ============================================

// Limite geral para todas as rotas
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo de requests por IP
  message: {
    error: 'Muitas requisições. Tente novamente em 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limite stricter para rotas de autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo de 10 tentativas de login
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limite para rotas de criação (pacientes, consultas, etc)
const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // máximo de 30 criações por minuto
  message: {
    error: 'Muitas requisições de criação. Tente novamente em 1 minuto.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limite para rotas de IA/Chat (mais restritivo devido ao custo)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // máximo de 10 chamadas de IA por minuto
  message: {
    error: 'Limite de uso da IA atingido. Tente novamente em 1 minuto.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limite para upload de arquivos
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // máximo de 5 uploads por minuto
  message: {
    error: 'Muitas requisições de upload. Tente novamente em 1 minuto.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  authLimiter,
  createLimiter,
  aiLimiter,
  uploadLimiter,
};
