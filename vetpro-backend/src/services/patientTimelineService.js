const prisma = require('../lib/prisma');

async function getPatientTimeline(userId, patientId) {
  const consultations = await prisma.consultation.findMany({
    where: {
      userId,
      patientId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      numeroProntuario: true,
      createdAt: true,
      consultationType: true,
      diagnosis: true,
      treatment: true,
      previousConsultationId: true,
    },
  });

  return consultations.map((c) => ({
    id: c.id,
    numeroProntuario: c.numeroProntuario,
    date: c.createdAt,
    type: c.consultationType,
    diagnosis: c.diagnosis,
    treatment: c.treatment,
    previousConsultationId: c.previousConsultationId,
  }));
}

module.exports = {
  getPatientTimeline,
};
