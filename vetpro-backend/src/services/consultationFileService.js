const sharp = require('sharp');
const path = require('path');
const prisma = require('../lib/prisma');

// Detecta o tipo de exame a partir do nome/mimetype
function detectExamType(file) {
  const name = String(file.originalname || '').toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();

  if (name.includes('rx') || name.includes('raio') || name.includes('radio')) {
    return 'RADIOGRAPHY';
  }
  if (name.includes('ultra') || name.includes('usg')) {
    return 'ULTRASOUND';
  }
  if (
    name.includes('hema') ||
    name.includes('sangue') ||
    name.includes('bioquim') ||
    name.includes('lab')
  ) {
    return 'LAB_RESULT';
  }
  if (mime.startsWith('image/')) {
    return 'CLINICAL_PHOTO';
  }
  if (mime.includes('pdf')) {
    return 'DOCUMENT';
  }
  return 'OTHER';
}

async function attachFile(userId, consultationId, file) {
  const examType = detectExamType(file);
  const maxClinicalPhotos = Number(process.env.MAX_CLINICAL_PHOTOS || 8);
  const consultation = await prisma.consultation.findFirst({
    where: { id: consultationId, userId },
  });

  if (!consultation) {
    throw new Error('Consulta não encontrada');
  }

  if (file.mimetype.startsWith('image/')) {
    const currentCount = await prisma.consultationFile.count({
      where: {
        consultationId,
        consultation: { userId },
        examType: 'CLINICAL_PHOTO',
      },
    });
    if (
      Number.isFinite(maxClinicalPhotos) &&
      currentCount >= maxClinicalPhotos
    ) {
      throw new Error('LIMIT_CLINICAL_PHOTOS');
    }
  }

  let thumbnailPath = null;

  // -----------------------------
  // GERAR MINIATURA SE FOR IMAGEM
  // -----------------------------
  if (file.mimetype.startsWith('image/')) {
    const thumbName = `thumb-${file.filename}`;
    const thumbFullPath = path.join(
      'uploads/consultations/thumbnails',
      thumbName,
    );

    await sharp(file.path).resize(200).toFile(thumbFullPath);

    thumbnailPath = thumbFullPath;
  }

  return prisma.consultationFile.create({
    data: {
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      thumbnailPath,
      examType,
      consultationId,
    },
  });
}

async function listFiles(userId, consultationId) {
  return prisma.consultationFile.findMany({
    where: {
      consultationId,
      consultation: { userId },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function getFileById(userId, fileId) {
  return prisma.consultationFile.findFirst({
    where: {
      id: fileId,
      consultation: { userId },
    },
  });
}

async function listFilesGrouped(userId, consultationId) {
  const files = await prisma.consultationFile.findMany({
    where: {
      consultationId,
      consultation: { userId },
    },
    orderBy: { createdAt: 'desc' },
  });

  // estrutura agrupada clínica
  const grouped = {
    radiography: [],
    ultrasound: [],
    labResults: [],
    clinicalPhotos: [],
    documents: [],
    other: [],
  };

  for (const file of files) {
    switch (file.examType) {
      case 'RADIOGRAPHY':
        grouped.radiography.push(file);
        break;

      case 'ULTRASOUND':
        grouped.ultrasound.push(file);
        break;

      case 'LAB_RESULT':
        grouped.labResults.push(file);
        break;

      case 'CLINICAL_PHOTO':
        grouped.clinicalPhotos.push(file);
        break;

      case 'DOCUMENT':
        grouped.documents.push(file);
        break;

      default:
        grouped.other.push(file);
    }
  }

  return grouped;
}

module.exports = {
  attachFile,
  listFiles,
  listFilesGrouped,
  getFileById,
};
