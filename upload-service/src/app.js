/* eslint-disable no-underscore-dangle */
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import http from 'http';
import logger from 'a-logger';
import cookieParser from 'cookie-parser';
import router from './handlers/routes';

import { initializeWebSocket } from './modules/websocket';

const app = express();
const server = http.createServer(app);
dotenv.config();

// Add port configuration
const PORT = process.env.PORT || 8502;

// Middleware to handle cookies and JSON parsing
app.use(cookieParser());

app.use(express.json());

app.use(logger.initializeMiddlewares());

// Initialize WebSocket server
initializeWebSocket(server);

app.use('/', router);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Remove the server.listen() from here
// Let index.js handle server startup

export { app, server, PORT };
