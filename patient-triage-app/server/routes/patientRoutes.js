const express = require('express');
const {
  createPatient,
  getPatient,
  getPatients
} = require('../controllers/patientController');
const {
  exportPatientToEhr,
  getAuditLog,
  getComplianceReadiness,
  getPatientFhirBundle
} = require('../controllers/ehrController');

const router = express.Router();

router.post('/patient', createPatient);
router.get('/patients', getPatients);
router.get('/patient/:id', getPatient);
router.get('/patient/:id/fhir', getPatientFhirBundle);
router.post('/ehr/patient/:id/export', exportPatientToEhr);
router.get('/audit', getAuditLog);
router.get('/compliance/hipaa', getComplianceReadiness);

module.exports = router;
