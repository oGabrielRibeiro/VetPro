const path = require('path');
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const logger = require('../utils/logger');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const HEALTH_URL = BASE_URL.endsWith('/api')
  ? `${BASE_URL.slice(0, -4)}/health`
  : `${BASE_URL}/health`;

function printInfo(message) {
  process.stdout.write(`${message}\n`);
}

function printError(message) {
  process.stderr.write(`${message}\n`);
}

function randomEmail() {
  const nonce = Date.now();
  return `smoke.${nonce}@vetpro.local`;
}

function randomName() {
  return `Smoke Vet ${Date.now()}`;
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, options);

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} - ${endpoint}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function canConnectTcp(host, port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (ok) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch (_) {
        // noop
      }
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(Number(port), host);
  });
}

async function runCommand(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: 'ignore' });
    child.once('error', () => resolve(false));
    child.once('exit', (code) => resolve(code === 0));
  });
}

async function ensureLocalInfra() {
  if (process.env.API_BASE_URL) return false;

  const root = path.resolve(__dirname, '..', '..', '..');
  const composeFile = path.join(root, 'docker-compose.yml');
  const hostRaw = String(process.env.POSTGRES_HOST || 'localhost').trim();
  const host = /^postgres$/i.test(hostRaw) ? 'localhost' : hostRaw;
  const port = Number(process.env.POSTGRES_PORT || '5432');

  const dbUp = await canConnectTcp(host, port);
  if (dbUp) return false;

  if (!fs.existsSync(composeFile)) {
    return false;
  }

  const dockerOk = await runCommand('docker', ['version'], root);
  if (!dockerOk) {
    printError(
      'Docker indisponivel. Nao foi possivel auto-subir postgres/redis.',
    );
    return false;
  }

  printInfo(
    'Infra local indisponivel. Tentando subir postgres/redis via docker compose...',
  );
  const composeOk = await runCommand(
    'docker',
    ['compose', 'up', '-d', 'postgres', 'redis'],
    root,
  );
  if (!composeOk) {
    printError('Falha ao executar docker compose para postgres/redis.');
    return false;
  }

  for (let i = 0; i < 20; i += 1) {
    // espera o banco ficar acessivel
    // eslint-disable-next-line no-await-in-loop
    const ready = await canConnectTcp(host, port);
    if (ready) return true;
    // eslint-disable-next-line no-await-in-loop
    await wait(1000);
  }

  return false;
}

async function isApiUp() {
  try {
    const response = await fetch(HEALTH_URL, { method: 'GET' });
    return response.ok;
  } catch (_) {
    return false;
  }
}

async function tryStopManagedServer(child) {
  if (!child) return;
  try {
    child.kill('SIGTERM');
  } catch (_) {
    // noop
  }
  try {
    await wait(300);
  } catch (_) {
    // noop
  }
  if (!child.killed) {
    try {
      child.kill('SIGKILL');
    } catch (_) {
      // noop
    }
  }
}

async function ensureApiRunning() {
  if (await isApiUp()) {
    return null;
  }

  if (process.env.API_BASE_URL) {
    throw new Error(
      `API indisponivel em ${BASE_URL}. Ajuste API_BASE_URL ou inicie a API.`,
    );
  }

  const backendRoot = path.resolve(__dirname, '..', '..');
  const child = spawn('node', ['src/server.js'], {
    cwd: backendRoot,
    stdio: 'ignore',
  });

  const maxAttempts = 15;
  let attempts = 0;
  await new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      attempts += 1;
      if (await isApiUp()) {
        clearInterval(timer);
        resolve();
        return;
      }
      if (attempts >= maxAttempts) {
        clearInterval(timer);
        reject(new Error('API nao respondeu apos iniciar servidor local.'));
      }
    }, 1000);
  }).catch(async (error) => {
    await tryStopManagedServer(child);
    throw error;
  });

  return child;
}

