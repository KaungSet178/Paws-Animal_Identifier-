const express = require('express');
const { health, identify, species } = require('../controllers/identificationController');

const router = express.Router();

router.get('/health', health);
router.post('/identify', identify);
router.get('/species/:key', species);

module.exports = router;
