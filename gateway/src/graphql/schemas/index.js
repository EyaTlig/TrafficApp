module.exports = `
  enum UserRole { ADMIN OPERATOR }
  enum VehicleType { CAR TRUCK BUS MOTORCYCLE EMERGENCY }
  enum VehicleStatus { ACTIVE INACTIVE MAINTENANCE }
  enum TrafficDensity { LOW MEDIUM HIGH }
  enum IncidentType { ACCIDENT ROADWORK ROAD_CLOSED TRAFFIC_JAM }
  enum IncidentStatus { REPORTED IN_PROGRESS RESOLVED }
  enum NotificationType { INCIDENT CONGESTION SYSTEM ALERT }

  input RegisterInput {
    email: String!
    username: String!
    password: String!
    role: UserRole
  }

  input LoginInput {
    email: String!
    password: String!
  }

  type User {
    id: ID!
    email: String!
    username: String!
    role: UserRole!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type AuthResponse {
    accessToken: String!
    user: User!
  }

  type GpsPosition {
    id: ID!
    vehicleId: String!
    latitude: Float!
    longitude: Float!
    speed: Float
    address: String
    recordedAt: String!
  }

  type Vehicle {
    id: ID!
    licensePlate: String!
    brand: String!
    model: String!
    type: VehicleType!
    status: VehicleStatus!
    driverName: String
    positions: [GpsPosition]
    createdAt: String!
  }

  type TrafficMeasurement {
    id: ID!
    zoneId: String!
    vehicleCount: Int!
    averageSpeed: Float
    density: TrafficDensity!
    notes: String
    measuredAt: String!
  }

  type TrafficZone {
    id: ID!
    name: String!
    description: String
    centerLatitude: Float!
    centerLongitude: Float!
    radiusMeters: Float!
    currentDensity: TrafficDensity!
    isActive: Boolean!
    measurements: [TrafficMeasurement]
    createdAt: String!
    updatedAt: String!
  }

  type DensityStats {
    low: Int!
    medium: Int!
    high: Int!
  }

  type Incident {
    id: ID!
    title: String!
    description: String
    type: IncidentType!
    status: IncidentStatus!
    latitude: Float!
    longitude: Float!
    address: String
    reportedBy: String
    resolvedAt: String
    createdAt: String!
    updatedAt: String
  }

  type Notification {
    id: ID!
    title: String!
    message: String!
    type: NotificationType!
    recipientId: String!
    isRead: Boolean!
    relatedEntityId: String
    readAt: String
    createdAt: String!
  }

  type Query {
    me: User
    users: [User!]!
    user(id: ID!): User

    vehicles: [Vehicle!]!
    vehicle(id: ID!): Vehicle
    positionHistory(vehicleId: ID!, limit: Int): [GpsPosition!]!
    lastPosition(vehicleId: ID!): GpsPosition

    trafficZones: [TrafficZone!]!
    trafficZone(id: ID!): TrafficZone
    congestedZones: [TrafficZone!]!
    zoneMeasurements(zoneId: ID!, limit: Int): [TrafficMeasurement!]!
    densityStats: DensityStats!

    incidents(type: IncidentType, status: IncidentStatus): [Incident!]!
    incident(id: ID!): Incident
    activeIncidents: [Incident!]!

    notifications(recipientId: String): [Notification!]!
    notification(id: ID!): Notification
    unreadNotificationsCount(recipientId: String!): Int!
  }

  type Mutation {
    register(input: RegisterInput!): AuthResponse!
    login(input: LoginInput!): AuthResponse!

    createVehicle(input: CreateVehicleInput!): Vehicle!
    updateVehicle(input: UpdateVehicleInput!): Vehicle!
    removeVehicle(id: ID!): Boolean!
    recordPosition(input: RecordPositionInput!): GpsPosition!

    createTrafficZone(input: CreateTrafficZoneInput!): TrafficZone!
    updateTrafficZone(input: UpdateTrafficZoneInput!): TrafficZone!
    measureTraffic(input: MeasureTrafficInput!): TrafficMeasurement!

    createIncident(input: CreateIncidentInput!): Incident!
    updateIncidentStatus(id: ID!, status: IncidentStatus!): Incident!
    removeIncident(id: ID!): Boolean!

    sendNotification(input: SendNotificationInput!): Notification!
    markNotificationRead(id: ID!): Notification!
    markAllNotificationsRead(recipientId: String!): Int!
    deleteNotification(id: ID!): Boolean!
  }

  input CreateVehicleInput {
    licensePlate: String!
    brand: String!
    model: String!
    type: VehicleType
    driverName: String
  }

  input UpdateVehicleInput {
    id: ID!
    licensePlate: String
    brand: String
    model: String
    type: VehicleType
    status: VehicleStatus
    driverName: String
  }

  input RecordPositionInput {
    vehicleId: ID!
    latitude: Float!
    longitude: Float!
    speed: Float
    address: String
  }

  input CreateTrafficZoneInput {
    name: String!
    description: String
    centerLatitude: Float!
    centerLongitude: Float!
    radiusMeters: Float!
  }

  input UpdateTrafficZoneInput {
    id: ID!
    name: String
    description: String
    isActive: Boolean
  }

  input MeasureTrafficInput {
    zoneId: ID!
    vehicleCount: Int!
    averageSpeed: Float
    notes: String
  }

  input CreateIncidentInput {
    title: String!
    description: String
    type: IncidentType!
    latitude: Float!
    longitude: Float!
    address: String
  }

  input SendNotificationInput {
    title: String!
    message: String!
    type: NotificationType
    recipientId: String!
    relatedEntityId: String
  }

  type Subscription {
    notificationReceived(recipientId: String!): Notification!
    notificationRead(recipientId: String!): Notification!
  }
`;
