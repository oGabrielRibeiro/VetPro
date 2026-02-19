const prisma = require("../lib/prisma");

function serializePatient(patient) {
  return {
    ...patient,
    species: patient.specie
  };
}

function normalizePatientInput(data = {}) {
  const ageValue = data.age === "" || data.age == null ? null : Number(data.age);
  const weightValue = data.weight === "" || data.weight == null ? null : Number(data.weight);

  return {
    name: (data.name || "").trim(),
    specie: (data.specie || data.species || "").trim(),
    breed: data.breed ? data.breed.trim() : null,
    age: Number.isFinite(ageValue) ? Math.trunc(ageValue) : null,
    weight: Number.isFinite(weightValue) ? weightValue : null,
    ownerName: (data.ownerName || "").trim(),
    ownerPhone: data.ownerPhone ? data.ownerPhone.trim() : null
  };
}

async function createPatient(userId, clinicId, data) {
  const normalized = normalizePatientInput(data);

  return await prisma.patient.create({
    data: {
      ...normalized,
      clinicId,
      userId
    }
  });
}

async function getPatients(userId, query = {}) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const search = query.search || "";

  const skip = (page - 1) * limit;

  const where = {
    userId,
    name: {
      contains: search,
      mode: "insensitive",
    },
  };

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
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
      userId
    }
  });

  return patient ? serializePatient(patient) : null;
}

async function updatePatient(userId, patientId, data) {
  const normalized = normalizePatientInput(data);

  return await prisma.patient.updateMany({
    where: {
      id: patientId,
      userId
    },
    data: normalized
  });
}

async function deletePatient(userId, patientId) {
  return await prisma.patient.deleteMany({
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
};
