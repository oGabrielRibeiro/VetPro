const express = require('express');

const router = express.Router();

const auth = require('../middlewares/authMiddleware');
const controller = require('../controllers/patientController');
const timelineController = require('../controllers/patientTimelineController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(auth);

router.post('/', controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.get(
  '/:patientId/timeline',
  authMiddleware,
  timelineController.getTimeline,
);

module.exports = router;
