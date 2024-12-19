const express = require('express');
const router = express.Router();
const ptttController = require('../controllers/ptttController');

//http://localhost:5000/pttt/zalo
router.post('/zalo', ptttController.zaloPay);
//http://localhost:5000/pttt/callback
router.post('/callback', ptttController.callback);

module.exports = router;