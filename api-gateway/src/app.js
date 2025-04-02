import express from 'express';
import cookieParser from 'cookie-parser';
import logger from 'a-logger';
import dotenv from 'dotenv';
import { handleRoutes } from './handlers/handlers';
import { corsMiddleware } from './middlewares/corsMiddlewares';

const app = express();
dotenv.config();

app.use(cookieParser()); // Middleware for parsing cookies

app.use(logger.initializeMiddlewares()); // Your logger middleware

app.use(corsMiddleware);

app.use(handleRoutes());

export default app;
