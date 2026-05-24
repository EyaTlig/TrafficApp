const { forward } = require('../../proxy');

function requireAuth(user) {
  if (!user) {
    throw new Error('Unauthorized');
  }
}

function getAuthHeader(context) {
  return context.authorization || null;
}

// Send a notification silently (fire & forget — does not block the main action)
async function notifyUser({ recipientId, title, message, type, relatedEntityId, authHeader }) {
  if (!recipientId) return;
  try {
    const query = `mutation SendNotification($input: SendNotificationInput!) { sendNotification(input: $input) { id } }`;
    await forward('notification', query, {
      input: { title, message, type: type || 'SYSTEM', recipientId, relatedEntityId: relatedEntityId || null },
    }, authHeader);
  } catch (e) {
    console.warn('[Gateway] Auto-notification failed (non-blocking):', e.message);
  }
}

// Notify all admins (fire & forget)
async function notifyAdmins({ title, message, type, relatedEntityId, authHeader }) {
  try {
    const query = `query Users { users { id role } }`;
    const { users } = await forward('auth', query, {}, authHeader);
    const admins = (users || []).filter(u => u.role === 'ADMIN');
    for (const admin of admins) {
      await notifyUser({ recipientId: admin.id, title, message, type, relatedEntityId, authHeader });
    }
  } catch (e) {
    console.warn('[Gateway] Failed to notify admins:', e.message);
  }
}

