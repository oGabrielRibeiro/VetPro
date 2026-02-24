const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'vetpro-secret-key';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'vetpro-refresh-secret-key';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutos
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 dias

/**
 * Gera um access token JWT
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      clinicId: user.clinicId,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );
}

/**
 * Gera um refresh token JWT
 */
function generateRefreshToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      type: 'refresh',
    },
    JWT_REFRESH_SECRET,
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
  const secret = isRefreshToken ? JWT_REFRESH_SECRET : JWT_SECRET;
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
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
};
