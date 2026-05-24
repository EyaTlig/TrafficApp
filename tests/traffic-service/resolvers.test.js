/**
 * Tests unitaires — traffic-service
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

jest.mock('../../services/traffic-service/src/db', () => ({
  getPool: jest.fn(() => Promise.resolve({
    execute:       mockExecute,
    getConnection: mockGetConnection,
  })),
}));

// Stub fetch global (appel inter-service vers notification-service)
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: { sendNotification: { id: 'notif-1' } } }),
  })
);

const resolvers = require('../../services/traffic-service/src/resolvers');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeZone(overrides = {}) {
  return {
    id:               'zone-uuid-1',
    name:             'Zone Centre',
    description:      'Zone de test',
    centerLatitude:   '48.8566000',
    centerLongitude:  '2.3522000',
    radiusMeters:     '500.00',
    currentDensity:   'LOW',
    isActive:         1,
    createdAt:        new Date('2024-01-01T00:00:00Z'),
    updatedAt:        new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeMeasurement(overrides = {}) {
  return {
    id:           'meas-uuid-1',
    zoneId:       'zone-uuid-1',
    vehicleCount: 5,
    averageSpeed: '50.00',
    density:      'LOW',
    measuredAt:   new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

const AUTH_CTX = { user: { sub: 'user-1', role: 'OPERATOR' }, token: 'Bearer tok' };
const NO_AUTH  = { user: null };

beforeEach(() => {
  mockExecute.mockReset();
  global.fetch.mockClear();
  mockExecute.mockResolvedValue([[], []]);
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERY › trafficZones
// ═════════════════════════════════════════════════════════════════════════════
describe('Query.trafficZones', () => {
  it('retourne toutes les zones', async () => {
    mockExecute.mockResolvedValueOnce([[makeZone(), makeZone({ id: 'zone-2' })]]);

    const result = await resolvers.Query.trafficZones(null, {}, AUTH_CTX);
    expect(result).toHaveLength(2);
    expect(result[0].isActive).toBe(true);
    expect(result[0].centerLatitude).toBe(48.8566);
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Query.trafficZones(null, {}, NO_AUTH))
      .rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERY › trafficZone
// ═════════════════════════════════════════════════════════════════════════════
describe('Query.trafficZone', () => {
  it('retourne la zone correspondante', async () => {
    mockExecute.mockResolvedValueOnce([[makeZone()]]);
    const result = await resolvers.Query.trafficZone(null, { id: 'zone-uuid-1' }, AUTH_CTX);
    expect(result.id).toBe('zone-uuid-1');
    expect(result.radiusMeters).toBe(500);
  });

  it('lève Zone not found si absente', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    await expect(resolvers.Query.trafficZone(null, { id: 'ghost' }, AUTH_CTX))
      .rejects.toThrow('Zone not found');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERY › congestedZones
// ═════════════════════════════════════════════════════════════════════════════
describe('Query.congestedZones', () => {
  it('retourne uniquement les zones HIGH', async () => {
    mockExecute.mockResolvedValueOnce([[makeZone({ currentDensity: 'HIGH' })]]);
    const result = await resolvers.Query.congestedZones(null, {}, AUTH_CTX);
    expect(result).toHaveLength(1);
    expect(result[0].currentDensity).toBe('HIGH');
  });

  it('renvoie [] si aucune zone congestionnée', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    const result = await resolvers.Query.congestedZones(null, {}, AUTH_CTX);
    expect(result).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERY › densityStats
// ═════════════════════════════════════════════════════════════════════════════
describe('Query.densityStats', () => {
  it('retourne les stats de densité correctement', async () => {
    mockExecute.mockResolvedValueOnce([[
      { currentDensity: 'LOW',    cnt: 3 },
      { currentDensity: 'MEDIUM', cnt: 2 },
      { currentDensity: 'HIGH',   cnt: 1 },
    ]]);

    const result = await resolvers.Query.densityStats(null, {}, AUTH_CTX);
    expect(result).toEqual({ low: 3, medium: 2, high: 1 });
  });

  it('retourne 0 pour les densités absentes', async () => {
    mockExecute.mockResolvedValueOnce([[{ currentDensity: 'HIGH', cnt: 5 }]]);
    const result = await resolvers.Query.densityStats(null, {}, AUTH_CTX);
    expect(result).toEqual({ low: 0, medium: 0, high: 5 });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERY › zoneMeasurements
// ═════════════════════════════════════════════════════════════════════════════
describe('Query.zoneMeasurements', () => {
  it('retourne les mesures de la zone', async () => {
    mockExecute.mockResolvedValueOnce([[makeMeasurement()]]);
    const result = await resolvers.Query.zoneMeasurements(null, { zoneId: 'zone-uuid-1' }, AUTH_CTX);
    expect(result).toHaveLength(1);
    expect(result[0].averageSpeed).toBe(50);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION › createTrafficZone
// ═════════════════════════════════════════════════════════════════════════════
describe('Mutation.createTrafficZone', () => {
  it('crée une zone et envoie une notification', async () => {
    mockExecute.mockResolvedValueOnce([{ insertId: 1 }]);
    mockExecute.mockResolvedValueOnce([[makeZone()]]);

    const result = await resolvers.Mutation.createTrafficZone(null, {
      name:            'Zone Centre',
      centerLatitude:  48.8566,
      centerLongitude: 2.3522,
      radiusMeters:    500,
    }, AUTH_CTX);

    expect(result.id).toBe('zone-uuid-1');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.query).toContain('sendNotification');
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Mutation.createTrafficZone(null, {
      name: 'X', centerLatitude: 0, centerLongitude: 0, radiusMeters: 100,
    }, NO_AUTH)).rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION › measureTraffic — calcul de densité
// ═════════════════════════════════════════════════════════════════════════════
describe('Mutation.measureTraffic — densité', () => {
  async function measure(vehicleCount, previousDensity) {
    mockExecute.mockResolvedValueOnce([[makeZone({ currentDensity: previousDensity })]]);
    mockExecute.mockResolvedValueOnce([{ insertId: 1 }]);           // INSERT measurement
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);       // UPDATE zone
    mockExecute.mockResolvedValueOnce([[makeMeasurement({ vehicleCount })]]);

    return resolvers.Mutation.measureTraffic(null, {
      zoneId: 'zone-uuid-1', vehicleCount, averageSpeed: 40,
    }, AUTH_CTX);
  }

  it('calcule LOW  pour < 10 véhicules', async () => {
    await measure(5, 'LOW');
    // Pas de notification si densité inchangée
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calcule MEDIUM pour 10–29 véhicules', async () => {
    await measure(15, 'LOW');
    // LOW → MEDIUM : notification envoyée
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.query).toContain('CONGESTION');
  });

  it('calcule HIGH pour ≥ 30 véhicules', async () => {
    await measure(35, 'LOW');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.query).toContain('ALERT');
  });

  it('n\'envoie pas de notification si la densité est inchangée', async () => {
    await measure(5, 'LOW'); // LOW → LOW
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('lève Zone not found si absente', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    await expect(resolvers.Mutation.measureTraffic(null, {
      zoneId: 'ghost', vehicleCount: 5,
    }, AUTH_CTX)).rejects.toThrow('Zone not found');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION › updateTrafficZone
// ═════════════════════════════════════════════════════════════════════════════
describe('Mutation.updateTrafficZone', () => {
  it('met à jour la zone', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    mockExecute.mockResolvedValueOnce([[makeZone({ isActive: 0 })]]);

    const result = await resolvers.Mutation.updateTrafficZone(null, {
      id: 'zone-uuid-1', isActive: false,
    }, AUTH_CTX);

    expect(result.isActive).toBe(false);
  });

  it('lève Zone not found si absente', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 0 }]);
    mockExecute.mockResolvedValueOnce([[]]);
    await expect(resolvers.Mutation.updateTrafficZone(null, { id: 'ghost' }, AUTH_CTX))
      .rejects.toThrow('Zone not found');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// RESOLVER de type › TrafficZone.measurements
// ═════════════════════════════════════════════════════════════════════════════
describe('TrafficZone.measurements (field resolver)', () => {
  it('charge les mesures associées à la zone', async () => {
    mockExecute.mockResolvedValueOnce([[makeMeasurement()]]);
    const result = await resolvers.TrafficZone.measurements({ id: 'zone-uuid-1' });
    expect(result).toHaveLength(1);
    expect(result[0].zoneId).toBe('zone-uuid-1');
  });
});