const { gql } = require('apollo-server-express');

module.exports = gql`
  enum VehicleType { CAR TRUCK BUS MOTORCYCLE EMERGENCY }
  enum VehicleStatus { ACTIVE INACTIVE MAINTENANCE }

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

  type Query {
    vehicles: [Vehicle!]!
    vehicle(id: ID!): Vehicle
    positionHistory(vehicleId: ID!, limit: Int): [GpsPosition!]!
    lastPosition(vehicleId: ID!): GpsPosition
  }

  type Mutation {
    createVehicle(input: CreateVehicleInput!): Vehicle!
    updateVehicle(input: UpdateVehicleInput!): Vehicle!
    removeVehicle(id: ID!): Boolean!
    recordPosition(input: RecordPositionInput!): GpsPosition!
  }
`;
