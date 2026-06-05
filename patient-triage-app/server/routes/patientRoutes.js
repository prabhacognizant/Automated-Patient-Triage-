const express = require('express');
const {
  createPatient,
  getPatient,
  getPatients
} = require('../controllers/patientController');

const router = express.Router();

router.post('/patient', createPatient);
router.get('/patients', getPatients);
router.get('/patient/:id', getPatient);

module.exports = router;
