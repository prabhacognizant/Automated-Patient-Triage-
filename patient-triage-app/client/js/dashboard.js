const patientRows = document.getElementById('patientRows');
const detailsContent = document.getElementById('detailsContent');
const searchInput = document.getElementById('searchInput');
const priorityFilter = document.getElementById('priorityFilter');
const refreshBtn = document.getElementById('refreshBtn');
const complianceBtn = document.getElementById('complianceBtn');
const auditBtn = document.getElementById('auditBtn');
const compliancePanel = document.getElementById('compliancePanel');
const jsonModal = document.getElementById('jsonModal');
const jsonOutput = document.getElementById('jsonOutput');
const jsonModalTitle = document.getElementById('jsonModalTitle');
const closeModalBtn = document.getElementById('closeModalBtn');
const toast = document.getElementById('toast');
const totalCount = document.getElementById('totalCount');
const highCount = document.getElementById('highCount');
const mediumCount = document.getElementById('mediumCount');
const lowCount = document.getElementById('lowCount');

let patients = [];
let toastTimer = null;

function createCell(text) {
  const cell = document.createElement('td');
  cell.textContent = text || 'Not provided';
  return cell;
}

function createBadge(patient) {
  const badge = document.createElement('span');
  const level = (patient.triageLevel || 'LOW').toLowerCase();
  badge.className = `status-badge ${level}`;
  badge.textContent = `${patient.triageLevel} - ${patient.triageMetadata.suggested_priority}`;
  return badge;
}

