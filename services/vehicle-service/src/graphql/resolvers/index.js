const jwt = require('jsonwebtoken');
const {
  getVehicles,
  getVehicleById,
  getPositionHistory,
  getLastPosition,
  addVehicle,
  changeVehicle,
  removeVehicleById,
  recordPosition,
  getVehiclePositions,
} = require('../../services/vehicle.service');
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
    vehicles: async (_, __, { authorization }) => {
      ensureAuthenticated(authorization);
      return getVehicles();
    },
    vehicle: async (_, { id }, { authorization }) => {
      ensureAuthenticated(authorization);
      return getVehicleById(id);
    },
    positionHistory: async (_, { vehicleId, limit }, { authorization }) => {
      ensureAuthenticated(authorization);
      return getPositionHistory(vehicleId, limit);
    },
    lastPosition: async (_, { vehicleId }, { authorization }) => {
      ensureAuthenticated(authorization);
      return getLastPosition(vehicleId);
    },
  },
  Mutation: {
    createVehicle: async (_, { input }, { authorization }) => {
      ensureAuthenticated(authorization);
      return addVehicle(input);
    },
    updateVehicle: async (_, { input }, { authorization }) => {
      ensureAuthenticated(authorization);
      return changeVehicle(input);
    },
    removeVehicle: async (_, { id }, { authorization }) => {
      ensureAuthenticated(authorization);
      return removeVehicleById(id);
    },
    recordPosition: async (_, { input }, { authorization }) => {
      ensureAuthenticated(authorization);
      return recordPosition(input);
    },
  },
  Vehicle: {
    positions: async (vehicle, _, { authorization }) => {
      ensureAuthenticated(authorization);
      return getVehiclePositions(vehicle);
    },
  },
};
