const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { getJwtSecret, getJwtRefreshSecret } = require('../config/jwtConfig');
const { getFingerprintHashFromRequest } = require('../utils/tokenFingerprint');
const AppError = require('../errors/AppError');

const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function assertSecrets() {
  const jwtSecret = getJwtSecret();
  const jwtRefreshSecret = getJwtRefreshSecret();
  if (!jwtSecret || !jwtRefreshSecret) {
    throw new Error('JWT_SECRET e JWT_REFRESH_SECRET devem estar definidos.');
  }
  return { jwtSecret, jwtRefreshSecret };
}

function hashToken(token = '') {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function buildAccessTokenPayload(user, extras = {}) {
  return {
    userId: user.id,
    email: user.email,
    clinicId: user.clinicId,
    tokenVersion: Number(user.tokenVersion || 0),
    twoFactorVerified: Boolean(extras.twoFactorVerified),
    fingerprintHash: extras.fingerprintHash || null,
  };
}

function generateAccessToken(user, extras = {}) {
  const { jwtSecret } = assertSecrets();
  return jwt.sign(buildAccessTokenPayload(user, extras), jwtSecret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

function generateRefreshToken(user, tokenJti) {
  const { jwtRefreshSecret } = assertSecrets();
  return jwt.sign(
    {
      userId: user.id,
      type: 'refresh',
      jti: tokenJti,
    },
    jwtRefreshSecret,
    { expiresIn: REFRESH_TOKEN_EXPIRY },
  );
}

function verifyToken(token, isRefreshToken = false) {
  const { jwtSecret, jwtRefreshSecret } = assertSecrets();
  const secret = isRefreshToken ? jwtRefreshSecret : jwtSecret;
  return jwt.verify(token, secret);
}

async function persistRefreshSession({
  user,
  refreshToken,
  tokenJti,
  fingerprintHash,
  req,
  replacedById = null,
  revokeId = null,
}) {
  const decoded = verifyToken(refreshToken, true);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Number(decoded.exp || 0) * 1000);

  return prisma.$transaction(async (tx) => {
    if (revokeId) {
      await tx.refreshSession.update({
        where: { id: revokeId },
        data: {
          revokedAt: new Date(),
          replacedById: replacedById || null,
        },
      });
    }

    return tx.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash,
        tokenJti,
        fingerprintHash: fingerprintHash || null,
        userAgent: String(req?.headers?.['user-agent'] || '').slice(0, 500),
        ipAddress: String(req?.ip || '').slice(0, 120),
        expiresAt,
      },
    });
  });
}

async function issueTokensForUser(user, req, extras = {}) {
  const fingerprintHash = getFingerprintHashFromRequest(req);
  const tokenJti = crypto.randomUUID();
  const refreshToken = generateRefreshToken(user, tokenJti);
  await persistRefreshSession({
    user,
    refreshToken,
    tokenJti,
    fingerprintHash,
    req,
  });

  const accessToken = generateAccessToken(user, {
    ...extras,
    fingerprintHash,
  });

  return { accessToken, refreshToken };
}

async function refreshAccessToken(refreshToken, req) {
  let decoded;
  try {
    decoded = verifyToken(refreshToken, true);
  } catch (error) {
    if (error?.name === 'TokenExpiredError') {
      throw new AppError(
        'Refresh token expirado.',
        401,
        'REFRESH_TOKEN_EXPIRED',
      );
    }
    throw new AppError('Refresh token invalido.', 401, 'REFRESH_TOKEN_INVALID');
  }

  if (decoded.type !== 'refresh' || !decoded.jti) {
    throw new AppError('Refresh token invalido.', 401, 'REFRESH_TOKEN_INVALID');
  }

  const tokenHash = hashToken(refreshToken);
  const session = await prisma.refreshSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    throw new AppError(
      'Sessao de refresh invalida.',
      401,
      'REFRESH_SESSION_INVALID',
    );
  }

  const requestFingerprintHash = getFingerprintHashFromRequest(req);
  if (
    session.fingerprintHash &&
    session.fingerprintHash !== requestFingerprintHash
  ) {
    await prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    throw new AppError(
      'Fingerprint invalida.',
      401,
      'REFRESH_FINGERPRINT_MISMATCH',
    );
  }

  const { user } = session;
  if (!user) {
    throw new AppError('Usuario nao encontrado.', 401, 'USER_NOT_FOUND');
  }

  const newJti = crypto.randomUUID();
  const newRefreshToken = generateRefreshToken(user, newJti);
  const replaced = await prisma.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(newRefreshToken),
      tokenJti: newJti,
      fingerprintHash: requestFingerprintHash,
      userAgent: String(req?.headers?.['user-agent'] || '').slice(0, 500),
      ipAddress: String(req?.ip || '').slice(0, 120),
      expiresAt: new Date(
        Number(verifyToken(newRefreshToken, true).exp || 0) * 1000,
      ),
    },
  });

  await prisma.refreshSession.update({
    where: { id: session.id },
    data: {
      revokedAt: new Date(),
      replacedById: replaced.id,
    },
  });

  const accessToken = generateAccessToken(user, {
    twoFactorVerified: true,
    fingerprintHash: requestFingerprintHash,
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      clinicId: user.clinicId,
    },
  };
}

async function revokeUserSessions(userId, refreshToken = null) {
  const where = refreshToken
    ? { tokenHash: hashToken(refreshToken), userId }
    : { userId };
  await prisma.refreshSession.updateMany({
    where: {
      ...where,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

async function bumpTokenVersion(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}

module.exports = {
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  generateAccessToken,
  generateRefreshToken,
  issueTokensForUser,
  refreshAccessToken,
  revokeUserSessions,
  bumpTokenVersion,
  verifyToken,
  verifyAccessToken: (token) => verifyToken(token, false),
  JWT_SECRET: getJwtSecret(),
  JWT_REFRESH_SECRET: getJwtRefreshSecret(),
};
