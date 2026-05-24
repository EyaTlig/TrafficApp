const jwt = require('jsonwebtoken');
const {
  getTrafficZones,
  getTrafficZoneById,
  getCongestedZones,
  getZoneMeasurements,
  getDensityStats,
  addTrafficZone,
  changeTrafficZone,
  measureTraffic,
} = require('../../services/traffic.service');
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
    trafficZones: async (_, __, { authorization }) => {
      ensureAuthenticated(authorization);
      return getTrafficZones();
    },
    trafficZone: async (_, { id }, { authorization }) => {
      ensureAuthenticated(authorization);
      return getTrafficZoneById(id);
    },
    congestedZones: async (_, __, { authorization }) => {
      ensureAuthenticated(authorization);
      return getCongestedZones();
    },
    zoneMeasurements: async (_, { zoneId, limit }, { authorization }) => {
      ensureAuthenticated(authorization);
      return getZoneMeasurements(zoneId, limit);
    },
    densityStats: async (_, __, { authorization }) => {
      ensureAuthenticated(authorization);
      return getDensityStats();
    },
  },
  Mutation: {
    createTrafficZone: async (_, { input }, { authorization }) => {
      ensureAuthenticated(authorization);
      return addTrafficZone(input);
    },
    updateTrafficZone: async (_, { input }, { authorization }) => {
      ensureAuthenticated(authorization);
      return changeTrafficZone(input);
    },
    measureTraffic: async (_, { input }, { authorization }) => {
      ensureAuthenticated(authorization);
      return measureTraffic(input);
    },
  },
};
