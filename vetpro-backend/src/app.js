const express = require('express');
const cors = require('cors');
const patientRoutes = require('./routes/patientRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const clinicRoutes = require('./routes/clinicRoutes');
require('dotenv').config();

const app = express();

// Middlewares globais
app.use(cors());
app.disable('x-powered-by');
// aceitar uploads base64/JSON grandes (fotos, logos, assinaturas)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Rotas
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

app.use('/api/patients', patientRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clinic', clinicRoutes);
app.use(
  '/uploads',
  express.static('uploads', {
    etag: true,
    lastModified: true,
    maxAge: '7d',
  }),
);

// Rota base
app.get('/', (req, res) => {
  res.json({ message: 'VetPro API rodando 🚀' });
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
});

module.exports = app;
