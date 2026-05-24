const port = Number(process.env.PORT || 4000);

const serviceUrls = {
  auth: process.env.AUTH_URL || 'http://auth_service:3001/graphql',
  vehicle: process.env.VEHICLE_URL || 'http://vehicle-service:3002/graphql',
  traffic: process.env.TRAFFIC_URL || 'http://traffic-service:3003/graphql',
  incident: process.env.INCIDENT_URL || 'http://incident-service:3004/graphql',
  notification: process.env.NOTIFICATION_URL || 'http://notification-service:3005/graphql',
  notificationWs: process.env.NOTIFICATION_WS_URL || 'ws://notification-service:3005/graphql',
};

const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_2024';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

module.exports = {
  port,
  serviceUrls,
  jwtSecret,
  jwtExpiresIn,
};