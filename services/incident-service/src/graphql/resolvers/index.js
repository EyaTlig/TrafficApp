const jwt = require('jsonwebtoken');
const {
  getIncidents,
  getIncidentById,
  getActiveIncidents,
  addIncident,
  changeIncidentStatus,
  removeIncidentById,
} = require('../../services/incident.service');
const { jwtSecret } = require('../../config');

function getUser(token) {
  if (!token) return null;
  const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
  try {
    return jwt.verify(raw, jwtSecret);
  } catch {
    return null;
  }
}

function ensureAuthenticated(token) {
  const user = getUser(token);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

module.exports = {
  Query: {
    incidents: async (_, args, { authorization }) => {
      ensureAuthenticated(authorization);
      return getIncidents(args);
    },
    incident: async (_, { id }, { authorization }) => {
      ensureAuthenticated(authorization);
      return getIncidentById(id);
    },
    activeIncidents: async (_, __, { authorization }) => {
      ensureAuthenticated(authorization);
      return getActiveIncidents();
    },
  },
  Mutation: {
    createIncident: async (_, { input }, { authorization }) => {
      const user = ensureAuthenticated(authorization);
      return addIncident(input, user);
    },
    updateIncidentStatus: async (_, { id, status }, { authorization }) => {
      ensureAuthenticated(authorization);
      return changeIncidentStatus(id, status);
    },
    removeIncident: async (_, { id }, { authorization }) => {
      ensureAuthenticated(authorization);
      return removeIncidentById(id);
    },
  },
};