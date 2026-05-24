const port = Number(process.env.PORT || 3004);

const db = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'incident_db',
};

const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_2024';
module.exports = { port, db, jwtSecret };
