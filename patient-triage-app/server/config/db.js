const fs = require('fs/promises');
const path = require('path');

const serverRoot = path.resolve(__dirname, '..');
const configuredDbFile = process.env.DB_FILE || './data/patients.json';
const dbFile = path.isAbsolute(configuredDbFile)
  ? configuredDbFile
  : path.resolve(serverRoot, configuredDbFile);

let writeQueue = Promise.resolve();

async function ensureDatabase() {
  await fs.mkdir(path.dirname(dbFile), { recursive: true });

  try {
    await fs.access(dbFile);
  } catch (error) {
    await fs.writeFile(dbFile, '[]', 'utf8');
  }
}

async function connectDatabase() {
  await ensureDatabase();
  return { dbFile };
}

async function readPatients() {
  await ensureDatabase();
  const content = await fs.readFile(dbFile, 'utf8');

  if (!content.trim()) {
    return [];
  }

  const patients = JSON.parse(content);
  return Array.isArray(patients) ? patients : [];
}

async function writePatients(patients) {
  writeQueue = writeQueue.then(async () => {
    await ensureDatabase();
    const tempFile = `${dbFile}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(patients, null, 2), 'utf8');
    await fs.rename(tempFile, dbFile);
  });

  return writeQueue;
}

async function insertPatient(patient) {
  const patients = await readPatients();
  patients.push(patient);
  await writePatients(patients);
  return patient;
}

async function findPatients() {
  const patients = await readPatients();
  return patients.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function findPatientById(id) {
  const patients = await readPatients();
  return patients.find((patient) => patient.id === id) || null;
}

module.exports = {
  connectDatabase,
  findPatientById,
  findPatients,
  insertPatient
};
