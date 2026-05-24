/**
 * Tests unitaires — vehicle-service
 */

const mockExecute = jest.fn();
const mockRelease = jest.fn();
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

const resolvers = require('../src/resolvers');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeVehicle(overrides = {}) {
  return {
    id:           'veh-uuid-1',
    licensePlate: 'AB-123-CD',
    brand:        'Renault',
    model:        'Clio',
    type:         'CAR',
    status:       'ACTIVE',
    driverName:   'Jean Dupont',
    createdAt:    new Date('2024-01-01T00:00:00Z'),
    updatedAt:    new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makePosition(overrides = {}) {
  return {
    id:         'pos-uuid-1',
    vehicleId:  'veh-uuid-1',
    latitude:   '48.8566000',
    longitude:  '2.3522000',
    speed:      '60.00',
    address:    'Paris, France',
    recordedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

const AUTH_CTX = { user: { sub: 'user-1', role: 'OPERATOR' } };
const NO_AUTH  = { user: null };

beforeEach(() => {
  mockExecute.mockReset();
  mockExecute.mockResolvedValue([[], []]);
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERY › vehicles
// ═════════════════════════════════════════════════════════════════════════════
describe('Query.vehicles', () => {
  it('retourne la liste des véhicules', async () => {
    mockExecute.mockResolvedValueOnce([[makeVehicle(), makeVehicle({ id: 'veh-2' })]]);

    const result = await resolvers.Query.vehicles(null, {}, AUTH_CTX);
    expect(result).toHaveLength(2);
    expect(result[0].latitude).toBeUndefined(); // champ GPS absent
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Query.vehicles(null, {}, NO_AUTH))
      .rejects.toThrow('Unauthorized');
  });

  it('parse les floats correctement', async () => {
    mockExecute.mockResolvedValueOnce([[makeVehicle()]]);
    const result = await resolvers.Query.vehicles(null, {}, AUTH_CTX);
    expect(result[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERY › vehicle (par ID)
// ═════════════════════════════════════════════════════════════════════════════
describe('Query.vehicle', () => {
  it('renvoie le véhicule correspondant', async () => {
    mockExecute.mockResolvedValueOnce([[makeVehicle()]]);

    const result = await resolvers.Query.vehicle(null, { id: 'veh-uuid-1' }, AUTH_CTX);
    expect(result.id).toBe('veh-uuid-1');
    expect(result.licensePlate).toBe('AB-123-CD');
  });

  it('lève Vehicle not found si absent', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    await expect(resolvers.Query.vehicle(null, { id: 'unknown' }, AUTH_CTX))
      .rejects.toThrow('Vehicle not found');
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Query.vehicle(null, { id: 'x' }, NO_AUTH))
      .rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERY › positionHistory
// ═════════════════════════════════════════════════════════════════════════════
describe('Query.positionHistory', () => {
  it('retourne l\'historique des positions', async () => {
    mockExecute.mockResolvedValueOnce([[makePosition(), makePosition({ id: 'pos-2' })]]);

    const result = await resolvers.Query.positionHistory(null, { vehicleId: 'veh-uuid-1' }, AUTH_CTX);
    expect(result).toHaveLength(2);
    expect(result[0].latitude).toBe(48.8566);
    expect(result[0].longitude).toBe(2.3522);
    expect(result[0].speed).toBe(60);
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Query.positionHistory(null, { vehicleId: 'x' }, NO_AUTH))
      .rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERY › lastPosition
// ═════════════════════════════════════════════════════════════════════════════
describe('Query.lastPosition', () => {
  it('renvoie la dernière position', async () => {
    mockExecute.mockResolvedValueOnce([[makePosition()]]);
    const result = await resolvers.Query.lastPosition(null, { vehicleId: 'veh-uuid-1' }, AUTH_CTX);
    expect(result.vehicleId).toBe('veh-uuid-1');
  });

  it('renvoie null si aucune position', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    const result = await resolvers.Query.lastPosition(null, { vehicleId: 'veh-uuid-1' }, AUTH_CTX);
    expect(result).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION › createVehicle
// ═════════════════════════════════════════════════════════════════════════════
describe('Mutation.createVehicle', () => {
  it('crée un nouveau véhicule', async () => {
    mockExecute.mockResolvedValueOnce([[]]); // pas de doublon plaque
    mockExecute.mockResolvedValueOnce([{ insertId: 1 }]); // INSERT
    mockExecute.mockResolvedValueOnce([[makeVehicle()]]);  // SELECT

    const result = await resolvers.Mutation.createVehicle(null, {
      licensePlate: 'AB-123-CD',
      brand:        'Renault',
      model:        'Clio',
      type:         'CAR',
      driverName:   'Jean Dupont',
    }, AUTH_CTX);

    expect(result.id).toBe('veh-uuid-1');
    expect(result.brand).toBe('Renault');
  });

  it('lève une erreur si la plaque existe déjà', async () => {
    mockExecute.mockResolvedValueOnce([[makeVehicle()]]);

    await expect(resolvers.Mutation.createVehicle(null, {
      licensePlate: 'AB-123-CD', brand: 'X', model: 'Y',
    }, AUTH_CTX)).rejects.toThrow('License plate already registered');
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Mutation.createVehicle(null, {
      licensePlate: 'AB-123-CD', brand: 'X', model: 'Y',
    }, NO_AUTH)).rejects.toThrow('Unauthorized');
  });

  it('applique CAR par défaut si type absent', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    mockExecute.mockResolvedValueOnce([{ insertId: 1 }]);
    mockExecute.mockResolvedValueOnce([[makeVehicle()]]);

    const insertCall = mockExecute.mock.calls;
    await resolvers.Mutation.createVehicle(null, {
      licensePlate: 'XZ-000', brand: 'X', model: 'Y',
    }, AUTH_CTX);

    // Le 3e appel est le SELECT ; le 2e est l'INSERT avec 'CAR'
    const insertArgs = mockExecute.mock.calls[1][1];
    expect(insertArgs[4]).toBe('CAR');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION › updateVehicle
// ═════════════════════════════════════════════════════════════════════════════
describe('Mutation.updateVehicle', () => {
  it('met à jour le statut', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    mockExecute.mockResolvedValueOnce([[makeVehicle({ status: 'MAINTENANCE' })]]);

    const result = await resolvers.Mutation.updateVehicle(null, {
      id: 'veh-uuid-1', status: 'MAINTENANCE',
    }, AUTH_CTX);

    expect(result.status).toBe('MAINTENANCE');
  });

  it('lève Vehicle not found si absent', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 0 }]);
    mockExecute.mockResolvedValueOnce([[]]);

    await expect(resolvers.Mutation.updateVehicle(null, {
      id: 'ghost-id', status: 'INACTIVE',
    }, AUTH_CTX)).rejects.toThrow('Vehicle not found');
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Mutation.updateVehicle(null, { id: 'x' }, NO_AUTH))
      .rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION › removeVehicle
// ═════════════════════════════════════════════════════════════════════════════
describe('Mutation.removeVehicle', () => {
  it('supprime le véhicule et renvoie true', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const result = await resolvers.Mutation.removeVehicle(null, { id: 'veh-uuid-1' }, AUTH_CTX);
    expect(result).toBe(true);
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Mutation.removeVehicle(null, { id: 'x' }, NO_AUTH))
      .rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION › recordPosition
// ═════════════════════════════════════════════════════════════════════════════
describe('Mutation.recordPosition', () => {
  it('enregistre une nouvelle position GPS', async () => {
    mockExecute.mockResolvedValueOnce([[{ id: 'veh-uuid-1' }]]); // véhicule existe
    mockExecute.mockResolvedValueOnce([{ insertId: 1 }]);         // INSERT
    mockExecute.mockResolvedValueOnce([[makePosition()]]);         // SELECT

    const result = await resolvers.Mutation.recordPosition(null, {
      vehicleId: 'veh-uuid-1',
      latitude:  48.8566,
      longitude: 2.3522,
      speed:     60,
      address:   'Paris, France',
    }, AUTH_CTX);

    expect(result.latitude).toBe(48.8566);
    expect(result.speed).toBe(60);
  });

  it('lève Vehicle not found si le véhicule est absent', async () => {
    mockExecute.mockResolvedValueOnce([[]]); // véhicule introuvable
    await expect(resolvers.Mutation.recordPosition(null, {
      vehicleId: 'ghost', latitude: 0, longitude: 0,
    }, AUTH_CTX)).rejects.toThrow('Vehicle not found');
  });

  it('lève Unauthorized sans token', async () => {
    await expect(resolvers.Mutation.recordPosition(null, {
      vehicleId: 'x', latitude: 0, longitude: 0,
    }, NO_AUTH)).rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// RESOLVER de type › Vehicle.positions
// ═════════════════════════════════════════════════════════════════════════════
describe('Vehicle.positions (field resolver)', () => {
  it('charge les positions associées au véhicule', async () => {
    mockExecute.mockResolvedValueOnce([[makePosition()]]);
    const result = await resolvers.Vehicle.positions({ id: 'veh-uuid-1' });
    expect(result).toHaveLength(1);
    expect(result[0].vehicleId).toBe('veh-uuid-1');
  });
});
