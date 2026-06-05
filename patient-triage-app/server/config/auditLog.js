const fs = require('fs/promises');
const path = require('path');
const { createHash, randomUUID } = require('crypto');

const serverRoot = path.resolve(__dirname, '..');
const configuredAuditFile = process.env.AUDIT_LOG_FILE || './data/audit-log.json';
const auditFile = path.isAbsolute(configuredAuditFile)
  ? configuredAuditFile
  : path.resolve(serverRoot, configuredAuditFile);

let auditWriteQueue = Promise.resolve();

async function ensureAuditLog() {
  await fs.mkdir(path.dirname(auditFile), { recursive: true });

  try {
    await fs.access(auditFile);
  } catch (error) {
    await fs.writeFile(auditFile, '[]', 'utf8');
  }
}

async function readAuditLog() {
  await ensureAuditLog();
  const content = await fs.readFile(auditFile, 'utf8');

  if (!content.trim()) {
    return [];
  }

  const entries = JSON.parse(content);
  return Array.isArray(entries) ? entries : [];
}

async function writeAuditLog(entries) {
  auditWriteQueue = auditWriteQueue.then(async () => {
    await ensureAuditLog();
    const tempFile = `${auditFile}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(entries, null, 2), 'utf8');
    await fs.rename(tempFile, auditFile);
  });

  return auditWriteQueue;
}

function hashValue(value) {
  if (!value) {
    return null;
  }

  return createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

function getRequester(req) {
  return {
    actor: req.get('X-Actor') || 'demo-clinician',
    role: req.get('X-Role') || 'clinician',
    ipHash: hashValue(req.ip),
    userAgent: (req.get('User-Agent') || '').slice(0, 160)
  };
}

async function recordAuditEvent(req, event) {
  const entries = await readAuditLog();
  const entry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...getRequester(req),
    eventType: event.eventType,
    patientId: event.patientId || null,
    route: req.originalUrl,
    method: req.method,
    outcome: event.outcome || 'success',
    details: event.details || {}
  };

  entries.unshift(entry);
  await writeAuditLog(entries.slice(0, 500));
  return entry;
}

async function getAuditEvents(limit = 50) {
  const entries = await readAuditLog();
  return entries.slice(0, limit);
}

module.exports = {
  getAuditEvents,
  recordAuditEvent
};
