const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/consultations');
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
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Tipo de arquivo nao permitido.'));
    }
    return cb(null, true);
  },
});

module.exports = upload;
