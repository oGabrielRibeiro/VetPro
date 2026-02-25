/**
 * Logger Estruturado - VetPro
 * Implementa logging estruturado com Pino para melhor performance e flexibilidade
 */

const pino = require('pino');

const LOG_LEVELS = {
  error: 'error',
  warn: 'warn',
  info: 'info',
  debug: 'debug',
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.info;

const logger = pino({
  level: currentLevel,
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: { service: 'vetpro-backend' },
  // Reduzir overhead em produção
  browser: undefined,
  // Configurações de serialização
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      parameters: req.params,
      query: req.query,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

module.exports = logger;
