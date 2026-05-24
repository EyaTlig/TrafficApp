const { v4: uuidv4 } = require('uuid');
const {
  findAllVehicles,
  findVehicleById,
  findVehicleByLicensePlate,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} = require('../repositories/vehicle.repository');
const { findPositionsByVehicleId, findLastPositionByVehicleId, createPosition } = require('../repositories/position.repository');
const { validateCreateVehicle, validateUpdateVehicle, validateRecordPosition } = require('../validators/vehicle.validator');
const { formatVehicle, formatPosition } = require('../utils/format');

async function getVehicles() {
  const rows = await findAllVehicles();
  return rows.map(formatVehicle);
}

async function getVehicleById(id) {
  const vehicle = await findVehicleById(id);
  return vehicle ? formatVehicle(vehicle) : null;
}

async function getPositionHistory(vehicleId, limit) {
  const rows = await findPositionsByVehicleId(vehicleId, limit);
  return rows.map(formatPosition);
}

async function getLastPosition(vehicleId) {
  const row = await findLastPositionByVehicleId(vehicleId);
  return formatPosition(row);
}

async function addVehicle(input) {
  validateCreateVehicle(input);

  const existing = await findVehicleByLicensePlate(input.licensePlate);
  if (existing) {
    throw new Error('License plate already registered');
  }

  const vehicle = {
    id: uuidv4(),
    licensePlate: input.licensePlate,
    brand: input.brand,
    model: input.model,
    type: input.type || 'CAR',
    driverName: input.driverName || null,
  };

  const created = await createVehicle(vehicle);
  return formatVehicle(created);
}

async function changeVehicle(input) {
  validateUpdateVehicle(input);
  const updated = await updateVehicle(input.id, input);
  if (!updated) {
    throw new Error('Vehicle not found');
  }
  return formatVehicle(updated);
}

async function removeVehicleById(id) {
  await deleteVehicle(id);
  return true;
}

async function recordPosition(input) {
  validateRecordPosition(input);
  const vehicle = await findVehicleById(input.vehicleId);
  if (!vehicle) {
    throw new Error('Vehicle not found');
  }

  const position = {
    id: uuidv4(),
    vehicleId: input.vehicleId,
    latitude: input.latitude,
    longitude: input.longitude,
    speed: input.speed || null,
    address: input.address || null,
  };

  const created = await createPosition(position);
  return formatPosition(created);
}

async function getVehiclePositions(vehicle) {
  const rows = await findPositionsByVehicleId(vehicle.id, 10);
  return rows.map(formatPosition);
}

module.exports = {
  getVehicles,
  getVehicleById,
  getPositionHistory,
  getLastPosition,
  addVehicle,
  changeVehicle,
  removeVehicleById,
  recordPosition,
  getVehiclePositions,
};