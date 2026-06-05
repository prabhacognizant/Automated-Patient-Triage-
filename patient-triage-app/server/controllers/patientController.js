const { recordAuditEvent } = require('../config/auditLog');
const { findPatientById, findPatients, insertPatient } = require('../config/db');
const { buildPatient } = require('../models/Patient');

async function createPatient(req, res, next) {
  try {
    const { errors, patient } = buildPatient(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Patient intake validation failed.',
        errors
      });
    }

    const savedPatient = await insertPatient(patient);
    await recordAuditEvent(req, {
      eventType: 'PATIENT_INTAKE_CREATED',
      patientId: savedPatient.id,
      details: {
        triageLevel: savedPatient.triageLevel,
        privacyAcknowledged: savedPatient.privacyAcknowledged
      }
    });

    return res.status(201).json({
      message: 'Patient intake saved successfully.',
      patient: savedPatient,
      agentPayload: savedPatient.agentPayload,
      emergencyMessage: savedPatient.emergencyMessage
    });
  } catch (error) {
    return next(error);
  }
}

async function getPatients(req, res, next) {
  try {
    const patients = await findPatients();
    await recordAuditEvent(req, {
      eventType: 'PATIENT_LIST_VIEWED',
      details: {
        recordCount: patients.length,
        minimumNecessaryView: true
      }
    });

    return res.json({ patients });
  } catch (error) {
    return next(error);
  }
}

async function getPatient(req, res, next) {
  try {
    const patient = await findPatientById(req.params.id);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    await recordAuditEvent(req, {
      eventType: 'PATIENT_RECORD_VIEWED',
      patientId: patient.id,
      details: {
        triageLevel: patient.triageLevel
      }
    });

    return res.json({ patient });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createPatient,
  getPatient,
  getPatients
};
