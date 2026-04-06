const prisma = require('../lib/prisma');
const EncryptedFieldService = require('./encryptedFieldService');

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

function hasOwn(data, key) {
  return Object.prototype.hasOwnProperty.call(data || {}, key);
}

const updatablePatientFields = [
  'name',
  'specie',
  'species',
  'subcategory',
  'breed',
  'sex',
  'age',
  'birthDate',
  'weight',
  'color',
  'microchip',
  'photoUrl',
  'status',
  'porte',
  'ownerName',
  'ownerPhone',
  'ownerAltPhone',
  'ownerEmail',
  'ownerCpf',
  'ownerAddress',
  'ownerNotes',
  'emergencyFlag',
  'responsibleVet',
  'originClinic',
  'anestheticRiskScore',
  'persistentProfile',
];

function validatePatientInput(data = {}, options = {}) {
  const partial = Boolean(options.partial);
  const name = String(data.name || '').trim();
  const species = String(data.specie || data.species || '').trim();
  const ownerName = String(data.ownerName || '').trim();

  if (partial) {
    const hasAnyField = updatablePatientFields.some((field) =>
      hasOwn(data, field),
    );
    if (!hasAnyField) {
      throw new ValidationError(
        'Informe ao menos um campo para atualizar o paciente.',
      );
    }
  }

  if (!partial || hasOwn(data, 'name')) {
    if (!name) throw new ValidationError('Nome do paciente e obrigatorio.');
  }
  if (!partial || hasOwn(data, 'specie') || hasOwn(data, 'species')) {
    if (!species) throw new ValidationError('Especie e obrigatoria.');
  }
  if (!partial || hasOwn(data, 'ownerName')) {
    if (!ownerName)
      throw new ValidationError('Tutor obrigatorio para criar paciente.');
  }

  if (!partial || hasOwn(data, 'ownerCpf')) {
    const cpf = normalizeCpf(data.ownerCpf);
    if (cpf && !/^\d{11}$/.test(cpf)) {
      throw new ValidationError(
        'CPF do tutor invalido. Informe 11 digitos numericos.',
      );
    }
  }

  if (!partial || hasOwn(data, 'weight')) {
    const weight = parseNumber(data.weight);
    if (weight != null && weight <= 0) {
      throw new ValidationError('Peso deve ser maior que zero.');
    }
  }

  if (!partial || hasOwn(data, 'status')) {
    const status = normalizeStatus(data.status);
    if (!['ativo', 'obito', 'transferido'].includes(status)) {
      throw new ValidationError(
        'Status invalido. Use ativo, obito ou transferido.',
      );
    }
  }
}

