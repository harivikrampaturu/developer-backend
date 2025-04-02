import dotenv from 'dotenv';
import { getRoutingConfigByEnvironment } from './routingConfig';

dotenv.config();

export const SERVICE_NAME = 'api-gateway';
export const PORT = 8500;
export const ENVIRONMENT = process.env.ENVIRONMENT || 'local';
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
export const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || '';
export const COOKIE_NAME = process.env.COOKIE_NAME || 'jwt';
export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",");

export const getRoutingConfig = getRoutingConfigByEnvironment(ENVIRONMENT);
