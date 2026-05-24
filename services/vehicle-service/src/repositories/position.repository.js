const { getPool } = require('../db');

async function findPositionsByVehicleId(vehicleId, limit = 50) {
  const pool = await getPool();
  const [rows] = await pool.execute(
    `SELECT * FROM gps_positions WHERE vehicleId = ? ORDER BY recordedAt DESC LIMIT ${Number(limit)}`,
    [vehicleId]
  );
  return rows;
}

async function findLastPositionByVehicleId(vehicleId) {
  const pool = await getPool();
  const [rows] = await pool.execute(
    'SELECT * FROM gps_positions WHERE vehicleId = ? ORDER BY recordedAt DESC LIMIT 1',
    [vehicleId]
  );
  return rows[0] || null;
}

async function createPosition(position) {
  const pool = await getPool();
  await pool.execute(
    'INSERT INTO gps_positions (id, vehicleId, latitude, longitude, speed, address) VALUES (?,?,?,?,?,?)',
    [position.id, position.vehicleId, position.latitude, position.longitude, position.speed, position.address]
  );
  return findPositionById(position.id);
}

async function findPositionById(id) {
  const pool = await getPool();
  const [rows] = await pool.execute('SELECT * FROM gps_positions WHERE id = ?', [id]);
  return rows[0] || null;
}

module.exports = { findPositionsByVehicleId, findLastPositionByVehicleId, createPosition, findPositionById };