function formatDate(value) {
  if (!value) {
    return 'Not provided';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function renderMetrics() {
  totalCount.textContent = patients.length;
  highCount.textContent = patients.filter((patient) => patient.triageLevel === 'HIGH').length;
  mediumCount.textContent = patients.filter((patient) => patient.triageLevel === 'MEDIUM').length;
  lowCount.textContent = patients.filter((patient) => patient.triageLevel === 'LOW').length;
}

function getFilteredPatients() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedPriority = priorityFilter.value;

  return patients.filter((patient) => {
    const haystack = [
      patient.fullName,
      patient.phone,
      patient.email,
      patient.chiefComplaint,
      patient.symptoms.join(' '),
      patient.triageLevel
    ].join(' ').toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    const matchesPriority = selectedPriority === 'ALL' || patient.triageLevel === selectedPriority;
    return matchesSearch && matchesPriority;
  });
}

function renderTable() {
  const filteredPatients = getFilteredPatients();
  patientRows.innerHTML = '';

  if (filteredPatients.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.className = 'empty-cell';
    cell.colSpan = 7;
    cell.textContent = patients.length === 0
      ? 'No patient intakes have been submitted yet.'
      : 'No patients match the current filters.';
    row.appendChild(cell);
    patientRows.appendChild(row);
    return;
  }

  filteredPatients.forEach((patient) => {
    const row = document.createElement('tr');

    const patientCell = document.createElement('td');
    const name = document.createElement('span');
    const email = document.createElement('span');
    name.className = 'patient-name';
    email.className = 'patient-email';
    name.textContent = patient.fullName;
    email.textContent = patient.email;
    patientCell.appendChild(name);
    patientCell.appendChild(email);

    const triageCell = document.createElement('td');
    triageCell.appendChild(createBadge(patient));

    const actionCell = document.createElement('td');
    const actionGroup = document.createElement('div');
    actionGroup.className = 'table-actions';
    actionGroup.appendChild(createActionButton('View', () => loadPatientDetails(patient.id)));
    actionGroup.appendChild(createActionButton('FHIR', () => viewFhirBundle(patient.id)));
    actionGroup.appendChild(createActionButton('Export EHR', () => exportToEhr(patient.id)));
    actionCell.appendChild(actionGroup);

    row.appendChild(patientCell);
    row.appendChild(createCell(String(patient.age)));
    row.appendChild(createCell(patient.phone));
    row.appendChild(createCell(patient.symptoms.join(', ') || patient.chiefComplaint));
    row.appendChild(triageCell);
    row.appendChild(createCell(formatDate(patient.createdAt)));
    row.appendChild(actionCell);
    patientRows.appendChild(row);
  });
}

function createActionButton(label, onClick) {
  const button = document.createElement('button');
  button.className = 'secondary-button compact-button';
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function appendDetailRow(container, label, value) {
  const row = document.createElement('div');
  const labelNode = document.createElement('span');
  const valueNode = document.createElement('span');
  row.className = 'detail-row';
  labelNode.textContent = label;
  valueNode.textContent = value || 'Not provided';
  row.appendChild(labelNode);
  row.appendChild(valueNode);
  container.appendChild(row);
}

function appendSection(title, buildContent) {
  const section = document.createElement('section');
  const heading = document.createElement('h3');
  heading.textContent = title;
  section.className = 'detail-section';
  section.appendChild(heading);
  buildContent(section);
  detailsContent.appendChild(section);
}

function renderDetails(patient) {
  detailsContent.innerHTML = '';

  appendSection('Patient', (section) => {
    const grid = document.createElement('div');
    grid.className = 'detail-grid';
    appendDetailRow(grid, 'Name', patient.fullName);
    appendDetailRow(grid, 'Age', String(patient.age));
    appendDetailRow(grid, 'Gender', patient.gender);
    appendDetailRow(grid, 'Phone', patient.phone);
    appendDetailRow(grid, 'Email', patient.email);
    appendDetailRow(grid, 'Submitted', formatDate(patient.createdAt));
    appendDetailRow(grid, 'Privacy notice', patient.privacyAcknowledged ? `Acknowledged ${formatDate(patient.privacyAcknowledgedAt)}` : 'Not acknowledged');
    section.appendChild(grid);
  });

  appendSection('Clinical Intake', (section) => {
    const grid = document.createElement('div');
    grid.className = 'detail-grid';
    appendDetailRow(grid, 'Main symptom', patient.chiefComplaint);
    appendDetailRow(grid, 'Symptoms', patient.symptoms.join(', '));
    appendDetailRow(grid, 'Duration', patient.symptomDuration);
    appendDetailRow(grid, 'History', patient.medicalHistory);
    appendDetailRow(grid, 'Medications', patient.currentMedications);
    appendDetailRow(grid, 'Severity', patient.severityLevel);
    section.appendChild(grid);
  });

  appendSection('Vitals', (section) => {
    const grid = document.createElement('div');
    grid.className = 'detail-grid';
    appendDetailRow(grid, 'Temperature', patient.temperature === null ? '' : `${patient.temperature} F`);
    appendDetailRow(grid, 'Blood pressure', patient.bloodPressure);
    appendDetailRow(grid, 'Heart rate', patient.heartRate === null ? '' : `${patient.heartRate} bpm`);
    section.appendChild(grid);
  });

  appendSection('Triage', (section) => {
    const grid = document.createElement('div');
    grid.className = 'detail-grid';
    appendDetailRow(grid, 'Level', `${patient.triageLevel} - ${patient.triageMetadata.suggested_priority}`);
    appendDetailRow(grid, 'Reasons', patient.triageReasons.join(' '));
    if (patient.emergencyMessage) {
      appendDetailRow(grid, 'Alert', patient.emergencyMessage);
    }
    section.appendChild(grid);
  });

  appendSection('SBAR Handoff', (section) => {
    const sbar = document.createElement('div');
    sbar.className = 'sbar-note';
    Object.values(patient.physicianSbarNote).forEach((line) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      sbar.appendChild(paragraph);
    });
    section.appendChild(sbar);
  });

  appendSection('EHR Interoperability', (section) => {
    const actions = document.createElement('div');
    actions.className = 'detail-actions';
    actions.appendChild(createActionButton('View FHIR Bundle', () => viewFhirBundle(patient.id)));
    actions.appendChild(createActionButton('Export to EHR', () => exportToEhr(patient.id)));
    section.appendChild(actions);
  });
}

async function loadPatientDetails(id) {
  detailsContent.innerHTML = '<p class="muted">Loading patient details...</p>';

  try {
    const response = await fetch(`/api/patient/${id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to load patient details.');
    }

    renderDetails(data.patient);
  } catch (error) {
    detailsContent.innerHTML = '<p class="muted">Unable to load patient details.</p>';
    showToast(error.message, 'error');
  }
}

async function loadPatients() {
  patientRows.innerHTML = '<tr><td colspan="7" class="empty-cell">Loading patient data...</td></tr>';

  try {
    const response = await fetch('/api/patients');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to load patient data.');
    }

    patients = data.patients;
    renderMetrics();
    renderTable();
    showToast('Patient dashboard updated.', 'success');
  } catch (error) {
    patients = [];
    renderMetrics();
    renderTable();
    showToast(error.message, 'error');
  }
}

async function viewFhirBundle(id) {
  try {
    const response = await fetch(`/api/patient/${id}/fhir`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to generate FHIR bundle.');
    }

    showJsonModal('FHIR R4 Bundle', data.bundle);
    showToast('FHIR bundle generated.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function exportToEhr(id) {
  try {
    const response = await fetch(`/api/ehr/patient/${id}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to export patient to EHR.');
    }

    showJsonModal('EHR Export Receipt', {
      message: data.message,
      receipt: data.receipt,
      fhirBundle: data.bundle
    });
    showToast(data.message, 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadComplianceReadiness() {
  compliancePanel.classList.remove('hidden');
  compliancePanel.innerHTML = '<p class="muted">Loading HIPAA and FHIR readiness controls...</p>';

  try {
    const response = await fetch('/api/compliance/hipaa');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to load compliance readiness.');
    }

    renderComplianceReadiness(data.hipaaReadiness);
  } catch (error) {
    compliancePanel.innerHTML = '<p class="muted">Unable to load compliance readiness.</p>';
    showToast(error.message, 'error');
  }
}

function renderComplianceReadiness(readiness) {
  compliancePanel.innerHTML = '';

  const disclaimer = document.createElement('p');
  disclaimer.className = 'compliance-disclaimer';
  disclaimer.textContent = readiness.disclaimer;
  compliancePanel.appendChild(disclaimer);

  const grid = document.createElement('div');
  grid.className = 'compliance-grid';

  readiness.safeguards.forEach((item) => {
    const card = document.createElement('article');
    const area = document.createElement('span');
    const title = document.createElement('strong');
    const body = document.createElement('p');
    card.className = 'compliance-card';
    area.textContent = item.area;
    title.textContent = item.control;
    body.textContent = item.implementation;
    card.appendChild(area);
    card.appendChild(title);
    card.appendChild(body);
    grid.appendChild(card);
  });

  compliancePanel.appendChild(grid);
}

async function loadAuditLog() {
  try {
    const response = await fetch('/api/audit?limit=20');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to load audit log.');
    }

    showJsonModal('Audit Log', data.auditEvents);
    showToast('Audit log loaded.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function showJsonModal(title, payload) {
  jsonModalTitle.textContent = title;
  jsonOutput.textContent = JSON.stringify(payload, null, 2);
  jsonModal.classList.remove('hidden');
}

function closeJsonModal() {
  jsonModal.classList.add('hidden');
  jsonOutput.textContent = '';
}

function showToast(message, type = 'success') {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast visible ${type}`;
  toastTimer = window.setTimeout(() => {
    toast.className = 'toast';
  }, 2800);
}

searchInput.addEventListener('input', renderTable);
priorityFilter.addEventListener('change', renderTable);
refreshBtn.addEventListener('click', loadPatients);
complianceBtn.addEventListener('click', loadComplianceReadiness);
auditBtn.addEventListener('click', loadAuditLog);
closeModalBtn.addEventListener('click', closeJsonModal);
jsonModal.addEventListener('click', (event) => {
  if (event.target === jsonModal) {
    closeJsonModal();
  }
});

loadPatients();
