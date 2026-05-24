/**
 * Tests unitaires — notification-service
 */

const mockExecute      = jest.fn();
const mockRelease      = jest.fn();
const mockGetConnection = jest.fn(() => ({
  execute: mockExecute,
  release: mockRelease,
}));

jest.mock('mysql2/promise', () => ({
  createPool: jest.fn(() => ({
    execute:       mockExecute,
    getConnection: mockGetConnection,
  })),
}));

jest.mock('../src/db', () => ({
  getPool: jest.fn(() => Promise.resolve({
    execute:       mockExecute,
    getConnection: mockGetConnection,
  })),
}));

// Stub PubSub
const mockPublish      = jest.fn();
const mockAsyncIterator = jest.fn(() => ({ [Symbol.asyncIterator]: jest.fn() }));

jest.mock('graphql-subscriptions', () => ({
  PubSub: jest.fn().mockImplementation(() => ({
    publish:       mockPublish,
    asyncIterator: mockAsyncIterator,
  })),
  withFilter: jest.fn((iteratorFn, filterFn) => iteratorFn),
}));

const resolvers = require('../src/resolvers');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeNotif(overrides = {}) {
  return {
    id:              'notif-uuid-1',
    title:           'Test notification',
    message:         'Message de test',
    type:            'SYSTEM',
    recipientId:     'user-1',
    isRead:          0,
    relatedEntityId: null,
    readAt:          null,
    createdAt:       new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

const AUTH_CTX = { user: { sub: 'user-1', role: 'OPERATOR' } };
const NO_AUTH  = { user: null };

beforeEach(() => {
  mockExecute.mockReset();
  mockPublish.mockReset();
  mockExecute.mockResolvedValue([[], []]);
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERY › notifications
// ═════════════════════════════════════════════════════════════════════════════
describe('Query.notifications', () => {
  it('retourne les notifications de l\'utilisateur connecté', async () => {
    mockExecute.mockResolvedValueOnce([[makeNotif(), makeNotif({ id: 'notif-2' })]]);
    const result = await resolvers.Query.notifications(null, {}, AUTH_CTX);
    expect(result).toHaveLength(2);
    expect(result[0].isRead).toBe(false);
  });

  it('filtre par recipientId si fourni', async () => {
    mockExecute.mockResolvedValueOnce([[makeNotif({ recipientId: 'user-99' })]]);
    const result = await resolvers.Query.notifications(null, { recipientId: 'user-99' }, AUTH_CTX);
    expect(result[0].recipientId).toBe('user-99');

    const params = mockExecute.mock.calls[0][1];
    expect(params[0]).toBe('user-99');
  });

  it('utilise user.sub par défaut si recipientId absent', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    await resolvers.Query.notifications(null, {}, AUTH_CTX);
    const params = mockExecute.mock.calls[0][1];
    expect(params[0]).toBe('user-1'); // = AUTH_CTX.user.sub
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Query.notifications(null, {}, NO_AUTH))
      .rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERY › notification (par ID)
// ═════════════════════════════════════════════════════════════════════════════
describe('Query.notification', () => {
  it('retourne la notification correspondante', async () => {
    mockExecute.mockResolvedValueOnce([[makeNotif()]]);
    const result = await resolvers.Query.notification(null, { id: 'notif-uuid-1' }, AUTH_CTX);
    expect(result.id).toBe('notif-uuid-1');
    expect(result.title).toBe('Test notification');
  });

  it('lève Notification not found si absente', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    await expect(resolvers.Query.notification(null, { id: 'ghost' }, AUTH_CTX))
      .rejects.toThrow('Notification not found');
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Query.notification(null, { id: 'x' }, NO_AUTH))
      .rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERY › unreadNotificationsCount
// ═════════════════════════════════════════════════════════════════════════════
describe('Query.unreadNotificationsCount', () => {
  it('retourne le nombre de non-lues', async () => {
    mockExecute.mockResolvedValueOnce([[{ cnt: 5 }]]);
    const result = await resolvers.Query.unreadNotificationsCount(null, { recipientId: 'user-1' }, AUTH_CTX);
    expect(result).toBe(5);
  });

  it('retourne 0 si aucune non-lue', async () => {
    mockExecute.mockResolvedValueOnce([[{ cnt: 0 }]]);
    const result = await resolvers.Query.unreadNotificationsCount(null, { recipientId: 'user-1' }, AUTH_CTX);
    expect(result).toBe(0);
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Query.unreadNotificationsCount(null, { recipientId: 'x' }, NO_AUTH))
      .rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION › sendNotification
// ═════════════════════════════════════════════════════════════════════════════
describe('Mutation.sendNotification', () => {
  it('crée une notification et publie l\'événement WS', async () => {
    mockExecute.mockResolvedValueOnce([{ insertId: 1 }]);
    mockExecute.mockResolvedValueOnce([[makeNotif()]]);

    const result = await resolvers.Mutation.sendNotification(null, {
      title:       'Test',
      message:     'Message',
      type:        'SYSTEM',
      recipientId: 'user-1',
    }, AUTH_CTX);

    expect(result.id).toBe('notif-uuid-1');
    expect(mockPublish).toHaveBeenCalledWith(
      'NOTIFICATION_RECEIVED',
      expect.objectContaining({ recipientId: 'user-1' })
    );
  });

  it('utilise SYSTEM comme type par défaut', async () => {
    mockExecute.mockResolvedValueOnce([{ insertId: 1 }]);
    mockExecute.mockResolvedValueOnce([[makeNotif()]]);

    await resolvers.Mutation.sendNotification(null, {
      title:       'Test',
      message:     'Msg',
      recipientId: 'user-1',
    }, AUTH_CTX);

    const insertParams = mockExecute.mock.calls[0][1];
    expect(insertParams[3]).toBe('SYSTEM');
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Mutation.sendNotification(null, {
      title: 'X', message: 'Y', recipientId: 'u',
    }, NO_AUTH)).rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION › markNotificationRead
// ═════════════════════════════════════════════════════════════════════════════
describe('Mutation.markNotificationRead', () => {
  it('marque la notification comme lue et publie l\'événement WS', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    mockExecute.mockResolvedValueOnce([[makeNotif({ isRead: 1, readAt: new Date() })]]);

    const result = await resolvers.Mutation.markNotificationRead(null, { id: 'notif-uuid-1' }, AUTH_CTX);

    expect(result.isRead).toBe(true);
    expect(mockPublish).toHaveBeenCalledWith(
      'NOTIFICATION_READ',
      expect.objectContaining({ recipientId: 'user-1' })
    );
  });

  it('lève Notification not found si absente', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 0 }]);
    mockExecute.mockResolvedValueOnce([[]]);
    await expect(resolvers.Mutation.markNotificationRead(null, { id: 'ghost' }, AUTH_CTX))
      .rejects.toThrow('Notification not found');
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Mutation.markNotificationRead(null, { id: 'x' }, NO_AUTH))
      .rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION › markAllNotificationsRead
// ═════════════════════════════════════════════════════════════════════════════
describe('Mutation.markAllNotificationsRead', () => {
  it('marque toutes les notifications d\'un destinataire comme lues', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 3 }]);
    mockExecute.mockResolvedValueOnce([[
      makeNotif({ isRead: 1 }),
      makeNotif({ id: 'notif-2', isRead: 1 }),
      makeNotif({ id: 'notif-3', isRead: 1 }),
    ]]);

    const result = await resolvers.Mutation.markAllNotificationsRead(null, {
      recipientId: 'user-1',
    }, AUTH_CTX);

    expect(result).toBe(3);
    // Un publish par notification
    expect(mockPublish).toHaveBeenCalledTimes(3);
  });

  it('retourne 0 si aucune notification non-lue', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 0 }]);
    mockExecute.mockResolvedValueOnce([[]]);

    const result = await resolvers.Mutation.markAllNotificationsRead(null, {
      recipientId: 'user-1',
    }, AUTH_CTX);

    expect(result).toBe(0);
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Mutation.markAllNotificationsRead(null, { recipientId: 'x' }, NO_AUTH))
      .rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION › deleteNotification
// ═════════════════════════════════════════════════════════════════════════════
describe('Mutation.deleteNotification', () => {
  it('supprime la notification et renvoie true', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const result = await resolvers.Mutation.deleteNotification(null, { id: 'notif-uuid-1' }, AUTH_CTX);
    expect(result).toBe(true);
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Mutation.deleteNotification(null, { id: 'x' }, NO_AUTH))
      .rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Formatage des données
// ═════════════════════════════════════════════════════════════════════════════
describe('formatage des champs', () => {
  it('convertit isRead (int) en Boolean', async () => {
    mockExecute.mockResolvedValueOnce([[makeNotif({ isRead: 0 })]]);
    const result = await resolvers.Query.notifications(null, {}, AUTH_CTX);
    expect(result[0].isRead).toBe(false);
  });

  it('sérialise createdAt en ISO string', async () => {
    mockExecute.mockResolvedValueOnce([[makeNotif()]]);
    const result = await resolvers.Query.notifications(null, {}, AUTH_CTX);
    expect(result[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('retourne null pour readAt si non lu', async () => {
    mockExecute.mockResolvedValueOnce([[makeNotif({ readAt: null })]]);
    const result = await resolvers.Query.notifications(null, {}, AUTH_CTX);
    expect(result[0].readAt).toBeNull();
  });
});
