/**
 * Tests unitaires — incident-service
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

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: { sendNotification: { id: 'notif-1' } } }),
  })
);

const resolvers = require('../src/resolvers');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeIncident(overrides = {}) {
  return {
    id:          'inc-uuid-1',
    title:       'Accident sur A1',
    description: 'Carambolage',
    type:        'ACCIDENT',
    status:      'REPORTED',
    latitude:    '48.8566000',
    longitude:   '2.3522000',
    address:     'Autoroute A1, Paris',
    reportedBy:  'user-1',
    resolvedAt:  null,
    createdAt:   new Date('2024-01-01T00:00:00Z'),
    updatedAt:   new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

const AUTH_CTX = { user: { sub: 'user-1', role: 'OPERATOR' }, token: 'tok123' };
const NO_AUTH  = { user: null };

beforeEach(() => {
  mockExecute.mockReset();
  global.fetch.mockClear();
  mockExecute.mockResolvedValue([[], []]);
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERY › incidents
// ═════════════════════════════════════════════════════════════════════════════
describe('Query.incidents', () => {
  it('retourne tous les incidents', async () => {
    mockExecute.mockResolvedValueOnce([[makeIncident(), makeIncident({ id: 'inc-2' })]]);
    const result = await resolvers.Query.incidents(null, {}, AUTH_CTX);
    expect(result).toHaveLength(2);
    expect(result[0].latitude).toBe(48.8566);
    expect(result[0].longitude).toBe(2.3522);
  });

  it('filtre par type', async () => {
    mockExecute.mockResolvedValueOnce([[makeIncident()]]);
    const result = await resolvers.Query.incidents(null, { type: 'ACCIDENT' }, AUTH_CTX);
    expect(result[0].type).toBe('ACCIDENT');
    // Vérifie que le filtre est passé à la requête SQL
    const sqlCall = mockExecute.mock.calls[0][0];
    expect(sqlCall).toContain('type = ?');
  });

  it('filtre par status', async () => {
    mockExecute.mockResolvedValueOnce([[makeIncident({ status: 'IN_PROGRESS' })]]);
    const result = await resolvers.Query.incidents(null, { status: 'IN_PROGRESS' }, AUTH_CTX);
    expect(result[0].status).toBe('IN_PROGRESS');
    const sqlCall = mockExecute.mock.calls[0][0];
    expect(sqlCall).toContain('status = ?');
  });

  it('accepte type ET status simultanément', async () => {
    mockExecute.mockResolvedValueOnce([[makeIncident()]]);
    await resolvers.Query.incidents(null, { type: 'ACCIDENT', status: 'REPORTED' }, AUTH_CTX);
    const sqlCall = mockExecute.mock.calls[0][0];
    expect(sqlCall).toContain('type = ?');
    expect(sqlCall).toContain('status = ?');
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Query.incidents(null, {}, NO_AUTH))
      .rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERY › incident (par ID)
// ═════════════════════════════════════════════════════════════════════════════
describe('Query.incident', () => {
  it('retourne l\'incident correspondant', async () => {
    mockExecute.mockResolvedValueOnce([[makeIncident()]]);
    const result = await resolvers.Query.incident(null, { id: 'inc-uuid-1' }, AUTH_CTX);
    expect(result.id).toBe('inc-uuid-1');
    expect(result.title).toBe('Accident sur A1');
  });

  it('lève Incident not found si absent', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    await expect(resolvers.Query.incident(null, { id: 'ghost' }, AUTH_CTX))
      .rejects.toThrow('Incident not found');
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Query.incident(null, { id: 'x' }, NO_AUTH))
      .rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERY › activeIncidents
// ═════════════════════════════════════════════════════════════════════════════
describe('Query.activeIncidents', () => {
  it('retourne les incidents actifs', async () => {
    mockExecute.mockResolvedValueOnce([[
      makeIncident({ status: 'REPORTED' }),
      makeIncident({ id: 'inc-2', status: 'IN_PROGRESS' }),
    ]]);
    const result = await resolvers.Query.activeIncidents(null, {}, AUTH_CTX);
    expect(result).toHaveLength(2);
  });

  it('utilise le bon filtre SQL', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    await resolvers.Query.activeIncidents(null, {}, AUTH_CTX);
    const sql = mockExecute.mock.calls[0][0];
    expect(sql).toContain('REPORTED');
    expect(sql).toContain('IN_PROGRESS');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION › createIncident
// ═════════════════════════════════════════════════════════════════════════════
describe('Mutation.createIncident', () => {
  it('crée un incident et envoie une notification', async () => {
    mockExecute.mockResolvedValueOnce([{ insertId: 1 }]);
    mockExecute.mockResolvedValueOnce([[makeIncident()]]);

    const result = await resolvers.Mutation.createIncident(null, {
      title:     'Accident sur A1',
      type:      'ACCIDENT',
      latitude:  48.8566,
      longitude: 2.3522,
      address:   'Autoroute A1, Paris',
    }, AUTH_CTX);

    expect(result.id).toBe('inc-uuid-1');
    expect(result.reportedBy).toBe('user-1');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.query).toContain('sendNotification');
    expect(body.variables.type).toBe('INCIDENT');
  });

  it('utilise les coordonnées comme adresse si address absent', async () => {
    mockExecute.mockResolvedValueOnce([{ insertId: 1 }]);
    mockExecute.mockResolvedValueOnce([[makeIncident()]]);

    await resolvers.Mutation.createIncident(null, {
      title:     'Test',
      type:      'ROADWORK',
      latitude:  48.8566,
      longitude: 2.3522,
    }, AUTH_CTX);

    const body    = JSON.parse(global.fetch.mock.calls[0][1].body);
    const message = body.variables.message;
    expect(message).toContain('48.8566');
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Mutation.createIncident(null, {
      title: 'X', type: 'ACCIDENT', latitude: 0, longitude: 0,
    }, NO_AUTH)).rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION › updateIncidentStatus
// ═════════════════════════════════════════════════════════════════════════════
describe('Mutation.updateIncidentStatus', () => {
  it('met à jour le statut et envoie une notification', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    mockExecute.mockResolvedValueOnce([[makeIncident({ status: 'RESOLVED', resolvedAt: new Date() })]]);

    const result = await resolvers.Mutation.updateIncidentStatus(null, {
      id: 'inc-uuid-1', status: 'RESOLVED',
    }, AUTH_CTX);

    expect(result.status).toBe('RESOLVED');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.variables.type).toBe('ALERT');
  });

  it('fixe resolvedAt lors du passage à RESOLVED', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    mockExecute.mockResolvedValueOnce([[makeIncident({ status: 'RESOLVED' })]]);

    await resolvers.Mutation.updateIncidentStatus(null, {
      id: 'inc-uuid-1', status: 'RESOLVED',
    }, AUTH_CTX);

    const updateCall = mockExecute.mock.calls[0][1];
    expect(updateCall[1]).toBeInstanceOf(Date); // resolvedAt
  });

  it('fixe resolvedAt à null pour les autres statuts', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    mockExecute.mockResolvedValueOnce([[makeIncident({ status: 'IN_PROGRESS' })]]);

    await resolvers.Mutation.updateIncidentStatus(null, {
      id: 'inc-uuid-1', status: 'IN_PROGRESS',
    }, AUTH_CTX);

    const updateCall = mockExecute.mock.calls[0][1];
    expect(updateCall[1]).toBeNull(); // resolvedAt = null
  });

  it('lève Incident not found si absent', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    mockExecute.mockResolvedValueOnce([[]]);
    await expect(resolvers.Mutation.updateIncidentStatus(null, {
      id: 'ghost', status: 'RESOLVED',
    }, AUTH_CTX)).rejects.toThrow('Incident not found');
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Mutation.updateIncidentStatus(null, {
      id: 'x', status: 'RESOLVED',
    }, NO_AUTH)).rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION › removeIncident
// ═════════════════════════════════════════════════════════════════════════════
describe('Mutation.removeIncident', () => {
  it('supprime l\'incident et renvoie true', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const result = await resolvers.Mutation.removeIncident(null, { id: 'inc-uuid-1' }, AUTH_CTX);
    expect(result).toBe(true);
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Mutation.removeIncident(null, { id: 'x' }, NO_AUTH))
      .rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Formatage des données
// ═════════════════════════════════════════════════════════════════════════════
describe('formatage des champs', () => {
  it('parse latitude/longitude en Float', async () => {
    mockExecute.mockResolvedValueOnce([[makeIncident()]]);
    const result = await resolvers.Query.incidents(null, {}, AUTH_CTX);
    expect(typeof result[0].latitude).toBe('number');
    expect(typeof result[0].longitude).toBe('number');
  });

  it('sérialise createdAt en ISO string', async () => {
    mockExecute.mockResolvedValueOnce([[makeIncident()]]);
    const result = await resolvers.Query.incidents(null, {}, AUTH_CTX);
    expect(result[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('retourne null pour resolvedAt si non résolu', async () => {
    mockExecute.mockResolvedValueOnce([[makeIncident({ resolvedAt: null })]]);
    const result = await resolvers.Query.incidents(null, {}, AUTH_CTX);
    expect(result[0].resolvedAt).toBeNull();
  });
});
