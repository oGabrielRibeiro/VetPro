const patientService = require('../services/patientService');
const websocketService = require('../services/websocketService');
const logger = require('../utils/logger');

function handlePatientError(res, error, fallbackMessage) {
  logger.error(error.message, { stack: error.stack });
  const statusCode = Number(error?.statusCode || 500);
  if (statusCode >= 400 && statusCode < 500) {
    return res
      .status(statusCode)
      .json({ error: error.message || fallbackMessage });
  }
  return res.status(500).json({ error: fallbackMessage });
}

async function create(req, res) {
  try {
    const patient = await patientService.createPatient(
      req.user.id,
      req.user.clinicId,
      req.body,
    );
    websocketService.notifyPatientUpdate(req.user.clinicId, patient, 'created');
    return res.status(201).json(patient);
  } catch (error) {
    return handlePatientError(res, error, 'Erro ao criar paciente');
  }
}

async function list(req, res) {
  try {
    const result = await patientService.getPatients(req.user.id, req.query);
    return res.json(result);
  } catch (error) {
    return handlePatientError(res, error, 'Erro ao listar pacientes');
  }
}

async function getById(req, res) {
  try {
    const patient = await patientService.getPatientById(
      req.user.id,
      req.params.id,
    );
    if (!patient) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }
    return res.json(patient);
  } catch (error) {
    return handlePatientError(res, error, 'Erro ao buscar paciente');
  }
}

async function update(req, res) {
  try {
    const patient = await patientService.updatePatient(
      req.user.id,
      req.params.id,
      req.body,
    );
    websocketService.notifyPatientUpdate(req.user.clinicId, patient, 'updated');
    return res.json({ message: 'Paciente atualizado' });
  } catch (error) {
    return handlePatientError(res, error, 'Erro ao atualizar paciente');
  }
}

async function remove(req, res) {
  try {
    await patientService.deletePatient(req.user.id, req.params.id);
    websocketService.notifyPatientUpdate(
      req.user.clinicId,
      { id: req.params.id },
      'deleted',
    );
    return res.json({ message: 'Paciente removido' });
  } catch (error) {
    return handlePatientError(res, error, 'Erro ao remover paciente');
  }
}

module.exports = { create, list, getById, update, remove };
