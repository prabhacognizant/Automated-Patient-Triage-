const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const choiceBar = document.getElementById('choiceBar');
const sendBtn = document.getElementById('sendBtn');
const submitIntakeBtn = document.getElementById('submitIntakeBtn');
const resetBtn = document.getElementById('resetBtn');
const priorityBadge = document.getElementById('priorityBadge');
const triageResult = document.getElementById('triageResult');
const privacyAcknowledged = document.getElementById('privacyAcknowledged');
const toast = document.getElementById('toast');

const emergencyMessage = 'CRITICAL ALERT: Please stop using this application and call 911 or proceed to the nearest Emergency Room immediately.';
const redFlagPatterns = [
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

const steps = [
  {
    key: 'fullName',
    prompt: 'Hello, I am CareSync AI Triage Assistant. What is your full name?',
    placeholder: 'Full name',
    required: true,
    validate: (value) => value.length >= 2 ? '' : 'Please enter your full name.'
  },
  {
    key: 'age',
    prompt: 'How old are you?',
    placeholder: 'Age',
    required: true,
    validate: (value) => {
      const age = Number(value);
      return Number.isInteger(age) && age >= 0 && age <= 120
        ? ''
        : 'Age must be a whole number between 0 and 120.';
    }
  },
  {
    key: 'gender',
    prompt: 'What is your gender?',
    placeholder: 'Choose or type gender',
    required: true,
    choices: ['Female', 'Male', 'Non-binary', 'Prefer not to say', 'Other'],
    validate: (value) => value ? '' : 'Please select a gender.'
  },
  {
    key: 'phone',
    prompt: 'What phone number should the clinic use?',
    placeholder: 'Phone number',
    required: true,
    validate: (value) => /^[+()\-\s\d]{7,20}$/.test(value)
      ? ''
      : 'Please enter a valid phone number.'
  },
  {
    key: 'email',
    prompt: 'What is your email address?',
    placeholder: 'Email address',
    required: true,
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? ''
      : 'Please enter a valid email address.'
  },
  {
    key: 'chiefComplaint',
    prompt: 'What main symptom brought you in today?',
    placeholder: 'Example: fever, cough, stomach pain',
    required: true,
    watchRedFlags: true,
    validate: (value) => value.length >= 2 ? '' : 'Please describe the main symptom.'
  },
  {
    key: 'symptoms',
    prompt: 'List any other symptoms. Use commas if there are several.',
    placeholder: 'Example: chills, headache, sore throat',
    required: false,
    watchRedFlags: true,
    validate: () => ''
  },
  {
    key: 'symptomDuration',
    prompt: 'When did the symptoms start, and how long have they been present?',
    placeholder: 'Example: started yesterday evening',
    required: false,
    validate: () => ''
  },
  {
    key: 'severityLevel',
    prompt: 'How severe does this feel right now?',
    placeholder: 'Low, Medium, or High',
    required: true,
    choices: ['Low', 'Medium', 'High'],
    validate: (value) => ['low', 'medium', 'high'].includes(value.toLowerCase())
      ? ''
      : 'Please choose Low, Medium, or High.'
  },
  {
    key: 'medicalHistory',
    prompt: 'Share any relevant medical history. You can type none if there is nothing to report.',
    placeholder: 'Medical history',
    required: false,
    validate: () => ''
  },
  {
    key: 'currentMedications',
    prompt: 'List current medications. You can type none if you are not taking any.',
    placeholder: 'Current medications',
    required: false,
    validate: () => ''
  },
  {
    key: 'temperature',
    prompt: 'What is your temperature in Fahrenheit, if available?',
    placeholder: 'Example: 98.6 or Not sure',
    required: false,
    choices: ['Not sure'],
    validate: (value) => {
      if (!value || value.toLowerCase() === 'not sure') {
        return '';
      }
      const temperature = Number(value.replace(/[^\d.-]/g, ''));
      return Number.isFinite(temperature) && temperature >= 90 && temperature <= 115
        ? ''
        : 'Temperature should be a Fahrenheit value between 90 and 115.';
    },
    normalize: (value) => value.toLowerCase() === 'not sure' ? '' : value
  },
  {
    key: 'bloodPressure',
    prompt: 'What is your blood pressure, if available?',
    placeholder: 'Example: 120/80 or Not sure',
    required: false,
    choices: ['Not sure'],
    validate: (value) => {
      if (!value || value.toLowerCase() === 'not sure') {
        return '';
      }
      return /^\d{2,3}\s*\/\s*\d{2,3}$/.test(value)
        ? ''
        : 'Blood pressure should look like 120/80.';
    },
    normalize: (value) => value.toLowerCase() === 'not sure' ? '' : value
  },
  {
    key: 'heartRate',
    prompt: 'What is your heart rate in beats per minute, if available?',
    placeholder: 'Example: 82 or Not sure',
    required: false,
    choices: ['Not sure'],
    validate: (value) => {
      if (!value || value.toLowerCase() === 'not sure') {
        return '';
      }
      const heartRate = Number(value.replace(/[^\d.-]/g, ''));
      return Number.isFinite(heartRate) && heartRate >= 30 && heartRate <= 240
        ? ''
        : 'Heart rate should be between 30 and 240.';
    },
    normalize: (value) => value.toLowerCase() === 'not sure' ? '' : value
  }
];

let currentStepIndex = 0;
let intake = {};
let emergencyStopped = false;
let intakeComplete = false;
let intakeSubmitted = false;
let toastTimer = null;

function appendMessage(role, text, extraClass = '') {
  const message = document.createElement('article');
  message.className = `message ${role} ${extraClass}`.trim();
  message.textContent = text;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderChoices(step) {
  choiceBar.innerHTML = '';

  if (!step.choices) {
    return;
  }

  step.choices.forEach((choice) => {
    const button = document.createElement('button');
    button.className = 'choice-button';
    button.type = 'button';
    button.textContent = choice;
    button.addEventListener('click', () => submitAnswer(choice));
    choiceBar.appendChild(button);
  });
}

function askCurrentQuestion() {
  const step = steps[currentStepIndex];

  if (!step) {
    appendMessage('bot', 'The intake is ready. Submit it so the care team can review the details.');
    intakeComplete = true;
    updateSubmitState();
    chatInput.disabled = true;
    sendBtn.disabled = true;
    choiceBar.innerHTML = '';
    return;
  }

  appendMessage('bot', step.prompt);
  chatInput.value = '';
  chatInput.placeholder = step.placeholder || '';
  chatInput.disabled = false;
  sendBtn.disabled = false;
  chatInput.focus();
  renderChoices(step);
}

function detectRedFlag(value) {
  return redFlagPatterns.some((pattern) => pattern.test(value));
}

function stopForEmergency() {
  emergencyStopped = true;
  document.body.className = 'theme-rose';
  setPriorityBadge('EMERGENT', 'high');
  appendMessage('bot', emergencyMessage, 'critical');
  chatInput.disabled = true;
  sendBtn.disabled = true;
  submitIntakeBtn.disabled = true;
  choiceBar.innerHTML = '';
  showToast('Emergency symptoms detected. Please seek immediate care.', 'error');
}

function submitAnswer(rawValue) {
  if (emergencyStopped) {
    return;
  }

  const step = steps[currentStepIndex];
  const cleanedValue = rawValue.trim();

  if (step.required && !cleanedValue) {
    showToast('This answer is required.', 'error');
    return;
  }

  const validationMessage = step.validate(cleanedValue);

  if (validationMessage) {
    showToast(validationMessage, 'error');
    return;
  }

  if (step.watchRedFlags && detectRedFlag(cleanedValue)) {
    appendMessage('user', cleanedValue);
    intake[step.key] = cleanedValue;
    renderSummary();
    stopForEmergency();
    return;
  }

  const normalizedValue = step.normalize ? step.normalize(cleanedValue) : cleanedValue;
  intake[step.key] = normalizedValue;
  appendMessage('user', cleanedValue || 'Not provided');
  renderSummary();
  currentStepIndex += 1;
  askCurrentQuestion();
}

function renderSummary() {
  document.querySelectorAll('[data-summary]').forEach((node) => {
    const key = node.dataset.summary;
    const value = intake[key];
    node.textContent = value || 'Pending';
  });
}

function splitSymptoms(symptomsText) {
  return symptomsText
    .split(/[,;\n]+/)
    .map((symptom) => symptom.trim())
    .filter(Boolean);
}

function buildPayload() {
  const symptoms = [
    intake.chiefComplaint,
    ...splitSymptoms(intake.symptoms || '')
  ].filter(Boolean);

  return {
    ...intake,
    symptoms: [...new Set(symptoms)],
    privacyAcknowledged: privacyAcknowledged.checked,
    dataUseConsent: privacyAcknowledged.checked ? 'Treatment' : 'Declined'
  };
}

function updateSubmitState() {
  submitIntakeBtn.disabled = !intakeComplete || emergencyStopped || !privacyAcknowledged.checked || intakeSubmitted;
}

function setPriorityBadge(label, level) {
  priorityBadge.textContent = label;
  priorityBadge.className = `priority-badge ${level}`;
}

function applyTheme(patient) {
  const level = (patient.triageLevel || '').toLowerCase();
  document.body.className = level === 'high'
    ? 'theme-rose'
    : level === 'medium'
      ? 'theme-amber'
      : 'theme-slate';

  setPriorityBadge(patient.triageMetadata.suggested_priority, level);
}

function renderTriageResult(patient) {
  const level = patient.triageLevel.toLowerCase();
  const reasons = patient.triageReasons.join(' ');
  triageResult.className = `triage-result ${level}`;
  triageResult.innerHTML = '';

  const title = document.createElement('strong');
  title.textContent = `${patient.triageMetadata.suggested_priority} priority`;
  const body = document.createElement('span');
  body.textContent = reasons;

  triageResult.appendChild(title);
  triageResult.appendChild(body);
}

function appendSavedSummary(patient) {
  const sbar = patient.physicianSbarNote;
  const lines = [
    `Intake saved. Suggested priority: ${patient.triageMetadata.suggested_priority}.`,
    '',
    sbar.situation,
    sbar.background,
    sbar.assessment,
    sbar.recommendation
  ];

  appendMessage('bot', lines.join('\n'));
}

function setLoading(isLoading) {
  const label = submitIntakeBtn.querySelector('.button-label');
  const dot = submitIntakeBtn.querySelector('.loading-dot');
  submitIntakeBtn.disabled = isLoading;
  label.textContent = isLoading ? 'Saving intake' : 'Submit intake';
  dot.classList.toggle('hidden', !isLoading);
}

async function submitIntake() {
  if (emergencyStopped) {
    return;
  }

  const payload = buildPayload();

  if (!payload.privacyAcknowledged) {
    showToast('Please acknowledge the privacy notice before submitting.', 'error');
    updateSubmitState();
    return;
  }

  setLoading(true);

  try {
    const response = await fetch('/api/patient', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.errors ? data.errors.join(' ') : data.message);
    }

    applyTheme(data.patient);
    renderTriageResult(data.patient);
    appendSavedSummary(data.patient);
    intakeSubmitted = true;
    showToast('Patient intake saved successfully.', 'success');
  } catch (error) {
    showToast(error.message || 'Unable to save patient intake.', 'error');
    updateSubmitState();
  } finally {
    setLoading(false);
    updateSubmitState();
  }
}

function showToast(message, type = 'success') {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast visible ${type}`;
  toastTimer = window.setTimeout(() => {
    toast.className = 'toast';
  }, 3200);
}

function resetIntake() {
  currentStepIndex = 0;
  intake = {};
  emergencyStopped = false;
  intakeComplete = false;
  intakeSubmitted = false;
  privacyAcknowledged.checked = false;
  chatMessages.innerHTML = '';
  choiceBar.innerHTML = '';
  triageResult.className = 'triage-result hidden';
  triageResult.innerHTML = '';
  document.body.className = 'theme-slate';
  setPriorityBadge('Not assessed', 'neutral');
  updateSubmitState();
  renderSummary();
  askCurrentQuestion();
}

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  submitAnswer(chatInput.value);
});

submitIntakeBtn.addEventListener('click', submitIntake);
resetBtn.addEventListener('click', resetIntake);
privacyAcknowledged.addEventListener('change', updateSubmitState);

resetIntake();
