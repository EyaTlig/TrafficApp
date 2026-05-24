function formatIncident(row) {
  if (!row) return null;
  return {
    ...row,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    resolvedAt: row.resolvedAt?.toISOString?.() || row.resolvedAt,
    createdAt: row.createdAt?.toISOString?.() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
  };
}

module.exports = { formatIncident };