# Hackathon Plan: AI Patient Triage Platform
 
## Summary
 
Build a **responsive web MVP** that demonstrates how conversational AI collects symptoms, medical history, and vitals, then produces a **preliminary triage assessment** before a doctor visit.
 
Recommended hackathon angle: **AI assists, rules decide**. Use conversational AI to extract and summarize patient information, but use a deterministic triage rules engine for priority levels. This is safer and easier to explain to judges.
 
Use your current Flask app as the base, but repurpose it from IoT simulator to healthcare triage.
 
## Key Features
 
- Patient intake chatbot:

  - Collect chief complaint, symptoms, duration, severity, vitals, age, pregnancy status, allergies, medications, prior conditions.

  - Ask follow-up questions based on symptom category.
 
- Triage engine:

  - Priority levels: `Emergency`, `Urgent`, `Routine`, `Self-care guidance`.

  - Red-flag overrides for chest pain, stroke symptoms, severe breathing issues, high fever with confusion, severe allergic reaction, etc.

  - Show reasoning: “Priority increased because patient reported chest pain and shortness of breath.”
 
- Clinician dashboard:

  - Patient summary.

  - Symptom timeline.

  - Vitals table.

  - Triage priority badge.

  - Recommended next steps.

  - “Export to EHR” demo button.
 
- EHR integration demo:

  - Generate mock HL7 FHIR-style JSON.

  - Map intake to `Patient`, `Observation`, and `QuestionnaireResponse`.

  - Do not integrate with a real EHR during hackathon unless provided sandbox credentials.
 
- HIPAA-ready story:

  - Use mock/de-identified data only.

  - Add role-based access demo: patient vs clinician.

  - Add audit log entries for intake, triage generation, and export.

  - Mention encryption, access control, minimum necessary PHI, and auditability.
 
## Architecture
 
- Frontend: responsive Flask/Jinja dashboard, mobile-friendly intake flow.

- Backend: Flask routes for intake, triage, dashboard, and export.

- Database: SQLite for hackathon demo.

- AI layer:

  - Input: patient conversation transcript.

  - Output: structured symptom/history/vitals summary.

  - Guardrail: AI does not diagnose; it only summarizes and recommends questions.

- Rules layer:

  - Takes structured intake data.

  - Produces final triage level and reasons.

- FHIR export:

  - Return JSON bundle from `/export/fhir/<session_id>`.
 
## Implementation Approach
 
1. Replace IoT concepts with healthcare concepts:

   - Sensors/readings become vitals/symptoms.

   - Simulation profiles become triage sessions.

   - Dashboard becomes clinician review queue.
 
2. Build the MVP flow:

   - Landing screen should immediately show the patient intake chat.

   - After intake, show triage result and clinician summary.

   - Add sample patients for demo: chest pain, flu-like symptoms, medication refill.
 
3. Keep triage explainable:

   - Use simple scoring plus red-flag rules.

   - Always show “why this priority was assigned.”

   - Add disclaimer: “Preliminary triage only, not a diagnosis.”
 
4. Prepare the demo story:

   - Patient enters symptoms.

   - AI asks follow-up questions.

   - Platform detects risk.

   - Clinician sees concise summary.

   - Mock FHIR export shows EHR-readiness.
 
## Test Plan
 
- Unit test triage rules:

  - Chest pain + shortness of breath => `Emergency`.

  - Mild cough, no fever, stable vitals => `Routine`.

  - High fever + confusion => `Emergency`.

  - Missing vitals still produces triage with “insufficient data” warning.
 
- Route tests:

  - Intake page loads.

  - Triage session can be created.

  - Assessment result is returned.

  - FHIR export returns valid JSON.
 
- Demo acceptance:

  - Works end-to-end in under 2 minutes.

  - No real patient data required.

  - Judges can see AI, triage logic, compliance story, and EHR integration.
 
## Hackathon Timeline
 
- First 2 hours: define demo flow, triage levels, and sample cases.

- Hours 3-6: convert Flask app screens and database model.

- Hours 7-10: implement intake flow and triage rules.

- Hours 11-13: add AI summary or mock AI if API access is limited.

- Hours 14-16: add clinician dashboard and FHIR export.

- Final stretch: polish UI, rehearse demo, prepare architecture slide.
 
## Assumptions
 
- Use Flask + SQLite because your workspace already has that scaffold.

- Build a responsive web app instead of separate native mobile apps.

- Use mock patient data only.

- Treat HIPAA as a compliance-readiness design story, not a claim of full production compliance.

- Use official references for positioning: [HHS HIPAA Privacy Rule](https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html), [HHS HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html), and [HL7 FHIR QuestionnaireResponse](https://hl7.org/fhir/r4/questionnaireresponse.html).

 