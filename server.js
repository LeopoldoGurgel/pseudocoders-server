const express = require('express');
const {ApolloServer} = require('apollo-server-express');
const { typeDefs, resolvers } = require('./schemas');
const db = require('./config/connection');
const cors = require('cors');
const { authMiddleware } = require('./utils/auth');

const app = express();
const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: authMiddleware
});
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    await server.start();

    app.use(cors());

    app.get('/', (req, res) => {
        res.send('O pai ta on, Jorgim!');
    });

    app.get('/favicon.ico', (req, res) => {
        res.send('Welcome to my GraphQL server!');
    });

    server.applyMiddleware({app, path: '/graphql'});

    db.on('error', console.error.bind(console, "MongoDB connection error: "))

    db.once('open', () => {
        app.listen(PORT, ()=>{
            console.log(`Server listening on port ${PORT}`);
        });
    });    
};

startServer();


