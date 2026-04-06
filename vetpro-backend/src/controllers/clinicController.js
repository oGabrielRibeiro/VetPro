// Console replaced by logger
const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const AppError = require('../errors/AppError');
const {
  validateUploadedFileOrThrow,
  safeUnlink,
} = require('../utils/uploadSecurity');
const {
  ALLOWED_MIME_TYPES,
  MAX_SIZE_BY_MIME,
} = require('../middlewares/clinicLogoUpload');

function buildUrl(req, relative) {
  if (!relative) return null;
  if (
    relative.startsWith('private://') ||
    relative.startsWith('/uploads/clinics/')
  ) {
    return `${req.protocol}://${req.get('host')}/api/clinic/logo`;
  }
  if (relative.startsWith('http://') || relative.startsWith('https://')) {
    return relative;
  }
  return `${req.protocol}://${req.get('host')}${relative}`;
}

function resolvePrivateLogoPath(storedLogo = '') {
  const value = String(storedLogo || '');
  if (value.startsWith('private://')) {
    const relative = value.replace('private://', '');
    return path.resolve(process.cwd(), 'private_uploads', relative);
  }
  if (value.startsWith('/uploads/clinics/')) {
    const relative = value.replace(/^\/+/, '');
    return path.resolve(process.cwd(), relative);
  }
  return null;
}

async function updateLogo(req, res) {
  try {
    const { clinicId } = req.user;

    if (!req.file) {
      throw new AppError('Arquivo nao enviado.', 400, 'UPLOAD_MISSING_FILE');
    }

    await validateUploadedFileOrThrow(req.file, {
      allowedMimeTypes: ALLOWED_MIME_TYPES,
      maxSizeByMime: MAX_SIZE_BY_MIME,
    });

    const currentClinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { logoUrl: true },
    });

    const privateRef = `private://clinics/${req.file.filename}`;

    const clinic = await prisma.clinic.update({
      where: { id: clinicId },
      data: {
        logoUrl: privateRef,
      },
    });

    const oldLogoPath = resolvePrivateLogoPath(currentClinic?.logoUrl || '');
    if (oldLogoPath && oldLogoPath !== req.file.path) {
      await safeUnlink(oldLogoPath).catch(() => null);
    }

    return res.json({
      ...clinic,
      logoUrl: buildUrl(req, clinic.logoUrl),
    });
  } catch (error) {
    if (req.file?.path) {
      await safeUnlink(req.file.path).catch(() => null);
    }
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

    return res.json({
      ...clinic,
      logoUrl: buildUrl(req, clinic.logoUrl),
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ error: 'Erro ao buscar clínica' });
  }
}

async function viewLogo(req, res) {
  try {
    const { clinicId } = req.user;
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { logoUrl: true },
    });

    const logoPath = resolvePrivateLogoPath(clinic?.logoUrl || '');
    if (!logoPath || !fs.existsSync(logoPath)) {
      return res.status(404).json({ error: 'Logo nao encontrada.' });
    }

    return res.sendFile(logoPath);
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ error: 'Erro ao carregar logo.' });
  }
}

module.exports = {
  getClinic,
  updateLogo,
  viewLogo,
};
