const mysql = require('mysql2/promise');
const { db } = require('../config');

let pool;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: db.host,
      port: db.port,
      user: db.user,
      password: db.password,
      database: db.database,
      waitForConnections: true,
      connectionLimit: 10,
    });
    await initDB();
  }
  return pool;
}

async function initDB() {
  const conn = await pool.getConnection();
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type ENUM('INCIDENT','CONGESTION','SYSTEM','ALERT') DEFAULT 'SYSTEM',
      recipientId VARCHAR(36) NOT NULL,
      isRead BOOLEAN DEFAULT FALSE,
      relatedEntityId VARCHAR(36),
      readAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  conn.release();
}

module.exports = { getPool };