const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('./config/loadEnv');
const authMiddleware = require('./middlewares/authMiddleware');
const securityMiddleware = require('./middlewares/securityMiddleware');
const requestContextMiddleware = require('./middlewares/requestContextMiddleware');
const requestMetricsMiddleware = require('./middlewares/requestMetricsMiddleware');
const metricsService = require('./services/metricsService');
const patientRoutes = require('./routes/patientRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const clinicRoutes = require('./routes/clinicRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const {
  generalLimiter,
  userActionLimiter,
} = require('./middlewares/rateLimitMiddleware');
const cacheService = require('./services/cacheService');
const AppError = require('./errors/AppError');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

function withLoopbackAlias(origin) {
  try {
    const parsed = new URL(origin);
    if (parsed.hostname === 'localhost') {
      parsed.hostname = '127.0.0.1';
      return parsed.toString().replace(/\/$/, '');
    }
    if (parsed.hostname === '127.0.0.1') {
      parsed.hostname = 'localhost';
      return parsed.toString().replace(/\/$/, '');
    }
    return null;
  } catch (_) {
    return null;
  }
}

function buildAllowedOrigins() {
  const configured = String(process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const seed = configured.length > 0 ? configured : ['http://localhost:3000'];
  const allowed = new Set();

  for (const origin of seed) {
    const normalized = origin.replace(/\/$/, '');
    allowed.add(normalized);
    const alias = withLoopbackAlias(normalized);
    if (alias) {
      allowed.add(alias);
    }
  }

  // fallback explicito para ambiente local
  allowed.add('http://localhost:3000');
  allowed.add('http://127.0.0.1:3000');

  return allowed;
}

const allowedOrigins = buildAllowedOrigins();

app.use(cors({
  origin: function (origin, callback) {
    // Aceita requisições sem origin (como Postman ou mobile)
    if (!origin) return callback(null, true);

    const normalized = origin.replace(/\/$/, '');
    const approved = allowedOrigins.has(normalized);

    if (approved) {
      callback(null, true);
    } else {
      console.warn(`CORS bloqueado para origem: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-client-fingerprint'],
}));

const swaggerEnabled =
  process.env.NODE_ENV !== 'production' ||
  process.env.ENABLE_SWAGGER_DOCS === 'true';

// Middlewares globais
app.disable('x-powered-by');
app.use(requestContextMiddleware);
app.use(requestMetricsMiddleware);
// aceitar uploads base64/JSON grandes (fotos, logos, assinaturas)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Security middleware (CSP + headers de segurança)
securityMiddleware(app);

// Rate limiting geral para todas as rotas API
app.use('/api', generalLimiter);

// Rotas de autenticação
app.use('/api/auth', require('./routes/authRoutes'));

// OAuth rotas - comentadas por padrão, ativar em .env
// Para ativar OAuth: OAUTH_ENABLED=true
if (process.env.OAUTH_ENABLED === 'true') {
  // eslint-disable-next-line global-require
  const passport = require('passport');
  app.use(passport.initialize());
  // eslint-disable-next-line global-require
  app.use('/api/oauth', require('./routes/oauthRoutes'));
}

app.use('/api/reports', require('./routes/reportRoutes'));

app.use('/api/patients', patientRoutes);
app.use('/api/consultations', userActionLimiter, consultationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clinic', clinicRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/status', require('./routes/statusRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Rota de cache (para debugging/admin)
app.get('/api/cache/stats', authMiddleware, async (req, res) => {
  const stats = await cacheService.stats();
  res.json(stats);
});

app.post('/api/cache/flush', authMiddleware, async (req, res) => {
  const result = await cacheService.flush();
  res.json({ success: result });
});

// Swagger UI - servir specification JSON
app.get('/api-docs.json', (req, res) => {
  if (!swaggerEnabled) {
    return res.status(404).json({ error: 'Not found' });
  }
  const specPath = path.join(__dirname, 'docs', 'openapi.json');
  if (fs.existsSync(specPath)) {
    return res.json(JSON.parse(fs.readFileSync(specPath, 'utf8')));
  }
  return res.status(404).json({ error: 'Specification not found' });
});

// Swagger UI redirect
app.get('/api-docs', (req, res) => {
  if (!swaggerEnabled) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.redirect('/api-docs.html');
});

// Servir Swagger UI estático
if (swaggerEnabled) {
  app.use(
    '/api-docs',
    express.static(
      path.join(__dirname, '..', 'node_modules', 'swagger-ui-dist'),
    ),
  );
}

// Rota base
app.get('/', (req, res) => {
  res.json({
    message: 'VetPro API rodando 🚀',
    docs: '/api-docs',
    health: '/health',
  });
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    dependencies: {
      app: { ok: true, status: 'up' },
    },
  });
});

app.get('/health/live', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    dependencies: {
      app: { ok: true, status: 'up' },
    },
  });
});

app.get('/health/ready', async (req, res) => {
  const status = await metricsService.getSystemHealth();
  const dependencies = {
    db: status.db,
    redis: status.redis,
  };
  const redisRequired =
    String(process.env.REDIS_REQUIRED || 'true').toLowerCase() === 'true';
  const redisOk = redisRequired ? Boolean(status.redis?.ok) : true;
  const ready = Boolean(status.db?.ok) && redisOk;

  res.status(ready ? 200 : 503).json({
    ok: ready,
    timestamp: status.timestamp,
    dependencies,
  });
});

app.get('/health/db', async (req, res) => {
  const status = await metricsService.getSystemHealth();
  res.status(status.db.ok ? 200 : 503).json({
    ok: status.db.ok,
    timestamp: status.timestamp,
    dependencies: {
      db: status.db,
    },
    db: status.db,
  });
});

app.get('/health/redis', async (req, res) => {
  const status = await metricsService.getSystemHealth();
  res.status(status.redis.ok ? 200 : 503).json({
    ok: status.redis.ok,
    timestamp: status.timestamp,
    dependencies: {
      redis: status.redis,
    },
    redis: status.redis,
  });
});

app.get('/status/system', async (req, res) => {
  const [health, requestMetrics, business] = await Promise.all([
    metricsService.getSystemHealth(),
    Promise.resolve(metricsService.getRequestMetrics()),
    metricsService.getBusinessMetrics().catch(() => null),
  ]);

  res.status(health.ok ? 200 : 503).json({
    ok: health.ok,
    timestamp: health.timestamp,
    dependencies: {
      db: health.db,
      redis: health.redis,
    },
    health,
    metrics: {
      request: requestMetrics,
      business,
    },
  });
});

app.get('/debug/error', authMiddleware, (req, res, next) => {
  const enabled =
    process.env.ENABLE_DEBUG_ERROR_ENDPOINT === 'true' ||
    process.env.NODE_ENV !== 'production';
  if (!enabled) {
    return next(new AppError('Debug endpoint desabilitado.', 403, 'FORBIDDEN'));
  }
  return next(
    new AppError('Erro simulado para observabilidade.', 500, 'DEBUG_ERROR'),
  );
});

// Middleware de erro centralizado
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
