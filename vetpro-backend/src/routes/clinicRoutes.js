const express = require('express');

const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/clinicLogoUpload');
const clinicController = require('../controllers/clinicController');

router.use(authMiddleware);

// Rota GET para buscar dados da clínica (para testes e uso futuro)
router.get('/', clinicController.getClinic);

router.post('/logo', upload.single('logo'), clinicController.updateLogo);

module.exports = router;
