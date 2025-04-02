import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import logger from 'a-logger';
import router from './handlers/public/routes'; // Adjust import according to your project structure

const app = express();
dotenv.config();

// Middleware to handle cookies and JSON parsing
app.use(cookieParser());

app.use(express.json());

app.use(logger.initializeMiddlewares());

app.use('/', router);

export default app;
