const { getAuditEvents, recordAuditEvent } = require('../config/auditLog');
const { findPatientById } = require('../config/db');
const { createFhirBundle } = require('../models/FhirBundle');

const hipaaReadiness = {
  disclaimer: 'This demo includes HIPAA-aligned safeguards, but full HIPAA compliance requires organizational policies, risk analysis, BAAs, workforce training, access governance, and production security controls.',
  safeguards: [
    {
      area: 'Privacy Rule',
      control: 'Minimum necessary access',
      implementation: 'Dashboard exposes clinical review data only, while audit logs avoid storing free-text PHI.'
    },
    {
      area: 'Privacy Rule',
      control: 'Notice and acknowledgement',
      implementation: 'Patient intake displays a notice before submission and stores patient privacy acknowledgement metadata.'
    },
    {
      area: 'Security Rule',
      control: 'Audit controls',
      implementation: 'Create, view, FHIR export, and EHR export actions are recorded in a local audit log.'
    },
    {
      area: 'Security Rule',
      control: 'Transmission readiness',
      implementation: 'EHR export uses FHIR Bundle payloads and supports bearer-token forwarding when a real FHIR base URL is configured.'
    },
    {
      area: 'Administrative safeguards',
      control: 'Role-aware review',
      implementation: 'Requests can send X-Actor and X-Role headers so a real identity provider can be connected later.'
    }
  ],
  references: [
    {
      label: 'HHS HIPAA Privacy Rule',
      url: 'https://www.hhs.gov/hipaa/for-professionals/privacy/index.html'
    },
    {
      label: 'HHS HIPAA Security Rule',
      url: 'https://www.hhs.gov/hipaa/for-professionals/security/index.html'
    },
    {
      label: 'HL7 FHIR R4 Bundle',
      url: 'https://hl7.org/fhir/R4/bundle.html'
    }
  ]
};

async function getComplianceReadiness(req, res, next) {
  try {
    await recordAuditEvent(req, {
      eventType: 'COMPLIANCE_READINESS_VIEWED',
      details: { standard: 'HIPAA/FHIR readiness' }
    });
    return res.json({ hipaaReadiness });
  } catch (error) {
    return next(error);
  }
}

async function getPatientFhirBundle(req, res, next) {
  try {
    const patient = await findPatientById(req.params.id);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const bundle = createFhirBundle(patient);
    await recordAuditEvent(req, {
      eventType: 'FHIR_BUNDLE_VIEWED',
      patientId: patient.id,
      details: {
        bundleType: bundle.type,
        resources: bundle.entry.map((entry) => entry.resource.resourceType)
      }
    });

    return res.json({
      message: 'FHIR R4 bundle generated successfully.',
      bundle
    });
  } catch (error) {
    return next(error);
  }
}

async function exportPatientToEhr(req, res, next) {
  try {
    const patient = await findPatientById(req.params.id);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const bundle = createFhirBundle(patient);
    const ehrMode = process.env.EHR_MODE || 'mock';
    const ehrBaseUrl = process.env.EHR_FHIR_BASE_URL || '';
    const receipt = {
      exportId: `ehr-${patient.id}-${Date.now()}`,
      patientId: patient.id,
      mode: ehrMode,
      target: ehrBaseUrl || 'Mock EHR adapter',
      status: 'accepted',
      exportedAt: new Date().toISOString()
    };

    if (ehrMode === 'live') {
      if (!ehrBaseUrl) {
        return res.status(400).json({
          message: 'EHR_MODE is live, but EHR_FHIR_BASE_URL is not configured.'
        });
      }

      const headers = {
        'Content-Type': 'application/fhir+json'
      };

      if (process.env.EHR_ACCESS_TOKEN) {
        headers.Authorization = `Bearer ${process.env.EHR_ACCESS_TOKEN}`;
      }

      const ehrResponse = await fetch(ehrBaseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(bundle)
      });

      receipt.status = ehrResponse.ok ? 'accepted' : 'rejected';
      receipt.httpStatus = ehrResponse.status;

      if (!ehrResponse.ok) {
        const body = await ehrResponse.text();
        await recordAuditEvent(req, {
          eventType: 'EHR_EXPORT_FAILED',
          patientId: patient.id,
          outcome: 'failure',
          details: { httpStatus: ehrResponse.status }
        });

        return res.status(502).json({
          message: 'The configured EHR FHIR server rejected the export.',
          receipt,
          responsePreview: body.slice(0, 500)
        });
      }
    }

    await recordAuditEvent(req, {
      eventType: 'EHR_EXPORT_COMPLETED',
      patientId: patient.id,
      details: {
        mode: receipt.mode,
        target: receipt.target,
        resources: bundle.entry.map((entry) => entry.resource.resourceType)
      }
    });

    return res.json({
      message: ehrMode === 'live'
        ? 'Patient intake exported to configured FHIR server.'
        : 'Patient intake exported through the mock EHR adapter.',
      receipt,
      bundle
    });
  } catch (error) {
    return next(error);
  }
}

async function getAuditLog(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 50;
    const auditEvents = await getAuditEvents(limit);
    return res.json({ auditEvents });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  exportPatientToEhr,
  getAuditLog,
  getComplianceReadiness,
  getPatientFhirBundle
};
