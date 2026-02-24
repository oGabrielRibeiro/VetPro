const prisma = require('../lib/prisma');

function buildPatientSyncDataFromConsultation(
  normalizedData = {},
  currentPatient = null,
) {
  const nextWeight = Number(normalizedData?.weight);
  const currentWeight = Number(currentPatient?.weight);

  const canSyncWeight =
    Number.isFinite(nextWeight) &&
    nextWeight > 0 &&
    nextWeight < 2000 &&
    (!Number.isFinite(currentWeight) ||
      Math.abs(currentWeight - nextWeight) >= 0.01);

  if (!canSyncWeight) {
    return {};
  }

  return { weight: nextWeight };
}

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isMeaningfulProfileValue(value = '') {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  if (normalized === 'nao informado' || normalized === 'não informado')
    return false;
  return true;
}

const PERSISTENT_SPECIFIC_KEYS = {
  pequeno: new Set([
    'allergyHistory',
    'chronicDiseases',
    'contactWithAnimals',
    'reproductiveStatusSmall',
  ]),
  grande: new Set([
    'farmName',
    'productionSystem',
    'animalFunction',
    'propertyAndManagement',
    'contactAnimals',
  ]),
};

function sanitizePersistentProfileUpdate(raw = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const porte =
    String(raw?.porte || '').toLowerCase() === 'grande' ? 'grande' : 'pequeno';
  const fields =
    raw?.fields && typeof raw.fields === 'object' ? raw.fields : {};
  const allowedKeys = PERSISTENT_SPECIFIC_KEYS[porte] || new Set();

  const cleanedFields = Object.entries(fields).reduce((acc, [key, value]) => {
    if (!allowedKeys.has(String(key || ''))) return acc;
    const text = String(value || '').trim();
    if (!isMeaningfulProfileValue(text)) return acc;
    acc[key] = text;
    return acc;
  }, {});

  if (!Object.keys(cleanedFields).length) return null;
  return { porte, fields: cleanedFields };
}

function mergePatientPersistentProfile(currentProfile, nextUpdate) {
  const base =
    currentProfile && typeof currentProfile === 'object' ? currentProfile : {};
  const sanitized = sanitizePersistentProfileUpdate(nextUpdate);
  if (!sanitized) return null;

  const { porte } = sanitized;
  const previousPorte =
    base?.[porte]?.fields && typeof base[porte].fields === 'object'
      ? base[porte].fields
      : {};

  return {
    ...base,
    updatedAt: new Date().toISOString(),
    [porte]: {
      fields: {
        ...previousPorte,
        ...sanitized.fields,
      },
    },
  };
}

function normalizeConsultationData(data = {}) {
  const normalized = {
    consultationType:
      data.consultationType ||
      (data.template === 'return' ? 'retorno' : 'nova'),
    chiefComplaint: data.chiefComplaint || null,
    anamnesis: data.anamnesis || null,
    physicalExam: data.physicalExam || data.clinicalAssessment || null,
    diagnosis: data.diagnosis || null,
    treatment: data.treatment || null,
    procedures: data.procedures || null,
    medications: data.medications || null,
    notes: data.notes || data.observations || null,
    returnRecommendation: data.returnRecommendation || null,
    veterinarianName: data.veterinarianName || null,
    veterinarianCrmv: data.veterinarianCrmv || data.veterinarianCRMV || null,
  };

  const weight =
    data.weight == null || data.weight === '' ? null : Number(data.weight);
  const temperature =
    data.temperature == null || data.temperature === ''
      ? null
      : Number(data.temperature);
  const heartRate =
    data.heartRate == null || data.heartRate === ''
      ? null
      : Number(data.heartRate);
  const respiratoryRate =
    data.respiratoryRate == null || data.respiratoryRate === ''
      ? null
      : Number(data.respiratoryRate);

  normalized.weight = Number.isFinite(weight) ? weight : null;
  normalized.temperature = Number.isFinite(temperature) ? temperature : null;
  normalized.heartRate = Number.isFinite(heartRate)
    ? Math.trunc(heartRate)
    : null;
  normalized.respiratoryRate = Number.isFinite(respiratoryRate)
    ? Math.trunc(respiratoryRate)
    : null;

  if (typeof data.vaccinationUpToDate === 'boolean') {
    normalized.vaccinationUpToDate = data.vaccinationUpToDate;
  } else if (typeof data.vaccinationStatus === 'string') {
    normalized.vaccinationUpToDate =
      data.vaccinationStatus.toLowerCase() === 'em dia';
  }

  if (data.previousConsultationId) {
    normalized.previousConsultationId = data.previousConsultationId;
  }

  return normalized;
}

