const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { findByEmail, findById, findAll, create } = require('../repositories/user.repository');
const { jwtSecret, jwtExpiresIn } = require('../config');
const { validateRegisterInput, validateLoginInput } = require('../validators/auth.validator');
const { formatUser } = require('../utils/format');

function buildToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
}

async function getUserById(id) {
  const row = await findById(id);
  return row ? formatUser(row) : null;
}

async function listUsers() {
  const rows = await findAll();
  return rows.map(formatUser);
}

async function register(input) {
  validateRegisterInput(input);

  const existingUser = await findByEmail(input.email);
  if (existingUser) {
    throw new Error('Email already in use');
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);
  const user = {
    id: uuidv4(),
    email: input.email,
    username: input.username,
    password: hashedPassword,
    role: input.role || 'OPERATOR',
    isActive: true,
  };

  const created = await create(user);
  const payload = { sub: created.id, email: created.email, role: created.role };
  const accessToken = buildToken(payload);
  return { accessToken, user: formatUser(created) };
}

async function login(input) {
  validateLoginInput(input);

  const user = await findByEmail(input.email);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const validPassword = await bcrypt.compare(input.password, user.password);
  if (!validPassword) {
    throw new Error('Invalid credentials');
  }

  if (!user.isActive) {
    throw new Error('Account disabled');
  }

  const formatted = formatUser(user);
  const payload = { sub: formatted.id, email: formatted.email, role: formatted.role };
  const accessToken = buildToken(payload);
  return { accessToken, user: formatted };
}

module.exports = {
  getUserById,
  listUsers,
  register,
  login,
};