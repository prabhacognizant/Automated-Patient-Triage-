function createResourceId(prefix, patientId, suffix = '') {
  return `${prefix}-${patientId}${suffix ? `-${suffix}` : ''}`.replace(/[^A-Za-z0-9-]/g, '-');
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { given: ['Unknown'], family: 'Patient' };
  }

  if (parts.length === 1) {
    return { given: [parts[0]], family: 'Patient' };
  }

  return {
    given: parts.slice(0, -1),
    family: parts[parts.length - 1]
  };
}

function mapGender(gender) {
  const normalized = String(gender || '').toLowerCase();

  if (normalized === 'female') {
    return 'female';
  }

  if (normalized === 'male') {
    return 'male';
  }

  return 'unknown';
}

function createObservation(patient, suffix, display, code, value, unit, system = 'http://unitsofmeasure.org') {
  const observation = {
    resourceType: 'Observation',
    id: createResourceId('observation', patient.id, suffix),
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code,
          display
        }
      ],
      text: display
    },
    subject: {
      reference: `Patient/${createResourceId('patient', patient.id)}`
    },
    effectiveDateTime: patient.createdAt
  };

  if (value !== null && value !== undefined && value !== '') {
    observation.valueQuantity = {
      value,
      unit,
      system,
      code: unit
    };
  } else {
    observation.dataAbsentReason = {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/data-absent-reason',
          code: 'unknown',
          display: 'Unknown'
        }
      ]
    };
  }

  return observation;
}

function createBloodPressureObservation(patient) {
  const [systolic, diastolic] = String(patient.bloodPressure || '')
    .split('/')
    .map((value) => Number(value.trim()));

  const resource = createObservation(
    patient,
    'blood-pressure',
    'Blood pressure panel',
    '85354-9',
    null,
    'mmHg'
  );

  if (Number.isFinite(systolic) && Number.isFinite(diastolic)) {
    delete resource.dataAbsentReason;
    resource.component = [
      {
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '8480-6',
              display: 'Systolic blood pressure'
            }
          ]
        },
        valueQuantity: {
          value: systolic,
          unit: 'mmHg',
          system: 'http://unitsofmeasure.org',
          code: 'mm[Hg]'
        }
      },
      {
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '8462-4',
              display: 'Diastolic blood pressure'
            }
          ]
        },
        valueQuantity: {
          value: diastolic,
          unit: 'mmHg',
          system: 'http://unitsofmeasure.org',
          code: 'mm[Hg]'
        }
      }
    ];
  }

  return resource;
}

function createQuestionnaireResponse(patient) {
  return {
    resourceType: 'QuestionnaireResponse',
    id: createResourceId('triage-intake', patient.id),
    status: 'completed',
    authored: patient.createdAt,
    subject: {
      reference: `Patient/${createResourceId('patient', patient.id)}`
    },
    item: [
      {
        linkId: 'chief-complaint',
        text: 'Chief complaint',
        answer: [{ valueString: patient.chiefComplaint || patient.symptoms.join(', ') }]
      },
      {
        linkId: 'symptoms',
        text: 'Reported symptoms',
        answer: [{ valueString: patient.symptoms.join(', ') }]
      },
      {
        linkId: 'duration',
        text: 'Symptom duration',
        answer: [{ valueString: patient.symptomDuration || 'Not reported' }]
      },
      {
        linkId: 'medical-history',
        text: 'Medical history',
        answer: [{ valueString: patient.medicalHistory || 'Not reported' }]
      },
      {
        linkId: 'current-medications',
        text: 'Current medications',
        answer: [{ valueString: patient.currentMedications || 'Not reported' }]
      },
      {
        linkId: 'triage-priority',
        text: 'Rule-based triage priority',
        answer: [{ valueString: `${patient.triageLevel} - ${patient.triageMetadata.suggested_priority}` }]
      },
      {
        linkId: 'sbar-note',
        text: 'Physician SBAR handoff',
        answer: [{ valueString: Object.values(patient.physicianSbarNote).join('\n') }]
      }
    ]
  };
}

function createFhirBundle(patient) {
  const name = splitName(patient.fullName);
  const patientResource = {
    resourceType: 'Patient',
    id: createResourceId('patient', patient.id),
    identifier: [
      {
        system: 'urn:patient-triage-app:patient-id',
        value: patient.id
      }
    ],
    name: [
      {
        use: 'official',
        given: name.given,
        family: name.family
      }
    ],
    gender: mapGender(patient.gender),
    telecom: [
      {
        system: 'phone',
        value: patient.phone,
        use: 'mobile'
      },
      {
        system: 'email',
        value: patient.email,
        use: 'home'
      }
    ]
  };
  const observations = [
    createObservation(patient, 'temperature', 'Body temperature', '8310-5', patient.temperature, '[degF]'),
    createObservation(patient, 'heart-rate', 'Heart rate', '8867-4', patient.heartRate, '/min'),
    createBloodPressureObservation(patient)
  ];
  const questionnaireResponse = createQuestionnaireResponse(patient);
  const resources = [patientResource, ...observations, questionnaireResponse];

  return {
    resourceType: 'Bundle',
    id: createResourceId('bundle', patient.id),
    type: 'transaction',
    timestamp: new Date().toISOString(),
    entry: resources.map((resource) => ({
      fullUrl: `urn:uuid:${resource.id}`,
      resource,
      request: {
        method: 'PUT',
        url: `${resource.resourceType}/${resource.id}`
      }
    }))
  };
}

module.exports = {
  createFhirBundle
};
