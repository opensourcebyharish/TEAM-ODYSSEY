const path = require('path');

const config = {
  port: process.env.PORT || 3001,
  dbPath: path.join(__dirname, '..', 'data', 'odyssey.db'),
  jwtSecret: process.env.JWT_SECRET || 'odyssey-mission-control-secret-2026',
  jwtExpiresIn: '24h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  sensorSimIntervalMs: 5000,
  samplingIntervalMs: 5000,
  simDeviceId: 'ODYSSEY-001',
  thresholds: {
    temperatureMin: -4.0,
    temperatureMax: 2.0,
    pressureMax: 1100,
    batteryCritical: 15,
    batteryWarning: 30,
  },
};

module.exports = config;