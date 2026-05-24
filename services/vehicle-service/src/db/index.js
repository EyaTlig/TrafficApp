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
    CREATE TABLE IF NOT EXISTS vehicles (
      id VARCHAR(36) PRIMARY KEY,
      licensePlate VARCHAR(50) UNIQUE NOT NULL,
      brand VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL,
      type ENUM('CAR','TRUCK','BUS','MOTORCYCLE','EMERGENCY') DEFAULT 'CAR',
      status ENUM('ACTIVE','INACTIVE','MAINTENANCE') DEFAULT 'ACTIVE',
      driverName VARCHAR(255),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS gps_positions (
      id VARCHAR(36) PRIMARY KEY,
      vehicleId VARCHAR(36) NOT NULL,
      latitude DECIMAL(10,7) NOT NULL,
      longitude DECIMAL(10,7) NOT NULL,
      speed DECIMAL(5,2),
      address VARCHAR(255),
      recordedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
    )
  `);

  conn.release();
}

module.exports = { getPool };