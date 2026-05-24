const { gql } = require('graphql-tag');

module.exports = gql`
  enum NotificationType { INCIDENT CONGESTION SYSTEM ALERT }

  type Notification {
    id: ID!
    title: String!
    message: String!
    type: NotificationType!
    recipientId: String!
    isRead: Boolean!
    relatedEntityId: String
    readAt: String
    createdAt: String!
  }

  input SendNotificationInput {
    title: String!
    message: String!
    type: NotificationType
    recipientId: String!
    relatedEntityId: String
  }

  type Query {
    notifications(recipientId: String): [Notification!]!
    notification(id: ID!): Notification
    unreadNotificationsCount(recipientId: String!): Int!
  }

  type Mutation {
    sendNotification(input: SendNotificationInput!): Notification!
    markNotificationRead(id: ID!): Notification!
    markAllNotificationsRead(recipientId: String!): Int!
    deleteNotification(id: ID!): Boolean!
  }

  type Subscription {
    notificationReceived(recipientId: String!): Notification!
    notificationRead(recipientId: String!): Notification!
  }
`;
