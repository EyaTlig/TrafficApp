function formatZone(row) {
  if (!row) return null;
  return {
    ...row,
    centerLatitude: parseFloat(row.centerLatitude),
    centerLongitude: parseFloat(row.centerLongitude),
    radiusMeters: parseFloat(row.radiusMeters),
    createdAt: row.createdAt?.toISOString?.() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
  };
}

function formatMeasurement(row) {
  if (!row) return null;
  return {
    ...row,
    vehicleCount: Number(row.vehicleCount),
    averageSpeed: row.averageSpeed != null ? parseFloat(row.averageSpeed) : null,
    measuredAt: row.measuredAt?.toISOString?.() || row.measuredAt,
  };
}

module.exports = { formatZone, formatMeasurement };