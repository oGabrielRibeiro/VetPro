/* eslint-disable no-unused-vars */
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const safeBody =
    req.body && typeof req.body === 'object'
      ? Object.fromEntries(
          Object.entries(req.body).map(([key, value]) => {
            const lowerKey = String(key || '').toLowerCase();
            if (
              lowerKey.includes('password') ||
              lowerKey.includes('token') ||
              lowerKey.includes('secret') ||
              lowerKey.includes('key')
            ) {
              return [key, '[REDACTED]'];
            }
            return [key, value];
          }),
        )
      : undefined;

  logger.error(err.message, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: safeBody,
  });

  if (err?.name === 'MulterError') {
    return res.status(400).json({ error: 'Falha no upload do arquivo.' });
  }

  const statusCode = Number(err?.statusCode || err?.status || 500);
  const message = err?.message || 'Erro interno do servidor';

  if (statusCode >= 500) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }

  return res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;
