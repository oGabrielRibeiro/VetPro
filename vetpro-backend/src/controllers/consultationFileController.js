const path = require('path');
const fs = require('fs');
const fileService = require('../services/consultationFileService');

async function viewFile(req, res) {
  try {
    const { fileId } = req.params;

    const file = await fileService.getFileById(req.user.id, fileId);

    if (!file) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    res.setHeader('Content-Type', file.mimeType);

    const stream = fs.createReadStream(file.path);
    stream.pipe(res);
    return undefined; // explicit return to satisfy consistent-return
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao visualizar arquivo' });
  }
}

async function uploadFile(req, res) {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const file = await fileService.attachFile(req.user.id, id, req.file);

    return res.status(201).json(file);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: 'Nao foi possivel anexar o arquivo. Tente novamente.' });
  }
}

async function listFiles(req, res) {
  try {
    const { id } = req.params;

    const files = await fileService.listFilesGrouped(req.user.id, id);

    return res.json(files);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: 'Nao foi possivel carregar os anexos desta consulta.' });
  }
}

async function viewThumbnail(req, res) {
  try {
    const { fileId } = req.params;

    const file = await fileService.getFileById(req.user.id, fileId);

    if (!file || !file.thumbnailPath) {
      return res.status(404).json({ error: 'Miniatura não encontrada' });
    }

    return res.sendFile(path.resolve(file.thumbnailPath));
  } catch (error) {
    // log opcional
    return res.status(500).json({ error: 'Erro ao carregar miniatura' });
  }
}

async function compareFiles(req, res) {
  try {
    const { fileA, fileB } = req.query;

    if (!fileA || !fileB) {
      return res.status(400).json({ error: 'Dois arquivos são necessários' });
    }

    const file1 = await fileService.getFileById(req.user.id, fileA);
    const file2 = await fileService.getFileById(req.user.id, fileB);

    if (!file1 || !file2) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    if (file1.examType !== file2.examType) {
      return res.status(400).json({
        error: 'Arquivos precisam ser do mesmo tipo para comparação',
      });
    }

    return res.json({
      examType: file1.examType,
      fileA: {
        id: file1.id,
        originalName: file1.originalName,
        viewUrl: `/api/consultations/files/${file1.id}/view`,
      },
      fileB: {
        id: file2.id,
        originalName: file2.originalName,
        viewUrl: `/api/consultations/files/${file2.id}/view`,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao comparar arquivos' });
  }
}

module.exports = {
  uploadFile,
  listFiles,
  compareFiles,
  viewFile,
  viewThumbnail,
};
