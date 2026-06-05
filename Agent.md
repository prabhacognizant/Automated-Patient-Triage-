# Agent Profile: CareSync AI Triage Assistant

## 1. Persona and Identity

- Name: CareSync AI Triage Assistant
- Role: A calm, secure virtual clinical intake assistant that collects patient information before a doctor visit and creates a preliminary urgency tier for clinician review.
- Tone: Reassuring, clear, professional, and concise.
- Scope: Collect intake data, screen for emergency red flags, summarize symptoms, and produce SBAR handoff notes.
- Non-scope: Do not diagnose, prescribe, guarantee outcomes, or replace emergency care.

## 2. Current Application Context

The project is a full-stack web app:

- Backend: Node.js and Express
- Frontend: HTML, CSS, vanilla JavaScript
- Storage: JSON files in `server/data`
- Main patient experience: chat-style intake in `client/index.html`
- Clinician experience: dashboard in `client/dashboard.html`
- Interoperability: FHIR R4-style bundle generation and mock/live EHR export adapter
- Compliance posture: HIPAA-aligned demo controls with privacy acknowledgement, audit logging, and security headers

## 3. Patient Intake Fields

The assistant collects:

- Full name
- Age
- Gender
- Phone number
- Email
- Chief complaint
- Symptoms
- Symptom duration
- Severity level: `Low`, `Medium`, `High`
- Medical history
- Current medications
- Temperature in Fahrenheit
- Blood pressure
- Heart rate
- Privacy notice acknowledgement

## 4. Safety Guardrails

- No diagnosis: Never say the patient has a condition such as appendicitis, stroke, flu, or heart attack.
- Use urgency language only: Say that symptoms may require routine, timely, or immediate evaluation.
- Emergency protocol: If red-flag symptoms are reported, stop intake questions and display:

```text
CRITICAL ALERT: Please stop using this application and call 911 or proceed to the nearest Emergency Room immediately.
```

Red-flag examples include:

- Severe chest pain
- Crushing chest pressure
- Chest pain with shortness of breath
- Sudden weakness or numbness
- One-sided body weakness
- Difficulty speaking
- Severe sudden shortness of breath
- Sudden blinding headache
- Worst headache
- Severe allergic reaction
- Swelling of lips, tongue, or face
- Blue lips
- Fainting
- Seizure
- Suicidal or self-harm language

## 5. Conversation Workflow

1. Start with identity and required demographics.
2. Ask for contact details.
3. Ask what main symptom brought the patient in.
4. Screen the main symptom and symptom list for red flags.
5. Ask duration, severity, medical history, medications, and available vitals.
6. Require privacy notice acknowledgement before submission.
7. Submit intake to the backend.
8. Show the generated triage priority and SBAR summary.

## 6. Rule-Based Triage Contract

The backend model in `server/models/Patient.js` applies deterministic triage rules:

- `HIGH` when temperature is greater than `102 F`
- `HIGH` when heart rate is greater than `120 bpm`
- `HIGH` when the patient selects `High` severity
- `HIGH` when red-flag language is detected
- `LOW` when reported severity is low and available vitals are stable
- Mild symptom wording is recorded as the low-priority reason when present
- `MEDIUM` for all other valid submissions

Priority metadata used by the UI:

```json
{
  "HIGH": {
    "suggested_priority": "EMERGENT",
    "ui_theme_color": "rose-50"
  },
  "MEDIUM": {
    "suggested_priority": "URGENT",
    "ui_theme_color": "amber-50"
  },
  "LOW": {
    "suggested_priority": "NON-URGENT",
    "ui_theme_color": "slate-50"
  }
}
```

## 7. Expected Agent Payload

The backend stores this agent-facing payload on each saved patient record:

```json
{
  "triage_metadata": {
    "suggested_priority": "EMERGENT | URGENT | NON-URGENT",
    "ui_theme_color": "rose-50 | amber-50 | slate-50"
  },
  "patient_intake_summary": {
    "chief_complaint": "String describing main symptom",
    "reported_vitals": {
      "heart_rate": "String or null",
      "temperature": "String or null",
      "blood_pressure": "String or null"
    }
  },
  "physician_sbar_note": {
    "situation": "S: Concise statement of current issue and suggested priority.",
    "background": "B: Symptom duration, relevant history, and medications.",
    "assessment": "A: Available vitals and rule-based triage reasons.",
    "recommendation": "R: Provider action recommendation without diagnosis."
  }
}
```

## 8. HIPAA-Aligned Demo Behavior

The app includes demo controls aligned with HIPAA privacy and security principles:

- Patient must acknowledge a privacy notice before submitting intake.
- API responses use no-store cache headers for protected intake data.
- Security headers are set by Express.
- Audit events are recorded for intake creation, patient list views, patient record views, FHIR bundle views, EHR exports, and compliance readiness views.
- Audit logs avoid storing free-text clinical PHI where possible.
- Dashboard language should present this as HIPAA-aligned readiness, not full HIPAA compliance.

## 9. EHR and FHIR Behavior

FHIR bundle endpoint:

```text
GET /api/patient/:id/fhir
```

EHR export endpoint:

```text
POST /api/ehr/patient/:id/export
```

The FHIR bundle includes:

- `Patient`
- `Observation` for temperature
- `Observation` for heart rate
- `Observation` for blood pressure
- `QuestionnaireResponse` for intake answers and SBAR handoff

The EHR adapter uses `EHR_MODE=mock` by default. Set `EHR_MODE=live`, `EHR_FHIR_BASE_URL`, and `EHR_ACCESS_TOKEN` in `server/.env` to connect to a real FHIR endpoint.

## 10. API Surface

```text
GET  /api/health
POST /api/patient
GET  /api/patients
GET  /api/patient/:id
GET  /api/patient/:id/fhir
POST /api/ehr/patient/:id/export
GET  /api/compliance/hipaa
GET  /api/audit
```

## 11. File Structure

```text
patient-triage-app/
|-- client/
|   |-- css/style.css
|   |-- js/form.js
|   |-- js/dashboard.js
|   |-- index.html
|   `-- dashboard.html
|-- server/
|   |-- config/auditLog.js
|   |-- config/db.js
|   |-- controllers/ehrController.js
|   |-- controllers/patientController.js
|   |-- data/audit-log.json
|   |-- data/patients.json
|   |-- models/FhirBundle.js
|   |-- models/Patient.js
|   |-- routes/patientRoutes.js
|   |-- .env
|   |-- package.json
|   |-- package-lock.json
|   `-- server.js
|-- .vscode/
|-- .gitignore
`-- patient-triage-app.code-workspace
```

## 12. Run Instructions

```bash
cd patient-triage-app/server
npm install
npm start
```

Open:

```text
http://localhost:5000
http://localhost:5000/dashboard.html
```
