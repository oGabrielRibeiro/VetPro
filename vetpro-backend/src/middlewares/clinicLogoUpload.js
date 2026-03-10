const multer = require('multer');
const fs = require('fs');
const path = require('path');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const CLINIC_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'clinics');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdir(CLINIC_UPLOAD_DIR, { recursive: true }, (mkdirErr) => {
      if (mkdirErr) return cb(mkdirErr);
      return cb(null, CLINIC_UPLOAD_DIR);
    });
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
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
    return cb(null, true);
  },
});

module.exports = upload;
