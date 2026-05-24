/**
 * Tests unitaires — gateway/proxy.js
 */

const axios = require('axios');

jest.mock('axios');

const { forward } = require('../src/proxy');

beforeEach(() => {
  if (axios.post) axios.post.mockReset();
});

// ═════════════════════════════════════════════════════════════════════════════
// Service inconnu
// ═════════════════════════════════════════════════════════════════════════════
describe('forward — service inconnu', () => {
  it('lève une erreur pour un service non enregistré', async () => {
    await expect(forward('unknown-service', '{ ping }'))
      .rejects.toThrow('Unknown service: unknown-service');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Appels réussis
// ═════════════════════════════════════════════════════════════════════════════
describe('forward — appel réussi', () => {
  it('transmet la requête au service auth', async () => {
    axios.post.mockResolvedValueOnce({
      data: { data: { me: { id: 'u1', email: 'a@b.com' } } },
    });

    const result = await forward('auth', 'query { me { id email } }');
    expect(result.me.id).toBe('u1');

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('auth_service'),
      expect.objectContaining({ query: 'query { me { id email } }' }),
      expect.any(Object)
    );
  });

  it('transmet les variables', async () => {
    axios.post.mockResolvedValueOnce({
      data: { data: { vehicle: { id: 'v1' } } },
    });

    await forward('vehicle', 'query($id:ID!) { vehicle(id:$id) { id } }', { id: 'v1' });

    const callData = axios.post.mock.calls[0][1];
    expect(callData.variables).toEqual({ id: 'v1' });
  });

  it('ajoute le header Authorization si token fourni', async () => {
    axios.post.mockResolvedValueOnce({ data: { data: {} } });

    await forward('auth', '{ me { id } }', {}, 'Bearer mytoken');

    const callConfig = axios.post.mock.calls[0][2];
    expect(callConfig.headers['Authorization']).toBe('Bearer mytoken');
  });

  it('n\'ajoute pas Authorization si token absent', async () => {
    axios.post.mockResolvedValueOnce({ data: { data: {} } });

    await forward('traffic', '{ trafficZones { id } }');

    const callConfig = axios.post.mock.calls[0][2];
    expect(callConfig.headers['Authorization']).toBeUndefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Gestion des erreurs GraphQL
// ═════════════════════════════════════════════════════════════════════════════
describe('forward — erreurs GraphQL', () => {
  it('lève une erreur si la réponse contient errors[]', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        errors: [{ message: 'Unauthorized' }],
      },
    });

    await expect(forward('auth', '{ me { id } }'))
      .rejects.toThrow('Unauthorized');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Gestion des erreurs réseau
// ═════════════════════════════════════════════════════════════════════════════
describe('forward — erreurs réseau', () => {
  it('lève une erreur "unavailable" si axios échoue', async () => {
    axios.post.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(forward('vehicle', '{ vehicles { id } }'))
      .rejects.toThrow('Service vehicle unavailable');
  });

  it('inclut le nom du service dans le message d\'erreur', async () => {
    axios.post.mockRejectedValueOnce(new Error('timeout'));

    await expect(forward('incident', '{ incidents { id } }'))
      .rejects.toThrow('Service incident unavailable');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Tous les services connus
// ═════════════════════════════════════════════════════════════════════════════
describe('forward — services connus', () => {
  const SERVICES = ['auth', 'vehicle', 'traffic', 'incident', 'notification'];

  SERVICES.forEach((svc) => {
    it(`résout l'URL pour le service "${svc}"`, async () => {
      axios.post.mockResolvedValueOnce({ data: { data: {} } });
      await forward(svc, '{ __typename }');
      const url = axios.post.mock.calls[0][0];
      expect(url).toContain(svc);
    });
  });
});
