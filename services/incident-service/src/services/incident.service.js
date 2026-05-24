const { v4: uuidv4 } = require('uuid');
const {
  findAllIncidents,
  findIncidentById,
  findActiveIncidents,
  createIncident,
  updateIncidentStatus,
  deleteIncident,
} = require('../repositories/incident.repository');
const { validateCreateIncident, validateUpdateIncidentStatus } = require('../validators/incident.validator');
const { formatIncident } = require('../utils/format');

async function getIncidents(filters) {
  const rows = await findAllIncidents(filters);
  return rows.map(formatIncident);
}

async function getIncidentById(id) {
  const row = await findIncidentById(id);
  return row ? formatIncident(row) : null;
}

async function getActiveIncidents() {
  const rows = await findActiveIncidents();
  return rows.map(formatIncident);
}

async function addIncident(input, user) {
  validateCreateIncident(input);
  const incident = {
    id: uuidv4(),
    title: input.title,
    description: input.description || null,
    type: input.type,
    latitude: input.latitude,
    longitude: input.longitude,
    address: input.address || null,
    reportedBy: user.sub,
  };
  const created = await createIncident(incident);
  return formatIncident(created);
}

async function changeIncidentStatus(id, status) {
  validateUpdateIncidentStatus({ id, status });
  const updated = await updateIncidentStatus(id, status);
  if (!updated) {
    throw new Error('Incident not found');
  }
  return formatIncident(updated);
}

async function removeIncidentById(id) {
  await deleteIncident(id);
  return true;
}

module.exports = { getIncidents, getIncidentById, getActiveIncidents, addIncident, changeIncidentStatus, removeIncidentById };