const prisma = require("../lib/prisma");

function buildPatientSyncDataFromConsultation(normalizedData = {}, currentPatient = null) {
  const nextWeight = Number(normalizedData?.weight);
  const currentWeight = Number(currentPatient?.weight);

  const canSyncWeight =
    Number.isFinite(nextWeight) &&
    nextWeight > 0 &&
    nextWeight < 2000 &&
    (!Number.isFinite(currentWeight) || Math.abs(currentWeight - nextWeight) >= 0.01);

  if (!canSyncWeight) {
    return {};
  }

  return { weight: nextWeight };
}

function normalizeConsultationData(data = {}) {
  const normalized = {
    consultationType: data.consultationType || (data.template === "return" ? "retorno" : "nova"),
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
    veterinarianCrmv: data.veterinarianCrmv || data.veterinarianCRMV || null
  };

  const weight = data.weight == null || data.weight === "" ? null : Number(data.weight);
  const temperature = data.temperature == null || data.temperature === "" ? null : Number(data.temperature);
  const heartRate = data.heartRate == null || data.heartRate === "" ? null : Number(data.heartRate);
  const respiratoryRate = data.respiratoryRate == null || data.respiratoryRate === "" ? null : Number(data.respiratoryRate);

  normalized.weight = Number.isFinite(weight) ? weight : null;
  normalized.temperature = Number.isFinite(temperature) ? temperature : null;
  normalized.heartRate = Number.isFinite(heartRate) ? Math.trunc(heartRate) : null;
  normalized.respiratoryRate = Number.isFinite(respiratoryRate) ? Math.trunc(respiratoryRate) : null;

  if (typeof data.vaccinationUpToDate === "boolean") {
    normalized.vaccinationUpToDate = data.vaccinationUpToDate;
  } else if (typeof data.vaccinationStatus === "string") {
    normalized.vaccinationUpToDate = data.vaccinationStatus.toLowerCase() === "em dia";
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
  clinicId
}) {
  return await prisma.$transaction(async (tx) => {
    const patient = await tx.patient.findFirst({
      where: {
        id: patientId,
        userId,
        clinicId
      }
    });

    if (!patient) {
      throw new Error("Paciente nao encontrado");
    }

    const last = await tx.consultation.findFirst({
      where: { userId },
      orderBy: { numeroProntuario: "desc" },
      select: { numeroProntuario: true }
    });

    const nextNumber = last ? last.numeroProntuario + 1 : 1;
    const normalizedData = normalizeConsultationData(data);

    let copiedData = {};
    if (normalizedData.previousConsultationId) {
      const previous = await tx.consultation.findFirst({
        where: {
          id: normalizedData.previousConsultationId,
          userId
        }
      });

      if (!previous) {
        throw new Error("Consulta anterior nao encontrada");
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
        respiratoryRate: previous.respiratoryRate
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
        ...normalizedData
      }
    });

    const patientSyncData = buildPatientSyncDataFromConsultation(normalizedData, patient);
    if (Object.keys(patientSyncData).length) {
      await tx.patient.update({
        where: { id: patient.id },
        data: patientSyncData
      });
    }

    return createdConsultation;
  });
}

async function getConsultations(userId) {
  return await prisma.consultation.findMany({
    where: { userId },
    include: { patient: true },
    orderBy: { createdAt: "desc" }
  });
}

async function getConsultationsByPatient(userId, patientId) {
  return await prisma.consultation.findMany({
    where: {
      userId,
      patientId
    },
    orderBy: { createdAt: "desc" }
  });
}

async function getConsultationById(userId, consultationId) {
  const consultation = await prisma.consultation.findFirst({
    where: {
      id: consultationId,
      userId
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
          diagnosis: true,
          treatment: true,
          medications: true,
          previousConsultation: {
            select: {
              id: true,
              numeroProntuario: true,
              createdAt: true
            }
          }
        }
      }
    }
  });

  if (!consultation) {
    throw new Error("Consulta nao encontrada");
  }

  return consultation;
}

async function createReturnFromConsultation(userId, clinicId, consultationId) {
  return await prisma.$transaction(async (tx) => {
    const original = await tx.consultation.findFirst({
      where: {
        id: consultationId,
        userId
      }
    });

    if (!original) {
      throw new Error("Consulta original nao encontrada");
    }

    const last = await tx.consultation.findFirst({
      where: { userId },
      orderBy: { numeroProntuario: "desc" },
      select: { numeroProntuario: true }
    });
    const nextNumber = last ? last.numeroProntuario + 1 : 1;

    const currentYear = new Date().getFullYear();
    const lastRecipe = await tx.consultation.findFirst({
      where: {
        clinicId,
        recipeYear: currentYear
      },
      orderBy: { recipeNumber: "desc" }
    });
    const nextRecipeNumber = lastRecipe ? (lastRecipe.recipeNumber || 0) + 1 : 1;

    return await tx.consultation.create({
      data: {
        numeroProntuario: nextNumber,
        userId,
        clinicId,
        patientId: original.patientId,
        consultationType: "retorno",
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
        returnRecommendation: original.returnRecommendation
      }
    });
  });
}

module.exports = {
  createConsultation,
  getConsultations,
  getConsultationsByPatient,
  getConsultationById,
  createReturnFromConsultation
};
