function validateCreateTrafficZone(input) {
  if (!input.name || !input.name.trim()) {
    throw new Error('name is required');
  }
  if (typeof input.centerLatitude !== 'number' || typeof input.centerLongitude !== 'number') {
    throw new Error('centerLatitude and centerLongitude are required');
  }
  if (typeof input.radiusMeters !== 'number' || input.radiusMeters <= 0) {
    throw new Error('radiusMeters must be greater than 0');
  }
}

function validateUpdateTrafficZone(input) {
  if (!input.id) {
    throw new Error('Zone id is required');
  }
}

function validateMeasureTraffic(input) {
  if (!input.zoneId) {
    throw new Error('zoneId is required');
  }
  if (typeof input.vehicleCount !== 'number' || input.vehicleCount < 0) {
    throw new Error('vehicleCount must be a non-negative number');
  }
}

module.exports = { validateCreateTrafficZone, validateUpdateTrafficZone, validateMeasureTraffic };