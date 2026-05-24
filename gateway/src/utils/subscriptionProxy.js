const { createClient } = require('graphql-ws');
const WebSocket = require('ws');
const { serviceUrls } = require('../config');

const subscriptionQueries = {
  notificationReceived: `subscription NotificationReceived($recipientId: String!) {
    notificationReceived(recipientId: $recipientId) {
      id
      title
      message
      type
      recipientId
      isRead
      relatedEntityId
      readAt
      createdAt
    }
  }`,
  notificationRead: `subscription NotificationRead($recipientId: String!) {
    notificationRead(recipientId: $recipientId) {
      id
      title
      message
      type
      recipientId
      isRead
      relatedEntityId
      readAt
      createdAt
    }
  }`,
};

function createNoticeIterable(query, variables, authHeader) {
  let push;
  let pull;
  let done = false;
  const queue = [];

  const disposePromises = [];
  const iterable = {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      if (queue.length) {
        return Promise.resolve({ value: queue.shift(), done: false });
      }
      if (done) {
        return Promise.resolve({ value: undefined, done: true });
      }
      return new Promise((resolve, reject) => {
        pull = { resolve, reject };
      });
    },
    return() {
      done = true;
      disposePromises.forEach((promise) => promise.catch(() => {}));
      return Promise.resolve({ value: undefined, done: true });
    },
  };

  const client = createClient({
    url: serviceUrls.notificationWs,
    webSocketImpl: WebSocket,
    connectionParams: {
      authorization: authHeader || '',
    },
    lazy: true,
    retryAttempts: 2,
  });

  const dispose = client.subscribe(
    {
      query,
      variables,
    },
    {
      next: (result) => {
        if (result.errors) {
          const error = new Error(result.errors.map((item) => item.message).join(', '));
          if (pull) {
            pull.reject(error);
            pull = null;
          } else {
            queue.push(Promise.reject(error));
          }
          return;
        }

        const value = Object.values(result.data)[0];
        if (pull) {
          pull.resolve({ value, done: false });
          pull = null;
        } else {
          queue.push(value);
        }
      },
      error: (err) => {
        if (pull) {
          pull.reject(err);
          pull = null;
        } else {
          queue.push(Promise.reject(err));
        }
        done = true;
      },
      complete: () => {
        done = true;
        if (pull) {
          pull.resolve({ value: undefined, done: true });
          pull = null;
        }
      },
    }
  );

  disposePromises.push(Promise.resolve(dispose));
  return iterable;
}

function subscribe(eventName, variables, authHeader) {
  const query = subscriptionQueries[eventName];
  if (!query) {
    throw new Error(`Unsupported subscription event: ${eventName}`);
  }
  return createNoticeIterable(query, variables, authHeader);
}

module.exports = { subscribe };