async function run() {
  const checks = [];
  const registerEmail = randomEmail();
  const password = '123456';
  let managedServer = null;

  logger.info(`Base URL: ${BASE_URL}`);
  printInfo(`Base URL: ${BASE_URL}`);

  try {
    const infraStarted = await ensureLocalInfra();
    if (infraStarted) checks.push('infra_postgres_redis');

    managedServer = await ensureApiRunning();
    if (managedServer) {
      checks.push('managed_server_start');
    }

    const registerPayload = {
      name: randomName(),
      email: registerEmail,
      password,
      clinicName: 'Clinica Smoke',
    };

    const register = await request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerPayload),
    });
    checks.push('register');

    const token = register?.token || register?.data?.token;
    if (!token) throw new Error('Token nao retornado em register');

    const login = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: registerEmail, password }),
    });
    checks.push('login');

    const loginToken = login?.token || login?.data?.token;
    if (!loginToken) throw new Error('Token nao retornado em login');

    const me = await request('/auth/me', {
      method: 'GET',
      headers: authHeaders(loginToken),
    });
    if (!me?.id) throw new Error('/auth/me sem id');
    checks.push('me');

    let invalidTokenRejected = false;
    try {
      await request('/auth/me', {
        method: 'GET',
        headers: authHeaders('token-invalido'),
      });
    } catch (err) {
      invalidTokenRejected = err.status === 401;
    }
    if (!invalidTokenRejected)
      throw new Error('token invalido nao foi rejeitado');
    checks.push('token_invalid');

    const patientPayload = {
      name: 'Paciente Smoke',
      species: 'Mamifero',
      breed: 'SRD',
      age: 4,
      ownerName: 'Tutor Smoke',
      ownerPhone: '11999990000',
    };

    const patient = await request('/patients', {
      method: 'POST',
      headers: {
        ...authHeaders(loginToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patientPayload),
    });

    if (!patient?.id) throw new Error('paciente sem id');
    checks.push('create_patient');

    const consultationPayload = {
      patientId: patient.id,
      consultationType: 'nova',
      weight: 12.5,
      temperature: 38.7,
      heartRate: 120,
      respiratoryRate: 28,
      chiefComplaint: 'coceira',
      anamnesis: 'tutor relata coceira intensa',
      physicalExam: 'lesoes superficiais',
      diagnosis: 'dermatite',
      treatment: 'higiene e anti-inflamatorio',
      procedures: 'Nao realizado',
      medications: 'prednisolona 5mg por 5 dias',
      notes: 'smoke checklist',
    };

    const consultation = await request('/consultations', {
      method: 'POST',
      headers: {
        ...authHeaders(loginToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(consultationPayload),
    });

    if (!consultation?.id) throw new Error('consulta sem id');
    checks.push('create_consultation');

    const formData = new FormData();
    formData.append(
      'segments',
      JSON.stringify([
        { stamp: '00:03', speaker: 'Tutor', text: 'ele esta com coceira' },
        { stamp: '00:10', speaker: 'Medico', text: 'diagnostico dermatite' },
      ]),
    );
    formData.append(
      'transcript',
      'Tutor: ele esta com coceira. Medico: diagnostico dermatite e prescrevo pomada',
    );

    const fieldAssist = await request('/consultations/field-assist', {
      method: 'POST',
      headers: {
        ...authHeaders(loginToken),
      },
      body: formData,
    });

    if (!fieldAssist?.parsed) throw new Error('field-assist sem parsed');
    checks.push('field_assist');

    const prescription = await request(
      `/consultations/${consultation.id}/prescription`,
      {
        method: 'POST',
        headers: {
          ...authHeaders(loginToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ download: false }),
      },
    );

    if (!prescription?.consultationId) throw new Error('receita nao anexada');
    checks.push('prescription_attach');

    const consultationsList = await request('/consultations', {
      method: 'GET',
      headers: authHeaders(loginToken),
    });
    if (!Array.isArray(consultationsList) || consultationsList.length === 0) {
      throw new Error('lista de consultas vazia');
    }
    checks.push('list_consultations');

    logger.info('\nSMOKE CHECKLIST OK');
    printInfo('SMOKE CHECKLIST OK');
    checks.forEach((item, idx) => {
      logger.info(`${idx + 1}. ${item}`);
      printInfo(`${idx + 1}. ${item}`);
    });
  } catch (error) {
    logger.error('\nSMOKE CHECKLIST FALHOU');
    logger.error(error.message);
    printError('SMOKE CHECKLIST FALHOU');
    printError(error.message);
    if (error.data) {
      logger.error('Detalhes:', JSON.stringify(error.data, null, 2));
      printError(`Detalhes: ${JSON.stringify(error.data)}`);
    }
    process.exit(1);
  } finally {
    if (managedServer) {
      await tryStopManagedServer(managedServer);
    }
  }
}

run();
