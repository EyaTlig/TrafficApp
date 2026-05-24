function formatVehicle(row) {
  if (!row) return null;
  return {
    ...row,
    createdAt: row.createdAt?.toISOString?.() || row.createdAt,
  };
}

function formatPosition(row) {
  if (!row) return null;
  return {
    ...row,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    speed: row.speed != null ? parseFloat(row.speed) : null,
    recordedAt: row.recordedAt?.toISOString?.() || row.recordedAt,
  };
}

module.exports = { formatVehicle, formatPosition };