// Console replaced by logger
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

function buildUrl(req, relative) {
  if (!relative) return null;
  if (relative.startsWith('http://') || relative.startsWith('https://')) {
    return relative;
  }
  return `${req.protocol}://${req.get('host')}${relative}`;
}

async function updateLogo(req, res) {
  try {
    const { clinicId } = req.user;

    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não enviado' });
    }

    const clinic = await prisma.clinic.update({
      where: { id: clinicId },
      data: {
        logoUrl: `/uploads/clinics/${req.file.filename}`,
      },
    });

    return res.json({
      ...clinic,
      logoUrl: buildUrl(req, clinic.logoUrl),
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar logo' });
  }
}

async function getClinic(req, res) {
  try {
    const { clinicId } = req.user;

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      return res.status(404).json({ error: 'Clínica não encontrada' });
    }

    return res.json(clinic);
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ error: 'Erro ao buscar clínica' });
  }
}

module.exports = {
  getClinic,
  updateLogo,
};
