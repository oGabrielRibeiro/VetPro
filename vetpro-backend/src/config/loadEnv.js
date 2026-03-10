const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

if (!global.vetproEnvLoaded) {
  const envCandidates = [
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../.env'),
  ];

  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      break;
    }
  }

  // Fallback local: monta DATABASE_URL a partir de POSTGRES_* quando ausente
  if (!process.env.DATABASE_URL) {
    const runningInDocker = fs.existsSync('/.dockerenv');
    const user = process.env.POSTGRES_USER || 'vetpro';
    const pass = process.env.POSTGRES_PASSWORD || 'vetpro123';
    const rawHost = process.env.POSTGRES_HOST || 'localhost';
    const host =
      !runningInDocker && /^postgres$/i.test(rawHost) ? 'localhost' : rawHost;
    const port = process.env.POSTGRES_PORT || '5432';
    const db = process.env.POSTGRES_DB || 'vetpro';
    process.env.DATABASE_URL = `postgresql://${encodeURIComponent(
      user,
    )}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
  }

  global.vetproEnvLoaded = true;
}
