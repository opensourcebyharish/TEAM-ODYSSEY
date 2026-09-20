const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');

// Ensure data directory exists
fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Load schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

/**
 * Run a prepared query with parameters.
 * Returns all rows for SELECT, { changes, lastInsertRowid } otherwise.
 */
function runQuery(sql, params = []) {
  const stmt = db.prepare(sql);
  const isSelect = /^\s*SELECT/i.test(sql);
  if (isSelect) {
    return stmt.all(...params);
  }
  const result = stmt.run(...params);
  return {
    changes: result.changes,
    lastInsertRowid: result.lastInsertRowid,
  };
}

/**
 * Get a single row or undefined.
 */
function getRow(sql, params = []) {
  return db.prepare(sql).get(...params);
}

/**
 * Run a query with named-object parameters (keys must carry the `:`/`@`/`$` prefix).
 */
function runNamed(sql, namedParams = {}) {
  const stmt = db.prepare(sql);
  const isSelect = /^\s*SELECT/i.test(sql);
  if (isSelect) return stmt.all(namedParams);
  const result = stmt.run(namedParams);
  return {
    changes: result.changes,
    lastInsertRowid: result.lastInsertRowid,
  };
}

/**
 * Insert a row into a table from an object.
 */
function insert(table, data) {
  const keys = Object.keys(data);
  const cols = keys.map((k) => `"${k}"`).join(', ');
  const placeholders = keys.map((k) => `@${k}`).join(', ');
  const named = {};
  keys.forEach((k) => { named[`@${k}`] = data[k]; });
  return runNamed(`INSERT INTO "${table}" (${cols}) VALUES (${placeholders})`, named).lastInsertRowid;
}

/**
 * Insert a system event into the log.
 */
function logEvent(eventType, message, severity = 'info', source = 'system') {
  return insert('system_events', {
    event_type: eventType,
    message,
    severity,
    source,
  });
}

module.exports = { db, runQuery, getRow, runNamed, insert, logEvent };