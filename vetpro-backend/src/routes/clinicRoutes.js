const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/clinicLogoUpload");
const clinicController = require("../controllers/clinicController");

router.post(
  "/logo",
  authMiddleware,
  upload.single("logo"),
  clinicController.updateLogo
);

module.exports = router;
