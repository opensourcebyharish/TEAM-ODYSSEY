const http = require('http');
const express = require('express');
const cors = require('cors');
const config = require('./config');
const { logEvent } = require('./database/db');
const SensorSimulator = require('./simulator/sensorSimulator');
const { initSocket, broadcastReading, broadcastEvent } = require('./websocket/socket');

const app = express();
const server = http.createServer(app);

// ─── Middleware ──────────────────────────────────────────────────────────
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// ─── Health ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'odyssey-mission-control', time: new Date().toISOString() });
});

// ─── Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sensors', require('./routes/sensors'));
app.use('/api/missions', require('./routes/missions'));
app.use('/api/mission', require('./routes/missions'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/device', require('./routes/device'));
app.use('/api/system/events', require('./routes/events'));
app.use('/api/data/export', require('./routes/export'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/location', require('./routes/locations'));
app.use('/api/settings', require('./routes/settings'));

// ─── 404 + error handling ────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Socket.IO ───────────────────────────────────────────────────────────
const io = initSocket(server);

// ─── Sensor simulator → broadcast ────────────────────────────────────────
const simulator = new SensorSimulator(config.sensorSimIntervalMs);
simulator.onReading = (reading) => broadcastReading(reading);
simulator.onPhaseChange = (change) => broadcastEvent({
  event_type: 'mission', severity: 'info', source: 'mission',
  message: `Phase transition: ${change.from} → ${change.to}`,
  timestamp: change.timestamp,
});

// ─── Start ───────────────────────────────────────────────────────────────
server.listen(config.port, () => {
  logEvent('system_start', 'ODYSSEY Mission Control server started.', 'info', 'system');
  simulator.start();
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│  🌊 ODYSSEY — SOUTHERN OCEAN ROBOTIC EXPLORER │');
  console.log('│  Mission Control backend                    │');
  console.log(`│  → http://localhost:${config.port}            │`);
  console.log('└─────────────────────────────────────────────┘');
  console.log(`API ready on port ${config.port}. Sensor simulator running every ${config.sensorSimIntervalMs} ms.`);
});