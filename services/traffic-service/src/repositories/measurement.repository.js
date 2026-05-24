const { getPool } = require('../db');

async function findMeasurementsByZoneId(zoneId, limit = 20) {
  const pool = await getPool();
  const [rows] = await pool.execute(
    `SELECT * FROM traffic_measurements WHERE zoneId = ? ORDER BY measuredAt DESC LIMIT ${Number(limit)}`,
    [zoneId]
  );
  return rows;
}

async function findMeasurementsByRecipient(recipientId) {
  const pool = await getPool();
  const [rows] = await pool.execute(
    'SELECT * FROM traffic_measurements WHERE zoneId = ? ORDER BY measuredAt DESC LIMIT 20',
    [recipientId]
  );
  return rows;
}

async function createMeasurement(measurement) {
  const pool = await getPool();
  await pool.execute(
    'INSERT INTO traffic_measurements (id, zoneId, vehicleCount, averageSpeed, density, notes) VALUES (?,?,?,?,?,?)',
    [measurement.id, measurement.zoneId, measurement.vehicleCount, measurement.averageSpeed, measurement.density, measurement.notes]
  );
  return findMeasurementById(measurement.id);
}

async function findMeasurementById(id) {
  const pool = await getPool();
  const [rows] = await pool.execute('SELECT * FROM traffic_measurements WHERE id = ?', [id]);
  return rows[0] || null;
}

module.exports = { findMeasurementsByZoneId, createMeasurement, findMeasurementById };