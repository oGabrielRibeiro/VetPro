/* eslint-disable no-unused-vars */
const { Prisma } = require('@prisma/client');
const logger = require('../utils/logger');
const AppError = require('../errors/AppError');

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return undefined;
  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => {
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
  );
}

function mapPrismaError(error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new AppError('Registro duplicado.', 409, 'DB_UNIQUE_CONFLICT');
    }
    if (error.code === 'P2025') {
      return new AppError('Registro nao encontrado.', 404, 'DB_NOT_FOUND');
    }
    return new AppError('Erro de banco de dados.', 400, 'DB_KNOWN_ERROR');
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError(
      'Dados invalidos para persistencia.',
      400,
      'DB_VALIDATION',
    );
  }

  return error;
}

function notFoundHandler(req, res, next) {
  next(
    new AppError(
      `Rota nao encontrada: ${req.method} ${req.originalUrl}`,
      404,
      'ROUTE_NOT_FOUND',
    ),
  );
}

function errorHandler(err, req, res, next) {
  const mapped = mapPrismaError(err);
  const appError =
    mapped instanceof AppError
      ? mapped
      : new AppError(
          mapped?.message || 'Erro interno do servidor.',
          Number(mapped?.statusCode || mapped?.status || 500),
          mapped?.code || 'INTERNAL_ERROR',
        );

  logger.error(appError.message, {
    code: appError.code,
    statusCode: appError.statusCode,
    stack: appError.stack,
    path: req.path,
    method: req.method,
    body: sanitizeBody(req.body),
  });

  if (err?.name === 'MulterError') {
    return res.status(400).json({
      error: 'Falha no upload do arquivo.',
      code: 'UPLOAD_ERROR',
    });
  }

  const isProd = process.env.NODE_ENV === 'production';
  const statusCode =
    appError.statusCode >= 400 && appError.statusCode <= 599
      ? appError.statusCode
      : 500;

  const payload = {
    error:
      statusCode >= 500 && isProd
        ? 'Erro interno do servidor.'
        : appError.message || 'Erro interno do servidor.',
    code: appError.code || 'INTERNAL_ERROR',
  };

  if (!isProd && appError.details) {
    payload.details = appError.details;
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
