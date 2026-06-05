require('dotenv').config();

const cors = require('cors');
const express = require('express');
const path = require('path');
const { connectDatabase } = require('./config/db');
const patientRoutes = require('./routes/patientRoutes');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const clientPath = path.resolve(__dirname, '..', 'client');
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim())
  : [];

app.use(cors(allowedOrigins.length > 0 ? { origin: allowedOrigins } : undefined));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store');
  }

  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.use('/api', patientRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'patient-triage-api' });
});

app.use(express.static(clientPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(clientPath, 'dashboard.html'));
});

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found.' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    message: 'Something went wrong while processing the request.'
  });
});

connectDatabase()
  .then(({ dbFile }) => {
    app.listen(PORT, () => {
      console.log(`Patient Triage API running at http://localhost:${PORT}`);
      console.log(`Database file: ${dbFile}`);
    });
  })
  .catch((error) => {
    console.error('Unable to start the server:', error);
    process.exit(1);
  });
