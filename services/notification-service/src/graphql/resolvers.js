const { PubSub, withFilter } = require('graphql-subscriptions');
const {
  getNotifications,
  getNotificationById,
  getUnreadNotificationsCount,
  sendNotification,
  markAsRead,
  markAllRead,
  removeNotification,
} = require('../services/notification.service');

const pubsub = new PubSub();
const NOTIFICATION_RECEIVED = 'NOTIFICATION_RECEIVED';
const NOTIFICATION_READ = 'NOTIFICATION_READ';

function requireAuth(user) {
  if (!user) {
    throw new Error('Unauthorized');
  }
}

module.exports = {
  Query: {
    notifications: async (_, { recipientId }, { user }) => {
      requireAuth(user);
      const id = recipientId || user.sub;
      return getNotifications(id);
    },

    notification: async (_, { id }, { user }) => {
      requireAuth(user);
      return getNotificationById(id);
    },

    unreadNotificationsCount: async (_, { recipientId }, { user }) => {
      requireAuth(user);
      const id = recipientId || user.sub;
      return getUnreadNotificationsCount(id);
    },
  },

  Mutation: {
    sendNotification: async (_, { input }, { user }) => {
      requireAuth(user);
      const notification = await sendNotification(input);
      pubsub.publish(NOTIFICATION_RECEIVED, {
        notificationReceived: notification,
        recipientId: notification.recipientId,
      });
      return notification;
    },

    markNotificationRead: async (_, { id }, { user }) => {
      requireAuth(user);
      const notification = await markAsRead(id);
      pubsub.publish(NOTIFICATION_READ, {
        notificationRead: notification,
        recipientId: notification.recipientId,
      });
      return notification;
    },

    markAllNotificationsRead: async (_, { recipientId }, { user }) => {
      requireAuth(user);
      return markAllRead(recipientId || user.sub);
    },

    deleteNotification: async (_, { id }, { user }) => {
      requireAuth(user);
      return removeNotification(id);
    },
  },

  Subscription: {
    notificationReceived: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([NOTIFICATION_RECEIVED]),
        (payload, variables) => payload.recipientId === variables.recipientId
      ),
    },
    notificationRead: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([NOTIFICATION_READ]),
        (payload, variables) => payload.recipientId === variables.recipientId
      ),
    },
  },
};
