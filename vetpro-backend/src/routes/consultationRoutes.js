const express = require("express");
const router = express.Router();
const multer = require("multer");

const auth = require("../middlewares/authMiddleware");
const consultationController = require("../controllers/consultationController");
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const fileController = require("../controllers/consultationFileController");
const fieldAudioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

router.use(auth);

router.post("/", consultationController.create);
router.get("/", consultationController.list);
router.get("/patient/:patientId", consultationController.listByPatient);
router.post(
  "/field-assist",
  authMiddleware,
  fieldAudioUpload.single("audio"),
  consultationController.fieldAssist
);
router.post("/chat-assist", authMiddleware, consultationController.chatAssist);
router.post("/refine-field", authMiddleware, consultationController.refineField);
router.get("/:id/chat-history", authMiddleware, consultationController.getChatHistory);
router.post("/:id/chat-history", authMiddleware, consultationController.appendChatHistory);
router.get("/:id", authMiddleware, consultationController.getById);
router.get("/:id/pdf", authMiddleware, consultationController.downloadPDF);
router.post("/:id/create-return",authMiddleware,consultationController.createReturn,);
router.post("/:id/files",authMiddleware,upload.single("file"),fileController.uploadFile,);
router.get("/:id/files",authMiddleware,fileController.listFiles);
router.get("/files/:fileId/view",authMiddleware,fileController.viewFile);
router.get("/files/:fileId/thumbnail",authMiddleware,fileController.viewThumbnail);
router.get("/files/compare",authMiddleware,fileController.compareFiles);
router.post("/:id/prescription",authMiddleware,consultationController.generatePrescriptionPDF);
router.get("/:id/prescription",authMiddleware,consultationController.generatePrescriptionPDF);

module.exports = router;
