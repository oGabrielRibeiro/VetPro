const { randomUUID } = require('crypto');
const prisma = require('../lib/prisma');

function normalizeDateOnly(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  const yyyy = parsed.getUTCFullYear();
  const mm = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function sanitizeInput(data = {}) {
  const patientId = String(data.patientId || '').trim();
  const date = normalizeDateOnly(data.date);
  const time = String(data.time || '').trim();
  const reason = String(data.reason || '').trim();
  const type = String(data.type || 'consulta').trim() || 'consulta';
  const status = String(data.status || 'agendado').trim() || 'agendado';
  const linkedConsultationId =
    String(data.linkedConsultationId || '').trim() || null;
  return { patientId, date, time, reason, type, status, linkedConsultationId };
}

async function assertPatientOwnership(userId, clinicId, patientId) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, userId, clinicId },
    select: { id: true },
  });
  if (!patient) {
    const err = new Error('Paciente nao encontrado.');
    err.statusCode = 404;
    throw err;
  }
}

async function listAppointments(userId, clinicId, filters = {}) {
  const from = normalizeDateOnly(filters.dateFrom);
  const to = normalizeDateOnly(filters.dateTo);
  const patientId = String(filters.patientId || '').trim();
  const status = String(filters.status || '').trim();

  const where = {
    userId,
    clinicId,
    ...(patientId ? { patientId } : {}),
    ...(status ? { status } : {}),
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

  return prisma.appointment.findMany({
    where,
    orderBy: [{ date: 'asc' }, { time: 'asc' }, { createdAt: 'desc' }],
  });
}

async function createAppointment(userId, clinicId, data = {}) {
  const normalized = sanitizeInput(data);
  if (
    !normalized.patientId ||
    !normalized.date ||
    !normalized.time ||
    !normalized.reason
  ) {
    const err = new Error(
      'Campos obrigatorios: patientId, date, time, reason.',
    );
    err.statusCode = 400;
    throw err;
  }
  await assertPatientOwnership(userId, clinicId, normalized.patientId);

  return prisma.appointment.create({
    data: {
      id: randomUUID(),
      userId,
      clinicId,
      patientId: normalized.patientId,
      date: new Date(`${normalized.date}T00:00:00.000Z`),
      time: normalized.time,
      reason: normalized.reason,
      type: normalized.type,
      status: normalized.status,
      linkedConsultationId: normalized.linkedConsultationId,
    },
  });
}

async function updateAppointment(userId, clinicId, id, data = {}) {
  const current = await prisma.appointment.findFirst({
    where: { id, userId, clinicId },
  });
  if (!current) {
    const err = new Error('Agendamento nao encontrado.');
    err.statusCode = 404;
    throw err;
  }

  const normalized = sanitizeInput({ ...current, ...data });
  if (
    !normalized.patientId ||
    !normalized.date ||
    !normalized.time ||
    !normalized.reason
  ) {
    const err = new Error(
      'Campos obrigatorios: patientId, date, time, reason.',
    );
    err.statusCode = 400;
    throw err;
  }
  await assertPatientOwnership(userId, clinicId, normalized.patientId);

  return prisma.appointment.update({
    where: { id: current.id },
    data: {
      patientId: normalized.patientId,
      date: new Date(`${normalized.date}T00:00:00.000Z`),
      time: normalized.time,
      reason: normalized.reason,
      type: normalized.type,
      status: normalized.status,
      linkedConsultationId: normalized.linkedConsultationId,
    },
  });
}

async function deleteAppointment(userId, clinicId, id) {
  const current = await prisma.appointment.findFirst({
    where: { id, userId, clinicId },
    select: { id: true },
  });
  if (!current) {
    const err = new Error('Agendamento nao encontrado.');
    err.statusCode = 404;
    throw err;
  }
  await prisma.appointment.delete({ where: { id: current.id } });
}

module.exports = {
  listAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};
