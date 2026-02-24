const express = require('express');

const router = express.Router();
const multer = require('multer');

const auth = require('../middlewares/authMiddleware');
const consultationController = require('../controllers/consultationController');
const upload = require('../middlewares/uploadMiddleware');
const fileController = require('../controllers/consultationFileController');
const {
  validate,
  createConsultationSchema,
} = require('../middlewares/validationMiddleware');

const fieldAudioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.use(auth);

router.post(
  '/',
  validate(createConsultationSchema),
  consultationController.create,
);
router.get('/', consultationController.list);
router.get('/patient/:patientId', consultationController.listByPatient);
router.post(
  '/field-assist',
  fieldAudioUpload.single('audio'),
  consultationController.fieldAssist,
);
router.post('/heuristic-parse', consultationController.heuristicParse);
router.post('/chat-assist', consultationController.chatAssist);
router.post('/refine-field', consultationController.refineField);
router.get('/:id/chat-history', consultationController.getChatHistory);
router.post('/:id/chat-history', consultationController.appendChatHistory);
router.get('/:id', consultationController.getById);
router.get('/:id/pdf', consultationController.downloadPDF);
router.post('/:id/create-return', consultationController.createReturn);
router.post('/:id/files', upload.single('file'), fileController.uploadFile);
router.get('/:id/files', fileController.listFiles);
router.get('/files/:fileId/view', fileController.viewFile);
router.get('/files/:fileId/thumbnail', fileController.viewThumbnail);
router.get('/files/compare', fileController.compareFiles);
router.post(
  '/:id/prescription',
  consultationController.generatePrescriptionPDF,
);
router.get('/:id/prescription', consultationController.generatePrescriptionPDF);

module.exports = router;
