const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');

async function attachFile(userId, consultationId, file) {
  const examType = detectExamType(file);
  const consultation = await prisma.consultation.findFirst({
    where: { id: consultationId, userId },
  });

  if (!consultation) {
    throw new Error('Consulta não encontrada');
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

function detectExamType(file) {
  const name = file.originalname.toLowerCase();
  const mime = file.mimetype.toLowerCase();

  // radiografia
  if (name.includes('rx') || name.includes('raio') || name.includes('radio')) {
    return 'RADIOGRAPHY';
  }

  // ultrassom
  if (name.includes('ultra')) {
    return 'ULTRASOUND';
  }

  // laboratório
  if (
    name.includes('hema') ||
    name.includes('sangue') ||
    name.includes('bioquim')
  ) {
    return 'LAB_RESULT';
  }

  // imagem clínica
  if (mime.startsWith('image/')) {
    return 'CLINICAL_PHOTO';
  }

  // pdf
  if (mime.includes('pdf')) {
    return 'DOCUMENT';
  }

  return 'OTHER';
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
