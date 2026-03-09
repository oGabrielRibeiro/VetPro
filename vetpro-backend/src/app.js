const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('./config/loadEnv');
const authMiddleware = require('./middlewares/authMiddleware');
const patientRoutes = require('./routes/patientRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const clinicRoutes = require('./routes/clinicRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const {
  generalLimiter,
  authLimiter,
} = require('./middlewares/rateLimitMiddleware');
const cacheService = require('./services/cacheService');

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

// Middlewares globais
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error('CORS origin nao permitida'));
    },
    credentials: true,
    optionsSuccessStatus: 204,
  }),
);

app.disable('x-powered-by');
// aceitar uploads base64/JSON grandes (fotos, logos, assinaturas)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Rate limiting geral para todas as rotas API
app.use('/api', generalLimiter);

// Rotas de autenticação com limitador específico
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));

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
app.use('/api/consultations', consultationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clinic', clinicRoutes);
app.use('/api/appointments', appointmentRoutes);

// Rota de cache (para debugging/admin)
app.get('/api/cache/stats', authMiddleware, async (req, res) => {
  const stats = await cacheService.stats();
  res.json(stats);
});

app.post('/api/cache/flush', authMiddleware, async (req, res) => {
  const result = await cacheService.flush();
  res.json({ success: result });
});

app.use(
  '/uploads',
  express.static('uploads', {
    etag: true,
    lastModified: true,
    maxAge: '7d',
  }),
);

// Swagger UI - servir specification JSON
app.get('/api-docs.json', (req, res) => {
  const specPath = path.join(__dirname, 'docs', 'openapi.json');
  if (fs.existsSync(specPath)) {
    return res.json(JSON.parse(fs.readFileSync(specPath, 'utf8')));
  }
  return res.status(404).json({ error: 'Specification not found' });
});

// Swagger UI redirect
app.get('/api-docs', (req, res) => {
  res.redirect('/api-docs.html');
});

// Servir Swagger UI estático
app.use(
  '/api-docs',
  express.static(path.join(__dirname, '..', 'node_modules', 'swagger-ui-dist')),
);

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
  });
});

// Middleware de erro centralizado
app.use(require('./middlewares/errorHandler'));

module.exports = app;
