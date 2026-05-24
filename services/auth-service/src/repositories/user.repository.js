const { getPool } = require('../db');

async function findById(id) {
  const pool = await getPool();
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findByEmail(email) {
  const pool = await getPool();
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function findAll() {
  const pool = await getPool();
  const [rows] = await pool.execute('SELECT * FROM users ORDER BY createdAt DESC');
  return rows;
}

async function create(user) {
  const pool = await getPool();
  await pool.execute(
    'INSERT INTO users (id, email, username, password, role, isActive) VALUES (?, ?, ?, ?, ?, ?)',
    [user.id, user.email, user.username, user.password, user.role, user.isActive]
  );
  return findById(user.id);
}

module.exports = { findById, findByEmail, findAll, create };