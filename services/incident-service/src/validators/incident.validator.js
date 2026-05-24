function validateCreateIncident(input) {
  if (!input.title || !input.title.trim()) {
    throw new Error('title is required');
  }
  if (!input.type) {
    throw new Error('type is required');
  }
  if (typeof input.latitude !== 'number' || typeof input.longitude !== 'number') {
    throw new Error('latitude and longitude are required');
  }
}

function validateUpdateIncidentStatus(input) {
  if (!input.id) {
    throw new Error('Incident id is required');
  }
  if (!input.status) {
    throw new Error('status is required');
  }
}

module.exports = { validateCreateIncident, validateUpdateIncidentStatus };