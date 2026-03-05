const prisma = require('../lib/prisma');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

function serializePatient(patient) {
  return {
    ...patient,
    species: patient.specie,
  };
}

function normalizePhone(value) {
  const raw = String(value || '').trim();
  return raw || null;
}

function normalizeCpf(value) {
  const digits = String(value || '').replace(/\D+/g, '');
  return digits || null;
}

function normalizeStatus(value) {
  const normalized = String(value || 'ativo')
    .trim()
    .toLowerCase();
  if (['ativo', 'obito', 'transferido'].includes(normalized)) {
    return normalized;
  }
  return 'ativo';
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizePorte(value) {
  const raw = normalizeText(value || '');
  if (!raw) return null;
  if (raw === 'pequeno') return 'pequeno';
  if (raw === 'grande') return 'grande';
  if (raw === 'medio' || raw === 'médio') return 'pequeno';
  if (raw === 'gigante') return 'grande';
  return null;
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseNumber(value) {
  if (value === '' || value == null) return null;
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Tenta extrair número de uma string de idade (ex: "3 anos" -> 3)
function parseAge(value) {
  if (value == null) return null;
  // Se já for número, retorna
  if (typeof value === 'number') return Math.trunc(value);
  // Se for string, tenta extrair números
  const str = String(value);
  const match = str.match(/\d+/);
  if (match) {
    return Math.trunc(Number(match[0]));
  }
  return null;
}

function validatePatientInput(data = {}) {
  const name = String(data.name || '').trim();
  const species = String(data.specie || data.species || '').trim();
  const ownerName = String(data.ownerName || '').trim();

  if (!name) throw new ValidationError('Nome do paciente e obrigatorio.');
  if (!species) throw new ValidationError('Especie e obrigatoria.');
  if (!ownerName)
    throw new ValidationError('Tutor obrigatorio para criar paciente.');

  const cpf = normalizeCpf(data.ownerCpf);
  if (cpf && !/^\d{11}$/.test(cpf)) {
    throw new ValidationError(
      'CPF do tutor invalido. Informe 11 digitos numericos.',
    );
  }

  const weight = parseNumber(data.weight);
  if (weight != null && weight <= 0) {
    throw new ValidationError('Peso deve ser maior que zero.');
  }

  const status = normalizeStatus(data.status);
  if (!['ativo', 'obito', 'transferido'].includes(status)) {
    throw new ValidationError(
      'Status invalido. Use ativo, obito ou transferido.',
    );
  }
}

function normalizePatientInput(data = {}) {
  const ageValue = parseAge(data.age);
  const weightValue = parseNumber(data.weight);
  const riskValue = parseNumber(data.anestheticRiskScore);
  const birthDate = parseDate(data.birthDate);

  const persistentProfile =
    data.persistentProfile && typeof data.persistentProfile === 'object'
      ? data.persistentProfile
      : null;

  return {
    name: (data.name || '').trim(),
    specie: (data.specie || data.species || '').trim(),
    subcategory: data.subcategory ? data.subcategory.trim() : null,
    breed: data.breed ? data.breed.trim() : null,
    sex: data.sex ? data.sex.trim().toUpperCase() : null,
    age: ageValue,
    birthDate,
    weight: Number.isFinite(weightValue) ? weightValue : null,
    color: data.color ? data.color.trim() : null,
    microchip: data.microchip ? data.microchip.trim() : null,
    photoUrl: data.photoUrl ? data.photoUrl.trim() : null,
    status: normalizeStatus(data.status),
    porte: normalizePorte(data.porte),
    ownerName: (data.ownerName || '').trim(),
    ownerPhone: normalizePhone(data.ownerPhone),
    ownerAltPhone: normalizePhone(data.ownerAltPhone),
    ownerEmail: data.ownerEmail ? data.ownerEmail.trim().toLowerCase() : null,
    ownerCpf: normalizeCpf(data.ownerCpf),
    ownerAddress: data.ownerAddress ? data.ownerAddress.trim() : null,
    ownerNotes: data.ownerNotes ? data.ownerNotes.trim() : null,
    emergencyFlag: Boolean(data.emergencyFlag),
    responsibleVet: data.responsibleVet ? data.responsibleVet.trim() : null,
    originClinic: data.originClinic ? data.originClinic.trim() : null,
    anestheticRiskScore: Number.isFinite(riskValue)
      ? Math.max(0, Math.min(5, Math.trunc(riskValue)))
      : null,
    persistentProfile,
  };
}

async function createPatient(userId, clinicId, data) {
  validatePatientInput(data, 'create');
  const normalized = normalizePatientInput(data);

  return prisma.patient.create({
    data: {
      ...normalized,
      clinicId,
      userId,
    },
  });
}

async function getPatients(userId, query = {}) {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const search = query.search || '';

  const skip = (page - 1) * limit;

  const where = {
    userId,
    name: {
      contains: search,
      mode: 'insensitive',
    },
  };

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.patient.count({ where }),
  ]);

  return {
    data: patients.map(serializePatient),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getPatientById(userId, patientId) {
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      userId,
    },
  });

  return patient ? serializePatient(patient) : null;
}

async function updatePatient(userId, patientId, data) {
  validatePatientInput(data, 'update');
  const normalized = normalizePatientInput(data);

  return prisma.patient.updateMany({
    where: {
      id: patientId,
      userId,
    },
    data: normalized,
  });
}

async function deletePatient(userId, patientId) {
  return prisma.patient.deleteMany({
    where: {
      id: patientId,
      userId,
    },
  });
}

module.exports = {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  ValidationError,
};
