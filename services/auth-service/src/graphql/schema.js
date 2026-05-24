const { gql } = require('apollo-server-express');

module.exports = gql`
  enum UserRole {
    ADMIN
    OPERATOR
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

  type Query {
    me: User
    users: [User!]!
    user(id: ID!): User
  }

  type Mutation {
    register(input: RegisterInput!): AuthResponse!
    login(input: LoginInput!): AuthResponse!
  }
`;
