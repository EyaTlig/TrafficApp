/**
 * Tests unitaires — gateway/proxy.js
 */

const axios = require('axios');

jest.mock('axios');

const { forward } = require('../../gateway/src/proxy');

beforeEach(() => {
  axios.mockReset();
});

// ═════════════════════════════════════════════════════════════════════════════
// Service inconnu
// ═════════════════════════════════════════════════════════════════════════════
describe('forward — service inconnu', () => {
  it('lève une erreur pour un service non enregistré', async () => {
    await expect(forward('unknown-service', '{ ping }'))
      .rejects.toThrow('Service unknown-service not found');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Appels réussis
// ═════════════════════════════════════════════════════════════════════════════
describe('forward — appel réussi', () => {
  it('transmet la requête au service auth', async () => {
    axios.mockResolvedValueOnce({
      data: { data: { me: { id: 'u1', email: 'a@b.com' } } },
    });

    const result = await forward('auth', 'query { me { id email } }');
    expect(result.me.id).toBe('u1');

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url:    expect.stringContaining('auth-service'),
        data:   expect.objectContaining({ query: 'query { me { id email } }' }),
      })
    );
  });

  it('transmet les variables', async () => {
    axios.mockResolvedValueOnce({
      data: { data: { vehicle: { id: 'v1' } } },
    });

    await forward('vehicle', 'query($id:ID!) { vehicle(id:$id) { id } }', { id: 'v1' });

    const callArgs = axios.mock.calls[0][0];
    expect(callArgs.data.variables).toEqual({ id: 'v1' });
  });

  it('ajoute le header Authorization si token fourni', async () => {
    axios.mockResolvedValueOnce({ data: { data: {} } });

    await forward('auth', '{ me { id } }', {}, 'Bearer mytoken');

    const callArgs = axios.mock.calls[0][0];
    expect(callArgs.headers['Authorization']).toBe('Bearer mytoken');
  });

  it('n\'ajoute pas Authorization si token absent', async () => {
    axios.mockResolvedValueOnce({ data: { data: {} } });

    await forward('traffic', '{ trafficZones { id } }');

    const callArgs = axios.mock.calls[0][0];
    expect(callArgs.headers['Authorization']).toBeUndefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Gestion des erreurs GraphQL
// ═════════════════════════════════════════════════════════════════════════════
describe('forward — erreurs GraphQL', () => {
  it('lève une erreur si la réponse contient errors[]', async () => {
    axios.mockResolvedValueOnce({
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
    axios.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(forward('vehicle', '{ vehicles { id } }'))
      .rejects.toThrow('Service vehicle unavailable');
  });

  it('inclut le nom du service dans le message d\'erreur', async () => {
    axios.mockRejectedValueOnce(new Error('timeout'));

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
      axios.mockResolvedValueOnce({ data: { data: {} } });
      await forward(svc, '{ __typename }');
      const url = axios.mock.calls[0][0].url;
      expect(url).toContain(svc);
    });
  });
});