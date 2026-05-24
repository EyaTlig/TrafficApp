const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');
const { port } = require('./config');

async function start() {
  const app = express();
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ authorization: req.headers.authorization || '' }),
    formatError: (err) => ({ message: err.message }),
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  app.listen(port, () => {
    console.log(`Vehicle service → http://localhost:${port}/graphql`);
  });
}

start().catch((err) => {
  console.error('Vehicle service startup failed', err);
  process.exit(1);
});