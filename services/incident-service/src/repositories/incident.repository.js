const { getPool } = require('../db');

async function findAllIncidents(filters = {}) {
  const pool = await getPool();
  const conditions = [];
  const values = [];

  if (filters.type) {
    conditions.push('type = ?');
    values.push(filters.type);
  }
  if (filters.status) {
    conditions.push('status = ?');
    values.push(filters.status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.execute(`SELECT * FROM incidents ${where} ORDER BY createdAt DESC`, values);
  return rows;
}

async function findIncidentById(id) {
  const pool = await getPool();
  const [rows] = await pool.execute('SELECT * FROM incidents WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findActiveIncidents() {
  const pool = await getPool();
  const [rows] = await pool.execute("SELECT * FROM incidents WHERE status != 'RESOLVED' ORDER BY createdAt DESC");
  return rows;
}

async function createIncident(incident) {
  const pool = await getPool();
  await pool.execute(
    'INSERT INTO incidents (id, title, description, type, latitude, longitude, address, reportedBy) VALUES (?,?,?,?,?,?,?,?)',
    [incident.id, incident.title, incident.description, incident.type, incident.latitude, incident.longitude, incident.address, incident.reportedBy]
  );
  return findIncidentById(incident.id);
}

async function updateIncidentStatus(id, status) {
  const pool = await getPool();
  await pool.execute('UPDATE incidents SET status = ? WHERE id = ?', [status, id]);
  return findIncidentById(id);
}

async function deleteIncident(id) {
  const pool = await getPool();
  await pool.execute('DELETE FROM incidents WHERE id = ?', [id]);
  return true;
}

module.exports = { findAllIncidents, findIncidentById, findActiveIncidents, createIncident, updateIncidentStatus, deleteIncident };