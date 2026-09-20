const config = require('../config');
const { getRow, runQuery, insert, logEvent } = require('../database/db');
const { insertReading } = require('../routes/helpers');

/**
 * SensorSimulator — models the STM32 acquisition stack.
 *
 * Every `intervalMs` it generates a realistic reading for ODYSSEY-001 and
 * advances the mission state machine. The active mission drives the phase,
 * which shapes the simulated values (dive → depth increase → pressure rise,
 * surface → battery drain, etc.).
 *
 * On each tick it calls `onReading(reading)` with the full row so the
 * WebSocket layer can broadcast it.
 */
class SensorSimulator {
  constructor(intervalMs = config.sensorSimIntervalMs) {
    this.intervalMs = intervalMs;
    this.onReading = () => {};
    this.onPhaseChange = () => {};
    this.timer = null;
    this.tick = 0;
    // Phase cycle in order
    this.phaseOrder = ['DIVE', 'DRIFT', 'SENSE', 'DECIDE', 'SURFACE', 'TRANSMIT'];
    this.phaseIndex = 2; // start at SENSE to match seed
    this.currentPhase = 'SENSE';
    this.depth = 12;
    this.temperature = -1.8;
    this.battery = 87;
    this.running = false;
  }

  start() {
    if (this.timer) return;
    this.running = true;
    logEvent('simulator', 'Sensor simulator started (ODYSSEY-001).', 'info', 'simulator');
    this.timer = setInterval(() => this.tickStep(), this.intervalMs);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
    logEvent('simulator', 'Sensor simulator stopped.', 'info', 'simulator');
  }

  /** Advance one interval. */
  tickStep() {
    this.tick++;
    const mission = this.activeMission();
    if (mission && mission.status === 'running') {
      this.stepPhase(mission);
      this.updateBattery(mission);
    }

    // Read values are shaped by the current phase
    const reading = this.generateReading(mission);
    const id = insertReading(reading);
    reading.id = id;

    // Occasionally drop a reading into pending_sync to exercise the
    // offline-buffer path (Wi-Fi loss simulation ~3% of ticks).
    if (this.tick % 33 === 0) {
      const { db } = require('../database/db');
      db.prepare(`INSERT INTO pending_sync (device_id, payload, created_at)
                  VALUES (?, ?, ?)`).run(
        reading.device_id, JSON.stringify(reading), reading.timestamp
      );
      logEvent('comm', 'Wi-Fi link lost — buffering reading to MicroSD.', 'warning', 'esp8266');
    } else if (this.tick % 33 === 16) {
      const { db } = require('../database/db');
      const pending = db.prepare(`SELECT id FROM pending_sync WHERE synced=0 ORDER BY id LIMIT 5`).all();
      for (const p of pending) {
        db.prepare(`UPDATE pending_sync SET synced=1, synced_at=? WHERE id=?`)
          .run(new Date().toISOString(), p.id);
      }
      if (pending.length) logEvent('comm', 'Wi-Fi restored — flushed buffered records.', 'info', 'esp8266');
    }

    this.onReading(reading);
  }

  /** Get the active running mission, if any. */
  activeMission() {
    return getRow(`SELECT * FROM missions WHERE status = 'running' ORDER BY start_time DESC LIMIT 1`);
  }

  /** Walk the DIVE → DRIFT → SENSE → DECIDE → SURFACE → TRANSMIT cycle. */
  stepPhase(mission) {
    // Transitions are probabilistic so the demo stays lively.
    const r = Math.random();
    if (r < 0.02) {
      const nextIndex = (this.phaseIndex + 1) % this.phaseOrder.length;
      this.phaseIndex = nextIndex;
      const next = this.phaseOrder[nextIndex];
      this.setPhase(next, mission);
    }
  }

  setPhase(next, mission) {
    if (next === this.currentPhase) return;
    const prev = this.currentPhase;
    this.currentPhase = next;
    runQuery(`UPDATE missions SET current_phase = ? WHERE id = ?`, [next, mission.id]);
    logEvent('mission', `Phase transition: ${prev} → ${next}.`, 'info', 'mission');
    this.onPhaseChange({ mission_id: mission.id, from: prev, to: next, timestamp: new Date().toISOString() });
  }

  updateBattery(mission) {
    this.battery = Math.max(5, this.battery - 0.01 + (Math.random() - 0.5) * 0.005);
    if (this.battery < 12) {
      // Low-battery: emergency surface, then abort the mission.
      if (this.currentPhase !== 'SURFACE') this.setPhase('SURFACE', mission);
      if (this.battery < 8) {
        runQuery(`UPDATE missions SET status='completed', current_phase='TRANSMIT', end_time=?
                  WHERE id=?`, [new Date().toISOString(), mission.id]);
        logEvent('mission', 'Mission auto-completed after low-battery fallback.', 'warning', 'mission');
        this.battery = 87; // reset for a fresh cycle
        this.phaseIndex = 2;
      }
    }
  }

  /** Build a realistic reading from the current phase + slight noise. */
  generateReading(mission) {
    const now = new Date().toISOString();
    const n = () => (Math.random() - 0.5) * 2;

    // Phase-driven targets
    const targets = {
      DIVE:    { depth: 38, temp: -2.1, pressure: 1031 },
      DRIFT:   { depth: 14, temp: -0.9, pressure: 1019 },
      SENSE:   { depth: 28, temp: -1.7, pressure: 1026 },
      DECIDE:  { depth: 28, temp: -1.7, pressure: 1026 },
      SURFACE: { depth: 2,  temp: -0.4, pressure: 1013 },
      TRANSMIT:{ depth: 0,  temp: -0.3, pressure: 1013 },
    };
    const t = targets[this.currentPhase] || targets.SENSE;
    // ease toward the target
    this.depth += (t.depth - this.depth) * 0.15 + n() * 0.4;
    this.temperature += (t.temp - this.temperature) * 0.2 + n() * 0.05;
    this.temperature = Math.max(-2.5, Math.min(0.5, this.temperature));
    const pressure = 1013.25 + this.depth * 0.0981 + n() * 0.8;

    const tilt = n() * 0.03;
    return {
      device_id: config.simDeviceId,
      timestamp: now,
      temperature: Math.round(this.temperature * 100) / 100,
      pressure: Math.round(pressure * 10) / 10,
      depth: Math.round(this.depth * 10) / 10,
      accel_x: Math.round((tilt + 0.01) * 100) / 100,
      accel_y: Math.round(tilt * 100) / 100,
      accel_z: Math.round((0.98 + n() * 0.01) * 100) / 100,
      gyro_x: Math.round(n() * 1.5 * 100) / 100,
      gyro_y: Math.round(n() * 1.5 * 100) / 100,
      gyro_z: Math.round(n() * 1.5 * 100) / 100,
      battery: Math.round(this.battery * 10) / 10,
      status: this.currentPhase,
      mission_id: mission ? mission.id : null,
    };
  }
}

module.exports = SensorSimulator;