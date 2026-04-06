const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const {
  ensureDirectory,
  getScopedUploadDir,
  buildMaxSizeByMime,
} = require('../utils/uploadSecurity');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const MAX_SIZE_BY_MIME = buildMaxSizeByMime(10 * 1024 * 1024, {
  'application/pdf': 15 * 1024 * 1024,
});
const CONSULTATION_UPLOAD_DIR = getScopedUploadDir('consultations');

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureDirectory(CONSULTATION_UPLOAD_DIR);
      cb(null, CONSULTATION_UPLOAD_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const unique = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Tipo de arquivo nao permitido.'));
    }
    const maxBytes = MAX_SIZE_BY_MIME[file.mimetype] || 0;
    req.uploadLimits = {
      ...(req.uploadLimits || {}),
      fileMaxBytes: maxBytes,
    };
    return cb(null, true);
  },
});

module.exports = {
  upload,
  ALLOWED_MIME_TYPES,
  MAX_SIZE_BY_MIME,
  CONSULTATION_UPLOAD_DIR,
};
