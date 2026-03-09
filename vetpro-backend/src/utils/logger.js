/**
 * Logger Estruturado - VetPro
 * Implementa logging estruturado com Winston e rotação de arquivos
 */

const winston = require('winston');
const path = require('path');

// Importar DailyRotateFile separadamente
const DailyRotateFile = require('winston-daily-rotate-file');

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_REGEX =
  /(authorization|cookie|password|token|refresh|secret|api[_-]?key|access[_-]?key|private[_-]?key)/i;

function maskSensitiveInString(value = '') {
  return String(value || '')
    .replace(
      /(authorization\s*[:=]\s*)(bearer\s+)?[a-z0-9\-._~+/]+=*/gi,
      `$1${REDACTED}`,
    )
    .replace(
      /([?&](?:token|refresh|access_token|id_token)=)[^&\s]+/gi,
      `$1${REDACTED}`,
    );
}

function sanitizeValue(value, keyHint = '') {
  if (value == null) return value;

  if (SENSITIVE_KEY_REGEX.test(String(keyHint || ''))) {
    return REDACTED;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (typeof value === 'string') {
    return maskSensitiveInString(value);
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: maskSensitiveInString(value.message),
      stack: maskSensitiveInString(value.stack || ''),
    };
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sanitizeValue(item, key),
      ]),
    );
  }

  return value;
}

const sanitizeLogFormat = winston.format((info) => sanitizeValue(info));

// Configuração de rotação de arquivos
const logDir = process.env.LOG_DIR || 'logs';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    sanitizeLogFormat(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'vetpro-backend' },
  transports: [
    // Arquivo de erros
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    }),
    // Arquivo de logs geral
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
    }),
  ],
});

// Em desenvolvimento, também exibe no console
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        sanitizeLogFormat(),
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  );
}

module.exports = logger;
