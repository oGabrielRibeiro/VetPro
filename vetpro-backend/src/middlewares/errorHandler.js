/* eslint-disable no-unused-vars */
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(err.message, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body ? JSON.stringify(req.body) : undefined,
  });

  const statusCode = Number(err?.statusCode || err?.status || 500);
  const message = err?.message || 'Erro interno do servidor';

  if (statusCode >= 500) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }

  return res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;
