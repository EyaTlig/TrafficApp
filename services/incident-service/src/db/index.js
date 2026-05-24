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
    CREATE TABLE IF NOT EXISTS incidents (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      type ENUM('ACCIDENT','ROADWORK','ROAD_CLOSED','TRAFFIC_JAM') NOT NULL,
      status ENUM('REPORTED','IN_PROGRESS','RESOLVED') DEFAULT 'REPORTED',
      latitude DECIMAL(10,7) NOT NULL,
      longitude DECIMAL(10,7) NOT NULL,
      address VARCHAR(255),
      reportedBy VARCHAR(36),
      resolvedAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  conn.release();
}

module.exports = { getPool };