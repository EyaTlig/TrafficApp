const express = require('express');
const cors = require('cors');
const http = require('http');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const jwt = require('jsonwebtoken');
const typeDefs = require('./graphql/schemas');
const resolvers = require('./graphql/resolvers');
const { port, jwtSecret } = require('./config');
const { subscribe } = require('./utils/subscriptionProxy');

function getToken(header) {
  if (!header) return null;
  return header.startsWith('Bearer ') ? header : `Bearer ${header}`;
}

function getUser(token) {
  if (!token) return null;
  const rawToken = token.startsWith('Bearer ') ? token.slice(7) : token;
  try {
    return jwt.verify(rawToken, jwtSecret);
  } catch {
    return null;
  }
}

async function start() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const httpServer = http.createServer(app);
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });

  const serverCleanup = useServer(
    {
      schema,
      context: (ctx) => {
        const token = getToken(ctx.connectionParams?.authorization || ctx.connectionParams?.Authorization || '');
        return {
          user: getUser(token),
          authorization: token,
          subscriptionService: { subscribe },
        };
      },
      onConnect: (ctx) => {
        const token = getToken(ctx.connectionParams?.authorization || ctx.connectionParams?.Authorization || '');
        if (!getUser(token)) {
          throw new Error('Unauthorized: invalid or missing token');
        }
      },
    },
    wsServer
  );

  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        const token = getToken(req.headers.authorization || '');
        return {
          user: getUser(token),
          authorization: token,
          subscriptionService: { subscribe },
        };
      },
    })
  );

  httpServer.listen(port, () => {
    console.log(`Gateway ready → http://localhost:${port}/graphql`);
    console.log(`Subscriptions ready → ws://localhost:${port}/graphql`);
  });
}

start().catch((error) => {
  console.error('Gateway startup failure', error);
  process.exit(1);
});