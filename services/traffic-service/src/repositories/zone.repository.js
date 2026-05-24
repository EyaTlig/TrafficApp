const { getPool } = require('../db');

async function findAllZones() {
  const pool = await getPool();
  const [rows] = await pool.execute('SELECT * FROM traffic_zones ORDER BY createdAt DESC');
  return rows;
}

async function findZoneById(id) {
  const pool = await getPool();
  const [rows] = await pool.execute('SELECT * FROM traffic_zones WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findCongestedZones() {
  const pool = await getPool();
  const [rows] = await pool.execute("SELECT * FROM traffic_zones WHERE currentDensity = 'HIGH' AND isActive = TRUE");
  return rows;
}

async function createZone(zone) {
  const pool = await getPool();
  await pool.execute(
    'INSERT INTO traffic_zones (id, name, description, centerLatitude, centerLongitude, radiusMeters) VALUES (?,?,?,?,?,?)',
    [zone.id, zone.name, zone.description, zone.centerLatitude, zone.centerLongitude, zone.radiusMeters]
  );
  return findZoneById(zone.id);
}

async function updateZone(id, fields) {
  const pool = await getPool();
  const updates = [];
  const values = [];

  Object.entries(fields).forEach(([key, value]) => {
    if (key === 'id' || value === undefined) return;
    updates.push(`${key} = ?`);
    values.push(value);
  });

  if (updates.length > 0) {
    values.push(id);
    await pool.execute(`UPDATE traffic_zones SET ${updates.join(', ')} WHERE id = ?`, values);
  }

  return findZoneById(id);
}

module.exports = { findAllZones, findZoneById, findCongestedZones, createZone, updateZone };