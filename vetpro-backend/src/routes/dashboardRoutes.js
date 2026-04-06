const express = require('express');

const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const controller = require('../controllers/dashboardController');

router.use(auth);

router.get('/monthly', controller.getMonthlyData);
router.get('/business', controller.getBusinessMetrics);
router.get('/', controller.getDashboard);

module.exports = router;
