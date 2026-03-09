const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { getJwtSecret, getJwtRefreshSecret } = require('../config/jwtConfig');

const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '15m'; // 15 minutos
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // 7 dias

function assertSecrets() {
  const jwtSecret = getJwtSecret();
  const jwtRefreshSecret = getJwtRefreshSecret();
  if (!jwtSecret || !jwtRefreshSecret) {
    throw new Error('JWT_SECRET e JWT_REFRESH_SECRET devem estar definidos.');
  }
  return { jwtSecret, jwtRefreshSecret };
}

/**
 * Gera um access token JWT
 */
function generateAccessToken(user) {
  const { jwtSecret } = assertSecrets();
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      clinicId: user.clinicId,
    },
    jwtSecret,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );
}

/**
 * Gera um refresh token JWT
 */
function generateRefreshToken(user) {
  const { jwtRefreshSecret } = assertSecrets();
  return jwt.sign(
    {
      userId: user.id,
      type: 'refresh',
    },
    jwtRefreshSecret,
    { expiresIn: REFRESH_TOKEN_EXPIRY },
  );
}

/**
 * Gera o par completo de tokens
 */
function generateTokenPair(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  return { accessToken, refreshToken };
}

/**
 * Verifica se um token é válido (access ou refresh)
 */
function verifyToken(token, isRefreshToken = false) {
  const { jwtSecret, jwtRefreshSecret } = assertSecrets();
  const secret = isRefreshToken ? jwtRefreshSecret : jwtSecret;
  return jwt.verify(token, secret);
}

/**
 * Valida refresh token e retorna novo access token
 */
async function refreshAccessToken(refreshToken) {
  try {
    const decoded = verifyToken(refreshToken, true);

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Gera novo access token (mantém o refresh token)
    const accessToken = generateAccessToken(user);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        clinicId: user.clinicId,
      },
    };
  } catch (error) {
    if (error?.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    }
    throw new Error('Invalid refresh token');
  }
}

/**
 * Middleware para verificar access token (já existente, mantido para compatibilidade)
 */
function verifyAccessToken(token) {
  return verifyToken(token, false);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  refreshAccessToken,
  verifyAccessToken,
  JWT_SECRET: getJwtSecret(),
  JWT_REFRESH_SECRET: getJwtRefreshSecret(),
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
};
