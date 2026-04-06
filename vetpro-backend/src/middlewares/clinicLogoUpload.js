const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const {
  ensureDirectory,
  getScopedUploadDir,
  buildMaxSizeByMime,
} = require('../utils/uploadSecurity');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BY_MIME = buildMaxSizeByMime(5 * 1024 * 1024, {
  'application/pdf': 0,
});
const CLINIC_UPLOAD_DIR = getScopedUploadDir('clinics');

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureDirectory(CLINIC_UPLOAD_DIR);
      cb(null, CLINIC_UPLOAD_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const randomName = crypto.randomBytes(16).toString('hex');
    cb(null, randomName + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Formato de logo nao suportado.'));
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
  CLINIC_UPLOAD_DIR,
};
