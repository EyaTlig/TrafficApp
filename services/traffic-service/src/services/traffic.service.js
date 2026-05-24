const { v4: uuidv4 } = require('uuid');
const { findAllZones, findZoneById, findCongestedZones, createZone, updateZone } = require('../repositories/zone.repository');
const { findMeasurementsByZoneId, createMeasurement, findMeasurementById } = require('../repositories/measurement.repository');
const { validateCreateTrafficZone, validateUpdateTrafficZone, validateMeasureTraffic } = require('../validators/traffic.validator');
const { formatZone, formatMeasurement } = require('../utils/format');

function computeDensity(vehicleCount) {
  if (vehicleCount < 10) return 'LOW';
  if (vehicleCount < 30) return 'MEDIUM';
  return 'HIGH';
}

async function getTrafficZones() {
  const rows = await findAllZones();
  return rows.map(formatZone);
}

async function getTrafficZoneById(id) {
  const row = await findZoneById(id);
  return row ? formatZone(row) : null;
}

async function getCongestedZones() {
  const rows = await findCongestedZones();
  return rows.map(formatZone);
}

async function getZoneMeasurements(zoneId, limit) {
  const rows = await findMeasurementsByZoneId(zoneId, limit);
  return rows.map(formatMeasurement);
}

async function getDensityStats() {
  const rows = await findAllZones();
  const stats = { low: 0, medium: 0, high: 0 };
  rows.forEach((zone) => {
    if (zone.currentDensity === 'LOW') stats.low += 1;
    if (zone.currentDensity === 'MEDIUM') stats.medium += 1;
    if (zone.currentDensity === 'HIGH') stats.high += 1;
  });
  return stats;
}

async function addTrafficZone(input) {
  validateCreateTrafficZone(input);
  const zone = {
    id: uuidv4(),
    name: input.name,
    description: input.description || null,
    centerLatitude: input.centerLatitude,
    centerLongitude: input.centerLongitude,
    radiusMeters: input.radiusMeters,
  };
  const created = await createZone(zone);
  return formatZone(created);
}

async function changeTrafficZone(input) {
  validateUpdateTrafficZone(input);
  const updated = await updateZone(input.id, input);
  if (!updated) {
    throw new Error('Zone not found');
  }
  return formatZone(updated);
}

async function measureTraffic(input) {
  validateMeasureTraffic(input);
  const zone = await findZoneById(input.zoneId);
  if (!zone) {
    throw new Error('Zone not found');
  }

  const density = computeDensity(input.vehicleCount);
  const measurement = {
    id: uuidv4(),
    zoneId: input.zoneId,
    vehicleCount: input.vehicleCount,
    averageSpeed: input.averageSpeed || null,
    density,
    notes: input.notes || null,
  };

  const created = await createMeasurement(measurement);
  await updateZone(input.zoneId, { currentDensity: density });
  return formatMeasurement(created);
}

module.exports = {
  getTrafficZones,
  getTrafficZoneById,
  getCongestedZones,
  getZoneMeasurements,
  getDensityStats,
  addTrafficZone,
  changeTrafficZone,
  measureTraffic,
};