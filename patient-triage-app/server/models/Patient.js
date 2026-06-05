const { randomUUID } = require('crypto');

const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say', 'Other'];
const SEVERITY_LEVELS = ['Low', 'Medium', 'High'];

const RED_FLAG_PATTERNS = [
  /crushing\s+(chest\s+)?pain/i,
  /severe\s+chest\s+pain/i,
  /chest\s+pain.*short(ness)?\s+of\s+breath/i,
  /short(ness)?\s+of\s+breath.*chest\s+pain/i,
  /sudden\s+(weakness|numbness)/i,
  /one\s+side\s+of\s+(the\s+)?body/i,
  /difficulty\s+speaking/i,
  /trouble\s+speaking/i,
  /severe\s+sudden\s+short(ness)?\s+of\s+breath/i,
  /sudden\s+blinding\s+headache/i,
  /worst\s+headache/i,
  /severe\s+allergic\s+reaction/i,
  /swelling\s+(of\s+)?(lips|tongue|face)/i,
  /blue\s+lips/i,
  /fainted|fainting/i,
  /seizure/i,
  /suicidal|self\s*harm/i
];

const MILD_SYMPTOM_PATTERNS = [
  /mild/i,
  /runny\s+nose/i,
  /sore\s+throat/i,
  /minor\s+headache/i,
  /mild\s+cough/i,
  /routine\s+check/i,
  /medication\s+refill/i
];

function normalizeText(value, maxLength = 180) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeLongText(value, maxLength = 1000) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

function normalizeChoice(value, allowedValues) {
  const rawValue = normalizeText(value, 40).toLowerCase();
  return allowedValues.find((allowed) => allowed.toLowerCase() === rawValue) || '';
}

function normalizeSymptoms(value) {
  const rawSymptoms = Array.isArray(value)
    ? value
    : String(value || '').split(/[,;\n]+/);

  const symptoms = rawSymptoms
    .map((symptom) => normalizeText(symptom, 120))
    .filter(Boolean);

  return [...new Set(symptoms)].slice(0, 15);
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  const numeric = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  return /^[+()\-\s\d]{7,20}$/.test(phone);
}

function validatePatient(patient) {
  const errors = [];

  if (!patient.fullName) {
    errors.push('Full name is required.');
  }

  if (!Number.isInteger(patient.age) || patient.age < 0 || patient.age > 120) {
    errors.push('Age must be a whole number between 0 and 120.');
  }

  if (!patient.gender) {
    errors.push('Gender is required.');
  }

  if (!patient.phone || !validatePhone(patient.phone)) {
    errors.push('Phone number is required and must contain 7 to 20 valid characters.');
  }

  if (!patient.email || !validateEmail(patient.email)) {
    errors.push('A valid email address is required.');
  }

  if (!patient.chiefComplaint && patient.symptoms.length === 0) {
    errors.push('At least one symptom or chief complaint is required.');
  }

  if (!patient.severityLevel) {
    errors.push('Severity level is required.');
  }

  if (!patient.privacyAcknowledged) {
    errors.push('Privacy notice acknowledgement is required before submitting intake.');
  }

  if (patient.temperature !== null && (Number.isNaN(patient.temperature) || patient.temperature < 90 || patient.temperature > 115)) {
    errors.push('Temperature must be a Fahrenheit value between 90 and 115 when provided.');
  }

  if (patient.heartRate !== null && (Number.isNaN(patient.heartRate) || patient.heartRate < 30 || patient.heartRate > 240)) {
    errors.push('Heart rate must be between 30 and 240 when provided.');
  }

  if (patient.bloodPressure && !/^\d{2,3}\s*\/\s*\d{2,3}$/.test(patient.bloodPressure)) {
    errors.push('Blood pressure must look like 120/80 when provided.');
  }

  return errors;
}

function assessTriage(patient) {
  const narrative = [
    patient.chiefComplaint,
    patient.symptoms.join(' '),
    patient.medicalHistory
  ].join(' ');

  const reasons = [];
  const hasRedFlag = RED_FLAG_PATTERNS.some((pattern) => pattern.test(narrative));

  if (hasRedFlag) {
    reasons.push('Potential red-flag symptom reported.');
  }

  if (patient.temperature !== null && patient.temperature > 102) {
    reasons.push('Temperature is greater than 102 F.');
  }

  if (patient.heartRate !== null && patient.heartRate > 120) {
    reasons.push('Heart rate is greater than 120 bpm.');
  }

  if (patient.severityLevel === 'High') {
    reasons.push('Patient selected high severity.');
  }

  if (reasons.length > 0) {
    return buildTriageResult(patient, 'HIGH', reasons, hasRedFlag);
  }

  const stableVitals = (
    (patient.temperature === null || patient.temperature <= 100.4) &&
    (patient.heartRate === null || patient.heartRate <= 100)
  );
  const mildLanguage = MILD_SYMPTOM_PATTERNS.some((pattern) => pattern.test(narrative));

  if (patient.severityLevel === 'Low' && stableVitals && mildLanguage) {
    return buildTriageResult(patient, 'LOW', ['Mild symptoms and stable available vitals.'], false);
  }

  if (patient.severityLevel === 'Low' && stableVitals) {
    return buildTriageResult(patient, 'LOW', ['Low reported severity and stable available vitals.'], false);
  }

  return buildTriageResult(patient, 'MEDIUM', ['Symptoms require clinician review before routine visit flow.'], false);
}