async function createConsultation({
  userId,
  patientId,
  data,
  recipeNumber,
  recipeYear,
  clinicId,
}) {
  return prisma.$transaction(async (tx) => {
    const patient = await tx.patient.findFirst({
      where: {
        id: patientId,
        userId,
        clinicId,
      },
    });

    if (!patient) {
      throw new Error('Paciente nao encontrado');
    }

    const last = await tx.consultation.findFirst({
      where: { userId },
      orderBy: { numeroProntuario: 'desc' },
      select: { numeroProntuario: true },
    });

    const nextNumber = last ? last.numeroProntuario + 1 : 1;
    const normalizedData = normalizeConsultationData(data);

    let copiedData = {};
    if (normalizedData.previousConsultationId) {
      const previous = await tx.consultation.findFirst({
        where: {
          id: normalizedData.previousConsultationId,
          userId,
        },
      });

      if (!previous) {
        throw new Error('Consulta anterior nao encontrada');
      }

      copiedData = {
        diagnosis: previous.diagnosis,
        treatment: previous.treatment,
        medications: previous.medications,
        notes: previous.notes,
        returnRecommendation: previous.returnRecommendation,
        weight: previous.weight,
        temperature: previous.temperature,
        heartRate: previous.heartRate,
        respiratoryRate: previous.respiratoryRate,
      };
    }

    const createdConsultation = await tx.consultation.create({
      data: {
        numeroProntuario: nextNumber,
        userId,
        patientId,
        clinicId,
        recipeNumber,
        recipeYear,
        ...copiedData,
        ...normalizedData,
      },
    });

    const patientSyncData = buildPatientSyncDataFromConsultation(
      normalizedData,
      patient,
    );
    const nextPersistentProfile = mergePatientPersistentProfile(
      patient?.persistentProfile,
      data?.persistentProfileUpdate,
    );
    if (nextPersistentProfile) {
      patientSyncData.persistentProfile = nextPersistentProfile;
      patientSyncData.porte =
        String(data?.persistentProfileUpdate?.porte || '').toLowerCase() ===
        'grande'
          ? 'grande'
          : 'pequeno';
    }
    if (Object.keys(patientSyncData).length) {
      await tx.patient.update({
        where: { id: patient.id },
        data: patientSyncData,
      });
    }

    return createdConsultation;
  });
}

async function getConsultations(userId) {
  return prisma.consultation.findMany({
    where: { userId },
    include: { patient: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function getConsultationsByPatient(userId, patientId) {
  return prisma.consultation.findMany({
    where: {
      userId,
      patientId,
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function getConsultationById(userId, consultationId) {
  const consultation = await prisma.consultation.findFirst({
    where: {
      id: consultationId,
      userId,
    },
    include: {
      patient: true,
      clinic: true,
      user: true,
      previousConsultation: {
        select: {
          id: true,
          consultationType: true,
          previousConsultationId: true,
          numeroProntuario: true,
          createdAt: true,
          chiefComplaint: true,
          weight: true,
          temperature: true,
          heartRate: true,
          respiratoryRate: true,
          diagnosis: true,
          treatment: true,
          medications: true,
          previousConsultation: {
            select: {
              id: true,
              numeroProntuario: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!consultation) {
    throw new Error('Consulta nao encontrada');
  }

  const hasMissingVitals =
    consultation.weight == null ||
    consultation.temperature == null ||
    consultation.heartRate == null ||
    consultation.respiratoryRate == null;

  if (!hasMissingVitals) {
    return consultation;
  }

  const latestVitals = await prisma.consultation.findFirst({
    where: {
      userId,
      patientId: consultation.patientId,
      id: { not: consultation.id },
      OR: [
        { weight: { not: null } },
        { temperature: { not: null } },
        { heartRate: { not: null } },
        { respiratoryRate: { not: null } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      weight: true,
      temperature: true,
      heartRate: true,
      respiratoryRate: true,
    },
  });

  return {
    ...consultation,
    latestVitals,
  };
}

async function createReturnFromConsultation(userId, clinicId, consultationId) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.consultation.findFirst({
      where: {
        id: consultationId,
        userId,
      },
    });

    if (!original) {
      throw new Error('Consulta original nao encontrada');
    }

    const last = await tx.consultation.findFirst({
      where: { userId },
      orderBy: { numeroProntuario: 'desc' },
      select: { numeroProntuario: true },
    });
    const nextNumber = last ? last.numeroProntuario + 1 : 1;

    const currentYear = new Date().getFullYear();
    const lastRecipe = await tx.consultation.findFirst({
      where: {
        clinicId,
        recipeYear: currentYear,
      },
      orderBy: { recipeNumber: 'desc' },
    });
    const nextRecipeNumber = lastRecipe
      ? (lastRecipe.recipeNumber || 0) + 1
      : 1;

    return tx.consultation.create({
      data: {
        numeroProntuario: nextNumber,
        userId,
        clinicId,
        patientId: original.patientId,
        consultationType: 'retorno',
        previousConsultationId: original.id,
        recipeNumber: nextRecipeNumber,
        recipeYear: currentYear,
        weight: original.weight,
        temperature: original.temperature,
        heartRate: original.heartRate,
        respiratoryRate: original.respiratoryRate,
        diagnosis: original.diagnosis,
        treatment: original.treatment,
        medications: original.medications,
        notes: original.notes,
        returnRecommendation: original.returnRecommendation,
      },
    });
  });
}

module.exports = {
  // Funções usadas pela API
  createConsultation,
  getConsultations,
  getConsultationsByPatient,
  getConsultationById,
  createReturnFromConsultation,
  // Helpers exportados para testes
  buildPatientSyncDataFromConsultation,
  normalizeText,
  isMeaningfulProfileValue,
  sanitizePersistentProfileUpdate,
  mergePatientPersistentProfile,
};