module.exports = {
  Query: {
    me: async (_, __, context) => {
      requireAuth(context.user);
      const query = `query Me { me { id email username role isActive createdAt updatedAt } }`;
      const { me } = await forward('auth', query, {}, getAuthHeader(context));
      return me;
    },

    users: async (_, __, context) => {
      requireAuth(context.user);
      const query = `query Users { users { id email username role isActive createdAt updatedAt } }`;
      const { users } = await forward('auth', query, {}, getAuthHeader(context));
      return users;
    },

    user: async (_, { id }, context) => {
      requireAuth(context.user);
      const query = `query User($id: ID!) { user(id: $id) { id email username role isActive createdAt updatedAt } }`;
      const { user } = await forward('auth', query, { id }, getAuthHeader(context));
      return user;
    },

    vehicles: async (_, __, context) => {
      requireAuth(context.user);
      const query = `query Vehicles { vehicles { id licensePlate brand model type status driverName createdAt positions { id vehicleId latitude longitude speed address recordedAt } } }`;
      const { vehicles } = await forward('vehicle', query, {}, getAuthHeader(context));
      return vehicles;
    },

    vehicle: async (_, { id }, context) => {
      requireAuth(context.user);
      const query = `query Vehicle($id: ID!) { vehicle(id: $id) { id licensePlate brand model type status driverName createdAt positions { id vehicleId latitude longitude speed address recordedAt } } }`;
      const { vehicle } = await forward('vehicle', query, { id }, getAuthHeader(context));
      return vehicle;
    },

    positionHistory: async (_, { vehicleId, limit }, context) => {
      requireAuth(context.user);
      const query = `query PositionHistory($vehicleId: ID!, $limit: Int) { positionHistory(vehicleId: $vehicleId, limit: $limit) { id vehicleId latitude longitude speed address recordedAt } }`;
      const { positionHistory } = await forward('vehicle', query, { vehicleId, limit }, getAuthHeader(context));
      return positionHistory;
    },

    lastPosition: async (_, { vehicleId }, context) => {
      requireAuth(context.user);
      const query = `query LastPosition($vehicleId: ID!) { lastPosition(vehicleId: $vehicleId) { id vehicleId latitude longitude speed address recordedAt } }`;
      const { lastPosition } = await forward('vehicle', query, { vehicleId }, getAuthHeader(context));
      return lastPosition;
    },

    trafficZones: async (_, __, context) => {
      requireAuth(context.user);
      const query = `query TrafficZones { trafficZones { id name description centerLatitude centerLongitude radiusMeters currentDensity isActive createdAt updatedAt measurements { id zoneId vehicleCount averageSpeed density notes measuredAt } } }`;
      const { trafficZones } = await forward('traffic', query, {}, getAuthHeader(context));
      return trafficZones;
    },

    trafficZone: async (_, { id }, context) => {
      requireAuth(context.user);
      const query = `query TrafficZone($id: ID!) { trafficZone(id: $id) { id name description centerLatitude centerLongitude radiusMeters currentDensity isActive createdAt updatedAt measurements { id zoneId vehicleCount averageSpeed density notes measuredAt } } }`;
      const { trafficZone } = await forward('traffic', query, { id }, getAuthHeader(context));
      return trafficZone;
    },

    congestedZones: async (_, __, context) => {
      requireAuth(context.user);
      const query = `query CongestedZones { congestedZones { id name description centerLatitude centerLongitude radiusMeters currentDensity isActive createdAt updatedAt } }`;
      const { congestedZones } = await forward('traffic', query, {}, getAuthHeader(context));
      return congestedZones;
    },

    zoneMeasurements: async (_, { zoneId, limit }, context) => {
      requireAuth(context.user);
      const query = `query ZoneMeasurements($zoneId: ID!, $limit: Int) { zoneMeasurements(zoneId: $zoneId, limit: $limit) { id zoneId vehicleCount averageSpeed density notes measuredAt } }`;
      const { zoneMeasurements } = await forward('traffic', query, { zoneId, limit }, getAuthHeader(context));
      return zoneMeasurements;
    },

    densityStats: async (_, __, context) => {
      requireAuth(context.user);
      const query = `query DensityStats { densityStats { low medium high } }`;
      const { densityStats } = await forward('traffic', query, {}, getAuthHeader(context));
      return densityStats;
    },

    incidents: async (_, { type, status }, context) => {
      requireAuth(context.user);
      const query = `query Incidents($type: IncidentType, $status: IncidentStatus) { incidents(type: $type, status: $status) { id title description type status latitude longitude address reportedBy resolvedAt createdAt updatedAt } }`;
      const { incidents } = await forward('incident', query, { type, status }, getAuthHeader(context));
      return incidents;
    },

    incident: async (_, { id }, context) => {
      requireAuth(context.user);
      const query = `query Incident($id: ID!) { incident(id: $id) { id title description type status latitude longitude address reportedBy resolvedAt createdAt updatedAt } }`;
      const { incident } = await forward('incident', query, { id }, getAuthHeader(context));
      return incident;
    },

    activeIncidents: async (_, __, context) => {
      requireAuth(context.user);
      const query = `query ActiveIncidents { activeIncidents { id title description type status latitude longitude address reportedBy resolvedAt createdAt updatedAt } }`;
      const { activeIncidents } = await forward('incident', query, {}, getAuthHeader(context));
      return activeIncidents;
    },

    notifications: async (_, { recipientId }, context) => {
      requireAuth(context.user);
      const query = `query Notifications($recipientId: String) { notifications(recipientId: $recipientId) { id title message type recipientId isRead relatedEntityId readAt createdAt } }`;
      const { notifications } = await forward('notification', query, { recipientId }, getAuthHeader(context));
      return notifications;
    },

    notification: async (_, { id }, context) => {
      requireAuth(context.user);
      const query = `query Notification($id: ID!) { notification(id: $id) { id title message type recipientId isRead relatedEntityId readAt createdAt } }`;
      const { notification } = await forward('notification', query, { id }, getAuthHeader(context));
      return notification;
    },

    unreadNotificationsCount: async (_, { recipientId }, context) => {
      requireAuth(context.user);
      const query = `query UnreadNotificationsCount($recipientId: String!) { unreadNotificationsCount(recipientId: $recipientId) }`;
      const { unreadNotificationsCount } = await forward('notification', query, { recipientId }, getAuthHeader(context));
      return unreadNotificationsCount;
    },
  },

  Mutation: {
    register: async (_, { input }, context) => {
      const query = `mutation Register($input: RegisterInput!) { register(input: $input) { accessToken user { id email username role isActive createdAt updatedAt } } }`;
      const { register } = await forward('auth', query, { input });
      return register;
    },

    login: async (_, { input }, context) => {
      const query = `mutation Login($input: LoginInput!) { login(input: $input) { accessToken user { id email username role isActive createdAt updatedAt } } }`;
      const { login } = await forward('auth', query, { input });
      return login;
    },

    createVehicle: async (_, { input }, context) => {
      requireAuth(context.user);
      const query = `mutation CreateVehicle($input: CreateVehicleInput!) { createVehicle(input: $input) { id licensePlate brand model type status driverName createdAt positions { id vehicleId latitude longitude speed address recordedAt } } }`;
      const { createVehicle } = await forward('vehicle', query, { input }, getAuthHeader(context));
      return createVehicle;
    },

    updateVehicle: async (_, { input }, context) => {
      requireAuth(context.user);
      const query = `mutation UpdateVehicle($input: UpdateVehicleInput!) { updateVehicle(input: $input) { id licensePlate brand model type status driverName createdAt positions { id vehicleId latitude longitude speed address recordedAt } } }`;
      const { updateVehicle } = await forward('vehicle', query, { input }, getAuthHeader(context));
      return updateVehicle;
    },

    removeVehicle: async (_, { id }, context) => {
      requireAuth(context.user);
      const query = `mutation RemoveVehicle($id: ID!) { removeVehicle(id: $id) }`;
      const { removeVehicle } = await forward('vehicle', query, { id }, getAuthHeader(context));
      return removeVehicle;
    },

    recordPosition: async (_, { input }, context) => {
      requireAuth(context.user);
      const query = `mutation RecordPosition($input: RecordPositionInput!) { recordPosition(input: $input) { id vehicleId latitude longitude speed address recordedAt } }`;
      const { recordPosition } = await forward('vehicle', query, { input }, getAuthHeader(context));
      return recordPosition;
    },

    createTrafficZone: async (_, { input }, context) => {
      requireAuth(context.user);
      const query = `mutation CreateTrafficZone($input: CreateTrafficZoneInput!) { createTrafficZone(input: $input) { id name description centerLatitude centerLongitude radiusMeters currentDensity isActive createdAt updatedAt measurements { id zoneId vehicleCount averageSpeed density notes measuredAt } } }`;
      const { createTrafficZone } = await forward('traffic', query, { input }, getAuthHeader(context));
      return createTrafficZone;
    },

    updateTrafficZone: async (_, { input }, context) => {
      requireAuth(context.user);
      const query = `mutation UpdateTrafficZone($input: UpdateTrafficZoneInput!) { updateTrafficZone(input: $input) { id name description centerLatitude centerLongitude radiusMeters currentDensity isActive createdAt updatedAt } }`;
      const { updateTrafficZone } = await forward('traffic', query, { input }, getAuthHeader(context));
      return updateTrafficZone;
    },

    measureTraffic: async (_, { input }, context) => {
      requireAuth(context.user);
      const query = `mutation MeasureTraffic($input: MeasureTrafficInput!) { measureTraffic(input: $input) { id zoneId vehicleCount averageSpeed density notes measuredAt } }`;
      const { measureTraffic } = await forward('traffic', query, { input }, getAuthHeader(context));

      // 🔔 Auto-notify when congestion is HIGH
      if (measureTraffic.density === 'HIGH') {
        // Notify the operator who made the measurement
        notifyUser({
          recipientId: context.user.sub,
          title: '🚗 Alerte Congestion Détectée !',
          message: `Densité élevée mesurée : ${measureTraffic.vehicleCount} véhicules, vitesse moyenne ${measureTraffic.averageSpeed || 'N/A'} km/h.`,
          type: 'CONGESTION',
          relatedEntityId: measureTraffic.zoneId,
          authHeader: getAuthHeader(context),
        });

        // Notify admins about the congestion
        notifyAdmins({
          title: '🚗 Alerte Congestion Détectée !',
          message: `Densité élevée mesurée : ${measureTraffic.vehicleCount} véhicules, vitesse moyenne ${measureTraffic.averageSpeed || 'N/A'} km/h.`,
          type: 'CONGESTION',
          relatedEntityId: measureTraffic.zoneId,
          authHeader: getAuthHeader(context),
        });
      }

      return measureTraffic;
    },

    createIncident: async (_, { input }, context) => {
      requireAuth(context.user);
      const query = `mutation CreateIncident($input: CreateIncidentInput!) { createIncident(input: $input) { id title description type status latitude longitude address reportedBy resolvedAt createdAt updatedAt } }`;
      const { createIncident } = await forward('incident', query, { input }, getAuthHeader(context));

      // 🔔 Auto-notify the user who reported the incident AND admins
      notifyUser({
        recipientId: context.user.sub,
        title: `Incident signalé : ${createIncident.title}`,
        message: `Votre incident de type "${createIncident.type}" a été enregistré avec succès. Statut : REPORTED.`,
        type: 'INCIDENT',
        relatedEntityId: createIncident.id,
        authHeader: getAuthHeader(context),
      });

      notifyAdmins({
        title: `Nouvel incident signalé : ${createIncident.title}`,
        message: `Un incident de type "${createIncident.type}" a été signalé par un opérateur.`,
        type: 'INCIDENT',
        relatedEntityId: createIncident.id,
        authHeader: getAuthHeader(context),
      });

      return createIncident;
    },

    updateIncidentStatus: async (_, { id, status }, context) => {
      requireAuth(context.user);
      const query = `mutation UpdateIncidentStatus($id: ID!, $status: IncidentStatus!) { updateIncidentStatus(id: $id, status: $status) { id title description type status latitude longitude address reportedBy resolvedAt createdAt updatedAt } }`;
      const { updateIncidentStatus } = await forward('incident', query, { id, status }, getAuthHeader(context));

      // 🔔 Auto-notify when an incident status changes
      const statusLabels = { IN_PROGRESS: 'En cours de traitement', RESOLVED: 'Résolu ✅', REPORTED: 'Signalé' };
      
      // Notify the original reporter
      notifyUser({
        recipientId: updateIncidentStatus.reportedBy,
        title: `Incident mis à jour : ${updateIncidentStatus.title}`,
        message: `Le statut de l'incident a changé vers : ${statusLabels[status] || status}.`,
        type: 'INCIDENT',
        relatedEntityId: updateIncidentStatus.id,
        authHeader: getAuthHeader(context),
      });

      // Notify admins
      notifyAdmins({
        title: `Mise à jour d'incident : ${updateIncidentStatus.title}`,
        message: `Le statut de l'incident a changé vers : ${statusLabels[status] || status}.`,
        type: 'INCIDENT',
        relatedEntityId: updateIncidentStatus.id,
        authHeader: getAuthHeader(context),
      });

      return updateIncidentStatus;
    },

    removeIncident: async (_, { id }, context) => {
      requireAuth(context.user);
      const query = `mutation RemoveIncident($id: ID!) { removeIncident(id: $id) }`;
      const { removeIncident } = await forward('incident', query, { id }, getAuthHeader(context));
      return removeIncident;
    },

    sendNotification: async (_, { input }, context) => {
      requireAuth(context.user);
      const query = `mutation SendNotification($input: SendNotificationInput!) { sendNotification(input: $input) { id title message type recipientId isRead relatedEntityId readAt createdAt } }`;
      const { sendNotification } = await forward('notification', query, { input }, getAuthHeader(context));
      return sendNotification;
    },

    markNotificationRead: async (_, { id }, context) => {
      requireAuth(context.user);
      const query = `mutation MarkNotificationRead($id: ID!) { markNotificationRead(id: $id) { id title message type recipientId isRead relatedEntityId readAt createdAt } }`;
      const { markNotificationRead } = await forward('notification', query, { id }, getAuthHeader(context));
      return markNotificationRead;
    },

    markAllNotificationsRead: async (_, { recipientId }, context) => {
      requireAuth(context.user);
      const query = `mutation MarkAllNotificationsRead($recipientId: String!) { markAllNotificationsRead(recipientId: $recipientId) }`;
      const { markAllNotificationsRead } = await forward('notification', query, { recipientId }, getAuthHeader(context));
      return markAllNotificationsRead;
    },

    deleteNotification: async (_, { id }, context) => {
      requireAuth(context.user);
      const query = `mutation DeleteNotification($id: ID!) { deleteNotification(id: $id) }`;
      const { deleteNotification } = await forward('notification', query, { id }, getAuthHeader(context));
      return deleteNotification;
    },
  },

  Subscription: {
    notificationReceived: {
      subscribe: async (_, variables, context) => {
        requireAuth(context.user);
        return context.subscriptionService.subscribe('notificationReceived', variables, context.authorization);
      },
    },
    notificationRead: {
      subscribe: async (_, variables, context) => {
        requireAuth(context.user);
        return context.subscriptionService.subscribe('notificationRead', variables, context.authorization);
      },
    },
  },
};
