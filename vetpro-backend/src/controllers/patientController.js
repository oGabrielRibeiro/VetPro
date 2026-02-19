const patientService = require("../services/patientService");

async function create(req, res) {
  try {
    const patient = await patientService.createPatient(
      req.user.id,
      req.user.clinicId,
      req.body
    );
    res.status(201).json(patient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar paciente" });
  }
}

async function list(req, res) {
  const result = await patientService.getPatients(
    req.user.id,
    req.query
  );

  res.json(result);
}

async function getById(req, res) {
  const patient = await patientService.getPatientById(
    req.user.id,
    req.params.id
  );

  if (!patient)
    return res.status(404).json({ error: "Paciente não encontrado" });

  res.json(patient);
}

async function update(req, res) {
  await patientService.updatePatient(
    req.user.id,
    req.params.id,
    req.body
  );
  res.json({ message: "Paciente atualizado" });
}

async function remove(req, res) {
  await patientService.deletePatient(
    req.user.id,
    req.params.id
  );
  res.json({ message: "Paciente removido" });
}

module.exports = { create, list, getById, update, remove };
