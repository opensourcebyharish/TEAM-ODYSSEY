const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { getRow, runQuery } = require('../database/db');

let io = null;

/**
 * Attach Socket.IO to the HTTP server with JWT auth.
 * Returns the io instance.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  // Auth handshake — accept token via `auth.token` (socket.io-client option)
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('auth_required'));
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.user = { id: decoded.id, username: decoded.username, role: decoded.role };
      next();
    } catch {
      next(new Error('invalid_token'));
    }
  });

  io.on('connection', (socket) => {
    socket.emit('welcome', {
      message: `Connected to ODYSSEY Mission Control`,
      user: socket.user,
      ts: new Date().toISOString(),
    });

    // Client asks for the current snapshot
    socket.on('snapshot:request', () => {
      emitSnapshot(socket);
    });

    // Mission control commands come over the socket too
    socket.on('mission:command', ({ command, id }) => {
      try {
        handleMissionCommand(command, id).then((mission) => {
          socket.emit('mission:command:ack', { command, mission });
          io.emit('mission:update', mission);
        });
      } catch (e) {
        socket.emit('mission:error', { command, error: e.message });
      }
    });

    socket.on('disconnect', () => {
      // no-op
    });
  });

  return io;
}

function getIo() {
  return io;
}

/** Broadcast the latest reading to all connected clients. */
function broadcastReading(reading) {
  if (!io) return;
  io.emit('sensor:update', reading);
  io.emit('sensor:temperature', { value: reading.temperature, timestamp: reading.timestamp });
}

/** Broadcast a single live sensor value change. */
function broadcastSensor(metric, value, timestamp) {
  if (!io) return;
  io.emit(`sensor:${metric}`, { value, timestamp });
}

/** Push a system event to all clients. */
function broadcastEvent(event) {
  if (!io) return;
  io.emit('system:event', event);
}

/** Push a new alert to all clients. */
function broadcastAlert(alert) {
  if (!io) return;
  io.emit('alert:new', alert);
}

/** Push communication status updates. */
function broadcastComm(comm) {
  if (!io) return;
  io.emit('comm:status', comm);
}

/** Push latest device health to all clients. */
function broadcastHealth(healthList) {
  if (!io) return;
  io.emit('device:health', healthList);
}

/** Push mission state changes to all clients. */
function broadcastMission(mission) {
  if (!io) return;
  io.emit('mission:update', mission);
}

/** Emit a full snapshot to one socket. */
function emitSnapshot(socket) {
  const latest = getRow(`SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 1`);
  const mission = getRow(`SELECT * FROM missions WHERE status IN ('running','paused')
                          ORDER BY start_time DESC LIMIT 1`) ||
                  getRow(`SELECT * FROM missions ORDER BY id DESC LIMIT 1`);
  const readings = runQuery(
    `SELECT timestamp, temperature, pressure, depth, battery, status
     FROM sensor_readings ORDER BY timestamp DESC LIMIT 120`
  ).reverse();
  const unacked = runQuery(
    `SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY timestamp DESC LIMIT 20`
  );
  const events = runQuery(`SELECT * FROM system_events ORDER BY timestamp DESC LIMIT 50`);
  socket.emit('snapshot', {
    latest,
    mission,
    readings,
    unacked_alerts: unacked,
    events,
    ts: new Date().toISOString(),
  });
}

async function handleMissionCommand(command, id) {
  const { insert: _insert, logEvent } = require('../database/db');
  let mission;
  if (command === 'start') {
    const current = getRow(`SELECT * FROM missions WHERE status IN ('running','paused') LIMIT 1`);
    if (current) throw new Error('A mission is already active');
    mission = id
      ? getRow('SELECT * FROM missions WHERE id = ?', [id])
      : getRow(`SELECT * FROM missions WHERE status IN ('idle','completed') ORDER BY id DESC LIMIT 1`);
    if (!mission) throw new Error('No mission to start');
    const now = new Date().toISOString();
    runQuery(`UPDATE missions SET status='running', current_phase='DIVE', start_time=?, end_time=NULL WHERE id=?`,
      [now, mission.id]);
    mission = getRow('SELECT * FROM missions WHERE id = ?', [mission.id]);
    logEvent('mission', `Mission "${mission.name}" started via socket.`, 'info', 'mission');
  } else if (command === 'pause') {
    mission = getRow(`SELECT * FROM missions WHERE status='running' LIMIT 1`);
    if (!mission) throw new Error('No running mission');
    runQuery(`UPDATE missions SET status='paused', current_phase='PAUSED' WHERE id=?`, [mission.id]);
    mission = { ...mission, status: 'paused', current_phase: 'PAUSED' };
    logEvent('mission', `Mission "${mission.name}" paused via socket.`, 'warning', 'mission');
  } else if (command === 'resume') {
    mission = getRow(`SELECT * FROM missions WHERE status='paused' LIMIT 1`);
    if (!mission) throw new Error('No paused mission');
    runQuery(`UPDATE missions SET status='running', current_phase='SENSE' WHERE id=?`, [mission.id]);
    mission = { ...mission, status: 'running', current_phase: 'SENSE' };
    logEvent('mission', `Mission "${mission.name}" resumed via socket.`, 'info', 'mission');
  } else if (command === 'abort') {
    mission = getRow(`SELECT * FROM missions WHERE status IN ('running','paused') LIMIT 1`);
    if (!mission) throw new Error('No active mission');
    const now = new Date().toISOString();
    runQuery(`UPDATE missions SET status='aborted', current_phase='IDLE', end_time=? WHERE id=?`, [now, mission.id]);
    mission = { ...mission, status: 'aborted', current_phase: 'IDLE', end_time: now };
    logEvent('mission', `Mission "${mission.name}" ABORTED via socket.`, 'critical', 'mission');
  }
  return mission;
}

module.exports = {
  initSocket, getIo,
  broadcastReading, broadcastSensor, broadcastEvent, broadcastAlert,
  broadcastComm, broadcastHealth, broadcastMission,
};