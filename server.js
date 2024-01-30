const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const { typeDefs, resolvers } = require('./schemas');
const db = require('./config/connection');
const cors = require('cors');
const { authMiddleware } = require('./utils/auth');
const http = require('http');
const { ApolloServerPluginLandingPageLocalDefault } = require("@apollo/server/plugin/landingPage/default");

const app = express();
httpServer = http.createServer(app);
const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer }),
        ApolloServerPluginLandingPageLocalDefault({
            embed: true,
          }),
    ],
  });
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    await server.start();

    app.use(
        '/graphql',
        cors({
            origin: 'https://leopoldogurgel.github.io'
        }),
        express.json(),
        expressMiddleware(server, {
            context: authMiddleware
        }),
        express.urlencoded({extended: true})
        );

    app.get('/', (req, res) => {
        res.send('O pai ta on, Jorgim! O Apollo Playground não existe mais. As queries e mutations agora precisam ser testadas no Apollo Sandbox.');
    });

    app.get('/favicon.ico', (req, res) => {
        res.send('Welcome to my GraphQL server!');
    });


    db.on('error', console.error.bind(console, "MongoDB connection error: "))

    db.once('open', async () => {
        await new Promise((resolve) => httpServer.listen({port: PORT}, resolve));
        console.log(`Server ready at http://localhost:${PORT}/`)
    });    
};

startServer();


