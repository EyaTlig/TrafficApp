const { v4: uuidv4 } = require('uuid');
const {
  findNotificationsByRecipient,
  findNotificationById,
  countUnreadNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} = require('../repositories/notification.repository');
const { validateSendNotification } = require('../validators/notification.validator');
const { formatNotification } = require('../utils/format');

async function getNotifications(recipientId) {
  const rows = await findNotificationsByRecipient(recipientId);
  return rows.map(formatNotification);
}

async function getNotificationById(id) {
  const row = await findNotificationById(id);
  return row ? formatNotification(row) : null;
}

async function getUnreadNotificationsCount(recipientId) {
  return countUnreadNotifications(recipientId);
}

async function sendNotification(input) {
  validateSendNotification(input);
  const notification = {
    id: uuidv4(),
    title: input.title,
    message: input.message,
    type: input.type || 'SYSTEM',
    recipientId: input.recipientId,
    relatedEntityId: input.relatedEntityId || null,
  };
  const created = await createNotification(notification);
  return formatNotification(created);
}

async function markAsRead(id) {
  const updated = await markNotificationRead(id);
  if (!updated) {
    throw new Error('Notification not found');
  }
  return formatNotification(updated);
}

async function markAllRead(recipientId) {
  const rows = await markAllNotificationsRead(recipientId);
  return rows.length;
}

async function removeNotification(id) {
  await deleteNotification(id);
  return true;
}

module.exports = { getNotifications, getNotificationById, getUnreadNotificationsCount, sendNotification, markAsRead, markAllRead, removeNotification };