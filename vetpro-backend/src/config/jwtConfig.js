const DEV_FALLBACK_JWT_SECRET = 'vetpro-dev-insecure-jwt-secret';
const DEV_FALLBACK_REFRESH_SECRET = 'vetpro-dev-insecure-refresh-secret';

let warned = false;

function canUseFallback() {
  const env = String(process.env.NODE_ENV || '').toLowerCase();
  return env !== 'production' && env !== 'test';
}

function warnFallback() {
  if (warned) return;
  warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[jwt] JWT_SECRET ausente. Usando fallback APENAS para ambiente local.',
  );
}

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (!canUseFallback()) return null;
  warnFallback();
  return DEV_FALLBACK_JWT_SECRET;
}

function getJwtRefreshSecret() {
  if (process.env.JWT_REFRESH_SECRET) return process.env.JWT_REFRESH_SECRET;
  const accessSecret = getJwtSecret();
  if (!accessSecret) return null;
  if (!process.env.JWT_REFRESH_SECRET && !process.env.JWT_SECRET) {
    return DEV_FALLBACK_REFRESH_SECRET;
  }
  return accessSecret;
}

module.exports = {
  getJwtSecret,
  getJwtRefreshSecret,
};
