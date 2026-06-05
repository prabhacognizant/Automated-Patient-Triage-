# Patient Triage and Symptom Assessment System

A full-stack healthcare intake application that collects patient details through an AI-style chat flow, applies rule-based triage, stores submitted intake data, and lets clinicians review, audit, and export records in a FHIR-ready format.

## Tech Stack

- Backend: Node.js, Express
- Frontend: HTML, CSS, vanilla JavaScript
- Storage: JSON file database configured through environment variables
- Interoperability: HL7 FHIR R4-style transaction Bundle export
- Tooling: VS Code tasks, launch configs, and REST Client requests

## Current Features

- Chat-driven patient intake before a doctor visit
- Required validation for name, age, gender, phone, email, symptoms, severity, and privacy acknowledgement
- Red-flag emergency interceptor for severe symptoms
- Rule-based triage priority: `LOW`, `MEDIUM`, `HIGH`
- Patient-facing urgency metadata: `NON-URGENT`, `URGENT`, `EMERGENT`
- Dynamic UI themes for triage priority: slate, amber, rose
- SBAR handoff note for clinicians
- Admin dashboard with search, filters, color-coded badges, and detail view
- HIPAA-aligned demo controls: privacy notice, minimum-necessary posture, security headers, no-store API responses, and audit logging
- EHR interoperability demo with FHIR bundle generation and mock/live EHR adapter
- VS Code workspace, tasks, debugger configs, and API request examples

## Important Compliance Note

This project demonstrates HIPAA-aligned product controls for a hackathon or learning environment. It is not a legal guarantee of full HIPAA compliance. A production deployment also needs organizational policies, access governance, user identity, encryption strategy, audit review, risk analysis, workforce training, Business Associate Agreements, and approved hosting.

## Run Locally

```bash
cd patient-triage-app/server
npm install
npm start
```

Open:

- Patient intake: `http://localhost:5000`
- Admin dashboard: `http://localhost:5000/dashboard.html`
- Health check: `http://localhost:5000/api/health`

## Run in VS Code

Open the workspace file:

```text
patient-triage-app/patient-triage-app.code-workspace
```

Available VS Code tasks:

- `Install server dependencies`
- `Start Express server`
- `Start Express server with watch`

Available debug profiles:

- `Debug Express API`
- `Open Patient Intake`
- `Open Admin Dashboard`
- `Debug API + Patient Intake`
- `Debug API + Admin Dashboard`

The API examples are in:

```text
patient-triage-app/.vscode/triage-api.http
```

## API Routes

- `GET /api/health` returns server health
- `POST /api/patient` saves patient intake data
- `GET /api/patients` returns all submitted patients
- `GET /api/patient/:id` returns one patient
- `GET /api/patient/:id/fhir` returns a FHIR R4-style transaction Bundle
- `POST /api/ehr/patient/:id/export` exports through the EHR adapter
- `GET /api/compliance/hipaa` returns HIPAA/FHIR readiness controls
- `GET /api/audit?limit=20` returns recent audit events

## Triage Rules

- `HIGH` priority when temperature is greater than `102 F`
- `HIGH` priority when heart rate is greater than `120 bpm`
- `HIGH` priority when the patient selects `High` severity
- `HIGH` priority when a red-flag symptom is detected
- `LOW` priority when reported severity is low and available vitals are stable
- Mild symptom wording is recorded as the low-priority reason when present
- `MEDIUM` priority for all other valid submissions

The assistant never diagnoses. It only classifies urgency and creates a clinician handoff summary.

## EHR Adapter

The app runs in mock EHR mode by default.

```text
EHR_MODE=mock
EHR_FHIR_BASE_URL=
EHR_ACCESS_TOKEN=
```

To point it at a FHIR server, update `patient-triage-app/server/.env`:

```text
EHR_MODE=live
EHR_FHIR_BASE_URL=https://your-fhir-server.example/fhir
EHR_ACCESS_TOKEN=your-token
```

The generated FHIR bundle includes:

- `Patient`
- `Observation` for body temperature
- `Observation` for heart rate
- `Observation` for blood pressure
- `QuestionnaireResponse` for intake answers and SBAR handoff

## Environment Variables

Configured in `patient-triage-app/server/.env`:

```text
PORT=5000
DB_FILE=./data/patients.json
AUDIT_LOG_FILE=./data/audit-log.json
CLIENT_ORIGIN=http://localhost:5000
EHR_MODE=mock
EHR_FHIR_BASE_URL=
EHR_ACCESS_TOKEN=
```

## Project Structure

```text
patient-triage-app/
|-- .gitignore
|-- patient-triage-app.code-workspace
|-- .vscode/
|   |-- extensions.json
|   |-- launch.json
|   |-- settings.json
|   |-- tasks.json
|   `-- triage-api.http
|-- client/
|   |-- css/
|   |   `-- style.css
|   |-- js/
|   |   |-- dashboard.js
|   |   `-- form.js
|   |-- dashboard.html
|   `-- index.html
`-- server/
    |-- .env
    |-- package.json
    |-- package-lock.json
    |-- server.js
    |-- config/
    |   |-- auditLog.js
    |   `-- db.js
    |-- controllers/
    |   |-- ehrController.js
    |   `-- patientController.js
    |-- data/
    |   |-- audit-log.json
    |   `-- patients.json
    |-- models/
    |   |-- FhirBundle.js
    |   `-- Patient.js
    `-- routes/
        `-- patientRoutes.js
```

## Main User Flow

1. Patient opens the intake website.
2. CareSync AI Triage Assistant asks for demographics, contact data, symptoms, history, medications, vitals, and severity.
3. Patient acknowledges the privacy notice.
4. The frontend submits intake data to `POST /api/patient`.
5. The backend sanitizes and validates input.
6. Rule-based triage assigns urgency and creates an SBAR note.
7. Data is saved to `server/data/patients.json`.
8. Clinician reviews patients in the dashboard.
9. Clinician can view details, inspect FHIR output, export to the EHR adapter, and review audit events.
