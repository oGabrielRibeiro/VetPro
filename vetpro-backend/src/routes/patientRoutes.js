const express = require('express');

const router = express.Router();

const auth = require('../middlewares/authMiddleware');
const controller = require('../controllers/patientController');
const timelineController = require('../controllers/patientTimelineController');
const {
  validate,
  createPatientSchema,
  updatePatientSchema,
  replacePatientSchema,
} = require('../middlewares/validationMiddleware');

router.use(auth);

router.post('/', validate(createPatientSchema), controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.put('/:id', validate(replacePatientSchema), controller.update);
router.patch('/:id', validate(updatePatientSchema), controller.update);
router.delete('/:id', controller.remove);
router.get('/:patientId/timeline', timelineController.getTimeline);

module.exports = router;
