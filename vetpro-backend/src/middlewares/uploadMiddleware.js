const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/consultations");
  },
  filename: (req, file, cb) => {
    const unique = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});

const upload = multer({ storage });

module.exports = upload;
