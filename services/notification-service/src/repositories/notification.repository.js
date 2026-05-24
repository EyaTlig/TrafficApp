const { getPool } = require('../db');

async function findNotificationsByRecipient(recipientId) {
  const pool = await getPool();
  const [rows] = await pool.execute(
    'SELECT * FROM notifications WHERE recipientId = ? ORDER BY createdAt DESC',
    [recipientId]
  );
  return rows;
}

async function findNotificationById(id) {
  const pool = await getPool();
  const [rows] = await pool.execute('SELECT * FROM notifications WHERE id = ?', [id]);
  return rows[0] || null;
}

async function countUnreadNotifications(recipientId) {
  const pool = await getPool();
  const [rows] = await pool.execute(
    'SELECT COUNT(*) as cnt FROM notifications WHERE recipientId = ? AND isRead = FALSE',
    [recipientId]
  );
  return rows[0]?.cnt || 0;
}

async function createNotification(notification) {
  const pool = await getPool();
  await pool.execute(
    'INSERT INTO notifications (id, title, message, type, recipientId, relatedEntityId) VALUES (?,?,?,?,?,?)',
    [notification.id, notification.title, notification.message, notification.type, notification.recipientId, notification.relatedEntityId]
  );
  return findNotificationById(notification.id);
}

async function markNotificationRead(id) {
  const pool = await getPool();
  await pool.execute('UPDATE notifications SET isRead = TRUE, readAt = NOW() WHERE id = ?', [id]);
  return findNotificationById(id);
}

async function markAllNotificationsRead(recipientId) {
  const pool = await getPool();
  await pool.execute('UPDATE notifications SET isRead = TRUE, readAt = NOW() WHERE recipientId = ? AND isRead = FALSE', [recipientId]);
  const [rows] = await pool.execute('SELECT * FROM notifications WHERE recipientId = ? AND isRead = TRUE', [recipientId]);
  return rows;
}

async function deleteNotification(id) {
  const pool = await getPool();
  await pool.execute('DELETE FROM notifications WHERE id = ?', [id]);
  return true;
}

module.exports = {
  findNotificationsByRecipient,
  findNotificationById,
  countUnreadNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
};