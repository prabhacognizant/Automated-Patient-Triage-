# Patient Triage and Symptom Assessment System

A full-stack Node.js, Express, HTML, CSS, and vanilla JavaScript app for AI-style patient intake before a doctor visit.

## Features

- Chat-driven patient intake with validation
- Rule-based triage priority: LOW, MEDIUM, HIGH
- Red-flag emergency interceptor
- SBAR handoff note for doctors
- REST APIs for creating and reading patient data
- Admin dashboard with search, filters, color-coded triage badges, and patient detail view
- File-backed JSON database configured through `.env`

## Run Locally

```bash
cd patient-triage-app/server
npm install
npm start
```

Open:

- Patient intake: `http://localhost:5000`
- Admin dashboard: `http://localhost:5000/dashboard.html`

## API Routes

- `POST /api/patient` saves patient intake data
- `GET /api/patients` returns all submitted patients
- `GET /api/patient/:id` returns one patient

## Project Structure

```text
patient-triage-app/
├── client/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── form.js
│   │   └── dashboard.js
│   ├── index.html
│   └── dashboard.html
└── server/
    ├── config/
    │   └── db.js
    ├── controllers/
    │   └── patientController.js
    ├── data/
    │   └── patients.json
    ├── models/
    │   └── Patient.js
    ├── routes/
    │   └── patientRoutes.js
    ├── .env
    ├── package.json
    └── server.js
```
