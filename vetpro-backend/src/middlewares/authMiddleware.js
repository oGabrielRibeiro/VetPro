const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { getJwtSecret } = require('../config/jwtConfig');
const { getFingerprintHashFromRequest } = require('../utils/tokenFingerprint');

async function authMiddleware(req, res, next) {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string') {
    [, token] = authHeader.split(' ');
  }

  if (!token) {
    return res.status(401).json({
      error: 'Sua sessao nao foi identificada. Faca login novamente.',
      code: 'TOKEN_MISSING',
    });
  }

  try {
    const jwtSecret = getJwtSecret();
    if (!jwtSecret) {
      return res.status(500).json({
        error: 'Erro de configuracao do servidor. Tente novamente mais tarde.',
      });
    }

    const decoded = jwt.verify(token, jwtSecret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Nao foi possivel validar sua sessao. Faca login novamente.',
        code: 'USER_INVALID',
      });
    }

    if (Number(decoded?.tokenVersion || 0) !== Number(user.tokenVersion || 0)) {
      return res.status(401).json({
        error: 'Sessao invalidada. Faca login novamente.',
        code: 'TOKEN_REVOKED',
      });
    }

    if (decoded?.fingerprintHash) {
      const requestFingerprint = getFingerprintHashFromRequest(req);
      if (requestFingerprint !== decoded.fingerprintHash) {
        return res.status(401).json({
          error: 'Sessao invalida para este dispositivo.',
          code: 'TOKEN_FINGERPRINT_INVALID',
        });
      }
    }

    req.user = {
      id: user.id,
      clinicId: user.clinicId,
      email: user.email,
      name: user.name,
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
    };

    return next();
  } catch (error) {
    if (error?.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Sua sessao expirou. Faca login novamente.',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({
      error: 'Sua sessao nao e valida. Faca login novamente.',
      code: 'TOKEN_INVALID',
    });
  }
}

module.exports = authMiddleware;
