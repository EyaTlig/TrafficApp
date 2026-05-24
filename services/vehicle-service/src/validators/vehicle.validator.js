function validateCreateVehicle(input) {
  if (!input.licensePlate || !input.licensePlate.trim()) {
    throw new Error('licensePlate is required');
  }
  if (!input.brand || !input.brand.trim()) {
    throw new Error('brand is required');
  }
  if (!input.model || !input.model.trim()) {
    throw new Error('model is required');
  }
}

function validateUpdateVehicle(input) {
  if (!input.id) {
    throw new Error('Vehicle id is required');
  }
}

function validateRecordPosition(input) {
  if (!input.vehicleId) {
    throw new Error('vehicleId is required');
  }
  if (typeof input.latitude !== 'number' || typeof input.longitude !== 'number') {
    throw new Error('latitude and longitude are required');
  }
}

module.exports = { validateCreateVehicle, validateUpdateVehicle, validateRecordPosition };