function buildTriageResult(patient, triageLevel, reasons, emergencyProtocol) {
  const metadataByLevel = {
    HIGH: {
      suggested_priority: 'EMERGENT',
      ui_theme_color: 'rose-50'
    },
    MEDIUM: {
      suggested_priority: 'URGENT',
      ui_theme_color: 'amber-50'
    },
    LOW: {
      suggested_priority: 'NON-URGENT',
      ui_theme_color: 'slate-50'
    }
  };

  const triageMetadata = metadataByLevel[triageLevel];
  const patientIntakeSummary = {
    chief_complaint: patient.chiefComplaint || patient.symptoms.join(', '),
    reported_vitals: {
      heart_rate: patient.heartRate === null ? null : `${patient.heartRate} bpm`,
      temperature: patient.temperature === null ? null : `${patient.temperature} F`,
      blood_pressure: patient.bloodPressure || null
    }
  };
  const physicianSbarNote = buildSbarNote(patient, triageMetadata.suggested_priority, reasons, emergencyProtocol);

  return {
    triageLevel,
    triageMetadata,
    triageReasons: reasons,
    emergencyProtocol,
    emergencyMessage: emergencyProtocol
      ? 'CRITICAL ALERT: Please stop using this application and call 911 or proceed to the nearest Emergency Room immediately.'
      : '',
    patientIntakeSummary,
    physicianSbarNote,
    agentPayload: {
      triage_metadata: triageMetadata,
      patient_intake_summary: patientIntakeSummary,
      physician_sbar_note: physicianSbarNote
    }
  };
}

function buildSbarNote(patient, suggestedPriority, reasons, emergencyProtocol) {
  const symptomText = patient.symptoms.length > 0
    ? patient.symptoms.join(', ')
    : patient.chiefComplaint;
  const historyText = patient.medicalHistory || 'No medical history reported.';
  const medicationText = patient.currentMedications || 'No current medications reported.';
  const durationText = patient.symptomDuration || 'Duration not reported.';
  const vitalParts = [
    patient.temperature === null ? '' : `temperature ${patient.temperature} F`,
    patient.bloodPressure ? `blood pressure ${patient.bloodPressure}` : '',
    patient.heartRate === null ? '' : `heart rate ${patient.heartRate} bpm`
  ].filter(Boolean);
  const vitalText = vitalParts.length > 0 ? vitalParts.join(', ') : 'No vitals reported.';
  const recommendation = emergencyProtocol
    ? 'R: Stop virtual intake and direct the patient to call 911 or proceed to the nearest Emergency Room immediately.'
    : suggestedPriority === 'EMERGENT'
      ? 'R: Prioritize immediate clinician evaluation and repeat vital assessment on arrival.'
      : suggestedPriority === 'URGENT'
        ? 'R: Route for timely provider review before routine visit flow.'
        : 'R: Continue routine intake and provider review as scheduled.';

  return {
    situation: `S: ${patient.fullName} reports ${symptomText || 'symptoms not specified'} with ${suggestedPriority} preliminary triage priority.`,
    background: `B: Symptoms duration: ${durationText}. Medical history: ${historyText} Current medications: ${medicationText}`,
    assessment: `A: Available vitals include ${vitalText}. Rule-based triage reasons: ${reasons.join(' ')}`,
    recommendation
  };
}

function buildPatient(payload) {
  const symptoms = normalizeSymptoms(payload.symptoms);
  const patient = {
    id: randomUUID(),
    fullName: normalizeText(payload.fullName, 120),
    age: Number(payload.age),
    gender: normalizeChoice(payload.gender, GENDERS),
    phone: normalizeText(payload.phone, 30),
    email: normalizeText(payload.email, 120).toLowerCase(),
    chiefComplaint: normalizeLongText(payload.chiefComplaint, 300),
    symptoms,
    symptomDuration: normalizeText(payload.symptomDuration, 140),
    medicalHistory: normalizeLongText(payload.medicalHistory, 1000),
    currentMedications: normalizeLongText(payload.currentMedications, 1000),
    temperature: parseOptionalNumber(payload.temperature),
    bloodPressure: normalizeText(payload.bloodPressure, 40),
    heartRate: parseOptionalNumber(payload.heartRate),
    severityLevel: normalizeChoice(payload.severityLevel, SEVERITY_LEVELS),
    privacyAcknowledged: Boolean(payload.privacyAcknowledged),
    privacyAcknowledgedAt: payload.privacyAcknowledged ? new Date().toISOString() : null,
    dataUseConsent: normalizeChoice(payload.dataUseConsent || 'Treatment', ['Treatment', 'Declined']),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const errors = validatePatient(patient);

  if (errors.length > 0) {
    return { errors };
  }

  const triage = assessTriage(patient);

  return {
    errors: [],
    patient: {
      ...patient,
      ...triage
    }
  };
}

module.exports = {
  buildPatient,
  RED_FLAG_PATTERNS
};
