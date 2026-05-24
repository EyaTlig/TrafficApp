/**
 * Tests unitaires — auth-service
 * Exécution : jest (depuis services/auth-service/)
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');

// ─── Mock mysql2/promise ──────────────────────────────────────────────────────
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

// ─── Mock db.js ──────────────────────────────────────────────────────────────
jest.mock('../../services/auth-service/src/db', () => ({
  getPool: jest.fn(() => Promise.resolve({
    execute:       mockExecute,
    getConnection: mockGetConnection,
  })),
}));

const resolvers = require('../../services/auth-service/src/resolvers');

const JWT_SECRET = 'super_secret_jwt_2024';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeUser(overrides = {}) {
  return {
    id:        'user-uuid-1234',
    email:     'test@example.com',
    username:  'testuser',
    password:  bcrypt.hashSync('password123', 10),
    role:      'OPERATOR',
    isActive:  1,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeCtx(userId = 'user-uuid-1234', role = 'OPERATOR') {
  return { user: { sub: userId, email: 'test@example.com', role } };
}

// ─── Réinitialisation ─────────────────────────────────────────────────────────
beforeEach(() => {
  mockExecute.mockReset();
  // initDB : CREATE TABLE → appelé au 1er getPool()
  mockExecute.mockResolvedValue([[], []]);
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERY › me
// ═════════════════════════════════════════════════════════════════════════════
describe('Query.me', () => {
  it('renvoie l\'utilisateur connecté', async () => {
    const user = makeUser();
    mockExecute.mockResolvedValueOnce([[user]]);

    const result = await resolvers.Query.me(null, {}, makeCtx());

    expect(result.id).toBe('user-uuid-1234');
    expect(result.email).toBe('test@example.com');
    expect(result.isActive).toBe(true);   // Boolean cast
  });

  it('lève Unauthorized sans utilisateur', async () => {
    await expect(resolvers.Query.me(null, {}, { user: null }))
      .rejects.toThrow('Unauthorized');
  });

  it('lève User not found si absent de la BDD', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    await expect(resolvers.Query.me(null, {}, makeCtx()))
      .rejects.toThrow('User not found');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERY › users
// ═════════════════════════════════════════════════════════════════════════════
describe('Query.users', () => {
  it('renvoie la liste des utilisateurs', async () => {
    const users = [makeUser(), makeUser({ id: 'user-2', email: 'b@b.com' })];
    mockExecute.mockResolvedValueOnce([users]);

    const result = await resolvers.Query.users(null, {}, makeCtx());
    expect(result).toHaveLength(2);
    expect(result[0].isActive).toBe(true);
  });

  it('lève Unauthorized sans contexte', async () => {
    await expect(resolvers.Query.users(null, {}, { user: null }))
      .rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION › register
// ═════════════════════════════════════════════════════════════════════════════
describe('Mutation.register', () => {
  it('crée un utilisateur et renvoie un token', async () => {
    // 1. vérification email unique → vide
    mockExecute.mockResolvedValueOnce([[]]);
    // 2. INSERT
    mockExecute.mockResolvedValueOnce([{ insertId: 1 }]);
    // 3. SELECT après insert
    mockExecute.mockResolvedValueOnce([[makeUser()]]);

    const result = await resolvers.Mutation.register(null, {
      email:    'test@example.com',
      username: 'testuser',
      password: 'password123',
    });

    expect(result.accessToken).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.role).toBe('OPERATOR');

    const decoded = jwt.verify(result.accessToken, JWT_SECRET);
    expect(decoded.sub).toBe('user-uuid-1234');
  });

  it('lève une erreur si l\'email est déjà utilisé', async () => {
    mockExecute.mockResolvedValueOnce([[makeUser()]]);

    await expect(resolvers.Mutation.register(null, {
      email:    'test@example.com',
      username: 'testuser',
      password: 'password123',
    })).rejects.toThrow('Email already in use');
  });

  it('applique le rôle ADMIN si fourni', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    mockExecute.mockResolvedValueOnce([{ insertId: 1 }]);
    mockExecute.mockResolvedValueOnce([[makeUser({ role: 'ADMIN' })]]);

    const result = await resolvers.Mutation.register(null, {
      email:    'admin@example.com',
      username: 'admin',
      password: 'pass',
      role:     'ADMIN',
    });

    expect(result.user.role).toBe('ADMIN');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION › login
// ═════════════════════════════════════════════════════════════════════════════
describe('Mutation.login', () => {
  it('connecte avec des identifiants valides', async () => {
    mockExecute.mockResolvedValueOnce([[makeUser()]]);

    const result = await resolvers.Mutation.login(null, {
      email:    'test@example.com',
      password: 'password123',
    });

    expect(result.accessToken).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
  });

  it('lève Invalid credentials si email inconnu', async () => {
    mockExecute.mockResolvedValueOnce([[]]);

    await expect(resolvers.Mutation.login(null, {
      email:    'unknown@example.com',
      password: 'pass',
    })).rejects.toThrow('Invalid credentials');
  });

  it('lève Invalid credentials si mot de passe incorrect', async () => {
    mockExecute.mockResolvedValueOnce([[makeUser()]]);

    await expect(resolvers.Mutation.login(null, {
      email:    'test@example.com',
      password: 'wrongpassword',
    })).rejects.toThrow('Invalid credentials');
  });

  it('lève Account disabled si isActive = 0', async () => {
    mockExecute.mockResolvedValueOnce([[makeUser({ isActive: 0 })]]);

    await expect(resolvers.Mutation.login(null, {
      email:    'test@example.com',
      password: 'password123',
    })).rejects.toThrow('Account disabled');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Helpers internes
// ═════════════════════════════════════════════════════════════════════════════
describe('formatUser (via register)', () => {
  it('convertit isActive en booléen', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    mockExecute.mockResolvedValueOnce([{ insertId: 1 }]);
    mockExecute.mockResolvedValueOnce([[makeUser({ isActive: 1 })]]);

    const { user } = await resolvers.Mutation.register(null, {
      email: 'x@x.com', username: 'x', password: 'x',
    });
    expect(typeof user.isActive).toBe('boolean');
  });

  it('sérialise createdAt en ISO string', async () => {
    mockExecute.mockResolvedValueOnce([[makeUser()]]);
    const result = await resolvers.Query.me(null, {}, makeCtx());
    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});