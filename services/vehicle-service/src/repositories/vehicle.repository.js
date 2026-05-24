const { getPool } = require('../db');

async function findAllVehicles() {
  const pool = await getPool();
  const [rows] = await pool.execute('SELECT * FROM vehicles ORDER BY createdAt DESC');
  return rows;
}

async function findVehicleById(id) {
  const pool = await getPool();
  const [rows] = await pool.execute('SELECT * FROM vehicles WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findVehicleByLicensePlate(licensePlate) {
  const pool = await getPool();
  const [rows] = await pool.execute('SELECT * FROM vehicles WHERE licensePlate = ?', [licensePlate]);
  return rows[0] || null;
}

async function createVehicle(vehicle) {
  const pool = await getPool();
  await pool.execute(
    'INSERT INTO vehicles (id, licensePlate, brand, model, type, driverName) VALUES (?,?,?,?,?,?)',
    [vehicle.id, vehicle.licensePlate, vehicle.brand, vehicle.model, vehicle.type, vehicle.driverName]
  );
  return findVehicleById(vehicle.id);
}

async function updateVehicle(id, fields) {
  const pool = await getPool();
  const updates = [];
  const values = [];

  Object.entries(fields).forEach(([key, value]) => {
    if (key === 'id' || value === undefined) {
      return;
    }
    updates.push(`${key} = ?`);
    values.push(value);
  });

  if (updates.length === 0) {
    return findVehicleById(id);
  }

  values.push(id);
  await pool.execute(`UPDATE vehicles SET ${updates.join(', ')} WHERE id = ?`, values);
  return findVehicleById(id);
}

async function deleteVehicle(id) {
  const pool = await getPool();
  await pool.execute('DELETE FROM vehicles WHERE id = ?', [id]);
  return true;
}

module.exports = { findAllVehicles, findVehicleById, findVehicleByLicensePlate, createVehicle, updateVehicle, deleteVehicle };