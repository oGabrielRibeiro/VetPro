const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

async function authMiddleware(req, res, next) {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader) {
    [, token] = authHeader.split(' ');
  }

  if (!token) {
    return res.status(401).json({
      error: 'Sua sessao nao foi identificada. Faca login novamente.',
      code: 'TOKEN_MISSING',
    });
  }

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        error: 'Erro de configuracao do servidor. Tente novamente mais tarde.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Nao foi possivel validar sua sessao. Faca login novamente.',
        code: 'USER_INVALID',
      });
    }

    req.user = {
      id: user.id,
      clinicId: user.clinicId,
      email: user.email,
      name: user.name,
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
