// Console replaced by logger
const appointmentService = require('../services/appointmentService');
const logger = require('../utils/logger');

function handleError(res, error, fallbackMessage) {
  logger.error(error);
  const status = Number(error?.statusCode || 500);
  if (status >= 400 && status < 500) {
    return res.status(status).json({ error: error.message || fallbackMessage });
  }
  return res.status(500).json({ error: fallbackMessage });
}

async function list(req, res) {
  try {
    const data = await appointmentService.listAppointments(
      req.user.id,
      req.user.clinicId,
      req.query,
    );
    return res.json(data);
  } catch (error) {
    return handleError(res, error, 'Erro ao listar agendamentos.');
  }
}

async function create(req, res) {
  try {
    const appointment = await appointmentService.createAppointment(
      req.user.id,
      req.user.clinicId,
      req.body,
    );
    return res.status(201).json(appointment);
  } catch (error) {
    return handleError(res, error, 'Erro ao criar agendamento.');
  }
}

async function update(req, res) {
  try {
    const appointment = await appointmentService.updateAppointment(
      req.user.id,
      req.user.clinicId,
      req.params.id,
      req.body,
    );
    return res.json(appointment);
  } catch (error) {
    return handleError(res, error, 'Erro ao atualizar agendamento.');
  }
}

async function remove(req, res) {
  try {
    await appointmentService.deleteAppointment(
      req.user.id,
      req.user.clinicId,
      req.params.id,
    );
    return res.json({ message: 'Agendamento removido.' });
  } catch (error) {
    return handleError(res, error, 'Erro ao remover agendamento.');
  }
}

module.exports = { list, create, update, remove };