function normalizePatientInput(data = {}, options = {}) {
  const partial = Boolean(options.partial);
  const ageValue = parseAge(data.age);
  const weightValue = parseNumber(data.weight);
  const riskValue = parseNumber(data.anestheticRiskScore);
  const birthDate = parseDate(data.birthDate);
  const normalized = {};

  if (!partial || hasOwn(data, 'name'))
    normalized.name = (data.name || '').trim();
  if (!partial || hasOwn(data, 'specie') || hasOwn(data, 'species')) {
    normalized.specie = (data.specie || data.species || '').trim();
  }
  if (!partial || hasOwn(data, 'subcategory')) {
    normalized.subcategory = data.subcategory ? data.subcategory.trim() : null;
  }
  if (!partial || hasOwn(data, 'breed'))
    normalized.breed = data.breed ? data.breed.trim() : null;
  if (!partial || hasOwn(data, 'sex'))
    normalized.sex = data.sex ? data.sex.trim().toUpperCase() : null;
  if (!partial || hasOwn(data, 'age')) normalized.age = ageValue;
  if (!partial || hasOwn(data, 'birthDate')) normalized.birthDate = birthDate;
  if (!partial || hasOwn(data, 'weight')) {
    normalized.weight = Number.isFinite(weightValue) ? weightValue : null;
  }
  if (!partial || hasOwn(data, 'color'))
    normalized.color = data.color ? data.color.trim() : null;
  if (!partial || hasOwn(data, 'microchip')) {
    normalized.microchip = data.microchip ? data.microchip.trim() : null;
  }
  if (!partial || hasOwn(data, 'photoUrl'))
    normalized.photoUrl = data.photoUrl ? data.photoUrl.trim() : null;
  if (!partial || hasOwn(data, 'status'))
    normalized.status = normalizeStatus(data.status);
  if (!partial || hasOwn(data, 'porte'))
    normalized.porte = normalizePorte(data.porte);
  if (!partial || hasOwn(data, 'ownerName'))
    normalized.ownerName = (data.ownerName || '').trim();
  if (!partial || hasOwn(data, 'ownerPhone')) {
    normalized.ownerPhone = normalizePhone(data.ownerPhone);
  }
  if (!partial || hasOwn(data, 'ownerAltPhone')) {
    normalized.ownerAltPhone = normalizePhone(data.ownerAltPhone);
  }
  if (!partial || hasOwn(data, 'ownerEmail')) {
    normalized.ownerEmail = data.ownerEmail
      ? data.ownerEmail.trim().toLowerCase()
      : null;
  }
  if (!partial || hasOwn(data, 'ownerCpf'))
    normalized.ownerCpf = normalizeCpf(data.ownerCpf);
  if (!partial || hasOwn(data, 'ownerAddress')) {
    normalized.ownerAddress = data.ownerAddress
      ? data.ownerAddress.trim()
      : null;
  }
  if (!partial || hasOwn(data, 'ownerNotes')) {
    normalized.ownerNotes = data.ownerNotes ? data.ownerNotes.trim() : null;
  }
  if (!partial || hasOwn(data, 'emergencyFlag')) {
    normalized.emergencyFlag = Boolean(data.emergencyFlag);
  }
  if (!partial || hasOwn(data, 'responsibleVet')) {
    normalized.responsibleVet = data.responsibleVet
      ? data.responsibleVet.trim()
      : null;
  }
  if (!partial || hasOwn(data, 'originClinic')) {
    normalized.originClinic = data.originClinic
      ? data.originClinic.trim()
      : null;
  }
  if (!partial || hasOwn(data, 'anestheticRiskScore')) {
    normalized.anestheticRiskScore = Number.isFinite(riskValue)
      ? Math.max(0, Math.min(5, Math.trunc(riskValue)))
      : null;
  }
  if (!partial || hasOwn(data, 'persistentProfile')) {
    normalized.persistentProfile =
      data.persistentProfile && typeof data.persistentProfile === 'object'
        ? data.persistentProfile
        : null;
  }

  return normalized;
}

async function createPatient(userId, clinicId, data) {
  validatePatientInput(data, { partial: false });
  const normalized = normalizePatientInput(data);

  // Criptografar campos sensíveis
  const encryptedData = EncryptedFieldService.encryptFields('Patient', normalized);

  return prisma.patient.create({
    data: {
      ...encryptedData,
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

  // Descriptografar campos sensíveis para cada paciente
  const decryptedPatients = patients.map(patient =>
    EncryptedFieldService.decryptFields('Patient', patient)
  );

  return {
    data: decryptedPatients.map(serializePatient),
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

  if (!patient) return null;

  // Descriptografar campos sensíveis
  const decryptedPatient = EncryptedFieldService.decryptFields('Patient', patient);

  return serializePatient(decryptedPatient);
}

async function updatePatient(userId, patientId, data, options = {}) {
  const partial = Boolean(options.partial);
  validatePatientInput(data, { partial });
  const normalized = normalizePatientInput(data, { partial });

  if (!Object.keys(normalized).length) {
    throw new ValidationError('Nenhum campo valido para atualizar.');
  }

  // Criptografar campos sensíveis
  const encryptedData = EncryptedFieldService.encryptFields('Patient', normalized);

  return prisma.patient.updateMany({
    where: {
      id: patientId,
      userId,
    },
    data: encryptedData,
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
