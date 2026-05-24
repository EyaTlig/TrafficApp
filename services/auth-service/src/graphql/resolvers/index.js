const { AuthenticationError } = require('apollo-server-errors');
const { getUserById, listUsers, register, login } = require('../../services/auth.service');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../config');

function getUser(token) {
  if (!token) return null;
  const rawToken = token.startsWith('Bearer ') ? token.slice(7) : token;
  try {
    return jwt.verify(rawToken, jwtSecret);
  } catch {
    return null;
  }
}

module.exports = {
  Query: {
    me: async (_, __, { authorization }) => {
      const user = getUser(authorization);
      if (!user) {
        throw new AuthenticationError('Unauthorized');
      }
      return getUserById(user.sub);
    },
    users: async (_, __, { authorization }) => {
      const user = getUser(authorization);
      if (!user) {
        throw new AuthenticationError('Unauthorized');
      }
      return listUsers();
    },
    user: async (_, { id }, { authorization }) => {
      const user = getUser(authorization);
      if (!user) {
        throw new AuthenticationError('Unauthorized');
      }
      return getUserById(id);
    },
  },
  Mutation: {
    register: async (_, { input }) => register(input),
    login: async (_, { input }) => login(input),
  },
};
