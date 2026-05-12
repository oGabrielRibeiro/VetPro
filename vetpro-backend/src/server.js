const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const app = require('./app');
const prisma = require('./lib/prisma');
const websocketService = require('./services/websocketService');
const { ensureMasterUser } = require('./services/masterBootstrapService');
const logger = require('./utils/logger');

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';
const HTTPS_ENABLED =
  String(process.env.HTTPS || 'false').toLowerCase() === 'true';

function loadHttpsOptions() {
  const keyPath = process.env.HTTPS_KEY_PATH;
  const certPath = process.env.HTTPS_CERT_PATH;

  if (!keyPath || !certPath) {
    return null;
  }

  const resolvedKeyPath = path.resolve(keyPath);
  const resolvedCertPath = path.resolve(certPath);

  if (!fs.existsSync(resolvedKeyPath) || !fs.existsSync(resolvedCertPath)) {
    return null;
  }

  return {
    key: fs.readFileSync(resolvedKeyPath),
    cert: fs.readFileSync(resolvedCertPath),
  };
}

const httpsOptions = HTTPS_ENABLED ? loadHttpsOptions() : null;
let server;

async function connectPrismaWithRetry() {
  const retries = Number(process.env.DB_CONNECT_RETRIES || 8);
  const delayMs = Number(process.env.DB_CONNECT_RETRY_DELAY_MS || 3000);

  async function attemptConnect(attempt) {
    try {
      await prisma.$connect();
      logger.info('Conexao com banco estabelecida com sucesso.');
    } catch (error) {
      logger.error('Falha ao conectar no banco de dados', {
        attempt,
        retries,
        error: error?.message || String(error),
      });
      if (attempt >= retries) {
        throw error;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
      await attemptConnect(attempt + 1);
    }
  }

  await attemptConnect(1);
}

async function shutdown(signal) {
  logger.info(`${signal} recebido. Encerrando servidor...`);
  if (server) {
    await new Promise((resolve) => {
      server.close(() => resolve());
    });
  }
  await prisma.$disconnect();
  process.exit(0);
}

connectPrismaWithRetry()
  .then(async () => {
    await ensureMasterUser();
    if (HTTPS_ENABLED && httpsOptions) {
      server = https.createServer(httpsOptions, app);
      server.keepAliveTimeout = 65000;
      server.headersTimeout = 66000;
      server.listen(PORT, HOST, () => {
        logger.info(`Servidor HTTPS rodando em https://${HOST}:${PORT}`);
        websocketService.initialize(server);
      });
      return;
    }

    if (HTTPS_ENABLED && !httpsOptions) {
      logger.warn(
        'HTTPS ativado no .env, mas certificados nao encontrados. Subindo em HTTP.',
      );
    }

    server = http.createServer(app);
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
    server.listen(PORT, HOST, () => {
      logger.info(`Servidor HTTP rodando em http://${HOST}:${PORT}`);
      websocketService.initialize(server);
    });
  })
  .catch((error) => {
    logger.error('Falha ao iniciar servidor por indisponibilidade do banco.', {
      error: error?.message || String(error),
    });
    process.exit(1);
  });

process.on('SIGINT', () => {
  shutdown('SIGINT').catch((error) => {
    logger.error('Erro ao encerrar o servidor:', { error: error.message });
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch((error) => {
    logger.error('Erro ao encerrar o servidor:', { error: error.message });
    process.exit(1);
  });
});
