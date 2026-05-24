function formatNotification(row) {
  if (!row) return null;
  return {
    ...row,
    isRead: Boolean(row.isRead),
    createdAt: row.createdAt?.toISOString?.() || row.createdAt,
    readAt: row.readAt?.toISOString?.() || row.readAt || null,
  };
}

module.exports = { formatNotification };