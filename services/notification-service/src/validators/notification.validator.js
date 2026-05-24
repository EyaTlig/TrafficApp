function validateSendNotification(input) {
  if (!input) {
    throw new Error('Notification payload is required');
  }
  if (!input.title || !input.title.trim()) {
    throw new Error('Notification title is required');
  }
  if (!input.message || !input.message.trim()) {
    throw new Error('Notification message is required');
  }
  if (!input.recipientId || !input.recipientId.trim()) {
    throw new Error('Notification recipientId is required');
  }
}

module.exports = { validateSendNotification };